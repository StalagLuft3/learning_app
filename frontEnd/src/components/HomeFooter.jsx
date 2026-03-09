import { IcFooter, IcBackToTop, IcClassificationBanner, IcFooterLink } from "@ukic/react";

function Footer() {
    return (
        <>
            <IcBackToTop />
            <IcFooter>
                <IcFooterLink slot="link" href="/Login">Login</IcFooterLink>
                <IcFooterLink slot="link" href="/Register">Register</IcFooterLink>
            </IcFooter>
            <IcClassificationBanner classification="official"></IcClassificationBanner>
        </>
    )
}

export default Footer