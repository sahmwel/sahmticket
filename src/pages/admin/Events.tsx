// src/pages/admin/Events.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  organizer_id?: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        // ✅ Check for logged-in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("You must be logged in as admin");

        // Fetch events
        const { data, error } = await supabase
          .from("events")
          .select("*")
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

  if (loading) return <p className="text-white p-6">Loading events...</p>;
  if (error) return <p className="text-red-400 p-6">Error: {error}</p>;

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Events</h1>
          {events.length === 0 ? (
            <p className="text-white/70">No events found.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="p-4 bg-white/10 rounded-xl">
                  <strong>{event.title}</strong> - {new Date(event.date).toLocaleDateString()} - {event.venue}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
