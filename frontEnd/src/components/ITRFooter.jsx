import React from "react";
import { IcFooter, IcFooterLink, IcBackToTop, IcClassificationBanner } from "@ukic/react";
import { logout } from '../commonFunctions/auth';

function Footer() {
    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
    };

    return (
        <>
            <IcBackToTop />
            <IcFooter>
                <IcFooterLink slot="link" href="#" onClick={handleLogout}>Logout</IcFooterLink>
            </IcFooter>
            <IcClassificationBanner classification="official"></IcClassificationBanner>
        </>
    )
}

export default Footer
