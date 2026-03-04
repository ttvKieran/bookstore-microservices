from django.test import TestCase
from .models import Category, Genre

class CategoryModelTest(TestCase):
    def test_category_creation(self):
        category = Category.objects.create(
            name='Fiction',
            description='Fiction books'
        )
        self.assertEqual(category.name, 'Fiction')
