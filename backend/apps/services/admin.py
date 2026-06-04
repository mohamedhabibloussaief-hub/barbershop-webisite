"""
apps/services/admin.py
"""
from django.contrib import admin
from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display   = ("name", "category", "price", "duration_minutes", "is_active", "updated_at")
    list_filter    = ("category", "is_active")
    search_fields  = ("name", "description")
    ordering       = ("category", "name")
    readonly_fields = ("id", "created_at", "updated_at")

    # Show all services in admin (including inactive).
    def get_queryset(self, request):
        return Service.all_objects.all()

    fieldsets = (
        (None, {
            "fields": ("id", "name", "description", "category"),
        }),
        ("Pricing & scheduling", {
            "fields": ("price", "duration_minutes"),
        }),
        ("Status", {
            "fields": ("is_active",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
