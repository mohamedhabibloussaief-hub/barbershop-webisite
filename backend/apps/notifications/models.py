"""
apps/notifications/models.py
-----------------------------
NotificationsLog: one row per email send attempt.

Answers the question: "Did the client receive their confirmation email?"
The admin can filter by status=failed to find delivery problems.

Design notes:
  - appointment FK is nullable: future notification types (e.g. marketing)
    may not be tied to a specific appointment.
  - error_message stores the exception string on failure — no more
    digging through server logs for a single email failure.
  - recipient_email is denormalised (copied from client at send time) so
    the log remains readable even if the user later changes their email.
"""

import uuid
from django.db   import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class NotificationsLog(models.Model):

    class NotificationType(models.TextChoices):
        BOOKING_CONFIRMED = "booking_confirmed", _("Booking Confirmed")
        BOOKING_CANCELLED = "booking_cancelled", _("Booking Cancelled")
        REMINDER_24H      = "reminder_24h",      _("24h Reminder")

    class Status(models.TextChoices):
        SENT   = "sent",   _("Sent")
        FAILED = "failed", _("Failed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notification_logs",
    )

    notification_type = models.CharField(
        _("type"),
        max_length=20,
        choices=NotificationType.choices,
        db_index=True,
    )

    recipient_email = models.EmailField(_("recipient email"))

    status = models.CharField(
        _("status"),
        max_length=10,
        choices=Status.choices,
        db_index=True,
    )

    error_message = models.TextField(
        _("error message"),
        blank=True,
        default="",
        help_text=_("Populated on failure. Empty on success."),
    )

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _("notification log")
        verbose_name_plural = _("notification logs")
        ordering            = ["-sent_at"]
        indexes = [
            models.Index(
                fields=["appointment", "notification_type"],
                name="notif_appt_type_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.get_notification_type_display()} → "
            f"{self.recipient_email} [{self.status}]"
        )
