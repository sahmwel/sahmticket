'use client'

import { Link } from "react-router-dom";
import { Menu, X, Plus } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  // NavLink with onClick support
  const NavLink = ({
    to,
    children,
    onClick
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <Link
      to={to}
      onClick={onClick}
      className="relative text-lg font-semibold text-white/90 
                 transition-all duration-300 
                 hover:text-white 
                 focus-visible:text-white 
                 focus-visible:outline-none
                 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 
                 after:bg-gradient-to-r after:from-purple-500 after:to-pink-500 
                 after:transition-all after:duration-500
                 hover:after:w-full 
                 focus-visible:after:w-full"
    >
      {children}
    </Link>
  );

  return (
    <>
      {/* LUXURY BLACK NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">

          {/* BIG GLOWING LOGO */}
          <Link to="/" className="group -my-10 md:-my-12 lg:-my-14">
            <div className="relative">
              <img
                src="/logo-white.png"
                alt="SahmTicketHub"
                className="h-28 md:h-36 lg:h-44 w-auto object-contain 
                           drop-shadow-2xl 
                           transition-all duration-500 
                           group-hover:scale-110"
              />
              <div className="absolute -inset-12 md:-inset-16 
                              bg-gradient-to-r from-purple-600/50 via-pink-600/50 to-rose-600/50 
                              rounded-full blur-3xl opacity-60 
                              group-hover:opacity-100 
                              transition-all duration-700 -z-10" />
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-10">
            <NavLink to="/events">Events</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/privacy">Privacy</NavLink>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:block">
            <Link
              to="/create-event"
              className="bg-gradient-to-r from-purple-600 to-pink-600 
                         text-white font-bold px-8 py-3.5 rounded-full 
                         shadow-xl hover:shadow-purple-500/40 
                         flex items-center gap-3 text-base transition-all duration-300"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              Create Event
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* MOBILE MENU – Slide-down */}
        <motion.div
          initial={false}
          animate={{
            y: isOpen ? 0 : -20,
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none'
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut"
          }}
          className="lg:hidden fixed inset-x-0 top-16 bg-black/95 backdrop-blur-3xl border-t border-white/10"
          style={{
            height: 'calc(100dvh - 64px)',
            transform: 'translateY(-20px)',
          }}
        >
          <div className="flex flex-col items-center justify-center h-full space-y-14 px-8">
            <NavLink to="/events" onClick={() => setIsOpen(false)}>Events</NavLink>
            <NavLink to="/about" onClick={() => setIsOpen(false)}>About</NavLink>
            <NavLink to="/contact" onClick={() => setIsOpen(false)}>Contact</NavLink>
            <NavLink to="/privacy" onClick={() => setIsOpen(false)}>Privacy</NavLink>

            <Link
              to="/create-event"
              onClick={() => setIsOpen(false)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 
                         text-white font-bold px-14 py-5 rounded-2xl text-xl 
                         shadow-2xl hover:shadow-purple-500/60 
                         flex items-center gap-4 transition-all duration-300 
                         hover:scale-105 active:scale-95"
            >
              <Plus className="w-7 h-7" />
              Create Event
            </Link>
          </div>
        </motion.div>
      </nav>

      {/* Spacer so content isn't hidden under navbar */}
      <div className="h-16 md:h-20" />
    </>
  );
}
