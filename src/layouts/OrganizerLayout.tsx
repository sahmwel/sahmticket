// src/layouts/OrganizerLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/AdminNavbar";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function OrganizerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 md:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <Sidebar role="organizer" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-white">TicketHub</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          <Navbar role="organizer" />
          <Outlet /> {/* ← This renders Dashboard, MyEvents, EventDetails, etc. */}
        </div>
      </div>
    </div>
  );
}