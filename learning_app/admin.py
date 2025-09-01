from django.contrib import admin
from .models import User, Course, Module, ModuleStudent, ModuleChatMessage, ModuleFile

admin.site.register(User)
admin.site.register(Course)
admin.site.register(Module)
admin.site.register(ModuleStudent)
admin.site.register(ModuleChatMessage)
admin.site.register(ModuleFile)