// src/pages/organizer/Profile.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface UserProfile {
  id: string;
  email: string;
  role?: string;
}

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (!user) {
          // Redirect to login if not logged in
          window.location.href = "/auth";
          return;
        }

        setUser({
          id: user.id,
          email: user.email ?? "",
          role: user.user_metadata?.role ?? "organizer",
        });
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="flex">
      <Sidebar role="organizer" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="organizer" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Profile</h1>

          {loading ? (
            <p className="text-white">Loading profile...</p>
          ) : user ? (
            <div className="p-4 bg-white/10 rounded-xl">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
            </div>
          ) : (
            <p className="text-white">User not found.</p>
          )}
        </main>
      </div>
    </div>
  );
}
