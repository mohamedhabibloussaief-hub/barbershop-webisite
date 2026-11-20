"""
apps/notifications/handlers.py
--------------------------------
Django signal receivers that connect appointment lifecycle events
to email functions.

Why signals and not direct calls in the view?
  - The appointments app does not import from notifications.
  - If email sending is slow or fails, the appointment transaction
    has already committed — the booking is safe.
  - Signals can be disconnected in tests with a single decorator.

Signals connected here:
  post_save on Appointment:
    - status just became PENDING   → send booking_confirmed
    - status just became CANCELLED → send booking_cancelled

The "just became" logic compares the current value to the
pre-save value via `update_fields` inspection and instance tracking.
We use a simpler approach: check `created` (for PENDING on creation)
and track status changes via `pre_save` for cancellations.
"""

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch          import receiver

logger = logging.getLogger("barbershop")

# Store previous status before save so post_save can compare.
# Using a module-level dict keyed by appointment pk avoids
# attaching state to the model instance.
_previous_status: dict = {}


@receiver(pre_save, sender="appointments.Appointment")
def _capture_previous_status(sender, instance, **kwargs):
    """
    Before an appointment is saved, record its current (old) status.
    Used by post_save to detect status transitions.
    """
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            _previous_status[str(instance.pk)] = old.status
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender="appointments.Appointment")
def _on_appointment_saved(sender, instance, created, **kwargs):
    """
    After an appointment is saved:
      - New appointment (created=True) → send booking_confirmed
      - Status changed to CANCELLED   → send booking_cancelled
    """
    from .emails import send_booking_confirmed, send_booking_cancelled

    if created:
        # Brand-new booking — always send confirmation.
        send_booking_confirmed(instance)
        # Clean up pre_save cache (not needed for new instances).
        _previous_status.pop(str(instance.pk), None)
        return

    prev = _previous_status.pop(str(instance.pk), None)
    current = instance.status

    if prev != current and current == "cancelled":
        send_booking_cancelled(instance)
