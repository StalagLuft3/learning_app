from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class User(AbstractUser):
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
    ]
    role = models.CharField(max_length=7, choices=ROLE_CHOICES)
    status = models.CharField(max_length=255, blank=True, null=True)

class Course(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    manager = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'teacher'})
    modules = models.ManyToManyField('Module', related_name='courses')

class Module(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    manager = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'teacher'})
    active_chat = models.BooleanField(default=False)
    
class ModuleStudent(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.FloatField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    feedback = models.TextField(null=True, blank=True)

class ModuleChatMessage(models.Model):
    module = models.ForeignKey('Module', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

class ModuleFile(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='module_files/')
    name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
