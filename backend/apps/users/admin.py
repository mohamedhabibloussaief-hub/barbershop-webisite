"""
apps/users/admin.py
-------------------
Registers the custom User model with Django admin.

Uses UserAdmin as the base so the admin interface keeps:
  - Password hashing form (not a plain text input)
  - "Change password" link
  - Proper fieldset layout

The default UserAdmin expects a `username` field, so we override
fieldsets and add_fieldsets to replace it with `email`.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # ── List view ─────────────────────────────────────────────────────────────
    list_display  = ("email", "full_name", "role", "is_active", "is_staff", "created_at")
    list_filter   = ("role", "is_active", "is_staff")
    search_fields = ("email", "full_name", "phone")
    ordering      = ("-created_at",)

    # ── Detail view fieldsets ─────────────────────────────────────────────────
    # Replaces the default fieldset that includes `username`.
    fieldsets = (
        (None, {
            "fields": ("email", "password"),
        }),
        (_("Personal info"), {
            "fields": ("full_name", "phone"),
        }),
        (_("Role & permissions"), {
            "fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        (_("Important dates"), {
            "fields": ("last_login", "created_at"),
        }),
    )
    readonly_fields = ("created_at", "last_login")

    # ── Add user form ─────────────────────────────────────────────────────────
    # The "Add user" form in admin — requires email + password confirmation.
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  ("email", "full_name", "role", "password1", "password2"),
        }),
    )
