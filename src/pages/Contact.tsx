'use client';

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Instagram, X, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <div className="pt-24 lg:pt-28 min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-20"
        >
          <MessageCircle className="w-20 h-20 mx-auto mb-6 text-purple-600" />
          <h1 className="text-6xl md:text-7xl font-black text-gray-900 mb-6">
            We’re Here For You
          </h1>
          <p className="text-2xl text-gray-700">
            Got a question? Need help? We reply fast—usually under 30 mins
          </p>
        </motion.div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-10 mb-20">
          {[
            {
              icon: Mail,
              title: "Email Us",
              info: "info@Sahmtickethub.online",
              link: "mailto:info@Sahmtickethub.online",
              color: "from-purple-600 to-pink-600"
            },
            {
              icon: Phone,
              title: "Call or WhatsApp",
              info: "+234 703 565 1109",
              link: "https://wa.me/2347035651109",
              color: "from-green-500 to-emerald-600"
            },
            {
              icon: MapPin,
              title: "Location",
              info: "Kaduna, Nigeria",
              link: "#",
              color: "from-amber-500 to-orange-600"
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={i}
                href={item.link}
                target={item.title === "Call or WhatsApp" ? "_blank" : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ scale: 1.05 }}
                className={`bg-gradient-to-r ${item.color} rounded-3xl p-10 md:p-14 lg:p-16 text-white shadow-2xl flex flex-col items-center justify-center h-full min-h-72 md:min-h-80 transition-all duration-300`}
              >
                <Icon className="w-20 h-20 mb-8" />
                <h3 className="text-2xl md:text-3xl font-black mb-6">
                  {item.title}
                </h3>
                <p className="text-lg md:text-xl font-medium tracking-wide whitespace-nowrap">
                  {item.info}
                </p>
              </motion.a>
            );
          })}
        </div>

        {/* Social Section */}
        <div className="bg-white rounded-3xl p-16 shadow-2xl border border-purple-100 max-w-4xl mx-auto">
          <h2 className="text-5xl font-black text-gray-900 mb-10">Follow the Vibe</h2>
          <div className="flex justify-center gap-12">
            <motion.a
              whileHover={{ scale: 1.2, rotate: 360 }}
              href="https://instagram.com/Sahmtickethub.online"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 rounded-full shadow-xl"
            >
              <Instagram size={48} className="text-white" />
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.2, rotate: -360 }}
              href="https://x.com/Sahmtickethubonline"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black p-8 rounded-full shadow-xl"
            >
              <X size={48} className="text-white" />
            </motion.a>
          </div>
          <p className="mt-10 text-gray-600 text-xl">
            Events • Vibes • Updates • Giveaways
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 text-center"
        >
          <p className="text-3xl font-bold text-gray-800">
            We reply faster than your ex reads your message
          </p>
        </motion.div>
      </div>
    </div>
  );
}