"""
apps/users/views.py
--------------------
Authentication views. All views are function-free — class-based so
permission_classes and http_method_names are explicit and overridable.

Response envelope for all auth endpoints:
  Success:  { "data": { ... } }
  Error:    { "error": { "code": ..., "message": ..., "detail": ... } }
            (handled globally by config/exceptions.py)

Endpoints:
  POST /api/auth/register/  → RegisterView
  POST /api/auth/login/     → LoginView
  POST /api/auth/refresh/   → TokenRefreshView (SimpleJWT, re-exported)
  POST /api/auth/logout/    → LogoutView
"""

import logging
from rest_framework         import status
from rest_framework.views   import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views       import TokenRefreshView  # re-exported as-is
from rest_framework_simplejwt.tokens      import RefreshToken
from rest_framework_simplejwt.exceptions  import TokenError, InvalidToken

from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer

logger = logging.getLogger("barbershop")


class RegisterView(APIView):
    """
    POST /api/auth/register/

    Public endpoint — no JWT required.
    Creates a client account and returns tokens immediately
    so the user lands in their portal without a second login step.

    Request body:
        email, full_name, password, password_confirm, phone (optional)

    Response 201:
        { "data": { "user": {...}, "access": "...", "refresh": "..." } }
    """

    permission_classes  = [AllowAny]
    http_method_names   = ["post"]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Generate tokens for the newly created user.
        refresh = RefreshToken.for_user(user)

        logger.info("New client registered: %s", user.email)

        return Response(
            {
                "data": {
                    "user"    : UserProfileSerializer(user).data,
                    "access"  : str(refresh.access_token),
                    "refresh" : str(refresh),
                }
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/

    Public endpoint — no JWT required.
    Validates credentials and returns a token pair + user profile.

    Request body:
        email, password

    Response 200:
        { "data": { "user": {...}, "access": "...", "refresh": "..." } }
    """

    permission_classes  = [AllowAny]
    http_method_names   = ["post"]

    def post(self, request):
        serializer = LoginSerializer(
            data    = request.data,
            context = {"request": request},
        )
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        user      = validated["user"]

        logger.info("User logged in: %s (role=%s)", user.email, user.role)

        return Response(
            {
                "data": {
                    "user"    : UserProfileSerializer(user).data,
                    "access"  : validated["access"],
                    "refresh" : validated["refresh"],
                }
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Authenticated endpoint — requires a valid access token in the
    Authorization header.

    Blacklists the refresh token so it cannot be used to obtain new
    access tokens. The current access token remains technically valid
    until its 15-minute expiry — acceptable for V1.

    Request body:
        { "refresh": "<refresh_token>" }

    Response 204: no body.
    """

    permission_classes  = [IsAuthenticated]
    http_method_names   = ["post"]

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
    GET /api/auth/me/

    Returns the profile of the currently authenticated user.
    Used by the React frontend on app load to rehydrate the auth context
    from a stored access token without re-entering credentials.

    Response 200:
        { "data": { "user": {...} } }
    """

    permission_classes  = [IsAuthenticated]
    http_method_names   = ["get"]

    def get(self, request):
        return Response(
            {"data": {"user": UserProfileSerializer(request.user).data}},
            status=status.HTTP_200_OK,
        )
