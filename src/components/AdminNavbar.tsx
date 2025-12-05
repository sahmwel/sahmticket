// src/components/AdminNavbar.tsx
import { useState } from "react";
import { X, Menu } from "lucide-react";
import logo from "../assets/logo-white.png";

interface NavbarProps {
  role: "admin" | "organizer";
  onSidebarToggle?: () => void;
}

export default function Navbar({ role, onSidebarToggle }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setMobileOpen(!mobileOpen);
    if (onSidebarToggle) onSidebarToggle();
  };

  return (
    <header className="bg-gradient-to-r from-purple-900 to-pink-900 text-white flex items-center justify-between p-4 md:ml-64">
      <div className="flex items-center gap-2">
        <button className="md:hidden" onClick={toggleSidebar}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <img src={logo} alt="TicketHub" className="w-24 h-auto md:w-32" />
        <span className="font-bold text-lg">{role === "admin" ? "Admin Panel" : "Organizer Panel"}</span>
      </div>
    </header>
  );
}
