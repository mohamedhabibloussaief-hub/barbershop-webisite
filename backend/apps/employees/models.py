"""
apps/employees/models.py
------------------------
Three models that together answer the question:
"Is employee X available on date Y at time Z?"

  Employee  — who they are (1-to-1 with a barber User)
  Schedule  — when they work each week (recurring, by day_of_week)
  TimeOff   — specific dates they are not available

The availability engine in Step 6 will:
  1. Look up the employee's Schedule for the requested day_of_week.
  2. Subtract any TimeOff entries that cover the requested date.
  3. Subtract existing Appointments that overlap the requested slot.
  4. Return the remaining free time windows.
"""

import uuid
from django.db   import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


# ─── Employee ─────────────────────────────────────────────────────────────────

class Employee(models.Model):
    """
    Profile for a barber. Always backed by a User with role='barber'.

    The OneToOneField with unique=True (enforced by the FK itself) means
    one user → one employee profile, preventing the duplicate-profile bug
    identified in Phase 1.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,       # Never delete a User who has an Employee profile.
        related_name="employee_profile",
        limit_choices_to={"role": "barber"},
    )

    bio = models.TextField(_("bio"), blank=True, default="")

    specialties = models.TextField(
        _("specialties"),
        blank=True,
        default="",
        help_text=_("Comma-separated list, e.g. 'fades, beard trims, colouring'"),
    )

    years_experience = models.PositiveSmallIntegerField(
        _("years of experience"),
        default=0,
    )

    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _("employee")
        verbose_name_plural = _("employees")
        ordering            = ["user__full_name"]

    def __str__(self) -> str:
        return self.user.full_name

    def deactivate(self) -> None:
        """Soft-delete — preserves appointment history."""
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])


# ─── Schedule ─────────────────────────────────────────────────────────────────

class Schedule(models.Model):
    """
    A single recurring working window for an employee on a given weekday.

    day_of_week uses Python's convention: 0=Monday … 6=Sunday.

    An employee can have multiple Schedule rows for the same day
    (e.g. 09:00–12:00 and 14:00–18:00 with a lunch break),
    but overlapping windows on the same day are rejected by the serializer.

    Indexed on (employee, day_of_week) because the availability engine
    queries exactly this combination on every booking attempt.
    """

    DAY_CHOICES = [
        (0, _("Monday")),
        (1, _("Tuesday")),
        (2, _("Wednesday")),
        (3, _("Thursday")),
        (4, _("Friday")),
        (5, _("Saturday")),
        (6, _("Sunday")),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    day_of_week = models.PositiveSmallIntegerField(
        _("day of week"),
        choices=DAY_CHOICES,
    )

    start_time = models.TimeField(_("start time"))
    end_time   = models.TimeField(_("end time"))

    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        verbose_name        = _("schedule")
        verbose_name_plural = _("schedules")
        ordering            = ["day_of_week", "start_time"]
        indexes = [
            # Availability engine queries (employee_id, day_of_week) on every check.
            models.Index(fields=["employee", "day_of_week"], name="schedule_emp_day_idx"),
        ]

    def __str__(self) -> str:
        day_name = dict(self.DAY_CHOICES).get(self.day_of_week, self.day_of_week)
        return f"{self.employee} — {day_name} {self.start_time:%H:%M}–{self.end_time:%H:%M}"

    def clean(self) -> None:
        """Model-level validation: end_time must be after start_time."""
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": _("End time must be after start time.")})


# ─── TimeOff ──────────────────────────────────────────────────────────────────

class TimeOff(models.Model):
    """
    A specific calendar date on which an employee is entirely unavailable.

    This is intentionally date-granular (full-day only) for V1.
    Partial-day time-off (e.g. doctor's appointment 10:00–11:00) can be
    handled in V2 by adding start_time / end_time fields here.

    The availability engine checks this table before generating free slots:
    if a TimeOff row exists for employee + requested date, return no slots.
    """

    class Reason(models.TextChoices):
        VACATION = "vacation", _("Vacation")
        SICK     = "sick",     _("Sick leave")
        BREAK    = "break",    _("Break / day off")
        OTHER    = "other",    _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="time_off",
    )

    date = models.DateField(_("date"), db_index=True)

    reason = models.CharField(
        _("reason"),
        max_length=10,
        choices=Reason.choices,
        default=Reason.BREAK,
    )

    note = models.CharField(
        _("note"),
        max_length=255,
        blank=True,
        default="",
    )

    class Meta:
        verbose_name        = _("time off")
        verbose_name_plural = _("time off entries")
        ordering            = ["date"]
        # One time-off entry per employee per date — no duplicates.
        unique_together     = [("employee", "date")]
        indexes = [
            models.Index(fields=["employee", "date"], name="timeoff_emp_date_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.employee} — {self.date} ({self.get_reason_display()})"
