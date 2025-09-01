from django.test import TestCase
from django.urls import reverse, resolve
from learning_app.views import landing_page
from learning_app.models import Course, Module, ModuleStudent, User, ModuleChatMessage, ModuleFile
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

# Stage 1
class LandingPageTest(TestCase):

    # (Test 1)
    def test_landing_page_returns_correct_response(self):
        # Now the root redirects to login if not authenticated
        response = self.client.get('/')
        self.assertEqual(response.status_code, 302)
        self.assertIn(response.url, ['/accounts/login/', '/accounts/login/?next=/'])

    # (Test 2)
    def test_landing_page_url_resolves_to_view(self):
        # Now the root resolves to root_redirect, not landing_page
        resolver = resolve('/')
        from learning_app.views import root_redirect
        self.assertEqual(resolver.func, root_redirect)

# Stage 2
class UserModelTest(TestCase):
    def setUp(self):
        User.objects.create(
            username='student2test',
            full_name='Student Two',
            date_of_birth='2001-02-02',
            role='student'
        )
        User.objects.create(
            username='teacher2test',
            full_name='Teacher Two',
            date_of_birth='1979-03-03',
            role='teacher'
        )

    # (Test 3)
    def test_user_roles(self):
        student = User.objects.get(username='student2test')
        teacher = User.objects.get(username='teacher2test')
        self.assertEqual(student.role, 'student')
        self.assertEqual(teacher.role, 'teacher')


# Stage 3
class CourseModuleTest(TestCase):
    def setUp(self):
        teacher = User.objects.create(username='teach', full_name='Teach', date_of_birth='1980-01-01', role='teacher')
        student = User.objects.create(username='stud', full_name='Stud', date_of_birth='2000-01-01', role='student')
        course = Course.objects.create(name='Math', description='Math course', manager=teacher)
        module = Module.objects.create(name='Algebra', description='Algebra module', manager=teacher)
        course.modules.add(module)
        ModuleStudent.objects.create(module=module, student=student, score=None, deadline=None)

    # (Test 4)
    def test_module_teacher(self):
        module = Module.objects.get(name='Algebra')
        self.assertEqual(module.manager.role, 'teacher')

    # (Test 5)
    def test_student_enrollment(self):
        enrollment = ModuleStudent.objects.get(student__username='stud')
        self.assertEqual(enrollment.student.role, 'student')
        self.assertIsNone(enrollment.score)
        self.assertIsNone(enrollment.deadline)

# Stage 4
class AuthTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='testuser',
            password='testpass',
            full_name='Test User',
            date_of_birth='2000-01-01',
            role='student'
        )

    # (Test 6)
    def test_login_required_redirect(self):
        response = self.client.get('/profile/')
        self.assertRedirects(response, '/accounts/login/?next=/profile/')

    # (Test 7)
    def test_login_and_profile(self):
        self.client.login(username='testuser', password='testpass')
        response = self.client.get('/profile/')
        self.assertContains(response, 'Test User')
        self.assertContains(response, 'student')


# Stage 5
class RoleHomePageTest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud', password='studpass', full_name='Student', date_of_birth='2000-01-01', role='student'
        )
        self.teacher = User.objects.create_user(
            username='teach', password='teachpass', full_name='Teacher', date_of_birth='1980-01-01', role='teacher'
        )
        self.course = Course.objects.create(name='Science', description='Science course', manager=self.teacher)
        self.module = Module.objects.create(name='Biology', description='Biology module', manager=self.teacher)
        self.course.modules.add(self.module)
        ModuleStudent.objects.create(module=self.module, student=self.student, score=90, deadline='2025-09-01')

    # (Test 8)
    def test_student_home_access(self):
        self.client.login(username='stud', password='studpass')
        response = self.client.get('/student/home/')
        self.assertContains(response, 'Science')
        self.assertContains(response, 'Biology')
        self.assertContains(response, '90')
        self.assertContains(response, '2025-09-01')

    # (Test 9)
    def test_teacher_home_access(self):
        self.client.login(username='teach', password='teachpass')
        response = self.client.get('/teacher/home/')
        self.assertContains(response, 'Science')
        self.assertContains(response, 'Biology')
        self.assertContains(response, 'Student')

    # (Test 10)
    def test_student_cannot_access_teacher_home(self):
        self.client.login(username='stud', password='studpass')
        response = self.client.get('/teacher/home/', follow=True)
        self.assertContains(response, 'Forbidden')

    # (Test 11)
    def test_teacher_cannot_access_student_home(self):
        self.client.login(username='teach', password='teachpass')
        response = self.client.get('/student/home/', follow=True)
        self.assertContains(response, 'Forbidden')

