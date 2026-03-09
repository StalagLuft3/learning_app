import { SlottedSVG, IcTopNavigation, IcNavigationButton, IcNavigationItem } from "@ukic/react";
import { mdiLightningBolt, mdiEmailFast } from "@mdi/js";
import SlottedSVGTemplate from "./slottedSVGTemplate";

function Header() {

  return (
    <>
      <IcTopNavigation appTitle="C (R) I T R" status="Individual Training Record" version="v0.1" href="/Home">
        <SlottedSVG slot="app-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000" rotate="90">
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d={mdiLightningBolt} />
        </SlottedSVG>
        <IcNavigationButton label="Feedback" slot="buttons" href="mailto:made.up@email.com?subject=Feedback%20from%20C%28R%29ITR?body=Hey">
        <SlottedSVGTemplate mdiIcon={mdiEmailFast} />
        </IcNavigationButton>
        <IcNavigationItem slot="navigation" label="Your Record" href="/Record" />
        <IcNavigationItem slot="navigation" label="Pathways" href="/Pathways" />
        <IcNavigationItem slot="navigation" label="Individual Courses" href="/Courses" />
        <IcNavigationItem slot="navigation" label="Individual Assessments" href="/Assessments" />
        <IcNavigationItem slot="navigation" label="Pathway Management" href="/PathwayManagement" />
        <IcNavigationItem slot="navigation" label="Course Management" href="/CourseManagement" />
        <IcNavigationItem slot="navigation" label="Assessment Management" href="/AssessmentManagement" />
        <IcNavigationItem slot="navigation" label="Feedback Management" href="/ExperienceFeedback" />
      </IcTopNavigation>

    </>
  )
}

export default Header