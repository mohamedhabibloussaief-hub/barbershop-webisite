"""
apps/users/models.py
--------------------
Custom User model.

CRITICAL: This model must be defined and registered via AUTH_USER_MODEL
in settings BEFORE the very first `manage.py migrate` is run.
Changing it afterwards requires a full database reset.

Design decisions:
  - UUID primary key: non-enumerable IDs in API URLs.
  - Email as the login identifier: no username field.
  - role field: drives all permission checks across the system.
  - is_active soft-delete: deactivate users without destroying appointment history.
  - AbstractBaseUser: gives full control; only `password` and `last_login` are inherited.
  - PermissionsMixin: adds is_superuser, groups, user_permissions — required for Django admin.
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    System-wide user. Covers all three roles: client, barber, admin.

    Role semantics:
      client  — books appointments, writes reviews, manages own profile.
      barber  — views/manages own schedule and appointments.
      admin   — full access to all resources, analytics, settings.
    """

    class Role(models.TextChoices):
        CLIENT = "client", _("Client")
        BARBER = "barber", _("Barber")
        ADMIN  = "admin",  _("Admin")

    # ── Primary key ──────────────────────────────────────────────────────────
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # ── Identity fields ──────────────────────────────────────────────────────
    email = models.EmailField(
        _("email address"),
        unique=True,
        db_index=True,
    )
    full_name = models.CharField(
        _("full name"),
        max_length=150,
    )
    phone = models.CharField(
        _("phone number"),
        max_length=20,
        blank=True,
        default="",
    )

    # ── Role ─────────────────────────────────────────────────────────────────
    role = models.CharField(
        _("role"),
        max_length=10,
        choices=Role.choices,
        default=Role.CLIENT,
        db_index=True,   # Frequently filtered in permission checks and admin views.
    )

    # ── Status flags ─────────────────────────────────────────────────────────
    # is_active: soft-delete. False = user cannot log in; data is preserved.
    is_active = models.BooleanField(
        _("active"),
        default=True,
    )
    # is_staff: required by Django admin — only users with is_staff=True can
    # access the /admin/ interface.
    is_staff = models.BooleanField(
        _("staff status"),
        default=False,
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(
        _("created at"),
        default=timezone.now,
        editable=False,
    )

    # ── Manager ───────────────────────────────────────────────────────────────
    objects = UserManager()

    # ── AbstractBaseUser required fields ──────────────────────────────────────
    # USERNAME_FIELD: the field used as the login identifier.
    USERNAME_FIELD  = "email"
    # REQUIRED_FIELDS: prompted by `createsuperuser` (in addition to USERNAME_FIELD).
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name        = _("user")
        verbose_name_plural = _("users")
        ordering            = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}>"

    # ── Convenience properties ────────────────────────────────────────────────
    @property
    def is_client(self) -> bool:
        return self.role == self.Role.CLIENT

    @property
    def is_barber(self) -> bool:
        return self.role == self.Role.BARBER

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN
