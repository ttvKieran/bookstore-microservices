from django.urls import path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Manager endpoints
    path('managers/register/', views.register_manager, name='register_manager'),
    path('managers/<uuid:manager_id>/', views.manager_detail, name='manager_detail'),
    path('managers/<uuid:manager_id>/update/', views.update_manager, name='update_manager'),
    path('managers/verify-credentials/', views.verify_credentials, name='verify_credentials'),
    
    # Dashboard & Analytics
    path('dashboard/', views.dashboard, name='dashboard'),
    path('managers/<uuid:manager_id>/reports/generate/', views.generate_report, name='generate_report'),
    path('reports/', views.list_reports, name='list_reports'),
    path('reports/<uuid:report_id>/', views.report_detail, name='report_detail'),
]
