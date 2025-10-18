import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Register.css';

const Register = () => {
    // Local state for each field
    // Required fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // Optional fields
    const [profilePicture, setProfilePicture] = useState(null);
    const [birthDate, setBirthDate] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');

    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // New state for field-specific errors
    const [fieldErrors, setFieldErrors] = useState({});
    
    // State for password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();

    // Enhanced password validation function
    const validatePassword = (password) => {
        if (password.length < 8) {
            return "Password must be at least 8 characters long";
        }

        // Check if password contains at least one letter and one number
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasLetter || !hasNumber) {
            return "Password must contain both letters and numbers";
        }

        return null; // Valid password
    };

    // Helper function to set field-specific error
    const setFieldError = (field, message) => {
        setFieldErrors(prev => ({
            ...prev,
            [field]: message
        }));
        setErrorMessage(message); // Keep the original global error for backward compatibility
    };

    // Helper function to clear field errors
    const clearFieldErrors = () => {
        setFieldErrors({});
        setErrorMessage('');
    };

    // Validate inputs before sending
    const validateForm = () => {
        clearFieldErrors(); // Clear previous errors
        
        const nameRegex = /^[A-Za-z\u0590-\u05FF\s'-]+$/; // Includes Hebrew, spaces, hyphens
        if (!nameRegex.test(firstName)) {
            setFieldError('firstName', "First name can only contain letters");
            return false;
        } if (!nameRegex.test(lastName)) {
            setFieldError('lastName', "Last name can only contain letters");
            return false;
        }


        // Check if required fields are filled
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            if (!firstName) {
                setFieldError('firstName', "First name is required");
                return false;
            }
            if (!lastName) {
                setFieldError('lastName', "Last name is required");
                return false;
            }
            if (!email) {
                setFieldError('email', "Email is required");
                return false;
            }
            if (!password) {
                setFieldError('password', "Password is required");
                return false;
            }
            if (!confirmPassword) {
                setFieldError('confirmPassword', "Please confirm your password");
                return false;
            }
        }

        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            if (!firstName.trim()) {
                setFieldError('firstName', "First name cannot be empty or spaces only");
                return false;
            }
            if (!lastName.trim()) {
                setFieldError('lastName', "Last name cannot be empty or spaces only");
                return false;
            }
            if (!email.trim()) {
                setFieldError('email', "Email cannot be empty or spaces only");
                return false;
            }
        }

        if (!nameRegex.test(firstName)) {
            setFieldError('firstName', "First name can only contain letters");
            return false;
        }
        
        if (!nameRegex.test(lastName)) {
            setFieldError('lastName', "Last name can only contain letters");
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setFieldError('email', "Invalid email format");
            return false;
        }

        if (email.includes(" ")) {
            setFieldError('email', "Email cannot contain spaces");
            return false;
        }

        // Enhanced password validation
        const passwordError = validatePassword(password);
        if (passwordError) {
            setFieldError('password', passwordError);
            return false;
        }

        if (password !== confirmPassword) {
            setFieldError('confirmPassword', "Passwords do not match");
            return false;
        }

        if (birthDate && new Date(birthDate) > new Date()) {
            setFieldError('birthDate', "Birth date cannot be in the future");
            return false;
        }
      
        if (email.includes(" ")) {
            setFieldError('email', "Email cannot contain spaces");
        }

        // If phone number is provided, validate it contains digits only
        if (phone) {
            const digitsOnly = phone.replace(/-/g, '');
            if (!/^\d{10,11}$/.test(digitsOnly)) {
                setFieldError('phone', "Phone number must contain 10-11 digits (digits only, dash allowed after 3 digits)");
                return false;
            }
        }

        return true;
    };

    // Handle phone number formatting with dash after 3 digits
    const handlePhoneChange = (e) => {
        let value = e.target.value;
        
        // Remove all non-digit characters except dash
        value = value.replace(/[^0-9-]/g, '');
        
        // Remove existing dashes to reformat
        const digitsOnly = value.replace(/-/g, '');
        
        // Add dash after 3 digits if there are more than 3 digits
        if (digitsOnly.length > 3) {
            value = digitsOnly.slice(0, 3) + '-' + digitsOnly.slice(3);
        } else {
            value = digitsOnly;
        }
        
        // Limit to 12 characters (3 digits + dash + 8 more digits max)
        value = value.slice(0, 12);
        
        setPhone(value);
    };

    // Handle profile picture as base64
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePicture(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // Submit registration form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        clearFieldErrors();
        
        const payload = {
            firstName,
            lastName,
            email,
            password,
        };

        if (profilePicture) payload.profilePicture = profilePicture;
        if (birthDate) payload.birthDate = birthDate;
        if (phone) payload.phone = phone;
        if (gender) payload.gender = gender;

        try {
            const response = await fetch("/api/users/register", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 201) {
                navigate('/login');
            } else if (response.status === 413) {
                // Handle payload too large error specifically
                setErrorMessage("Profile picture is too large. Please choose a smaller image.");
            } else {
                const data = await response.json();
                const errorMsg = data?.error || "Registration failed";
                
                // If the error is about email already registered, show it next to email field
                if (errorMsg === "Email already registered") {
                    setFieldError('email', errorMsg);
                } else {
                    setErrorMessage(errorMsg);
                }
            }
        } catch (err) {
            console.error("Network or unexpected error:", err);
            setErrorMessage("Could not connect to server");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Registration</h2>
                <p className="login-subtitle">Create a new account</p>

                {errorMessage && !Object.keys(fieldErrors).length && <div className="login-error">{errorMessage}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>First name*</label>
                        <input
                            placeholder='First name can contain letters only'
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                        {fieldErrors.firstName && <div className="field-error">{fieldErrors.firstName}</div>}
                    </div>

                    <div className="input-group">
                        <label>Last name*</label>
                        <input
                            placeholder='Last name can contain letters only'
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                        {fieldErrors.lastName && <div className="field-error">{fieldErrors.lastName}</div>}
                    </div>

                    <div className="input-group">
                        <label>Email*</label>
                        <input
                            placeholder='Email'
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                    </div>

                    <div className="input-group">
                        <label>Password*</label>

                        <div className="password-input-container">
                            <input 
                                placeholder='Password at least 8 characters with letters and numbers' 
                                type={showPassword ? "text" : "password"}
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                        {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                    </div>

                    <div className="input-group">
                        <label>Confirm Password*</label>
                        <div className="password-input-container">
                            <input 
                                placeholder='Confirm Password' 
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                onPaste={(e) => e.preventDefault()} 
                                required 
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                title={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
                    </div>

                    <div className="input-group">
                        <label>Birth Date</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                        />
                        {fieldErrors.birthDate && <div className="field-error">{fieldErrors.birthDate}</div>}
                    </div>

                    <div className="input-group">
                        <label>Phone</label>
                        <input 
                            placeholder='Phone number (10-11 digits)' 
                            type="tel" 
                            value={phone} 
                            onChange={handlePhoneChange}
                        />
                        {fieldErrors.phone && <div className="field-error">{fieldErrors.phone}</div>}
                    </div>

                    <div className="input-group">
                        <label>Gender</label>
                        <select 
                            value={gender} 
                            onChange={(e) => setGender(e.target.value)}
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Profile Picture</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>

                    {isLoading && <div className="login-loading">Creating your account...</div>}

                    <button 
                        type="submit" 
                        className="login-button" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <div className="register-link">
                        Already have an account?{' '}
                        <span onClick={() => navigate('/login')}>
                            Sign in
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;