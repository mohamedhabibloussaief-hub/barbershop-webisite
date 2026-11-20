"""
apps/analytics/urls.py

GET /api/analytics/revenue/
GET /api/analytics/appointments/
GET /api/analytics/cancellations/
GET /api/analytics/top-services/
GET /api/analytics/employee-stats/
"""

from django.urls import path
from .views import (
    RevenueView,
    AppointmentsAnalyticsView,
    CancellationsView,
    TopServicesView,
    EmployeeStatsView,
)

urlpatterns = [
    path("revenue/",        RevenueView.as_view(),              name="analytics-revenue"),
    path("appointments/",   AppointmentsAnalyticsView.as_view(), name="analytics-appointments"),
    path("cancellations/",  CancellationsView.as_view(),        name="analytics-cancellations"),
    path("top-services/",   TopServicesView.as_view(),          name="analytics-top-services"),
    path("employee-stats/", EmployeeStatsView.as_view(),        name="analytics-employee-stats"),
]
