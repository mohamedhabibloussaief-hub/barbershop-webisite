"""
apps/employees/views.py
-----------------------
Three ViewSets wired as nested routes:

  EmployeeViewSet     → /api/employees/
  ScheduleViewSet     → /api/employees/<employee_pk>/schedules/
  TimeOffViewSet      → /api/employees/<employee_pk>/time-off/

Permission model:
  Employee list/retrieve  → any authenticated user
    (clients need this to choose a barber during booking)
  Employee write          → admin only
  Schedule read           → any authenticated user
  Schedule write          → the employee themselves OR admin
  TimeOff read            → the employee themselves OR admin
  TimeOff write           → the employee themselves OR admin
"""

import logging
from rest_framework             import status
from rest_framework.response    import Response
from rest_framework.viewsets    import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.shortcuts           import get_object_or_404

from apps.users.permissions import IsAdmin, IsAdminOrBarber
from .models       import Employee, Schedule, TimeOff
from .serializers  import (
    EmployeeReadSerializer, EmployeeWriteSerializer,
    ScheduleSerializer, TimeOffSerializer,
)

logger = logging.getLogger("barbershop")


# ─── Employee ─────────────────────────────────────────────────────────────────

class EmployeeViewSet(ModelViewSet):
    """
    /api/employees/
    /api/employees/<uuid:pk>/
    """

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EmployeeWriteSerializer
        return EmployeeReadSerializer

    def get_queryset(self):
        """
        Admins see all employees including inactive.
        All other users see only active employees.
        """
        user = self.request.user
        if user.is_authenticated and user.is_admin:
            return Employee.objects.select_related("user").all()
        return Employee.objects.select_related("user").filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: sets is_active=False, does not delete the row."""
        employee = self.get_object()
        if not employee.is_active:
            return Response(
                {"error": {"code": "already_inactive", "message": "Employee is already deactivated."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        employee.deactivate()
        logger.info("Employee deactivated: %s by admin %s", employee, request.user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Employee profile created for %s by admin %s",
                    instance, self.request.user.email)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Employee profile updated: %s by %s",
                    instance, self.request.user.email)


# ─── Helpers for nested views ─────────────────────────────────────────────────

def _get_employee(employee_pk: str) -> Employee:
    """
    Shared helper: resolve employee_pk from URL and return the Employee,
    or raise 404. Used by both ScheduleViewSet and TimeOffViewSet.
    """
    return get_object_or_404(Employee, pk=employee_pk, is_active=True)


def _is_own_profile(request, employee: Employee) -> bool:
    """True when the requesting user owns this employee profile."""
    return (
        hasattr(request.user, "employee_profile")
        and request.user.employee_profile.pk == employee.pk
    )


# ─── Schedule ─────────────────────────────────────────────────────────────────

class ScheduleViewSet(ModelViewSet):
    """
    /api/employees/<employee_pk>/schedules/
    /api/employees/<employee_pk>/schedules/<uuid:pk>/
    """

    serializer_class  = ScheduleSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminOrBarber()]

    def _get_employee(self):
        employee = _get_employee(self.kwargs["employee_pk"])
        # Barbers can only modify their own schedule.
        if (
            self.action not in ("list", "retrieve")
            and self.request.user.is_barber
            and not _is_own_profile(self.request, employee)
        ):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage your own schedule.")
        return employee

    def get_queryset(self):
        employee = self._get_employee()
        return Schedule.objects.filter(employee=employee)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["employee"] = _get_employee(self.kwargs["employee_pk"])
        return ctx

    def perform_create(self, serializer):
        employee = self._get_employee()
        instance = serializer.save(employee=employee)
        logger.info("Schedule created for %s: day=%s %s–%s by %s",
                    employee, instance.day_of_week,
                    instance.start_time, instance.end_time,
                    self.request.user.email)


# ─── TimeOff ──────────────────────────────────────────────────────────────────

class TimeOffViewSet(ModelViewSet):
    """
    /api/employees/<employee_pk>/time-off/
    /api/employees/<employee_pk>/time-off/<uuid:pk>/
    """

    serializer_class  = TimeOffSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "list":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminOrBarber()]

    def _get_employee(self):
        employee = _get_employee(self.kwargs["employee_pk"])
        if (
            self.action not in ("list",)
            and self.request.user.is_barber
            and not _is_own_profile(self.request, employee)
        ):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage your own time off.")
        return employee

    def get_queryset(self):
        employee = self._get_employee()
        return TimeOff.objects.filter(employee=employee)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["employee"] = _get_employee(self.kwargs["employee_pk"])
        return ctx

    def perform_create(self, serializer):
        employee = self._get_employee()
        instance = serializer.save(employee=employee)
        logger.info("Time off added for %s: %s (%s) by %s",
                    employee, instance.date,
                    instance.reason, self.request.user.email)
