'use client';

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Globe,
  Headphones,
  Flame,
  Music,
  Mic2,
  PartyPopper,
  Star,
  ArrowRight,
  Crown,
  Calendar,
  Ticket,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  Award,
} from "lucide-react";

const stats = [
  { value: "₦500M+", label: "Ticket sales processed", icon: TrendingUp, color: "text-purple-600" },
  { value: "10K+", label: "Sold-out events", icon: Ticket, color: "text-pink-600" },
  { value: "24hrs", label: "Payout speed", icon: Clock, color: "text-rose-600" },
  { value: "98%", label: "Success rate", icon: Shield, color: "text-emerald-600" },
];

const eventTypes = [
  { icon: Mic2, label: "Concerts", color: "from-purple-500 to-violet-600" },
  { icon: PartyPopper, label: "Raves & Parties", color: "from-pink-500 to-rose-600" },
  { icon: Music, label: "Festivals", color: "from-amber-500 to-orange-600" },
  { icon: Headphones, label: "Afrobeats Nights", color: "from-blue-500 to-cyan-600" },
  { icon: Flame, label: "Comedy Shows", color: "from-red-500 to-orange-600" },
  { icon: Star, label: "VIP Experiences", color: "from-yellow-500 to-amber-600" },
  { icon: Award, label: "Album Launches", color: "from-emerald-500 to-teal-600" },
  { icon: Globe, label: "Tour Stops", color: "from-indigo-500 to-purple-600" },
] as const;

const features = [
  {
    icon: Shield,
    title: "Zero Fake Tickets",
    description: "100% authentic tickets with QR verification",
    color: "bg-emerald-500"
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Get paid within 24 hours after your event",
    color: "bg-amber-500"
  },
  {
    icon: Users,
    title: "Real Analytics",
    description: "Track sales, attendees, and revenue in real-time",
    color: "bg-blue-500"
  },
  {
    icon: Calendar,
    title: "Easy Setup",
    description: "Create and publish events in under 5 minutes",
    color: "bg-purple-500"
  },
];

