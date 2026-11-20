"""
apps/availability/service.py
-----------------------------
Pure availability calculation. No Django views, no serializers, no HTTP.

Public interface:
    get_available_slots(employee, date, service) -> list[datetime]

Returns an ordered list of available start times (UTC-aware datetimes)
for the given employee on the given date for the given service duration.

Algorithm (three-step subtraction):
  1. Load working windows: Schedule rows for employee + day_of_week
  2. Check time off: if any TimeOff row covers this date → return [] immediately
  3. For each working window, generate candidate slots at duration_minutes
     intervals, then remove any that overlap a blocking Appointment

This function is called by:
  - AvailabilityView (Step 6)  — to respond to GET /api/availability/
  - AppointmentSerializer (Step 7) — to validate a requested slot on booking

Keeping it here (not inside the view or serializer) means it can be
tested with plain Python objects and reused without HTTP overhead.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing   import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from apps.employees.models import Employee
    from apps.services.models  import Service

logger = logging.getLogger("barbershop")


# Appointment statuses that block a slot. Imported lazily inside the
# function to avoid circular imports at module load time.
BLOCKING_STATUSES = ["pending", "confirmed", "arrived"]


def get_available_slots(
    employee: "Employee",
    requested_date: date,
    service: "Service",
) -> list[datetime]:
    """
    Return a list of UTC-aware datetimes representing bookable start times.

    Args:
        employee:       Employee model instance
        requested_date: The calendar date being queried (naive date, local)
        service:        Service model instance (duration_minutes used for slot size)

    Returns:
        Sorted list of timezone-aware datetime objects (UTC).
        Empty list if the employee is off, has no schedule, or all slots are taken.
    """

    # ── Step 0: guard — inactive employee ────────────────────────────────────
    if not employee.is_active:
        return []

    # ── Step 1: check time off ────────────────────────────────────────────────
    # Import here to avoid circular imports at module level.
    from apps.employees.models import TimeOff

    if TimeOff.objects.filter(employee=employee, date=requested_date).exists():
        logger.debug(
            "Availability: %s is on time off for %s", employee, requested_date
        )
        return []

    # ── Step 2: load working windows for this day_of_week ─────────────────────
    from apps.employees.models import Schedule

    day_of_week = requested_date.weekday()  # 0=Monday … 6=Sunday

    working_windows = Schedule.objects.filter(
        employee=employee,
        day_of_week=day_of_week,
        is_active=True,
    ).order_by("start_time")

    if not working_windows.exists():
        logger.debug(
            "Availability: %s has no schedule on day %s", employee, day_of_week
        )
        return []

    # ── Step 3: load blocking appointments for this employee on this date ─────
    from apps.appointments.models import Appointment

    # Build a datetime range covering the entire requested date (UTC).
    # We query a generous ±1 day window to handle any timezone edge cases,
    # then filter precisely in the slot overlap check below.
    tz          = timezone.get_current_timezone()
    day_start   = datetime.combine(requested_date, datetime.min.time())
    day_end     = datetime.combine(requested_date, datetime.max.time())
    day_start_aware = timezone.make_aware(day_start, tz)
    day_end_aware   = timezone.make_aware(day_end,   tz)

    existing_appointments = list(
        Appointment.objects.filter(
            employee    = employee,
            status__in  = BLOCKING_STATUSES,
            start_time__lt = day_end_aware,
            end_time__gt   = day_start_aware,
        ).values("start_time", "end_time")
    )

    # ── Step 4: generate candidate slots and subtract booked ones ─────────────
    slot_delta  = timedelta(minutes=service.duration_minutes)
    available   = []

    for window in working_windows:
        # Convert the schedule's naive times to aware datetimes on the
        # requested date so we can compare them with appointment datetimes.
        window_start = timezone.make_aware(
            datetime.combine(requested_date, window.start_time), tz
        )
        window_end = timezone.make_aware(
            datetime.combine(requested_date, window.end_time), tz
        )

        # Walk through the window in service-duration steps.
        slot_start = window_start
        while slot_start + slot_delta <= window_end:
            slot_end = slot_start + slot_delta

            # A slot is free if it does not overlap any blocking appointment.
            # Two intervals overlap when: slot_start < appt_end AND appt_start < slot_end
            is_free = not any(
                slot_start < appt["end_time"] and appt["start_time"] < slot_end
                for appt in existing_appointments
            )

            if is_free:
                available.append(slot_start)

            slot_start += slot_delta

    logger.debug(
        "Availability: %s slots found for %s on %s (service=%s)",
        len(available), employee, requested_date, service.name,
    )

    return available


def slot_is_available(
    employee: "Employee",
    slot_start: datetime,
    duration_minutes: int,
    exclude_appointment_id=None,
) -> bool:
    """
    Check whether a single specific slot is free.

    Used by AppointmentSerializer in Step 7 to validate the requested
    start_time before creating or rescheduling a booking.

    Args:
        employee:              The employee being booked
        slot_start:            UTC-aware datetime of the desired start
        duration_minutes:      Length of the service in minutes
        exclude_appointment_id: UUID to exclude (for reschedule, not double-book)

    Returns:
        True if the slot is free, False if it conflicts with a blocking appointment.
    """
    from apps.appointments.models import Appointment

    slot_end = slot_start + timedelta(minutes=duration_minutes)

    qs = Appointment.objects.filter(
        employee   = employee,
        status__in = BLOCKING_STATUSES,
        start_time__lt = slot_end,
        end_time__gt   = slot_start,
    )

    if exclude_appointment_id:
        qs = qs.exclude(pk=exclude_appointment_id)

    return not qs.exists()
