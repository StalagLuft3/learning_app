import { useState } from "react";
import Header from "../components/AuthHeader";
import Footer from "../components/HomeFooter";
import { IcSectionContainer, IcTextField, IcButton, IcAlert } from "@ukic/react";

function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
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
        const loginData = {
            email: formDataFromForm.get('email') || formData.email,
            password: formDataFromForm.get('password') || formData.password
        };

        console.log('Login attempt with data:', loginData); // Debug log

        try {
            console.log('Making request to backend...'); // Debug log
            
            const response = await fetch('http://localhost:5000/Auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                credentials: 'include',
                body: new URLSearchParams(loginData)
            });

            console.log('Response received:', response.status, response.ok); // Debug log

            if (response.ok) {
                const result = await response.json();
                console.log('Login successful, result:', result); // Debug log
                
                setAlert({ 
                    show: true, 
                    variant: 'success', 
                    title: 'Login Successful', 
                    message: 'Redirecting to homepage...' 
                });
                
                // Wait a bit to ensure cookie is properly set, then redirect
                setTimeout(() => {
                    console.log('Redirecting to:', result.redirectTo || '/Home');
                    // Use hash-based navigation to ensure proper routing
                    window.location.replace(result.redirectTo || '/Home');
                }, 1000);
            } else {
                const result = await response.text();
                console.error('Login failed with response:', result); // Debug log
                
                // Parse the response to determine error type
                let errorTitle = 'Login Failed';
                let errorMessage = 'Please try again.';
                let variant = 'error';

                if (result.includes('Login Email not found')) {
                    errorTitle = 'User Not Found';
                    errorMessage = 'This email address is not registered in our system. Please check your email or register for a new account.';
                    variant = 'warning';
                } else if (result.includes('Incorrect Password')) {
                    errorTitle = 'Incorrect Password';
                    errorMessage = 'The password you entered is incorrect. Please try again.';
                    variant = 'warning';
                } else if (result.includes('section')) {
                    // Parse JSON error response
                    try {
                        const errorObj = JSON.parse(result);
                        if (errorObj.section === 'Login Email not found error') {
                            errorTitle = 'User Not Found';
                            errorMessage = 'This email address is not registered in our system.';
                            variant = 'warning';
                        } else if (errorObj.section === 'Incorrect Password') {
                            errorTitle = 'Incorrect Password';
                            errorMessage = 'The password you entered is incorrect.';
                            variant = 'warning';
                        }
                    } catch (e) {
                        // Use default error message
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
            console.error('Network error during login:', error);
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
                <form onSubmit={handleSubmit} id="login">
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
                    />
                    <IcTextField 
                        maxLength={32} 
                        type="password" 
                        label="Password" 
                        name="password" 
                        required 
                        placeholder="Please enter…"
                        value={formData.password}
                        onIcInput={handleInputChange}
                        onChange={handleInputChange}
                    />
                    <IcButton 
                        variant="primary" 
                        type="submit" 
                        disabled={isLoading}
                        style={{ marginTop: '16px' }}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </IcButton>
                </form>
            </IcSectionContainer>
            <Footer />
        </>
    );
}

export default Login;
