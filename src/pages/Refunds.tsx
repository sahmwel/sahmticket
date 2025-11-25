'use client';

import { motion } from "framer-motion";
import { RotateCcw, CheckCircle, AlertCircle, Clock, Shield, Zap, Users } from "lucide-react";

const policies = [
  {
    icon: CheckCircle,
    color: "from-emerald-500 to-green-600",
    title: "Event Cancelled or Postponed?",
    desc: "You get a 100% automatic refund  including service fees within 7 business days. No stress. No back and forth.",
  },
  {
    icon: Users,
    color: "from-purple-600 to-pink-600",
    title: "Can’t Make It Anymore?",
    desc: "Refunds for personal reasons are up to the organizer. Most allow ticket transfer or resale on our platform — check the event page for their policy.",
  },
  {
    icon: Zap,
    color: "from-amber-500 to-orange-600",
    title: "How Fast Are Refunds?",
    desc: "Approved refunds hit your account in 5–10 business days (depending on your bank). We process instantly on our end.",
  },
  {
    icon: Shield,
    color: "from-blue-500 to-indigo-600",
    title: "What About Service Fees?",
    desc: "Our small booking fee  is non-refundable — it keeps the platform running smooth and secure for everyone.",
  },
] as const;

export default function Refunds() {
  return (
    <div className="pt-24 lg:pt-32 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Hero */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.9 }}
          className="text-center mb-20"
        >
          <RotateCcw className="w-24 h-24 lg:w-28 lg:h-28 mx-auto mb-8 text-purple-600" />
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight">
            Refund Policy
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-gray-700">
            Simple. Fair. No Hidden Rules.
          </p>
        </motion.div>

        {/* Policy Cards */}
        <div className="space-y-10">
          {policies.map((policy, i) => {
            const Icon = policy.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.7 }}
                viewport={{ once: true }}
                className="group bg-white rounded-3xl p-10 lg:p-12 shadow-2xl border border-purple-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
              >
                <div className="flex flex-col sm:flex-row items-start gap-8">
                  {/* Icon Badge */}
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${policy.color} p-5 shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-full h-full text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4">
                      {policy.title}
                    </h3>
                    <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                      {policy.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Final Trust Statement */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 p-12 lg:p-16 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-3xl text-white text-center shadow-2xl"
        >
          <Shield className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-8" />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
            Your Money Is Safe With Us
          </h2>
          <p className="text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed opacity-95">
            We’ve processed millions in tickets with zero refund drama.<br />
            Because when you win, we all win.
          </p>

          <div className="mt-10">
            <p className="text-lg opacity-90">
              Questions about a refund?{" "}
              <a
                href="https://wa.me/2347035651109"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline hover:no-underline"
              >
                Chat with us on WhatsApp
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}