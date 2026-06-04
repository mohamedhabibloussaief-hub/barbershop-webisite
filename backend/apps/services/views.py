"""
apps/services/views.py
-----------------------
ServiceViewSet handles all six standard actions on the /api/services/ endpoint.

Permission model:
  list, retrieve      → any authenticated user (clients, barbers, admins)
  create, update,
  partial_update,
  destroy             → admin only

The destroy action is a soft-delete — it calls service.deactivate() instead
of deleting the row, preserving appointment and revenue history.

Queryset:
  - Standard requests use Service.objects (ActiveManager) → active only.
  - Admin list requests use Service.all_objects → includes inactive,
    so the admin portal can see and reactivate deactivated services.
"""

import logging
from rest_framework             import status
from rest_framework.response    import Response
from rest_framework.viewsets    import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsAdmin
from .models       import Service
from .serializers  import ServiceReadSerializer, ServiceWriteSerializer

logger = logging.getLogger("barbershop")


class ServiceViewSet(ModelViewSet):
    """
    /api/services/
    /api/services/<uuid:pk>/
    """

    # ── Permission routing ────────────────────────────────────────────────────
    def get_permissions(self):
        """
        Read actions are open to any authenticated user.
        Write actions are restricted to admins.
        """
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    # ── Serializer routing ────────────────────────────────────────────────────
    def get_serializer_class(self):
        """
        Use the write serializer for mutations, read serializer for everything else.
        This ensures consistent response shapes: after a POST/PUT/PATCH,
        the response contains the same fields as a GET.
        """
        if self.action in ("create", "update", "partial_update"):
            return ServiceWriteSerializer
        return ServiceReadSerializer

    # ── Queryset ──────────────────────────────────────────────────────────────
    def get_queryset(self):
        """
        Admins listing services see all (including inactive) so they can
        manage and reactivate them.
        All other users see only active services.
        """
        user = self.request.user
        if user.is_authenticated and user.is_admin and self.action == "list":
            return Service.all_objects.all()
        return Service.objects.all()

    # ── Soft-delete override ──────────────────────────────────────────────────
    def destroy(self, request, *args, **kwargs):
        """
        Override DELETE to perform a soft-delete (is_active=False)
        instead of a hard database DELETE.

        This preserves all appointment and revenue records that reference
        this service. A hard delete would break historical data integrity.
        """
        service = self.get_object()

        if not service.is_active:
            return Response(
                {"error": {"code": "already_inactive", "message": "Service is already deactivated."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service.deactivate()
        logger.info("Service deactivated: %s (id=%s) by admin %s",
                    service.name, service.id, request.user.email)

        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Logging ───────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("Service created: %s (id=%s) by admin %s",
                    instance.name, instance.id, self.request.user.email)

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info("Service updated: %s (id=%s) by admin %s",
                    instance.name, instance.id, self.request.user.email)