# Stage "5.5"
class RootAndForbiddenTest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud', password='studpass', full_name='Student', date_of_birth='2000-01-01', role='student'
        )
        self.teacher = User.objects.create_user(
            username='teach', password='teachpass', full_name='Teacher', date_of_birth='1980-01-01', role='teacher'
        )

    # (Test 12)
    def test_root_redirects_to_login_when_not_logged_in(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 302)
        self.assertIn(
            response.url,
            ['/accounts/login/', '/accounts/login/?next=/', '/accounts/login/?next=%2F'],
            f"Unexpected redirect URL: {response.url}"
        )

    # (Test 13)
    def test_root_redirects_student(self):
        self.client.login(username='stud', password='studpass')
        response = self.client.get('/')
        self.assertRedirects(response, '/student/home/')

    # (Test 14)
    def test_root_redirects_teacher(self):
        self.client.login(username='teach', password='teachpass')
        response = self.client.get('/')
        self.assertRedirects(response, '/teacher/home/')

    # (Test 15)
    def test_student_forbidden_redirect(self):
        self.client.login(username='stud', password='studpass')
        response = self.client.get('/teacher/home/', follow=True)
        self.assertContains(response, 'Forbidden')
        # After 2 seconds, JS will redirect, but we can't test JS in Django test client

    # (Test 16)
    def test_teacher_forbidden_redirect(self):
        self.client.login(username='teach', password='teachpass')
        response = self.client.get('/student/home/', follow=True)
        self.assertContains(response, 'Forbidden')


# Stage 6
class StudentStatusTest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud', password='studpass', full_name='Student', date_of_birth='2000-01-01', role='student'
        )
        self.teacher = User.objects.create_user(
            username='teach', password='teachpass', full_name='Teacher', date_of_birth='1980-01-01', role='teacher'
        )

    # (Test 17)
    def test_student_can_update_status(self):
        self.client.login(username='stud', password='studpass')
        response = self.client.post(
            reverse('update_status'),
            {'status': 'Feeling great!'},
            follow=True
        )
        self.student.refresh_from_db()
        self.assertEqual(self.student.status, 'Feeling great!')
        self.assertContains(response, 'Feeling great!')

    # (Test 18)
    def test_teacher_cannot_access_update_status(self):
        self.client.login(username='teach', password='teachpass')
        response = self.client.get(reverse('update_status'), follow=True)
        self.assertContains(response, 'Forbidden')


# Stage 7
class Step7VisibilityTest(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teach7', password='teachpass7', full_name='Teacher Seven', role='teacher'
        )
        self.student1 = User.objects.create_user(
            username='stud71', password='studpass71', full_name='Student One', role='student', status='Active'
        )
        self.student2 = User.objects.create_user(
            username='stud72', password='studpass72', full_name='Student Two', role='student', status='Busy'
        )
        self.course = Course.objects.create(name='Science', description='Science course', manager=self.teacher)
        self.module = Module.objects.create(name='Biology', description='Biology module', manager=self.teacher)
        self.course.modules.add(self.module)
        ModuleStudent.objects.create(module=self.module, student=self.student1, score=95)
        ModuleStudent.objects.create(module=self.module, student=self.student2, score=88)

    # (Test 19)
    def test_student_sees_other_students_name_and_status_only(self):
        self.client.login(username='stud71', password='studpass71')
        response = self.client.get('/student/home/')
        self.assertNotContains(response, 'Student Two')

    # (Test 20)
    def test_teacher_sees_all_students_and_scores(self):
        self.client.login(username='teach7', password='teachpass7')
        response = self.client.get('/teacher/home/')
        self.assertContains(response, 'Student One')
        self.assertContains(response, 'Student Two')
        self.assertContains(response, '95')
        self.assertContains(response, '88')


