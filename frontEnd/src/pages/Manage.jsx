import { useEffect, useState } from "react";
import { IcCard, IcSectionContainer, IcTabContext, IcTabGroup, IcTab, IcTabPanel, IcHero, IcButton } from "@ukic/react";
import { mdiAccountDetails, mdiBookOpenPageVariant } from "@mdi/js";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";
import Header from "../components/ITRHeader";
import Footer from "../components/ITRFooter";
import CourseManagement from "./CourseManagement";
import AssessmentManagement from "./AssessmentManagement";
import PathwayManagement from "./PathwayManagement";

import { fetchData } from "../commonFunctions/api";

function Manage() {
  const [pathwaysList, setPathwaysList] = useState([]);

  useEffect(() => {
    fetchData("/manageContents/pathwaysList")
      .then(({ pathwaysList }) => setPathwaysList(pathwaysList))
      .catch(err => console.error(err));
  }, []);

  const divContainer = {
    display: `flex`,
    flexWrap: `wrap`
  }
  const sectionContainer = {
    width: "100%",
    margin: `var(--ic-space-xs)`,
    gutter: `var(--ic-space-xs)`,
    padding: `var(--ic-space-xs)`
  };
  const cardContainer = {
    margin: `var(--ic-space-xs)`,
    gutter: `var(--ic-space-xs)`
  };

  return (
    <>
      <Header />
      <IcHero
        heading="Record & Catalogue"
        secondaryHeading="Access your personal record and browse available content"
        aligned="full-width"
      />
      
      {/* Record and Catalogue Cards */}
      <div style={divContainer}>
        <IcSectionContainer type="center" style={sectionContainer}>
          <IcCard 
            fullWidth="true" 
            style={cardContainer} 
            heading="Your Record" 
            subheading="View your completed courses, assessments, and pathway progress"
            clickable="true"
            onClick={() => window.location.href = '/Record'}
          >
            <SlottedSVGTemplate mdiIcon={mdiAccountDetails} />
            <div slot="interaction-controls" style={{ display: "flex", gap: "16px" }}>
              <IcButton variant="primary" onClick={() => window.location.href = '/Record'}>
                View Record
              </IcButton>
            </div>
          </IcCard>
          
          <IcCard 
            fullWidth="true" 
            style={cardContainer} 
            heading="Course Catalogue" 
            subheading="Browse and enroll in available courses, assessments, and pathways"
            clickable="true"
            onClick={() => window.location.href = '/CourseCatalogue'}
          >
            <SlottedSVGTemplate mdiIcon={mdiBookOpenPageVariant} />
            <div slot="interaction-controls" style={{ display: "flex", gap: "16px" }}>
              <IcButton variant="primary" onClick={() => window.location.href = '/CourseCatalogue'}>
                Browse Catalogue
              </IcButton>
            </div>
          </IcCard>
        </IcSectionContainer>
      </div>

      {/* Management Section */}
      <IcHero
        heading="Management"
        secondaryHeading="Manage courses, assessments, and pathways under your supervision"
        aligned="full-width"
      />
      
      <div style={divContainer}>
        <IcSectionContainer type="center" style={sectionContainer}>
          <IcCard fullWidth="true" style={cardContainer}>
            <IcTabContext>
              <IcTabGroup label="Management Options">
                <IcTab>Course Management</IcTab>
                <IcTab>Assessment Management</IcTab>
                <IcTab>Pathway Management</IcTab>
              </IcTabGroup>
              
              <IcTabPanel>
                <CourseManagement />
              </IcTabPanel>
              
              <IcTabPanel>
                <AssessmentManagement />
              </IcTabPanel>
              
              <IcTabPanel>
                <PathwayManagement />
              </IcTabPanel>
            </IcTabContext>
          </IcCard>
        </IcSectionContainer>
      </div>

      <Footer />
    </>
  );
}

export default Manage;