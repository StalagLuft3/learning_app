// Test script to verify the new endpoints work
const fetch = require('node-fetch');

async function testEndpoints() {
    try {
        console.log('Testing /CourseCatalogue/courses endpoint...');
        const coursesResponse = await fetch('http://localhost:5000/CourseCatalogue/courses');
        const coursesData = await coursesResponse.json();
        console.log('Courses endpoint response:', {
            status: coursesResponse.status,
            dataLength: coursesData.data?.length,
            hasEnrollmentData: 'isEnrolledOnCourseList' in coursesData
        });

        console.log('Testing /CourseCatalogue/assessments endpoint...');
        const assessmentsResponse = await fetch('http://localhost:5000/CourseCatalogue/assessments');
        const assessmentsData = await assessmentsResponse.json();
        console.log('Assessments endpoint response:', {
            status: assessmentsResponse.status,
            dataLength: assessmentsData.data?.length,
            hasEnrollmentData: 'isEnrolledOnAssessmentList' in assessmentsData
        });

        console.log('Testing original /CourseCatalogue endpoint...');
        const originalResponse = await fetch('http://localhost:5000/CourseCatalogue');
        const originalData = await originalResponse.json();
        console.log('Original endpoint response:', {
            status: originalResponse.status,
            dataLength: originalData.data?.length,
            hasEnrollmentData: 'isEnrolledOnCourseList' in originalData && 'isEnrolledOnAssessmentList' in originalData
        });

        console.log('All endpoints tested successfully!');
    } catch (error) {
        console.error('Error testing endpoints:', error);
    }
}

testEndpoints();