import { SlottedSVG, IcTopNavigation, IcNavigationButton } from "@ukic/react";
import { mdiEmailFast, mdiLightningBolt } from "@mdi/js";
import SlottedSVGTemplate from "./slottedSVGTemplate";

function AuthHeader() {
  return (
    <>
      <IcTopNavigation appTitle="C (R) I T R" status="LOGIN" version="v0.2" href="/Login">
        <SlottedSVG slot="app-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000" rotate="90">
          <path d="M0 0h24v24H0V0z" fill="none" />
          <path d={mdiLightningBolt} />
        </SlottedSVG>
        <IcNavigationButton label="Feedback" slot="buttons" href="mailto:made.up@email.com?subject=Feedback%20from%20C%28R%29ITR?body=Hey">
          <SlottedSVGTemplate mdiIcon={mdiEmailFast} />
        </IcNavigationButton>
        {/* No navigation items for unauthenticated users */}
      </IcTopNavigation>
    </>
  )
}

export default AuthHeader