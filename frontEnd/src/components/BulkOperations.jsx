import React, { useState } from "react";
import { IcButton, IcCardVertical, IcSelect, IcCheckbox, IcTypography, IcAlert, IcTextField } from "@ukic/react";
import { mdiSelectAll, mdiSelectOff, mdiCheck, mdiClose } from "@mdi/js";
import SlottedSVGTemplate from "./slottedSVGTemplate";
import { cardContainer } from "../styles/containerLayout";

const BulkOperations = ({ 
  enrollments, 
  onBulkUpdate, 
  isSubmitting = false, 
  type = 'course'
}) => {
  const [selectedEnrollments, setSelectedEnrollments] = useState([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkScore, setBulkScore] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  const handleSelectAll = () => {
    if (selectedEnrollments.length === enrollments.length) {
      setSelectedEnrollments([]);
    } else {
      setSelectedEnrollments(enrollments.map(e => getEnrollmentId(e)));
    }
  };

  const handleSelectEnrollment = (enrollmentId, isChecked) => {
    if (isChecked) {
      setSelectedEnrollments([...selectedEnrollments, enrollmentId]);
    } else {
      setSelectedEnrollments(selectedEnrollments.filter(id => id !== enrollmentId));
    }
  };

  const getEnrollmentId = (enrollment) => {
    if (type === 'course') return enrollment.employee_courseID;
    if (type === 'assessment') return enrollment.employee_assessmentID;
    if (type === 'pathway') return enrollment.pathway_employeeID;
    return enrollment.id;
  };

  const handleBulkUpdate = async () => {
    if (selectedEnrollments.length === 0) {
      setAlertMessage('Please select at least one enrollment to update.');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    if (!bulkStatus) {
      setAlertMessage('Please select a status to apply.');
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    try {
      const updateData = {
        enrollmentIds: selectedEnrollments,
        newStatus: bulkStatus,
        ...(bulkScore && { score: parseInt(bulkScore) })
      };

      await onBulkUpdate(updateData);
      
      // Reset selection and close panel
      setSelectedEnrollments([]);
      setShowBulkPanel(false);
      setBulkStatus('');
      setBulkScore('');
      
      setAlertMessage(`Successfully updated ${selectedEnrollments.length} enrollment(s).`);
      setAlertType('success');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
    } catch (error) {
      setAlertMessage(`Failed to update enrollments: ${error.message}`);
      setAlertType('warning');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 5000);
    }
  };

  const getStatusOptions = () => {
    if (type === 'course') {
      return [
        { label: 'Enrolled', value: 'Enrolled' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Withdrawn', value: 'Withdrawn' }
      ];
    } else if (type === 'assessment') {
      return [
        { label: 'Enrolled', value: 'Enrolled' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Passed', value: 'Passed' },
        { label: 'Failed', value: 'Failed' },
        { label: 'Withdrawn', value: 'Withdrawn' }
      ];
    } else if (type === 'pathway') {
      return [
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Withdrawn', value: 'Withdrawn' }
      ];
    }
    return [];
  };

  if (enrollments.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      {alertVisible && (
        <IcAlert
          variant={alertType}
          heading={alertType === 'success' ? 'Success' : 'Warning'}
          message={alertMessage}
          dismissible={true}
          onIcDismiss={() => setAlertVisible(false)}
          style={{ marginBottom: '16px' }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <IcButton
            variant="secondary"
            size="small"
            onClick={handleSelectAll}
          >
            <SlottedSVGTemplate mdiIcon={selectedEnrollments.length === enrollments.length ? mdiSelectOff : mdiSelectAll} />
            {selectedEnrollments.length === enrollments.length ? 'Deselect All' : 'Select All'}
          </IcButton>
          
          {selectedEnrollments.length > 0 && (
            <IcTypography variant="body">
              {selectedEnrollments.length} selected
            </IcTypography>
          )}
        </div>

        {selectedEnrollments.length > 0 && (
          <IcButton
            variant="primary"
            size="small"
            onClick={() => setShowBulkPanel(!showBulkPanel)}
          >
            Bulk Update ({selectedEnrollments.length})
          </IcButton>
        )}
      </div>

      {showBulkPanel && (
        <IcCardVertical
          heading="Bulk Update Operations"
          subheading={`Update ${selectedEnrollments.length} selected enrollment(s)`}
          style={{ ...cardContainer, marginBottom: '16px' }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <IcSelect
              label="New Status"
              value={bulkStatus}
              onIcChange={(e) => setBulkStatus(e.detail.value)}
              options={getStatusOptions()}
              style={{ width: '180px' }}
            />
            
            {type === 'assessment' && (
              <IcTextField
                label="Score (optional)"
                value={bulkScore}
                onIcInput={(e) => setBulkScore(e.detail.value)}
                type="number"
                style={{ width: '120px' }}
              />
            )}
            
            <IcButton
              variant="primary"
              onClick={handleBulkUpdate}
              disabled={isSubmitting || !bulkStatus}
            >
              <SlottedSVGTemplate mdiIcon={mdiCheck} />
              Apply to Selected
            </IcButton>
            
            <IcButton
              variant="secondary"
              onClick={() => setShowBulkPanel(false)}
            >
              <SlottedSVGTemplate mdiIcon={mdiClose} />
              Cancel
            </IcButton>
          </div>
        </IcCardVertical>
      )}

      {/* Render enrollment selection checkboxes */}
      <div style={{ display: 'none' }}>
        {enrollments.map((enrollment, index) => {
          const enrollmentId = getEnrollmentId(enrollment);
          return (
            <IcCheckbox
              key={index}
              checked={selectedEnrollments.includes(enrollmentId)}
              onIcCheck={(e) => handleSelectEnrollment(enrollmentId, e.detail.checked)}
              style={{ margin: '8px' }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BulkOperations;
