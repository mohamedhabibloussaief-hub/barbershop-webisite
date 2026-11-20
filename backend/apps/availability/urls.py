"""
apps/availability/urls.py
--------------------------
Single endpoint — no router needed.

GET /api/availability/?employee=<uuid>&date=<YYYY-MM-DD>&service=<uuid>
"""

from django.urls import path
from .views import AvailabilityView

urlpatterns = [
    path("", AvailabilityView.as_view(), name="availability"),
]
