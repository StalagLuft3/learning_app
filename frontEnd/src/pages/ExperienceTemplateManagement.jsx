import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcTextField, IcTypography, IcAlert, IcHero, IcDialog, IcStatusTag } from "@ukic/react";
import { mdiAccountCheck, mdiPencil, mdiCheck, mdiClose, mdiPlus, mdiDelete, mdiClipboardText } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";

import Header from "../components/ContentManagementHeader";
import Footer from "../components/ITRFooter";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { fetchData } from "../commonFunctions/api";

const ExperienceTemplateManagement = () => {
  const [experienceTemplates, setExperienceTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    experienceDescription: '',
    minimumDuration: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadExperienceTemplates();
  }, []);

  const loadExperienceTemplates = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('http://localhost:5000/ManageContents/experience-templates', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Experience templates loaded:', data);
        setExperienceTemplates(data.experienceTemplates || []);
      } else {
        throw new Error('Failed to load experience templates');
      }
      
    } catch (error) {
      console.error('Failed to load experience templates:', error);
      setAlertMessage(`Failed to load experience templates: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Check if changes were made compared to original
    if (selectedTemplate) {
      const hasChanges = 
        (fieldName === 'experienceDescription' && value !== selectedTemplate.experienceDescription) ||
        (fieldName === 'minimumDuration' && value !== selectedTemplate.minimumDuration.toString()) ||
        (fieldName !== 'experienceDescription' && fieldName !== 'minimumDuration' && (
          formData.experienceDescription !== selectedTemplate.experienceDescription ||
          formData.minimumDuration !== selectedTemplate.minimumDuration.toString()
        ));
      
      setHasChanges(hasChanges);
    } else {
      // Creating new template - check if form has content
      setHasChanges(formData.experienceDescription.trim() !== '' || formData.minimumDuration.trim() !== '');
    }
  };

  const openCreateDialog = () => {
    setFormData({
      experienceDescription: '',
      minimumDuration: ''
    });
    setHasChanges(false);
    setSelectedTemplate(null);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (template) => {
    setSelectedTemplate(template);
    setFormData({
      experienceDescription: template.experienceDescription || '',
      minimumDuration: template.minimumDuration?.toString() || ''
    });
    setHasChanges(false);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (template) => {
    setSelectedTemplate(template);
    setDeleteConfirmOpen(true);
  };

  const closeDialogs = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setDeleteConfirmOpen(false);
    setSelectedTemplate(null);
    setFormData({
      experienceDescription: '',
      minimumDuration: ''
    });
    setHasChanges(false);
  };

  const handleCreate = async () => {
    if (!formData.experienceDescription.trim()) {
      setAlertMessage('Experience description is required');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    try {
      setSubmitting(true);
      
      const templateData = {
        experienceDescription: formData.experienceDescription.trim(),
        minimumDuration: parseFloat(formData.minimumDuration) || 0
      };

      const response = await fetch('http://localhost:5000/ManageContents/experience-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(templateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Experience template created successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
        
        closeDialogs();
        await loadExperienceTemplates();
        
      } else {
        throw new Error(result.error || 'Failed to create experience template');
      }
      
    } catch (error) {
      console.error('Failed to create experience template:', error);
      setAlertMessage(`Failed to create experience template: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate || !formData.experienceDescription.trim()) {
      setAlertMessage('Experience description is required');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    try {
      setSubmitting(true);
      
      const updateData = {
        experienceDescription: formData.experienceDescription.trim(),
        minimumDuration: parseFloat(formData.minimumDuration) || 0
      };

      const response = await fetch(`http://localhost:5000/ManageContents/experience-templates/${selectedTemplate.experience_templateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Experience template updated successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
        
        closeDialogs();
        await loadExperienceTemplates();
        
      } else {
        throw new Error(result.error || 'Failed to update experience template');
      }
      
    } catch (error) {
      console.error('Failed to update experience template:', error);
      setAlertMessage(`Failed to update experience template: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      setSubmitting(true);
      
      const response = await fetch(`http://localhost:5000/ManageContents/experience-templates/${selectedTemplate.experience_templateID}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Experience template deleted successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
        
        closeDialogs();
        await loadExperienceTemplates();
        
      } else {
        throw new Error(result.error || 'Failed to delete experience template');
      }
      
    } catch (error) {
      console.error('Failed to delete experience template:', error);
      setAlertMessage(`Failed to delete experience template: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <IcTypography variant="body">Loading experience templates...</IcTypography>;
  }

  return (
    <>
      <Header />
      <IcHero
        heading="Experience Template Management"
        secondaryHeading="Manage Experience Templates"
        secondarySubheading="Create and edit reusable experience templates for on-the-job learning"
        aligned="full-width">
        <IcButton 
          slot="interaction"
          variant="primary"
          onClick={openCreateDialog}
        >
          <SlottedSVGTemplate mdiIcon={mdiPlus} />
          Create New Template
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

      <div style={divContainer}>
        {experienceTemplates.length === 0 ? (
          <IcTypography variant="body" style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
            No experience templates found. Create one to get started!
          </IcTypography>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {experienceTemplates.map((template) => (
              <IcCardVertical 
                key={template.experience_templateID}
                style={cardContainer}
                heading={`Experience Template #${template.experience_templateID}`}
                subheading={`Minimum Duration: ${template.minimumDuration} hours`}
                message={template.experienceDescription}
              >
                <SlottedSVGTemplate mdiIcon={mdiClipboardText} />
                <IcStatusTag 
                  slot="interaction-button" 
                  label={`ID: ${template.experience_templateID}`}
                  status="info" 
                />

                <div slot="interaction-controls" style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                  <IcButton 
                    variant="secondary"
                    size="small"
                    onClick={() => openEditDialog(template)}
                  >
                    <SlottedSVGTemplate mdiIcon={mdiPencil} />
                    Edit Template
                  </IcButton>
                  <IcButton 
                    variant="destructive"
                    size="small"
                    onClick={() => openDeleteDialog(template)}
                  >
                    <SlottedSVGTemplate mdiIcon={mdiDelete} />
                    Delete
                  </IcButton>
                </div>
              </IcCardVertical>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <IcDialog
        size="large"
        open={createDialogOpen}
        closeOnBackdropClick={false}
        heading="Create Experience Template"
        buttons="false"
        onIcDialogClosed={closeDialogs}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}>
          <IcTextField 
            value={formData.experienceDescription} 
            onIcInput={(e) => handleFormChange('experienceDescription', e.detail.value)}
            label="Experience Description" 
            rows={4}
            maxCharcters={500}
            fullWidth="full-width" 
            required 
            helperText="Describe the learning experience, objectives, and key activities"
          />
          
          <IcTextField 
            value={formData.minimumDuration} 
            onIcInput={(e) => handleFormChange('minimumDuration', e.detail.value)}
            label="Minimum Duration (hours)" 
            type="number"
            step="0.5"
            min="0"
            fullWidth="full-width" 
            helperText="Recommended minimum time to complete this experience"
          />
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton 
              variant="tertiary" 
              onClick={closeDialogs}
              type="button"
            >
              Cancel
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={submitting || !formData.experienceDescription.trim()}
            >
              <SlottedSVGTemplate mdiIcon={mdiPlus} />
              Create Template
            </IcButton>
          </div>
        </form>
      </IcDialog>

      {/* Edit Dialog */}
      <IcDialog
        size="large"
        open={editDialogOpen}
        closeOnBackdropClick={false}
        heading="Edit Experience Template"
        buttons="false"
        onIcDialogClosed={closeDialogs}>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdate();
        }}>
          <IcTextField 
            value={formData.experienceDescription} 
            onIcInput={(e) => handleFormChange('experienceDescription', e.detail.value)}
            label="Experience Description" 
            rows={4}
            maxCharcters={500}
            fullWidth="full-width" 
            required 
            helperText="Describe the learning experience, objectives, and key activities"
          />
          
          <IcTextField 
            value={formData.minimumDuration} 
            onIcInput={(e) => handleFormChange('minimumDuration', e.detail.value)}
            label="Minimum Duration (hours)" 
            type="number"
            step="0.5"
            min="0"
            fullWidth="full-width" 
            helperText="Recommended minimum time to complete this experience"
          />
          
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton 
              variant="tertiary" 
              onClick={closeDialogs}
              type="button"
            >
              Cancel
            </IcButton>
            <IcButton 
              variant="primary" 
              type="submit"
              disabled={submitting || !hasChanges || !formData.experienceDescription.trim()}
            >
              <SlottedSVGTemplate mdiIcon={mdiCheck} />
              {hasChanges ? 'Update Template' : 'No Changes'}
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
        onIcDialogClosed={closeDialogs}>
        <div>
          <p>Are you sure you want to delete this experience template?</p>
          <p><strong>Template ID:</strong> {selectedTemplate?.experience_templateID}</p>
          <p><strong>Description:</strong> {selectedTemplate?.experienceDescription?.substring(0, 100)}...</p>
          <p style={{ color: '#dc3545' }}>⚠️ This action cannot be undone. The template cannot be deleted if it's currently used in pathways or has employee records.</p>
          <br />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton 
              variant="tertiary" 
              onClick={closeDialogs}
            >
              Cancel
            </IcButton>
            <IcButton 
              variant="destructive" 
              onClick={handleDelete}
              disabled={submitting}
            >
              <SlottedSVGTemplate mdiIcon={mdiDelete} />
              Delete Template
            </IcButton>
          </div>  
        </div>
      </IcDialog>
      
      <Footer />
    </>
  );
};

export default ExperienceTemplateManagement;
