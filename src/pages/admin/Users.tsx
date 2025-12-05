// src/pages/admin/Users.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from("users").select("*");
      setUsers(data || []);
    }
    fetchUsers();
  }, []);

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Users</h1>
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user.id} className="p-4 bg-white/10 rounded-xl">
                {user.email} - {user.user_metadata?.role || "organizer"}
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
