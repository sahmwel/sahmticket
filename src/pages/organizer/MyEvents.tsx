// src/pages/organizer/MyEvents.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Calendar, MapPin, PlusCircle, ExternalLink, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: "draft" | "published" | "cancelled" | "completed";
  cover_image?: string | null;
}

export default function OrganizerMyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
  async function fetchEvents() {
    // THIS IS THE CORRECT, RELIABLE WAY — same as your working Tickets page
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, date, venue, status, cover_image")
        .eq("organizer_id", session.user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  fetchEvents();
}, [navigate]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-4 py-2 rounded-full text-xs font-semibold border ${styles[status] || "bg-gray-500/20 text-gray-300 border-gray-500/50"}`;
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - Slide in on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:z-auto`}
      >
        <Sidebar role="organizer" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Top bar for mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">My Events</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">

          <main className="p-6 lg:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">My Events</h1>
                <p className="text-gray-400">All events you’ve created and are listed here</p>
              </div>

              <button
                onClick={() => navigate("/organizer/create-event")}
                className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 transition-all text-white px-6 py-3.5 rounded-xl font-medium shadow-lg hover:shadow-purple-500/30"
              >
                <PlusCircle size={22} />
                Create New Event
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center py-32">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
              </div>
            )}

            {/* Empty State */}
            {!loading && events.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl mb-8">
                  <Calendar size={56} className="text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No events yet</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  You haven’t created any events. Start by creating your first one!
                </p>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transition"
                >
                  <PlusCircle className="inline mr-2" size={22} />
                  Create Your First Event
                </button>
              </div>
            )}

            {/* Events Grid */}
            {!loading && events.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/organizer/event/${event.id}`)}
                    className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
                  >
                    {/* Cover Image */}
                    <div className="h-48 relative overflow-hidden">
                      {event.cover_image ? (
                        <img
                          src={event.cover_image}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600/40 to-pink-600/40" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <p className="text-sm opacity-90">Event Date</p>
                        <p className="text-2xl font-bold">
                          {new Date(event.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition">
                        {event.title}
                      </h3>

                      <div className="flex items-center gap-2 text-gray-400 mb-5">
                        <MapPin size={18} />
                        <span className="text-sm">{event.venue || "Venue not set"}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={getStatusBadge(event.status || "draft")}>
                          {(event.status || "draft").charAt(0).toUpperCase() + (event.status || "draft").slice(1)}
                        </span>

                        <ExternalLink
                          size={18}
                          className="text-purple-400 opacity-0 group-hover:opacity-100 transition"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}