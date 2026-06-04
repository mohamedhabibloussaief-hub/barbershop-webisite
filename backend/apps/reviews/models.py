"""
apps/reviews/models.py
-----------------------
Review model: one review per completed appointment.

Two constraints enforced at the database level (not just application level):

1. OneToOneField on appointment
   → one review per appointment, enforced by UNIQUE constraint in PostgreSQL.
   A second POST for the same appointment fails at the DB before reaching
   any application logic.

2. CheckConstraint on rating
   → rating must be between 1 and 5, enforced by a PostgreSQL CHECK constraint.
   Protects against any direct ORM call that bypasses serializer validation.

Denormalisation: employee_id is stored directly on the review.
This enables the query "all reviews for employee X" with a single
index scan instead of a join through the appointments table.
"""

import uuid
from django.db   import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class Review(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    appointment = models.OneToOneField(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        related_name="review",
    )

    # Denormalised FK — avoids a join on every employee-review query.
    # Set automatically from appointment.employee at review creation time.
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="reviews",
        db_index=True,
    )

    # ── Content ───────────────────────────────────────────────────────────────
    rating = models.PositiveSmallIntegerField(
        _("rating"),
        validators=[
            MinValueValidator(1, message=_("Rating must be at least 1.")),
            MaxValueValidator(5, message=_("Rating must be at most 5.")),
        ],
        db_index=True,
    )

    comment = models.TextField(
        _("comment"),
        blank=True,
        default="",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _("review")
        verbose_name_plural = _("reviews")
        ordering            = ["-created_at"]
        indexes = [
            # "All reviews for employee X, sorted newest first"
            models.Index(fields=["employee", "-created_at"], name="review_emp_date_idx"),
        ]
        constraints = [
            # DB-level guard: rating must be 1–5 regardless of how data enters.
            models.CheckConstraint(
                check  = models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name   = "review_rating_1_to_5",
            ),
        ]

    def __str__(self) -> str:
        return f"Review {self.rating}★ for {self.employee} (appt {str(self.appointment_id)[:8]}…)"
