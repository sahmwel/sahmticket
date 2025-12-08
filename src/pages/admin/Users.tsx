// src/pages/admin/Users.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface User {
  id: string;
  email: string;
  role: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("You must be logged in as admin");

        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, role")
          .order("created_at", { ascending: true });

        if (profilesError) throw profilesError;

        setUsers(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <p className="text-white p-6">Loading users...</p>;
  if (error) return <p className="text-red-400 p-6">Error: {error}</p>;

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Users</h1>
          {users.length === 0 ? (
            <p className="text-white/70">No users found.</p>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id} className="p-4 bg-white/10 rounded-xl">
                  {user.email} - {user.role || "organizer"}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
