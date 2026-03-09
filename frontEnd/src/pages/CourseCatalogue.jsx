import React, { useEffect, useState, useRef } from "react";
import { IcDialog, IcTextField, IcRadioGroup, IcRadioOption, IcCard, IcButton, IcStatusTag, IcSectionContainer, IcHero, IcAlert } from "@ukic/react";
import { mdiNotebookPlusOutline, mdiCheckCircleOutline, mdiCheckboxMarkedCirclePlusOutline, mdiNotebookOutline, mdiToggleSwitch, mdiToggleSwitchOff, mdiPencil, mdiDelete } from "@mdi/js";
import { divContainer, sectionContainer, cardContainer } from "../styles/containerLayout";

import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { useDialogs } from "../commonFunctions/commonDialogHandlers";
import { fetchData } from "../commonFunctions/api";
import { handleSearch, clearSearch, getSearchResults, getCourseAssessmentOptions, countCoursesAndAssessments } from "../commonFunctions/commonUtilities";

function Contents() {
  console.log('CourseCatalogue: Component mounted/rendered');
  
  const [data, setData] = useState([]);
  const [isEnrolledOnCourseList, setIsEnrolledOnCourseList] = useState([]);
  const [isEnrolledOnAssessmentList, setIsEnrolledOnAssessmentList] = useState([]);
  const [searchSelection, setSearchSelection] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const { isDialogOpen, openDialog, closeDialog } = useDialogs();
  const assessmentFormRef = useRef(null);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contentType, setContentType] = useState('course'); // 'course' or 'assessment'

  useEffect(() => {
    // Load current user data
    fetchData("/Auth/user")
      .then((userData) => {
        setCurrentUser(userData);
        console.log('Current user loaded:', userData);
      })
      .catch(err => console.error('Error loading user data:', err));

    console.log('CourseCatalogue: Starting to fetch data from /courseCatalogue');
    fetchData("/CourseCatalogue")
      .then(({ data, isEnrolledOnCourseList, isEnrolledOnAssessmentList }) => {
        console.log('CourseCatalogue: Successfully fetched data:', { 
          dataLength: data?.length, 
          coursesEnrolled: isEnrolledOnCourseList?.length, 
          assessmentsEnrolled: isEnrolledOnAssessmentList?.length 
        });
        setData(data);
        setIsEnrolledOnCourseList(isEnrolledOnCourseList);
        setIsEnrolledOnAssessmentList(isEnrolledOnAssessmentList);
      })
      .catch(err => {
        console.error('CourseCatalogue: Error fetching data:', err);
      });
  }, []);

  // Handle course enrollment
  const handleCourseEnrollment = async (courseID) => {
    const params = new URLSearchParams();
    params.append('enrolCourseID', courseID);

    try {
      const response = await fetch('http://localhost:5000/CourseCatalogue/enrolCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'include', // Important for cookies
        body: params
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage(result.message || "Successfully enrolled in course!");
        setAlertType("success");
        setShowAlert(true);
        
        // Update enrollment status locally
        setIsEnrolledOnCourseList(prev => [...prev, parseInt(courseID)]);
      } else {
        setAlertMessage(result.errors || "Failed to enroll in course");
        setAlertType("error");
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Course enrollment error:', error);
      setAlertMessage("An error occurred while enrolling. Please try again.");
      setAlertType("error");
      setShowAlert(true);
    }
  };

  // Handle assessment enrollment
  const handleAssessmentEnrollment = async (assessmentID) => {
    const params = new URLSearchParams();
    params.append('enrolAssessmentID', assessmentID);

    try {
      const response = await fetch('http://localhost:5000/CourseCatalogue/enrolAssessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'include', // Important for cookies
        body: params
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage(result.message || "Successfully enrolled in assessment!");
        setAlertType("success");
        setShowAlert(true);
        
        // Update enrollment status locally
        setIsEnrolledOnAssessmentList(prev => [...prev, parseInt(assessmentID)]);
      } else {
        setAlertMessage(result.errors || "Failed to enroll in assessment");
        setAlertType("error");
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Assessment enrollment error:', error);
      setAlertMessage("An error occurred while enrolling. Please try again.");
      setAlertType("error");
      setShowAlert(true);
    }
  };

  // Content filtering for edit mode
  const getFilteredContent = (allContent) => {
    if (!editMode || !currentUser) return allContent;
    
    return allContent.filter(item => {
      // For courses
      if (item.courseID) {
        return item.courseManagerID === currentUser.employeeID;
      }
      // For assessments
      if (item.assessmentID) {
        return item.manager_ID === currentUser.employeeID;
      }
      return false;
    });
  };

  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    const newEditMode = !editMode;
    setEditMode(newEditMode);
    
    setAlertMessage(newEditMode 
      ? "You are now in edit mode, click on your content to open edit dialog." 
      : "You have exited edit mode"
    );
    setAlertType("info");
    setShowAlert(true);
    
    // Auto-hide alert after 3 seconds
    setTimeout(() => setShowAlert(false), 3000);
  };

  // Handle content click in edit mode
  const handleContentEdit = (content) => {
    if (!editMode) return;
    
    setSelectedContent(content);
    setContentType(content.courseID ? 'course' : 'assessment');
    
    // Pre-populate form data
    if (content.courseID) {
      setEditFormData({
        courseName: content.courseName || '',
        courseDescription: content.description || '',
        courseLocation: content.delivery_location || '',
        courseMethod: content.delivery_method || '',
        duration: content.duration || ''
      });
    } else if (content.assessmentID) {
      setEditFormData({
        courseName: content.name || '', // Using courseName field name for consistency
        assessmentDescription: content.description || '',
        assessmentLocation: content.delivery_location || '',
        assessmentMethod: content.delivery_method || '',
        duration: content.duration || '',
        maxScore: content.max_score || '',
        passingScore: content.passing_score || '',
        expiry: content.expiry || ''
      });
    }
    
    setHasChanges(false);
    setEditDialogOpen(true);
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Handle update submission
  const handleUpdateSubmit = async () => {
    if (!hasChanges || !selectedContent) return;

    try {
      const endpoint = contentType === 'course' 
        ? '/CourseCatalogue/updateCourse'
        : '/CourseCatalogue/updateAssessment';
      
      const requestData = contentType === 'course'
        ? {
            courseID: selectedContent.courseID,
            courseName: editFormData.courseName,
            description: editFormData.courseDescription,
            delivery_location: editFormData.courseLocation,
            delivery_method: editFormData.courseMethod,
            duration: parseInt(editFormData.duration)
          }
        : {
            assessmentID: selectedContent.assessmentID,
            name: editFormData.courseName,
            description: editFormData.assessmentDescription,
            delivery_location: editFormData.assessmentLocation,
            delivery_method: editFormData.assessmentMethod,
            duration: parseFloat(editFormData.duration),
            max_score: parseInt(editFormData.maxScore),
            passing_score: parseInt(editFormData.passingScore),
            expiry: editFormData.expiry
          };

      console.log('Sending update request:', {
        endpoint,
        requestData,
        hasToken: document.cookie.includes('x-auth-token')
      });
      
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      console.log('Update response status:', response.status);
      
      if (response.ok) {
        setAlertMessage(`${contentType === 'course' ? 'Course' : 'Assessment'} updated successfully!`);
        setAlertType("success");
        setShowAlert(true);
        setEditDialogOpen(false);
        
        // Refresh data
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Update failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        setAlertMessage('Error updating content: ' + (errorData.error || 'Unknown error'));
        setAlertType("error");
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Update error:', error);
      setAlertMessage('Error updating content. Please try again.');
      setAlertType("error");
      setShowAlert(true);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedContent) return;

    try {
      const endpoint = contentType === 'course'
        ? `/CourseCatalogue/deleteCourse/${selectedContent.courseID}`
        : `/CourseCatalogue/deleteAssessment/${selectedContent.assessmentID}`;

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setAlertMessage(`${contentType === 'course' ? 'Course' : 'Assessment'} deleted successfully!`);
        setAlertType("success");
        setShowAlert(true);
        setDeleteConfirmOpen(false);
        setEditDialogOpen(false);
        
        // Refresh data
        window.location.reload();
      } else {
        const errorData = await response.json();
        setAlertMessage('Error deleting content: ' + (errorData.error || 'Unknown error'));
        setAlertType("error");
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setAlertMessage('Error deleting content. Please try again.');
      setAlertType("error");
      setShowAlert(true);
    }
  };

  const filteredData = getFilteredContent(data);
  const { courseCount, assessmentCount } = countCoursesAndAssessments(filteredData);
  const courseAssessmentOptions = getCourseAssessmentOptions(filteredData);
  const searchMatch = getSearchResults(filteredData, searchSelection, "courseName", "description");

  return (
    <>
      <Header />
      <IcHero aligned="full-width"
        heading="Available Courses and Assessments"
        secondaryHeading={`${courseCount} Courses and ${assessmentCount} Assessments are available`}
        >
        <IcTextField 
          slot="interaction" 
          hideLabel 
          placeholder="Search courses and assessments by title or description" 
          value={searchSelection}
          onIcInput={(ev) => handleSearch(ev.detail.value, setSearchSelection)}
          onIcClear={() => clearSearch(setSearchSelection)}
          style={{ minWidth: '250px' }}
        />
        <IcButton 
          onClick={handleEditModeToggle} 
          slot="interaction" 
          variant={editMode ? "primary" : "secondary"}
        >
          <SlottedSVGTemplate mdiIcon={editMode ? mdiToggleSwitch : mdiToggleSwitchOff} />
          Edit Mode
        </IcButton>
        <IcButton onClick={() => openDialog('createCourse')} slot="interaction" variant="primary">
          Create Course
          <SlottedSVGTemplate mdiIcon={mdiNotebookPlusOutline} />
        </IcButton>
        <IcButton onClick={() => {
          // Reset form and clear previous alerts when opening dialog
          if (assessmentFormRef.current) {
            assessmentFormRef.current.reset();
          }
          setAlertMessage('');
          setAlertType('');
          setShowAlert(false);
          openDialog('createAssessment');
        }} slot="interaction" variant="primary">
          Create Assessment
          <SlottedSVGTemplate mdiIcon={mdiCheckboxMarkedCirclePlusOutline} />
        </IcButton>
      </IcHero>
      
      {showAlert && (
        <IcAlert
          heading={alertType === "success" ? "Success" : alertType === "info" ? "Info" : "Error"}
          message={alertMessage}
          variant={alertType === "success" ? "success" : alertType === "info" ? "info" : "error"}
          dismissible="true"
          onIcAlertDismissed={() => setShowAlert(false)}
        />
      )}
      
      <IcSectionContainer style={sectionContainer}></IcSectionContainer>
      {searchMatch.map((d, i) => {
        if (d.courseID) {
          return (
            <div slot="interaction-controls" style={divContainer}>
              <div>
                <IcCard 
                  fullWidth="true" 
                  style={cardContainer} 
                  key={i} 
                  heading={d.courseName} 
                  subheading={`${d.delivery_location} | ${d.delivery_method} | ${d.duration} Day(s) | Course Manager: ${d.username} (${d.role})`} 
                  message={d.description}
                  clickable={editMode && currentUser?.employeeID === d.courseManagerID ? "true" : "false"}
                  onClick={() => editMode && currentUser?.employeeID === d.courseManagerID && handleContentEdit(d)}
                >
                  <SlottedSVGTemplate mdiIcon={mdiNotebookOutline} />
                  {editMode && currentUser?.employeeID === d.courseManagerID ? (
                    <IcStatusTag status="success" label="Editable" variant="filled" slot="adornment" size="small" />
                  ) : (
                    (() => {
                      if (isEnrolledOnCourseList.includes(d.courseID)) {
                        return <IcStatusTag status="neutral" label="Enrolled" variant="filled" slot="adornment" size="small" />
                      } else {
                        return <div slot="interaction-controls">
                          <IcButton 
                            variant="primary" 
                            onClick={() => handleCourseEnrollment(d.courseID)}
                          >
                            Enrol
                          </IcButton>
                        </div>
                      }
                    })()
                  )}
                </IcCard>
              </div>
              <div></div>
            </div>
          );
        } else if (d.assessmentID) {
          const expiry = d.expiry || "None"
          return (
            <div slot="interaction-controls" style={divContainer}>
              <div>
                <IcCard 
                  fullWidth="true" 
                  style={cardContainer} 
                  key={i} 
                  heading={d.name} 
                  subheading={`${d.delivery_location} | ${d.delivery_method} | ${d.duration} Day(s) | Max Score: ${d.max_score} | Passing Score: ${d.passing_score} | Expiry - Year(s): ${expiry} | Assessment Manager: ${d.username || 'N/A'} (${d.role || 'N/A'})`} 
                  message={d.description}
                  clickable={editMode && currentUser?.employeeID === d.manager_ID ? "true" : "false"}
                  onClick={() => editMode && currentUser?.employeeID === d.manager_ID && handleContentEdit(d)}
                >
                <SlottedSVGTemplate mdiIcon={mdiCheckCircleOutline} />
                {editMode && currentUser?.employeeID === d.manager_ID ? (
                  <IcStatusTag status="success" label="Editable" variant="filled" slot="adornment" size="small" />
                ) : (
                  (() => {
                    if (isEnrolledOnAssessmentList.includes(d.assessmentID)) {
                      return <IcStatusTag status="neutral" label="Enrolled" variant="filled" slot="adornment" size="small" />
                    } else {
                      return <div slot="interaction-controls" >
                        <IcButton 
                          variant="primary" 
                          onClick={() => handleAssessmentEnrollment(d.assessmentID)}
                        >
                          Enrol
                        </IcButton>
                      </div>
                    }
                  })()
                )}
              </IcCard>
              </div>
              <div></div>
            </div>
          );
        } else {
          return (
            <div></div>
          );
        }
      })}

      <Footer />
      
      <IcDialog
        size="large"
        open={isDialogOpen('createCourse')}
        closeOnBackdropClick={false}
        heading="Create a new Course that you will manage"
        disable-height-constraint='true'
        buttons="false"
        onIcDialogClosed={() => closeDialog('createCourse')}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          
          // Use FormData to properly capture form data including radio groups
          const formDataRaw = new FormData(e.target);
          const formData = new URLSearchParams(formDataRaw);
          
          try {
            console.log('Submitting course creation...');
            console.log('Form data:', Object.fromEntries(formData));
            
            const response = await fetch('http://localhost:5000/CourseCatalogue/createCourse', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formData
            });
            
            console.log('Response status:', response.status);
            if (response.ok) {
              console.log('Course created successfully');
              closeDialog('createCourse');
              window.location.reload();
            } else {
              console.error('Course creation failed with status:', response.status);
              const errorData = await response.json();
              console.error('Error details:', errorData);
              
              if (response.status === 401) {
                alert('Authentication error: You need to be logged in to create courses. Redirecting to login...');
                window.location.href = '/Login';
              } else {
                alert('Error creating course: ' + (errorData.errors || 'Unknown error'));
              }
              closeDialog('createCourse');
            }
          } catch (error) {
            console.error('Error creating course:', error);
            closeDialog('createCourse');
          }
        }} id="createCourseForm">
          <IcTextField name="courseName" style={cardContainer} label="Course Name" type="text" minCharacters={4} maxCharcters={64} fullWidth="full-width" required />
          <IcTextField name="courseDescription" style={cardContainer} label="Course Description" rows={3} type="text" minCharacters={16} maxCharcters={256} fullWidth="full-width" required />
          <IcRadioGroup name='courseLocation' label="Delivery Location" orientation="horizontal" required>
            <IcRadioOption value="High" label="High" />
            <IcRadioOption value="Low" label="Low" />
          </IcRadioGroup>
          <br />
          <IcRadioGroup name='courseMethod' label="Delivery Method" orientation="horizontal" required>
            <IcRadioOption value="Instructor-Led" label="Instructor-Led" />
            <IcRadioOption value="eLearning" label="eLearning" />
          </IcRadioGroup>
          <br />
          <IcTextField name="duration" style={cardContainer} label="Duration in Days" placeholder="Insert number of days in increments of 0.125" type="number" min="0.125" fullWidth="full-width" helperText="Increments of 0.125 Days (1 hour)" required />
          <br />
          <IcButton variant="primary" type="submit" form="createCourseForm">Create Course</IcButton>
        </form>
      </IcDialog >

      <IcDialog
        size="large"
        open={isDialogOpen('createAssessment')}
        closeOnBackdropClick={false}
        heading="Create a new Assessment that you will manage"
        disable-height-constraint='true'
        buttons="false"
        onIcDialogClosed={() => closeDialog('createAssessment')}>
        <form ref={assessmentFormRef} onSubmit={async (e) => {
          e.preventDefault();
          
          // Use FormData to properly capture form data including radio groups
          const formDataRaw = new FormData(e.target);
          const formData = new URLSearchParams(formDataRaw);
          
          try {
            console.log('Submitting assessment creation...');
            console.log('Form data:', Object.fromEntries(formData));
            
            const response = await fetch('http://localhost:5000/CourseCatalogue/createAssessment', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formData
            });
            
            console.log('Response status:', response.status);
            if (response.ok) {
              console.log('Assessment created successfully');
              setAlertMessage('Assessment created successfully!');
              setAlertType('success');
              setShowAlert(true);
              closeDialog('createAssessment');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              console.error('Assessment creation failed with status:', response.status);
              const errorData = await response.json();
              console.error('Error details:', errorData);
              
              if (response.status === 401) {
                setAlertMessage('Authentication error: You need to be logged in to create assessments.');
                setAlertType('error');
                setShowAlert(true);
              } else {
                setAlertMessage('Error creating assessment: ' + (errorData.errors || 'Unknown error'));
                setAlertType('error');
                setShowAlert(true);
              }
              closeDialog('createAssessment');
            }
          } catch (error) {
            console.error('Error creating assessment:', error);
            setAlertMessage('Error creating assessment. Please try again.');
            setAlertType('error');
            setShowAlert(true);
            closeDialog('createAssessment');
          }
        }} id="createAssessmentForm">
          <IcTextField name="courseName" style={cardContainer} placeholder="Should match corresponding Course Name with 'Assessment' appended" label="Assessment Name" type="text" minCharacters={4} maxCharcters={64} fullWidth="full-width" required />
          <IcTextField name="assessmentDescription" style={cardContainer} label="Assessment Description" rows={3} type="text" minCharacters={16} maxCharcters={256} fullWidth="full-width" required />
          <IcRadioGroup name='assessmentLocation' label="Delivery Location" orientation="horizontal" required>
            <IcRadioOption value="High" label="High" />
            <IcRadioOption value="Low" label="Low" />
          </IcRadioGroup>
          <br />
          <IcRadioGroup name='assessmentMethod' label="Delivery Type" orientation="horizontal" required>
            <IcRadioOption value="Online Assessment" label="Online Exam" />
            <IcRadioOption value="Written Assessment" label="Written Exam" />
            <IcRadioOption value="Practical Assessment" label="Practical Exam" />
            <IcRadioOption value="Interview Assessment" label="Interview Exam" />
          </IcRadioGroup>
          <br />
          <IcTextField name="duration" style={cardContainer} label="Duration in Days" placeholder="Insert number of days in increments of 0.125" type="number" min="0.125" fullWidth="full-width" helperText="Increments of 0.125 Days (1 hour)" required />
          <IcTextField name="maxScore" label="Maximum Score" type="number" min="1" fullWidth="full-width" required />
          <IcTextField name="passingScore" label="Passing Score" type="number" min="1" fullWidth="full-width" required />
          <IcTextField name="expiry" label="Expiry (Full Years or 0 when no expiry)" type="number" min="0" fullWidth="full-width" required />
          <br />
          <IcButton variant="primary" type="submit" form="createAssessmentForm">Create Assessment</IcButton>
        </form>
      </IcDialog >

      {/* Edit Dialog */}
      <IcDialog
        size="large"
        open={editDialogOpen}
        closeOnBackdropClick={false}
        heading={`Edit ${contentType === 'course' ? 'Course' : 'Assessment'}`}
        disable-height-constraint='true'
        buttons="false"
        onIcDialogClosed={() => setEditDialogOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateSubmit();
        }}>
          <IcTextField 
            value={editFormData.courseName || ''} 
            onIcInput={(e) => handleFormChange('courseName', e.detail.value)}
            label={`${contentType === 'course' ? 'Course' : 'Assessment'} Name`} 
            type="text" 
            minCharacters={4} 
            maxCharcters={64} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={editFormData[contentType === 'course' ? 'courseDescription' : 'assessmentDescription'] || ''} 
            onIcInput={(e) => handleFormChange(contentType === 'course' ? 'courseDescription' : 'assessmentDescription', e.detail.value)}
            label={`${contentType === 'course' ? 'Course' : 'Assessment'} Description`} 
            rows={3} 
            type="text" 
            minCharacters={16} 
            maxCharcters={256} 
            fullWidth="full-width" 
            required 
          />
          <IcRadioGroup 
            name={`${contentType}Location`} 
            label="Delivery Location" 
            orientation="horizontal" 
            required
            value={editFormData[contentType === 'course' ? 'courseLocation' : 'assessmentLocation'] || ''}
            onIcChange={(e) => handleFormChange(contentType === 'course' ? 'courseLocation' : 'assessmentLocation', e.detail.value)}
          >
            <IcRadioOption value="High" label="High" />
            <IcRadioOption value="Low" label="Low" />
          </IcRadioGroup>
          <br />
          <IcRadioGroup 
            name={`${contentType}Method`} 
            label={`${contentType === 'course' ? 'Delivery' : 'Assessment'} Method`} 
            orientation="horizontal" 
            required
            value={editFormData[contentType === 'course' ? 'courseMethod' : 'assessmentMethod'] || ''}
            onIcChange={(e) => handleFormChange(contentType === 'course' ? 'courseMethod' : 'assessmentMethod', e.detail.value)}
          >
            {contentType === 'course' ? (
              <>
                <IcRadioOption value="Instructor-Led" label="Instructor-Led" />
                <IcRadioOption value="eLearning" label="eLearning" />
              </>
            ) : (
              <>
                <IcRadioOption value="Practical Assessment" label="Practical Exam" />
                <IcRadioOption value="Interview Assessment" label="Interview Exam" />
              </>
            )}
          </IcRadioGroup>
          <br />
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
          
          {/* Assessment-specific fields */}
          {contentType === 'assessment' && (
            <>
              <IcTextField 
                value={editFormData.maxScore || ''} 
                onIcInput={(e) => handleFormChange('maxScore', e.detail.value)}
                label="Maximum Score" 
                type="number" 
                min="1" 
                fullWidth="full-width" 
                required 
              />
              <IcTextField 
                value={editFormData.passingScore || ''} 
                onIcInput={(e) => handleFormChange('passingScore', e.detail.value)}
                label="Passing Score" 
                type="number" 
                min="1" 
                fullWidth="full-width" 
                required 
              />
              <IcTextField 
                value={editFormData.expiry || ''} 
                onIcInput={(e) => handleFormChange('expiry', e.detail.value)}
                label="Expiry (Full Years or 0 when no expiry)" 
                type="number" 
                min="0" 
                fullWidth="full-width" 
                required 
              />
            </>
          )}
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
            <IcButton 
              variant="destructive" 
              onClick={() => setDeleteConfirmOpen(true)}
              type="button"
            >
              <SlottedSVGTemplate mdiIcon={mdiDelete} />
              Delete {contentType === 'course' ? 'Course' : 'Assessment'}
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={!hasChanges}
            >
              <SlottedSVGTemplate mdiIcon={mdiPencil} />
              {hasChanges ? `Update ${contentType === 'course' ? 'Course' : 'Assessment'}` : 'No Changes'}
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
          <p>Are you sure you want to delete this {contentType === 'course' ? 'course' : 'assessment'}?</p>
          <p><strong>{selectedContent?.courseName || selectedContent?.name}</strong></p>
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

    </>  
  )
};

export default Contents;