// src/layouts/OrganizerLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function OrganizerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar with mobile support */}
      <Sidebar 
        role="organizer" 
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile header with Organizer Panel label */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white"
          >
            <Menu size={24} />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">SahmTicketHub</h1>
            <p className="text-xs text-gray-400">Organizer Panel</p>
          </div>
          
          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Page Content */}
        <div className="flex-1 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          <Outlet />
        </div>
      </div>
    </div>
  );
}