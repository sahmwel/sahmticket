// src/pages/organizer/Dashboard.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Calendar, 
  MapPin, 
  PlusCircle, 
  Ticket, 
  Menu,
  DollarSign,
  TrendingUp,
  Clock,
  Eye,
  ExternalLink,
  BarChart3,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  location?: string | null;
  image?: string | null;
  cover_image?: string | null;
  status: "draft" | "published" | "cancelled" | "completed";
  created_at: string;
  total_tickets_sold: number;
  total_revenue: number;
  ticketTiers?: any[];
  slug?: string;
}

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      if (eventsError) throw eventsError;

      const enrichedEvents = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          let totalSold = 0;
          let totalRevenue = 0;
          let ticketTiers: any[] = [];

          // Check purchases table
          const { data: purchases } = await supabase
            .from("purchases")
            .select("quantity, price")
            .eq("event_id", event.id);

          if (purchases && purchases.length > 0) {
            purchases.forEach((p: any) => {
              const qty = Number(p.quantity) || 0;
              const price = Number(p.price) || 0;
              totalSold += qty;
              totalRevenue += (price * qty);
            });
          }

          // Fallback to ticketTiers table
          if (totalSold === 0) {
            const { data: tiersData } = await supabase
              .from("ticketTiers")
              .select("quantity_sold, price")
              .eq("event_id", event.id);

            if (tiersData && tiersData.length > 0) {
              tiersData.forEach((tier: any) => {
                const sold = Number(tier.quantity_sold) || 0;
                const price = Number(tier.price) || 0;
                totalSold += sold;
                totalRevenue += (price * sold);
              });
            }
          }

          // Get ticket tiers
          const { data: tiersCount } = await supabase
            .from("ticketTiers")
            .select("id")
            .eq("event_id", event.id);

          ticketTiers = tiersCount || [];

          return {
            ...event,
            ticketTiers: ticketTiers,
            total_tickets_sold: totalSold,
            total_revenue: totalRevenue,
          };
        })
      );

      setEvents(enrichedEvents);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-500/20 text-green-300 border-green-500/50";
      case "draft": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "cancelled": return "bg-red-500/20 text-red-300 border-red-500/50";
      case "completed": return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "Date not set";

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      
      const datePart = timestamp.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[month - 1];
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(year, month - 1, day);
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const formattedDate = `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''}`;
      
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${hours}:${minutes} ${ampm}`;

      if (diffDays < -1) return `${formattedDate} (Past)`;
      if (diffDays === -1) return `Yesterday at ${formattedTime}`;
      if (diffDays === 0) return `Today at ${formattedTime}`;
      if (diffDays === 1) return `Tomorrow at ${formattedTime}`;
      if (diffDays <= 7) return `${formattedDate} (in ${diffDays} days)`;
      
      return formattedDate;
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDateOnly = (timestamp: string | null) => {
    if (!timestamp) return "No date";
    try {
      const datePart = timestamp.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[month - 1];
      
      return `${monthName} ${day}, ${year}`;
    } catch {
      return "Invalid date";
    }
  };

  // Calculate statistics
  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(e => {
      try {
        const eventDate = new Date(e.date);
        const now = new Date();
        return eventDate > now && e.status === "published";
      } catch {
        return false;
      }
    }).length,
    publishedEvents: events.filter(e => e.status === "published").length,
    draftEvents: events.filter(e => e.status === "draft").length,
    completedEvents: events.filter(e => {
      try {
        const eventDate = new Date(e.date);
        const now = new Date();
        return eventDate < now && e.status === "published";
      } catch {
        return false;
      }
    }).length,
    totalTicketsSold: events.reduce((sum: number, e) => sum + (e.total_tickets_sold || 0), 0),
    totalRevenue: events.reduce((sum: number, e) => sum + (e.total_revenue || 0), 0),
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchEvents();
    toast.success("Dashboard refreshed!");
  };

  const goToMyEvents = () => {
    navigate("/organizer/my-events");
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
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
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="flex-1 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
          <main className="p-6 lg:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Overview of your events and performance</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition"
                  aria-label="Refresh dashboard data"
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
                <button
                  onClick={goToMyEvents}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition"
                  aria-label="View all events"
                >
                  <Eye size={18} />
                  View All Events
                </button>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 text-white px-6 py-3.5 rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                  aria-label="Create new event"
                >
                  <PlusCircle size={22} />
                  Create New Event
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Events</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.totalEvents}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Calendar className="text-purple-400" size={24} />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  {stats.publishedEvents} published • {stats.draftEvents} drafts
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tickets Sold</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {stats.totalTicketsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Ticket className="text-green-400" size={24} />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Across all your events
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      ₦{stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-blue-400" size={24} />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  {stats.totalTicketsSold > 0 
                    ? `Avg: ₦${Math.round(stats.totalRevenue / stats.totalTicketsSold).toLocaleString()} per ticket`
                    : "No sales yet"
                  }
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Events</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.publishedEvents}</p>
                  </div>
                  <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-pink-400" size={24} />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  {stats.upcomingEvents} upcoming • {stats.completedEvents} completed
                </div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Upcoming Events</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">{stats.upcomingEvents}</p>
                  </div>
                  <Clock className="text-green-400" size={32} />
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Events happening in the future
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Events in Draft</p>
                    <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.draftEvents}</p>
                  </div>
                  <Calendar className="text-yellow-400" size={32} />
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Not published yet
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Completed Events</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{stats.completedEvents}</p>
                  </div>
                  <Ticket className="text-blue-400" size={32} />
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Past events with sales data
                </div>
              </div>
            </div>

            {/* Recent Events Section */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Recent Events</h2>
              <button
                onClick={goToMyEvents}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium group"
                aria-label="View all events"
              >
                View All 
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
                <p className="ml-4 text-gray-400">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl">
                <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <Calendar size={48} className="text-gray-600" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2">No events yet</h3>
                <p className="text-gray-400 mb-8">Get started by creating your first event!</p>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-xl text-white font-medium shadow-lg transition hover:scale-105"
                  aria-label="Create your first event"
                >
                  <PlusCircle className="inline mr-2" size={20} />
                  Create Your First Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {events.map((event) => {
                  const imageUrl = event.image || event.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                  const ticketsSold = event.total_tickets_sold || 0;
                  const revenue = event.total_revenue || 0;
                  const formattedDate = formatDate(event.date);
                  const dateOnly = formatDateOnly(event.date);

                  return (
                    <div
                      key={event.id}
                      className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                      role="article"
                      aria-labelledby={`event-title-${event.id}`}
                    >
                      {/* Event Banner */}
                      <div className="h-48 relative overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt={`Cover image for ${event.title}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                          }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute top-4 right-4">
                          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                            <p className="text-xs opacity-90">Event Date</p>
                            <p className="text-sm font-bold">{formattedDate}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h3 
                            id={`event-title-${event.id}`}
                            className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2"
                          >
                            {event.title}
                          </h3>
                          <span 
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}
                            aria-label={`Status: ${event.status}`}
                          >
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-400 mb-6">
                          <MapPin size={16} aria-hidden="true" />
                          <span className="text-sm truncate">{event.venue || "Venue not set"}</span>
                        </div>

                        {/* Event Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Tiers</div>
                            <div className="text-white font-semibold text-lg">
                              {event.ticketTiers?.length || 0}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Sold</div>
                            <div className="text-white font-semibold text-lg">
                              {ticketsSold.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Revenue</div>
                            <div className="text-green-400 font-semibold text-lg">
                              ₦{revenue.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Date</div>
                            <div className="text-white font-semibold text-sm">
                              {dateOnly}
                            </div>
                          </div>
                        </div>

                        {/* Date and Action */}
                        <div className="flex items-center justify-between pt-6 border-t border-white/10">
                          <div className="text-sm text-gray-400">
                            {event.time && (
                              <div className="flex items-center gap-1">
                                <Clock size={12} aria-hidden="true" />
                                <span>{event.time}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/organizer/event/${event.id}`);
                              }}
                              className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1 hover:bg-white/5 px-3 py-1.5 rounded-lg transition"
                              aria-label={`View details for ${event.title}`}
                            >
                              <Eye size={14} /> Details
                            </button>
                            {event.slug && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/event/${event.slug}`);
                                }}
                                className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-1 hover:bg-white/5 px-3 py-1.5 rounded-lg transition"
                                aria-label={`View public page for ${event.title}`}
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Actions */}
            {events.length > 0 && (
              <div className="mt-10 p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-white/10 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => navigate("/organizer/create-event")}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-left transition flex items-center gap-3 group"
                    aria-label="Create new event"
                  >
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition">
                      <PlusCircle size={20} />
                    </div>
                    <div>
                      <p className="font-medium">Create New Event</p>
                      <p className="text-gray-400 text-sm">Start a new event</p>
                    </div>
                  </button>
                  <button
                    onClick={goToMyEvents}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-left transition flex items-center gap-3 group"
                    aria-label="View all events"
                  >
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition">
                      <Eye size={20} />
                    </div>
                    <div>
                      <p className="font-medium">View All Events</p>
                      <p className="text-gray-400 text-sm">See complete event list</p>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate("/organizer/analytics")}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-left transition flex items-center gap-3 group"
                    aria-label="View analytics"
                  >
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <p className="font-medium">View Analytics</p>
                      <p className="text-gray-400 text-sm">Check detailed reports</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}