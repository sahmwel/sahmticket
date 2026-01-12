// src/components/Footer.tsx
'use client';

import { Link } from "react-router-dom";
import { Mail, Phone, Send } from "lucide-react";
import { SiInstagram, SiX, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    // Replace with your actual API endpoint later
    setTimeout(() => {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 4000);
    }, 1200);
  };

  return (
    <footer className="bg-gradient-to-t from-purple-950 via-purple-900 to-pink-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">

        {/* Logo + Tagline */}
        <div className="text-center mb-16 md:mb-20">
          <div className="relative inline-block group">
            <img
              src="/logo-white.png"
              alt="SahmTicketHub"
              className="h-32 md:h-44 lg:h-52 w-auto mx-auto drop-shadow-2xl transition-all duration-700 group-hover:scale-110"
            />
            <div className="absolute -inset-12 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-full blur-3xl opacity-50 group-hover:opacity-90 scale-75 group-hover:scale-125 transition-all duration-1000 -z-10" />
          </div>
          <p className="mt-8 text-pink-100 text-lg md:text-2xl font-medium">
            Nigeria’s most beautiful way to discover and create events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-16">

          {/* Explore */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Explore</h3>
            <ul className="space-y-4 text-pink-200">
              <li><Link to="/events" className="hover:text-white transition">All Events</Link></li>
              <li><Link to="/create-event" className="hover:text-white transition">Create Event</Link></li>
              <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
            </ul>
          </div>

          {/* Support + FAQ */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Support</h3>
            <ul className="space-y-4 text-pink-200">
              <li><Link to="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-white transition font-medium">FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/refunds" className="hover:text-white transition">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Get in Touch</h3>
            <div className="space-y-5 text-pink-200 mb-8">
              <a href="mailto:hello@sahmtickethub.online" className="flex items-center gap-3 hover:text-white transition">
                <Mail size={18} /> info@sahmtickethub.online
              </a>
              <a href="tel:+2347035651109" className="flex items-center gap-3 hover:text-white transition">
                <Phone size={18} /> +234 703 565 1109
              </a>
            </div>

            {/* Social Icons */}
            <div className="flex gap-5">
              <a href="https://instagram.com/sahmtickethub" target="_blank" rel="noopener noreferrer"
                 className="w-14 h-14 bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 transition-all duration-300 group shadow-lg">
                <SiInstagram size={24} className="group-hover:scale-110 transition" />
              </a>
              <a href="https://x.com/sahmtickethub" target="_blank" rel="noopener noreferrer"
                 className="w-14 h-14 bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 group shadow-lg">
                <SiX size={24} className="group-hover:scale-110 transition" />
              </a>
              <a href="https://wa.me/2347035651109" target="_blank" rel="noopener noreferrer"
                 className="w-14 h-14 bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 transition-all duration-300 group shadow-lg">
                <SiWhatsapp size={24} className="group-hover:scale-110 transition" />
              </a>
            </div>
          </div>

          {/* Newsletter Subscription */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold mb-6">Stay Updated</h3>
            <p className="text-pink-200 mb-6 text-sm md:text-base">
              Get exclusive event alerts, early tickets & secret parties in your city.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-300 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-14 pr-4 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl text-white placeholder-pink-300 focus:outline-none focus:border-white/50 transition"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:shadow-purple-500/50 transition-all disabled:opacity-70"
              >
                {status === "loading" ? (
                  "Subscribing..."
                ) : status === "success" ? (
                  "Subscribed!"
                ) : (
                  <>
                    Subscribe Now <Send size={20} />
                  </>
                )}
              </button>

              {status === "success" && (
                <p className="text-emerald-300 text-sm text-center animate-pulse">
                  Welcome to the party!
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-20 pt-10 border-t border-white/10 text-center">
          <p className="text-pink-200 text-sm md:text-base font-medium">
            © 2026 <span className="text-white font-bold">SahmTicketHub</span> • Made with love in Kaduna, Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
}
