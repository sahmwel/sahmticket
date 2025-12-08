// src/pages/admin/Settings.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("You must be logged in as admin");

        setUser(user);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  if (loading) return <p className="text-white p-6">Loading settings...</p>;
  if (error) return <p className="text-red-400 p-6">Error: {error}</p>;

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
          <div className="p-4 bg-white/10 rounded-xl">
            <p className="text-white mb-2">Logged in as: {user.email}</p>
            <p className="text-white/80">Role: {user.user_metadata?.role || "admin"}</p>
          </div>
          <p className="text-white mt-4">Admin settings go here.</p>
        </main>
      </div>
    </div>
  );
}
