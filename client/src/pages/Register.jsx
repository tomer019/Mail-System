import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Register.css'; // Assuming you have a CSS file for styling
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

    const navigate = useNavigate();

    // Validate inputs before sending
    const validateForm = () => {
        const nameRegex = /^[A-Za-z\u0590-\u05FF\s'-]+$/; // כולל עברית, רווחים, מקפים
        if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
            setErrorMessage("Names can only contain letters");
            return false;
        }
        // Check if required fields are filled
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            setErrorMessage("All fields must be filled (except profile picture)");
            return false;
        }
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            setErrorMessage("Name and email fields cannot be empty or spaces only");
            return false;
        }


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage("Invalid email format");
            return false;
        }

        if (password.length < 6) {
            setErrorMessage("Password must be at least 6 characters");
            return false;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match");
            return false;
        }
        if (birthDate && new Date(birthDate) > new Date()) {
            setErrorMessage("Birth date cannot be in the future");
            return false;
        }
        if (email.includes(" ")) {
            setErrorMessage("Email cannot contain spaces");
            return false;
        }



        // If phone number is provided, validate it contains digits only
        if (phone) {
            const digitsOnly = phone.replace(/-/g, '');
            if (!/^\d{10,11}$/.test(digitsOnly)) {
                setErrorMessage("Phone number must contain 10–11 digits (digits only, dash allowed after 3 digits)");
                return false;
            }
        }



        setErrorMessage('');
        return true;
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
        setErrorMessage('');
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
            const response = await fetch("http://localhost:3000/api/users/register", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 201) {
                navigate('/login');
            } else {
                const data = await response.json();
                setErrorMessage(data?.error || "Registration failed");
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

                {errorMessage && <div className="login-error">{errorMessage}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>First name*</label>
                        <input placeholder='First name can contain letters only' type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Last name*</label>
                        <input placeholder='Last name can contain letters only' type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Email*</label>
                        <input placeholder='Email' type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Password*</label>
                        <input placeholder='Password at least 6 characters' type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Confirm Password*</label>
                        <input placeholder='Confirm Password' type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onPaste={(e) => e.preventDefault()} required />
                    </div>

                    <div className="input-group">
                        <label>Birth Date</label>
                        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                    </div>

                    <div className="input-group">
                        <label>Phone</label>
                        <input placeholder='Phone number' type="text" value={phone} onChange={(e) => {
                            let value = e.target.value.replace(/[^\d]/g, '');
                            if (value.length > 3) {
                                value = value.slice(0, 3) + '-' + value.slice(3);
                            }
                            setPhone(value);
                        }} />
                    </div>

                    <div className="input-group">
                        <label>Gender</label>
                        <select value={gender} onChange={(e) => setGender(e.target.value)}>
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Profile Picture</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} />
                    </div>

                    {isLoading && <p className="login-loading">Registering...</p>}

                    <button className="login-button" type="submit" disabled={isLoading}>Register</button>

                    <p className="register-link">
                        Already have an account?{' '}
                        <span onClick={() => navigate('/login')}>Log in here</span>
                    </p>
                </form>
            </div>
        </div>
    );
};
export default Register;
