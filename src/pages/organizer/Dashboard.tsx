// src/pages/organizer/Dashboard.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: string;
}

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      const organizer_id = supabase.auth.user()?.id;
      if (!organizer_id) return;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", organizer_id)
        .order("date", { ascending: true });

      if (error) console.error(error);
      else setEvents(data || []);
    }

    fetchEvents();
  }, []);

  return (
    <div className="flex">
      <Sidebar role="organizer" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="organizer" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Organizer Dashboard</h1>

          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="p-4 bg-white/10 rounded-xl">
                <strong>{event.title}</strong> <br />
                Date: {new Date(event.date).toLocaleDateString()} <br />
                Venue: {event.venue} <br />
                Status: {event.status}
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
