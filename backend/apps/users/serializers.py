"""
apps/users/serializers.py
--------------------------
Serializers for authentication & profile flows.
"""

from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only snapshot of the authenticated user.
    """

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone", "role")
        read_only_fields = fields


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Allows an authenticated user to update their own full_name, email, and phone.
    """

    class Meta:
        model = User
        fields = ("full_name", "email", "phone")

    def validate_email(self, value: str) -> str:
        email = value.lower().strip()
        qs = User.objects.filter(email=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
        return email

    def validate_full_name(self, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError(_("Full name must be at least 2 characters."))
        return cleaned

    def to_representation(self, instance: User):
        return UserProfileSerializer(instance, context=self.context).data


class RegisterSerializer(serializers.Serializer):
    email            = serializers.EmailField()
    full_name        = serializers.CharField(max_length=150)
    phone            = serializers.CharField(max_length=20, required=False, default="", allow_blank=True)
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
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(_("A user with this email already exists."))
        return email

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": _("Passwords do not match.")})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            email     = validated_data["email"],
            password  = validated_data["password"],
            full_name = validated_data["full_name"],
            phone     = validated_data.get("phone", ""),
            role      = User.Role.CLIENT,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict) -> dict:
        email    = attrs["email"].lower().strip()
        password = attrs["password"]

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

        refresh = RefreshToken.for_user(user)

        return {
            "user"    : user,
            "access"  : str(refresh.access_token),
            "refresh" : str(refresh),
        }
