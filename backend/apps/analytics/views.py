"""
apps/analytics/views.py
------------------------
Five read-only analytics endpoints, all admin-only.

All views share:
  - IsAuthenticated + IsAdmin permission
  - Optional ?from_date=YYYY-MM-DD and ?to_date=YYYY-MM-DD filters
  - Default window: last 30 days when not supplied
  - Pure ORM aggregations — no raw SQL

Endpoints:
  GET /api/analytics/revenue/          -> daily + monthly revenue totals
  GET /api/analytics/appointments/     -> counts by employee and by status
  GET /api/analytics/cancellations/    -> rate + breakdown by who cancelled
  GET /api/analytics/top-services/     -> most booked services by volume
  GET /api/analytics/employee-stats/   -> per-employee summary (bookings, revenue, rating)
"""

import logging
from datetime import date, timedelta

from django.db.models import (
    Count, Sum, Avg, Q, F,
    DecimalField,
)
from django.db.models.functions import TruncDay, TruncMonth, Coalesce
from django.utils import timezone
from rest_framework.views       import APIView
from rest_framework.response    import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework             import status as http_status

from apps.users.permissions   import IsAdmin
from apps.appointments.models import Appointment, Payment
from apps.reviews.models      import Review

logger = logging.getLogger("barbershop")


# -- Shared helpers ------------------------------------------------------------

def _parse_date_range(request):
    """
    Parse ?from_date and ?to_date query parameters.
    Returns (from_date, to_date, errors).
    Defaults to the last 30 days when not supplied.
    """
    today        = date.today()
    default_from = today - timedelta(days=30)
    errors       = {}

    from_str = request.query_params.get("from_date")
    to_str   = request.query_params.get("to_date")

    try:
        from_date = date.fromisoformat(from_str) if from_str else default_from
    except ValueError:
        errors["from_date"] = "Invalid date. Use YYYY-MM-DD."
        from_date = default_from

    try:
        to_date = date.fromisoformat(to_str) if to_str else today
    except ValueError:
        errors["to_date"] = "Invalid date. Use YYYY-MM-DD."
        to_date = today

    return from_date, to_date, errors


def _appt_qs(from_date, to_date):
    """Base appointment queryset filtered to the requested date range."""
    tz    = timezone.get_current_timezone()
    start = timezone.make_aware(
        timezone.datetime.combine(from_date, timezone.datetime.min.time()), tz
    )
    end   = timezone.make_aware(
        timezone.datetime.combine(to_date, timezone.datetime.max.time()), tz
    )
    return Appointment.objects.filter(start_time__gte=start, start_time__lte=end)


# -- Base view -----------------------------------------------------------------

class BaseAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    http_method_names  = ["get"]

    def _date_range(self, request):
        from_date, to_date, errors = _parse_date_range(request)
        if errors:
            return None, None, errors
        return from_date, to_date, None

    def _error_response(self, errors):
        return Response(
            {
                "error": {
                    "code"   : "invalid_params",
                    "message": "Invalid parameters.",
                    "detail" : errors,
                }
            },
            status=http_status.HTTP_400_BAD_REQUEST,
        )


# -- 1. Revenue ----------------------------------------------------------------

class RevenueView(BaseAnalyticsView):
    """
    GET /api/analytics/revenue/

    Returns:
      revenue_by_day    [{date, total}]
      revenue_by_month  [{month, total}]
      total             sum over the entire range
      paid_count        number of paid payments
    Only counts Payment.status='paid'.
    """

    def get(self, request):
        from_date, to_date, errors = self._date_range(request)
        if errors:
            return self._error_response(errors)

        base_qs = Payment.objects.filter(
            status=Payment.Status.PAID,
            appointment__start_time__date__gte=from_date,
            appointment__start_time__date__lte=to_date,
        )

        by_day = (
            base_qs
            .annotate(day=TruncDay("appointment__start_time"))
            .values("day")
            .annotate(total=Sum("amount", output_field=DecimalField()))
            .order_by("day")
        )

        by_month = (
            base_qs
            .annotate(month=TruncMonth("appointment__start_time"))
            .values("month")
            .annotate(total=Sum("amount", output_field=DecimalField()))
            .order_by("month")
        )

        totals = base_qs.aggregate(
            total      = Coalesce(Sum("amount", output_field=DecimalField()), 0, output_field=DecimalField()),
            paid_count = Count("id"),
        )

        return Response({
            "data": {
                "from_date"       : str(from_date),
                "to_date"         : str(to_date),
                "total"           : str(totals["total"]),
                "paid_count"      : totals["paid_count"],
                "revenue_by_day"  : [
                    {"date": r["day"].date().isoformat(), "total": str(r["total"])}
                    for r in by_day
                ],
                "revenue_by_month": [
                    {"month": r["month"].strftime("%Y-%m"), "total": str(r["total"])}
                    for r in by_month
                ],
            }
        })


# -- 2. Appointments -----------------------------------------------------------

