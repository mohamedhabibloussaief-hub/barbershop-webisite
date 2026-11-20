"""
apps/appointments/models.py
----------------------------
Two models defined here:

  Appointment  — the core booking record linking client, employee, and service
  Payment      — one-to-one record tracking payment status per appointment

Both are created in this step because:
  1. The availability engine needs Appointment to subtract booked slots.
  2. Defining Payment now keeps the schema migration clean and atomic.

Full CRUD views, serializers, and URLs are added in Step 7.
"""

import uuid
from django.db   import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class Appointment(models.Model):
    """
    The central record in the system. Created when a client books a slot.

    Status lifecycle:
      pending   → confirmed → arrived → completed
                            ↘ no_show
      pending   → cancelled
      confirmed → cancelled

    cancelled_by: records whether the client or a staff member cancelled —
    critical for the cancellation-rate analytics in Step 10.
    """

    class Status(models.TextChoices):
        PENDING   = "pending",   _("Pending")
        CONFIRMED = "confirmed", _("Confirmed")
        ARRIVED   = "arrived",   _("Arrived")
        COMPLETED = "completed", _("Completed")
        NO_SHOW   = "no_show",   _("No Show")
        CANCELLED = "cancelled", _("Cancelled")

    # Statuses that block a time slot from being booked again.
    BLOCKING_STATUSES = [Status.PENDING, Status.CONFIRMED, Status.ARRIVED]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Participants ──────────────────────────────────────────────────────────
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="appointments_as_client",
        limit_choices_to={"role": "client"},
    )
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.PROTECT,
        related_name="appointments",
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.PROTECT,
        related_name="appointments",
    )

    # ── Timing ────────────────────────────────────────────────────────────────
    # Both stored in UTC; converted to local time in the serializer/frontend.
    start_time = models.DateTimeField(_("start time"), db_index=True)
    end_time   = models.DateTimeField(_("end time"))

    # ── Status ────────────────────────────────────────────────────────────────
    status = models.CharField(
        _("status"),
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # ── Cancellation tracking (Phase 1 improvement) ───────────────────────────
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancellations_initiated",
    )
    cancellation_reason = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    # ── Notes ─────────────────────────────────────────────────────────────────
    notes = models.TextField(blank=True, default="")

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _("appointment")
        verbose_name_plural = _("appointments")
        ordering            = ["-start_time"]
        indexes = [
            # Availability engine: find all blocking appointments for an
            # employee on a given date range.
            models.Index(
                fields=["employee", "start_time"],
                name="appt_employee_start_idx",
            ),
            # Client portal: list a client's upcoming appointments.
            models.Index(
                fields=["client", "start_time"],
                name="appt_client_start_idx",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.client} → {self.employee} "
            f"[{self.service}] @ {self.start_time:%Y-%m-%d %H:%M}"
        )

    def clean(self) -> None:
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": _("End time must be after start time.")})


class Payment(models.Model):
    """
    One payment record per appointment.

    Created automatically when an appointment is created (pending status).
    amount is copied from service.price at booking time so that future
    price changes do not retroactively alter historical revenue figures.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID    = "paid",    _("Paid")
        WAIVED  = "waived",  _("Waived")

    class Method(models.TextChoices):
        CASH   = "cash",   _("Cash")
        CARD   = "card",   _("Card")
        FLOUCI = "flouci", _("Flouci")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="payment",
    )

    # Snapshot of the price at booking time.
    amount = models.DecimalField(
        _("amount"),
        max_digits=8,
        decimal_places=2,
    )

    status = models.CharField(
        _("payment status"),
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    method = models.CharField(
        _("payment method"),
        max_length=10,
        choices=Method.choices,
        blank=True,
        default="",
    )

    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _("payment")
        verbose_name_plural = _("payments")

    def __str__(self) -> str:
        return f"Payment {self.amount} TND — {self.status} ({self.appointment})"
