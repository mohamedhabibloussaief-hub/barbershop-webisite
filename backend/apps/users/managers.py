"""
apps/users/managers.py
----------------------
Custom manager for the User model.

Django requires a manager that implements:
  - create_user(email, password, **extra_fields)
  - create_superuser(email, password, **extra_fields)

These are called by:
  - python manage.py createsuperuser
  - User.objects.create_user(...)  in tests and seeds
  - Django admin user creation form
"""

from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """
    Manager for the email-based User model.
    Removes any dependency on Django's default username field.
    """

    def create_user(self, email: str, password: str, **extra_fields):
        """
        Create and return a regular user with a hashed password.
        Called for client self-registration and seeding test data.
        """
        if not email:
            raise ValueError(_("An email address is required."))

        email = self.normalize_email(email)

        # Default role is "client" — the safest default.
        # A user cannot self-promote to barber or admin through this method.
        extra_fields.setdefault("role", "client")
        extra_fields.setdefault("is_active", True)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)   # Hashes the password — never stored in plaintext.
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        """
        Create and return a superuser (Django admin access).
        Called by: python manage.py createsuperuser
        """
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(email, password, **extra_fields)
