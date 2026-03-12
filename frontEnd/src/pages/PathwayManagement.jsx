import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcTextField, IcTypography, IcSelect, IcAlert, IcHero, IcTabContext, IcTabGroup, IcTab, IcTabPanel, IcSectionContainer, IcDialog, IcSearchBar, IcAccordion } from "@ukic/react";
import { mdiAccountCheck, mdiCheckDecagramOutline, mdiPencil, mdiCheck, mdiClose, mdiChartLine, mdiPlus, mdiNavigationVariantOutline, mdiDelete, mdiBook, mdiPuzzleOutline } from "@mdi/js";
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
  const [activeTab, setActiveTab] = useState(null);
  const [createPathwayDialogOpen, setCreatePathwayDialogOpen] = useState(false);
  const [createPathwayFormData, setCreatePathwayFormData] = useState({
    pathwayName: '',
    pathwayDescription: ''
  });

  // Content management states
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [contentDialogType, setContentDialogType] = useState(''); // 'courses', 'assessments', 'pathways'
  const [availableContent, setAvailableContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [currentPathwayForContent, setCurrentPathwayForContent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Experience creation states
  const [createExperienceDialogOpen, setCreateExperienceDialogOpen] = useState(false);
  const [experienceFormData, setExperienceFormData] = useState({
    experienceDescription: '',
    minimumDuration: ''
  });
  const [currentPathwayForExperience, setCurrentPathwayForExperience] = useState(null);

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

      const rawResponse = await response.text();
      let result = {};
      try {
        result = rawResponse ? JSON.parse(rawResponse) : {};
      } catch (parseError) {
        if (!response.ok) {
          throw new Error('Server returned a non-JSON error response. If backend changes were just made, restart the backend server and try again.');
        }
      }
      
      if (response.ok) {
        setAlertMessage(`${enrollment.username} has been removed from this pathway.`);
        setAlertType('success');
        setAlertVisible(true);
        
        setTimeout(() => {
          setAlertVisible(false);
        }, 3000);
        
        await loadManagedPathways();
        handleCancelEdit();
        
      } else {
        throw new Error(result.error || result.message || `Failed to update enrollment (HTTP ${response.status})`);
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

  const formatEnrollmentDate = (dateValue) => {
    if (!dateValue) return 'Unknown Date';
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return String(dateValue);
    return parsedDate.toLocaleDateString('en-GB');
  };

  const getUnitsCompletionPercentage = (enrollment) => {
    const totalUnits = Number(enrollment?.totalComponents) || 0;
    const completedUnits = Number(enrollment?.completedComponents) || 0;
    if (totalUnits <= 0) return 0;
    return Math.round((Math.min(completedUnits, totalUnits) / totalUnits) * 100);
  };

  // ===== CONTENT MANAGEMENT FUNCTIONS =====

  const openContentDialog = async (pathwayId, contentType) => {
    setCurrentPathwayForContent(pathwayId);
    setContentDialogType(contentType);
    setContentDialogOpen(true);
    await loadAvailableContent(pathwayId, contentType);
  };

  const loadAvailableContent = async (pathwayId, contentType) => {
    setLoadingContent(true);
    console.log(`=== LOADING AVAILABLE CONTENT ===`);
    console.log(`Pathway ID: ${pathwayId}, Content Type: ${contentType}`);
    
    try {
      let endpoint = '';
      switch (contentType) {
        case 'courses':
          endpoint = `http://localhost:5000/ManageContents/pathways/${pathwayId}/available-courses`;
          break;
        case 'assessments':
          endpoint = `http://localhost:5000/ManageContents/pathways/${pathwayId}/available-assessments`;
          break;

        case 'pathways':
          endpoint = `http://localhost:5000/ManageContents/pathways/${pathwayId}/available-pathways`;
          break;
        default:
          throw new Error('Unknown content type');
      }

      console.log(`Fetching from endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
      });

      console.log(`Response status: ${response.status}, OK: ${response.ok}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Raw API response:', data);
        
        let content = [];
        switch (contentType) {
          case 'courses':
            content = data.courses || [];
            console.log(`Extracted courses: ${content.length} items`);
            break;
          case 'assessments':
            content = data.assessments || [];
            console.log(`Extracted assessments: ${content.length} items`);
            break;
          case 'pathways':
            content = data.pathways || [];
            console.log(`Extracted pathways: ${content.length} items`);
            break;
        }
        
        console.log(`Final content to set in state:`, content);
        // Filter out content that's already in the pathway
        const availableOnly = content.filter(item => !item.isInPathway);
        console.log(`Available content (not in pathway):`, availableOnly.length, 'items');
        setAvailableContent(availableOnly);
        setFilteredContent(availableOnly);
      } else {
        const errorData = await response.text();
        console.error(`API Error - Status: ${response.status}, Data:`, errorData);
        throw new Error('Failed to load available content');
      }
    } catch (error) {
      console.error('Error loading available content:', error);
      setAlertMessage(`Failed to load available ${contentType}: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    } finally {
      setLoadingContent(false);
    }
  };

  const addContentToPathway = async (contentId, contentType) => {
    try {
      setSubmitting(true);
      
      let endpoint = '';
      let body = {};
      
      switch (contentType) {
        case 'courses':
          endpoint = `http://localhost:5000/ManageContents/pathways/${currentPathwayForContent}/add-course`;
          body = { courseId: contentId };
          break;
        case 'assessments':
          endpoint = `http://localhost:5000/ManageContents/pathways/${currentPathwayForContent}/add-assessment`;
          body = { assessmentId: contentId };
          break;
        default:
          throw new Error('Unknown content type for adding');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage(result.message || `${contentType.slice(0, -1)} added successfully!`);
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
        
        // Refresh the pathway data and available content
        await loadManagedPathways();
        await loadAvailableContent(currentPathwayForContent, contentType);
        
      } else {
        throw new Error(result.error || `Failed to add ${contentType.slice(0, -1)}`);
      }
      
    } catch (error) {
      console.error(`Failed to add ${contentType}:`, error);
      setAlertMessage(`Failed to add ${contentType.slice(0, -1)}: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const removeContentFromPathway = async (contentId, contentType) => {
    try {
      setSubmitting(true);
      
      let endpoint = '';
      
      switch (contentType) {
        case 'courses':
          endpoint = `http://localhost:5000/ManageContents/pathways/${currentPathwayForContent}/remove-course/${contentId}`;
          break;
        case 'assessments':
          endpoint = `http://localhost:5000/ManageContents/pathways/${currentPathwayForContent}/remove-assessment/${contentId}`;
          break;

        default:
          throw new Error('Unknown content type for removal');
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage(result.message || `${contentType.slice(0, -1)} removed successfully!`);
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
        
        // Refresh the pathway data
        await loadManagedPathways();
        
      } else {
        throw new Error(result.error || `Failed to remove ${contentType.slice(0, -1)}`);
      }
      
    } catch (error) {
      console.error(`Failed to remove ${contentType}:`, error);
      setAlertMessage(`Failed to remove ${contentType.slice(0, -1)}: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const addPathwayContent = async (sourcePathwayId) => {
    try {
      setSubmitting(true);
      
      const endpoint = `http://localhost:5000/ManageContents/pathways/${currentPathwayForContent}/copy-from/${sourcePathwayId}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage(result.message || 'Pathway content added successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 5000);
        
        // Close dialog and refresh data
        setContentDialogOpen(false);
        await loadManagedPathways();
        
      } else {
        throw new Error(result.error || 'Failed to add pathway content');
      }
      
    } catch (error) {
      console.error('Failed to add pathway content:', error);
      setAlertMessage(`Failed to add pathway content: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const closeContentDialog = () => {
    setContentDialogOpen(false);
    setContentDialogType('');
    setAvailableContent([]);
    setFilteredContent([]);
    setSelectedContent([]);
    setCurrentPathwayForContent(null);
    setSearchTerm('');
  };

  // Experience creation functions
  const openCreateExperienceDialog = (pathwayId) => {
    setCurrentPathwayForExperience(pathwayId);
    setExperienceFormData({
      experienceDescription: '',
      minimumDuration: ''
    });
    setCreateExperienceDialogOpen(true);
  };

  const closeCreateExperienceDialog = () => {
    setCreateExperienceDialogOpen(false);
    setExperienceFormData({
      experienceDescription: '',
      minimumDuration: ''
    });
    setCurrentPathwayForExperience(null);
  };

  const handleExperienceFormChange = (fieldName, value) => {
    setExperienceFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCreateExperience = async () => {
    if (!experienceFormData.experienceDescription.trim()) {
      setAlertMessage('Please provide an experience description');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    if (experienceFormData.experienceDescription.trim().length < 16) {
      setAlertMessage('Experience description must be at least 16 characters long');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`http://localhost:5000/ManageContents/pathways/${currentPathwayForExperience}/create-experience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          experienceDescription: experienceFormData.experienceDescription,
          minimumDuration: experienceFormData.minimumDuration || 0
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setAlertMessage('Experience template added successfully!');
        setAlertType('success');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
        
        closeCreateExperienceDialog();
        await loadManagedPathways();
        
      } else {
        throw new Error(result.error || 'Failed to add experience template');
      }
      
    } catch (error) {
      console.error('Failed to add experience template:', error);
      setAlertMessage(`Failed to add experience template: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (event) => {
    const term = event.detail.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term) {
      setFilteredContent(availableContent);
    } else {
      const filtered = availableContent.filter(item => {
        let searchableText = '';
        
        switch (contentDialogType) {
          case 'courses':
            searchableText = `${item.courseName} ${item.description} ${item.delivery_method} ${item.delivery_location}`;
            break;
          case 'assessments':
            searchableText = `${item.name} ${item.description} ${item.delivery_method} ${item.delivery_location}`;
            break;
          case 'templates':
            searchableText = `${item.experienceDescription}`;
            break;
          default:
            searchableText = JSON.stringify(item);
        }
        
        return searchableText.toLowerCase().includes(term);
      });
      setFilteredContent(filtered);
    }
  };

  const prepareTableData = () => {
    return filteredContent.map(item => {
      let baseData = {};
      let itemId = null;
      
      switch (contentDialogType) {
        case 'courses':
          baseData = {
            name: item.courseName || 'Untitled Course',
            duration: `${item.duration || 0} days`,
            deliveryMethod: item.delivery_method || 'Not specified',
            deliveryLocation: item.delivery_location || 'Not specified',
            description: item.description || 'No description'
          };
          itemId = item.courseID;
          break;
        case 'assessments':
          baseData = {
            name: item.name || 'Untitled Assessment',
            duration: `${item.duration || 0} days`,
            deliveryMethod: item.delivery_method || 'Not specified',
            deliveryLocation: item.delivery_location || 'Not specified',
            description: item.description || 'No description'
          };
          itemId = item.assessmentID;
          break;
        default:
          baseData = {
            name: 'Unknown Item',
            duration: 'N/A',
            deliveryMethod: 'N/A',
            deliveryLocation: 'N/A',
            description: 'N/A'
          };
          itemId = item.id;
      }
      
      return {
        ...baseData,
        itemId,
        actions: (
          <IcButton 
            size="small"
            variant="primary"
            onClick={() => addContentToPathway(itemId, contentDialogType)}
            disabled={submitting}
          >
            <SlottedSVGTemplate mdiIcon={mdiPlus} />
            Add
          </IcButton>
        )
      };
    });
  };

  const getContentDisplayName = (contentType) => {
    const names = {
      courses: 'Courses',
      assessments: 'Assessments',
      pathways: 'Other Pathways'
    };
    return names[contentType] || contentType;
  };

  const openCreatePathwayDialog = () => {
    setCreatePathwayFormData({
      pathwayName: '',
      pathwayDescription: ''
    });
    setCreatePathwayDialogOpen(true);
  };

  const closeCreatePathwayDialog = () => {
    setCreatePathwayDialogOpen(false);
    setCreatePathwayFormData({
      pathwayName: '',
      pathwayDescription: ''
    });
  };

  const handleCreatePathwayFieldChange = (fieldName, value) => {
    setCreatePathwayFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCreatePathway = async () => {
    const pathwayName = createPathwayFormData.pathwayName.trim();
    const pathwayDescription = createPathwayFormData.pathwayDescription.trim();

    if (pathwayName.length < 4) {
      setAlertMessage('Pathway name must be at least 4 characters long');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    if (pathwayDescription.length < 16) {
      setAlertMessage('Pathway description must be at least 16 characters long');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    try {
      setSubmitting(true);

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

      const result = await response.json();

      if (response.ok) {
        setAlertMessage('Pathway created successfully!');
        setAlertType('success');
        setAlertVisible(true);
        closeCreatePathwayDialog();
        await loadManagedPathways();
        setTimeout(() => setAlertVisible(false), 3000);
      } else {
        throw new Error(result.error || result.errors || 'Failed to create pathway');
      }
    } catch (error) {
      console.error('Failed to create pathway:', error);
      setAlertMessage(`Failed to create pathway: ${error.message || 'Please try again.'}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    } finally {
      setSubmitting(false);
    }
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
          onClick={openCreatePathwayDialog}
        >
          <SlottedSVGTemplate mdiIcon={mdiNavigationVariantOutline} />
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
            <SlottedSVGTemplate mdiIcon={mdiNavigationVariantOutline} />
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
            return (
              <IcTab 
                key={pathway.pathwayID} 
                value={pathway.pathwayID.toString()}
                onClick={() => {
                  console.log('Tab clicked manually:', pathway.pathwayID);
                  setActiveTab(pathway.pathwayID);
                }}
              >
                <SlottedSVGTemplate mdiIcon={mdiNavigationVariantOutline} />
                {pathway.pathwayName}
              </IcTab>
            );
          })}
        </IcTabGroup>

        {managedPathways.map((pathway) => {
          const sortedEnrollments = [...(pathway.enrollments || [])].sort((a, b) => {
            const dateA = new Date(a?.recordDate || 0).getTime();
            const dateB = new Date(b?.recordDate || 0).getTime();
            return dateB - dateA;
          });
          const totalEnrollees = sortedEnrollments.length;
          const completedEnrollees = sortedEnrollments.filter(enrollment => enrollment.currentStatus === 'Completed').length;
          
          return (
            <IcTabPanel key={pathway.pathwayID} value={pathway.pathwayID.toString()}>
              {/* Content Management Section */}
              <div style={{ padding: 'var(--ic-space-xs)', width: '85%' }}>
                {/* Single Add Content Card */}
                <IcCardVertical
                  style={{ ...cardContainer, marginBottom: '24px' }}
                  heading={`Add Content to ${pathway.pathwayName || 'This'}`}
                  subheading="Choose content type to add to this pathway"
                >
                  <SlottedSVGTemplate mdiIcon={mdiPlus} />
                  <div slot="interaction-controls" style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                    <IcButton 
                      variant="primary"
                      onClick={() => {
                        setCurrentPathwayForContent(pathway.pathwayID);
                        openContentDialog(pathway.pathwayID, 'courses');
                      }}
                    >
                      <SlottedSVGTemplate mdiIcon={mdiBook} />
                      Add Courses
                    </IcButton>
                    <IcButton 
                      variant="primary"
                      onClick={() => {
                        setCurrentPathwayForContent(pathway.pathwayID);
                        openContentDialog(pathway.pathwayID, 'assessments');
                      }}
                    >
                      <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
                      Add Assessments
                    </IcButton>
                    <IcButton 
                      variant="primary"
                      onClick={() => openCreateExperienceDialog(pathway.pathwayID)}
                    >
                      <SlottedSVGTemplate mdiIcon={mdiPuzzleOutline} />
                      Add Experience Template
                    </IcButton>
                    <IcButton 
                      variant="primary"
                      onClick={() => {
                        setCurrentPathwayForContent(pathway.pathwayID);
                        openContentDialog(pathway.pathwayID, 'pathways');
                      }}
                    >
                      <SlottedSVGTemplate mdiIcon={mdiNavigationVariantOutline} />
                      Add Pathway
                    </IcButton>
                  </div>
                </IcCardVertical>

                {/* Pathway Contents Section */}
                {((pathway.courses && pathway.courses.length > 0) || 
                  (pathway.assessments && pathway.assessments.length > 0)) && (
                  <IcAccordion heading="Pathway Contents" style={{ marginBottom: '16px' }}>
                    {/* Courses */}
                    {pathway.courses && pathway.courses.length > 0 && (
                      <>
                        {pathway.courses.map((course, idx) => (
                          <div key={`course-${idx}`} style={{ ...divContainer, marginBottom: '16px' }}>
                            <div>
                              <IcCardVertical 
                                fullWidth="true" 
                                style={cardContainer} 
                                heading={course.courseName || 'Untitled Course'} 
                                subheading={`${course.delivery_location || 'N/A'} | ${course.delivery_method || 'N/A'} | ${course.duration || 'N/A'} Day(s) | Course Manager: ${course.manager?.username || 'Unknown'} (${course.manager?.role || 'Unknown'})`} 
                                message={course.description || 'No description available'}
                              >
                                <SlottedSVGTemplate mdiIcon={mdiBook} />
                                <div slot="interaction-controls" style={{ display: "flex", gap: "8px" }}>
                                  <IcButton 
                                    size="small" 
                                    variant="destructive"
                                    onClick={() => {
                                      setCurrentPathwayForContent(pathway.pathwayID);
                                      removeContentFromPathway(course.courseID, 'courses');
                                    }}
                                    disabled={submitting}
                                  >
                                    <SlottedSVGTemplate mdiIcon={mdiDelete} />
                                    Remove
                                  </IcButton>
                                </div>
                              </IcCardVertical>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Assessments */}
                    {pathway.assessments && pathway.assessments.length > 0 && (
                      <>
                        {pathway.assessments.map((assessment, idx) => {
                          const expiry = assessment.expiry ? `${assessment.expiry}` : 'None';
                          return (
                            <div key={`assessment-${idx}`} style={{ ...divContainer, marginBottom: '16px' }}>
                              <div>
                                <IcCardVertical 
                                  fullWidth="true" 
                                  style={cardContainer} 
                                  heading={assessment.name || 'Untitled Assessment'} 
                                  subheading={`${assessment.delivery_location || 'N/A'} | ${assessment.delivery_method || 'N/A'} | ${assessment.duration || 'N/A'} Day(s) | Max Score: ${assessment.max_score || 'N/A'} | Passing Score: ${assessment.passing_score || 'N/A'} | Expiry - Year(s): ${expiry} | Assessment Manager: ${assessment.manager?.username || 'Unknown'} (${assessment.manager?.role || 'Unknown'})`}
                                  message={assessment.description || 'No description available'}
                                >
                                  <SlottedSVGTemplate mdiIcon={mdiCheckDecagramOutline} />
                                  <div slot="interaction-controls" style={{ display: "flex", gap: "8px" }}>
                                    <IcButton 
                                      size="small" 
                                      variant="destructive"
                                      onClick={() => {
                                        setCurrentPathwayForContent(pathway.pathwayID);
                                        removeContentFromPathway(assessment.assessmentID, 'assessments');
                                      }}
                                      disabled={submitting}
                                    >
                                      <SlottedSVGTemplate mdiIcon={mdiDelete} />
                                      Remove
                                    </IcButton>
                                  </div>
                                </IcCardVertical>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                  </IcAccordion>
                )}

                {/* Student Enrollments Section */}
                <IcAccordion heading={`Student Enrollments (${sortedEnrollments.length})`} style={{ marginBottom: '16px' }}>
                    <IcTypography variant="body" style={{ marginBottom: '16px' }}>
                      Enrollees: {totalEnrollees} | Completed: {completedEnrollees}
                    </IcTypography>

                    {sortedEnrollments.length === 0 ? (
                      <IcTypography variant="body" style={{ color: '#666' }}>
                        No enrollees yet.
                      </IcTypography>
                    ) : (
                    <div style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.75fr 1fr 1fr 1fr 1fr 120px',
                        gap: '16px',
                        padding: '16px',
                        backgroundColor: '#f5f5f5',
                        borderBottom: '1px solid #e0e0e0',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        <div>Enrollee</div>
                        <div>Role</div>
                        <div>Enrolled On</div>
                        <div>Time Complete</div>
                        <div>Units Complete</div>
                        <div style={{ textAlign: 'right' }}>Actions</div>
                      </div>

                      {sortedEnrollments.map((enrollment, index) => {
                        const timeCompletion = Number(enrollment?.completionPercentage) || 0;
                        const unitsCompletion = getUnitsCompletionPercentage(enrollment);

                        return (
                          <div
                            key={enrollment.pathway_employeeID || `${enrollment.employeeID}-${index}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.75fr 1fr 1fr 1fr 1fr 120px',
                              gap: '16px',
                              padding: '16px',
                              borderBottom: index < sortedEnrollments.length - 1 ? '1px solid #e0e0e0' : 'none',
                              backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff',
                              alignItems: 'center',
                              fontSize: '14px'
                            }}
                          >
                            <div style={{ fontWeight: '500' }}>{enrollment.username || 'Unknown Student'}</div>
                            <div>{enrollment.role || 'Unknown Role'}</div>
                            <div>{formatEnrollmentDate(enrollment.recordDate)}</div>
                            <div>{timeCompletion}%</div>
                            <div>{unitsCompletion}%</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <IcButton
                                size="small"
                                variant="destructive"
                                onClick={() => handleSubmitEnrollmentUpdate(enrollment, 'Withdrawn')}
                                disabled={submitting}
                              >
                                <SlottedSVGTemplate mdiIcon={mdiDelete} />
                                Remove
                              </IcButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </IcAccordion>
              </div>
            </IcTabPanel>
          );
        })}
      </IcTabContext>

      {/* Edit Dialog */}
      <IcDialog
        size="large"
        open={createPathwayDialogOpen}
        closeOnBackdropClick={false}
        heading="Create a New Pathway"
        hideDefaultControls="true"
        buttons="false"
        onIcDialogClosed={closeCreatePathwayDialog}
      >
        <IcTextField
          value={createPathwayFormData.pathwayName}
          onIcInput={(e) => handleCreatePathwayFieldChange('pathwayName', e.detail.value)}
          label="Pathway Name"
          type="text"
          minCharacters={4}
          maxCharcters={64}
          fullWidth="full-width"
          required
          style={{ marginBottom: '16px' }}
        />
        <IcTextField
          value={createPathwayFormData.pathwayDescription}
          onIcInput={(e) => handleCreatePathwayFieldChange('pathwayDescription', e.detail.value)}
          label="Pathway Description"
          rows={3}
          type="text"
          minCharacters={16}
          maxCharcters={256}
          fullWidth="full-width"
          required
          style={{ marginBottom: '24px' }}
        />

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <IcButton
            variant="tertiary"
            onClick={closeCreatePathwayDialog}
            disabled={submitting}
          >
            Cancel
          </IcButton>
          <IcButton
            variant="primary"
            onClick={handleCreatePathway}
            disabled={
              submitting ||
              createPathwayFormData.pathwayName.trim().length < 4 ||
              createPathwayFormData.pathwayDescription.trim().length < 16
            }
          >
            <SlottedSVGTemplate mdiIcon={mdiNavigationVariantOutline} />
            Create Pathway
          </IcButton>
        </div>
      </IcDialog>

      {/* Edit Dialog */}
      <IcDialog
        size="large"
        open={editDialogOpen}
        closeOnBackdropClick={false}
        heading="Edit Pathway"
        disable-height-constraint='true'
        hideDefaultControls="true"
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
      
      {/* Content Management Dialog */}
      <IcDialog
        size="large"
        open={contentDialogOpen}
        heading={`Manage ${getContentDisplayName(contentDialogType)}`}
        hideDefaultControls={true}
        onIcDialogClosed={closeContentDialog}>
        <div>
          {loadingContent ? (
            <IcTypography variant="body">Loading available {contentDialogType}...</IcTypography>
          ) : (
            <>
              {contentDialogType === 'pathways' ? (
                // Special handling for adding pathways
                <>
                  <IcTypography variant="body" style={{ marginBottom: '16px' }}>
                    Select a pathway to add its entire content (courses, assessments, and experience templates) to the current pathway. 
                    This copies the content only - enrolling students on your pathway does not enroll them on the source pathway.
                  </IcTypography>
                  
                  {availableContent.length === 0 ? (
                    <IcTypography variant="body" style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
                      No other pathways available to add.
                    </IcTypography>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {availableContent.map((pathway) => (
                        <IcCardVertical
                          key={pathway.pathwayID}
                          style={cardContainer}
                          heading={pathway.pathwayName}
                          subheading={`Manager: ${pathway.managerName} (${pathway.managerRole})`}
                          message={`Content: ${pathway.contentCount.courses} courses, ${pathway.contentCount.assessments} assessments, ${pathway.contentCount.experienceTemplates || 0} experience templates`}
                        >
                          <div slot="interaction-controls">
                            <IcButton 
                              variant="primary"
                              size="small"
                              onClick={() => addPathwayContent(pathway.pathwayID)}
                              disabled={submitting}
                            >
                              <SlottedSVGTemplate mdiIcon={mdiNavigationVariantOutline} />
                              Add Pathway Content
                            </IcButton>
                          </div>
                        </IcCardVertical>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Regular content management with data table
                <>
                  <IcTypography variant="body" style={{ marginBottom: '16px' }}>
                    Select {contentDialogType} to add to this pathway. Use the search bar to filter results.
                  </IcTypography>
                  
                  <IcSearchBar 
                    placeholder={`Search ${contentDialogType}...`}
                    onIcInput={handleSearchChange}
                    value={searchTerm}
                    style={{ marginBottom: '16px' }}
                  />
                  
                  {filteredContent.length === 0 ? (
                    <IcTypography variant="body" style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
                      {availableContent.length === 0 
                        ? `No ${contentDialogType} available to add.`
                        : `No ${contentDialogType} match your search.`
                      }
                    </IcTypography>
                  ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {/* Bespoke table implementation */}
                      <div style={{ 
                        border: '1px solid #e0e0e0', 
                        borderRadius: '4px', 
                        overflow: 'hidden',
                        backgroundColor: '#fff'
                      }}>
                        {/* Table Header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                          gap: '16px',
                          padding: '16px',
                          backgroundColor: '#f5f5f5',
                          borderBottom: '1px solid #e0e0e0',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          <div>Name</div>
                          <div>Duration</div>
                          <div>Delivery Method</div>
                          <div>Location</div>
                          <div style={{ textAlign: 'center' }}>Action</div>
                        </div>
                        
                        {/* Table Body */}
                        {filteredContent.map((item, index) => {
                          const tableData = prepareTableData();
                          const row = tableData[index];
                          if (!row) return null;
                          
                          return (
                            <div key={index} style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                              gap: '16px',
                              padding: '16px',
                              borderBottom: index < filteredContent.length - 1 ? '1px solid #e0e0e0' : 'none',
                              backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
                            }}>
                              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                {row.name}
                                {row.description && (
                                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    {row.description.substring(0, 60)}{row.description.length > 60 ? '...' : ''}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '14px' }}>{row.duration}</div>
                              <div style={{ fontSize: '14px' }}>{row.deliveryMethod}</div>
                              <div style={{ fontSize: '14px' }}>{row.deliveryLocation}</div>
                              <div style={{ textAlign: 'center' }}>{row.actions}</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Simple pagination indicator */}
                      {filteredContent.length > 0 && (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '16px', 
                          fontSize: '14px', 
                          color: '#666' 
                        }}>
                          Showing {filteredContent.length} {getContentDisplayName(contentDialogType)}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </IcDialog>
      
      {/* Create Experience Dialog */}
      <IcDialog
        size="medium"
        open={createExperienceDialogOpen}
        heading="Add Experience Template"
        hideDefaultControls={true}
        onIcDialogClosed={closeCreateExperienceDialog}>
        <div>
          <IcTypography variant="body" style={{ marginBottom: '16px' }}>
            Create a unique experience template for this pathway. This will be specific to this pathway only.
          </IcTypography>
          
          <IcTypography variant="label" style={{ marginBottom: '16px', color: '#2c5aa0', fontWeight: '500' }}>
            Recommend using STAR method (SITUATION, TASK, ACTION & RESULT)
          </IcTypography>
          
          <IcTextField 
            value={experienceFormData.experienceDescription} 
            onIcInput={(e) => handleExperienceFormChange('experienceDescription', e.detail.value)}
            label="Experience Description" 
            rows={4}
            minCharacters={16}
            maxCharcters={500}
            fullWidth="full-width" 
            required 
            placeholder="Describe the experience template here using STAR format (SITUATION, TASK, ACTION & RESULT)"
            helperText="Describe the learning experience template, objectives, and key activities students will undertake (minimum 16 characters)"
            style={{ marginBottom: '16px' }}
          />
          
          <IcTextField 
            value={experienceFormData.minimumDuration} 
            onIcInput={(e) => handleExperienceFormChange('minimumDuration', e.detail.value)}
            label="Minimum Duration (days)" 
            type="number"
            step="0.125"
            min="0"
            fullWidth="full-width" 
            placeholder="0.000"
            helperText="Recommended minimum time to complete this experience (in days, increments of 0.125 = 1 hour)"
            style={{ marginBottom: '24px' }}
          />
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <IcButton 
              variant="tertiary" 
              onClick={closeCreateExperienceDialog}
              disabled={submitting}
            >
              Cancel
            </IcButton>
            <IcButton 
              variant="primary" 
              onClick={handleCreateExperience}
              disabled={submitting || !experienceFormData.experienceDescription.trim() || experienceFormData.experienceDescription.trim().length < 16}
            >
              <SlottedSVGTemplate mdiIcon={mdiPuzzleOutline} />
              Add Experience Template
            </IcButton>
          </div>
        </div>
      </IcDialog>
      
      <Footer />
    </>
  );
};

export default PathwayManagement;
