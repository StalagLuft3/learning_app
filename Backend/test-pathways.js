const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPathways() {
  try {
    console.log('Testing basic pathways query...');
    const pathways = await prisma.pathways.findMany({
      include: {
        manager: {
          select: { username: true, role: true }
        }
      }
    });
    console.log('Found pathways:', pathways.length);
    if (pathways.length > 0) {
      console.log('First pathway:', JSON.stringify(pathways[0], null, 2));
    }
    
    console.log('\nTesting courses...');
    const courses = await prisma.courses.findMany();
    console.log('Found courses:', courses.length);
    
    console.log('\nTesting pathway-course relationships...');
    const pathwayCourses = await prisma.pathways_courses.findMany();
    console.log('Found pathway-course relationships:', pathwayCourses.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPathways();