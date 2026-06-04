"""
apps/users/urls.py
------------------
URL patterns for authentication.
Mounted at /api/auth/ from config/urls.py.

Full URL list:
  POST /api/auth/register/   → create account + return tokens
  POST /api/auth/login/      → verify credentials + return tokens
  POST /api/auth/refresh/    → exchange refresh token for new access token
  POST /api/auth/logout/     → blacklist refresh token
  GET  /api/auth/me/         → return current user profile
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import RegisterView, LoginView, LogoutView, MeView

app_name = "users"

urlpatterns = [
    path("register/", RegisterView.as_view(),  name="register"),
    path("login/",    LoginView.as_view(),      name="login"),
    path("refresh/",  TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/",   LogoutView.as_view(),     name="logout"),
    path("me/",       MeView.as_view(),         name="me"),
]
