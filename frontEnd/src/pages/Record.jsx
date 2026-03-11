import { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcChip, IcDialog, IcHero, IcPageHeader, IcRadioGroup, IcRadioOption, IcSelect, IcStatusTag, IcTextField, IcTypography, IcAlert } from "@ukic/react";
import { mdiCommentQuoteOutline, mdiCommentQuote, mdiNotebook, mdiCheckCircle, mdiSignDirection, mdiPuzzle, mdiPuzzlePlusOutline, mdiCalendarRange, mdiDownload } from "@mdi/js";
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
  const [tempSelectedPathwayID, setTempSelectedPathwayID] = useState(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [exportType, setExportType] = useState('all');
  const [tempExportType, setTempExportType] = useState('all'); 
  const [banner, setBanner] = useState(null); 
  const [radioSelected, setRadioSelected] = useState("false");
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [dateRangeChip, setDateRangeChip] = useState(null);
  const [tempDateRange, setTempDateRange] = useState({ startDate: '', endDate: '' });
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
  
  // Calculate filtered dataset
  let selectedPathwayList = getSelectedPathwayList(fullRecord, myPathwayDetails, selectedPathwayID); 
  let dataSubset = fullRecord; 
  if (selectedPathwayID !== null && selectedPathwayID !== '') {
    dataSubset = selectedPathwayList
  }
  
  // Apply date range filtering if dates are selected
  if (dateRange.startDate && dateRange.endDate) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    dataSubset = dataSubset.filter(item => {
      const recordDate = new Date(item.recordDate);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  // Calculate course stats from filtered dataset
  const { courseStatsString } = courseRecordStats(dataSubset, getStatusDisplay);

  // Generate dynamic secondary heading based on active filters
  const getDynamicSecondaryHeading = () => {
    // Always show course stats from filtered dataset
    // Filter info is shown in chips below, no need to duplicate here
    return courseStatsString;
  };

  const handleRadioChange = (ev) => {
    setTempSelectedPathwayID(ev.detail.value);
  };

  const handleConfirmPathwayFilter = () => {
    setSelectedPathwayID(tempSelectedPathwayID);
    for (let i = 0; i < enrolledPathways.length; i++) {
      if (enrolledPathways[i]["pathwayID"] == tempSelectedPathwayID) {
        setBanner(enrolledPathways[i])
      }
    }
    closeDialog("pathwayFilter");
  };

  const handleCancelPathwayFilter = () => {
    setTempSelectedPathwayID(selectedPathwayID); // Reset to current selection
    closeDialog("pathwayFilter");
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

  const handleDateRangeConfirm = () => {
    if (tempDateRange.startDate && tempDateRange.endDate) {
      setDateRange({ 
        startDate: tempDateRange.startDate, 
        endDate: tempDateRange.endDate 
      });
      setDateRangeChip({
        startDate: new Date(tempDateRange.startDate).toLocaleDateString(),
        endDate: new Date(tempDateRange.endDate).toLocaleDateString()
      });
    }
    closeDialog("dateRangeFilter");
  };

  const handleTempDateChange = (field, value) => {
    setTempDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getDefaultDateRange = () => {
    if (fullRecord.length === 0) {
      const today = new Date().toISOString().substr(0, 10);
      return { startDate: today, endDate: today };
    }
    
    // Find the earliest record date
    const earliestDate = fullRecord.reduce((earliest, record) => {
      if (!record.recordDate) return earliest;
      const recordDate = new Date(record.recordDate);
      return !earliest || recordDate < earliest ? recordDate : earliest;
    }, null);
    
    const startDate = earliestDate ? earliestDate.toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10);
    const endDate = new Date().toISOString().substr(0, 10); // Today's date
    
    return { startDate, endDate };
  };

  const handleExportRadioChange = (ev) => {
    setTempExportType(ev.detail.value);
  };

  const handleConfirmExport = () => {
    setExportType(tempExportType);
    handleExportRecord(tempExportType);
    closeDialog("exportOptions");
  };

  const handleCancelExport = () => {
    setTempExportType(exportType); // Reset to current selection
    closeDialog("exportOptions");
  };

  const handleExportRecord = (exportType = 'all') => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    // Filter data based on export type
    let exportDataset = dataSubset;
    if (exportType === 'completed') {
      exportDataset = dataSubset.filter(item => {
        const statusInfo = getStatusDisplay(item);
        const safeStatus = getStandardizedStatusLabel(statusInfo?.status)?.toLowerCase();
        return safeStatus === 'completed' || safeStatus === 'complete';
      });
    }
    
    // CSV Header for data
    let csvData = 'Date Completed/Enrolled,Type,Content Name,Description,Your Feedback,Referee Feedback,Duration (Days),Content Manager/Referee\n';
    
    // Add the actual data
    exportDataset.forEach((item) => {
      const recordDate = formatDate(item.recordDate);
      
      if (item.courseID) {
        const statusInfo = getStatusDisplay(item);
        const safeStatus = getStandardizedStatusLabel(statusInfo?.status) || 'Unknown';
        const completedDate = safeStatus.toLowerCase().includes('complete') ? recordDate : recordDate;
        const courseDesc = item.courseDescription || item.description || '';
        
        csvData += `"${completedDate}","Course","${item.courseName}","${courseDesc.replace(/"/g, '""')}","","","${item.duration}","${item.username} (${item.role})"\n`;
        
      } else if (item.assessmentID) {
        const statusInfo = getStatusDisplay(item);
        const safeStatus = getStandardizedStatusLabel(statusInfo?.status) || 'Unknown';
        const completedDate = safeStatus.toLowerCase().includes('complete') ? recordDate : recordDate;
        const scoreInfo = item.scoreAchieved ? `Score: ${item.scoreAchieved}/${item.max_score}` : '';
        
        csvData += `"${completedDate}","Assessment","${item.name}","${(item.description || '').replace(/"/g, '""')}","","${scoreInfo}","${item.duration}","${item.username} (${item.role})"\n`;
        
      } else if (item.employee_experienceID) {
        const statusInfo = getStatusDisplay(item);
        const safeStatus = getStandardizedStatusLabel(statusInfo?.status) || 'Unknown';
        const completedDate = safeStatus.toLowerCase().includes('complete') ? recordDate : recordDate;
        const yourFeedback = item.employeeText || '';
        const refereeFeedback = item.refereeText || '';
        const referee = item.refereeUsername ? `${item.refereeUsername}` : 'No referee assigned';
        
        csvData += `"${completedDate}","Experience","","${(item.experienceDescription || '').replace(/"/g, '""')}","${yourFeedback.replace(/"/g, '""')}","${refereeFeedback.replace(/"/g, '""')}","${item.duration}","${referee}"\n`;
      }
    });
    
    // Add blank separator row
    csvData += `\n`;
    
    // Calculate summary statistics using same logic as recordStats
    let completedItems = 0;
    let completedDays = 0;
    let totalItems = 0;
    let totalDuration = 0;
    
    exportDataset.forEach(item => {
      totalItems += 1;
      totalDuration += (parseFloat(item.duration) || 0);
      
      if (item.currentStatus === "Completed") {
        completedItems += 1;
        completedDays += (parseFloat(item.duration) || 0);
      }
    });
    
    const dates = exportDataset.map(item => new Date(item.recordDate)).filter(date => !isNaN(date));
    const earliestDate = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString() : 'No records';
    const latestDate = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString() : 'No records';
    const dateRangeCovered = dates.length > 0 ? `${earliestDate} to ${latestDate}` : 'No date range';
    
    // Add summary information at the bottom
    csvData += `"EXPORT SUMMARY","","","","","","",""` + '\n';
    csvData += `"Generated on","${currentDate} at ${currentTime}","","","","","",""` + '\n';
    csvData += `"User","${userInfo?.username || 'Unknown'}","","","","","",""` + '\n';
    csvData += `"Export Type","${exportType === 'completed' ? 'Completed Items Only' : 'All Items'}","","","","","",""` + '\n';
    csvData += `"Date Range Covered","${dateRangeCovered}","","","","","",""` + '\n';
    csvData += `"Progress Summary","${completedItems} / ${totalItems} Items ( ${completedDays} / ${totalDuration} Days )","","","","","",""` + '\n';
    
    // Add filter information
    if (banner) {
      csvData += `"Current Pathway","${banner.pathwayName}","${banner.pathwayDescription}","","","","",""` + '\n';
      csvData += `"Pathway Filter","Applied - showing pathway records only","","","","","",""` + '\n';
    } else {
      csvData += `"Current Pathway","No pathway selected","","","","","",""` + '\n';
    }
    if (dateRangeChip) {
      csvData += `"Date Range Filter","${dateRangeChip.startDate} to ${dateRangeChip.endDate}","","","","","",""` + '\n';
    } else {
      csvData += `"Date Range Filter","No date filter applied","","","","","",""` + '\n';
    }
    
    csvData += `"Total Records Exported","${exportDataset.length}","","","","","",""` + '\n';
    
    // Create and download CSV file
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with filters
    let filename = `learning_record_${userInfo?.username || 'user'}_${exportType}_${currentDate.replace(/\//g, '-')}`;
    if (banner) {
      filename += `_${banner.pathwayName.replace(/\s+/g, '_')}`;
    }
    if (dateRangeChip) {
      filename += `_${dateRangeChip.startDate.replace(/\//g, '-')}_to_${dateRangeChip.endDate.replace(/\//g, '-')}`;
    }
    link.download = `${filename}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    closeDialog("exportOptions");
  };
  
  let enrolledPathwaysList = getEnrolledPathwaysList(enrolledPathways).map(
    pathway => <IcRadioOption key={pathway.value} value={pathway.value} label={pathway.label} /> ); 
  
  return (
    <>
      <Header />
      <IcHero heading={`Your Record${userInfo?.username ? `, ${userInfo.username}` : ''}`} aligned="full-width" secondaryHeading={getDynamicSecondaryHeading()} secondarySubheading={"Learning Progress - Courses, Assessments & Experiences"} >
        <IcButton onClick={() => openDialog('recordExperience')} slot="interaction" variant="primary">
          Record Experience
          <SlottedSVGTemplate mdiIcon={mdiPuzzlePlusOutline} />
        </IcButton>
        <IcButton onClick={() => { 
          setTempSelectedPathwayID(selectedPathwayID); 
          if (selectedPathwayID === null) {
            setDialogKey(prev => prev + 1); // Force re-render when no filter active
          }
          openDialog("pathwayFilter"); 
        }} slot="interaction" variant="secondary">
          View by Pathway
          <SlottedSVGTemplate mdiIcon={mdiSignDirection} />
        </IcButton>
        <IcButton onClick={() => { 
          const defaults = getDefaultDateRange(); 
          setTempDateRange(defaults); 
          openDialog("dateRangeFilter"); 
        }} slot="interaction" variant="secondary">
          Set Date Range
          <SlottedSVGTemplate mdiIcon={mdiCalendarRange} />
        </IcButton>
        <IcButton onClick={() => { 
          setTempExportType(exportType); 
          openDialog("exportOptions"); 
        }} slot="interaction" variant="secondary">
          Export Record
          <SlottedSVGTemplate mdiIcon={mdiDownload} />
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
        <IcChip slot="heading-adornment" dismissible="true" label={banner["pathwayName"]}  onIcDismiss={() => {setBanner(null); setSelectedPathwayID(null); setTempSelectedPathwayID(null);}}/>>
        </IcPageHeader>
      ) : (<></>)}

      {dateRangeChip != null ? (
        <IcPageHeader
          size="small"
          sticky="true"
          heading="Date Range Filter Applied"
        >
        <IcChip slot="heading-adornment" dismissible="true" label={`${dateRangeChip.startDate} - ${dateRangeChip.endDate}`} onIcDismiss={() => {setDateRangeChip(null); setDateRange({ startDate: '', endDate: '' });}}/>
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
                <IcCardVertical key={i} style={cardContainer} heading={d.courseName} subheading={`${d.courseDeliveryLocation} | ${d.courseDeliveryMethod} | ${d.duration} Day(s) | Course Manager: ${d.username} (${d.role})`} message={d.courseDescription}>
                  <SlottedSVGTemplate mdiIcon={mdiNotebook} />
                  <IcTypography slot="adornment" variant="subtitle-small">Status as of {formatDate(d.recordDate)}</IcTypography>
                  <IcStatusTag label={safeStatus} status={safeColor} slot="interaction-button" />
                </IcCardVertical>
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
                <IcCardVertical fullWidth="true" key={i} style={cardContainer} heading={d.name} subheading={`${d.delivery_location} | ${d.delivery_method} | ${d.duration} Day(s) | Max Score: ${d.max_score} | Passing Score: ${d.passing_score} | Expiry - Year(s): ${expiry} | Assessment Manager: ${d.username} (${d.role})`} message={d.description}>
                  <SlottedSVGTemplate mdiIcon={mdiCheckCircle} />
                  <IcTypography slot="adornment" variant="subtitle-small">Details as of  {formatDate(d.recordDate)}</IcTypography>
                  <IcTypography slot="adornment" variant="subtitle-small">Score Achieved: {scoreAchieved}</IcTypography>
                  <IcStatusTag label={safeStatus} status={safeColor} slot="interaction-button" />
                </IcCardVertical>
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
                <IcCardVertical key={i} style={cardContainer} heading={d.experienceDescription} subheading={+ d.duration + " (days) |  Details as of  " + formatDate(d.recordDate)}>
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
                      <IcTypography slot="adornment" variant="label-uppercase">{`${d.refereeUsername}'s feedback on your experience`}</IcTypography>
                      <IcTypography slot="adornment">{d.refereeText}</IcTypography>
                    </>
                  }
                </IcCardVertical>
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
      disable-height-constraint="true"
      selected={radioSelected}
      onIcDialogClosed={handleCancelPathwayFilter}
      onIcDialogConfirmed={handleConfirmPathwayFilter}
    >
      <IcRadioGroup key={selectedPathwayID === null ? `clean-${dialogKey}` : 'normal'} name='pathwayFilter' label="Your Pathway" value={tempSelectedPathwayID || ''} onIcChange={handleRadioChange}>
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

    <IcDialog
      size="large"
      open={isDialogOpen("dateRangeFilter")}
      closeOnBackdropClick={false}
      heading="Set Date Range for Export"
      onIcDialogClosed={() => closeDialog("dateRangeFilter")}
      onIcDialogConfirmed={handleDateRangeConfirm}
    >
      <IcTypography style={{ marginBottom: '16px' }}>Select a date range to filter your record entries.</IcTypography>
      <IcTextField 
        name="startDate" 
        style={cardContainer} 
        label="Start Date" 
        type="date" 
        fullWidth="full-width" 
        value={tempDateRange.startDate}
        onIcChange={(e) => handleTempDateChange('startDate', e.detail.value)}
        required 
      />
      <IcTextField 
        name="endDate" 
        style={cardContainer} 
        label="End Date" 
        type="date" 
        fullWidth="full-width" 
        value={tempDateRange.endDate}
        onIcChange={(e) => handleTempDateChange('endDate', e.detail.value)}
        required 
      />
    </IcDialog>

    <IcDialog
      size="large"
      open={isDialogOpen("exportOptions")}
      closeOnBackdropClick={true}
      heading="Export Options"
      disable-height-constraint="true"
      onIcDialogClosed={handleCancelExport}
      onIcDialogConfirmed={handleConfirmExport}
    >
      <IcTypography style={{ marginBottom: '16px' }}>Choose what to include in your export:</IcTypography>
      <IcRadioGroup name='exportType' label="Export Type" value={tempExportType} onIcChange={handleExportRadioChange}>
        <IcRadioOption value="all" label="Export All Records" />
        <IcRadioOption value="completed" label="Export Completed Only" />
      </IcRadioGroup>
    </IcDialog>
    </>
  )
};

export default Record;
