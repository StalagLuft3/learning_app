import React, { useEffect, useState, useRef } from "react";
import { IcDialog, IcTextField, IcRadioGroup, IcRadioOption, IcCardVertical, IcButton, IcStatusTag, IcSectionContainer, IcHero, IcAlert } from "@ukic/react";
import { mdiBook } from "@mdi/js";
import { divContainer, sectionContainer, cardContainer } from "../styles/containerLayout";

import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { useDialogs } from "../commonFunctions/commonDialogHandlers";
import { fetchData } from "../commonFunctions/api";
import { handleSearch, clearSearch, getSearchResults, getCourseAssessmentOptions } from "../commonFunctions/commonUtilities";
import { getCourseStatus } from "../commonFunctions/statusUtilities";

function Courses() {
  console.log('Courses: Component mounted/rendered');
  
  const [coursesData, setCoursesData] = useState([]);
  const [isEnrolledOnCourseList, setIsEnrolledOnCourseList] = useState([]);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [searchSelection, setSearchSelection] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const { isDialogOpen, openDialog, closeDialog } = useDialogs();

  useEffect(() => {
    console.log('Courses: Starting to fetch courses data');
    fetchData("/CourseCatalogue/courses")
      .then(({ data, isEnrolledOnCourseList, courseEnrollments }) => {
        console.log('Courses: Successfully fetched courses data:', { 
          dataLength: data?.length, 
          coursesEnrolled: isEnrolledOnCourseList?.length
        });
        setCoursesData(data);
        setIsEnrolledOnCourseList(isEnrolledOnCourseList);
        setCourseEnrollments(courseEnrollments || []);
      })
      .catch(err => {
        console.error('Courses: Error fetching courses data:', err);
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

  const filteredData = coursesData;

  const courseCount = filteredData.length;
  const courseOptions = getCourseAssessmentOptions(filteredData);
  const searchMatch = getSearchResults(filteredData, searchSelection, "courseName", "description");

  return (
    <>
      <Header />
      <IcHero
        aligned="full-width"
        heading="Available Courses"
        secondaryHeading={`${courseCount} Courses are available`}
      >
        <IcTextField 
          slot="interaction"
          hideLabel 
          placeholder="Search courses by name or description" 
          value={searchSelection}
          onIcInput={(ev) => handleSearch(ev.detail.value, setSearchSelection)} 
          onIcClear={() => clearSearch(setSearchSelection)}
          style={{ minWidth: '250px' }}
        />
        <IcButton onClick={() => openDialog('createCourse')} slot="interaction" variant="primary">
          Create Course
          <SlottedSVGTemplate mdiIcon={mdiBook} />
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
      {searchMatch.map((course, i) => {
        return (
          <div slot="interaction-controls" style={divContainer} key={i}>
            <div>
              <IcCardVertical 
                fullWidth="true" 
                style={cardContainer} 
                heading={course.courseName} 
                subheading={`${course.delivery_location} | ${course.delivery_method} | ${course.duration} Day(s) | Course Manager: ${course.username} (${course.role})`} 
                message={course.description}
              >
                <SlottedSVGTemplate mdiIcon={mdiBook} />
                {(() => {
                  if (isEnrolledOnCourseList.includes(course.courseID)) {
                    // Find the enrollment record for this course to get the status
                    const enrollment = courseEnrollments.find(e => e.courseID === course.courseID);
                    const statusInfo = enrollment ? getCourseStatus(enrollment) : { status: 'Enrolled', color: 'neutral' };
                    return <IcStatusTag status={statusInfo.color} label={statusInfo.status} variant="filled" slot="adornment" size="small" />
                  } else {
                    return <div slot="interaction-controls">
                      <IcButton 
                        variant="primary" 
                        onClick={() => handleCourseEnrollment(course.courseID)}
                      >
                        Enrol
                      </IcButton>
                    </div>
                  }
                })()}
              </IcCardVertical>
            </div>
            <div></div>
          </div>
        );
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
      </IcDialog>

    </>
  );
}

export default Courses;
