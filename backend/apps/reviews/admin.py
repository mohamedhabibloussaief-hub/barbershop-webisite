"""
apps/reviews/admin.py
"""
from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display   = ("employee", "rating", "comment_preview", "created_at")
    list_filter    = ("rating",)
    search_fields  = ("employee__user__full_name", "comment")
    readonly_fields = (
        "id", "appointment", "employee", "rating", "comment", "created_at"
    )
    ordering = ("-created_at",)

    # Reviews are immutable in the admin — clients submitted them.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def comment_preview(self, obj):
        return obj.comment[:60] + "…" if len(obj.comment) > 60 else obj.comment
    comment_preview.short_description = "Comment"
