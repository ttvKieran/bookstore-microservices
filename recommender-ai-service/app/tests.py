from django.test import TestCase
from .models import Recommendation, CustomerInteraction

class RecommendationModelTest(TestCase):
    def test_recommendation_creation(self):
        rec = Recommendation.objects.create(
            customer_id='123e4567-e89b-12d3-a456-426614174000',
            book_id=1,
            score=0.95,
            algorithm='collaborative'
        )
        self.assertEqual(rec.algorithm, 'collaborative')
