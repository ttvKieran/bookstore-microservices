from django.test import TestCase
from .models import Staff, StaffActivity

class StaffModelTest(TestCase):
    def test_staff_creation(self):
        staff = Staff.objects.create(
            username='test_staff',
            email='test@example.com',
            password_hash='hashed_password',
            full_name='Test Staff',
            role='sales',
            hired_date='2026-01-01'
        )
        self.assertEqual(staff.username, 'test_staff')
        self.assertTrue(staff.is_active)
