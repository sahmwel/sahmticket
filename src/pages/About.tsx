'use client';

import { motion } from "framer-motion";
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
} from "lucide-react";

const stats = [
  { value: "₦500M+", label: "Ticket sales processed", color: "text-purple-600" },
  { value: "10K+", label: "Sold-out events", color: "text-pink-600" },
  { value: "24hrs", label: "Payout speed", color: "text-rose-600" },
];

const eventTypes = [
  { icon: Mic2, label: "Concerts" },
  { icon: PartyPopper, label: "Raves & Parties" },
  { icon: Music, label: "Festivals" },
  { icon: Headphones, label: "Afrobeats Nights" },
  { icon: Flame, label: "Comedy Shows" },
  { icon: Star, label: "VIP Experiences" },
  { icon: Star, label: "Album Launches" },
  { icon: Globe, label: "Tour Stops" },
] as const;

export default function About() {
  return (
    <>
      {/* HERO */}
      <section className="pt-24 lg:pt-32 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="space-y-8"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-tight">
              Who We Are....
            </h1>

            <p className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
              SahmTicketHub
            </p>

            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-tight">
              Sell Out<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600">
                Every Show
              </span>
            </h2>

            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900">
              The Fastest Way to Sell Tickets in Nigeria
            </p>

            <p className="mt-8 text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-5xl mx-auto leading-relaxed font-medium">
              No hidden fees. No stress. No empty seats.<br />
              Instant payouts • Beautiful tickets • Real-time analytics • Sold-out shows every single time.
            </p>

            {/* Stats */}
            <div className="mt-16 flex flex-wrap justify-center gap-12 lg:gap-20">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <p className={`text-5xl lg:text-6xl font-black ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-700">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-20 flex flex-col sm:flex-row gap-6 justify-center">
              <a
                href="/create-event"
                className="group inline-flex items-center justify-center gap-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl lg:text-2xl px-12 py-7 rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                Start Selling Free Now
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition" />
              </a>
              <a
                href="/events"
                className="inline-flex items-center justify-center bg-white text-purple-600 border-4 border-purple-600 font-black text-xl lg:text-2xl px-12 py-7 rounded-full hover:bg-purple-50 transition-all shadow-2xl"
              >
                Buy Tickets
              </a>
            </div>

            <p className="mt-16 text-xl font-bold text-purple-700">
              Built in Kaduna • Trusted by Nigeria’s top promoters
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOUNDER SPOTLIGHT */}
      <section className="py-28 lg:py-40 bg-gradient-to-r from-purple-900 to-pink-900 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <Crown className="w-24 h-24 mx-auto text-yellow-400" />
            <h2 className="text-6xl sm:text-7xl lg:text-8xl font-black">
              Samuel Obute
            </h2>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-pink-300">
              Founder & CEO
            </p>

            <div className="max-w-4xl mx-auto space-y-8 text-lg lg:text-xl leading-relaxed">
              <p className="opacity-95">
                The visionary who saw the future of Nigerian nightlife before anyone else.
              </p>
              <p className="opacity-90">
                From Kaduna streets to building the platform that powers Detty December, Afrobeat shutdowns, and sold-out concerts across Nigeria —{" "}
                <strong className="text-yellow-300">Samuel Obute</strong> is the reason promoters no longer sleep on empty seats.
              </p>
              <p className="text-3xl font-bold text-yellow-300 italic pt-6">
                “We don’t follow trends. We create the vibe.” — Samuel Obute
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MISSION */}
      <section className="py-28 lg:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <Target className="w-20 h-20 lg:w-24 lg:h-24 mx-auto text-purple-600" />
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900">
              Our Mission
            </h2>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 max-w-6xl mx-auto leading-relaxed">
              To become the <span className="text-purple-600">global heartbeat</span> of live music and nightlife,
              starting in Nigeria, powered by African energy, taking the world stage.
            </p>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto">
              We don’t do basic. We do sold-out concerts, rooftop turn-ups, festival seasons, and moments people talk about for years.
            </p>
            <div className="inline-flex items-center gap-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl px-12 py-6 rounded-full shadow-2xl">
              <Globe className="w-8 h-8" />
              Kaduna → Abuja → Lagos → London → The World
            </div>
          </motion.div>
        </div>
      </section>

      {/* ORIGIN STORY */}
      <section className="py-28 lg:py-40 bg-gradient-to-b from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900">
                Born for the Vibe
              </h2>
              <div className="space-y-6 text-lg lg:text-xl text-gray-700 leading-relaxed">
                <p>
                  Launched in <strong className="text-purple-600">Kaduna, 2025</strong> by{" "}
                  <strong>Samuel Obute</strong> because Nigerian nightlife deserved better.
                </p>
                <p>No more fake tickets. No more gate drama. No more ugly posters on WhatsApp.</p>
                <p>
                  We built SahmTicketHub for the real turn-up: Detty December runs, Afrobeat shutdowns, comedy roasts, rooftop parties, and festival madness.
                </p>
                <p className="text-3xl font-black text-purple-700">
                  This isn’t just a platform.<br />
                  This is culture.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-8"
            >
              <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
                <Headphones className="w-20 h-20 mx-auto mb-4 text-purple-600" />
                <p className="text-6xl font-black text-purple-600">2025</p>
                <p className="text-xl font-bold">Born in Kaduna</p>
              </div>
              <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
                <Flame className="w-20 h-20 mx-auto mb-4 text-pink-600" />
                <p className="text-6xl font-black text-pink-600">50K+</p>
                <p className="text-xl font-bold">Party people reached</p>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-10 shadow-2xl text-white text-center">
                <Music className="w-20 h-20 mx-auto mb-4" />
                <p className="text-4xl font-black">Next Stop</p>
                <p className="text-2xl font-semibold">The World</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* EVENT TYPES */}
      <section className="py-28 lg:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-20">
            We Live for the Turn Up
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {eventTypes.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl p-10 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  <Icon className="w-16 h-16 mx-auto mb-6 text-purple-600 group-hover:scale-110 transition" />
                  <p className="text-xl font-black text-gray-800">{item.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL STATEMENT */}
      <section className="py-40 lg:py-52 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-6xl sm:text-7xl lg:text-9xl font-black text-gray-900 leading-tight">
            Africa’s Sound.<br />
            Going Global.
          </h2>
          <p className="mt-10 text-2xl lg:text-4xl font-medium text-gray-700">
            Powered by the culture.<br />
            Built for the world.
          </p>
        </div>
      </section>
    </>
  );
}