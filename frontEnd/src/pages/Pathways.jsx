import React, { useEffect, useState } from "react";
import { IcAccordion, IcDialog, IcCardVertical, IcButton, IcStatusTag, IcSectionContainer, IcHero, IcTextField, IcAlert } from "@ukic/react";
import { mdiNavigationVariant, mdiCheckDecagramOutline, mdiBook, mdiPuzzleOutline } from "@mdi/js";
import { cardContainer } from "../styles/containerLayout";

import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { useDialogs } from "../commonFunctions/commonDialogHandlers";
import { fetchData } from "../commonFunctions/api";
import { handleSearch, clearSearch, getSearchResults } from "../commonFunctions/commonUtilities";


function Pathways() {
  
  const [pathwaysList, setPathwaysList] = useState([]);
  const [contents, setContents] = useState([]);
  const [user, setUser] = useState([]);
  const [isEnrolledOnPathwayList, setIsEnrolledOnPathwayList] = useState([]);
  const [isPathwayManagerList, setIsPathwayManagerList] = useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [searchSelection, setSearchSelection] = useState("");
  const { isDialogOpen, openDialog, closeDialog } = useDialogs();

  useEffect(() => {
    fetchData("/pathways")
      .then((data) => {
        console.log('Pathways data loaded:', data);
        if (data) {
          const { pathwaysList, contents, user, isEnrolledOnPathwayList, isPathwayManagerList } = data;
          console.log('Pathways list:', pathwaysList);
          setPathwaysList(pathwaysList || []);
          setContents(contents || []);
          setUser(user || []);
          setIsEnrolledOnPathwayList(isEnrolledOnPathwayList || []);
          setIsPathwayManagerList(isPathwayManagerList || []);
        } else {
          console.error('No data received from pathways API');
        }
      })
      .catch(err => {
        console.error('Error loading pathways:', err);
        // Set default values on error
        setPathwaysList([]);
        setContents([]);
        setUser([]);
        setIsEnrolledOnPathwayList([]);
        setIsPathwayManagerList([]);
      });
  }, []);

  console.log(user)

  const courseAssessmentExperienceOptions = [];
  if (pathwaysList && pathwaysList.length > 0) {
    for (var i = 0; i < pathwaysList.length; i++) {
      if (courseAssessmentExperienceOptions.includes(pathwaysList[i].pathwayName) == false) {
        courseAssessmentExperienceOptions.push({ label: pathwaysList[i].pathwayName, value: pathwaysList[i].pathwayName })
      }
    }
  }

  const searchMatch = getSearchResults(pathwaysList || [], searchSelection, "pathwayName", "pathwayDescription");

  const handleEnrollPathway = async (pathwayID) => {
    try {
      console.log('Enrolling in pathway:', pathwayID);
      console.log('Available cookies:', document.cookie);
      
      const response = await fetch('http://localhost:5000/pathways/enrolPathway', {
        method: 'POST',
        credentials: 'include', // Important: include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrolPathwayID: pathwayID
        })
      });
      
      console.log('Enrollment request sent. Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const result = await response.json();
      console.log('Enrollment response:', result);
      
      if (response.ok) {
        console.log('Enrollment successful');
        setAlertMessage('Successfully enrolled in pathway!');
        setAlertType('success');
        setAlertVisible(true);
        
        // Reload the pathways data to update enrollment status
        try {
          const data = await fetchData("/pathways");
          if (data) {
            setPathwaysList(data.pathwaysList || []);
            setContents(data.contents || []);
            setUser(data.user || []);
            setIsEnrolledOnPathwayList(data.isEnrolledOnPathwayList || []);
            setIsPathwayManagerList(data.isPathwayManagerList || []);
          }
        } catch (err) {
          console.error('Failed to reload pathways after enrollment:', err);
        }
        
        setTimeout(() => setAlertVisible(false), 3000);
      } else {
        console.error('Enrollment failed:', result);
        setAlertMessage(`Failed to enroll: ${result.error || 'Unknown error'}`);
        setAlertType('warning');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
      }
    } catch (error) {
      console.error('Error enrolling in pathway:', error);
      setAlertMessage('Failed to enroll in pathway. Please try again.');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    }
  };

  const filteredPathways = pathwaysList;

  return (
    <>
      <Header />
      <IcHero
        heading="Available Pathways"
        secondaryHeading={`${searchMatch.length} Pathways are available`}
        aligned="full-width"
      >
        <IcTextField slot="interaction"
          hideLabel
          placeholder="Search pathways by name or description"
          value={searchSelection}
          onIcInput={(ev) => handleSearch(ev.detail.value, setSearchSelection)}
          onIcClear={() => clearSearch(setSearchSelection)}
          style={{ minWidth: '250px' }}
        />

        <IcButton onClick={() => openDialog('createPathway')} slot="interaction" variant="primary"
        >Create Pathway
          <SlottedSVGTemplate mdiIcon={mdiNavigationVariant} />
        </IcButton>

      </IcHero>
      
      {alertVisible && (
        <IcAlert
          variant={alertType === 'success' ? 'success' : alertType === 'info' ? 'info' : 'error'}
          heading={alertType === 'success' ? 'Success' : alertType === 'info' ? 'Info' : 'Error'}
          message={alertMessage}
          dismissible={true}
          onIcDismiss={() => setAlertVisible(false)}
          style={{ margin: '16px', marginBottom: '24px' }}
        />
      )}
      
      <div>
        <div>
          {searchMatch.map((pl, i) =>
            <IcSectionContainer type="full-width" >
              <IcAccordion heading={pl.pathwayName} key={i}>
              <SlottedSVGTemplate mdiIcon={mdiNavigationVariant} />
                <IcSectionContainer>
                  <div>
                    <IcCardVertical 
                      style={cardContainer}
                      heading={pl.pathwayDescription}
                      subheading={"Pathway Manager: " + (pl.manager ? pl.manager.username : 'Unknown')}
                    >
                      {(() => {
                        if (isEnrolledOnPathwayList.includes(pl.pathwayID) === true) {
                          return <IcStatusTag status="neutral" label="Enrolled" variant="filled" slot="adornment" size="small" />
                        } else {
                          return <div slot="interaction-controls">
                            <IcButton variant="primary" onClick={() => handleEnrollPathway(pl.pathwayID)}>Enrol</IcButton>
                          </div>
                        }
                      })()}
                    </IcCardVertical>
                  </div>
                </IcSectionContainer>
                {contents.map((c, j) => {
                  if (c.pathwayID == pl.pathwayID) {
                    if (c.courseID) {
                      return (
                        <IcCardVertical fullWidth="true" style={cardContainer} key={j} heading={c.courses?.courseName || 'Course'} subheading={`${c.courses?.delivery_location || 'N/A'} | ${c.courses?.delivery_method || 'N/A'} | ${c.courses?.duration || 'N/A'} Day(s) | Course Manager: ${c.courses?.manager?.username || 'Unknown'} (${c.courses?.manager?.role || 'Unknown'})`} message={c.courses?.description || 'No description available'}>
                          <SlottedSVGTemplate mdiIcon={mdiBook} />
                        </IcCardVertical>);
                    } else if (c.assessmentID) {
                      const expiry = c.assessments?.expiry ? `${c.assessments.expiry}` : 'N/A'
                      return (
                        <IcCardVertical fullWidth="true" style={cardContainer} key={j} heading={c.assessments?.name || 'Assessment'} subheading={`${c.assessments?.delivery_location || 'N/A'} | ${c.assessments?.delivery_method || 'N/A'} | ${c.assessments?.duration || 'N/A'} Day(s) | Max Score: ${c.assessments?.max_score || 'N/A'} | Passing Score: ${c.assessments?.passing_score || 'N/A'} | Expiry - Year(s): ${expiry} | Assessment Manager: ${c.assessments?.manager?.username || 'Unknown'} (${c.assessments?.manager?.role || 'Unknown'})`} message={c.assessments?.description || 'No description available'}>
                          <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
                        </IcCardVertical>);
                    } else if (c.experience_templateID) {
                      return (
                        <IcCardVertical fullWidth="true" style={cardContainer} key={j} heading={c.experience_templates?.experienceDescription || 'Experience Template'} subheading={`${c.experience_templates?.minimumDuration || 'N/A'} Day(s) Minimum Duration `}>
                          <SlottedSVGTemplate mdiIcon={mdiPuzzleOutline} />
                        </IcCardVertical>);
                    }
                  }
                })}
              </IcAccordion>
            </IcSectionContainer>
          )}
        </div>
        <div>
        </div>
      </div>
      <Footer />

      <IcDialog
        size="large"
        open={isDialogOpen('createPathway')}
        closeOnBackdropClick={false}
        heading="Create a new Pathway that you will manage"
        disable-height-constraint='true'
        buttons="false"
        onIcDialogClosed={() => closeDialog('createPathway')}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          
          const formData = new FormData(e.target);
          const pathwayName = formData.get('pathwayName');
          const pathwayDescription = formData.get('pathwayDescription');
          
          console.log('Form submitted!');
          console.log('Pathway Name:', pathwayName);
          console.log('Pathway Description:', pathwayDescription);
          
          try {
            console.log('Starting pathway creation request...');
            
            const response = await fetch('http://localhost:5000/pathways/createPathway', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pathwayName,
                pathwayDescription
              })
            });
            
            console.log('Response received. Status:', response.status);
            console.log('Response headers:', response.headers);
            
            const result = await response.json();
            console.log('Response data:', result);
            
            if (response.ok) {
              console.log('Pathway created successfully');
              setAlertMessage('Pathway created successfully!');
              setAlertType('success');
              setAlertVisible(true);
              closeDialog('createPathway');
              
              // Reload the pathways data instead of the entire page
              try {
                const data = await fetchData("/pathways");
                if (data) {
                  setPathwaysList(data.pathwaysList || []);
                  setContents(data.contents || []);
                  setUser(data.user || []);
                  setIsEnrolledOnPathwayList(data.isEnrolledOnPathwayList || []);
                  setIsPathwayManagerList(data.isPathwayManagerList || []);
                } else {
                  console.error('No data received during refresh');
                }
              } catch (err) {
                console.error('Failed to reload pathways:', err);
                window.location.reload(); // Fallback to full page reload
              }
              
              setTimeout(() => setAlertVisible(false), 3000);
            } else {
              console.error('Pathway creation failed:', result);
              setAlertMessage(`Failed to create pathway: ${result.error || result.errors || 'Unknown error'}`);
              setAlertType('warning');
              setAlertVisible(true);
              setTimeout(() => setAlertVisible(false), 5000);
            }
          } catch (error) {
            console.error('Error creating pathway:', error);
            setAlertMessage('Failed to create pathway. Please try again.');
            setAlertType('warning');
            setAlertVisible(true);
            setTimeout(() => setAlertVisible(false), 5000);
          }
        }} id="createPathwayForm">
          <IcTextField name="pathwayName" style={cardContainer} label="Pathway Name" type="text" minCharacters={4} maxCharcters={64} fullWidth="full-width" required />
          <IcTextField name="pathwayDescription" style={cardContainer} label="Pathway Description" rows={3} type="text" minCharacters={16} maxCharcters={256} fullWidth="full-width" required />
          <br />
          <IcButton variant="primary" type="submit" form="createPathwayForm">Create Pathway</IcButton>
        </form>
      </IcDialog >

    </>
  )
};

export default Pathways;
