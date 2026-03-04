from django.test import TestCase
from .models import Manager, Report

class ManagerModelTest(TestCase):
    def test_manager_creation(self):
        manager = Manager.objects.create(
            username='test_manager',
            email='manager@example.com',
            password_hash='hashed_password',
            full_name='Test Manager',
            department='Operations'
        )
        self.assertEqual(manager.username, 'test_manager')
        self.assertTrue(manager.is_active)
