"""
apps/appointments/views.py
---------------------------
AppointmentViewSet handles all appointment operations.
"""

import logging
from rest_framework             import status
from rest_framework.decorators  import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response    import Response
from rest_framework.viewsets    import GenericViewSet
from rest_framework.mixins      import CreateModelMixin, RetrieveModelMixin, ListModelMixin

from apps.users.permissions import IsAdminOrBarber
from .models import Appointment
from .serializers import (
    AppointmentReadSerializer,
    AppointmentCreateSerializer,
    AppointmentCancelSerializer,
    AppointmentStatusSerializer,
    AppointmentPaymentSerializer,
)

logger = logging.getLogger("barbershop")


class AppointmentViewSet(
    CreateModelMixin,
    RetrieveModelMixin,
    ListModelMixin,
    GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = Appointment.objects.select_related(
            "client",
            "employee__user",
            "service",
            "payment",
        )

        if user.is_client:
            return base.filter(client=user)
        if user.is_barber:
            return base.filter(employee__user=user)
        return base.all()

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action == "cancel":
            return AppointmentCancelSerializer
        if self.action == "status":
            return AppointmentStatusSerializer
        if self.action == "payment":
            return AppointmentPaymentSerializer
        return AppointmentReadSerializer

    def get_permissions(self):
        if self.action in ("status", "payment"):
            return [IsAuthenticated(), IsAdminOrBarber()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if not request.user.is_client:
            return Response(
                {"error": {"code": "forbidden", "message": "Only clients can book appointments."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()

        logger.info(
            "Appointment created: client=%s employee=%s service=%s start=%s id=%s",
            appointment.client.email,
            appointment.employee,
            appointment.service.name,
            appointment.start_time,
            appointment.id,
        )

        return Response(
            {"data": AppointmentReadSerializer(appointment, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        upcoming = request.query_params.get("upcoming")
        if upcoming and upcoming.lower() == "true":
            from django.utils import timezone
            qs = qs.filter(start_time__gte=timezone.now()).order_by("start_time")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = AppointmentReadSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response({"data": serializer.data})

        serializer = AppointmentReadSerializer(qs, many=True, context={"request": request})
        return Response({"data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        appointment = self.get_object()
        serializer  = AppointmentReadSerializer(appointment, context={"request": request})
        return Response({"data": serializer.data})

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        serializer  = AppointmentCancelSerializer(
            data    = request.data,
            context = {"request": request, "appointment": appointment},
        )
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()

        logger.info(
            "Appointment cancelled: id=%s by=%s reason='%s'",
            appointment.id,
            request.user.email,
            appointment.cancellation_reason,
        )

        return Response(
            {"data": AppointmentReadSerializer(appointment, context={"request": request}).data}
        )

    @action(detail=True, methods=["post"], url_path="status")
    def status(self, request, pk=None):
        appointment = self.get_object()
        serializer  = AppointmentStatusSerializer(
            data    = request.data,
            context = {"request": request, "appointment": appointment},
        )
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()

        logger.info(
            "Appointment status updated: id=%s new_status=%s by=%s",
            appointment.id,
            appointment.status,
            request.user.email,
        )

        return Response(
            {"data": AppointmentReadSerializer(appointment, context={"request": request}).data}
        )

    @action(detail=True, methods=["patch", "post"], url_path="payment")
    def payment(self, request, pk=None):
        appointment = self.get_object()
        serializer  = AppointmentPaymentSerializer(
            data    = request.data,
            context = {"request": request, "appointment": appointment},
        )
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()

        logger.info(
            "Appointment payment updated: id=%s payment_status=%s method=%s by=%s",
            appointment.id,
            appointment.payment.status,
            appointment.payment.method,
            request.user.email,
        )

        return Response(
            {"data": AppointmentReadSerializer(appointment, context={"request": request}).data}
        )
