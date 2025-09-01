from django.contrib import admin
from django.urls import path, include
from .views import (
    root_redirect, student_home, teacher_home, profile, forbidden,
    update_status, teacher_student_search, course_module_search, edit_feedback
)
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('', root_redirect, name='root_redirect'),
    path('admin/', admin.site.urls),
    path('accounts/login/', auth_views.LoginView.as_view(template_name='learning_app/login.html'), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('profile/', profile, name='profile'),
    path('profile/<int:user_id>/', views.profile, name='profile'),
    path('student/home/', student_home, name='student_home'),
    path('teacher/home/', teacher_home, name='teacher_home'),
    path('teacher/home/<int:user_id>/', views.teacher_home, name='teacher_home_other'),
    path('student/home/<int:user_id>/', views.student_home, name='student_home_other'),
    path('forbidden/', forbidden, name='forbidden'),
    path('student/update_status/', update_status, name='update_status'),
    path('teacher/search-students/', teacher_student_search, name='teacher_student_search'),
    path('search/courses-modules/', course_module_search, name='course_module_search'),
    path('student/feedback/<int:module_id>/', edit_feedback, name='edit_feedback'),
    path('student/enrol/course/<int:course_id>/', views.enrol_course, name='enrol_course'),
    path('student/enrol/module/<int:module_id>/', views.enrol_module, name='enrol_module'),
    path('register/', views.register_student, name='register_student'),
    path('webchats/', views.webchats, name='webchats'),
    path('webchats/module/<int:module_id>/', views.module_chat, name='module_chat'),
    path('module/<int:module_id>/toggle_chat/', views.toggle_chat, name='toggle_chat'),
    path('teacher/create_course/', views.create_course, name='create_course'),
    path('teacher/create_module/', views.create_module, name='create_module'),
    path('teacher/course/<int:course_id>/add_module/', views.add_module_to_course, name='add_module_to_course'),
    path('teacher/module/<int:module_id>/set_deadline/', views.set_module_deadline, name='set_module_deadline'),
    path('teacher/module/<int:module_id>/student/<int:student_id>/set_score/', views.set_student_score, name='set_student_score'),
    path('module/<int:module_id>/files/', views.module_files, name='module_files'),
    path('teacher/module/<int:module_id>/upload_file/', views.upload_module_file, name='upload_module_file'),
    path('course/<int:pk>/', views.course_detail, name='course_detail'),
    path('manage_students/', views.manage_students, name='manage_students'),
    path('module/<int:module_id>/edit_deadline/', views.edit_deadline, name='edit_deadline'),
    path('module/<int:module_id>/student/<int:student_id>/edit_score/', views.edit_score, name='edit_score'),
    path('module/<int:module_id>/student/<int:student_id>/edit_deadline/', views.edit_deadline, name='edit_deadline'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
