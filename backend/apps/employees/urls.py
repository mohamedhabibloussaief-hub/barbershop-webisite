"""
apps/employees/urls.py
-----------------------
Manually nested routes — DRF's DefaultRouter doesn't support nesting
out of the box, so we use include() with explicit prefix patterns.

Generated URL patterns:

  GET  POST          /api/employees/
  GET  PUT PATCH DEL /api/employees/<employee_pk>/

  GET  POST          /api/employees/<employee_pk>/schedules/
  GET  PATCH DEL     /api/employees/<employee_pk>/schedules/<pk>/

  GET  POST          /api/employees/<employee_pk>/time-off/
  GET  DEL           /api/employees/<employee_pk>/time-off/<pk>/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, ScheduleViewSet, TimeOffViewSet

app_name = "employees"

# ── Top-level employee router ─────────────────────────────────────────────────
employee_router = DefaultRouter()
employee_router.register(r"", EmployeeViewSet, basename="employee")

# ── Nested schedule router ────────────────────────────────────────────────────
schedule_router = DefaultRouter()
schedule_router.register(r"", ScheduleViewSet, basename="schedule")

# ── Nested time-off router ────────────────────────────────────────────────────
timeoff_router = DefaultRouter()
timeoff_router.register(r"", TimeOffViewSet, basename="timeoff")

urlpatterns = [
    # /api/employees/ and /api/employees/<pk>/
    path("", include(employee_router.urls)),

    # /api/employees/<employee_pk>/schedules/ and …/<pk>/
    path(
        "<uuid:employee_pk>/schedules/",
        include(schedule_router.urls),
    ),

    # /api/employees/<employee_pk>/time-off/ and …/<pk>/
    path(
        "<uuid:employee_pk>/time-off/",
        include(timeoff_router.urls),
    ),
]
