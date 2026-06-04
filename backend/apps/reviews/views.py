"""
apps/reviews/views.py
----------------------
ReviewViewSet handles three operations:

  POST  /api/reviews/               → client submits a review
  GET   /api/reviews/               → list (filterable by ?employee=<uuid>)
  GET   /api/reviews/<uuid>/        → retrieve one review

Permission model:
  create   → clients only (IsAuthenticated + is_client check in create())
  list     → any authenticated user (clients browse barber ratings)
  retrieve → any authenticated user
"""

import logging
from rest_framework             import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response    import Response
from rest_framework.viewsets    import GenericViewSet
from rest_framework.mixins      import CreateModelMixin, RetrieveModelMixin, ListModelMixin

from .models       import Review
from .serializers  import ReviewReadSerializer, ReviewCreateSerializer

logger = logging.getLogger("barbershop")


class ReviewViewSet(
    CreateModelMixin,
    RetrieveModelMixin,
    ListModelMixin,
    GenericViewSet,
):
    """
    /api/reviews/
    /api/reviews/<uuid:pk>/
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        All reviews are publicly readable by authenticated users.
        Supports ?employee=<uuid> filter for the client portal
        (show reviews for a specific barber before booking).
        """
        qs = Review.objects.select_related(
            "employee__user",
            "appointment__client",
        ).all()

        employee_id = self.request.query_params.get("employee")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return ReviewCreateSerializer
        return ReviewReadSerializer

    # ── Create ────────────────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        """Only clients can submit reviews."""
        if not request.user.is_client:
            return Response(
                {"error": {"code": "forbidden", "message": "Only clients can submit reviews."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ReviewCreateSerializer(
            data    = request.data,
            context = {"request": request},
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        logger.info(
            "Review created: appointment=%s employee=%s rating=%s by=%s",
            review.appointment_id,
            review.employee,
            review.rating,
            request.user.email,
        )

        return Response(
            {"data": ReviewReadSerializer(review, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )

    # ── List ──────────────────────────────────────────────────────────────────
    def list(self, request, *args, **kwargs):
        qs   = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ReviewReadSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response({"data": serializer.data})

        serializer = ReviewReadSerializer(qs, many=True, context={"request": request})
        return Response({"data": serializer.data})

    # ── Retrieve ──────────────────────────────────────────────────────────────
    def retrieve(self, request, *args, **kwargs):
        review     = self.get_object()
        serializer = ReviewReadSerializer(review, context={"request": request})
        return Response({"data": serializer.data})