export default function About() {
  const navigate = useNavigate();

  const handleCreateEvent = () => {
    navigate("/teaser");
  };

  const handleBrowseEvents = () => {
    navigate("/events");
  };

  return (
    <>
      {/* HERO */}
      <section className="pt-16 sm:pt-20 lg:pt-28 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-6 sm:space-y-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full text-sm font-bold mb-4"
            >
              Trusted by Nigeria's Top Promoters
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-tight">
              Who We Are....
            </h1>

            <p className="text-5xl sm:text-6xl md:text-7xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
              SahmTicketHub
            </p>

            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-gray-900 leading-tight">
              Sell Out<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
                Every Show
              </span>
            </h2>

            <p className="text-xl sm:text-2xl lg:text-4xl font-black text-gray-900">
              The Fastest Way to Sell Tickets in Nigeria
            </p>

            <p className="mt-6 text-base sm:text-lg lg:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium">
              No hidden fees. No stress. No empty seats.<br className="hidden sm:block" />
              Instant payouts • Beautiful tickets • Real-time analytics • Sold-out shows every time.
            </p>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Icon className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                    <p className={`text-3xl sm:text-4xl font-black ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {stat.label}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleCreateEvent}
                className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg sm:text-xl px-8 py-5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-3xl"
              >
                Start Selling Free Now
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition" />
              </button>
              <button
                onClick={handleBrowseEvents}
                className="inline-flex items-center justify-center bg-white text-purple-600 border-4 border-purple-600 font-bold text-lg sm:text-xl px-8 py-5 rounded-full hover:bg-purple-50 transition-all shadow-2xl hover:shadow-3xl"
              >
                Browse Events
              </button>
            </div>

            <p className="mt-10 text-sm sm:text-lg font-bold text-purple-700">
              Built in Kaduna • Trusted by Nigeria's top promoters
            </p>
          </motion.div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-12"
          >
            <div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900">
                Why Promoters Choose Us
              </h2>
              <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to sell out your events, stress-free
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
                  >
                    <div className={`${feature.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOUNDER SPOTLIGHT */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-purple-900 to-pink-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <Crown className="w-16 h-16 sm:w-20 lg:w-24 mx-auto text-yellow-400" />
            <h2 className="text-5xl sm:text-6xl lg:text-8xl font-black">
              Samuel Obute
            </h2>
            <p className="text-2xl sm:text-3xl lg:text-5xl font-bold text-pink-300">
              Founder & CEO
            </p>

            <div className="max-w-3xl mx-auto space-y-6 text-base sm:text-lg lg:text-xl leading-relaxed">
              <p>From Kaduna streets to building the platform that powers Detty December and sold-out concerts across Nigeria — <strong className="text-yellow-300">Samuel Obute</strong> is the reason promoters no longer sleep on empty seats.</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-300 italic pt-4">
                "We don't follow trends. We create the vibe."
              </p>
            </div>

            <div className="pt-8">
              <button
                onClick={() => navigate("/contact")}
                className="inline-flex items-center gap-2 bg-white text-purple-900 font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition"
              >
                Get in Touch
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MISSION */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <Target className="w-16 h-16 lg:w-24 mx-auto text-purple-600" />
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900">
              Our Mission
            </h2>
            <p className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-800 max-w-5xl mx-auto leading-relaxed">
              To become the <span className="text-purple-600">global heartbeat</span> of live music and nightlife,
              starting in Nigeria.
            </p>
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg sm:text-xl px-8 py-5 rounded-full shadow-2xl">
              <Globe className="w-6 h-6" />
              Kaduna → Abuja → Lagos → London → The World
            </div>
          </motion.div>
        </div>
      </section>

      {/* EVENT TYPES */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 mb-12 lg:mb-16">
              We Live for the Turn Up
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {eventTypes.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className={`group bg-gradient-to-br ${item.color} rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}
                  >
                    <Icon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-white group-hover:scale-110 transition" />
                    <p className="text-lg sm:text-xl font-black text-white">{item.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* GET STARTED */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-purple-900 to-pink-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white">
              Ready to Sell Out?
            </h2>
            <p className="text-xl sm:text-2xl lg:text-3xl text-pink-100 max-w-3xl mx-auto">
              Join thousands of promoters who trust SahmTicketHub
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
              <button
                onClick={() => navigate("/teaser")}
                className="group inline-flex items-center justify-center gap-3 bg-white text-purple-900 font-bold text-lg sm:text-xl px-10 py-5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                Create Your First Event
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition" />
              </button>
              <button
                onClick={() => navigate("/organizer/dashboard")}
                className="inline-flex items-center justify-center bg-transparent text-white border-2 border-white font-bold text-lg sm:text-xl px-10 py-5 rounded-full hover:bg-white/10 transition-all"
              >
                Organizer Dashboard
              </button>
            </div>

            <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h4 className="text-xl font-bold text-white mb-2">Free to Start</h4>
                <p className="text-pink-100">No setup fees. Only pay when you sell tickets.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h4 className="text-xl font-bold text-white mb-2">24/7 Support</h4>
                <p className="text-pink-100">Dedicated support team ready to help you succeed.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h4 className="text-xl font-bold text-white mb-2">Proven Results</h4>
                <p className="text-pink-100">Average 30% increase in ticket sales for new organizers.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FINAL STATEMENT */}
      <section className="py-20 lg:py-40 bg-gradient-to-b from-white to-purple-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2 className="text-5xl sm:text-6xl lg:text-9xl font-black text-gray-900 leading-tight">
              Africa's Sound.<br />
              Going Global.
            </h2>
            <p className="mt-8 text-xl sm:text-2xl lg:text-4xl font-medium text-gray-700">
              Powered by the culture.<br />
              Built for the world.
            </p>
            
            <div className="mt-12">
              <button
                onClick={handleBrowseEvents}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl px-12 py-6 rounded-full hover:scale-105 transition-all shadow-2xl"
              >
                Explore Trending Events
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}