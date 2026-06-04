"""
apps/reviews/serializers.py
-----------------------------
Two serializers:

  ReviewReadSerializer   — public representation, includes employee name
  ReviewCreateSerializer — validates business rules, creates the review

Business rules enforced in ReviewCreateSerializer.validate():
  1. The appointment must exist and belong to the requesting client.
  2. The appointment status must be 'completed'.
  3. No review must already exist for this appointment
     (OneToOneField handles the DB constraint; we give a clean 400 first).
"""

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import Review


class ReviewReadSerializer(serializers.ModelSerializer):
    """
    Read-only representation. Returned on GET list, GET detail,
    and in the response body after a successful POST.
    """
    employee_name = serializers.CharField(
        source="employee.user.full_name", read_only=True
    )
    employee_id = serializers.UUIDField(
        source="employee.id", read_only=True
    )

    class Meta:
        model  = Review
        fields = (
            "id",
            "appointment_id",
            "employee_id",
            "employee_name",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = fields


class ReviewCreateSerializer(serializers.Serializer):
    """
    Create a review for a completed appointment.

    The client only supplies:
      - appointment_id : UUID of the appointment they want to review
      - rating         : integer 1–5
      - comment        : optional text

    Everything else (employee_id) is derived server-side.
    """

    appointment_id = serializers.UUIDField()
    rating         = serializers.IntegerField(min_value=1, max_value=5)
    comment        = serializers.CharField(
        required=False, default="", allow_blank=True
    )

    def validate_appointment_id(self, value):
        from apps.appointments.models import Appointment
        request = self.context["request"]

        # ── Rule 1: appointment must exist and belong to this client ──────────
        try:
            appointment = Appointment.objects.select_related(
                "employee"
            ).get(pk=value, client=request.user)
        except Appointment.DoesNotExist:
            raise serializers.ValidationError(
                _("Appointment not found or does not belong to you.")
            )

        # ── Rule 2: appointment must be completed ─────────────────────────────
        if appointment.status != Appointment.Status.COMPLETED:
            raise serializers.ValidationError(
                _(
                    f"You can only review completed appointments. "
                    f"This appointment is '{appointment.get_status_display()}'."
                )
            )

        # ── Rule 3: no existing review ────────────────────────────────────────
        if Review.objects.filter(appointment=appointment).exists():
            raise serializers.ValidationError(
                _("You have already submitted a review for this appointment.")
            )

        # Return the full object — used in create() to avoid a second query.
        return appointment

    def create(self, validated_data):
        """
        appointment_id has been resolved to an Appointment instance
        by validate_appointment_id. employee is derived from the appointment.
        """
        appointment = validated_data["appointment_id"]
        return Review.objects.create(
            appointment = appointment,
            employee    = appointment.employee,
            rating      = validated_data["rating"],
            comment     = validated_data.get("comment", ""),
        )

    def to_representation(self, instance):
        return ReviewReadSerializer(instance, context=self.context).data
