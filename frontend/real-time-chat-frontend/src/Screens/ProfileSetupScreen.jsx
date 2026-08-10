import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfileSetupScreen = () => {
    const { user } = useAuth(); // Access the authenticated user's ID
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            // Call your Express backend endpoint
            const response = await fetch('http://localhost:3000/api/profiles/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    auth_id: user?.id,
                    username: username.trim(),
                    full_name: fullName.trim(),
                    phone_number: phoneNumber.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            // Successfully stored in PostgreSQL via Supabase!
            console.log('Profile created:', data);
            navigate('/inbox');

        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                
                {/* Background glow accent */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#39FF14]/20 rounded-full blur-3xl"></div>

                <h2 className="text-3xl font-bold text-center text-white mb-8 tracking-wide">
                    Create Your ID
                </h2>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col items-center">
                    
                    {/* Avatar Upload Container */}
                    <div className="relative mb-8 group cursor-pointer">
                        <input 
                            type="file" 
                            id="avatar-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                        <label 
                            htmlFor="avatar-upload"
                            className={`flex items-center justify-center w-28 h-28 rounded-full border-2 cursor-pointer transition-all duration-300 ${
                                previewUrl 
                                ? 'border-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.5)]' 
                                : 'border-gray-500 hover:border-gray-300'
                            }`}
                        >
                            {previewUrl ? (
                                <img 
                                    src={previewUrl} 
                                    alt="Avatar Preview" 
                                    className="w-full h-full object-cover rounded-full p-1"
                                />
                            ) : (
                                <span className="text-gray-400 group-hover:text-white text-sm transition-colors">
                                    + Add Photo
                                </span>
                            )}
                        </label>
                    </div>

                    {/* Username Input */}
                    <div className="w-full mb-6 relative">
                        <input 
                            type="text" 
                            id="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-gray-600 focus:border-[#39FF14] text-white text-lg py-2 outline-none transition-colors peer placeholder-transparent"
                            placeholder="Username"
                        />
                        <label 
                            htmlFor="username"
                            className="absolute left-0 -top-5 text-gray-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-5 peer-focus:text-[#39FF14] peer-focus:text-sm cursor-text"
                        >
                            Username *
                        </label>
                    </div>

                    {/* Full Name Input */}
                    <div className="w-full mb-6 relative">
                        <input 
                            type="text" 
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-gray-600 focus:border-[#39FF14] text-white text-lg py-2 outline-none transition-colors peer placeholder-transparent"
                            placeholder="Full Name"
                        />
                        <label 
                            htmlFor="fullName"
                            className="absolute left-0 -top-5 text-gray-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-5 peer-focus:text-[#39FF14] peer-focus:text-sm cursor-text"
                        >
                            Full Name
                        </label>
                    </div>

                    {/* Phone Number Input */}
                    <div className="w-full mb-10 relative">
                        <input 
                            type="tel" 
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-gray-600 focus:border-[#39FF14] text-white text-lg py-2 outline-none transition-colors peer placeholder-transparent"
                            placeholder="Phone Number"
                        />
                        <label 
                            htmlFor="phoneNumber"
                            className="absolute left-0 -top-5 text-gray-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-5 peer-focus:text-[#39FF14] peer-focus:text-sm cursor-text"
                        >
                            Phone Number
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-white/10 hover:bg-[#39FF14] text-white hover:text-black font-bold py-3 rounded-full transition-all duration-300 border border-white/20 hover:border-transparent hover:shadow-[0_0_20px_rgba(57,255,20,0.6)] disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving Profile...' : 'Enter Chat'}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default ProfileSetupScreen;