# Stage 8
class TeacherStudentSearchTest(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teachsearch', password='teachpass', full_name='Teacher Search', role='teacher'
        )
        self.student1 = User.objects.create_user(
            username='studsearch1', password='studpass1', full_name='Alice Example', role='student', status='Active'
        )
        self.student2 = User.objects.create_user(
            username='studsearch2', password='studpass2', full_name='Bob Example', role='student', status='Busy'
        )
        self.student_user = User.objects.create_user(
            username='studsearch3', password='studpass3', full_name='Charlie Example', role='student', status='Offline'
        )

    # (Test 21)
    def test_teacher_can_search_students_by_name(self):
        self.client.login(username='teachsearch', password='teachpass')
        response = self.client.get(reverse('teacher_student_search'), {'q': 'Alice'})
        self.assertContains(response, 'Alice Example')
        self.assertNotContains(response, 'Bob Example')

    # (Test 22)
    def test_teacher_can_search_students_by_username(self):
        self.client.login(username='teachsearch', password='teachpass')
        response = self.client.get(reverse('teacher_student_search'), {'q': 'studsearch2'})
        self.assertContains(response, 'Bob Example')
        self.assertNotContains(response, 'Alice Example')

    # (Test 23)
    def test_teacher_can_search_students_by_status(self):
        self.client.login(username='teachsearch', password='teachpass')
        response = self.client.get(reverse('teacher_student_search'), {'q': 'Busy'})
        self.assertContains(response, 'Bob Example')
        self.assertNotContains(response, 'Alice Example')

    # (Test 24)
    def test_student_cannot_access_search(self):
        self.client.login(username='studsearch1', password='studpass1')
        response = self.client.get(reverse('teacher_student_search'), follow=True)
        self.assertContains(response, 'Forbidden')


# Stage 9
class CourseModuleSearchTest(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teachsearch9', password='teachpass9', full_name='Teacher Nine', role='teacher'
        )
        self.student = User.objects.create_user(
            username='studsearch9', password='studpass9', full_name='Student Nine', role='student'
        )
        self.course = Course.objects.create(
            name='Physics', description='Physics course', manager=self.teacher
        )
        self.module1 = Module.objects.create(
            name='Mechanics', description='Mechanics module', manager=self.teacher
        )
        self.module2 = Module.objects.create(
            name='Optics', description='Optics module', manager=self.teacher
        )
        self.course.modules.add(self.module1, self.module2)
        # Add another course and module for negative test
        self.other_teacher = User.objects.create_user(
            username='teachother', password='teachpassother', full_name='Other Teacher', role='teacher'
        )
        self.other_course = Course.objects.create(
            name='Chemistry', description='Chemistry course', manager=self.other_teacher
        )
        self.other_module = Module.objects.create(
            name='Organic', description='Organic module', manager=self.other_teacher
        )
        self.other_course.modules.add(self.other_module)

    # (Test 25)
    def test_student_can_search_course_by_name(self):
        self.client.login(username='studsearch9', password='studpass9')
        response = self.client.get(reverse('course_module_search'), {'q': 'Physics'})
        self.assertContains(response, 'Physics')
        self.assertContains(response, 'Mechanics')
        self.assertContains(response, 'Optics')
        self.assertNotContains(response, 'Chemistry')

    # (Test 26)
    def test_teacher_can_search_module_by_name(self):
        self.client.login(username='teachsearch9', password='teachpass9')
        response = self.client.get(reverse('course_module_search'), {'q': 'Optics'})
        self.assertContains(response, 'Optics')
        self.assertContains(response, 'Physics')  # Optics is part of Physics course
        self.assertNotContains(response, 'Organic')

    # (Test 27)
    def test_student_can_search_by_teacher_name(self):
        self.client.login(username='studsearch9', password='studpass9')
        response = self.client.get(reverse('course_module_search'), {'q': 'Teacher Nine'})
        self.assertContains(response, 'Physics')
        self.assertContains(response, 'Mechanics')
        self.assertContains(response, 'Optics')
        self.assertNotContains(response, 'Chemistry')
        self.assertNotContains(response, 'Organic')

    # (Test 28)
    def test_forbidden_for_non_authenticated(self):
        response = self.client.get(reverse('course_module_search'), follow=True)
        self.assertRedirects(response, '/accounts/login/?next=' + reverse('course_module_search'))

