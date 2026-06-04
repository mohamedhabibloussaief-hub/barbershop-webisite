"""
apps/users/serializers.py
--------------------------
Serializers for authentication flows.

RegisterSerializer   → validates + creates a new client account
LoginSerializer      → validates credentials, returns tokens + user data
UserProfileSerializer → read-only representation of the current user
                        (returned in register and login responses)
"""

from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only snapshot of the authenticated user.
    Returned inside register and login responses so the React frontend
    can populate its auth context in a single round-trip.
    """

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone", "role")
        read_only_fields = fields


# ─── Registration ──────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    """
    Validates and creates a new client account.

    Security notes:
      - `role` is NOT an accepted field — clients cannot self-assign a role.
      - `password` is write-only and never returned in any response.
      - `password_confirm` is validated against `password` and then discarded;
        it is never stored.
      - Email uniqueness is enforced at the DB level (unique=True on the model)
        and validated here to return a clean 400 before hitting the DB.
    """

    email            = serializers.EmailField()
    full_name        = serializers.CharField(max_length=150)
    phone            = serializers.CharField(max_length=20, required=False, default="")
    password         = serializers.CharField(
        min_length=8,
        write_only=True,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_email(self, value: str) -> str:
        """Reject duplicate emails with a clear message before the DB UNIQUE violation."""
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
        return email

    def validate(self, attrs: dict) -> dict:
        """Cross-field validation: passwords must match."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": _("Passwords do not match.")})
        return attrs

    def create(self, validated_data: dict) -> User:
        """
        Remove password_confirm (not a model field) and create the user.
        create_user() hashes the password — it is never stored in plaintext.
        """
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            email     = validated_data["email"],
            password  = validated_data["password"],
            full_name = validated_data["full_name"],
            phone     = validated_data.get("phone", ""),
            role      = User.Role.CLIENT,  # Explicitly enforced, not defaulted.
        )
        return user


# ─── Login ────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """
    Validates email + password, returns JWT tokens and user profile.

    Why not use SimpleJWT's TokenObtainPairSerializer directly?
    That serializer returns only `access` and `refresh`. We need to return
    the user's `role` and profile data alongside the tokens so the React
    frontend can redirect to the correct portal without a second API call.

    Security note: authenticate() uses Django's authentication backend,
    which calls check_password() — constant-time comparison, resistant to
    timing attacks. We never compare passwords manually.
    """

    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict) -> dict:
        email    = attrs["email"].lower().strip()
        password = attrs["password"]

        # authenticate() returns None for wrong credentials OR inactive users.
        user = authenticate(
            request  = self.context.get("request"),
            email    = email,
            password = password,
        )

        if user is None:
            raise serializers.ValidationError(
                {"non_field_errors": [_("Invalid email or password.")]}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": [_("This account has been deactivated.")]}
            )

        # Generate a fresh token pair for this user.
        refresh = RefreshToken.for_user(user)

        return {
            "user"    : user,
            "access"  : str(refresh.access_token),
            "refresh" : str(refresh),
        }
