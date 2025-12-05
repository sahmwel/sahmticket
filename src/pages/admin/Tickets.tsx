// src/pages/admin/Tickets.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Tickets() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTickets() {
      const { data } = await supabase.from("tickets").select("*");
      setTickets(data || []);
    }
    fetchTickets();
  }, []);

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Tickets</h1>
          <ul className="space-y-2">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="p-4 bg-white/10 rounded-xl">
                {ticket.event_name} - {ticket.user_email}
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
