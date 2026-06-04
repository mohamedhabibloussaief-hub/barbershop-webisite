"""
config/urls.py — Root URL router. Complete Phase 2 surface.
"""

from django.contrib import admin
from django.urls    import path, include
from django.http    import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/",             admin.site.urls),
    path("api/health/",        health_check,   name="health_check"),

    # Auth
    path("api/auth/",          include("apps.users.urls",         namespace="users")),

    # Catalogue
    path("api/services/",      include("apps.services.urls",      namespace="services")),

    # Staff
    path("api/employees/",     include("apps.employees.urls",     namespace="employees")),

    # Availability engine
    path("api/availability/",  include("apps.availability.urls")),

    # Appointments
    path("api/appointments/",  include("apps.appointments.urls",  namespace="appointments")),

    # Reviews
    path("api/reviews/",       include("apps.reviews.urls",       namespace="reviews")),

    # Analytics (admin only)
    path("api/analytics/",     include("apps.analytics.urls")),
]
