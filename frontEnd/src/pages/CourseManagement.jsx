import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcStatusTag, IcTextField, IcTypography, IcSelect, IcAlert, IcHero, IcTabContext, IcTabGroup, IcTab, IcTabPanel, IcBadge, IcSectionContainer, IcDialog } from "@ukic/react";
import { mdiAccountCheck, mdiToggleSwitch, mdiToggleSwitchOff, mdiBookOutline, mdiPencil, mdiCheck, mdiClose, mdiPlus, mdiDelete } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";
import Header from "../components/ContentManagementHeader";
import Footer from "../components/ITRFooter";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { updateItemStatus } from "../commonFunctions/commonFeedbackUtilities";
import { getStatusDisplay, canUpdateStatus } from "../commonFunctions/statusUtilities";
import { fetchData } from "../commonFunctions/api";

const CourseManagement = () => {
  const [managedCourses, setManagedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempScore, setTempScore] = useState('');
  const [tempCompletionDate, setTempCompletionDate] = useState('');
  const [courseFormData, setCourseFormData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({});
  const [showCourseDetails, setShowCourseDetails] = useState({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showOnlyAwaiting, setShowOnlyAwaiting] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Dialog states for editing and creating
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [createFormData, setCreateFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Set initial active tab when courses load
  useEffect(() => {
    if (managedCourses.length > 0 && !activeTab) {
      setActiveTab(managedCourses[0].courseID);
    }
  }, [managedCourses, activeTab]);

  useEffect(() => {
    loadManagedCourses();
  }, []);

  const loadManagedCourses = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const userData = await fetchData("/Auth/user");
      setCurrentUser(userData);
      
      if (!userData?.employeeID) {
        console.warn('No current user or employeeID available');
        return;
      }
      
      const data = await fetchData(`/ManageContents/courses/${userData.employeeID}`);
      console.log('Managed courses loaded:', data);
      
      const courses = Array.isArray(data?.courses) ? data.courses : [];
      setManagedCourses(courses);
      
      // Initialize form data for all courses
      const initialFormData = {};
      const initialChangesState = {};
      const initialShowState = {};
      courses.forEach(course => {
        initialFormData[course.courseID] = {
          courseName: course.courseName || '',
          description: course.description || '',
          duration: course.duration?.toString() || '',
          deliveryMethod: course.delivery_method || '',
          deliveryLocation: course.delivery_location || ''
        };
        initialChangesState[course.courseID] = false;
        initialShowState[course.courseID] = false;
      });
      setCourseFormData(initialFormData);
      setHasUnsavedChanges(initialChangesState);
      setShowCourseDetails(initialShowState);
      
      // Set first course as active tab if available
      if (courses.length > 0) {
        const firstCourseID = courses[0].courseID;
        setActiveTab(firstCourseID);
        console.log('Setting initial active tab to:', firstCourseID);
      }
    } catch (error) {
      console.error('Failed to load managed courses:', error);
      setManagedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Course form handlers
  const handleCourseFieldChange = (courseID, fieldName, value) => {
    const course = managedCourses.find(c => c.courseID === courseID);
    
    // Ensure we have the current form data, initialize if needed
    const currentFormData = courseFormData[courseID] || {
      courseName: course?.courseName || '',
      description: course?.description || '',
      duration: course?.duration?.toString() || '',
      deliveryMethod: course?.delivery_method || '',
      deliveryLocation: course?.delivery_location || ''
    };
    
    const updatedFormData = {
      ...courseFormData,
      [courseID]: {
        ...currentFormData,
        [fieldName]: value
      }
    };
    setCourseFormData(updatedFormData);
    
    // Check if changes were made compared to original
    const hasChanges = 
      updatedFormData[courseID].courseName !== (course?.courseName || '') ||
      updatedFormData[courseID].description !== (course?.description || '') ||
      updatedFormData[courseID].duration !== (course?.duration?.toString() || '') ||
      updatedFormData[courseID].deliveryMethod !== (course?.delivery_method || '') ||
      updatedFormData[courseID].deliveryLocation !== (course?.delivery_location || '');
    
    setHasUnsavedChanges(prev => ({
      ...prev,
      [courseID]: hasChanges
    }));
  };

  const handleSubmitCourseUpdate = async (courseID) => {
    try {
      setSubmitting(true);
      
      const formData = courseFormData[courseID];
      const updateData = {
        courseID,
        courseName: formData.courseName,
        description: formData.description,
        duration: parseInt(formData.duration) || 0,
        deliveryMethod: formData.deliveryMethod,
        deliveryLocation: formData.deliveryLocation
      };

      const response = await fetch('http://localhost:5000/ManageContents/updateCourse', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Course updated successfully!');
        setAlertType('success');
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(prev => ({
          ...prev,
          [courseID]: false
        }));
        
        await loadManagedCourses();
        
      } else {
        throw new Error(result.error || 'Failed to update course');
      }
      
    } catch (error) {
      console.error('Failed to update course:', error);
      setAlertMessage(`Failed to update course: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Dialog form handlers
  const handleFormChange = (fieldName, value) => {
    setEditFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Check if changes were made compared to original
    const hasChanges = 
      (fieldName === 'courseName' && value !== selectedCourse?.courseName) ||
      (fieldName === 'description' && value !== selectedCourse?.description) ||
      (fieldName === 'duration' && value !== selectedCourse?.duration?.toString()) ||
      (fieldName === 'delivery_method' && value !== selectedCourse?.delivery_method) ||
      (fieldName === 'delivery_location' && value !== selectedCourse?.delivery_location) ||
      (fieldName !== 'courseName' && fieldName !== 'description' && fieldName !== 'duration' && 
       fieldName !== 'delivery_method' && fieldName !== 'delivery_location' && (
        editFormData.courseName !== selectedCourse?.courseName ||
        editFormData.description !== selectedCourse?.description ||
        editFormData.duration !== selectedCourse?.duration?.toString() ||
        editFormData.delivery_method !== selectedCourse?.delivery_method ||
        editFormData.delivery_location !== selectedCourse?.delivery_location
      ));
    
    setHasChanges(hasChanges);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedCourse) return;
    
    try {
      setSubmitting(true);
      
      const updateData = {
        courseID: selectedCourse.courseID,
        courseName: editFormData.courseName,
        description: editFormData.description,
        duration: parseInt(editFormData.duration) || 0,
        deliveryMethod: editFormData.delivery_method,
        deliveryLocation: editFormData.delivery_location
      };

      const response = await fetch('http://localhost:5000/ManageContents/updateCourse', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Course updated successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setEditDialogOpen(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedCourses();
        
      } else {
        throw new Error(result.error || 'Failed to update course');
      }
      
    } catch (error) {
      console.error('Failed to update course:', error);
      setAlertMessage(`Failed to update course: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`http://localhost:5000/courseCatalogue/deleteCourse/${selectedCourse.courseID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Course deleted successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setDeleteConfirmOpen(false);
        setEditDialogOpen(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedCourses();
        
      } else {
        throw new Error(result.error || 'Failed to delete course');
      }
      
    } catch (error) {
      console.error('Failed to delete course:', error);
      setAlertMessage(`Failed to delete course: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Dialog form handlers for course creation
  const handleCreateFormChange = (field, value) => {
    const updatedFormData = {
      ...createFormData,
      [field]: value
    };
    
    setCreateFormData(updatedFormData);
    
    // Check if form has required fields filled
    const hasRequiredFields = updatedFormData.courseName && 
                             updatedFormData.courseDescription && 
                             updatedFormData.duration;
    setHasChanges(hasRequiredFields);
  };

  const handleCreateSubmit = async () => {
    try {
      setSubmitting(true);
      
      const createData = {
        name: createFormData.courseName,
        description: createFormData.courseDescription,
        duration: parseFloat(createFormData.duration) || 0,
        delivery_method: createFormData.deliveryMethod || 'Online Course',
        delivery_location: createFormData.deliveryLocation || 'High'
      };
      
      const response = await fetch('http://localhost:5000/ManageContents/createCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Course created successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setCreateDialogOpen(false);
        setIsCreateMode(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedCourses();
        
      } else {
        throw new Error(result.error || 'Failed to create course');
      }
      
    } catch (error) {
      console.error('Failed to create course:', error);
      setAlertMessage(`Failed to create course: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Enrollment editing handlers
  const handleStartEdit = (item) => {
    setEditingItemId(item.employee_courseID);
    setTempStatus(item.currentStatus || '');
    setTempScore(item.score || '');
    setTempCompletionDate(item.completionDate || '');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempStatus('');
    setTempScore('');
    setTempCompletionDate('');
  };

  const handleSubmitUpdate = async (item, newStatus, score = null, completionDate = null) => {
    try {
      setSubmitting(true);
      
      const updateData = { 
        enrollmentId: item.employee_courseID,
        newStatus 
      };
      
      if (completionDate !== null && completionDate !== '') {
        updateData.completionDate = completionDate;
      }

      const response = await fetch('http://localhost:5000/ManageContents/updateCourseEnrollment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        if (newStatus === 'Withdrawn') {
          setAlertMessage(`${item.username} has been withdrawn from the course and removed from their record.`);
        } else {
          setAlertMessage(`${item.username} has been marked as "${newStatus}"`);
        }
        setAlertType('success');
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedCourses();
        handleCancelEdit();
        
      } else {
        throw new Error(result.error || 'Failed to update enrollment');
      }
      
    } catch (error) {
      console.error('Failed to update enrollment:', error);
      setAlertMessage(`Failed to update enrollment: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
      handleCancelEdit();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <IcTypography variant="body">Loading managed courses...</IcTypography>;
  }

  if (managedCourses.length === 0) {
    return (
      <>
        <Header />
        <IcHero
          heading="Course Management"
          secondaryHeading="No courses to manage"
          secondarySubheading="You are not currently assigned as a manager for any courses."
          aligned="full-width">
          <IcButton 
            slot="interaction"
            variant="primary"
            onClick={() => {
              console.log('Creating new course');
              setIsCreateMode(true);
              setCreateFormData({
                courseName: '',
                courseDescription: '',
                duration: '',
                deliveryMethod: '',
                deliveryLocation: ''
              });
              setCreateDialogOpen(true);
            }}
          >
            <SlottedSVGTemplate mdiIcon={mdiBookOutline} />
            Create Course
          </IcButton>
        </IcHero>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <IcHero
        heading="Course Management"
        subheading="Manage course details and student enrollments"
        secondaryHeading={`Managing ${managedCourses.length} course${managedCourses.length === 1 ? '' : 's'}`}
        aligned="full-width">
        <IcButton 
          slot="interaction"
          variant="primary"
          onClick={() => {
            console.log('Creating new course');
            setIsCreateMode(true);
            setCreateFormData({
              courseName: '',
              courseDescription: '',
              duration: '',
              deliveryMethod: '',
              deliveryLocation: ''
            });
            setCreateDialogOpen(true);
          }}
        >
          <SlottedSVGTemplate mdiIcon={mdiBookOutline} />
          Create Course
        </IcButton>
        {managedCourses.length > 0 && activeTab && (
          <IcButton 
            slot="interaction"
            variant="secondary"
            onClick={() => {
              const course = managedCourses.find(c => c.courseID === activeTab);
              if (course) {
                setSelectedCourse(course);
                setEditFormData({
                  courseName: course.courseName || '',
                  description: course.description || '',
                  duration: course.duration || '',
                  delivery_method: course.delivery_method || '',
                  delivery_location: course.delivery_location || ''
                });
                setHasChanges(false);
                setEditDialogOpen(true);
              }
            }}
          >
            <SlottedSVGTemplate mdiIcon={mdiBookOutline} />
            Edit Course Details
          </IcButton>
        )}
      </IcHero>
      
      {alertVisible && (
        <IcAlert
          variant={alertType}
          heading={alertType === 'success' ? 'Success' : 'Error'}
          message={alertMessage}
          dismissible={true}
          onIcDismiss={() => setAlertVisible(false)}
          style={{ margin: '16px', marginBottom: '24px' }}
        />
      )}

      <IcTabContext>
        <IcTabGroup 
          label="Course Management" 
          style={{ margin: '16px' }} 
          onIcTabSelect={(e) => {
            console.log('Tab selected:', e.detail.value);
            setActiveTab(parseInt(e.detail.value));
          }}
        >
          {managedCourses.map((course) => {
            // Calculate awaiting count for this course
            const awaitingCount = course.enrollments.filter(enrollment => {
              const status = getStatusDisplay(enrollment);
              return status?.status !== 'Passed' && status?.status !== 'Completed';
            }).length;

            return (
              <IcTab 
                key={course.courseID} 
                value={course.courseID.toString()}
                onClick={() => {
                  console.log('Tab clicked manually:', course.courseID);
                  setActiveTab(course.courseID);
                }}
              >
                <SlottedSVGTemplate mdiIcon={mdiBookOutline} />
                {course.courseName}
                {awaitingCount > 0 && (
                  <IcBadge 
                    type="text"
                    label={awaitingCount.toString()} 
                    variant="info" 
                    style={{ marginLeft: '8px' }}
                  />
                )}
              </IcTab>
            );
          })}
        </IcTabGroup>

        {managedCourses.map((course) => {
          const awaitingEnrollments = course.enrollments.filter(enrollment => {
            const status = getStatusDisplay(enrollment);
            return status?.status !== 'Passed' && status?.status !== 'Completed';
          });
          
          const currentEnrollments = showOnlyAwaiting ? awaitingEnrollments : course.enrollments;
          
          return (
            <IcTabPanel key={course.courseID} value={course.courseID.toString()}>
              {/* Course Details Section */}
              {showCourseDetails[activeTab] && activeTab === course.courseID && (
                <IcSectionContainer style={{ margin: 'var(--ic-space-xs)', marginBottom: '24px' }}>
                  <IcTypography variant="h3" style={{ marginBottom: '16px' }}>
                    Course Details
                  </IcTypography>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <IcTextField
                      label="Course Name"
                      value={courseFormData[course.courseID]?.courseName || course.courseName || ''}
                      onIcInput={(e) => handleCourseFieldChange(course.courseID, 'courseName', e.detail.value)}
                      style={{ width: '100%' }}
                    />
                    <IcTextField
                      label="Duration (days)"
                      value={courseFormData[course.courseID]?.duration || course.duration?.toString() || ''}
                      onIcInput={(e) => handleCourseFieldChange(course.courseID, 'duration', e.detail.value)}
                      type="number"
                      step="0.125"
                      min="0.125"
                      helperText="Increments of 0.125 Days (1 hour)"
                      style={{ width: '100%' }}
                    />
                    <IcTextField
                      label="Description"
                      value={courseFormData[course.courseID]?.description || course.description || ''}
                      onIcInput={(e) => handleCourseFieldChange(course.courseID, 'description', e.detail.value)}
                      rows={3}
                      style={{ width: '100%' }}
                    />
                    <IcSelect
                      label="Delivery Method"
                      value={courseFormData[course.courseID]?.deliveryMethod || course.delivery_method || ''}
                      onIcChange={(e) => handleCourseFieldChange(course.courseID, 'deliveryMethod', e.detail.value)}
                      options={[
                        { label: 'Instructor-Led', value: 'Instructor-Led' },
                        { label: 'eLearning', value: 'eLearning' }
                      ]}
                      style={{ width: '100%' }}
                    />
                    <IcSelect
                      label="Delivery Location"
                      value={courseFormData[course.courseID]?.deliveryLocation || course.delivery_location || ''}
                      onIcChange={(e) => handleCourseFieldChange(course.courseID, 'deliveryLocation', e.detail.value)}
                      options={[
                        { label: 'High', value: 'High' },
                        { label: 'Low', value: 'Low' }
                      ]}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "16px" }}>
                    <IcButton 
                      variant="primary"
                      onClick={() => handleSubmitCourseUpdate(course.courseID)}
                      disabled={submitting || !hasUnsavedChanges[course.courseID]}
                    >
                      <SlottedSVGTemplate mdiIcon={mdiCheck} />
                      {hasUnsavedChanges[course.courseID] ? 'Update Course' : 'No Changes'}
                    </IcButton>
                  </div>
                </IcSectionContainer>
              )}

              {/* Enrollments Section */}
              <div style={{ padding: 'var(--ic-space-xs)', width: '85%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <IcTypography variant="h3">
                    Student Enrollments ({course.enrollments.length})
                  </IcTypography>
                  
                  <IcButton 
                    variant={showOnlyAwaiting ? "primary" : "secondary"}
                    onClick={() => setShowOnlyAwaiting(!showOnlyAwaiting)}
                    size="small"
                  >
                    <SlottedSVGTemplate mdiIcon={showOnlyAwaiting ? mdiToggleSwitch : mdiToggleSwitchOff} />
                    Show only awaiting review ({awaitingEnrollments.length})
                  </IcButton>
                </div>

                {currentEnrollments.length === 0 ? (
                  <IcTypography variant="body" style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
                    {showOnlyAwaiting 
                      ? 'No enrollments awaiting review for this course.' 
                      : 'No student enrollments found for this course.'
                    }
                  </IcTypography>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {currentEnrollments.map((enrollment, index) => {
                      const status = getStatusDisplay(enrollment);
                      const canUpdate = canUpdateStatus(enrollment, currentUser);

                      return (
                        <IcCardVertical 
                          key={index}
                          style={cardContainer}
                          heading={enrollment.username || 'Unknown Student'}
                          subheading={`${enrollment.role || 'Unknown Role'} | Enrolled: ${enrollment.recordDate || 'Unknown Date'}${enrollment.score ? ` | Score: ${enrollment.score}` : ''}`}
                          message={`Current Status: ${status?.status || 'Unknown'}`}
                        >
                          <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                          <IcStatusTag 
                            slot="interaction-button" 
                            label={status?.status || 'Unknown'} 
                            status={status?.color || 'neutral'} 
                          />

                          <div slot="interaction-controls" style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                              {editingItemId === enrollment.employee_courseID ? (
                                <div style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "12px",
                                  alignItems: "flex-start",
                                  width: "100%"
                                }}>
                                  <div style={{
                                    display: "flex",
                                    gap: "12px",
                                    flexWrap: "wrap",
                                    alignItems: "flex-end",
                                    width: "100%"
                                  }}>
                                    <IcSelect
                                      label="Status"
                                      value={tempStatus}
                                      onIcChange={(e) => setTempStatus(e.detail.value)}
                                      options={[
                                        { label: 'Enrolled', value: 'Enrolled' },
                                        { label: 'Expired', value: 'Expired' },
                                        { label: 'Completed', value: 'Completed' },
                                        { label: 'Withdraw (Remove from Record)', value: 'Withdrawn' }
                                      ]}
                                      style={{ minWidth: '150px', flex: '1' }}
                                    />
                                    <IcTextField
                                      label="Completion Date"
                                      value={tempCompletionDate}
                                      onIcInput={(e) => setTempCompletionDate(e.detail.value)}
                                      type="date"
                                      style={{ minWidth: '160px', flex: '0 0 auto' }}
                                    />
                                  </div>
                                  <div style={{
                                    display: "flex",
                                    gap: "8px",
                                    alignItems: "center"
                                  }}> 
                                  <IcButton 
                                    variant="primary"
                                    size="small"
                                    onClick={() => handleSubmitUpdate(enrollment, tempStatus, null, tempCompletionDate)}
                                    disabled={submitting}
                                  >
                                    <SlottedSVGTemplate mdiIcon={mdiCheck} />
                                    Save
                                  </IcButton>
                                  <IcButton 
                                    variant="secondary"
                                    size="small"
                                    onClick={handleCancelEdit}
                                  >
                                    <SlottedSVGTemplate mdiIcon={mdiClose} />
                                    Cancel
                                  </IcButton>
                                  </div>
                                </div>
                              ) : (
                                <IcButton 
                                  variant="primary"
                                  size="small"
                                  onClick={() => handleStartEdit(enrollment)}
                                >
                                  Update Status
                                  <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                                </IcButton>
                              )}
                            </div>
                        </IcCardVertical>
                      );
                    })}
                  </div>
                )}
              </div>
            </IcTabPanel>
          );
        })}
      </IcTabContext>

      {/* Edit Dialog */}
      <IcDialog
        size="large"
        open={editDialogOpen}
        closeOnBackdropClick={false}
        heading="Edit Course"
        disable-height-constraint='true'
        hideDefaultControls="true"
        buttons="false"
        onIcDialogClosed={() => setEditDialogOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateSubmit();
        }}>
          <IcTextField 
            value={editFormData.courseName || ''} 
            onIcInput={(e) => handleFormChange('courseName', e.detail.value)}
            label="Course Name" 
            type="text" 
            minCharacters={4} 
            maxCharcters={64} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={editFormData.description || ''} 
            onIcInput={(e) => handleFormChange('description', e.detail.value)}
            label="Course Description" 
            rows={3} 
            type="text" 
            minCharacters={16} 
            maxCharcters={256} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={editFormData.duration || ''} 
            onIcInput={(e) => handleFormChange('duration', e.detail.value)}
            label="Duration in Days" 
            placeholder="Insert number of days in increments of 0.125" 
            type="number" 
            min="0.125" 
            fullWidth="full-width" 
            helperText="Increments of 0.125 Days (1 hour)" 
            required 
          />
          <IcSelect 
            name="deliveryMethod" 
            label="Delivery Method" 
            required
            value={editFormData.delivery_method || ''}
            onIcChange={(e) => handleFormChange('delivery_method', e.detail.value)}
            options={[
              { label: 'In-Person', value: 'In-Person' },
              { label: 'Virtual', value: 'Virtual' },
              { label: 'Hybrid', value: 'Hybrid' }
            ]}
          />
          <IcSelect 
            name="deliveryLocation" 
            label="Delivery Location" 
            required
            value={editFormData.delivery_location || ''}
            onIcChange={(e) => handleFormChange('delivery_location', e.detail.value)}
            options={[
              { label: 'High', value: 'High' },
              { label: 'Low', value: 'Low' }
            ]}
          />
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
            <IcButton 
              variant="destructive" 
              onClick={() => setDeleteConfirmOpen(true)}
              type="button"
            >
              <SlottedSVGTemplate mdiIcon={mdiDelete} />
              Delete Course
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={!hasChanges}
            >
              <SlottedSVGTemplate mdiIcon={mdiPencil} />
              {hasChanges ? 'Update Course' : 'No Changes'}
            </IcButton>
          </div>
        </form>
      </IcDialog>

      {/* Create Course Dialog */}
      <IcDialog
        size="large"
        open={createDialogOpen}
        closeOnBackdropClick={false}
        heading="Create New Course"
        disable-height-constraint='true'
        buttons="false"
        onIcDialogClosed={() => {
          setCreateDialogOpen(false);
          setIsCreateMode(false);
        }}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleCreateSubmit();
        }}>
          <IcTextField 
            value={createFormData.courseName || ''} 
            onIcInput={(e) => handleCreateFormChange('courseName', e.detail.value)}
            label="Course Name" 
            type="text" 
            minCharacters={4} 
            maxCharcters={64} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={createFormData.courseDescription || ''} 
            onIcInput={(e) => handleCreateFormChange('courseDescription', e.detail.value)}
            label="Course Description" 
            rows={3} 
            type="text" 
            minCharacters={16} 
            maxCharcters={256} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField
            value={createFormData.duration || ''}
            onIcInput={(e) => handleCreateFormChange('duration', e.detail.value)}
            label="Duration (days)"
            type="number"
            step="0.125"
            min="0.125"
            helperText="Increments of 0.125 Days (1 hour)"
            fullWidth="full-width"
            required
          />
          <IcSelect
            value={createFormData.deliveryMethod || ''}
            onIcChange={(e) => handleCreateFormChange('deliveryMethod', e.detail.value)}
            label="Delivery Method"
            fullWidth="full-width"
            options={[
              { label: 'Online Course', value: 'Online Course' },
              { label: 'Written Course', value: 'Written Course' },
              { label: 'Practical Course', value: 'Practical Course' },
              { label: 'Interview Course', value: 'Interview Course' }
            ]}
          />
          <IcSelect
            value={createFormData.deliveryLocation || ''}
            onIcChange={(e) => handleCreateFormChange('deliveryLocation', e.detail.value)}
            label="Delivery Location"
            fullWidth="full-width"
            options={[
              { label: 'High', value: 'High' },
              { label: 'Low', value: 'Low' }
            ]}
          />
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton 
              variant="tertiary" 
              onClick={() => {
                setCreateDialogOpen(false);
                setIsCreateMode(false);
              }}
              type="button"
            >
              Cancel
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={!hasChanges}
            >
              <SlottedSVGTemplate mdiIcon={mdiBookOutline} />
              {hasChanges ? 'Create Course' : 'Fill Required Fields'}
            </IcButton>
          </div>
        </form>
      </IcDialog>

      {/* Delete Confirmation Dialog */}
      <IcDialog
        size="small"
        open={deleteConfirmOpen}
        heading="Confirm Delete"
        buttons="false"
        onIcDialogClosed={() => setDeleteConfirmOpen(false)}>
        <div>
          <p>Are you sure you want to delete this course?</p>
          <p><strong>{selectedCourse?.courseName}</strong></p>
          <p>This action cannot be undone.</p>
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton 
              variant="tertiary" 
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </IcButton>
            <IcButton 
              variant="destructive" 
              onClick={handleDelete}
            >
              Delete
            </IcButton>
          </div>  
        </div>
      </IcDialog>
      
      <Footer />
    </>
  );
};

export default CourseManagement;
