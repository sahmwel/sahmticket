// src/pages/admin/Events.tsx - UPDATED FOR RESPONSIVENESS + PROPER AUTH
import Sidebar from "../../components/Sidebar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import {
  Calendar,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Loader2,
  Menu,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  DollarSign,
  Ticket,
  Star,
  MoreVertical,
  X,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  venue: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  image?: string;
  status: "draft" | "published" | "cancelled" | "completed";
  organizer_id: string;
  created_at: string;
  updated_at?: string;
  slug?: string;
  featured?: boolean;
  trending?: boolean;
  ticketTiers?: any[];
  total_tickets_sold?: number;
  total_revenue?: number;
}

interface EventStats {
  totalEvents: number;
  published: number;
  draft: number;
  cancelled: number;
  completed: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

interface EnrichedEvent {
  status: 'published' | 'draft' | 'cancelled' | 'completed' | string;
  total_tickets_sold?: number;
  total_revenue?: number;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    published: 0,
    draft: 0,
    cancelled: 0,
    completed: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");

  const navigate = useNavigate();

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // ✅ Get current user with token refresh
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/auth");
        return;
      }

      // Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          date,
          time,
          venue,
          location,
          city,
          state,
          country,
          image,
          status,
          organizer_id,
          created_at,
          updated_at,
          slug,
          featured,
          trending,
          ticketTiers
        `)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      // Enrich with ticket sales data from tickets table
      const enrichedEvents = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          let totalSold = 0;
          let totalRevenue = 0;

          // Get tickets for this event
          const { data: tickets } = await supabase
            .from("tickets")
            .select("quantity, amount_in_ngn")
            .eq("event_id", event.id);

          if (tickets) {
            tickets.forEach((t: any) => {
              totalSold += t.quantity || 1;
              totalRevenue += t.amount_in_ngn || 0;
            });
          }

          return {
            ...event,
            total_tickets_sold: totalSold,
            total_revenue: totalRevenue,
          };
        })
      );

      setEvents(enrichedEvents);

      // Calculate stats
// Calculate stats using your Event interface
const published = (enrichedEvents as Event[]).filter((e: Event) => e.status === "published").length;
const draft = (enrichedEvents as Event[]).filter((e: Event) => e.status === "draft").length;
const cancelled = (enrichedEvents as Event[]).filter((e: Event) => e.status === "cancelled").length;
const completed = (enrichedEvents as Event[]).filter((e: Event) => e.status === "completed").length;

// For reduce, we type the 'sum' as number and 'e' as Event
const totalTicketsSold = (enrichedEvents as Event[]).reduce(
  (sum: number, e: Event) => sum + (e.total_tickets_sold || 0), 
  0
);

const totalRevenue = (enrichedEvents as Event[]).reduce(
  (sum: number, e: Event) => sum + (e.total_revenue || 0), 
  0
);


      setStats({
        totalEvents: enrichedEvents.length,
        published,
        draft,
        cancelled,
        completed,
        totalTicketsSold,
        totalRevenue,
      });

    } catch (err: any) {
      console.error("Fetch events error:", err);
      setError(err.message);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter and sort events
  useEffect(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.venue.toLowerCase().includes(term) ||
          e.location?.toLowerCase().includes(term) ||
          e.city?.toLowerCase().includes(term) ||
          e.country?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    // Apply sorting
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "title-asc") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "title-desc") {
      filtered.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === "date-asc") {
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === "date-desc") {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "sales-high") {
      filtered.sort((a, b) => (b.total_tickets_sold || 0) - (a.total_tickets_sold || 0));
    } else if (sortBy === "sales-low") {
      filtered.sort((a, b) => (a.total_tickets_sold || 0) - (b.total_tickets_sold || 0));
    } else if (sortBy === "revenue-high") {
      filtered.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    } else if (sortBy === "revenue-low") {
      filtered.sort((a, b) => (a.total_revenue || 0) - (b.total_revenue || 0));
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter, sortBy]);

  const handleRefresh = () => {
    setLoading(true);
    fetchEvents();
    toast.success("Events refreshed!");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-2 py-1 rounded-full text-xs font-medium border ${
      styles[status] || "bg-gray-500/20 text-gray-300 border-gray-500/50"
    }`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Events</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-white/10"
      >
        <Menu size={24} className="text-white" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-950 border-r border-white/10">
            <Sidebar role="admin" />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar role="admin" />
      </div>

      {/* Main content */}
{/* Main content */}
<div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Events</h1>
                <p className="text-gray-400 text-sm sm:text-base">Manage all platform events</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition disabled:opacity-50"
                >
                  <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Events</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.totalEvents}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Calendar className="text-purple-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Published</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 mt-1">{stats.published}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Drafts</p>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-400 mt-1">{stats.draft}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Clock className="text-yellow-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Tickets Sold</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.totalTicketsSold.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Ticket className="text-blue-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search events by title, venue, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/60"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/60"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="date-asc">Date (Earliest)</option>
                  <option value="date-desc">Date (Latest)</option>
                  <option value="sales-high">Sales (High-Low)</option>
                  <option value="sales-low">Sales (Low-High)</option>
                  <option value="revenue-high">Revenue (High-Low)</option>
                  <option value="revenue-low">Revenue (Low-High)</option>
                </select>
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/10 text-gray-300">
                    <tr>
                      <th className="px-6 py-3 font-medium">Event</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Venue</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Organizer</th>
                      <th className="px-6 py-3 font-medium">Tickets Sold</th>
                      <th className="px-6 py-3 font-medium">Revenue</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-white font-medium">{event.title}</div>
                            {event.featured && (
                              <span className="text-xs text-purple-400 flex items-center gap-1 mt-1">
                                <Star size={12} /> Featured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {formatDate(event.date)}
                          {event.time && <div className="text-xs text-gray-500">{event.time}</div>}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          <div>{event.venue}</div>
                          {event.city && <div className="text-xs text-gray-500">{event.city}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={getStatusBadge(event.status)}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {event.organizer_id ? event.organizer_id.substring(0, 8) + "..." : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-white">{event.total_tickets_sold || 0}</td>
                        <td className="px-6 py-4 text-green-400">{formatCurrency(event.total_revenue || 0)}</td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
                              className="p-1 hover:bg-white/10 rounded-lg transition"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>
                            {openMenuId === event.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                                  <button
                                    onClick={() => {
                                      navigate(`/event/${event.slug || event.id}`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                  >
                                    <Eye size={14} /> View Event
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigate(`/organizer/event/${event.id}/edit`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                  >
                                    <Edit size={14} /> Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      // TODO: implement delete with confirmation
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                                  >
                                    <Trash2 size={14} /> Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                          No events found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary footer */}
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredEvents.length} of {stats.totalEvents} total events
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}