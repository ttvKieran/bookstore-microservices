from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from app.models import Manager


class Command(BaseCommand):
    help = 'Create initial super manager account'

    def handle(self, *args, **kwargs):
        # Check if manager already exists
        if Manager.objects.filter(username='admin_manager').exists():
            self.stdout.write(self.style.WARNING('Admin manager already exists'))
            return

        # Create super manager
        manager = Manager.objects.create(
            username='admin_manager',
            email='admin@bookstore.com',
            password_hash=make_password('admin123456'),
            full_name='Admin Manager',
            department='Administration',
            is_active=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created admin manager: {manager.username} (ID: {manager.id})'
            )
        )
        self.stdout.write(
            self.style.WARNING('Default password: admin123456 - PLEASE CHANGE IT!')
        )
