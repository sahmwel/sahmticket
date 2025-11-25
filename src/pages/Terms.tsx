'use client';

import { motion } from "framer-motion";
import { FileText, Heart, Sparkles, Ban, Shield, PartyPopper, Smile, Zap } from "lucide-react";

const rules = [
  {
    icon: Sparkles,
    title: "Be 18+ to Buy Tickets",
    desc: "You must be 18 or older to purchase. Under 18? Bring a guardian or stay home  we love you, but rules are rules.",
  },
  {
    icon: Ban,
    title: "No Fake or Photocopied Tickets",
    desc: "Every ticket has a unique QR code. Fakes = instant denial at the gate. No refund. Don’t risk it.",
  },
  {
    icon: Shield,
    title: "We’re a Marketplace",
    desc: "SahmTicketHub connects you with independent organizers. Each event has its own rules — respect them like you respect the DJ.",
  },
  {
    icon: PartyPopper,
    title: "Come Correct or Don’t Come",
    desc: "No weapons, drugs, professional cameras, or bad energy. Security can refuse entry — no drama, no refund.",
  },
  {
    icon: Zap,
    title: "Lineup & Venue Can Change",
    desc: "Sometimes artists get sick or venues switch last minute. We’ll notify you instantly. Refunds only if fully cancelled.",
  },
  {
    icon: Heart,
    title: "Reselling? Keep It Real",
    desc: "Scalping above face value is not cool and may be illegal. We reserve the right to cancel resold tickets.",
  },
  {
    icon: Smile,
    title: "Good Vibes Only",
    desc: "Be kind to staff, artists, and fellow ravers. Harassment, fighting, or toxic behavior = removal with no refund.",
  },
  {
    icon: PartyPopper,
    title: "Have Fun Responsibly",
    desc: "Drink water. Look out for your friends. Turn up safely. The best nights are the ones we all remember.",
  },
] as const;

export default function Terms() {
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
          <FileText className="w-24 h-24 lg:w-28 lg:h-28 mx-auto mb-8 text-purple-600" />
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight">
            House Rules
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-gray-700">
            The Vibe Code • Last updated: November 2025
          </p>
        </motion.div>

        {/* Rules Grid */}
        <div className="space-y-10">
          {rules.map((rule, i) => {
            const Icon = rule.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.7 }}
                viewport={{ once: true }}
                className="group bg-white rounded-3xl p-10 lg:p-12 shadow-xl border border-purple-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
              >
                <div className="flex flex-col sm:flex-row items-start gap-8">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <Icon className="w-10 h-10 text-white mx-auto" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-3">
                      {rule.title}
                    </h3>
                    <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Final Vibe Statement */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-24 p-16 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-3xl text-white text-center shadow-2xl"
        >
          <Heart className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-auto mb-8 animate-pulse" />
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6">
            Good Vibes Only
          </h2>
          <p className="text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed opacity-95">
            This isn’t just an app.<br />
            This is a community built on respect, music, and unforgettable nights.
          </p>
          <p className="mt-10 text-2xl font-bold">
            Let’s keep the energy high and the drama low.
          </p>
          <p className="mt-6 text-lg opacity-90">
            See you on the dancefloor
          </p>
        </motion.div>
      </div>
    </div>
  );
}