from django import forms
from .models import User, Course, Module, ModuleFile

class StatusUpdateForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['status']

class StudentRegistrationForm(forms.Form):
    username = forms.CharField(max_length=150)
    full_name = forms.CharField(max_length=150)
    password = forms.CharField(widget=forms.PasswordInput)
    passcode = forms.CharField(max_length=50)

class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['name', 'description']

class ModuleForm(forms.ModelForm):
    class Meta:
        model = Module
        fields = ['name', 'description', 'active_chat']

class ModuleDeadlineForm(forms.Form):
    deadline = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))

class ModuleFileForm(forms.ModelForm):
    class Meta:
        model = ModuleFile
        fields = ['name', 'file']