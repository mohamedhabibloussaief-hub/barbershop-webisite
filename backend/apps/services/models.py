"""
apps/services/models.py
-----------------------
The Service model represents a single offering in the barbershop catalogue
(e.g. "Classic Haircut", "Beard Trim", "Hair Colour").

Design decisions:
  - UUID primary key: consistent with the rest of the schema.
  - is_active soft-delete: deactivated services are hidden from new bookings
    but preserved in appointment history and revenue reports.
  - ActiveManager as default: every ORM query is safe by default — no
    developer has to remember to add filter(is_active=True).
  - category field: allows the client portal to group services
    (e.g. "Hair", "Beard", "Colour") without a separate Category model.
  - price as DecimalField: never use FloatField for money — floating-point
    arithmetic is not safe for currency calculations.
  - duration_minutes: used by the availability engine to calculate end_time
    when a booking is made (end = start + duration).
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class ActiveManager(models.Manager):
    """
    Default manager — returns only active (non-deleted) services.

    Usage:
        Service.objects.all()          → only active services
        Service.all_objects.all()      → all services including inactive
    """
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class Service(models.Model):

    # ── Primary key ──────────────────────────────────────────────────────────
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # ── Core fields ──────────────────────────────────────────────────────────
    name = models.CharField(
        _("name"),
        max_length=100,
        unique=True,
    )
    description = models.TextField(
        _("description"),
        blank=True,
        default="",
    )
    category = models.CharField(
        _("category"),
        max_length=50,
        blank=True,
        default="",
        db_index=True,
    )

    # ── Pricing & duration ───────────────────────────────────────────────────
    # DecimalField with max_digits=8, decimal_places=2 supports up to
    # 999,999.99 — sufficient for any barbershop pricing scenario.
    price = models.DecimalField(
        _("price"),
        max_digits=8,
        decimal_places=2,
    )
    duration_minutes = models.PositiveIntegerField(
        _("duration (minutes)"),
        help_text=_("Used to calculate appointment end time."),
    )

    # ── Status ───────────────────────────────────────────────────────────────
    is_active = models.BooleanField(
        _("active"),
        default=True,
        db_index=True,
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Managers ─────────────────────────────────────────────────────────────
    objects     = ActiveManager()         # Default: active only.
    all_objects = models.Manager()        # Unfiltered: for admin and reports.

    class Meta:
        verbose_name        = _("service")
        verbose_name_plural = _("services")
        # Client portal shows services grouped by category, then alphabetically.
        ordering = ["category", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.duration_minutes} min — {self.price})"

    def deactivate(self) -> None:
        """
        Soft-delete. Hides the service from new bookings while preserving
        all historical appointment and revenue data that references it.
        """
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])
