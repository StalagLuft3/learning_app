import React, { useEffect, useState } from "react";
import { IcButton, IcCard, IcStatusTag, IcTextField, IcTypography, IcSelect, IcAlert, IcHero, IcTabContext, IcTabGroup, IcTab, IcTabPanel, IcBadge, IcSectionContainer, IcDialog } from "@ukic/react";
import { mdiAccountCheck, mdiToggleSwitch, mdiToggleSwitchOff, mdiCheckCircle, mdiPencil, mdiCheck, mdiClose, mdiChartLine, mdiPlus, mdiSignDirectionPlus, mdiSignDirection, mdiDelete } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import Header from "../components/ContentManagementHeader";
import Footer from "../components/ITRFooter";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { getStatusDisplay, canUpdateStatus } from "../commonFunctions/statusUtilities";
import { fetchData } from "../commonFunctions/api";

const PathwayManagement = () => {
  const [managedPathways, setManagedPathways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [tempStatus, setTempStatus] = useState('');
  const [pathwayFormData, setPathwayFormData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({});
  const [showPathwayDetails, setShowPathwayDetails] = useState({});
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  const [showOnlyInProgress, setShowOnlyInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Dialog states for editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Set initial active tab when pathways load
  useEffect(() => {
    if (managedPathways.length > 0 && !activeTab) {
      setActiveTab(managedPathways[0].pathwayID);
    }
  }, [managedPathways, activeTab]);

  useEffect(() => {
    loadManagedPathways();
  }, []);

  const loadManagedPathways = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const userData = await fetchData("/Auth/user");
      setCurrentUser(userData);
      
      if (!userData?.employeeID) {
        console.warn('No current user or employeeID available');
        return;
      }
      
      const data = await fetchData(`/ManageContents/pathways/${userData.employeeID}`);
      console.log('Managed pathways loaded:', data);
      
      const pathways = Array.isArray(data?.pathways) ? data.pathways : [];
      setManagedPathways(pathways);
      
      // Initialize form data for all pathways
      const initialFormData = {};
      const initialChangesState = {};
      const initialShowState = {};
      pathways.forEach(pathway => {
        initialFormData[pathway.pathwayID] = {
          pathwayName: pathway.pathwayName || '',
          pathwayDescription: pathway.pathwayDescription || ''
        };
        initialChangesState[pathway.pathwayID] = false;
        initialShowState[pathway.pathwayID] = false;
      });
      setPathwayFormData(initialFormData);
      setHasUnsavedChanges(initialChangesState);
      setShowPathwayDetails(initialShowState);
      
      // Set first pathway as active tab if available
      if (pathways.length > 0) {
        const firstPathwayID = pathways[0].pathwayID;
        setActiveTab(firstPathwayID);
        console.log('Setting initial active tab to:', firstPathwayID);
      }
    } catch (error) {
      console.error('Failed to load managed pathways:', error);
      setManagedPathways([]);
    } finally {
      setLoading(false);
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
      (fieldName === 'pathwayName' && value !== selectedPathway?.pathwayName) ||
      (fieldName === 'pathwayDescription' && value !== selectedPathway?.pathwayDescription) ||
      (fieldName !== 'pathwayName' && fieldName !== 'pathwayDescription' && (
        editFormData.pathwayName !== selectedPathway?.pathwayName ||
        editFormData.pathwayDescription !== selectedPathway?.pathwayDescription
      ));
    
    setHasChanges(hasChanges);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedPathway) return;
    
    try {
      setSubmitting(true);
      
      const updateData = {
        pathwayID: selectedPathway.pathwayID,
        pathwayName: editFormData.pathwayName,
        pathwayDescription: editFormData.pathwayDescription
      };

      const response = await fetch('http://localhost:5000/ManageContents/updatePathway', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Pathway updated successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setEditDialogOpen(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedPathways();
        
      } else {
        throw new Error(result.error || 'Failed to update pathway');
      }
      
    } catch (error) {
      console.error('Failed to update pathway:', error);
      setAlertMessage(`Failed to update pathway: ${error.message || 'Please try again.'}`);
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
    if (!selectedPathway) return;
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`http://localhost:5000/pathways/deletePathway/${selectedPathway.pathwayID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Pathway deleted successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setDeleteConfirmOpen(false);
        setEditDialogOpen(false);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedPathways();
        
      } else {
        throw new Error(result.error || 'Failed to delete pathway');
      }
      
    } catch (error) {
      console.error('Failed to delete pathway:', error);
      setAlertMessage(`Failed to delete pathway: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Pathway form handlers (keeping existing ones for backward compatibility)
  const handlePathwayFieldChange = (pathwayID, fieldName, value) => {
    const pathway = managedPathways.find(p => p.pathwayID === pathwayID);
    
    // Ensure we have the current form data, initialize if needed
    const currentFormData = pathwayFormData[pathwayID] || {
      pathwayName: pathway?.pathwayName || '',
      pathwayDescription: pathway?.pathwayDescription || ''
    };
    
    const updatedFormData = {
      ...pathwayFormData,
      [pathwayID]: {
        ...currentFormData,
        [fieldName]: value
      }
    };
    setPathwayFormData(updatedFormData);
    
    // Check if changes were made compared to original
    const hasChanges = 
      updatedFormData[pathwayID].pathwayName !== (pathway?.pathwayName || '') ||
      updatedFormData[pathwayID].pathwayDescription !== (pathway?.pathwayDescription || '');
    
    setHasUnsavedChanges(prev => ({
      ...prev,
      [pathwayID]: hasChanges
    }));
  };

  const handleSubmitPathwayUpdate = async (pathwayID) => {
    try {
      setSubmitting(true);
      
      const formData = pathwayFormData[pathwayID];
      const updateData = {
        pathwayID,
        pathwayName: formData.pathwayName,
        pathwayDescription: formData.pathwayDescription
      };

      const response = await fetch('http://localhost:5000/ManageContents/updatePathway', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Pathway updated successfully!');
        setAlertType('success');
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(prev => ({
          ...prev,
          [pathwayID]: false
        }));
        
        await loadManagedPathways();
        
      } else {
        throw new Error(result.error || 'Failed to update pathway');
      }
      
    } catch (error) {
      console.error('Failed to update pathway:', error);
      setAlertMessage(`Failed to update pathway: ${error.message || 'Please try again.'}`);
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
  const handleStartEdit = (enrollment) => {
    setEditingItemId(enrollment.pathway_employeeID);
    setTempStatus(enrollment.currentStatus || 'In Progress');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setTempStatus('');
  };

  const handleSubmitEnrollmentUpdate = async (enrollment, newStatus) => {
    try {
      setSubmitting(true);
      
      const updateData = { 
        enrollmentId: enrollment.pathway_employeeID,
        newStatus 
      };

      const response = await fetch('http://localhost:5000/ManageContents/updatePathwayEnrollment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage(`${enrollment.username}'s pathway status has been updated to "${newStatus}"`);
        setAlertType('success');
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedPathways();
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

  const getPathwayStatus = (enrollment) => {
    const status = enrollment.currentStatus || 'In Progress';
    let color = 'neutral';
    
    switch (status) {
      case 'Completed':
        color = 'success';
        break;
      case 'In Progress':
        color = 'info';
        break;
      case 'Withdrawn':
        color = 'error';
        break;
      default:
        color = 'neutral';
    }
    
    return { status, color };
  };

  if (loading) {
    return <IcTypography variant="body">Loading managed pathways...</IcTypography>;
  }

  if (managedPathways.length === 0) {
    return (
      <>
        <Header />
        <IcHero
          heading="Pathway Management"
          secondaryHeading="No pathways to manage"
          secondarySubheading="You are not currently assigned as a manager for any pathways."
          aligned="full-width"
        />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <IcHero
        heading="Pathway Management"
        subheading="Manage pathway details and student progress"
        secondaryHeading={`Managing ${managedPathways.length} pathway${managedPathways.length === 1 ? '' : 's'}`}
        aligned="full-width">
        <IcButton 
          slot="interaction"
          variant="primary"
          onClick={() => {
            console.log('Creating new pathway');
            // TODO: Implement create pathway functionality
            alert('Create Pathway functionality - To be implemented');
          }}
        >
          <SlottedSVGTemplate mdiIcon={mdiSignDirectionPlus} />
          Create Pathway
        </IcButton>
        {managedPathways.length > 0 && activeTab && (
          <IcButton 
            slot="interaction"
            variant="secondary"
            onClick={() => {
              const pathway = managedPathways.find(p => p.pathwayID === activeTab);
              if (pathway) {
                setSelectedPathway(pathway);
                setEditFormData({
                  pathwayName: pathway.pathwayName || '',
                  pathwayDescription: pathway.pathwayDescription || ''
                });
                setHasChanges(false);
                setEditDialogOpen(true);
              }
            }}
          >
            <SlottedSVGTemplate mdiIcon={mdiSignDirection} />
            Edit Pathway Details
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
          label="Pathway Management" 
          style={{ margin: '16px' }} 
          onIcTabSelect={(e) => {
            console.log('Tab selected:', e.detail.value);
            setActiveTab(parseInt(e.detail.value));
          }}
        >
          {managedPathways.map((pathway) => {
            // Calculate in progress count for this pathway
            const inProgressCount = pathway.enrollments?.filter(enrollment => {
              const status = getPathwayStatus(enrollment);
              return status?.status === 'In Progress';
            }).length || 0;

            return (
              <IcTab 
                key={pathway.pathwayID} 
                value={pathway.pathwayID.toString()}
                onClick={() => {
                  console.log('Tab clicked manually:', pathway.pathwayID);
                  setActiveTab(pathway.pathwayID);
                }}
              >
                <SlottedSVGTemplate mdiIcon={mdiCheckCircle} />
                {pathway.pathwayName}
                {inProgressCount > 0 && (
                  <IcBadge 
                    textLabel={inProgressCount.toString()} 
                    variant="info" 
                    style={{ marginLeft: '8px' }}
                  />
                )}
              </IcTab>
            );
          })}
        </IcTabGroup>

        {managedPathways.map((pathway) => {
          const inProgressEnrollments = pathway.enrollments?.filter(enrollment => {
            const status = getPathwayStatus(enrollment);
            return status?.status === 'In Progress';
          }) || [];
          
          const currentEnrollments = showOnlyInProgress ? inProgressEnrollments : (pathway.enrollments || []);
          
          return (
            <IcTabPanel key={pathway.pathwayID} value={pathway.pathwayID.toString()}>
              {/* Enrollments Section */}
              <div style={{ padding: 'var(--ic-space-xs)', width: '85%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <IcTypography variant="h3">
                    Student Enrollments ({pathway.enrollments?.length || 0})
                  </IcTypography>
                  
                  <IcButton 
                    variant={showOnlyInProgress ? "primary" : "secondary"}
                    onClick={() => setShowOnlyInProgress(!showOnlyInProgress)}
                    size="small"
                  >
                    <SlottedSVGTemplate mdiIcon={showOnlyInProgress ? mdiToggleSwitch : mdiToggleSwitchOff} />
                    Show only in progress ({inProgressEnrollments.length})
                  </IcButton>
                </div>

                {currentEnrollments.length === 0 ? (
                  <IcTypography variant="body" style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
                    {showOnlyInProgress 
                      ? 'No enrollments in progress for this pathway.' 
                      : 'No student enrollments found for this pathway.'
                    }
                  </IcTypography>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {currentEnrollments.map((enrollment, index) => {
                      const status = getPathwayStatus(enrollment);
                      
                      return (
                        <IcCard 
                          key={index}
                          style={cardContainer}
                          heading={enrollment.username || 'Unknown Student'}
                          subheading={`${enrollment.role || 'Unknown Role'} | Enrolled: ${enrollment.recordDate || 'Unknown Date'}`}
                          message={`Current Status: ${status?.status || 'In Progress'}`}
                        >
                          <SlottedSVGTemplate mdiIcon={mdiAccountCheck} />
                          <IcStatusTag 
                            slot="interaction-button" 
                            label={status?.status || 'In Progress'} 
                            status={status?.color || 'info'} 
                          />

                          <div slot="interaction-controls" style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                            {editingItemId === enrollment.pathway_employeeID ? (
                              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                                <IcSelect
                                  label="Status"
                                  value={tempStatus}
                                  onIcChange={(e) => setTempStatus(e.detail.value)}
                                  options={[
                                    { label: 'In Progress', value: 'In Progress' },
                                    { label: 'Completed', value: 'Completed' },
                                    { label: 'Withdrawn', value: 'Withdrawn' }
                                  ]}
                                  style={{ width: '150px' }}
                                />
                                <IcButton 
                                  variant="primary"
                                  size="small"
                                  onClick={() => handleSubmitEnrollmentUpdate(enrollment, tempStatus)}
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
                        </IcCard>
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
        heading="Edit Pathway"
        disable-height-constraint='true'
        buttons="false"
        onIcDialogClosed={() => setEditDialogOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateSubmit();
        }}>
          <IcTextField 
            value={editFormData.pathwayName || ''} 
            onIcInput={(e) => handleFormChange('pathwayName', e.detail.value)}
            label="Pathway Name" 
            type="text" 
            minCharacters={4} 
            maxCharcters={64} 
            fullWidth="full-width" 
            required 
          />
          <IcTextField 
            value={editFormData.pathwayDescription || ''} 
            onIcInput={(e) => handleFormChange('pathwayDescription', e.detail.value)}
            label="Pathway Description" 
            rows={3} 
            type="text" 
            minCharacters={16} 
            maxCharcters={256} 
            fullWidth="full-width" 
            required 
          />
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
            <IcButton 
              variant="destructive" 
              onClick={() => setDeleteConfirmOpen(true)}
              type="button"
            >
              <SlottedSVGTemplate mdiIcon={mdiDelete} />
              Delete Pathway
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={!hasChanges}
            >
              <SlottedSVGTemplate mdiIcon={mdiPencil} />
              {hasChanges ? 'Update Pathway' : 'No Changes'}
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
          <p>Are you sure you want to delete this pathway?</p>
          <p><strong>{selectedPathway?.pathwayName}</strong></p>
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

export default PathwayManagement;