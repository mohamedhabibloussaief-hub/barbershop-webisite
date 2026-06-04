"""
apps/services/urls.py
---------------------
DRF router wires the ViewSet to all standard URL patterns automatically.

Generated patterns:
  GET    /api/services/          → list
  POST   /api/services/          → create
  GET    /api/services/<uuid>/   → retrieve
  PUT    /api/services/<uuid>/   → update
  PATCH  /api/services/<uuid>/   → partial_update
  DELETE /api/services/<uuid>/   → destroy (soft-delete)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet

app_name = "services"

router = DefaultRouter()
router.register(r"", ServiceViewSet, basename="service")

urlpatterns = [
    path("", include(router.urls)),
]
