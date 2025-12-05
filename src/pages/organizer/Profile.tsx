// src/pages/organizer/Profile.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Profile() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const sessionUser = supabase.auth.user();
    setUser(sessionUser);
  }, []);

  return (
    <div className="flex">
      <Sidebar role="organizer" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="organizer" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Profile</h1>
          {user && (
            <div className="p-4 bg-white/10 rounded-xl">
              <p>Email: {user.email}</p>
              <p>Role: {user.user_metadata?.role}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
