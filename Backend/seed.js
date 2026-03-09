const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    // Create test employees
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const employee1 = await prisma.employees.create({
      data: {
        username: 'testuser',
        role: 'MANAGER',
        email: 'tt@email.com',
        password: hashedPassword
      }
    });

    const employee2 = await prisma.employees.create({
      data: {
        username: 'admin',
        role: 'ADMIN',
        email: 'admin@email.com',
        password: hashedPassword
      }
    });

    // Create some test courses
    const course1 = await prisma.courses.create({
      data: {
        courseName: 'Introduction to Programming',
        description: 'Learn the basics of programming',
        delivery_method: 'Online',
        delivery_location: 'Virtual Classroom',
        duration: 40,
        courseManagerID: employee1.employeeID
      }
    });

    const course2 = await prisma.courses.create({
      data: {
        courseName: 'Advanced Database Management',
        description: 'Master database design and optimization',
        delivery_method: 'In-person',
        delivery_location: 'Main Campus',
        duration: 60,
        courseManagerID: employee2.employeeID
      }
    });

    // Create some test assessments
    const assessment1 = await prisma.assessments.create({
      data: {
        name: 'Programming Fundamentals Quiz',
        description: 'Test your basic programming knowledge',
        delivery_method: 'Online',
        delivery_location: 'LMS Platform',
        duration: 2.0,
        manager_ID: employee1.employeeID,
        max_score: 100,
        passing_score: 70,
        expiry: 365
      }
    });

    const assessment2 = await prisma.assessments.create({
      data: {
        name: 'Database Design Project',
        description: 'Comprehensive database design assessment',
        delivery_method: 'Practical',
        delivery_location: 'Lab Room 101',
        duration: 4.0,
        manager_ID: employee2.employeeID,
        max_score: 200,
        passing_score: 140,
        expiry: 180
      }
    });

    console.log('Seed data created successfully');
    console.log('Test users:');
    console.log('- tt@email.com (password: password123)');
    console.log('- admin@email.com (password: password123)');
    console.log('Test courses and assessments created');
    
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});