import { useState } from "react";
import Header from "../components/AuthHeader";
import Footer from "../components/HomeFooter";
import SlottedSVGTemplate from "../components/slottedSVGTemplate";
import { IcSectionContainer, IcTextField, IcButton, IcAlert } from "@ukic/react";
import { mdiAccount, mdiLock, mdiEmail } from "@mdi/js";

function Register() {
    const [formData, setFormData] = useState({
        fullName: '',
        role: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, variant: '', title: '', message: '' });

    const handleInputChange = (e) => {
        const target = e.target || e.detail?.value !== undefined ? { name: e.target?.name || e.detail?.name, value: e.detail?.value || e.target?.value } : e.target;
        setFormData({
            ...formData,
            [target.name]: target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAlert({ show: false, variant: '', title: '', message: '' });

        // Get form data directly from form elements as fallback
        const form = e.target;
        const formDataFromForm = new FormData(form);
        const registrationData = {
            fullName: formDataFromForm.get('fullName') || formData.fullName,
            role: formDataFromForm.get('role') || formData.role,
            email: formDataFromForm.get('email') || formData.email,
            password: formDataFromForm.get('password') || formData.password
        };

        const confirmPassword = formDataFromForm.get('confirmPassword') || formData.confirmPassword;

        if (registrationData.password !== confirmPassword) {
            setAlert({
                show: true,
                variant: 'warning',
                title: 'Password Mismatch',
                message: 'Password and Re-enter Password must match.'
            });
            setIsLoading(false);
            return;
        }

        console.log('Registration attempt with data:', registrationData); // Debug log

        try {
            console.log('Making request to backend...'); // Debug log
            
            const response = await fetch('http://localhost:5000/Auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                credentials: 'include',
                body: new URLSearchParams(registrationData)
            });

            console.log('Response received:', response.status, response.ok); // Debug log

            if (response.ok) {
                console.log('Registration successful'); // Debug log
                setAlert({ 
                    show: true, 
                    variant: 'success', 
                    title: 'Registration Successful', 
                    message: 'Your account has been created. You can now log in.' 
                });
                // Clear the form
                setFormData({ fullName: '', role: '', email: '', password: '', confirmPassword: '' });
            } else {
                const result = await response.text();
                console.error('Registration failed with response:', result); // Debug log
                
                // Parse the response to determine error type
                let errorTitle = 'Registration Failed';
                let errorMessage = 'Please try again.';
                let variant = 'error';

                try {
                    // Try to parse as JSON first
                    const errorObj = JSON.parse(result);
                    
                    if (errorObj.errors === 'Email already registered') {
                        errorTitle = 'Email Already Exists';
                        errorMessage = 'This email address is already registered. Please try logging in instead.';
                        variant = 'warning';
                    } else if (errorObj.error && Array.isArray(errorObj.error.errors)) {
                        // Validation errors
                        const validationErrors = errorObj.error.errors;
                        if (validationErrors.some(err => err.msg?.includes('email'))) {
                            errorTitle = 'Invalid Email';
                            errorMessage = 'Please enter a valid email address.';
                            variant = 'warning';
                        } else if (validationErrors.some(err => err.msg?.includes('password'))) {
                            errorTitle = 'Password Too Short';
                            errorMessage = 'Password must be at least 12 characters long.';
                            variant = 'warning';
                        } else {
                            errorTitle = 'Validation Error';
                            errorMessage = validationErrors.map(err => err.msg).join(', ');
                            variant = 'warning';
                        }
                    } else if (errorObj.section) {
                        errorTitle = 'Registration Error';
                        errorMessage = `Error in ${errorObj.section}. Please try again.`;
                    }
                } catch (e) {
                    // Not JSON, use raw text
                    if (result.includes('Email already registered')) {
                        errorTitle = 'Email Already Exists';
                        errorMessage = 'This email address is already registered.';
                        variant = 'warning';
                    } else if (result.includes('password')) {
                        errorTitle = 'Password Error';
                        errorMessage = 'Password must be at least 12 characters long.';
                        variant = 'warning';
                    } else if (result.includes('email')) {
                        errorTitle = 'Email Error';
                        errorMessage = 'Please enter a valid email address.';
                        variant = 'warning';
                    } else {
                        errorMessage = result;
                    }
                }

                setAlert({ 
                    show: true, 
                    variant: variant, 
                    title: errorTitle, 
                    message: errorMessage 
                });
            }
        } catch (error) {
            console.error('Network error during registration:', error);
            setAlert({ 
                show: true, 
                variant: 'error', 
                title: 'Connection Error', 
                message: 'Unable to connect to the server. Please check your internet connection and try again.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Header />

            <IcSectionContainer aligned="left">
                {alert.show && (
                    <IcAlert
                        variant={alert.variant}
                        heading={alert.title}
                        message={alert.message}
                        dismissible
                        onIcAlertDismissed={() => setAlert({ show: false, variant: '', title: '', message: '' })}
                        style={{ marginBottom: '20px' }}
                    />
                )}
                <form onSubmit={handleSubmit} id="registration">
                    <IcTextField 
                        maxLength={32} 
                        type="text" 
                        label="Name" 
                        name="fullName" 
                        required 
                        placeholder="Please enter…"
                        value={formData.fullName}
                        onIcInput={handleInputChange}
                        onChange={handleInputChange}
                    >
                        <SlottedSVGTemplate mdiIcon={mdiAccount} />
                    </IcTextField>
                    <IcTextField 
                        maxLength={20} 
                        type="text" 
                        label="Role" 
                        name="role" 
                        required 
                        placeholder="e.g. employee, admin, manager"
                        value={formData.role}
                        onIcInput={handleInputChange}
                        onChange={handleInputChange}
                    />
                    <IcTextField 
                        maxLength={50} 
                        type="email" 
                        label="Email" 
                        name="email" 
                        required 
                        placeholder="Please enter…"
                        value={formData.email}
                        onIcInput={handleInputChange}
                        onChange={handleInputChange}
                    >
                        <SlottedSVGTemplate mdiIcon={mdiEmail} />
                    </IcTextField>
                    <IcTextField 
                        maxLength={32} 
                        minLength={12} 
                        type="password" 
                        label="Password" 
                        name="password" 
                        required 
                        placeholder="Minimum 12 characters"
                        value={formData.password}
                        onIcInput={handleInputChange}
                        onChange={handleInputChange}
                    >
                        <SlottedSVGTemplate mdiIcon={mdiLock} />
                    </IcTextField>
                    <IcTextField 
                        maxLength={32} 
                        minLength={12} 
                        type="password" 
                        label="Re-enter Password" 
                        name="confirmPassword" 
                        required 
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onIcInput={handleInputChange}
                        onChange={handleInputChange}
                    >
                        <SlottedSVGTemplate mdiIcon={mdiLock} />
                    </IcTextField>
                    <IcButton 
                        variant="primary" 
                        type="submit" 
                        disabled={isLoading || (formData.password !== '' && formData.confirmPassword !== '' && formData.password !== formData.confirmPassword)}
                        style={{ marginTop: '16px' }}
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </IcButton>
                </form>
            </IcSectionContainer>

            <Footer />
        </>
    );
}

export default Register;
