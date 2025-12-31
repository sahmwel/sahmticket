// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { 
  Home, 
  Users, 
  Calendar, 
  Ticket, 
  Settings, 
  User,
  PlusCircle,
  BarChart3,
  List,
  Shield,
  LogOut,
  LayoutDashboard,
  FileText,
  CreditCard,
  Bell
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role: "admin" | "organizer";
}

export default function Sidebar({ role }: SidebarProps) {
  const [activeGroup, setActiveGroup] = useState<string>("");

  const adminLinks = [
    {
      title: "Dashboard",
      links: [
        { name: "Overview", path: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
        { name: "Analytics", path: "/admin/analytics", icon: <BarChart3 size={18} /> },
      ]
    },
    {
      title: "Content Management",
      links: [
        { name: "Events", path: "/admin/events", icon: <Calendar size={18} /> },
        { name: "Categories", path: "/admin/categories", icon: <List size={18} /> },
        { name: "Featured", path: "/admin/featured", icon: <Bell size={18} /> },
      ]
    },
    {
      title: "User Management",
      links: [
        { name: "Users", path: "/admin/users", icon: <Users size={18} /> },
        { name: "Organizers", path: "/admin/organizers", icon: <Shield size={18} /> },
      ]
    },
    {
      title: "Financial",
      links: [
        { name: "Tickets", path: "/admin/tickets", icon: <Ticket size={18} /> },
        { name: "Transactions", path: "/admin/transactions", icon: <CreditCard size={18} /> },
        { name: "Reports", path: "/admin/reports", icon: <FileText size={18} /> },
      ]
    },
    {
      title: "System",
      links: [
        { name: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
        { name: "Logs", path: "/admin/logs", icon: <FileText size={18} /> },
      ]
    }
  ];

  const organizerLinks = [
    {
      title: "Overview",
      links: [
        { name: "Dashboard", path: "/organizer/dashboard", icon: <LayoutDashboard size={18} /> },
        // { name: "Analytics", path: "/organizer/analytics", icon: <BarChart3 size={18} /> },
      ]
    },
    {
      title: "Event Management",
      links: [
        { name: "My Events", path: "/organizer/events", icon: <List size={18} /> },
        { name: "Create Event", path: "/organizer/create-event", icon: <PlusCircle size={18} /> },
        // { name: "Calendar", path: "/organizer/calendar", icon: <Calendar size={18} /> },
      ]
    },
    {
      title: "Tickets & Sales",
      links: [
        { name: "Tickets", path: "/organizer/tickets", icon: <Ticket size={18} /> },
        // { name: "Sales", path: "/organizer/sales", icon: <CreditCard size={18} /> },
        // { name: "Attendees", path: "/organizer/attendees", icon: <Users size={18} /> },
      ]
    },
    {
      title: "Account",
      links: [
        { name: "Profile", path: "/organizer/profile", icon: <User size={18} /> },
        // { name: "Settings", path: "/organizer/settings", icon: <Settings size={18} /> },
        // { name: "Notifications", path: "/organizer/notifications", icon: <Bell size={18} /> },
      ]
    }
  ];

  const links = role === "admin" ? adminLinks : organizerLinks;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 to-gray-950 text-white border-r border-gray-800 flex flex-col">
      {/* Logo & Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg">SahmTicketHub</h1>
            <p className="text-xs text-gray-400">{role === "admin" ? "Admin Panel" : "Organizer Panel"}</p>
          </div>
        </div>
        
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-6">
          {links.map((group, index) => (
            <div key={index} className="space-y-2">
              <h3 
                className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => setActiveGroup(activeGroup === group.title ? "" : group.title)}
              >
                <div className="flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="text-xs">
                    {activeGroup === group.title ? "−" : "+"}
                  </span>
                </div>
              </h3>
              
              <div className={`space-y-1 ${activeGroup === group.title ? 'block' : 'hidden'}`}>
                {group.links.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                        isActive 
                          ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 border-l-4 border-purple-500" 
                          : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                      }`
                    }
                  >
                    <div className={`${link.path.includes('/organizer/create-event') || link.path.includes('/admin/analytics') 
                      ? "text-purple-400" 
                      : "text-gray-500 group-hover:text-purple-400"} transition-colors`}>
                      {link.icon}
                    </div>
                    <span className="font-medium text-sm">{link.name}</span>
                    {link.path.includes('/organizer/create-event') && (
                      <span className="ml-auto text-xs bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center gap-3 w-full px-3 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all group">
          <div className="p-1.5 bg-gray-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
            <LogOut size={16} />
          </div>
          <span className="font-medium text-sm">Log Out</span>
        </button>
        
        {/* Version */}
        <div className="mt-4 pt-4 border-t border-gray-800/50">
          <p className="text-xs text-gray-500 text-center">v1.0.0 • SahmTicketHub</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
  );
}