from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from app.models import Customer


class Command(BaseCommand):
    help = 'Create test customer accounts'

    def handle(self, *args, **kwargs):
        # Test customer 1
        if not Customer.objects.filter(username='testuser').exists():
            customer1 = Customer.objects.create(
                username='testuser',
                email='test@bookstore.com',
                password_hash=make_password('testpass123'),
                full_name='Test User',
                phone='0123456789',
                is_active=True
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created test customer: {customer1.username} (ID: {customer1.id})'
                )
            )

        # Test customer 2
        if not Customer.objects.filter(username='john_doe').exists():
            customer2 = Customer.objects.create(
                username='john_doe',
                email='john@bookstore.com',
                password_hash=make_password('john123456'),
                full_name='John Doe',
                phone='0987654321',
                is_active=True
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created test customer: {customer2.username} (ID: {customer2.id})'
                )
            )

        self.stdout.write(
            self.style.WARNING('Test accounts created with passwords: testpass123, john123456')
        )
