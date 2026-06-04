"""
apps/reviews/urls.py

Generated patterns:
  POST  /api/reviews/          → create
  GET   /api/reviews/          → list  (?employee=<uuid> filter supported)
  GET   /api/reviews/<uuid>/   → retrieve
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet

app_name = "reviews"

router = DefaultRouter()
router.register(r"", ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
]
