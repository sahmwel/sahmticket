'use client';

import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle, EyeOff, Smartphone, CreditCard, Mail, UserCheck } from "lucide-react";

const privacyPoints = [
  {
    icon: Shield,
    title: "Your Data Belongs to You",
    desc: "We only collect what’s necessary to deliver your tickets and keep your account secure. Nothing more.",
  },
  {
    icon: CreditCard,
    title: "100% Secure Payments",
    desc: "All transactions are processed through Paystack, Africa’s most trusted payment gateway. Your card details never touch our servers.",
  },
  {
    icon: Lock,
    title: "Bank-Level Encryption",
    desc: "Your personal info (name, email, phone) is encrypted with industrystandard SSL. Hackers don’t stand a chance.",
  },
  {
    icon: EyeOff,
    title: "No Spam. Ever.",
    desc: "We hate spam too. You’ll only hear from us about your tickets, event updates, or things you actually care about.",
  },
  {
    icon: Smartphone,
    title: "Private by Default",
    desc: "Your phone number and email are never shared with organizers or third parties  unless you buy a ticket (then only the organizer sees your name).",
  },
  {
    icon: UserCheck,
    title: "You’re in Control",
    desc: "Delete your account anytime. Update your info. Opt out of emails. It’s your data you call the shots.",
  },
] as const;

export default function Privacy() {
  return (
    <div className="pt-24 lg:pt-32 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="max-w-4xl mx-auto px-6 py-20">

        {/* Hero */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <Shield className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-8 text-purple-600" />
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight">
            Your Privacy Matters
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-medium">
            Last updated: November 2025
          </p>
        </motion.div>

        {/* Privacy Promises */}
        <div className="space-y-10">
          {privacyPoints.map((point, i) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                viewport={{ once: true }}
                className="group bg-white rounded-3xl p-8 lg:p-10 shadow-xl border border-purple-100 hover:shadow-2xl hover:border-purple-200 transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <Icon className="w-9 h-9 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4">
                      {point.title}
                    </h3>
                    <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                      {point.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Final Trust Statement */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-20 text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 lg:p-16 text-white shadow-2xl"
        >
          <Lock className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
            Your Trust Is Everything
          </h2>
          <p className="text-xl lg:text-2xl opacity-95 max-w-3xl mx-auto leading-relaxed">
            We’re not just building a ticketing platform.<br />
            We’re building a community where your privacy is sacred.
          </p>
          <p className="mt-8 text-lg font-medium opacity-90">
            Questions? Reach us anytime at{" "}
            <a
              href="mailto:hello@sahmtickethub.online"
              className="underline hover:no-underline font-bold"
            >
              info@sahmtickethub.online
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}