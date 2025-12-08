// src/pages/organizer/MyEvents.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  status?: string;
}

export default function MyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);

      try {
        // Get the currently logged-in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          // Redirect to login if not logged in
          window.location.href = "/auth";
          return;
        }

        // Fetch events for this organizer
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("organizer_id", user.id)
          .order("date", { ascending: true });

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="flex">
      <Sidebar role="organizer" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="organizer" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">My Events</h1>

          {loading ? (
            <p className="text-white">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-white">No events found.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="p-4 bg-white/10 rounded-xl">
                  <strong>{event.title}</strong> - {new Date(event.date).toLocaleDateString()} - {event.venue}
                  {event.status && <> - {event.status}</>}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
