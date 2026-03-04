from django.db import models
import uuid

class Staff(models.Model):
    ROLE_CHOICES = [
        ('sales', 'Sales'),
        ('support', 'Support'),
        ('warehouse', 'Warehouse'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='support')
    is_active = models.BooleanField(default=True)
    hired_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"
    
    class Meta:
        db_table = 'staff'
        ordering = ['-created_at']


class StaffActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=100)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.staff.username} - {self.activity_type}"
    
    class Meta:
        db_table = 'staff_activities'
        ordering = ['-timestamp']
        verbose_name_plural = 'Staff Activities'
