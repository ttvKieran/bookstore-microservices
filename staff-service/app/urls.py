from django.urls import path
from . import views

urlpatterns = [
    # Health & Metrics
    path('health', views.health_check, name='health_check'),
    path('metrics', views.metrics, name='metrics'),
    
    # Staff endpoints
    path('staff/register/', views.register_staff, name='register_staff'),
    path('staff/', views.list_staff, name='list_staff'),
    path('staff/<uuid:staff_id>/', views.staff_detail, name='staff_detail'),
    path('staff/<uuid:staff_id>/update/', views.update_staff, name='update_staff'),
    path('staff/verify-credentials/', views.verify_credentials, name='verify_credentials'),
    
    # Activity endpoints
    path('staff/<uuid:staff_id>/activities/', views.staff_activities, name='staff_activities'),
    path('staff/<uuid:staff_id>/activities/log/', views.log_activity, name='log_activity'),
]
