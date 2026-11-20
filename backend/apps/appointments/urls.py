"""
apps/appointments/urls.py
--------------------------
DRF router generates standard patterns; custom actions are registered automatically.

Generated patterns:
  POST   /api/appointments/                  → create
  GET    /api/appointments/                  → list
  GET    /api/appointments/<uuid>/           → retrieve
  POST   /api/appointments/<uuid>/cancel/    → cancel action
  POST   /api/appointments/<uuid>/status/    → status action
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet

app_name = "appointments"

router = DefaultRouter()
router.register(r"", AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("", include(router.urls)),
]
