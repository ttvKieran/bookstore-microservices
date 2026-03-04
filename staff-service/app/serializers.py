from rest_framework import serializers
from .models import Staff, StaffActivity
from django.contrib.auth.hashers import make_password, check_password


class StaffActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffActivity
        fields = ['id', 'activity_type', 'description', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class StaffSerializer(serializers.ModelSerializer):
    activities = StaffActivitySerializer(many=True, read_only=True)
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Staff
        fields = ['id', 'username', 'email', 'password', 'full_name', 'role', 
                  'is_active', 'hired_date', 'created_at', 'updated_at', 'activities']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if password:
            validated_data['password_hash'] = make_password(password)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            validated_data['password_hash'] = make_password(password)
        return super().update(instance, validated_data)


class StaffRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(max_length=255)
    role = serializers.ChoiceField(choices=['sales', 'support', 'warehouse'], default='support')
    hired_date = serializers.DateField()
    
    def validate_username(self, value):
        if Staff.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if Staff.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['password_hash'] = make_password(password)
        return Staff.objects.create(**validated_data)


class CredentialVerificationSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        try:
            staff = Staff.objects.get(username=data['username'])
            if not staff.is_active:
                return {'valid': False, 'error': 'Staff account is inactive'}
            
            if check_password(data['password'], staff.password_hash):
                return {
                    'valid': True,
                    'user_id': str(staff.id),
                    'role': 'staff',
                    'staff_role': staff.role
                }
            else:
                return {'valid': False}
        except Staff.DoesNotExist:
            return {'valid': False}


class StaffUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = ['full_name', 'role', 'is_active']


class ActivityCreateSerializer(serializers.Serializer):
    activity_type = serializers.CharField(max_length=100)
    description = serializers.CharField()
