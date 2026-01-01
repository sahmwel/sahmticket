import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  MessageSquare,
  Wallet,
  Zap,
  Shield,
  Globe,
  Clock,
  ArrowRight,
  Plus,
  BarChart3,
  Ticket,
  Smartphone,
  Award,
  Sparkles,
  CheckCircle,
  DollarSign,
  Calendar,
  Music,
  PartyPopper,
} from "lucide-react";
import AuthModal from "@/pages/AuthModal";
import { supabase } from "@/lib/supabaseClient";

const features = [
  { icon: Zap, title: "5-Minute Setup", desc: "Launch your event instantly", color: "from-yellow-500 to-amber-500" },
  { icon: Wallet, title: "24hr Payouts", desc: "Money hits your account fast", color: "from-emerald-500 to-teal-500" },
  { icon: TrendingUp, title: "Live Analytics", desc: "See sales in real-time", color: "from-blue-500 to-cyan-500" },
  { icon: Globe, title: "Stunning Pages", desc: "Your event looks premium", color: "from-purple-500 to-pink-500" },
  { icon: Users, title: "Direct Attendees", desc: "Chat with your attendees", color: "from-indigo-500 to-violet-500" },
  { icon: Shield, title: "Anti-Fraud", desc: "No fake or duplicate tickets", color: "from-red-500 to-orange-500" },
  { icon: Clock, title: "24/7 Support", desc: "Fast WhatsApp, email & phone", color: "from-green-500 to-emerald-500" },
  { icon: Ticket, title: "Unlimited Tickets", desc: "Sell as many as you want", color: "from-pink-500 to-rose-500" },
] as const;

const stats = [
  { value: "₦500M+", label: "Ticket Sales", icon: DollarSign, color: "text-purple-400" },
  { value: "10K+", label: "Sold-out Events", icon: Ticket, color: "text-pink-400" },
  { value: "98%", label: "Success Rate", icon: Award, color: "text-amber-400" },
  { value: "24hrs", label: "Payout Speed", icon: Clock, color: "text-cyan-400" },
];

const eventTypes = [
  { icon: Music, label: "Concerts", color: "from-purple-500 to-violet-600" },
  { icon: PartyPopper, label: "Parties & Raves", color: "from-pink-500 to-rose-600" },
  { icon: Calendar, label: "Festivals", color: "from-amber-500 to-orange-600" },
  { icon: Smartphone, label: "Virtual Events", color: "from-blue-500 to-cyan-600" },
];

