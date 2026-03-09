import React, { useEffect, useState } from "react";
import { IcButton, IcCard, IcStatusTag, IcTextField, IcTypography, IcAlert, IcHero } from "@ukic/react";
import { mdiCheckCircle, mdiToggleSwitch, mdiToggleSwitchOff } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";
import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { fetchRefereeItems, updateItemStatus } from "../commonFunctions/commonFeedbackUtilities";
import { getStatusDisplay, canUpdateStatus } from "../commonFunctions/statusUtilities";
import { fetchData } from "../commonFunctions/api";

const AssessmentScoring = () => {
  const [refereeItems, setRefereeItems] = useState({ assessments: [] });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempScore, setTempScore] = useState('');
  // Remove accreditationDate state - using completionDate instead
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showOnlyAwaiting, setShowOnlyAwaiting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const userData = await fetchData("/Auth/user");
      setCurrentUser(userData);
      
      if (!userData?.employeeID) {
        console.warn('No current user or employeeID available');
        return;
      }
      
      const data = await fetchRefereeItems(userData.employeeID);
      setRefereeItems({
        assessments: Array.isArray(data?.assessments) ? data.assessments : []
      });
    } catch (error) {
      console.error('Failed to load assessments:', error);
      setRefereeItems({ assessments: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItemId(item.employee_assessmentID);
    setTempScore('');
    // Remove accreditationDate reset - using completionDate instead
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempScore('');
    // Remove accreditationDate reset - using completionDate instead
  };

  const handleSubmitUpdate = async (item) => {
    try {
      setSubmitting(true);
      
      let updateData = {};
      if (tempScore && !isNaN(parseInt(tempScore))) {
        updateData.score = parseInt(tempScore);
        const score = parseInt(tempScore);
        const passingScore = item.passing_score || 0;
        const isPassing = score >= passingScore;
        updateData.newStatus = isPassing ? 'Passed' : 'Attempted';
        
        // Remove accreditationDate logic - using completionDate instead
        // Remove accreditationDate logic - using completionDate instead
      }
      
      await updateItemStatus('assessment', item.employee_assessmentID, updateData);
      
      const score = updateData.score;
      const status = updateData.newStatus;
      setAlertMessage(`${item.username} scored ${score} and ${status === 'Passed' ? 'passed' : 'did not pass'} the assessment`);
      setAlertType('success');
      setAlertVisible(true);
      
      setTimeout(() => {
        setAlertVisible(false);
      }, 3000);
      
      await loadItems();
      handleCancelEdit();
      
    } catch (error) {
      console.error('Failed to update assessment:', error);
      setAlertMessage(`Failed to update assessment: ${error.message || 'Please try again.'}`);
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
    return <IcTypography variant="body">Loading assessments...</IcTypography>;
  }

  // Calculate counts
  const allItems = refereeItems.assessments;
  const awaitingItems = allItems.filter(item => {
    const status = getStatusDisplay(item);
    return status?.status !== 'Passed';
  });
  
  // Apply filtering
  const currentItems = showOnlyAwaiting ? awaitingItems : allItems;

  return (
    <>
      <Header />
      <IcHero
        heading="Assessment Scoring"
        subheading="Score assessments and manage accreditation for employees"
        secondaryHeading={`You have ${awaitingItems.length} assessments awaiting scoring`}
        aligned="full-width">
      </IcHero>
      
      <div style={{ textAlign: 'center', marginBottom: '16px', color: '#666' }}>
        <IcTypography variant="body">
          You have {allItems.length} total assessments
        </IcTypography>
      </div>
      
      <div>
        {alertVisible && (
          <IcAlert
            variant={alertType}
            heading={alertType === 'success' ? 'Score Updated' : 'Update Failed'}
            message={alertMessage}
            dismissible={true}
            onIcDismiss={() => setAlertVisible(false)}
            style={{ marginBottom: '16px' }}
          />
        )}
        
        <div style={divContainer}>
          <IcButton 
            variant={showOnlyAwaiting ? "primary" : "secondary"}
            onClick={() => setShowOnlyAwaiting(!showOnlyAwaiting)}
            style={{ marginBottom: '16px' }}
          >
            <SlottedSVGTemplate mdiIcon={showOnlyAwaiting ? mdiToggleSwitch : mdiToggleSwitchOff} />
            Show only assessments awaiting scoring
          </IcButton>
        </div>

        {currentItems.length === 0 ? (
          <IcTypography variant="body">No assessments requiring your attention.</IcTypography>
        ) : (
          currentItems.map((item, index) => {
            const status = getStatusDisplay(item);
            const canUpdate = canUpdateStatus(item, currentUser);
            const safeRecordDate = item?.recordDate ? 
              (typeof item.recordDate === 'string' ? item.recordDate.substr(0, 10) : new Date(item.recordDate).toISOString().substr(0, 10)) : 
              'N/A';

            return (
              <div key={index} style={divContainer}>
                <IcCard 
                  style={cardContainer} 
                  heading={item?.name || 'Assessment Name Not Available'}
                  subheading={`Employee: ${item?.username || 'N/A'} | Max Score: ${item?.max_score || 0} | Passing: ${item?.passing_score || 0} | Recorded: ${safeRecordDate}`}
                  message={item?.description || 'No description available'}
                >
                  <SlottedSVGTemplate mdiIcon={mdiCheckCircle} />
                  <IcStatusTag 
                    slot="interaction-button" 
                    label={status?.status || 'Unknown'} 
                    status={status?.color || 'neutral'} 
                  />
                  
                  {item.scoreAchieved !== null && (
                    <IcTypography slot="adornment" variant="subtitle-small">
                      Score Achieved: {item.scoreAchieved}
                    </IcTypography>
                  )}

                  {canUpdate && (
                    <div slot="interaction-controls" style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      gap: "12px", 
                      alignItems: "flex-start",
                      width: "100%"
                    }}>
                      {editingItemId === item.employee_assessmentID ? (
                        <>
                          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <IcTextField
                              label={`Score (Max: ${item.max_score || 100})`}
                              type="number"
                              min="0"
                              max={item.max_score || 100}
                              value={tempScore}
                              onIcInput={(e) => setTempScore(e.detail.value)}
                              style={{ 
                                width: '200px',
                                maxWidth: '200px'
                              }}
                            />
                            <IcTextField
                              label="Accreditation Date (YYYY-MM-DD)"
                              type="date"
                              // Remove accreditationDate fields - using completionDate instead
                              style={{ 
                                width: '200px',
                                maxWidth: '200px'
                              }}
                            />
                          </div>
                          <div style={{ 
                            display: "flex", 
                            gap: "12px",
                            alignItems: "center"
                          }}>
                            <IcButton
                              variant="primary"
                              onClick={() => handleSubmitUpdate(item)}
                              disabled={submitting || !tempScore}
                            >
                              Confirm
                            </IcButton>
                            <IcButton
                              variant="tertiary"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </IcButton>
                          </div>
                        </>
                      ) : (
                        <IcButton 
                          variant="primary"
                          onClick={() => handleStartEdit(item)}
                        >
                          Record Score
                          <SlottedSVGTemplate mdiIcon={mdiCheckCircle} />
                        </IcButton>
                      )}
                    </div>
                  )}
                </IcCard>
              </div>
            );
          })
        )}
      </div>
      
      <Footer />
    </>
  );
};

export default AssessmentScoring;