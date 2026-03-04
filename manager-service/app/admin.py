from django.contrib import admin
from .models import Manager, Report

@admin.register(Manager)
class ManagerAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'full_name', 'department', 'is_active']
    list_filter = ['department', 'is_active']
    search_fields = ['username', 'email', 'full_name']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['report_type', 'generated_by', 'created_at']
    list_filter = ['report_type', 'created_at']
    search_fields = ['report_type', 'generated_by__username']
