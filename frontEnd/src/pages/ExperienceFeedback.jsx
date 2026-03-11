import React, { useEffect, useState } from "react";
import { IcButton, IcCardVertical, IcDialog, IcHero, IcStatusTag, IcTextField, IcTypography, IcAlert } from "@ukic/react";
import { mdiCommentQuoteOutline, mdiPuzzleOutline, mdiToggleSwitch, mdiToggleSwitchOff } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";
import Header from "../components/ContentManagementHeader";
import Footer from "../components/ITRFooter";
import { divContainer, cardContainer } from "../styles/containerLayout";
import { fetchData } from "../commonFunctions/api";
import { extractEmployeesIDList, extractEmployeesExperienceIDList, filterAwaitingFeedbackIndices, filterFeedbackList } from "../commonFunctions/commonFeedbackUtilities";

function ExperienceFeedback() {
    const [data, setData] = useState([]);
    const [showOnlyAwaiting, setShowOnlyAwaiting] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');
    
    useEffect(() => {
        fetchData("/feedback")
            .then(data => setData(data.feedback))
            .catch(err => console.error(err));
    }, []);

    const [dialogIndex, setDialogIndex] = useState("");
    const handleButtonClick = (index) => {
        setDialogIndex(index);
        setOpenRecordRefereeFeedbackDialog(true);
    }

    const [openRecordRefereeFeedbackDialog, setOpenRecordRefereeFeedbackDialog] = useState(false);
    const handleRecordRefereeFeedbackDialogClose = () => {
        setOpenRecordRefereeFeedbackDialog(false);
        setDialogIndex(null);
    }

    const handleSubmitRefereeFeedback = async () => {
        try {
            setSubmittingFeedback(true);
            
            const form = document.getElementById('recordRefereeFeedback');
            const formData = new FormData(form);
            const feedbackData = {
                recordRefereeFeedback: formData.get('recordRefereeFeedback'),
                employeeIndex: employeesIDList[dialogIndex],
                employeeExperienceIndex: employeesExperienceIDList[dialogIndex]
            };
            
            console.log('Submitting referee feedback:', feedbackData);
            
            const response = await fetch('http://localhost:5000/Feedback/recordRefereeFeedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(feedbackData)
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log('Referee feedback recorded successfully:', result);
                setAlertMessage('Feedback submitted successfully!');
                setAlertType('success');
                setAlertVisible(true);
                setTimeout(() => {
                    setAlertVisible(false);
                }, 3000);
                handleRecordRefereeFeedbackDialogClose();
                // Refresh the data
                const refreshedData = await fetchData("/feedback");
                setData(refreshedData.feedback);
                // Reset form
                form.reset();
            } else {
                console.error('Failed to submit referee feedback:', result);
                setAlertMessage(`Failed to submit feedback: ${result.errors || 'Please try again.'}`);
                setAlertType('error');
                setAlertVisible(true);
                setTimeout(() => {
                    setAlertVisible(false);
                }, 5000);
            }
            
        } catch (error) {
            console.error('Error submitting referee feedback:', error);
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

    let employeesIDList = extractEmployeesIDList(data);
    let employeesExperienceIDList = extractEmployeesExperienceIDList(data);
    let awaitingFeedbackFilter = filterAwaitingFeedbackIndices(data);
    let filteredFeedbackList = filterFeedbackList(data);
    
    // Apply filtering based on toggle
    let dataSubset = showOnlyAwaiting ? filteredFeedbackList : data;
    const awaitingCount = awaitingFeedbackFilter.length;
    const totalCount = data.length;
    
    return (
        <> {/* Main container */}
            <Header />
            <IcHero
                heading="Experience Feedback"
                subheading="Provide feedback on employee experiences as their referee"
                secondaryHeading={`You have ${awaitingCount} feedback requests awaiting response`}
                aligned="full-width">
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
            
            <div style={{ textAlign: 'center', marginBottom: '16px', color: '#666' }}>
                <IcTypography variant="body">
                    You have {totalCount} total experience requests
                </IcTypography>
            </div>
            
            <div style={divContainer}>
                <IcButton 
                    variant={showOnlyAwaiting ? "primary" : "secondary"}
                    onClick={() => setShowOnlyAwaiting(!showOnlyAwaiting)}
                    style={{ marginBottom: '16px' }}
                >
                    <SlottedSVGTemplate mdiIcon={showOnlyAwaiting ? mdiToggleSwitch : mdiToggleSwitchOff} />
                    Show only requests awaiting response
                </IcButton>
            </div>
            
            {dataSubset.length === 0 ? (
                <IcTypography variant="body">No experience feedback requests requiring your attention.</IcTypography>
            ) : (
                dataSubset.map((d, i) => {
                    return (
                        <div key={i} style={divContainer}>
                            <div>
                                <IcCardVertical style={cardContainer} heading={d.experienceDescription} subheading={"Start date of Experience [ " + d.recordDate + " ] | Duration (days) [ " + d.duration + " ]"}>
                                    <>
                                        <SlottedSVGTemplate mdiIcon={mdiPuzzleOutline} />
                                        <IcTypography slot="adornment" variant="label-uppercase">{`${d.username}'s feedback on their experience`}</IcTypography>
                                        <IcTypography slot="adornment">{d.employeeText}</IcTypography>

                                        {d.refereeText != null ? (
                                            <>
                                                <IcStatusTag slot="interaction-button" label="Feedback Sent" status="success" />
                                                <IcTypography slot="adornment" variant="label-uppercase">{`Your feedback on ${d.username}'s experience`}</IcTypography>
                                                <IcTypography slot="adornment">{d.refereeText}</IcTypography>
                                            </>
                                        ) : (
                                            <>
                                                <IcStatusTag slot="interaction-button" label="Awaiting your feedback" status="warning" />
                                                <div slot="interaction-controls" style={{ display: "flex", gap: "16px" }}>
                                                    <IcButton onClick={() => handleButtonClick(i)} variant="primary">Draft Feedback
                                                        <SlottedSVGTemplate mdiIcon={mdiCommentQuoteOutline} />
                                                    </IcButton>
                                                </div>
                                            </>
                                        )}
                                    </>
                                </IcCardVertical>
                            </div>
                        </div>
                    );
                })
            )}
            
            <Footer />
            <IcDialog
                size="large"
                open={openRecordRefereeFeedbackDialog}
                closeOnBackdropClick={false}
                heading="Record your feedback on your referer's experience here."
                disableHeightConstraint={true}
                onIcDialogClosed={openRecordRefereeFeedbackDialog && handleRecordRefereeFeedbackDialogClose}
                onIcDialogConfirmed={handleSubmitRefereeFeedback}
            >
                <form id="recordRefereeFeedback">
                    <IcTextField name="recordRefereeFeedback" style={cardContainer} rows={3} label={"Remember the Service's values of CREATIVITY, COURAGE, INTEGRITY and RESPECT. Be clear, specific and constructive."} placeholder="Describe how you think it went here (ACTION & RESULT)." type="text" minCharacters="4" maxLength="256" fullWidth="full-width" required />
                </form>
            </IcDialog>
        </>
    )
}

export default ExperienceFeedback;
