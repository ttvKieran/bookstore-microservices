from rest_framework import serializers
from .models import Manager, Report
from django.contrib.auth.hashers import make_password, check_password


class ManagerSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Manager
        fields = ['id', 'username', 'email', 'password', 'full_name', 
                  'department', 'is_active', 'created_at', 'updated_at']
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


class ManagerRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(max_length=255)
    department = serializers.CharField(max_length=100)
    
    def validate_username(self, value):
        if Manager.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if Manager.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['password_hash'] = make_password(password)
        return Manager.objects.create(**validated_data)


class CredentialVerificationSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        try:
            manager = Manager.objects.get(username=data['username'])
            if not manager.is_active:
                return {'valid': False, 'error': 'Manager account is inactive'}
            
            if check_password(data['password'], manager.password_hash):
                return {
                    'valid': True,
                    'user_id': str(manager.id),
                    'role': 'manager',
                    'department': manager.department
                }
            else:
                return {'valid': False}
        except Manager.DoesNotExist:
            return {'valid': False}


class ReportSerializer(serializers.ModelSerializer):
    generated_by_username = serializers.CharField(source='generated_by.username', read_only=True)
    
    class Meta:
        model = Report
        fields = ['id', 'report_type', 'generated_by', 'generated_by_username', 
                  'data', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReportCreateSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(choices=['sales', 'inventory', 'customer', 'revenue'])
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
