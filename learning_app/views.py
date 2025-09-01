from django.http import HttpResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Q
from django.conf import settings
from .models import Course, Module, ModuleStudent, User, ModuleChatMessage, ModuleFile
from .forms import (
    StatusUpdateForm, StudentRegistrationForm,
    CourseForm, ModuleForm, ModuleDeadlineForm, ModuleFileForm
)
from django.views.decorators.http import require_POST


def is_teacher(user):
    return user.is_authenticated and user.role == 'teacher'

def landing_page(request):
    return HttpResponse("Learning App landing page")

@login_required
def profile(request, user_id=None):
    if user_id:
        user_obj = get_object_or_404(User, pk=user_id)
    else:
        user_obj = request.user
    return render(request, 'learning_app/profile.html', {
        'user': user_obj,
    })

@login_required
def student_home(request):
    if request.user.role != 'student':
        return redirect('forbidden')
    enrolled_module_ids = ModuleStudent.objects.filter(student=request.user).values_list('module_id', flat=True)
    enrolled_modules = Module.objects.filter(id__in=enrolled_module_ids)
    enrolled_courses = Course.objects.filter(modules__in=enrolled_modules).distinct()
    available_courses = Course.objects.exclude(id__in=enrolled_courses.values_list('id', flat=True))
    available_modules = Module.objects.exclude(id__in=enrolled_module_ids)
    enrollments = {e.module_id: e for e in ModuleStudent.objects.filter(student=request.user)}
    return render(request, 'learning_app/student_home.html', {
        'enrolled_courses': enrolled_courses,
        'enrolled_modules': enrolled_modules,
        'available_courses': available_courses,
        'available_modules': available_modules,
        'enrollments': enrollments,
    })

@login_required
def enrol_course(request, course_id):
    course = get_object_or_404(Course, pk=course_id)
    if request.method == "POST":
        for module in course.modules.all():
            ModuleStudent.objects.get_or_create(module=module, student=request.user)
    return redirect('student_home')

from django.shortcuts import get_object_or_404, redirect
from .models import Module, ModuleStudent

@login_required
def enrol_module(request, module_id):
    module = get_object_or_404(Module, pk=module_id)
    if request.method == "POST":
        ModuleStudent.objects.get_or_create(module=module, student=request.user)
    return redirect('student_home')

@login_required
def teacher_home(request):
    if not is_teacher(request.user):
        return redirect('forbidden')
    courses = Course.objects.filter(manager=request.user).prefetch_related(
        'modules__modulestudent_set__student'
    )
    return render(request, 'learning_app/teacher_home.html', {'courses': courses})

def root_redirect(request):
    if not request.user.is_authenticated:
        return redirect('login')
    if request.user.role == 'student':
        return redirect('student_home')
    elif request.user.role == 'teacher':
        return redirect('teacher_home')
    else:
        return redirect('profile')

@login_required
def forbidden(request):
    redirect_url = 'student_home' if request.user.role == 'student' else 'teacher_home'
    return render(request, 'learning_app/forbidden.html', {'redirect_url': redirect_url})

@login_required
def update_status(request):
    if request.user.role != 'student':
        return redirect('forbidden')
    form = StatusUpdateForm(request.POST or None, instance=request.user)
    if request.method == 'POST' and form.is_valid():
        form.save()
        return redirect('student_home')
    return render(request, 'learning_app/update_status.html', {'form': form})

@login_required
def teacher_student_search(request):
    if not is_teacher(request.user):
        return redirect('forbidden')
    query = request.GET.get('q', '')
    students = User.objects.filter(role='student')
    if query:
        students = students.filter(
            Q(full_name__icontains=query) |
            Q(username__icontains=query)
        )
    return render(request, 'learning_app/teacher_student_search.html', {
        'students': students,
    })

@login_required
def course_module_search(request):
    if request.user.role not in ['student', 'teacher']:
        return redirect('forbidden')
    query = request.GET.get('q', '')
    courses = Course.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query) | Q(manager__full_name__icontains=query)
    ) if query else []
    modules = Module.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query) | Q(manager__full_name__icontains=query)
    ) if query else []
    return render(request, 'learning_app/course_module_search.html', {
        'courses': courses,
        'modules': modules,
        'query': query,
    })

@login_required
def edit_feedback(request, module_id):
    enrollment = get_object_or_404(ModuleStudent, module_id=module_id, student=request.user)
    if request.user.role != 'student':
        return HttpResponseForbidden("Forbidden")
    if request.method == 'POST':
        feedback = request.POST.get('feedback', '')
        enrollment.feedback = feedback
        enrollment.save()
        return redirect('student_home')
    return render(request, 'learning_app/edit_feedback.html', {'enrollment': enrollment})

