const db = require('./db')

async function updateOwnership() {
  try {
    console.log('Updating courses to be owned by employee ID 4...')
    
    // Update all courses to be managed by employee ID 4
    const coursesQuery = 'UPDATE courses SET courseManagerID = ?'
    await db.query(coursesQuery, [4])
    console.log('Updated courses to be owned by employee ID 4')
    
    // Update all assessments to be managed by employee ID 4  
    const assessmentsQuery = 'UPDATE assessments SET manager_ID = ?'
    await db.query(assessmentsQuery, [4])
    console.log('Updated assessments to be owned by employee ID 4')
    
    // Let's check what we have in the database
    console.log('\nCurrent courses:')
    const courses = await db.query('SELECT courseID, courseName, courseManagerID FROM courses')
    console.log(courses)
    
    console.log('\nCurrent assessments:')
    const assessments = await db.query('SELECT assessmentID, name, manager_ID FROM assessments')
    console.log(assessments)
    
    console.log('\nCurrent course enrollments:')
    const enrollments = await db.query(`
      SELECT ec.employeeID, ec.courseID, c.courseName, c.courseManagerID, ec.currentStatus 
      FROM employees_courses ec 
      JOIN courses c ON ec.courseID = c.courseID
    `)
    console.log(enrollments)
    
    console.log('\nCurrent assessment enrollments:')
    const assessmentEnrollments = await db.query(`
      SELECT ea.employeeID, ea.assessmentID, a.name, a.manager_ID, ea.currentStatus 
      FROM employees_assessments ea 
      JOIN assessments a ON ea.assessmentID = a.assessmentID
    `)
    console.log(assessmentEnrollments)
    
  } catch (error) {
    console.error('Error updating ownership:', error)
  }
}

updateOwnership()