# Stage 11
class Step11EnrolmentTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='stud11', password='testpass', role='student', full_name='Student Eleven'
        )
        self.teacher = User.objects.create_user(
            username='teach11', password='testpass', role='teacher', full_name='Teacher Eleven'
        )
        self.course = Course.objects.create(
            name='Test Course', description='A course', manager=self.teacher
        )
        self.module1 = Module.objects.create(
            name='Course Module 1', description='Module 1', manager=self.teacher
        )
        self.module2 = Module.objects.create(
            name='Course Module 2', description='Module 2', manager=self.teacher
        )
        self.course.modules.add(self.module1, self.module2)
        self.standalone_module = Module.objects.create(
            name='Standalone Module', description='Not in course', manager=self.teacher
        )

    # (Test 29)
    def test_student_can_enrol_on_course_and_all_modules(self):
        self.client.login(username='stud11', password='testpass')
        response = self.client.post(reverse('enrol_course', args=[self.course.id]))
        self.assertRedirects(response, reverse('student_home'))
        # Student should be enrolled on all modules in the course
        self.assertTrue(ModuleStudent.objects.filter(student=self.student, module=self.module1).exists())
        self.assertTrue(ModuleStudent.objects.filter(student=self.student, module=self.module2).exists())
        # Should not be enrolled on standalone module
        self.assertFalse(ModuleStudent.objects.filter(student=self.student, module=self.standalone_module).exists())

    # (Test 30)
    def test_student_can_enrol_on_standalone_module(self):
        self.client.login(username='stud11', password='testpass')
        response = self.client.post(reverse('enrol_module', args=[self.standalone_module.id]))
        self.assertRedirects(response, reverse('student_home'))
        self.assertTrue(ModuleStudent.objects.filter(student=self.student, module=self.standalone_module).exists())

    # (Test 31)
    def test_student_cannot_enrol_on_same_course_twice(self):
        self.client.login(username='stud11', password='testpass')
        self.client.post(reverse('enrol_course', args=[self.course.id]))
        # Enrol again
        response = self.client.post(reverse('enrol_course', args=[self.course.id]))
        self.assertRedirects(response, reverse('student_home'))
        # Still only one enrolment per module
        self.assertEqual(ModuleStudent.objects.filter(student=self.student, module=self.module1).count(), 1)
        self.assertEqual(ModuleStudent.objects.filter(student=self.student, module=self.module2).count(), 1)

    # (Test 32)
    def test_student_cannot_enrol_on_same_module_twice(self):
        self.client.login(username='stud11', password='testpass')
        self.client.post(reverse('enrol_module', args=[self.standalone_module.id]))
        response = self.client.post(reverse('enrol_module', args=[self.standalone_module.id]))
        self.assertRedirects(response, reverse('student_home'))
        self.assertEqual(ModuleStudent.objects.filter(student=self.student, module=self.standalone_module).count(), 1)

    # (Test 33)
    def test_teacher_cannot_enrol_on_course(self):
        self.client.login(username='teach11', password='testpass')
        response = self.client.post(reverse('enrol_course', args=[self.course.id]))
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ModuleStudent.objects.filter(student=self.teacher, module=self.module1).exists())

