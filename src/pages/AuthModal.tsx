// src/components/AuthModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper function to handle auth success
  const handleAuthSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  // Handle X button click - navigate to home and close modal
  const handleCloseModal = () => {
    navigate("/"); // Navigate to home page
    onClose(); // Close the modal
  };

  // Handle overlay click - same behavior as X button
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  // ===== SIGN UP =====
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    
    // Validation
    if (!fullName || !phone || !email || !password || !confirmPassword) {
      return setMessage("All fields are required.");
    }
    
    if (password.length < 6) {
      return setMessage("Password must be at least 6 characters.");
    }
    
    if (password !== confirmPassword) {
      return setMessage("Passwords do not match.");
    }

    // Validate phone format
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    const cleanedPhone = phone.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      return setMessage("Please enter a valid Nigerian phone number");
    }

    try {
      setLoading(true);

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            phone: cleanedPhone,
          }
        },
      });
      
      if (error) throw error;
      if (!data.user?.id) throw new Error("Signup failed");

      // IMPORTANT: Check if email column exists before inserting
      // Get table structure first
      const { data: tableInfo } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      // Create profile object with only existing columns
      const profileData: any = {
        id: data.user.id,
        full_name: fullName,
        phone: cleanedPhone,
        role: "organizer",
        created_at: new Date().toISOString(),
        // Check if email column exists by looking at the table info
        ...(tableInfo && tableInfo.length > 0 && 'email' in tableInfo[0] 
          ? { email: email } 
          : {})
      };

      // Save to profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData);

      if (profileError) {
        // If email column doesn't exist, try without it
        if (profileError.message.includes('email')) {
          const { error: retryError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              full_name: fullName,
              phone: cleanedPhone,
              role: "organizer",
              created_at: new Date().toISOString(),
            });
          
          if (retryError) throw retryError;
        } else {
          throw profileError;
        }
      }

      // Success message
      setMessage("🎉 Account created successfully! Welcome organizer!");
      
      // Automatically log in after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (!loginError) {
        handleAuthSuccess();
        navigate("/organizer/dashboard");
      } else {
        setIsLogin(true);
        setMessage("Account created! Please log in.");
      }
      
    } catch (err: any) {
      console.error("Signup error:", err);
      setMessage(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    if (!email || !password) {
      return setMessage("Email and password are required.");
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      // Get user role from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      const userRole = profile?.role || "organizer";
      
      // Call success handler
      handleAuthSuccess();
      
      // Navigate based on role
      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/organizer/dashboard");
      }
      
    } catch (err: any) {
      console.error("Login error:", err);
      setMessage(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // ===== FORGOT PASSWORD =====
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    if (!forgotEmail) {
      return setMessage("Email is required.");
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage("📧 Check your email for password reset link.");
      setTimeout(() => {
        setShowForgot(false);
        setMessage(null);
      }, 3000);
      
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setMessage(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
    }
  };

  // Handle phone input change
  const handlePhoneChange = (value: string) => {
    const unformatted = value.replace(/\s+/g, '');
    
    if (unformatted.startsWith('+234')) {
      setPhone(formatPhoneNumber(unformatted.slice(1)));
    } else if (unformatted.startsWith('234')) {
      setPhone(formatPhoneNumber(unformatted));
    } else if (unformatted.startsWith('0')) {
      setPhone(formatPhoneNumber(unformatted));
    } else {
      const formatted = unformatted ? `0${formatPhoneNumber(unformatted)}` : '';
      setPhone(formatted);
    }
  };

  // ===== JSX =====
  return (
    <AnimatePresence>
      {!showForgot ? (
        <motion.div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick} // Updated to use new handler
        >
          <motion.div 
            className="bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-rose-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-[400px] shadow-3xl overflow-hidden mx-2"
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* X Button - Now navigates to home */}
            <button 
              onClick={handleCloseModal} // Updated to use new handler
              className="absolute top-3 right-3 text-white/70 hover:text-white z-20 transition-colors hover:scale-110"
              title="Close and go to home"
            >
              <X size={24} />
            </button>
            
            <div className="text-center pt-4 pb-2 px-4 flex flex-col items-center gap-1 z-10">
              <img src="/logo-white.png" alt="SahmTicketHub" className="w-28 h-auto" />
              <h2 className="text-2xl font-black text-white -mt-1">
                {isLogin ? "Welcome Back" : "Become an Organizer"}
              </h2>
              <p className="text-pink-300 text-sm font-medium">
                {isLogin ? "Sign in to manage your events" : "Create your organizer account"}
              </p>
            </div>

            <div className="flex bg-white/10 backdrop-blur mx-4 rounded-xl p-1 mb-4">
              {["Log In", "Sign Up"].map(tab => (
                <button 
                  key={tab} 
                  type="button" 
                  onClick={() => setIsLogin(tab === "Log In")}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    ((isLogin && tab === "Log In") || (!isLogin && tab === "Sign Up")) 
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow" 
                    : "text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {message && (
              <div className={`mx-4 mb-3 p-3 rounded-lg text-sm ${
                message.includes("success") || message.includes("created") || message.includes("🎉")
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={isLogin ? handleLogin : handleSignUp} className="px-4 md:px-5 pb-8 space-y-4">
              {!isLogin && (
                <>
                  {/* Full Name */}
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required 
                      placeholder="Full Name" 
                      className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-500" 
                    />
                  </div>
                  
                  {/* Phone Number */}
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      required 
                      placeholder="0801 234 5678 or +2348012345678" 
                      className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-500" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-pink-300 font-medium">
                      NG
                    </span>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  placeholder="Email Address" 
                  className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-500" 
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  placeholder="Password (min 6 characters)" 
                  className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-500" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password (Signup only) */}
              {!isLogin && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                    placeholder="Confirm Password" 
                    className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-500" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Forgot Password (Login only) */}
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)} 
                  className="text-pink-300 text-xs hover:underline block text-right w-full font-medium"
                >
                  Forgot password?
                </button>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </span>
                ) : isLogin ? "Log In" : "Become an Organizer"}
              </button>
            </form>

            <div className="text-center text-white/60 text-xs pb-4 px-4">
              By continuing, you agree to our Terms & Privacy Policy
            </div>
          </motion.div>
        </motion.div>
      ) : (
        // FORGOT PASSWORD MODAL
        <motion.div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={handleOverlayClick} // Updated to use new handler
        >
          <motion.div 
            className="bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-rose-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-[400px] mx-2 p-6 relative"
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Back button - navigates to home */}
            <button 
              onClick={handleCloseModal} // Updated to use new handler
              className="absolute top-3 left-3 text-white/70 hover:text-white transition-colors hover:scale-110"
              title="Close and go to home"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-white font-bold text-xl mb-2 text-center">Reset Password</h2>
            <p className="text-white/60 text-sm mb-4 text-center">
              Enter your email to receive a password reset link
            </p>
            
            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                message.includes("Check your email") 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleForgotPassword}>
              <div className="relative mb-4">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                <input 
                  type="email" 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                  placeholder="Enter your email" 
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-white bg-white/10 border border-white/20 focus:outline-none focus:border-purple-500" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : "Send Reset Link"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}