// src/components/AuthModal.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [role, setRole] = useState<"admin" | "organizer">("organizer");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpTimer, setOtpTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // ===== OTP TIMER =====
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOTP && otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
    } else if (otpTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [otpTimer, showOTP]);

  const resendOTP = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from("otp_codes").insert({ user_id: userId, otp: generatedOtp });

      await fetch("/functions/v1/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: generatedOtp }),
      });

      setMessage("OTP resent. Check your email.");
      setOtpTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== SIGN UP =====
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !password || !confirmPassword) return setMessage("All fields are required.");
    if (password.length < 6) return setMessage("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setMessage("Passwords do not match.");

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } },
      });

      if (error) throw error;
      if (!data.user?.id) throw new Error("Signup failed");

      const newUserId = data.user.id;
      setUserId(newUserId);

      await supabase.from("profiles").insert({ id: newUserId, email, role });

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from("otp_codes").insert({ user_id: newUserId, otp: generatedOtp });

      await fetch("/functions/v1/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: generatedOtp }),
      });

      setShowOTP(true);
      setMessage("OTP sent to your email. Please check your inbox.");
      setOtpTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== VERIFY OTP =====
  const handleVerifyOTP = async () => {
    if (!userId) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("otp_codes")
        .select("otp")
        .eq("user_id", userId)
        .eq("otp", otp)
        .single();

      if (error || !data) throw new Error("Invalid OTP");

      await supabase.from("otp_codes").delete().eq("user_id", userId);

      setShowOTP(false);
      setIsLogin(true);
      setMessage("OTP verified! Logging in...");

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;
      if (!loginData.user) throw new Error("Login failed");

      const userRole = loginData.user?.user_metadata?.role || "organizer";
      window.location.href = userRole === "admin" ? "/admin" : "/organizer";
    } catch (err: any) {
      setMessage(err.message);
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
      setMessage("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      const userRole = data.user.user_metadata?.role || "organizer";
      window.location.href = userRole === "admin" ? "/admin" : "/organizer";
    } catch (err: any) {
      setMessage(err.message);
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
      setMessage("Email is required.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;

      setMessage("Check your email for password reset link.");
      setShowForgot(false);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== JSX =====
  return (
    <AnimatePresence>
      {!showOTP ? (
        !showForgot ? (
          <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-rose-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-[360px] shadow-3xl overflow-hidden mx-2"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 400 }}>
              <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white z-20"><X size={24} /></button>
              <div className="text-center pt-4 pb-2 px-4 flex flex-col items-center gap-1 z-10">
                <img src="/logo-white.png" alt="TicketHub" className="w-28 h-auto" />
                <h2 className="text-2xl font-black text-white -mt-1">{isLogin ? "Welcome Back" : "Join the Vibe"}</h2>
              </div>

              <div className="flex bg-white/10 backdrop-blur mx-4 rounded-xl p-1 mb-4">
                {["Log In", "Sign Up"].map(tab => (
                  <button key={tab} type="button" onClick={() => setIsLogin(tab === "Log In")}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${((isLogin && tab === "Log In") || (!isLogin && tab === "Sign Up")) ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow" : "text-white/60"}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {message && <p className="text-center text-sm text-yellow-300 mb-2">{message}</p>}

              <form onSubmit={isLogin ? handleLogin : handleSignUp} className="px-4 md:px-5 pb-8 space-y-4">
                {!isLogin && (
                  <>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                      <input type="text" required placeholder="Full Name" className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none" />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                      <input type="tel" required placeholder="+234 801 234 5678" className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none" />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email Address" className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none" />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password" className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-pink-300 focus:outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>

                {!isLogin && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm Password" className="w-full pl-10 pr-10 py-3 bg-white/10 border rounded-xl text-white placeholder-pink-300 focus:outline-none" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                )}

                {isLogin && <button type="button" onClick={() => setShowForgot(true)} className="text-pink-300 text-xs hover:underline block text-right w-full font-medium">Forgot password?</button>}

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : (
          // FORGOT PASSWORD
          <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <motion.div className="bg-purple-900/95 p-6 rounded-3xl w-full max-w-[360px] mx-2 relative">
              <button onClick={() => setShowForgot(false)} className="absolute top-3 left-3 text-white/70 hover:text-white"><ArrowLeft size={24} /></button>
              <h2 className="text-white font-bold text-xl mb-4">Reset Password</h2>
              {message && <p className="text-yellow-300 mb-2">{message}</p>}
              <form onSubmit={handleForgotPassword}>
                <div className="relative mb-4">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-4 h-4" />
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Email" className="w-full pl-10 pr-3 py-3 rounded-xl text-white bg-white/10 border border-white/20 focus:outline-none" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold">{loading ? "Sending..." : "Send Reset Link"}</button>
              </form>
            </motion.div>
          </motion.div>
        )
      ) : (
        // OTP MODAL
        <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <motion.div className="bg-purple-900/90 p-6 rounded-3xl w-full max-w-[360px] mx-2">
            <h2 className="text-white font-bold text-xl mb-4">Enter OTP</h2>
            {message && <p className="text-yellow-300 mb-2">{message}</p>}
            <input value={otp} onChange={e => setOtp(e.target.value)} type="text" placeholder="Enter OTP" className="w-full p-3 rounded-xl mb-4" />
            <div className="flex justify-between items-center mb-4 text-white text-sm">
              <span>Resend OTP in: {otpTimer}s</span>
              <button disabled={!canResend || loading} onClick={resendOTP} className="text-pink-300 hover:underline">{canResend ? "Resend OTP" : ""}</button>
            </div>
            <button onClick={handleVerifyOTP} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold">{loading ? "Verifying..." : "Verify OTP"}</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
