"""
apps/services/serializers.py
-----------------------------
Two serializers for the Service model:

  ServiceReadSerializer  → public-facing, read-only
  ServiceWriteSerializer → admin-only create/update with full validation

Why two serializers instead of one?
The read serializer adds computed or display-only fields (price_display)
that are not part of the write contract. Separating them makes both
simpler and prevents accidentally exposing write fields to the public.
"""

from rest_framework import serializers
from .models import Service


class ServiceReadSerializer(serializers.ModelSerializer):
    """
    Read-only representation returned to all authenticated users.
    Adds price_display (formatted string) for convenience on the frontend.
    """

    # "19.000 TND" — formatted for display in the client portal.
    price_display = serializers.SerializerMethodField()

    class Meta:
        model  = Service
        fields = (
            "id",
            "name",
            "description",
            "category",
            "price",
            "price_display",
            "duration_minutes",
            "is_active",
        )
        read_only_fields = fields

    def get_price_display(self, obj: Service) -> str:
        return f"{obj.price} TND"


class ServiceWriteSerializer(serializers.ModelSerializer):
    """
    Create / update serializer — admin only.

    Validates:
      - price must be > 0
      - duration_minutes must be > 0
      - name uniqueness is enforced at the model level (unique=True),
        but validated here to return a clean 400 before the DB constraint fires.
    """

    class Meta:
        model  = Service
        fields = (
            "name",
            "description",
            "category",
            "price",
            "duration_minutes",
            "is_active",
        )
        extra_kwargs = {
            "is_active": {"required": False},
        }

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration must be greater than zero.")
        return value

    def validate_name(self, value: str) -> str:
        """
        Check name uniqueness on create and on update (excluding self).
        """
        qs = Service.all_objects.filter(name__iexact=value)
        # On update, exclude the current instance.
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A service with this name already exists.")
        return value

    def to_representation(self, instance: Service):
        """
        After a write operation, return the full read representation
        so the API response is consistent regardless of the HTTP method.
        """
        return ServiceReadSerializer(instance, context=self.context).data
