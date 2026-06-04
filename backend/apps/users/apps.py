"""
apps/users/apps.py
------------------
AppConfig for the users app.
The `name` must match the dotted path used in INSTALLED_APPS.
"""

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name  = "apps.users"
    label = "users"          # Used as the DB table prefix: users_user
    verbose_name = "Users"
