import { useEffect, useState } from "react";
import { IcButton, IcCard, IcChip, IcDialog, IcHero, IcPageHeader, IcRadioGroup, IcRadioOption, IcSelect, IcStatusTag, IcTextField, IcTypography, IcAlert } from "@ukic/react";
import { mdiCommentQuoteOutline, mdiCommentQuote, mdiNotebook, mdiCheckCircle, mdiSignDirection, mdiPuzzle, mdiPuzzlePlusOutline } from "@mdi/js";
import { divContainer, cardContainer } from "../styles/containerLayout";

import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import { useDialogs } from "../commonFunctions/commonDialogHandlers";
import { fetchData } from "../commonFunctions/api";
import { hasExpired, useSelectValue } from "../commonFunctions/commonUtilities";
import { recordStats, courseRecordStats, getStandardizedStatusLabel, getEnrolledPathwaysList, getSelectedPathwayList } from "../commonFunctions/recordUtilities";
import { getStatusDisplay } from "../commonFunctions/statusUtilities";

function Record() {

  // Utility function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'No date available';
    if (typeof dateString === 'string') {
      return dateString.substr(0, 10);
    }
    // If it's a Date object, convert to string first
    return new Date(dateString).toISOString().substr(0, 10);
  };

  const { isDialogOpen, openDialog, closeDialog, selectedExperienceID } = useDialogs();
  const { selectedValue, handleSelectChange } = useSelectValue();
  const [fullRecord, setFullRecord] = useState([]);
  const [enrolledPathways, setEnrolledPathways] = useState([]);
  const [refereesArray, setRefereesArray] = useState([]);
  const [myPathwayDetails, setMyPathwayDetails] = useState([]);
  const [selectedPathwayID, setSelectedPathwayID] = useState(null); 
  const [banner, setBanner] = useState(null); 
  const [radioSelected, setRadioSelected] = useState("false");
  const [userInfo, setUserInfo] = useState(null); 
  const [submittingExperience, setSubmittingExperience] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  

  useEffect(() => {
    fetchData("/record")
      .then(({ fullRecord }) => setFullRecord(fullRecord))
      .catch(err => console.error(err));

    fetchData("/record/enrolledPathways")
      .then(({ enrolledPathways }) => setEnrolledPathways(enrolledPathways))
      .catch(err => console.error(err));

    fetchData("/record/referees")
      .then(({ refereesArray }) => setRefereesArray(refereesArray))
      .catch(err => console.error(err));

    fetchData("/record/myPathwayDetails")
      .then(({ myPathwayDetails }) => setMyPathwayDetails(myPathwayDetails))
      .catch(err => console.error(err));

    fetchData("/Auth/user")
      .then((userData) => setUserInfo(userData))
      .catch(err => console.error(err));
  }, []);

  const { totalItems, totalDuration, statsString, expiredItems } = recordStats(fullRecord);
  const { courseStatsString } = courseRecordStats(fullRecord, getStatusDisplay);

  const handleRadioChange = (ev) => {
    setSelectedPathwayID(ev.detail.value);
    closeDialog("pathwayFilter");
    for (let i = 0; i < enrolledPathways.length; i++) {
      if (enrolledPathways[i]["pathwayID"] == ev.detail.value) {
        setBanner(enrolledPathways[i])
      }
    }
  };

  const handleSubmitExperience = async (event) => {
    event.preventDefault();
    
    try {
      setSubmittingExperience(true);
      
      const formData = new FormData(event.target);
      const experienceData = {
        experienceDate: formData.get('experienceDate'),
        experienceDuration: parseFloat(formData.get('experienceDuration')),
        experienceDescription: formData.get('experienceDescription'),
        experienceYourFeedback: formData.get('experienceYourFeedback'),
        experienceReferee: selectedValue
      };
      
      console.log('Submitting experience data:', experienceData);
      
      const response = await fetch('http://localhost:5000/Record/recordExperience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(experienceData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Experience recorded successfully:', result);
        setAlertMessage('Experience recorded successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        closeDialog("recordExperience");
        // Refresh the record data to show the new experience
        const { fullRecord } = await fetchData("/record");
        setFullRecord(fullRecord);
        // Reset form
        event.target.reset();
      } else {
        console.error('Failed to record experience:', result);
        setAlertMessage(`Failed to record experience: ${result.errors || 'Please try again.'}`);
        setAlertType('error');
        setAlertVisible(true);
        setTimeout(() => {
          setAlertVisible(false);
        }, 5000);
      }
      
    } catch (error) {
      console.error('Error submitting experience:', error);
      setAlertMessage(`Error submitting experience: ${error.message || 'Please try again.'}`);
      setAlertType('error');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmittingExperience(false);
    }
  };

  const handleSubmitFeedback = async (event) => {
    event.preventDefault();
    
    try {
      setSubmittingFeedback(true);
      
      const formData = new FormData(event.target);
      const feedbackData = {
        recordOwnFeedback: formData.get('recordOwnFeedback'),
        experienceID: selectedExperienceID
      };
      
      console.log('Submitting feedback data:', feedbackData);
      
      const response = await fetch('http://localhost:5000/Record/recordOwnFeedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(feedbackData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Feedback recorded successfully:', result);
        setAlertMessage('Feedback submitted successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        closeDialog("recordOwnFeedback");
        // Refresh the record data to show the updated feedback
        const { fullRecord } = await fetchData("/record");
        setFullRecord(fullRecord);
        // Reset form
        event.target.reset();
      } else {
        console.error('Failed to submit feedback:', result);
        setAlertMessage(`Failed to submit feedback: ${result.errors || 'Please try again.'}`);
        setAlertType('error');
        setAlertVisible(true);
        setTimeout(() => {
          setAlertVisible(false);
        }, 5000);
      }
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setAlertMessage(`Error submitting feedback: ${error.message || 'Please try again.'}`);
      setAlertType('error');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmittingFeedback(false);
    }
  };
  
  let selectedPathwayList = getSelectedPathwayList(fullRecord, myPathwayDetails, selectedPathwayID); 
  let enrolledPathwaysList = getEnrolledPathwaysList(enrolledPathways).map(
    pathway => <IcRadioOption key={pathway.value} value={pathway.value} label={pathway.label} /> ); 
  let dataSubset = fullRecord; 
  if (selectedPathwayID !== null) {
    dataSubset = selectedPathwayList
  };
  
  return (
    <>
      <Header />
      <IcHero heading={`Your Record${userInfo?.username ? `, ${userInfo.username}` : ''}`} aligned="full-width" secondaryHeading={courseStatsString} secondarySubheading={"Learning Progress - Courses, Assessments & Experiences"} >
        <IcButton onClick={() => openDialog("pathwayFilter")} slot="interaction" variant="secondary">
          View by Pathway
          <SlottedSVGTemplate mdiIcon={mdiSignDirection} />
        </IcButton>
        <IcButton onClick={() => openDialog('recordExperience')} slot="interaction" variant="primary">
          Record Experience
          <SlottedSVGTemplate mdiIcon={mdiPuzzlePlusOutline} />
        </IcButton>
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

      {banner != null ? (
        <IcPageHeader
          size="small"
          sticky="true"
          heading={banner["pathwayDescription"]}
        >
        <IcChip slot="heading-adornment" dismissible="true" label={banner["pathwayName"]}  onIcDismiss={() => setBanner(null)}/>
        </IcPageHeader>
      ) : (<></>)}

      {dataSubset.map((d, i) => {
        if (d.courseID) {
          const statusInfo = getStatusDisplay(d);
          
          console.log(`Course "${d.courseName}":`, {
            currentStatus: d.currentStatus,
            statusInfo: statusInfo,
            recordDate: d.recordDate
          });
          
          // Add safe fallbacks for status display  
          const safeStatus = getStandardizedStatusLabel(statusInfo?.status) || 'Unknown';
          const safeColor = statusInfo?.color || 'neutral';
          
          console.log(`  -> Final: label="${safeStatus}", color="${safeColor}"`);
          
          return (
            <div style={divContainer}>
              <div>
                <IcCard key={i} style={cardContainer} heading={d.courseName} subheading={`${d.courseDeliveryLocation} | ${d.courseDeliveryMethod} | ${d.duration} Day(s) | Course Manager: ${d.username} (${d.role})`} message={d.courseDescription}>
                  <SlottedSVGTemplate mdiIcon={mdiNotebook} />
                  <IcTypography slot="adornment" variant="subtitle-small">Status as of {formatDate(d.recordDate)}</IcTypography>
                  <IcStatusTag label={safeStatus} status={safeColor} slot="interaction-button" />
                </IcCard>
              </div>
              <div></div>
            </div>
          );
        } else if (d.assessmentID) {
          const expiry = d.expiry || "None"
          const scoreAchieved = d.scoreAchieved || '"Not attempted"'
          const statusInfo = getStatusDisplay(d);
          
          console.log(`Assessment "${d.name}":`, {
            scoreAchieved: d.scoreAchieved,
            passingScore: d.passing_score,
            currentStatus: d.currentStatus,
            statusInfo: statusInfo,
            expiry: expiry,
            recordDate: d.recordDate
          });
          
          // Add safe fallbacks for status display
          const safeStatus = getStandardizedStatusLabel(statusInfo?.status) || 'Unknown';
          const safeColor = statusInfo?.color || 'neutral';
          
          console.log(`  -> Final: label="${safeStatus}", color="${safeColor}"`);
          
          return (
            <div style={divContainer}>
              <div>
                <IcCard fullWidth="true" key={i} style={cardContainer} heading={d.name} subheading={`${d.delivery_location} | ${d.delivery_method} | ${d.duration} Day(s) | Max Score: ${d.max_score} | Passing Score: ${d.passing_score} | Expiry - Year(s): ${expiry} | Assessment Manager: ${d.username} (${d.role})`} message={d.description}>
                  <SlottedSVGTemplate mdiIcon={mdiCheckCircle} />
                  <IcTypography slot="adornment" variant="subtitle-small">Details as of  {formatDate(d.recordDate)}</IcTypography>
                  <IcTypography slot="adornment" variant="subtitle-small">Score Achieved: {scoreAchieved}</IcTypography>
                  <IcStatusTag label={safeStatus} status={safeColor} slot="interaction-button" />
                </IcCard>
              </div>
              <div></div>
            </div>
          );
        } else if (d.employee_experienceID) {
          const employeeText = d.employeeText || "Describe experience (256 character limit)"
          const refereeUsername = d.refereeUsername || "Select Referee"
          const refereeText = d.refereeText || "Awaiting Referee's feedback"
          const experinceID = d.employee_experienceID
          const statusInfo = getStatusDisplay(d);
          
          // Add safe fallbacks for status display
          const safeStatus = getStandardizedStatusLabel(statusInfo?.status) || 'Unknown';
          const safeColor = statusInfo?.color || 'neutral';
          
          return (
            <div style={divContainer}>
              <div>
                <IcCard key={i} style={cardContainer} heading={d.experienceDescription} subheading={+ d.duration + " (days) |  Details as of  " + formatDate(d.recordDate)}>
                  <SlottedSVGTemplate mdiIcon={mdiPuzzle} />
                  <IcStatusTag slot="interaction-button" label={safeStatus} status={safeColor} />
                  
                  {d.employeeText == null ? (
                    <>
                      <div slot="interaction-controls" style={{ display: "flex", gap: "16px" }}>
                        <IcButton onClick={() => openDialog("recordOwnFeedback",experinceID)} variant="primary">Describe Your Experience
                          <SlottedSVGTemplate mdiIcon={mdiCommentQuote} />
                        </IcButton>
                      </div>
                    </>
                  ) : employeeText == d.employeeText && refereeUsername == "Select Referee" ? (
                    <>
                      <IcTypography slot="adornment" variant="label-uppercase">Your feedback on your experience</IcTypography>
                      <IcTypography slot="adornment">{d.employeeText}</IcTypography>
                      <div slot="interaction-controls" style={{ display: "flex", gap: "16px" }}>
                        <form action="http://127.0.0.1:5000/record/requestReferee" method="POST" >
                          <IcSelect placeholder="start typing name or email"
                            onIcChange={handleSelectChange}
                            options={refereesArray}
                            showClearButton
                            searchable
                            fullWidth="true"
                            value={selectedValue}
                          />
                          <input type="hidden" name="refereeRequest" value={[selectedValue, d.employee_experienceID]} />
                          <IcButton variant="primary" type="submit"
                            style={{
                              marginRight: "var(--ic-space-md)",
                              marginTop: "var(--ic-space-lg)",
                            }}>Request Referee</IcButton>
                        </form>
                      </div>
                    </>
                  ) : refereeText == "Awaiting Referee's feedback" ? (
                    <>
                      <IcTypography slot="adornment" variant="label-uppercase">Your feedback on your experience</IcTypography>
                      <IcTypography slot="adornment">{d.employeeText}</IcTypography>
                    </>
                  ) : // Completed
                    <>
                      <IcTypography slot="adornment" variant="label-uppercase">Your feedback on your experience</IcTypography>
                      <IcTypography slot="adornment">{d.employeeText}</IcTypography>
                      <IcTypography slot="adornment" variant="label-uppercase">{"Referee's feedback on your experience"}</IcTypography>
                      <IcTypography slot="adornment">{d.refereeText}</IcTypography>
                    </>
                  }
                </IcCard>
              </div>
              <div>
              </div>
            </div >
          );
        }
      })
      }

      <Footer />

      <IcDialog
      size="large"
      open={isDialogOpen("recordExperience")}
      closeOnBackdropClick={false}
      heading="Record your experience here."
      disable-height-constraint='true'
      buttons="false"
      onIcDialogClosed={() => closeDialog("recordExperience")}
    >
      <IcTypography>Recommend using STAR method (SITUATION, TASK, ACTION & RESULT)</IcTypography>
      <form onSubmit={handleSubmitExperience} id="recordExperienceForm">
        <IcTextField name="experienceDate" style={cardContainer} label="Date of experience" placeholder="YYYY-MM-DD" type="date" fullWidth="full-width" required />
        <IcTextField name="experienceDuration" style={cardContainer} label="Duration in Days" placeholder="Insert number of days in increments of 0.125" type="number" min="0.125" step="0.125" fullWidth="full-width" helperText="Increments of 0.125 Days (1 hour)" required />
        <IcTextField name="experienceDescription" style={cardContainer} rows={3} label="Experience Description" placeholder="Describe the experience here (SITUATION & TASK)" type="text" minCharacters="4" maxLength="256" fullWidth="full-width" required />
        <br />
        <IcTextField name="experienceYourFeedback" style={cardContainer} rows={3} label="Your feedback on experience" placeholder="Describe how you think it went here (ACTION & RESULT)." type="text" minCharacters="4" maxLength="256" fullWidth="full-width" />
        <IcSelect 
          placeholder="start typing name or email" 
          onIcChange={handleSelectChange}
          options={refereesArray}
          label="Select a referee"
          showClearButton
          searchable
          style={{ width: '100%' }}
        />
        <br />
        <IcButton 
          variant="primary" 
          type="submit" 
          form="recordExperienceForm" 
          disabled={submittingExperience}
        >
          {submittingExperience ? 'Recording...' : 'Record Experience'}
        </IcButton>
      </form>
    </IcDialog>

    <IcDialog
      size="large"
      open={isDialogOpen("pathwayFilter")}
      closeOnBackdropClick={false}
      heading="Filter by Pathway"
      buttons="false"
      disable-height-constraint="true"
      selected={radioSelected}
      onIcDialogClosed={() => closeDialog("pathwayFilter")}
    >
      <IcRadioGroup name='pathwayFilter' label="Your Pathway" onIcChange={handleRadioChange}>
        {enrolledPathwaysList}
      </IcRadioGroup>
    </IcDialog>

    <IcDialog
      size="large"
      open={isDialogOpen("recordOwnFeedback")}
      closeOnBackdropClick={false}
      heading="Record your experience here."
      disable-height-constraint='true'
      buttons="false"
      onIcDialogClosed={() => closeDialog("recordOwnFeedback")}
    >
      <form onSubmit={handleSubmitFeedback} id="recordOwnFeedback">
        <IcTextField name="recordOwnFeedback" style={cardContainer} rows={3} label="Remember to be SPECIFIC, CLEAR and RELEVANT " placeholder="Describe how you think it went here (ACTION & RESULT)." type="text" minCharacters="4" maxLength="256" fullWidth="full-width" required />
        <br />
        <IcButton 
          variant="primary" 
          type="submit" 
          form="recordOwnFeedback" 
          disabled={submittingFeedback}
        >
          {submittingFeedback ? 'Submitting...' : 'Submit'}
          <SlottedSVGTemplate mdiIcon={mdiCommentQuoteOutline} />
        </IcButton>
      </form>
    </IcDialog>
    </>
  )
};

export default Record;