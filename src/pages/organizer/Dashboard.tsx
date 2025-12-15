// src/pages/organizer/Dashboard.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Calendar, MapPin, PlusCircle, Ticket, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: "draft" | "published" | "cancelled" | "completed";
}

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("events")
          .select("id, title, date, venue, status")
          .eq("organizer_id", user.id)
          .order("date", { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-500/20 text-green-300 border-green-500/50";
      case "draft": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "cancelled": return "bg-red-500/20 text-red-300 border-red-500/50";
      case "completed": return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - Mobile Slide-in */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:z-auto`}
      >
        <Sidebar role="organizer" />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
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

        <div className="flex-1 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
  

          <main className="p-6 lg:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">My Events</h1>
                <p className="text-gray-400">Manage and track all your upcoming and past events</p>
              </div>
              <button
                onClick={() => navigate("/organizer/create-event")}
                className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 transition-all duration-200 text-white px-6 py-3.5 rounded-xl font-medium shadow-lg hover:shadow-purple-500/25"
              >
                <PlusCircle size={22} />
                Create New Event
              </button>
            </div>

            {/* Stats Overview - EXACTLY AS YOU HAD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Events</p>
                    <p className="text-3xl font-bold text-white mt-1">{events.length}</p>
                  </div>
                  <Calendar className="text-purple-400" size={32} />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Upcoming</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {events.filter(e => new Date(e.date) > new Date() && e.status === "published").length}
                    </p>
                  </div>
                  <Ticket className="text-green-400" size={32} />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">In Draft</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {events.filter(e => e.status === "draft").length}
                    </p>
                  </div>
                  <Calendar className="text-yellow-400" size={32} />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {events.filter(e => e.status === "completed").length}
                    </p>
                  </div>
                  <Ticket className="text-blue-400" size={32} />
                </div>
              </div>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <Calendar size={48} className="text-gray-600" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2">No events yet</h3>
                <p className="text-gray-400 mb-8">Get started by creating your first event!</p>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-xl text-white font-medium shadow-lg transition"
                >
                  <PlusCircle className="inline mr-2" size={20} />
                  Create Your First Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/organizer/event/${event.id}`)}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group cursor-pointer"
                  >
                    <div className="h-32 bg-gradient-to-r from-purple-600/40 to-pink-600/40 relative overflow-hidden border-b border-white/10">
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition"></div>
                      <div className="absolute bottom-4 left-6 text-white">
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

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                        {event.title}
                      </h3>

                      <div className="flex items-center gap-2 text-gray-400 mb-5">
                        <MapPin size={16} />
                        <span className="text-sm">{event.venue}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-4 py-2 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>

                        <span className="text-purple-400 font-medium text-sm">
                          Manage
                        </span>
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