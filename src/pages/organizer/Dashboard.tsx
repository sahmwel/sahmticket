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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error("User not logged in");

        const organizer_id = user.id;

        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("organizer_id", organizer_id)
          .order("date", { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
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

          {loading && <p className="text-white">Loading events...</p>}
          {error && <p className="text-red-400">{error}</p>}

          {!loading && !error && events.length === 0 && (
            <p className="text-white">No events found. Create your first event!</p>
          )}

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
