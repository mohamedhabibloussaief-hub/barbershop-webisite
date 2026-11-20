"""
apps/appointments/serializers.py
---------------------------------
Serializers for appointment reading, atomic creation, cancellation,
status transitions, and payment recording.
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.employees.models import Employee
from apps.services.models import Service
from apps.users.serializers import UserProfileSerializer
from apps.availability.service import slot_is_available
from .models import Appointment, Payment


class AppointmentReadSerializer(serializers.ModelSerializer):
    client           = UserProfileSerializer(read_only=True)
    employee_name    = serializers.CharField(source="employee.user.full_name", read_only=True)
    employee_id      = serializers.UUIDField(source="employee.id", read_only=True)
    service_name     = serializers.CharField(source="service.name", read_only=True)
    service_id       = serializers.UUIDField(source="service.id", read_only=True)
    service_price    = serializers.DecimalField(
        source="service.price", max_digits=8, decimal_places=2, read_only=True
    )
    duration_minutes = serializers.IntegerField(source="service.duration_minutes", read_only=True)
    status_display   = serializers.CharField(source="get_status_display", read_only=True)

    payment_status = serializers.CharField(
        source="payment.status", read_only=True, default="pending"
    )
    payment_amount = serializers.DecimalField(
        source="payment.amount", max_digits=8, decimal_places=2,
        read_only=True, default=None,
    )
    payment_method = serializers.CharField(
        source="payment.method", read_only=True, default=""
    )

    class Meta:
        model  = Appointment
        fields = (
            "id",
            "client", "employee_id", "employee_name",
            "service_id", "service_name", "service_price", "duration_minutes",
            "start_time", "end_time",
            "status", "status_display",
            "cancelled_by_id", "cancellation_reason",
            "notes",
            "payment_status", "payment_amount", "payment_method",
            "created_at", "updated_at",
        )
        read_only_fields = fields


class AppointmentCreateSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField()
    service_id  = serializers.UUIDField()
    start_time  = serializers.DateTimeField()
    notes       = serializers.CharField(required=False, default="", allow_blank=True)

    def validate_employee_id(self, value):
        try:
            employee = Employee.objects.get(pk=value, is_active=True)
        except Employee.DoesNotExist:
            raise serializers.ValidationError(_("Employee not found or inactive."))
        return employee

    def validate_service_id(self, value):
        try:
            service = Service.objects.get(pk=value, is_active=True)
        except Service.DoesNotExist:
            raise serializers.ValidationError(_("Service not found or inactive."))
        return service

    def validate(self, attrs):
        employee   = attrs["employee_id"]
        service    = attrs["service_id"]
        start_time = attrs["start_time"]

        if timezone.is_naive(start_time):
            start_time = timezone.make_aware(start_time)
            attrs["start_time"] = start_time

        if start_time < timezone.now():
            raise serializers.ValidationError(
                {"start_time": _("Cannot book a slot in the past.")}
            )

        end_time = start_time + timedelta(minutes=service.duration_minutes)
        attrs["end_time"] = end_time

        if not slot_is_available(employee, start_time, service.duration_minutes):
            raise serializers.ValidationError(
                {"start_time": _("This slot is no longer available.")}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        employee = validated_data["employee_id"]
        service  = validated_data["service_id"]
        start    = validated_data["start_time"]
        end      = validated_data["end_time"]
        client   = self.context["request"].user

        # Lock the employee row so concurrent transactions serialize cleanly
        # even when zero overlapping appointments exist yet.
        Employee.objects.select_for_update().get(pk=employee.pk)

        if not slot_is_available(employee, start, service.duration_minutes):
            raise serializers.ValidationError(
                {"start_time": _("This slot was just booked. Please choose another.")}
            )

        appointment = Appointment.objects.create(
            client     = client,
            employee   = employee,
            service    = service,
            start_time = start,
            end_time   = end,
            status     = Appointment.Status.PENDING,
            notes      = validated_data.get("notes", ""),
        )

        Payment.objects.create(
            appointment = appointment,
            amount      = service.price,
            status      = Payment.Status.PENDING,
        )

        return appointment

    def to_representation(self, instance):
        return AppointmentReadSerializer(instance, context=self.context).data


class AppointmentCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(
        required=False, default="", allow_blank=True, max_length=255
    )

    def validate(self, attrs):
        appointment = self.context["appointment"]
        user        = self.context["request"].user

        if user.is_client:
            cancellable = [Appointment.Status.PENDING, Appointment.Status.CONFIRMED]
        else:
            cancellable = [
                Appointment.Status.PENDING,
                Appointment.Status.CONFIRMED,
                Appointment.Status.ARRIVED,
            ]

        if appointment.status not in cancellable:
            raise serializers.ValidationError(
                {"status": _(
                    f"Cannot cancel an appointment with status '{appointment.get_status_display()}'."
                )}
            )

        if user.is_client and appointment.client_id != user.pk:
            raise serializers.ValidationError(
                _("You can only cancel your own appointments.")
            )

        return attrs

    @transaction.atomic
    def save(self):
        appointment = self.context["appointment"]
        user        = self.context["request"].user

        appointment.status              = Appointment.Status.CANCELLED
        appointment.cancelled_by        = user
        appointment.cancellation_reason = self.validated_data.get("cancellation_reason", "")
        appointment.save(update_fields=[
            "status", "cancelled_by", "cancellation_reason", "updated_at"
        ])
        return appointment


BARBER_TRANSITIONS = {
    Appointment.Status.PENDING   : [Appointment.Status.CONFIRMED, Appointment.Status.CANCELLED],
    Appointment.Status.CONFIRMED : [Appointment.Status.ARRIVED,   Appointment.Status.CANCELLED],
    Appointment.Status.ARRIVED   : [Appointment.Status.COMPLETED, Appointment.Status.NO_SHOW],
}

ADMIN_TRANSITIONS = {
    Appointment.Status.PENDING   : [Appointment.Status.CONFIRMED, Appointment.Status.CANCELLED],
    Appointment.Status.CONFIRMED : [Appointment.Status.ARRIVED,   Appointment.Status.CANCELLED],
    Appointment.Status.ARRIVED   : [Appointment.Status.COMPLETED, Appointment.Status.NO_SHOW, Appointment.Status.CANCELLED],
    Appointment.Status.NO_SHOW   : [Appointment.Status.CANCELLED],
}


class AppointmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Appointment.Status.choices)

    def validate_status(self, value):
        appointment = self.context["appointment"]
        user        = self.context["request"].user
        current     = appointment.status

        allowed_map  = ADMIN_TRANSITIONS if user.is_admin else BARBER_TRANSITIONS
        allowed_next = allowed_map.get(current, [])

        if value not in allowed_next:
            raise serializers.ValidationError(
                _(
                    f"Cannot transition from '{current}' to '{value}'. "
                    f"Allowed: {[s for s in allowed_next] or 'none'}."
                )
            )
        return value

    @transaction.atomic
    def save(self):
        appointment = self.context["appointment"]
        user        = self.context["request"].user
        new_status  = self.validated_data["status"]

        appointment.status = new_status
        update_fields = ["status", "updated_at"]
        if new_status == Appointment.Status.CANCELLED and not appointment.cancelled_by_id:
            appointment.cancelled_by = user
            update_fields.append("cancelled_by")

        appointment.save(update_fields=update_fields)
        return appointment


class AppointmentPaymentSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Payment.Status.choices, default=Payment.Status.PAID)
    method = serializers.ChoiceField(choices=Payment.Method.choices, required=False, default=Payment.Method.CASH)

    @transaction.atomic
    def save(self):
        appointment = self.context["appointment"]
        payment, _ = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={"amount": appointment.service.price, "status": Payment.Status.PENDING},
        )
        new_status = self.validated_data["status"]
        payment.status = new_status
        if "method" in self.validated_data:
            payment.method = self.validated_data["method"]
        if new_status == Payment.Status.PAID and not payment.paid_at:
            payment.paid_at = timezone.now()
        elif new_status != Payment.Status.PAID:
            payment.paid_at = None
        payment.save(update_fields=["status", "method", "paid_at", "updated_at"])
        return appointment
