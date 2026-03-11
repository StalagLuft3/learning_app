import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcStatusTag, IcTextField, IcTypography, IcTab, IcTabContext, IcTabGroup, IcTabPanel, IcSelect, IcAlert, IcToggleButton } from "@ukic/react";
import { mdiAccountCheck, mdiPuzzleOutline, mdiCheckDecagramOutline, mdiCommentQuoteOutline, mdiToggleSwitch, mdiToggleSwitchOff } from "@mdi/js";
import SlottedSVGTemplate from "./slottedSVGTemplate";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { fetchRefereeItems, updateItemStatus } from "../commonFunctions/commonFeedbackUtilities";
import { getStatusDisplay, canUpdateStatus } from "../commonFunctions/statusUtilities";

const RefereeReviewPanel = ({ currentUser, itemType }) => {
  const [refereeItems, setRefereeItems] = useState({ experiences: [], courseEnrollments: [], assessments: [] });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempScore, setTempScore] = useState('');
  const [tempFeedback, setTempFeedback] = useState('');
  // Remove accreditationDate state - using completionDate instead
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showOnlyAwaiting, setShowOnlyAwaiting] = useState(false);

  useEffect(() => {
    loadRefereeItems();
  }, [currentUser]);

  const loadRefereeItems = async () => {
    try {
      setLoading(true);
      console.log('Loading referee items for user:', currentUser?.employeeID);
      
      if (!currentUser?.employeeID) {
        console.warn('No current user or employeeID available');
        return;
      }
      
      const data = await fetchRefereeItems(currentUser.employeeID);
      console.log('Referee items loaded:', data);
      
      // Ensure data structure is correct
      setRefereeItems({
        experiences: Array.isArray(data?.experiences) ? data.experiences : [],
        courseEnrollments: Array.isArray(data?.courseEnrollments) ? data.courseEnrollments : [],
        assessments: Array.isArray(data?.assessments) ? data.assessments : []
      });
    } catch (error) {
      console.error('Failed to load referee items:', error);
      // Set empty arrays to prevent crashes
      setRefereeItems({ experiences: [], courseEnrollments: [], assessments: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item, type) => {
    console.log('=== STARTING EDIT ===');
    console.log('Item:', item);
    console.log('Type:', type);
    
    const itemId = type === 'course' ? item.employee_courseID : 
                   type === 'assessment' ? item.employee_assessmentID :
                   item.employee_experienceID;
    
    console.log('ItemID to set:', itemId);
    console.log('Current editingItemId before:', editingItemId);
    
    // Direct state updates
    setEditingItemId(itemId);
    setTempStatus(item.currentStatus || '');
    setTempScore('');
    setTempFeedback('');
    // Remove accreditationDate reset - using completionDate instead
    
    console.log('State updated. New values should be:', {
      editingItemId: itemId,
      tempStatus: item.currentStatus || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempStatus('');
    setTempScore('');
    setTempFeedback('');
    // Remove accreditationDate reset - using completionDate instead
  };

  const handleSubmitInlineUpdate = async (item, type, newStatus = null) => {
    console.log('Submitting inline update:', { item, type, newStatus, tempStatus, tempScore, tempFeedback });
    
    try {
      setSubmitting(true);
      
      let updateData = {};
      let itemId;

      if (type === 'experience') {
        if (tempFeedback.trim().length > 0) {
          updateData.refereeText = tempFeedback;
        }
        const statusToUse = newStatus || tempStatus;
        if (statusToUse && statusToUse !== item.currentStatus) {
          updateData.newStatus = statusToUse;
        }
        itemId = item.employee_experienceID;
      } else if (type === 'course') {
        const statusToUse = newStatus || tempStatus;
        if (statusToUse && statusToUse !== item.currentStatus) {
          updateData.newStatus = statusToUse;
        }
        itemId = item.employee_courseID;
      } else if (type === 'assessment') {
        if (tempScore && !isNaN(parseInt(tempScore))) {
          updateData.score = parseInt(tempScore);
          // Automatically determine pass/fail status based on score
          const score = parseInt(tempScore);
          const passingScore = item.passing_score || 0;
          const isPassing = score >= passingScore;
          updateData.newStatus = isPassing ? 'Passed' : 'Attempted';
          // Add accreditation date if provided and if it's a pass
          // Remove accreditationDate logic - using completionDate instead
          // Save attempt date for all attempts (pass or fail)
          // Remove accreditationDate logic - using completionDate instead
        }
        itemId = item.employee_assessmentID;
      }

      if (Object.keys(updateData).length === 0) {
        console.log('No changes to update');
        handleCancelEdit();
        return;
      }

      console.log('About to call updateItemStatus with:', { type, itemId, updateData });
      await updateItemStatus(type, itemId, updateData);
      console.log('Update successful, refreshing items...');
      
      // Show success message using ICDS Alert
      let statusMessage;
      if (updateData.newStatus === 'Withdrawn') {
        statusMessage = `withdrawn from ${type}. They can now re-enroll if needed.`;
      } else if (type === 'assessment' && updateData.score !== undefined) {
        const score = updateData.score;
        const status = updateData.newStatus;
        statusMessage = `scored ${score} and ${status === 'Passed' ? 'passed' : 'did not pass'} the assessment`;
      } else {
        statusMessage = updateData.newStatus ? `marked as "${updateData.newStatus}"` : 'updated successfully';
      }
      setAlertMessage(`${item.username || 'Student'} has been ${statusMessage}`);
      setAlertType('success');
      setAlertVisible(true);
      
      // Hide alert after 3 seconds
      setTimeout(() => {
        setAlertVisible(false);
      }, 3000);
      
      // Refresh the items list
      await loadRefereeItems();
      handleCancelEdit();
      console.log('Update process completed');
      
    } catch (error) {
      console.error('Failed to update item:', error);
      setAlertMessage(`Failed to update item: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
      handleCancelEdit(); // Cancel edit mode even on error
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <IcTypography variant="body">Loading items...</IcTypography>;
  }

  const getItemsForType = () => {
    let items;
    switch (itemType) {
      case 'courses':
        items = Array.isArray(refereeItems?.courseEnrollments) ? refereeItems.courseEnrollments : [];
        break;
      case 'assessments':
        items = Array.isArray(refereeItems?.assessments) ? refereeItems.assessments : [];
        console.log('=== FRONTEND ASSESSMENTS DEBUG ===');
        console.log('All assessments received:', items);
        console.log('Item count:', items.length);
        items.forEach((item, index) => {
          console.log(`Assessment ${index}:`, {
            id: item.employee_assessmentID,
            name: item.name,
            currentStatus: item.currentStatus,
            scoreAchieved: item.scoreAchieved,
            canUpdate: canUpdateStatus(item, currentUser)
          });
        });
        break;
      default: // 'experiences' or undefined
        items = Array.isArray(refereeItems?.experiences) ? refereeItems.experiences : [];
        break;
    }
    
    // Filter to show only awaiting items if toggle is enabled
    if (showOnlyAwaiting) {
      items = items.filter(item => {
        const status = getStatusDisplay(item);
        return status?.status !== 'Passed';
      });
    }
    
    return items;
  };

  const currentItems = getItemsForType();
  
  // Calculate counts for proper display
  const allItems = (() => {
    switch (itemType) {
      case 'courses':
        return Array.isArray(refereeItems?.courseEnrollments) ? refereeItems.courseEnrollments : [];
      case 'assessments':
        return Array.isArray(refereeItems?.assessments) ? refereeItems.assessments : [];
      default:
        return Array.isArray(refereeItems?.experiences) ? refereeItems.experiences : [];
    }
  })();
  
  const awaitingItems = allItems.filter(item => {
    const status = getStatusDisplay(item);
    return status?.status !== 'Passed';
  });
  
  const itemTypeName = itemType === 'courses' ? 'Course Enrollments' : 
                       itemType === 'assessments' ? 'Assessments' : 'Experiences';
  const awaitingTypeName = itemType === 'courses' ? 'courses' : 
                           itemType === 'assessments' ? 'assessments' : 'requests for feedback';

  return (
    <div>
      {alertVisible && (
        <IcAlert
          variant={alertType}
          heading={alertType === 'success' ? 'Status Updated' : 'Update Failed'}
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
          Show only items awaiting action
        </IcButton>
      </div>
      
      <IcTypography variant="h2" style={{ marginBottom: '8px' }}>
        {itemTypeName} You Manage
      </IcTypography>
      
      <IcTypography variant="body" style={{ marginBottom: '16px' }}>
        You have {awaitingItems.length} {awaitingTypeName} awaiting response
      </IcTypography>
      
      <IcTypography variant="body" style={{ marginBottom: '16px', color: '#666' }}>
        You have {allItems.length} total
      </IcTypography>

      {currentItems.length === 0 ? (
        <IcTypography variant="body">No {itemTypeName.toLowerCase()} requiring your attention.</IcTypography>
      ) : (
        currentItems.map((item, index) => {
          const status = getStatusDisplay(item);
          const canUpdate = canUpdateStatus(item, currentUser);
          console.log(`Item ${index} (${itemType}):`, { item, currentUser, canUpdate });

          if (itemType === 'courses') {
            return (
              <div key={index} style={divContainer}>
                <IcCardVertical 
                  style={cardContainer} 
                  heading={item?.courseName || 'Course Name Not Available'}
                  subheading={`Employee: ${item?.username || 'N/A'} | Duration: ${item?.courseDuration || 0} days | Enrolled: ${item?.recordDate || 'N/A'}`}
                  message={item?.description || 'No description available'}
                >
                  <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                  <IcStatusTag 
                    slot="interaction-button" 
                    label={status?.status || 'Unknown'} 
                    status={status?.color || 'neutral'} 
                  />

                  {canUpdate && (
                    <div slot="interaction-controls" style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                      {editingItemId === item.employee_courseID ? (
                        <IcSelect
                          label="Select New Status"
                          value={tempStatus}
                          onIcChange={(e) => {
                            console.log('Status selected, updating immediately:', e.detail.value);
                            setTempStatus(e.detail.value);
                            // Trigger immediate update
                            handleSubmitInlineUpdate(item, 'course', e.detail.value);
                          }}
                          options={[
                            { label: 'Enrolled', value: 'Enrolled' },
                            { label: 'In Progress', value: 'In Progress' },
                            { label: 'Completed', value: 'Completed' },
                            { label: 'Withdrawn', value: 'Withdrawn' }
                          ]}
                          style={{ width: '200px' }}
                        />
                      ) : (
                        <IcButton 
                          variant="primary"
                          onClick={() => handleStartEdit(item, 'course')}
                        >
                          Update Status
                          <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                        </IcButton>
                      )}
                    </div>
                  )}
                </IcCardVertical>
              </div>
            );
          } else if (itemType === 'assessments') {
            const safeRecordDate = item?.recordDate ? 
              (typeof item.recordDate === 'string' ? item.recordDate.substr(0, 10) : new Date(item.recordDate).toISOString().substr(0, 10)) : 
              'N/A';
              
            return (
              <div key={index} style={divContainer}>
                <IcCardVertical 
                  style={cardContainer} 
                  heading={item?.name || 'Assessment Name Not Available'}
                  subheading={`Employee: ${item?.username || 'N/A'} | Max Score: ${item?.max_score || 0} | Passing: ${item?.passing_score || 0} | Recorded: ${safeRecordDate}`}
                  message={item?.description || 'No description available'}
                >
                  <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
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
                              onClick={() => handleSubmitInlineUpdate(item, 'assessment')}
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
                          onClick={() => handleStartEdit(item, 'assessment')}
                        >
                          Record Score
                          <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
                        </IcButton>
                      )}
                    </div>
                  )}
                </IcCardVertical>
              </div>
            );
          } else {
            // Experiences (existing code)
            return (
              <div key={index} style={divContainer}>
                <IcCardVertical 
                  style={cardContainer} 
                  heading={item.experienceDescription}
                  subheading={`Employee: ${item.username} | Duration: ${item.duration} days | Recorded: ${item.recordDate.substr(0, 10)}`}
                >
                  <SlottedSVGTemplate mdiIcon={mdiPuzzleOutline} />
                  <IcStatusTag 
                    slot="interaction-button" 
                    label={status.status} 
                    status={status.color} 
                  />
                  
                  <IcTypography slot="adornment" variant="label-uppercase">
                    Employee's Description of Experience
                  </IcTypography>
                  <IcTypography slot="adornment">
                    {item.employeeText}
                  </IcTypography>

                  {item.refereeText && (
                    <>
                      <IcTypography slot="adornment" variant="label-uppercase">
                        Your Feedback
                      </IcTypography>
                      <IcTypography slot="adornment">
                        {item.refereeText}
                      </IcTypography>
                    </>
                  )}

                  {canUpdate && (
                    <div slot="interaction-controls" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {editingItemId === item.employee_experienceID ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                          <IcSelect
                            label="Status"
                            value={tempStatus}
                            onIcChange={(e) => {
                              setTempStatus(e.detail.value);
                              // Update immediately on status change
                              handleSubmitInlineUpdate(item, 'experience', e.detail.value);
                            }}
                            options={[
                              { label: 'Enrolled', value: 'Enrolled' },
                              { label: 'Referee Required', value: 'Referee Required' },
                              { label: 'Awaiting Feedback', value: 'Awaiting Feedback' },
                              { label: 'Completed', value: 'Completed' },
                              { label: 'Withdrawn', value: 'Withdrawn' }
                            ]}
                            style={{ width: '200px' }}
                          />
                          <IcTextField
                            label="Referee Feedback (Optional)"
                            multiline
                            rows={3}
                            placeholder="Provide feedback on this experience..."
                            value={tempFeedback}
                            onIcInput={(e) => setTempFeedback(e.detail.value)}
                            onBlur={() => {
                              // Update when user finishes entering feedback
                              if (tempFeedback && tempFeedback.trim() !== '') {
                                handleSubmitInlineUpdate(item, 'experience');
                              }
                            }}
                            style={{ width: '100%' }}
                          />
                        </div>
                      ) : (
                        <IcButton 
                          variant="primary"
                          onClick={() => handleStartEdit(item, 'experience')}
                        >
                          Update Status & Feedback
                          <SlottedSVGTemplate mdiIcon={mdiCommentQuoteOutline} />
                        </IcButton>
                      )}
                    </div>
                  )}
                </IcCardVertical>
              </div>
            );
          }
        })
      )}
    </div>
  );
};

export default RefereeReviewPanel;
