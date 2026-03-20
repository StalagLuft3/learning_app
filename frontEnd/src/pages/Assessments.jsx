import React, { useEffect, useState, useRef } from "react";
import { IcDialog, IcTextField, IcRadioGroup, IcRadioOption, IcCardVertical, IcButton, IcStatusTag, IcSectionContainer, IcHero, IcAlert } from "@ukic/react";
import { mdiCheckDecagram } from "@mdi/js";
import { divContainer, sectionContainer, cardContainer } from "../styles/containerLayout";

import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { useDialogs } from "../commonFunctions/commonDialogHandlers";
import { fetchData } from "../commonFunctions/api";
import { handleSearch, clearSearch, getSearchResults, getCourseAssessmentOptions } from "../commonFunctions/commonUtilities";

function Assessments() {
  console.log('Assessments: Component mounted/rendered');
  
  const [assessmentsData, setAssessmentsData] = useState([]);
  const [isEnrolledOnAssessmentList, setIsEnrolledOnAssessmentList] = useState([]);
  const [searchSelection, setSearchSelection] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const { isDialogOpen, openDialog, closeDialog } = useDialogs();
  const assessmentFormRef = useRef(null);

  useEffect(() => {
    console.log('Assessments: Starting to fetch assessments data');
    fetchData("/CourseCatalogue/assessments")
      .then(({ data, isEnrolledOnAssessmentList }) => {
        console.log('Assessments: Successfully fetched assessments data:', { 
          dataLength: data?.length,
          assessmentsEnrolled: isEnrolledOnAssessmentList?.length 
        });
        setAssessmentsData(data);
        setIsEnrolledOnAssessmentList(isEnrolledOnAssessmentList);
      })
      .catch(err => {
        console.error('Assessments: Error fetching assessments data:', err);
      });
  }, []);

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

  const filteredData = assessmentsData;
  const assessmentCount = filteredData.length;
  const assessmentOptions = getCourseAssessmentOptions(filteredData);
  const searchMatch = getSearchResults(filteredData, searchSelection, "name", "description");

  return (
    <>
      <Header />
      <IcHero
        aligned="full-width"
        heading="Available Assessments"
        secondaryHeading={`${assessmentCount} Assessments are available`}
      >
        <IcTextField 
          slot="interaction"
          hideLabel 
          placeholder="Search assessments by name or description" 
          value={searchSelection}
          onIcInput={(ev) => handleSearch(ev.detail.value, setSearchSelection)}
          onIcClear={() => clearSearch(setSearchSelection)}
          style={{ minWidth: '250px' }}
        />
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
          <SlottedSVGTemplate mdiIcon={mdiCheckDecagram} />
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
      {searchMatch.map((assessment, i) => {
        const expiry = assessment.expiry || "None";
        return (
          <div slot="interaction-controls" style={divContainer} key={i}>
            <div>
              <IcCardVertical 
                fullWidth="true" 
                style={cardContainer} 
                heading={assessment.name} 
                subheading={`${assessment.delivery_location} | ${assessment.delivery_method} | ${assessment.duration} Day(s) | Max Score: ${assessment.max_score} | Passing Score: ${assessment.passing_score} | Expiry - Year(s): ${expiry} | Assessment Manager: ${assessment.username || 'N/A'} (${assessment.role || 'N/A'})`} 
                message={assessment.description}
              >
                <SlottedSVGTemplate mdiIcon={mdiCheckDecagram} />
                {(() => {
                  if (isEnrolledOnAssessmentList.includes(assessment.assessmentID)) {
                    return <IcStatusTag status="neutral" label="Enrolled" variant="filled" slot="adornment" size="small" />
                  } else {
                      return <div slot="interaction-controls" >
                        <IcButton 
                          variant="primary" 
                          onClick={() => handleAssessmentEnrollment(assessment.assessmentID)}
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
        open={isDialogOpen('createAssessment')}
        closeOnBackdropClick={false}
        heading="Create a new Assessment that you will manage"
        disable-height-constraint='true'
        hideDefaultControls="true"
        buttons="false"
        onIcDialogClosed={() => closeDialog('createAssessment')}>
        <form ref={assessmentFormRef} onSubmit={async (e) => {
          e.preventDefault();
          
          // Build payload explicitly because custom IcRadioGroup values may not be serialized by FormData.
          const formElement = e.target;
          const formDataRaw = new FormData(formElement);

          const assessmentLocation = formElement.querySelector('ic-radio-group[name="deliveryLocation"]')?.value;
          const assessmentMethod = formElement.querySelector('ic-radio-group[name="deliveryMethod"]')?.value;

          const payload = {
            courseName: formDataRaw.get('courseName') || '',
            assessmentDescription: formDataRaw.get('assessmentDescription') || '',
            assessmentLocation: assessmentLocation || formDataRaw.get('deliveryLocation') || '',
            assessmentMethod: assessmentMethod || formDataRaw.get('deliveryMethod') || '',
            duration: formDataRaw.get('duration') || '',
            maxScore: formDataRaw.get('maxScore') || '',
            passingScore: formDataRaw.get('passingScore') || '',
            expiry: formDataRaw.get('expiry') || '0'
          };

          if (!payload.assessmentLocation || !payload.assessmentMethod) {
            setAlertMessage('Please select both Delivery Location and Assessment Method.');
            setAlertType('error');
            setShowAlert(true);
            return;
          }

          const formData = new URLSearchParams(payload);
          
          try {
            console.log('Submitting assessment creation...');
            console.log('Form data:', payload);
            
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
                setAlertMessage('Error creating assessment: ' + (errorData.error || errorData.errors || errorData.message || 'Unknown error'));
                setAlertType('error');
                setShowAlert(true);
              }
              closeDialog('createAssessment');
            }
          } catch (error) {
            console.error('Assessment creation error:', error);
            setAlertMessage('An error occurred while creating the assessment. Please try again.');
            setAlertType('error');
            setShowAlert(true);
            closeDialog('createAssessment');
          }
        }} id="createAssessmentForm">
          <IcTextField
            name="courseName"
            label="Assessment Name"
            type="text"
            minCharacters={4}
            maxCharcters={64}
            fullWidth="full-width"
            required
          />
          <IcTextField
            name="assessmentDescription"
            label="Assessment Description"
            rows={3}
            type="text"
            minCharacters={16}
            maxCharcters={256}
            fullWidth="full-width"
            required
          />
          <IcTextField
            name="duration"
            label="Duration (days)"
            placeholder="Insert number of days in increments of 0.125"
            type="number"
            step="0.125"
            min="0.125"
            fullWidth="full-width"
            helperText="Increments of 0.125 Days (1 hour)"
            required
          />
          <IcRadioGroup name='deliveryMethod' label="Assessment Method" orientation="horizontal" required>
            <IcRadioOption value="Online" label="Online" />
            <IcRadioOption value="Written" label="Written" />
            <IcRadioOption value="Practical" label="Practical" />
            <IcRadioOption value="Interview" label="Interview" />
          </IcRadioGroup>
          <IcRadioGroup name='deliveryLocation' label="Delivery Location" orientation="horizontal" required>
            <IcRadioOption value="High" label="High" />
            <IcRadioOption value="Low" label="Low" />
          </IcRadioGroup>
          <IcTextField name="maxScore" label="Maximum Score" type="number" min="1" fullWidth="full-width" required />
          <IcTextField name="passingScore" label="Passing Score" type="number" min="1" fullWidth="full-width" required />
          <IcTextField name="expiry" label="Expiry (Full Years or 0 when no expiry)" type="number" min="0" fullWidth="full-width" required />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton
              variant="tertiary"
              type="button"
              onClick={() => closeDialog('createAssessment')}
            >
              Cancel
            </IcButton>
            <IcButton variant="primary" type="submit" form="createAssessmentForm">Create Assessment</IcButton>
          </div>
        </form>
      </IcDialog>

    </>
  );
}

export default Assessments;