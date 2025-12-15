// src/pages/organizer/EventDetails.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, DollarSign, Edit3, Menu, ArrowLeft } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  description?: string;
  banner_url?: string | null;
  status: "draft" | "published" | "cancelled" | "completed";
  tickets_sold?: number;
  revenue?: number;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("events")
          .select(`id,title,date,venue,address,description,banner_url,status,tickets_sold,revenue`)
          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();

        if (error || !data) throw new Error("Event not found");

        const [eventDate, eventTime] = data.date.includes("T")
          ? data.date.split("T")
          : [data.date, undefined];

        setEvent({ ...data, date: eventDate, time: eventTime });
      } catch (err) {
        console.error(err);
        navigate("/organizer/events");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <div
        className={`
          z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10
          transform transition-transform duration-300 ease-in-out
          fixed inset-y-0 left-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:transform-none
        `}
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
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Mobile Top bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white truncate max-w-48">{event.title}</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-white flex items-center gap-1"
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <Navbar role="organizer" />

          <main className="p-6 lg:p-10">
            {/* Hero */}
            <div className="relative h-80 rounded-3xl overflow-hidden mb-10">
              {event.banner_url ? (
                <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <h1 className="text-4xl font-bold mb-3">{event.title}</h1>
                <div className="flex flex-wrap gap-6 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar size={16} />
                    {new Date(event.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {event.time && ` • ${event.time}`}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin size={16} /> {event.venue}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left */}
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-3">About this Event</h2>
                  <p className="text-gray-300 leading-relaxed">
                    {event.description || "No description provided."}
                  </p>
                </section>

                <div className="grid grid-cols-2 gap-6">
                  <Stat icon={<Ticket />} value={event.tickets_sold || 0} label="Tickets Sold" />
                  <Stat
                    icon={<DollarSign />}
                    value={`₦${(event.revenue || 0).toLocaleString()}`}
                    label="Revenue"
                  />
                </div>
              </div>

              {/* Right */}
              <aside className="space-y-6">
                <button
                  onClick={() => navigate(`/organizer/event/${id}/edit`)}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-4 rounded-2xl text-white font-bold shadow-xl transition"
                >
                  <Edit3 size={20} /> Edit Event
                </button>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">Event Status</h3>
                  <span className="px-4 py-2 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </span>
                </div>

                {event.address && (
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">Location</h3>
                    <p className="text-gray-300">{event.address}</p>
                  </div>
                )}
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
      <div className="mb-3 text-purple-400 flex justify-center">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}
