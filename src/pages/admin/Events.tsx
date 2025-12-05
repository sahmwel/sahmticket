// src/pages/admin/Events.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase.from("events").select("*");
      setEvents(data || []);
    }
    fetchEvents();
  }, []);

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Events</h1>
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="p-4 bg-white/10 rounded-xl">
                {event.name} - {event.date}
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