# Stage 12
class Step12StudentRegistrationTests(TestCase):
    def setUp(self):
        # Set the passcode for testing
        self.passcode = getattr(settings, 'STUDENT_REGISTRATION_PASSCODE', 'testpasscode')
        # If not set in settings, monkeypatch it for the test
        if not hasattr(settings, 'STUDENT_REGISTRATION_PASSCODE'):
            settings.STUDENT_REGISTRATION_PASSCODE = self.passcode

    # (Test 34)
    def test_registration_page_loads(self):
        response = self.client.get(reverse('register_student'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Register")

    # (Test 35)
    def test_successful_registration_with_correct_passcode(self):
        response = self.client.post(reverse('register_student'), {
            'username': 'newstudent',
            'full_name': 'New Student',
            'password': 'newpass123',
            'passcode': self.passcode,
        })
        # Should redirect to login page
        self.assertRedirects(response, reverse('login'))
        self.assertTrue(User.objects.filter(username='newstudent', role='student').exists())

    # (Test 36)
    def test_registration_fails_with_wrong_passcode(self):
        response = self.client.post(reverse('register_student'), {
            'username': 'badstudent',
            'full_name': 'Bad Student',
            'password': 'badpass123',
            'passcode': 'wrongpasscode',
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Invalid passcode")
        self.assertFalse(User.objects.filter(username='badstudent').exists())

    # (Test 37)
    def test_registration_fails_with_duplicate_username(self):
        User.objects.create_user(username='dupe', password='pass', full_name='Dupe', role='student')
        response = self.client.post(reverse('register_student'), {
            'username': 'dupe',
            'full_name': 'Dupe Again',
            'password': 'anotherpass',
            'passcode': self.passcode,
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Username already taken")
        self.assertEqual(User.objects.filter(username='dupe').count(), 1)

# Stage 13
class ChatModelsTest(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teacher', password='pass', role='teacher')
        self.student = User.objects.create_user(username='student', password='pass', role='student')
        self.module = Module.objects.create(name='Test Module', description='desc', manager=self.teacher)
        ModuleStudent.objects.create(module=self.module, student=self.student)

    # (Test 38)
    def test_module_student_enrollment(self):
        self.assertTrue(ModuleStudent.objects.filter(module=self.module, student=self.student).exists())

    # (Test 39)
    def test_chat_message_creation(self):
        msg = ModuleChatMessage.objects.create(module=self.module, user=self.student, message='Hello!')
        self.assertEqual(msg.message, 'Hello!')
        self.assertEqual(msg.user, self.student)
        self.assertEqual(msg.module, self.module)

    # (Test 40)
    def test_teacher_is_manager(self):
        self.assertEqual(self.module.manager, self.teacher)


# Stage 14
class TeacherManagementTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teach', password='pass', role='teacher')
        self.student = User.objects.create_user(username='stud', password='pass', role='student')
        self.module = Module.objects.create(name='Test Module', description='desc', manager=self.teacher)
        self.course = Course.objects.create(name='Test Course', description='desc', manager=self.teacher)
        self.course.modules.add(self.module)
        self.module_student = ModuleStudent.objects.create(module=self.module, student=self.student)

    # (Test 41)
    def test_create_course(self):
        self.client.login(username='teach', password='pass')
        response = self.client.post(reverse('create_course'), {
            'name': 'New Course',
            'description': 'Course Desc'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Course.objects.filter(name='New Course').exists())

    # (Test 42)
    def test_create_module(self):
        self.client.login(username='teach', password='pass')
        response = self.client.post(reverse('create_module'), {
            'name': 'New Module',
            'description': 'Module Desc',
            'active_chat': False
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Module.objects.filter(name='New Module').exists())

    # (Test 43)
    def test_add_module_to_course(self):
        self.client.login(username='teach', password='pass')
        new_module = Module.objects.create(name='Extra Module', description='desc', manager=self.teacher)
        response = self.client.post(reverse('add_module_to_course', args=[self.course.id]), {
            'module_id': new_module.id
        })
        self.assertEqual(response.status_code, 302)
        self.assertIn(new_module, self.course.modules.all())

    # (Test 44)
    def test_set_module_deadline_propagates(self):
        self.client.login(username='teach', password='pass')
        url = reverse('set_module_deadline', args=[self.module.id])
        response = self.client.post(url, {'deadline': '2025-12-31'})
        self.assertEqual(response.status_code, 302)
        self.module_student.refresh_from_db()
        self.assertEqual(str(self.module_student.deadline), '2025-12-31')

    # (Test 45)
    def test_set_student_score(self):
        self.client.login(username='teach', password='pass')
        url = reverse('set_student_score', args=[self.module.id, self.student.id])
        response = self.client.post(url, {'score': 95})
        self.assertEqual(response.status_code, 302)
        self.module_student.refresh_from_db()
        self.assertEqual(self.module_student.score, 95)


# Stage 15
class ModuleFileTests(TestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(username='teach', password='pass', role='teacher')
        self.student = User.objects.create_user(username='stud', password='pass', role='student')
        self.module = Module.objects.create(name='Test Module', description='desc', manager=self.teacher)
        ModuleStudent.objects.create(module=self.module, student=self.student)

    # (Test 46)
    def test_teacher_can_upload_file(self):
        self.client.login(username='teach', password='pass')
        url = reverse('upload_module_file', args=[self.module.id])
        file_data = SimpleUploadedFile("test.txt", b"Hello world!", content_type="text/plain")
        response = self.client.post(url, {'name': 'Test File', 'file': file_data})
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ModuleFile.objects.filter(module=self.module, name='Test File').exists())

    # (Test 47)
    def test_student_cannot_upload_file(self):
        self.client.login(username='stud', password='pass')
        url = reverse('upload_module_file', args=[self.module.id])
        file_data = SimpleUploadedFile("test.txt", b"Hello world!", content_type="text/plain")
        response = self.client.post(url, {'name': 'Student File', 'file': file_data})
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ModuleFile.objects.filter(module=self.module, name='Student File').exists())

    # (Test 48)
    def test_student_can_view_files(self):
        ModuleFile.objects.create(module=self.module, uploaded_by=self.teacher, name='Test File', file='test.txt')
        self.client.login(username='stud', password='pass')
        url = reverse('module_files', args=[self.module.id])
        response = self.client.get(url)
        self.assertContains(response, 'Test File')

    # (Test 49)
    def test_unenrolled_student_cannot_view_files(self):
        other_student = User.objects.create_user(username='otherstud', password='pass', role='student')
        self.client.login(username='otherstud', password='pass')
        url = reverse('module_files', args=[self.module.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)