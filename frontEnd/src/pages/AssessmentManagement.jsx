import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcStatusTag, IcTextField, IcTypography, IcSelect, IcAlert, IcHero, IcTabContext, IcTabGroup, IcTab, IcTabPanel, IcBadge, IcSectionContainer, IcDialog, IcRadioGroup, IcRadioOption, IcSwitch } from "@ukic/react";
import { mdiAccountCheck, mdiCheckDecagramOutline, mdiPencil, mdiCheck, mdiClose, mdiPlus, mdiDelete } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import Header from "../components/ContentManagementHeader";
import Footer from "../components/ITRFooter";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { updateItemStatus } from "../commonFunctions/commonFeedbackUtilities";
import { getStatusDisplay, canUpdateStatus } from "../commonFunctions/statusUtilities";
import { fetchData } from "../commonFunctions/api";

const AssessmentManagement = () => {
  const [managedAssessments, setManagedAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [tempScore, setTempScore] = useState('');
  const [tempCompletionDate, setTempCompletionDate] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showOnlyAwaiting, setShowOnlyAwaiting] = useState(false);
  const [showOnlyNeedingReview, setShowOnlyNeedingReview] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(null);

  // Dialog states for editing and creating
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSafetyWarningOpen, setDeleteSafetyWarningOpen] = useState(false);
  const [incompleteEnrolleesCount, setIncompleteEnrolleesCount] = useState(0);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [createFormData, setCreateFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Set initial active tab when assessments load
  useEffect(() => {
    if (managedAssessments.length > 0 && !activeTab) {
      setActiveTab(managedAssessments[0].assessmentID);
    }
  }, [managedAssessments, activeTab]);

  useEffect(() => {
    loadManagedAssessments();
  }, []);

  const loadManagedAssessments = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const userData = await fetchData("/Auth/user");
      setCurrentUser(userData);
      
      if (!userData?.employeeID) {
        console.warn('No current user or employeeID available');
        return;
      }
      
      const data = await fetchData(`/ManageContents/assessments/${userData.employeeID}`);
      console.log('Managed assessments API response:', data);
      console.log('User employeeID:', userData.employeeID);
      
      const assessments = Array.isArray(data?.assessments) ? data.assessments : [];
      console.log('Processed assessments:', assessments);
      setManagedAssessments(assessments);
      
      // Set first assessment as active tab if available
      if (assessments.length > 0) {
        const firstAssessmentID = assessments[0].assessmentID;
        setActiveTab(firstAssessmentID);
        console.log('Setting initial active tab to:', firstAssessmentID);
      }
    } catch (error) {
      console.error('Failed to load managed assessments:', error);
      console.error('Error details:', error.message);
      setManagedAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  // Enrollment editing handlers
  const handleStartEdit = (item) => {
    setEditingItemId(item.employee_assessmentID);
    setTempStatus(item.currentStatus || '');
    setTempScore(item.score || '');
    setTempCompletionDate(item.completionDate || '');
    // Remove accreditationDate handling - using completionDate instead
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempStatus('');
    setTempScore('');
    setTempCompletionDate('');
    // setTempAccreditationDate(''); // Removed - using completionDate instead
  };

  const handleSubmitUpdate = async (item, newStatus, score = null, completionDate = null, assessment = null) => {
    try {
      setSubmitting(true);
      
      // Auto-determine status based on score if score is provided
      let finalStatus = newStatus;
      if (score !== null && score !== '' && assessment && assessment.passing_score !== null) {
        const numericScore = parseInt(score) || 0;
        if (numericScore >= assessment.passing_score) {
          finalStatus = 'Passed';
        } else {
          finalStatus = 'Attempted';
        }
      }
      
      const updateData = { 
        enrollmentId: item.employee_assessmentID,
        newStatus: finalStatus 
      };
      
      if (score !== null && score !== '') {
        updateData.score = parseInt(score) || 0;
      }
      
      if (completionDate !== null && completionDate !== '') {
        updateData.completionDate = completionDate;
      }
      
      // Remove accreditationDate logic - using completionDate instead

      const response = await fetch('http://localhost:5000/ManageContents/updateAssessmentEnrollment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        if (finalStatus === 'Withdrawn') {
          setAlertMessage(`${item.username} has been withdrawn from the assessment and removed from their record.`);
        } else {
          setAlertMessage(`${item.username} has been marked as "${finalStatus}"`);
        }
        setAlertType('success');
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedAssessments();
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

  // Dialog form handlers for assessment editing
  const handleFormChange = (field, value) => {
    const updatedFormData = {
      ...editFormData,
      [field]: value
    };
    
    setEditFormData(updatedFormData);
    
    // Check if changes were made compared to original assessment
    if (selectedAssessment) {
      const hasChanges = Object.keys(updatedFormData).some(key => {
        const oldValue = selectedAssessment[key === 'assessmentName' ? 'name' : key] || '';
        const newValue = updatedFormData[key] || '';
        return oldValue.toString() !== newValue.toString();
      });
      setHasChanges(hasChanges);
    }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedAssessment) return;
    
    try {
      setSubmitting(true);
      
      const updateData = {
        assessmentID: selectedAssessment.assessmentID,
        name: editFormData.assessmentName,
        description: editFormData.assessmentDescription,
        duration: parseFloat(editFormData.duration) || 0,
        deliveryMethod: editFormData.deliveryMethod,
        deliveryLocation: editFormData.deliveryLocation,
        maxScore: parseInt(editFormData.maxScore) || 0,
        passingScore: parseInt(editFormData.passingScore) || 0,
        expiry: editFormData.expiry ? parseInt(editFormData.expiry) : null
      };
      
      const response = await fetch('http://localhost:5000/ManageContents/updateAssessment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Assessment updated successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setEditDialogOpen(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedAssessments();
        
      } else {
        throw new Error(result.error || 'Failed to update assessment');
      }
      
    } catch (error) {
      console.error('Failed to update assessment:', error);
      setAlertMessage(`Failed to update assessment: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedAssessment) return;
    
    // Check for incomplete enrollees (safety function)
    const incompleteEnrollees = selectedAssessment.enrollments?.filter(enrollment => {
      const status = getStatusDisplay(enrollment);
      return status?.status !== 'Passed';
    }) || [];
    
    if (incompleteEnrollees.length > 0) {
      // Show safety warning dialog
      setIncompleteEnrolleesCount(incompleteEnrollees.length);
      setDeleteSafetyWarningOpen(true);
      return;
    }
    
    // Show confirmation dialog if safe to delete
    setDeleteConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!selectedAssessment) return;
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`http://localhost:5000/courseCatalogue/deleteAssessment/${selectedAssessment.assessmentID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Assessment deleted successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setDeleteConfirmOpen(false);
        setEditDialogOpen(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedAssessments();
        
      } else {
        throw new Error(result.error || 'Failed to delete assessment');
      }
      
    } catch (error) {
      console.error('Failed to delete assessment:', error);
      setAlertMessage(`Failed to delete assessment: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Dialog form handlers for assessment creation
  const handleCreateFormChange = (field, value) => {
    const updatedFormData = {
      ...createFormData,
      [field]: value
    };
    
    setCreateFormData(updatedFormData);
    
    // Check if form has required fields filled
    const hasRequiredFields = updatedFormData.assessmentName && 
                             updatedFormData.assessmentDescription && 
                             updatedFormData.duration && 
                             updatedFormData.maxScore && 
                             updatedFormData.passingScore;
    setHasChanges(hasRequiredFields);
  };

  const handleCreateSubmit = async () => {
    try {
      setSubmitting(true);
      
      const createData = {
        courseName: createFormData.assessmentName,
        assessmentDescription: createFormData.assessmentDescription,
        duration: parseFloat(createFormData.duration) || 0,
        assessmentMethod: createFormData.deliveryMethod || 'Online Assessment',
        assessmentLocation: createFormData.deliveryLocation || 'High',
        maxScore: parseInt(createFormData.maxScore) || 0,
        passingScore: parseInt(createFormData.passingScore) || 0,
        expiry: createFormData.expiry ? parseInt(createFormData.expiry) : null
      };
      
      const response = await fetch('http://localhost:5000/CourseCatalogue/createAssessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(createData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Assessment created successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setCreateDialogOpen(false);
        setIsCreateMode(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedAssessments();
        
      } else {
        throw new Error(result.error || 'Failed to create assessment');
      }
      
    } catch (error) {
      console.error('Failed to create assessment:', error);
      setAlertMessage(`Failed to create assessment: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const renderDialogs = () => (
    <>
      {/* Create Assessment Dialog */}
      <IcDialog
        size="large"
        open={createDialogOpen}
        closeOnBackdropClick={false}
        heading="Create New Assessment"
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
            value={createFormData.assessmentName || ''} 
            onIcInput={(e) => handleCreateFormChange('assessmentName', e.detail.value)}
            label="Assessment Name" 
            type="text" 
            minCharacters={4} 
            maxCharcters={64} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={createFormData.assessmentDescription || ''} 
            onIcInput={(e) => handleCreateFormChange('assessmentDescription', e.detail.value)}
            label="Assessment Description" 
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
          <IcRadioGroup 
            name='deliveryMethod'
            label="Assessment Method" 
            value={createFormData.deliveryMethod || ''}
            onIcChange={(e) => handleCreateFormChange('deliveryMethod', e.detail.value)}
            required
          >
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap' }}>
              <IcRadioOption value="Online" label="Online" />
              <IcRadioOption value="Written" label="Written" />
              <IcRadioOption value="Practical" label="Practical" />
              <IcRadioOption value="Interview" label="Interview" />
            </div>
          </IcRadioGroup>
          <br />
          <IcRadioGroup 
            name='deliveryLocation'
            label="Delivery Location" 
            orientation="horizontal"
            value={createFormData.deliveryLocation || ''}
            onIcChange={(e) => handleCreateFormChange('deliveryLocation', e.detail.value)}
            required
          >
            <IcRadioOption value="High" label="High" />
            <IcRadioOption value="Low" label="Low" />
          </IcRadioGroup>
          <IcTextField
            value={createFormData.maxScore || ''}
            onIcInput={(e) => handleCreateFormChange('maxScore', e.detail.value)}
            label="Maximum Score"
            type="number"
            step="1"
            min="0"
            fullWidth="full-width"
            required
          />
          <IcTextField
            value={createFormData.passingScore || ''}
            onIcInput={(e) => handleCreateFormChange('passingScore', e.detail.value)}
            label="Passing Score"
            type="number"
            step="1"
            min="0"
            fullWidth="full-width"
            required
          />
          <IcTextField
            value={createFormData.expiry || ''}
            onIcInput={(e) => handleCreateFormChange('expiry', e.detail.value)}
            label="Expiry (years)"
            type="number"
            step="1"
            min="0"
            fullWidth="full-width"
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
              <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
              {hasChanges ? 'Create Assessment' : 'Fill Required Fields'}
            </IcButton>
          </div>
        </form>
      </IcDialog>

      {/* Edit Assessment Dialog */}
      <IcDialog
        size="large"
        open={editDialogOpen}
        closeOnBackdropClick={false}
        heading="Edit Assessment"
        disable-height-constraint='true'
        hideDefaultControls="true"
        buttons="false"
        onIcDialogClosed={() => setEditDialogOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateSubmit();
        }}>
          <IcTextField 
            value={editFormData.assessmentName || ''} 
            onIcInput={(e) => handleFormChange('assessmentName', e.detail.value)}
            label="Assessment Name" 
            type="text" 
            minCharacters={4} 
            maxCharcters={64} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={editFormData.assessmentDescription || ''} 
            onIcInput={(e) => handleFormChange('assessmentDescription', e.detail.value)}
            label="Assessment Description" 
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
            label="Duration (days)"
            type="number"
            step="0.125"
            min="0.125"
            helperText="Increments of 0.125 Days (1 hour)"
            fullWidth="full-width"
            required
          />
          <IcRadioGroup 
            name='editDeliveryMethod'
            label="Assessment Method" 
            orientation="horizontal"
            value={editFormData.deliveryMethod || ''}
            onIcChange={(e) => handleFormChange('deliveryMethod', e.detail.value)}
            required
          >
            <IcRadioOption value="Online" label="Online" />
            <IcRadioOption value="Written" label="Written" />
            <IcRadioOption value="Practical" label="Practical" />
            <IcRadioOption value="Interview" label="Interview" />
          </IcRadioGroup>
          <br />
          <IcRadioGroup 
            name='editDeliveryLocation'
            label="Delivery Location" 
            orientation="horizontal"
            value={editFormData.deliveryLocation || ''}
            onIcChange={(e) => handleFormChange('deliveryLocation', e.detail.value)}
            required
          >
            <IcRadioOption value="High" label="High" />
            <IcRadioOption value="Low" label="Low" />
          </IcRadioGroup>
          <IcTextField
            value={editFormData.maxScore || ''}
            onIcInput={(e) => handleFormChange('maxScore', e.detail.value)}
            label="Maximum Score"
            type="number"
            step="1"
            min="0"
            fullWidth="full-width"
            required
          />
          <IcTextField
            value={editFormData.passingScore || ''}
            onIcInput={(e) => handleFormChange('passingScore', e.detail.value)}
            label="Passing Score"
            type="number"
            step="1"
            min="0"
            fullWidth="full-width"
            required
          />
          <IcTextField
            value={editFormData.expiry || ''}
            onIcInput={(e) => handleFormChange('expiry', e.detail.value)}
            label="Expiry (years)"
            type="number"
            step="1"
            min="0"
            fullWidth="full-width"
          />
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
            <IcButton 
              variant="destructive" 
              onClick={handleDelete}
              type="button"
            >
              <SlottedSVGTemplate mdiIcon={mdiDelete} />
              Delete Assessment
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={!hasChanges}
            >
              <SlottedSVGTemplate mdiIcon={mdiPencil} />
              {hasChanges ? 'Update Assessment' : 'No Changes'}
            </IcButton>
          </div>
        </form>
      </IcDialog>

      {/* Delete Confirmation Dialog */}
      <IcDialog
        size="small"
        open={deleteConfirmOpen}
        closeOnBackdropClick={false}
        heading="Delete Assessment"
        hideDefaultControls="true"
        onIcDialogClosed={() => setDeleteConfirmOpen(false)}>
        <IcTypography variant="body">
          Are you sure you want to delete this assessment? This action cannot be undone.
        </IcTypography>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <IcButton 
            variant="tertiary" 
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </IcButton>
          <IcButton 
            variant="destructive" 
            onClick={performDelete}
          >
            Delete Assessment
          </IcButton>
        </div>
      </IcDialog>

      {/* Delete Safety Warning Dialog */}
      <IcDialog
        size="small"
        open={deleteSafetyWarningOpen}
        closeOnBackdropClick={false}
        heading="Cannot Delete Assessment"
        buttons="false"
        disable-focus-trap="true"
        onIcDialogClosed={() => setDeleteSafetyWarningOpen(false)}>
        <br />
        <IcTypography variant="body">
          Cannot delete content with enrollees not having completed. Update entries to completed or withdraw them before deleteing.
        </IcTypography>
      </IcDialog>
    </>
  );

  if (loading) {
    return <IcTypography variant="body">Loading managed assessments...</IcTypography>;
  }

  if (managedAssessments.length === 0) {
    return (
      <>
        <Header />
        <IcHero
          heading="Assessment Management"
          secondaryHeading="No assessments to manage"
          secondarySubheading="You are not currently assigned as a manager for any assessments."
          aligned="full-width">
          <IcButton 
            slot="interaction"
            variant="primary"
            onClick={() => {
              console.log('Creating new assessment');
              setIsCreateMode(true);
              setCreateFormData({
                assessmentName: '',
                assessmentDescription: '',
                duration: '',
                deliveryMethod: '',
                deliveryLocation: '',
                maxScore: '',
                passingScore: '',
                expiry: ''
              });
              setCreateDialogOpen(true);
            }}
          >
            <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
            Create Assessment
          </IcButton>
        </IcHero>
        <Footer />
        
        {/* Dialogs - available even when no assessments */}
        {renderDialogs()}
      </>
    );
  }



  return (
    <>
      <Header />
      <IcHero
        heading="Assessment Management"
        subheading="Manage assessment details and student enrollments"
        secondaryHeading={`Managing ${managedAssessments.length} assessment${managedAssessments.length === 1 ? '' : 's'}`}
        aligned="full-width">
        <IcButton 
          slot="interaction"
          variant="primary"
          onClick={() => {
            console.log('Creating new assessment');
            setIsCreateMode(true);
            setCreateFormData({
              assessmentName: '',
              assessmentDescription: '',
              duration: '',
              deliveryMethod: '',
              deliveryLocation: '',
              maxScore: '',
              passingScore: '',
              expiry: ''
            });
            setCreateDialogOpen(true);
          }}
        >
          <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
          Create Assessment
        </IcButton>
        {managedAssessments.length > 0 && activeTab && (
          <IcButton 
            slot="interaction"
            variant="secondary"
            onClick={() => {
              const assessment = managedAssessments.find(a => a.assessmentID === activeTab);
              if (assessment) {
                setSelectedAssessment(assessment);
                setEditFormData({
                  assessmentName: assessment.name || '',
                  assessmentDescription: assessment.description || '',
                  duration: assessment.duration || '',
                  deliveryMethod: assessment.delivery_method || '',
                  deliveryLocation: assessment.delivery_location || '',
                  maxScore: assessment.max_score || '',
                  passingScore: assessment.passing_score || '',
                  expiry: assessment.expiry || ''
                });
                setHasChanges(false);
                setEditDialogOpen(true);
              }
            }}
          >
            <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
            Edit Assessment Details
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
          label="Assessment Management" 
          style={{ margin: '16px' }} 
          onIcTabSelect={(e) => {
            console.log('Tab selected:', e.detail.value);
            setActiveTab(parseInt(e.detail.value));
          }}
        >
          {managedAssessments.map((assessment) => {
            const awaitingCount = assessment.enrollments.filter(enrollment => {
              const status = getStatusDisplay(enrollment);
              return status?.status !== 'Passed';
            }).length;

            return (
              <IcTab 
                key={assessment.assessmentID} 
                value={assessment.assessmentID.toString()}
                onClick={() => {
                  console.log('Tab clicked manually:', assessment.assessmentID);
                  setActiveTab(assessment.assessmentID);
                }}
              >
                <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
                {assessment.name}
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

        {managedAssessments.map((assessment) => {
          const awaitingEnrollments = assessment.enrollments?.filter(enrollment => {
            const status = getStatusDisplay(enrollment);
            return status?.status !== 'Passed';
          }) || [];
          
          const currentEnrollments = showOnlyAwaiting ? awaitingEnrollments : (assessment.enrollments || []);
          
          return (
            <IcTabPanel key={assessment.assessmentID} value={assessment.assessmentID.toString()}>
              {/* Enrollments Section */}
              <div style={{ padding: 'var(--ic-space-xs)', width: '85%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                  <IcTypography variant="h3">
                    Student Enrollments ({assessment.enrollments.length})
                  </IcTypography>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <IcSwitch
                      label={`Show only enrollments awaiting review (${awaitingEnrollments.length})`}
                      checked={showOnlyAwaiting}
                      onIcChange={(e) => setShowOnlyAwaiting(e.detail.checked)}
                      size="small"
                    />
                  </div>
                </div>

                {currentEnrollments.length === 0 ? null : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {currentEnrollments.map((enrollment, index) => {
                      const status = getStatusDisplay(enrollment);
                      const canUpdate = canUpdateStatus(enrollment, currentUser);

                      return (
                        <IcCardVertical 
                          key={index}
                          style={cardContainer}
                          heading={enrollment.username || 'Unknown Student'}
                          subheading={`${enrollment.role || 'Unknown Role'} | Enrolled: ${enrollment.recordDate || 'Unknown Date'}${enrollment.score ? ` | Score: ${enrollment.score}/${assessment.max_score}` : ''}${enrollment.completionDate ? ` | Completed: ${enrollment.completionDate}` : ''}`}
                          message={`Current Status: ${status?.status || 'Unknown'}`}
                        >
                          <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                          <IcStatusTag 
                            slot="interaction-button" 
                            label={status?.status || 'Unknown'} 
                            status={status?.color || 'neutral'} 
                          />

                          <div slot="interaction-controls" style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                              {editingItemId === enrollment.employee_assessmentID ? (
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
                                        { label: 'Withdraw (Remove from Record)', value: 'Withdrawn' }
                                      ]}
                                      style={{ minWidth: '150px', flex: '1' }}
                                    />
                                    <IcTextField
                                      label={`Score (${assessment.passing_score} pass) (${assessment.max_score} max)`}
                                      value={tempScore}
                                      onIcInput={(e) => setTempScore(e.detail.value)}
                                      type="number"
                                      max={assessment.max_score}
                                      style={{ minWidth: '100px', flex: '0 0 auto' }}
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
                                    onClick={() => handleSubmitUpdate(enrollment, tempStatus, tempScore, tempCompletionDate, assessment)}
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
      
      <Footer />
      
      {/* Dialogs - always available */}
      {renderDialogs()}
    </>
  );
};

export default AssessmentManagement;
