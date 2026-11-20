"""
apps/availability/views.py
---------------------------
Single view: AvailabilityView

Parses query parameters, delegates to the availability service,
and returns the result as a JSON array of ISO-8601 datetime strings.

GET /api/availability/?employee=<uuid>&date=<YYYY-MM-DD>&service=<uuid>

Response 200:
{
    "data": {
        "employee_id": "...",
        "date": "2026-06-10",
        "service_id": "...",
        "duration_minutes": 30,
        "slots": [
            "2026-06-10T09:00:00+01:00",
            "2026-06-10T09:30:00+01:00",
            ...
        ]
    }
}

Response 400:
    Missing or invalid query parameters.

Response 404:
    Employee or service not found / inactive.
"""

import logging
from datetime import date as date_type

from django.shortcuts      import get_object_or_404
from rest_framework        import status
from rest_framework.views  import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.employees.models import Employee
from apps.services.models  import Service
from .service import get_available_slots

logger = logging.getLogger("barbershop")


class AvailabilityView(APIView):
    """
    GET /api/availability/

    Query parameters (all required):
        employee  — UUID of the employee
        date      — ISO date string YYYY-MM-DD
        service   — UUID of the service

    Public to all authenticated users — clients need this to complete
    the booking wizard; barbers and admins use it to check open slots.
    """

    permission_classes  = [IsAuthenticated]
    http_method_names   = ["get"]

    def get(self, request):
        # ── Parse & validate query parameters ────────────────────────────────
        errors = {}

        # employee
        employee_id = request.query_params.get("employee")
        if not employee_id:
            errors["employee"] = "This query parameter is required."

        # date
        date_str = request.query_params.get("date")
        if not date_str:
            errors["date"] = "This query parameter is required."
        else:
            try:
                requested_date = date_type.fromisoformat(date_str)
            except ValueError:
                errors["date"] = "Invalid date format. Use YYYY-MM-DD."

        # service
        service_id = request.query_params.get("service")
        if not service_id:
            errors["service"] = "This query parameter is required."

        if errors:
            return Response(
                {"error": {"code": "invalid_params", "message": "Invalid query parameters.", "detail": errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Resolve objects ───────────────────────────────────────────────────
        employee = get_object_or_404(Employee, pk=employee_id, is_active=True)
        service  = get_object_or_404(Service,  pk=service_id,  is_active=True)

        # ── Run the availability engine ───────────────────────────────────────
        slots = get_available_slots(
            employee       = employee,
            requested_date = requested_date,
            service        = service,
        )

        # ── Serialise slot datetimes to ISO-8601 strings ──────────────────────
        # isoformat() on a timezone-aware datetime produces e.g.
        # "2026-06-10T09:00:00+01:00" which JavaScript's Date.parse() handles natively.
        slot_strings = [slot.isoformat() for slot in slots]

        return Response(
            {
                "data": {
                    "employee_id"      : str(employee.id),
                    "date"             : date_str,
                    "service_id"       : str(service.id),
                    "duration_minutes" : service.duration_minutes,
                    "slots"            : slot_strings,
                }
            },
            status=status.HTTP_200_OK,
        )
