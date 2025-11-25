'use client';

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";

import LogoWhite from "/src/assets/logo-white.png";

const features = [
  { icon: Zap, title: "5-Minute Setup", desc: "Launch your event instantly" },
  { icon: Wallet, title: "Paid in 24hrs", desc: "Money hits your account fast" },
  { icon: TrendingUp, title: "Live Analytics", desc: "See sales in real-time" },
  { icon: Globe, title: "Stunning Pages", desc: "Your event looks premium" },
  { icon: Users, title: "Unlimited Tickets", desc: "Sell as many as you want" },
  { icon: Shield, title: "Anti-Fraud", desc: "No fake or duplicate tickets" },
  { icon: Clock, title: "24/7 Support", desc: "We reply fast on WhatsApp, email & calls" },
  { icon: MessageSquare, title: "Direct Chat", desc: "Talk to your attendees" },
] as const;

export default function OrganizerTeaser() {
  return (
    <>
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 via-black/20 to-transparent backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="relative group">
            <img
              src={LogoWhite}
              alt="SahmTicketHub"
              className="h-24 md:h-28 w-auto object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute -inset-10 bg-gradient-to-r from-purple-600/60 via-pink-600/60 to-rose-600/60 rounded-full blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
          </div>

          {/* Create Event CTA */}
          <Link
            to="/auth"
            className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-7 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 text-sm md:text-base"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="pt-32 md:pt-36 min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 text-white overflow-hidden relative">
        {/* Background Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 -right-40 w-96 h-96 bg-purple-600/40 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -left-40 w-80 h-80 bg-pink-600/40 rounded-full blur-3xl" />
        </div>

        {/* Hero Content */}
        <section className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight">
              Create Events That<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300">
                Sell Out Fast
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-pink-100 mt-8 opacity-90 max-w-4xl mx-auto leading-relaxed">
              The fastest, most beautiful way to sell tickets in Nigeria.<br />
              No coding. No limits. Just money in your account.
            </p>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="group bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-center"
                >
                  <Icon className="w-14 h-14 text-purple-300 mx-auto mb-5 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-pink-100 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative z-10 bg-black/50 backdrop-blur-2xl py-24">
          <div className="text-center px-6 max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-6xl font-black mb-6">
              Start Selling Tickets Today
            </h2>
            <p className="text-xl text-pink-100 mb-12 opacity-90">
              Join thousands of organizers already making money with SahmTicketHub
            </p>

            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300
                px-9 py-6 text-lg min-h-14
                sm:text-2xl sm:px-16 sm:py-8 sm:min-h-20 sm:gap-4"
            >
              Create Your First Event Free
              <ArrowRight className="w-6 h-6 sm:w-9 sm:h-9" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}