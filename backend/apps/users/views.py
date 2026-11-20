"""
apps/users/views.py
--------------------
Authentication & user profile views.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .models import User
from .permissions import IsAdmin
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)

logger = logging.getLogger("barbershop")


class RegisterView(APIView):
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        logger.info("New client registered: %s", user.email)

        return Response(
            {
                "data": {
                    "user": UserProfileSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                }
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    http_method_names = ["post"]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        user = validated["user"]
        logger.info("User logged in: %s (role=%s)", user.email, user.role)

        return Response(
            {
                "data": {
                    "user": UserProfileSerializer(user).data,
                    "access": validated["access"],
                    "refresh": validated["refresh"],
                }
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    http_method_names = ["post"]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": {"code": "missing_token", "message": "Refresh token is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            raise InvalidToken({"detail": str(exc)})

        logger.info("User logged out: %s", request.user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    GET /api/auth/me/   -> return current user profile
    PATCH /api/auth/me/ -> update current user's full_name, email, phone
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get(self, request):
        return Response(
            {"data": {"user": UserProfileSerializer(request.user).data}},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info("User updated profile: %s", user.email)
        return Response(
            {"data": {"user": UserProfileSerializer(user).data}},
            status=status.HTTP_200_OK,
        )


class UserListView(APIView):
    """
    GET /api/auth/users/?role=barber
    Admin-only endpoint to list active users (e.g. unassigned barbers).
    """

    permission_classes = [IsAuthenticated, IsAdmin]
    http_method_names = ["get"]

    def get(self, request):
        qs = User.objects.filter(is_active=True).order_by("full_name")
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return Response(
            {"data": UserProfileSerializer(qs, many=True).data},
            status=status.HTTP_200_OK,
        )
