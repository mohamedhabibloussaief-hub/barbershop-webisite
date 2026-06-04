"""
apps/users/permissions.py
--------------------------
Reusable DRF permission classes based on the user's role field.

Usage in any view:
    from apps.users.permissions import IsAdmin, IsBarber, IsClient

    class MyView(APIView):
        permission_classes = [IsAuthenticated, IsAdmin]

These are intentionally simple — each checks a single role property.
Combine them with | for "either role":
    permission_classes = [IsAuthenticated, IsAdmin | IsBarber]
"""

from rest_framework.permissions import BasePermission


class IsClient(BasePermission):
    """Allow access only to users with role='client'."""
    message = "Access restricted to clients."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_client
        )


class IsBarber(BasePermission):
    """Allow access only to users with role='barber'."""
    message = "Access restricted to barbers."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_barber
        )


class IsAdmin(BasePermission):
    """Allow access only to users with role='admin'."""
    message = "Access restricted to admins."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


class IsAdminOrBarber(BasePermission):
    """Allow access to admins and barbers (e.g. appointment management)."""
    message = "Access restricted to admins and barbers."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin or request.user.is_barber)
        )
