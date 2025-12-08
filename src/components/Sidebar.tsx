// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";
import { Home, Users, Calendar, Ticket, Settings, User } from "lucide-react";

interface SidebarProps {
  role: "admin" | "organizer";
}

export default function Sidebar({ role }: SidebarProps) {
  const adminLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: <Home size={18} /> },
    { name: "Users", path: "/admin/users", icon: <Users size={18} /> },
    { name: "Events", path: "/admin/events", icon: <Calendar size={18} /> },
    { name: "Tickets", path: "/admin/tickets", icon: <Ticket size={18} /> },
    { name: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
  ];

  const organizerLinks = [
    { name: "Dashboard", path: "/organizer/dashboard", icon: <Home size={18} /> },
    { name: "My Events", path: "/organizer/myevents", icon: <Calendar size={18} /> },
    { name: "Create Event", path: "/organizer/createevent", icon: <Calendar size={18} /> },
    { name: "Tickets", path: "/organizer/tickets", icon: <Ticket size={18} /> },
    { name: "Profile", path: "/organizer/profile", icon: <User size={18} /> },
  ];

  const links = role === "admin" ? adminLinks : organizerLinks;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-purple-900 to-pink-900 text-white p-6 flex flex-col">
      <div className="mb-8 flex flex-col items-center">
        <img src="/logo-white.png" alt="SahmTicketHub" className="w-32 mb-2" />
        <span className="font-bold text-xl">
          {role === "admin" ? "Admin Panel" : "Organizer Panel"}
        </span>
      </div>
      <nav className="flex-1 flex flex-col gap-3">
        {links.map(link => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition ${
                isActive ? "bg-white/20 font-bold" : ""
              }`
            }
          >
            {link.icon}
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