class AppointmentsAnalyticsView(BaseAnalyticsView):
    """
    GET /api/analytics/appointments/

    Returns:
      total        total appointments in range
      by_status    [{status, count}]
      by_employee  [{employee_id, employee_name, count}]
    """

    def get(self, request):
        from_date, to_date, errors = self._date_range(request)
        if errors:
            return self._error_response(errors)

        qs = _appt_qs(from_date, to_date)

        by_status = (
            qs
            .values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        by_employee = (
            qs
            .values(
                employee_id   = F("employee__id"),
                employee_name = F("employee__user__full_name"),
            )
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response({
            "data": {
                "from_date"  : str(from_date),
                "to_date"    : str(to_date),
                "total"      : qs.count(),
                "by_status"  : list(by_status),
                "by_employee": [
                    {
                        "employee_id"  : str(r["employee_id"]),
                        "employee_name": r["employee_name"],
                        "count"        : r["count"],
                    }
                    for r in by_employee
                ],
            }
        })


# -- 3. Cancellations ----------------------------------------------------------

class CancellationsView(BaseAnalyticsView):
    """
    GET /api/analytics/cancellations/

    Returns:
      total_appointments    total in range
      total_cancelled       how many were cancelled
      cancellation_rate_pct percentage (2 decimal places)
      by_initiator          [{initiator_role, count}]
    """

    def get(self, request):
        from_date, to_date, errors = self._date_range(request)
        if errors:
            return self._error_response(errors)

        qs              = _appt_qs(from_date, to_date)
        total           = qs.count()
        cancelled       = qs.filter(status=Appointment.Status.CANCELLED)
        total_cancelled = cancelled.count()
        rate            = round(total_cancelled / total * 100, 2) if total > 0 else 0.0

        by_role = (
            cancelled
            .values(initiator_role=F("cancelled_by__role"))
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response({
            "data": {
                "from_date"            : str(from_date),
                "to_date"              : str(to_date),
                "total_appointments"   : total,
                "total_cancelled"      : total_cancelled,
                "cancellation_rate_pct": rate,
                "by_initiator"         : [
                    {
                        "initiator_role": r["initiator_role"] or "unknown",
                        "count"         : r["count"],
                    }
                    for r in by_role
                ],
            }
        })


# -- 4. Top services -----------------------------------------------------------

class TopServicesView(BaseAnalyticsView):
    """
    GET /api/analytics/top-services/

    Returns:
      services [{service_id, service_name, booking_count, revenue}]
      sorted by booking_count descending.
    """

    def get(self, request):
        from_date, to_date, errors = self._date_range(request)
        if errors:
            return self._error_response(errors)

        qs = (
            _appt_qs(from_date, to_date)
            .values(
                service_id   = F("service__id"),
                service_name = F("service__name"),
            )
            .annotate(
                booking_count = Count("id"),
                revenue       = Coalesce(
                    Sum(
                        "payment__amount",
                        filter=Q(payment__status=Payment.Status.PAID),
                        output_field=DecimalField(),
                    ),
                    0,
                    output_field=DecimalField(),
                ),
            )
            .order_by("-booking_count")
        )

        return Response({
            "data": {
                "from_date": str(from_date),
                "to_date"  : str(to_date),
                "services" : [
                    {
                        "service_id"   : str(r["service_id"]),
                        "service_name" : r["service_name"],
                        "booking_count": r["booking_count"],
                        "revenue"      : str(r["revenue"]),
                    }
                    for r in qs
                ],
            }
        })


# -- 5. Employee stats ---------------------------------------------------------

class EmployeeStatsView(BaseAnalyticsView):
    """
    GET /api/analytics/employee-stats/

    Per-employee summary built from two queries joined in Python:
      1. Appointment aggregations (count, revenue) per employee
      2. Review aggregations (avg rating, count) per employee

    Two queries in Python is cleaner than one complex ORM JOIN
    and lets Django optimise each GROUP BY independently.
    """

    def get(self, request):
        from_date, to_date, errors = self._date_range(request)
        if errors:
            return self._error_response(errors)

        # Query 1: appointment + revenue stats
        appt_stats = (
            _appt_qs(from_date, to_date)
            .values(
                employee_id   = F("employee__id"),
                employee_name = F("employee__user__full_name"),
            )
            .annotate(
                total_appointments    = Count("id"),
                completed_appointments = Count(
                    "id", filter=Q(status=Appointment.Status.COMPLETED)
                ),
                total_revenue = Coalesce(
                    Sum(
                        "payment__amount",
                        filter=Q(payment__status=Payment.Status.PAID),
                        output_field=DecimalField(),
                    ),
                    0,
                    output_field=DecimalField(),
                ),
            )
            .order_by("-total_appointments")
        )

        # Query 2: review stats
        review_stats = (
            Review.objects
            .filter(
                appointment__start_time__date__gte=from_date,
                appointment__start_time__date__lte=to_date,
            )
            .values(employee_id=F("employee__id"))
            .annotate(
                avg_rating   = Avg("rating"),
                review_count = Count("id"),
            )
        )
        review_map = {str(r["employee_id"]): r for r in review_stats}

        # Join in Python
        result = []
        for row in appt_stats:
            emp_id  = str(row["employee_id"])
            reviews = review_map.get(emp_id, {})
            result.append({
                "employee_id"            : emp_id,
                "employee_name"          : row["employee_name"],
                "total_appointments"     : row["total_appointments"],
                "completed_appointments" : row["completed_appointments"],
                "total_revenue"          : str(row["total_revenue"]),
                "avg_rating"             : round(float(reviews.get("avg_rating") or 0), 2),
                "review_count"           : reviews.get("review_count", 0),
            })

        return Response({
            "data": {
                "from_date": str(from_date),
                "to_date"  : str(to_date),
                "employees": result,
            }
        })
