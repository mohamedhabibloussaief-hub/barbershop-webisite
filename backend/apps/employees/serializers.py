"""
apps/employees/serializers.py
------------------------------
Serializers for Employee, Schedule, and TimeOff.

EmployeeReadSerializer    — nested user profile, used for GET responses
EmployeeWriteSerializer   — accepts user_id for create/update
ScheduleSerializer        — validates no overlapping windows for same employee+day
TimeOffSerializer         — validates date is not in the past, no duplicate dates
"""

from datetime import date as date_type
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from apps.users.serializers import UserProfileSerializer
from .models import Employee, Schedule, TimeOff


# ─── Employee ─────────────────────────────────────────────────────────────────

class EmployeeReadSerializer(serializers.ModelSerializer):
    """
    Full employee representation including the nested user profile.
    Returned on GET list and GET detail.
    """
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model  = Employee
        fields = (
            "id", "user", "bio", "specialties",
            "years_experience", "is_active",
            "created_at", "updated_at",
        )
        read_only_fields = fields


class EmployeeWriteSerializer(serializers.ModelSerializer):
    """
    Create / update an employee profile.

    On create: requires a user_id pointing to an existing User with role='barber'
               who does not yet have an employee profile.
    On update: user_id is excluded — you cannot re-link an employee to a different user.
    """

    user_id = serializers.UUIDField(write_only=True, required=True)

    class Meta:
        model  = Employee
        fields = ("user_id", "bio", "specialties", "years_experience")

    def validate_user_id(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Validate the user exists and is a barber.
        try:
            user = User.objects.get(pk=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(_("No user found with this ID."))

        if not user.is_barber:
            raise serializers.ValidationError(
                _("Only users with role='barber' can have an employee profile.")
            )

        # On create: ensure no profile exists yet.
        if not self.instance:
            if Employee.objects.filter(user_id=value).exists():
                raise serializers.ValidationError(
                    _("This user already has an employee profile.")
                )

        return value

    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.get(pk=validated_data.pop("user_id"))
        return Employee.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        # user_id is not allowed in updates — silently remove it if present.
        validated_data.pop("user_id", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        return EmployeeReadSerializer(instance, context=self.context).data


# ─── Schedule ─────────────────────────────────────────────────────────────────

class ScheduleSerializer(serializers.ModelSerializer):
    """
    Create / list schedule windows for an employee.

    Key validation: rejects overlapping windows for the same employee + day.
    Example: existing 09:00–12:00, new 10:00–14:00 → rejected.
    Example: existing 09:00–12:00, new 13:00–17:00 → accepted.

    The employee is injected by the view (from the URL kwarg), not the request body.
    """

    day_of_week_display = serializers.CharField(
        source="get_day_of_week_display", read_only=True
    )

    class Meta:
        model  = Schedule
        fields = (
            "id", "day_of_week", "day_of_week_display",
            "start_time", "end_time", "is_active",
        )
        read_only_fields = ("id", "day_of_week_display")

    def validate(self, attrs):
        employee   = self.context["employee"]
        day        = attrs["day_of_week"]
        start      = attrs["start_time"]
        end        = attrs["end_time"]

        # end must be after start.
        if end <= start:
            raise serializers.ValidationError(
                {"end_time": _("End time must be after start time.")}
            )

        # Check for overlapping windows on the same day.
        qs = Schedule.objects.filter(
            employee=employee,
            day_of_week=day,
            is_active=True,
        )
        # Exclude self when updating.
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        for existing in qs:
            # Two intervals [s1,e1] and [s2,e2] overlap when s1 < e2 AND s2 < e1.
            if start < existing.end_time and existing.start_time < end:
                raise serializers.ValidationError(
                    {
                        "non_field_errors": _(
                            f"This window overlaps with an existing schedule: "
                            f"{existing.start_time:%H:%M}–{existing.end_time:%H:%M}."
                        )
                    }
                )

        return attrs


# ─── TimeOff ──────────────────────────────────────────────────────────────────

class TimeOffSerializer(serializers.ModelSerializer):
    """
    Create / list time-off entries for an employee.

    Validates:
      - Date is not in the past (cannot retroactively add time off).
      - No duplicate entry for the same employee + date
        (unique_together on the model handles the DB constraint;
         this gives a clean 400 before it fires).
    """

    reason_display = serializers.CharField(
        source="get_reason_display", read_only=True
    )

    class Meta:
        model  = TimeOff
        fields = ("id", "date", "reason", "reason_display", "note")
        read_only_fields = ("id", "reason_display")

    def validate_date(self, value: date_type) -> date_type:
        if value < date_type.today():
            raise serializers.ValidationError(
                _("Cannot add time off for a date in the past.")
            )
        return value

    def validate(self, attrs):
        employee = self.context["employee"]
        date     = attrs["date"]

        qs = TimeOff.objects.filter(employee=employee, date=date)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"date": _("A time-off entry already exists for this date.")}
            )

        return attrs
