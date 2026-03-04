from django.contrib import admin
from .models import Staff, StaffActivity

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'full_name', 'role', 'is_active', 'hired_date']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'email', 'full_name']

@admin.register(StaffActivity)
class StaffActivityAdmin(admin.ModelAdmin):
    list_display = ['staff', 'activity_type', 'timestamp']
    list_filter = ['activity_type', 'timestamp']
    search_fields = ['staff__username', 'description']
