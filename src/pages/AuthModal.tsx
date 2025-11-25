'use client';

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Check,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import LogoWhite from "/src/assets/logo-white.png";

export default function AuthModal() {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const navigate = useNavigate();

  const closeModal = () => navigate(-1);

  // Password strength indicator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { strength: 0, label: "", color: "" };
    if (pass.length < 6) return { strength: 1, label: "Weak", color: "bg-red-500" };
    if (pass.length < 8) return { strength: 2, label: "Fair", color: "bg-orange-500" };
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass))
      return { strength: 4, label: "Very Strong", color: "bg-emerald-500" };
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass))
      return { strength: 3, label: "Strong", color: "bg-green-500" };
    return { strength: 2, label: "Medium", color: "bg-yellow-500" };
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const isStrongEnough = strength.strength >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && (!isStrongEnough || !passwordsMatch)) return;

    // Replace with real auth later
    alert(isLogin ? "Logged in successfully!" : "Account created!");
    navigate("/dashboard");
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes("@")) return alert("Please enter a valid email");

    setEmailSent(true);
    setTimeout(() => {}, 2000);
  };

  return (
    <AnimatePresence>
      {/* Main Auth Modal */}
      {!showForgot ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-rose-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-md shadow-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition z-10"
            >
              <X size={28} />
            </button>

            {/* Header */}
            <div className="text-center pt-10 pb-6 px-6">
              <img src={LogoWhite} alt="SahmTicketHub" className="h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black text-white">
                {isLogin ? "Welcome Back" : "Join the Vibe"}
              </h2>
              <p className="text-pink-200 text-sm mt-2">
                {isLogin ? "Log in to your account" : "Create your organizer account"}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex bg-white/10 backdrop-blur mx-6 rounded-2xl p-1.5 mb-6">
              {["Log In", "Sign Up"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setIsLogin(tab === "Log In")}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    (isLogin && tab === "Log In") || (!isLogin && tab === "Sign Up")
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                      : "text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 pb-10 space-y-5">
              {!isLogin && (
                <>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input
                      type="tel"
                      required
                      placeholder="+234 801 234 5678"
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Strength */}
              {!isLogin && password && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          level <= strength.strength ? strength.color : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-pink-200 text-right font-medium">
                    {strength.label}
                  </p>
                </div>
              )}

              {/* Confirm Password */}
              {!isLogin && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className={`w-full pl-12 pr-12 py-4 bg-white/10 border rounded-2xl text-white placeholder-pink-300 focus:outline-none transition ${
                      confirmPassword && !passwordsMatch
                        ? "border-red-500"
                        : "border-white/20 focus:border-purple-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {confirmPassword && passwordsMatch && (
                    <Check className="absolute right-12 top-1/2 -translate-y-1/2 text-green-400 w-5 h-5" />
                  )}
                  {confirmPassword && !passwordsMatch && (
                    <AlertCircle className="absolute right-12 top-1/2 -translate-y-1/2 text-red-400 w-5 h-5" />
                  )}
                </div>
              )}

              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-pink-300 text-sm hover:underline block text-right w-full font-medium"
                >
                  Forgot password?
                </button>
              )}

              <button
                type="submit"
                disabled={!isLogin && (!isStrongEnough || !passwordsMatch)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLogin ? "Log In" : "Create Account"}
              </button>

              {isLogin && (
                <p className="text-center text-pink-200 text-sm">
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-white font-bold underline hover:no-underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </form>
          </motion.div>
        </motion.div>
      ) : (
        /* Forgot Password Flow */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-center p-4"
          onClick={() => setShowForgot(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl w-full max-w-md p-10 shadow-3xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowForgot(false)}
              className="absolute top-4 left-4 text-white/70 hover:text-white"
            >
              <ArrowLeft size={28} />
            </button>

            <div className="text-center">
              <img src={LogoWhite} alt="SahmTicketHub" className="h-14 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-white mb-3">Reset Password</h2>
              <p className="text-pink-200 text-sm mb-8">
                {emailSent
                  ? "Check your email for the reset link"
                  : "Enter your email and we’ll send you a reset link"}
              </p>

              {!emailSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 w-6 h-6" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="w-full pl-14 pr-4 py-5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-pink-300 focus:outline-none focus:border-purple-400 text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl"
                  >
                    Send Reset Link
                  </button>
                </form>
              ) : (
                <div className="py-10">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-12 h-12 text-green-400" />
                  </div>
                  <p className="text-white font-bold text-xl">Email Sent!</p>
                  <p className="text-pink-200 text-sm mt-3">Check your inbox (and spam folder)</p>
                </div>
              )}

              <button
                onClick={() => setShowForgot(false)}
                className="mt-8 text-pink-300 hover:underline font-medium"
              >
                Back to Login
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}