export default function OrganizerTeaser() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in and is an organizer
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsLoggedIn(true);
          
          // Check if user is organizer
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
            
          setIsOrganizer(profile?.role === "organizer" || profile?.role === "admin");
        } else {
          setIsLoggedIn(false);
          setIsOrganizer(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoggedIn(false);
        setIsOrganizer(false);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleCreateEvent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // User not logged in - show auth modal
        setShowAuth(true);
        return;
      }
      
      // Check if user is organizer
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
        
      if (!profile || (profile.role !== "organizer" && profile.role !== "admin")) {
        // User is not an organizer - show upgrade modal or redirect
        const confirmUpgrade = window.confirm(
          "You need organizer permissions to create events.\n\n" +
          "Would you like to upgrade to an organizer account?"
        );
        
        if (confirmUpgrade) {
          navigate("/upgrade-organizer");
        }
        return;
      }
      
      // User is logged in and is an organizer - go to create event
      navigate("/create-event");
      
    } catch (error) {
      console.error("Error checking auth:", error);
      // Fallback: show auth modal
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    // After successful login/signup, check organizer status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
         .then(({ data: profile }: { data: { role: string } | null }) => {
  if (profile?.role === 'organizer' || profile?.role === 'admin') {
    navigate('/create-event')
  }
          });
      }
    });
  };

  const handleBrowseEvents = () => {
    navigate("/events");
  };

  return (
    <>
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="relative group">
            <button 
              onClick={() => navigate("/")}
              className="focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">SahmTicketHub</h1>
                  <p className="text-xs text-pink-200 font-medium">Organizer Platform</p>
                </div>
              </div>
            </button>
            <div className="absolute -inset-8 bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-rose-600/30 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500 -z-10" />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleBrowseEvents}
              className="hidden sm:inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-all duration-300"
            >
              Browse Events
            </button>
            <button
              onClick={handleCreateEvent}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-3.5 sm:px-8 sm:py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 text-sm sm:text-base"
            >
              <Plus className="w-5 h-5" />
              {isLoggedIn && isOrganizer ? "Create Event" : "Get Started"}
            </button>
          </div>
        </div>
      </header>

      {/* AuthModal - Updated with onSuccess */}
      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)} 
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Main Content */}
      <main className="pt-32 md:pt-40 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 text-white overflow-hidden relative">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -left-40 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-3xl" />
        </div>

        {/* Hero Section */}
        <section className="relative z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 px-4 py-2 rounded-full text-sm font-bold mb-4">
                Trusted by Nigeria's Top Promoters
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight">
                Create Events That<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-rose-300">
                  Sell Out Fast
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-gray-300 mt-8 max-w-4xl mx-auto leading-relaxed">
                The fastest, most beautiful way to sell tickets in Nigeria.<br />
                No coding. No limits. Just money in your account.
              </p>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.5 }}
                      className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white/10`}>
                          <Icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-2xl sm:text-3xl font-black">{stat.value}</p>
                          <p className="text-sm text-gray-400">{stat.label}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* CTA Buttons */}
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleCreateEvent}
                  className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg px-8 py-5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
                >
                  <Plus className="w-5 h-5" />
                  {isLoggedIn && isOrganizer 
                    ? "Create Your First Event" 
                    : "Get Started Free"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition" />
                </button>
                <button
                  onClick={handleBrowseEvents}
                  className="inline-flex items-center justify-center bg-white/10 text-white border border-white/20 font-bold text-lg px-8 py-5 rounded-full hover:bg-white/20 transition-all"
                >
                  Browse Trending Events
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative z-10 mt-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">
                Everything You Need<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  To Sell Out
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Built specifically for Nigerian event organizers
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="group bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Event Types */}
        <section className="relative z-10 mt-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-black mb-4">Perfect For Any Event</h3>
              <p className="text-gray-400">From small parties to massive festivals</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {eventTypes.map((type, i) => {
                const Icon = type.icon;
                return (
                  <div
                    key={i}
                    className={`bg-gradient-to-br ${type.color} rounded-2xl p-6 text-center hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-white" />
                    <p className="text-white font-bold">{type.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative z-10 mt-32 pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/10">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-bold mb-6">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  No setup fees • No monthly charges
                </div>
                
                <h2 className="text-3xl sm:text-5xl font-black mb-6">
                  Start Selling Tickets Today
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Join thousands of organizers already making money with SahmTicketHub
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleCreateEvent}
                    className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg px-10 py-5 rounded-full hover:scale-105 transition-all shadow-2xl"
                  >
                    {isLoggedIn && isOrganizer 
                      ? "Create Your First Event" 
                      : "Get Started Free"}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => navigate("/contact")}
                    className="inline-flex items-center justify-center bg-white/10 text-white border border-white/20 font-bold text-lg px-10 py-5 rounded-full hover:bg-white/20 transition-all"
                  >
                    Schedule a Demo
                  </button>
                </div>

                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
                  <div className="space-y-2">
                    <p className="text-2xl font-black">Free</p>
                    <p className="text-sm text-gray-400">No monthly fees</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black"></p>
                    <p className="text-sm text-gray-400">Lowest fees in Nigeria</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black">24/7</p>
                    <p className="text-sm text-gray-400">Support available</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-2xl font-black">Instant</p>
                    <p className="text-sm text-gray-400">Payouts to your bank</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}