def register_student(request):
    error = None
    form = StudentRegistrationForm(request.POST or None)
    if request.method == 'POST':
        if form.is_valid():
            if form.cleaned_data['passcode'] != settings.STUDENT_REGISTRATION_PASSCODE:
                error = "Invalid passcode."
            elif User.objects.filter(username=form.cleaned_data['username']).exists():
                error = "Username already taken."
            else:
                User.objects.create_user(
                    username=form.cleaned_data['username'],
                    full_name=form.cleaned_data['full_name'],
                    password=form.cleaned_data['password'],
                    role='student'
                )
                return redirect('login')
    return render(request, 'learning_app/registration.html', {'form': form, 'error': error})

@login_required
def module_chat(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    if not module.active_chat:
        return HttpResponseForbidden("Chat not active for this module.")
    if not ModuleStudent.objects.filter(module=module, student=request.user).exists() and module.manager != request.user:
        return HttpResponseForbidden()
    messages = ModuleChatMessage.objects.filter(module=module).order_by('timestamp')[:50]
    return render(request, 'learning_app/module_chat.html', {
        'module': module,
        'messages': messages,
    })

@login_required
def webchats(request):
    modules = Module.objects.filter(
        Q(modulestudent__student=request.user) | Q(manager=request.user),
        active_chat=True
    ).distinct()
    return render(request, 'learning_app/webchats.html', {'modules': modules})

@login_required
def toggle_chat(request, module_id):
    module = get_object_or_404(Module, id=module_id, manager=request.user)
    if request.method == 'POST':
        module.active_chat = not module.active_chat
        module.save()
    return redirect('teacher_home')

# Teacher management views

@login_required
def create_course(request):
    if not is_teacher(request.user):
        return HttpResponseForbidden("Forbidden")
    form = CourseForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        course = form.save(commit=False)
        course.manager = request.user
        course.save()
        return redirect('teacher_home')
    return render(request, 'learning_app/create_course.html', {'form': form})

@login_required
def create_module(request):
    if not is_teacher(request.user):
        return HttpResponseForbidden("Forbidden")
    form = ModuleForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        module = form.save(commit=False)
        module.manager = request.user
        module.save()
        return redirect('teacher_home')
    return render(request, 'learning_app/create_module.html', {'form': form})

@login_required
def add_module_to_course(request, course_id):
    course = get_object_or_404(Course, id=course_id, manager=request.user)
    # Show all modules not already in this course, regardless of manager
    modules = Module.objects.exclude(id__in=course.modules.values_list('id', flat=True))
    if request.method == 'POST':
        module_id = request.POST.get('module_id')
        module = get_object_or_404(Module, id=module_id)
        course.modules.add(module)
        return redirect('teacher_home')
    return render(request, 'learning_app/add_module_to_course.html', {'course': course, 'modules': modules})

@login_required
def set_module_deadline(request, module_id):
    module = get_object_or_404(Module, id=module_id, manager=request.user)
    form = ModuleDeadlineForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        deadline = form.cleaned_data['deadline']
        ModuleStudent.objects.filter(module=module).update(deadline=deadline)
        return redirect('teacher_home')
    return render(request, 'learning_app/set_module_deadline.html', {'form': form, 'module': module})

@login_required
def set_student_score(request, module_id, student_id):
    ms = get_object_or_404(ModuleStudent, module_id=module_id, student_id=student_id)
    module = ms.module
    student = ms.student
    if request.method == "POST":
        score = request.POST.get("score")
        if score is not None and score != "":
            ms.score = score
            ms.save()
            return redirect('teacher_home')  # Redirect immediately after update
    return render(request, 'learning_app/set_student_score.html', {
        'ms': ms,
        'module': module,
        'student': student,
    })

@login_required
def upload_module_file(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    # Only allow teachers who manage this module
    if request.user != module.manager:
        return HttpResponseForbidden("Only the module manager can upload files.")
    form = ModuleFileForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        module_file = form.save(commit=False)
        module_file.module = module
        module_file.uploaded_by = request.user
        module_file.save()
        return redirect('module_files', module_id=module.id)
    return render(request, 'learning_app/upload_module_file.html', {'form': form, 'module': module})

@login_required
def module_files(request, module_id):
    module = get_object_or_404(Module, pk=module_id)
    files = module.files.all()
    return render(request, 'learning_app/module_files.html', {
        'module': module,
        'files': files,
    })


def course_detail(request, pk):
    course = get_object_or_404(Course, pk=pk)
    return render(request, 'learning_app/course_detail.html', {'course': course})

@login_required
def manage_students(request):
    # Replace with actual logic later
    return render(request, 'learning_app/manage_students.html')

@require_POST
@login_required
def edit_deadline(request, module_id):
    module = get_object_or_404(Module, pk=module_id)
    if module.manager != request.user:
        return HttpResponseForbidden()
    new_deadline = request.POST.get('deadline')
    if new_deadline:
        module.deadline = new_deadline
        module.save()
    return redirect('teacher_home')

@require_POST
@login_required
def edit_score(request, module_id, student_id):
    ms = get_object_or_404(ModuleStudent, module_id=module_id, student_id=student_id)
    if ms.module.manager != request.user:
        return HttpResponseForbidden()
    score = request.POST.get('score')
    if score is not None:
        ms.score = score
        ms.save()
    return redirect('teacher_home')
