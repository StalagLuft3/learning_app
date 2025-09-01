from django.db import migrations
from django.contrib.auth.hashers import make_password
from datetime import date

def create_initial_data(apps, schema_editor):
    User = apps.get_model('learning_app', 'User')
    Course = apps.get_model('learning_app', 'Course')
    Module = apps.get_model('learning_app', 'Module')
    ModuleStudent = apps.get_model('learning_app', 'ModuleStudent')

    # Teachers
    t1 = User.objects.create(username='teacher1', full_name='Teacher One', role='teacher', password=make_password('teachpass1'))
    t2 = User.objects.create(username='teacher2', full_name='Teacher Two', role='teacher', password=make_password('teachpass2'))
    t3 = User.objects.create(username='teacher3', full_name='Teacher Three', role='teacher', password=make_password('teachpass3'))

    # Students
    students = []
    for i in range(1, 7):
        s = User.objects.create(
            username=f'student{i}',
            full_name=f'Student {i}',
            role='student',
            status=f"Status for Student {i}",
            password=make_password(f'studpass{i}')
        )
        students.append(s)

    # Modules (some shared)
    reporting = Module.objects.create(name='Reporting', description='Reporting module', manager=t1)
    citations = Module.objects.create(name='Academic Citations', description='Citations module', manager=t1)
    data_types = Module.objects.create(name='Data Types', description='Python data types', manager=t1)
    loops = Module.objects.create(name='Loops', description='Python loops', manager=t1)
    ww1 = Module.objects.create(name='World War 1', description='WW1', manager=t2)
    cold_war = Module.objects.create(name='Cold War', description='Cold War', manager=t2)
    business_case = Module.objects.create(name='Business Case Drafting', description='Business cases', manager=t3)
    creative_writing = Module.objects.create(name='Creative Writing', description='Creative writing', manager=t3)

    # Courses
    python_coding = Course.objects.create(name='Python Coding', description='Learn Python', manager=t1)
    python_coding.modules.set([data_types, loops, reporting, citations])

    military_history = Course.objects.create(name='Modern Military History', description='Military history', manager=t2)
    military_history.modules.set([ww1, cold_war, reporting, citations])

    report_writing = Course.objects.create(name='Report Writing', description='Report writing', manager=t3)
    report_writing.modules.set([business_case, creative_writing, reporting, citations])

    # Enroll students in modules with scores, deadlines, and feedback
    ModuleStudent.objects.create(module=data_types, student=students[0], score=85, deadline=date(2025, 9, 1), feedback="Great module!")
    ModuleStudent.objects.create(module=loops, student=students[0], score=90, deadline=date(2025, 9, 15))
    ModuleStudent.objects.create(module=reporting, student=students[0], score=88, deadline=date(2025, 10, 1), feedback="Very useful.")
    ModuleStudent.objects.create(module=ww1, student=students[1], score=75, deadline=date(2025, 10, 1), feedback="Challenging but interesting.")
    ModuleStudent.objects.create(module=cold_war, student=students[1], score=80, deadline=date(2025, 10, 15))
    ModuleStudent.objects.create(module=business_case, student=students[2], score=88, deadline=date(2025, 11, 1))
    ModuleStudent.objects.create(module=creative_writing, student=students[2], score=92, deadline=date(2025, 11, 15), feedback="Loved it!")
    ModuleStudent.objects.create(module=reporting, student=students[3], score=70, deadline=date(2025, 9, 20))
    ModuleStudent.objects.create(module=citations, student=students[4], score=95, deadline=date(2025, 9, 25), feedback="Clear explanations.")
    ModuleStudent.objects.create(module=loops, student=students[5], score=60, deadline=date(2025, 10, 5))

class Migration(migrations.Migration):

    dependencies = [
        ('learning_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_initial_data),
    ]