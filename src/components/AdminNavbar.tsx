// src/components/AdminNavbar.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Menu, X, ChevronDown, User, Settings, LogOut } from "lucide-react";

interface NavbarProps {
  role: "admin" | "organizer";
  onSidebarToggle?: () => void;
}

export default function Navbar({ role, onSidebarToggle }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        // Try to get full name from user metadata or profile
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || "User";
        setUserName(fullName);
      }
    };
    getUser();
  }, []);

  const toggleSidebar = () => {
    setMobileOpen(!mobileOpen);
    if (onSidebarToggle) onSidebarToggle();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="bg-gray-900/95 backdrop-blur-xl border-b border-white/10 text-white sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left side: mobile menu button + logo */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img src="/logo-white.png" alt="SahmTicketHub" className="h-8 w-auto md:h-10" />
          <span className="font-bold text-sm md:text-base text-white/80 hidden sm:inline">
            {role === "admin" ? "Admin Panel" : "Organizer Panel"}
          </span>
        </div>

        {/* Right side: user dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-white">{userName}</div>
              <div className="text-xs text-gray-400">{userEmail}</div>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                <div className="px-4 py-3 border-b border-white/10 md:hidden">
                  <div className="text-sm font-medium text-white">{userName}</div>
                  <div className="text-xs text-gray-400">{userEmail}</div>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(role === "admin" ? "/admin/settings" : "/organizer/profile");
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}