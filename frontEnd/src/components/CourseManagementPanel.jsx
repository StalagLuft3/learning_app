import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcStatusTag, IcTextField, IcTypography, IcSelect, IcAlert } from "@ukic/react";
import { mdiAccountCheck, mdiBookOutline, mdiAccountRemove } from "@mdi/js";
import SlottedSVGTemplate from "./slottedSVGTemplate";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { fetchData } from "../commonFunctions/api";
import { getStatusDisplay } from "../commonFunctions/statusUtilities";

const CourseManagementPanel = ({ currentUser }) => {
  const [managedCourses, setManagedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempScore, setTempScore] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadManagedCourses();
  }, [currentUser]);

  const loadManagedCourses = async () => {
    try {
      setLoading(true);
      console.log('Loading managed courses for user:', currentUser?.employeeID);
      
      if (!currentUser?.employeeID) {
        console.warn('No current user or employeeID available');
        return;
      }
      
      const data = await fetchData(`/ManageContents/courses/${currentUser.employeeID}`);
      console.log('Managed courses loaded:', data);
      
      setManagedCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (error) {
      console.error('Failed to load managed courses:', error);
      setManagedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (enrollment) => {
    console.log('Starting edit for enrollment:', enrollment);
    setEditingItemId(enrollment.employee_courseID);
    setTempStatus(enrollment.currentStatus || '');
    setTempScore(enrollment.score || '');
    setTempDate(enrollment.recordDate ? enrollment.recordDate.substring(0, 10) : '');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempStatus('');
    setTempScore('');
    setTempDate('');
  };

  const handleSubmitUpdate = async (enrollment, courseInfo) => {
    console.log('Submitting update:', { enrollment, courseInfo, tempStatus, tempScore, tempDate });
    
    try {
      setSubmitting(true);
      
      let updateData = {};
      
      if (tempStatus && tempStatus !== enrollment.currentStatus) {
        updateData.newStatus = tempStatus;
      }
      
      if (tempScore && !isNaN(parseInt(tempScore))) {
        updateData.score = parseInt(tempScore);
      }
      
      if (tempDate && tempDate !== enrollment.recordDate?.substring(0, 10)) {
        updateData.recordDate = tempDate;
      }

      if (Object.keys(updateData).length === 0) {
        console.log('No changes to update');
        handleCancelEdit();
        return;
      }

      console.log('Updating course enrollment:', updateData);
      
      const response = await fetch(`http://localhost:5000/ManageContents/updateCourseEnrollment`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollmentId: enrollment.employee_courseID,
          ...updateData
        })
      });

      if (response.ok) {
        let statusMessage;
        if (updateData.newStatus === 'Withdrawn') {
          statusMessage = `withdrawn from ${courseInfo.courseName}. They can now re-enroll if needed.`;
        } else {
          statusMessage = updateData.newStatus ? `marked as "${updateData.newStatus}"` : 'updated successfully';
        }
        
        setAlertMessage(`${enrollment.username || 'Student'} has been ${statusMessage}`);
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedCourses();
        handleCancelEdit();
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        setAlertMessage('Failed to update enrollment. Please try again.');
        setAlertVisible(true);
      }
      
    } catch (error) {
      console.error('Failed to update enrollment:', error);
      setAlertMessage('Error updating enrollment. Please try again.');
      setAlertVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <IcTypography variant="body">Loading your managed courses...</IcTypography>;
  }

  if (managedCourses.length === 0) {
    return <IcTypography variant="body">You don't manage any courses with enrolled students.</IcTypography>;
  }

  return (
    <div>
      {alertVisible && (
        <IcAlert
          variant="success"
          heading="Enrollment Updated"
          message={alertMessage}
          dismissible={true}
          onIcDismiss={() => setAlertVisible(false)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {managedCourses.map((course) => (
        <div key={course.courseID}>
          <IcTypography variant="h3" style={{ marginBottom: '16px', marginTop: '24px' }}>
            {course.courseName} ({course.enrollments?.length || 0} students)
          </IcTypography>
          
          {course.enrollments?.length === 0 ? (
            <IcTypography variant="body">No students currently enrolled in this course.</IcTypography>
          ) : (
            course.enrollments.map((enrollment) => {
              const status = getStatusDisplay(enrollment);
              
              return (
                <div key={enrollment.employee_courseID} style={divContainer}>
                  <IcCardVertical 
                    style={cardContainer} 
                    heading={enrollment.username || 'Unknown Student'}
                    subheading={`Role: ${enrollment.role || 'N/A'} | Enrolled: ${enrollment.recordDate || 'N/A'} | Duration: ${course.duration} days`}
                    message={course.description || 'No description available'}
                  >
                    <SlottedSVGTemplate mdiIcon={mdiBookOutline} />
                    <IcStatusTag 
                      slot="interaction-button" 
                      label={status?.status || 'Unknown'} 
                      status={status?.color || 'neutral'} 
                    />

                    <div slot="interaction-controls" style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                      {editingItemId === enrollment.employee_courseID ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                          <IcSelect
                            label="Status"
                            value={tempStatus}
                            onIcChange={(e) => setTempStatus(e.detail.value)}
                            options={[
                              { label: 'Enrolled', value: 'Enrolled' },
                              { label: 'In Progress', value: 'In Progress' },
                              { label: 'Completed', value: 'Completed' },
                              { label: 'Withdrawn', value: 'Withdrawn' }
                            ]}
                            style={{ width: '200px' }}
                          />
                          <IcTextField
                            label="Score (Optional)"
                            type="number"
                            min="0"
                            max="100"
                            value={tempScore}
                            onIcInput={(e) => setTempScore(e.detail.value)}
                            placeholder="Enter score out of 100"
                            style={{ width: '150px' }}
                          />
                          <IcTextField
                            label="Record Date"
                            type="date"
                            value={tempDate}
                            onIcInput={(e) => setTempDate(e.detail.value)}
                            helperText="Format: YYYY-MM-DD"
                            style={{ width: '200px' }}
                          />
                          <div style={{ display: "flex", gap: "8px" }}>
                            <IcButton 
                              variant="primary" 
                              size="small"
                              onClick={() => handleSubmitUpdate(enrollment, course)}
                              disabled={submitting}
                            >
                              Update
                            </IcButton>
                            <IcButton 
                              variant="secondary" 
                              size="small"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </IcButton>
                          </div>
                        </div>
                      ) : (
                        <IcButton 
                          variant="primary"
                          onClick={() => handleStartEdit(enrollment)}
                        >
                          Manage Student
                          <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                        </IcButton>
                      )}
                    </div>
                  </IcCardVertical>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
};

export default CourseManagementPanel;
