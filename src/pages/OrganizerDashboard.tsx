'use client';

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Calendar, Users, TrendingUp, Ticket, Menu, X, 
  LogOut, Sparkles 
} from "lucide-react";

// Sample events (you can later connect to real data)
const myEvents = [
  { id: "1", title: "Detty December 2025", date: "Dec 27, 2025", ticketSold: 842, revenue: "₦84.4m", status: "Live" },
  { id: "2", title: "Lagos Tech Summit", date: "Jan 15, 2026", ticketSold: 120, revenue: "₦12m", status: "Draft" },
  { id: "3", title: "Afrobeats Pool Party", date: "Feb 14, 2026", ticketSold: 490, revenue: "₦70m", status: "Live" },
];

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* ONLY CHANGE: Fixes sticky navbar overlap */}
      <div className="pt-24 lg:pt-28">

        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: sidebarOpen ? 0 : -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-purple-900 to-pink-900 text-white z-50 lg:translate-x-0"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-12">
                <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
                  TicketHub
                </h1>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                  <X size={28} className="text-white" />
                </button>
              </div>

              <button
                onClick={() => navigate("/create-event-form")}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:scale-105 transition shadow-2xl mb-12"
              >
                <Plus size={28} />
                Create New Event
              </button>

              <nav className="space-y-4">
                <a href="#" className="flex items-center gap-4 py-4 px-6 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition">
                  <TrendingUp size={24} /> Dashboard
                </a>
                <a href="#" className="flex items-center gap-4 py-4 px-6 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition">
                  <Ticket size={24} /> My Events
                </a>
                <a href="#" className="flex items-center gap-4 py-4 px-6 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition">
                  <Users size={24} /> Attendees
                </a>
                <a href="#" className="flex items-center gap-4 py-4 px-6 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition">
                  <Calendar size={24} /> Analytics
                </a>
              </nav>

              <button className="absolute bottom-8 left-8 flex items-center gap-3 text-pink-200 hover:text-white transition">
                <LogOut size={24} /> Logout
              </button>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="lg:ml-80">

            {/* Top Bar */}
            <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-purple-100 sticky top-0 z-30">
              <div className="flex items-center justify-between px-8 py-6">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu size={32} className="text-purple-600" />
                </button>
                <h2 className="text-3xl font-black text-gray-900">Welcome back, Organizer!</h2>
                <div className="flex items-center gap-4">
                  <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
                <h3 className="text-5xl font-black">₦142m</h3>
                <p className="text-pink-100 text-xl mt-2">Total Revenue</p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-2xl border border-purple-100">
                <h3 className="text-5xl font-black text-purple-600">1,412</h3>
                <p className="text-gray-700 text-xl mt-2">Tickets Sold</p>
              </div>
              <div className="bg-white rounded-3xl p-8 shadow-2xl border border-purple-100">
                <h3 className="text-5xl font-black text-pink-600">3</h3>
                <p className="text-gray-700 text-xl mt-2">Active Events</p>
              </div>
            </div>

            {/* Events List */}
            <div className="px-8 pb-20">
              <h2 className="text-4xl font-black mb-8 text-gray-900">Your Events</h2>
              <div className="space-y-6">
                {myEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100 flex items-center justify-between cursor-pointer hover:shadow-2xl transition"
                  >
                    <div>
                      <h3 className="text-2xl font-black text-gray-900">{event.title}</h3>
                      <div className="flex items-center gap-6 mt-4 text-gray-600">
                        <span className="flex items-center gap-2">
                          <Calendar size={20} /> {event.date}
                        </span>
                        <span className="flex items-center gap-2">
                          <Ticket size={20} /> {event.ticketSold} sold
                        </span>
                        <span className="font-bold text-purple-600">{event.revenue}</span>
                      </div>
                    </div>
                    <div className={`px-6 py-3 rounded-full font-bold text-white ${event.status === "Live" ? "bg-green-600" : "bg-gray-600"}`}>
                      {event.status}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Empty State */}
              {myEvents.length === 0 && (
                <div className="text-center py-20">
                  <Sparkles className="w-24 h-24 text-purple-300 mx-auto mb-8" />
                  <h3 className="text-3xl font-black text-gray-900 mb-4">No events yet</h3>
                  <p className="text-xl text-gray-600">Create your first event and start selling tickets!</p>
                  <button
                    onClick={() => navigate("/create-event-form")}
                    className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-12 py-6 rounded-full text-2xl font-bold hover:scale-105 transition shadow-2xl"
                  >
                    Create Event Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}