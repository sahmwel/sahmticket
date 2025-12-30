// src/pages/organizer/MyEvents.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Calendar,
  MapPin,
  PlusCircle,
  ExternalLink,
  Menu,
  Edit,
  Eye,
  Trash2,
  Upload,
  Filter,
  Search,
  MoreVertical,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";

// ── Interfaces ────────────────────────────────────────────────────────────────

interface TicketTier {
  id: string;
  event_id: string;
  tier_name: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  venue: string;
  location?: string | null;
  image?: string | null;
  cover_image?: string | null;
  category_id?: number | null;
  organizer_id: string;
  slug?: string | null;
  status: "draft" | "published" | "cancelled" | "completed";
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;

  featured?: boolean;
  trending?: boolean;
  isnew?: boolean;
  sponsored?: boolean;

  // This can come from either ticketTiers column (JSONB) or separate table
  ticketTiers?: TicketTier[] | any[];

  // Client-calculated
  total_tickets_sold?: number;
  total_revenue?: number;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function OrganizerMyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEvents() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      try {
        console.log("🔄 Fetching events for organizer:", session.user.id);
        
        // Fetch events with all columns including ticketTiers (JSONB column)
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("organizer_id", session.user.id)
          .order("created_at", { ascending: false });

        if (eventsError) {
          console.error("❌ Events fetch error:", eventsError);
          throw eventsError;
        }

        console.log(`✅ Found ${eventsData?.length || 0} events`);

        // Process each event to get ticket tiers
        const enriched = await Promise.all(
          (eventsData || []).map(async (event: any) => {
            let ticketTiers: TicketTier[] = [];
            let totalSold = 0;
            let totalRevenue = 0;

            // Check if event has ticketTiers in JSONB column
            if (event.ticketTiers && Array.isArray(event.ticketTiers)) {
              console.log(`📊 Event ${event.id} has ticketTiers in JSONB column:`, event.ticketTiers.length);
              
              // Process ticket tiers from events.ticketTiers JSONB column
              ticketTiers = event.ticketTiers.map((tier: any, index: number) => ({
                id: tier.id || `json-${event.id}-${index}`,
                event_id: event.id,
                tier_name: tier.name || tier.tier_name || `Tier ${index + 1}`,
                description: tier.description || null,
                price: typeof tier.price === 'number' ? tier.price : parseFloat(tier.price) || 0,
                quantity_total: tier.quantity || tier.quantity_total || 100,
                quantity_sold: tier.quantity_sold || 0,
                is_active: tier.is_active !== false,
                created_at: tier.created_at || new Date().toISOString(),
                updated_at: tier.updated_at || null
              }));

              // Calculate totals from JSONB tiers
              ticketTiers.forEach((tier: TicketTier) => {
                totalSold += tier.quantity_sold || 0;
                totalRevenue += (tier.price || 0) * (tier.quantity_sold || 0);
              });
            } else {
              console.log(`📊 Event ${event.id} has no ticketTiers in JSONB column, checking separate table...`);
              
              // Try to fetch from separate ticketTiers table
              try {
                const { data: tiersData, error: tiersError } = await supabase
                  .from("ticketTiers")
                  .select("*")
                  .eq("event_id", event.id)
                  .eq("is_active", true);

                if (tiersError) {
                  console.warn(`⚠️ Could not fetch from ticketTiers table for event ${event.id}:`, tiersError.message);
                } else if (tiersData && tiersData.length > 0) {
                  console.log(`✅ Found ${tiersData.length} ticket tiers in separate table for event ${event.id}`);
                  
                  ticketTiers = tiersData.map((tier: any) => ({
                    id: tier.id,
                    event_id: tier.event_id,
                    tier_name: tier.tier_name,
                    description: tier.description,
                    price: tier.price,
                    quantity_total: tier.quantity_total,
                    quantity_sold: tier.quantity_sold,
                    is_active: tier.is_active,
                    created_at: tier.created_at,
                    updated_at: tier.updated_at
                  }));

                  // Calculate totals
                  ticketTiers.forEach((tier: TicketTier) => {
                    totalSold += tier.quantity_sold || 0;
                    totalRevenue += (tier.price || 0) * (tier.quantity_sold || 0);
                  });
                } else {
                  console.log(`ℹ️ No ticket tiers found in separate table for event ${event.id}`);
                }
              } catch (err) {
                console.error(`❌ Error fetching ticket tiers for event ${event.id}:`, err);
              }
            }

            // Log what we found for debugging
            if (ticketTiers.length > 0) {
              console.log(`📈 Event "${event.title}" has ${ticketTiers.length} ticket tiers, ${totalSold} sold, ₦${totalRevenue} revenue`);
            }

            return {
              ...event,
              ticketTiers,
              total_tickets_sold: totalSold,
              total_revenue: totalRevenue,
            };
          })
        );

        // Apply status filter
        let filteredEvents = enriched;
        if (statusFilter !== "all") {
          filteredEvents = enriched.filter(event => event.status === statusFilter);
        }

        setEvents(filteredEvents);
        console.log(`🎉 Loaded ${filteredEvents.length} events with ticket data`);

      } catch (err: any) {
        console.error("💥 Fetch error:", err);
        toast.error("Failed to load your events: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [navigate, statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-3 py-1.5 rounded-full text-xs font-semibold border ${
      styles[status] || "bg-gray-500/20 text-gray-300 border-gray-500/50"
    }`;
  };

  const publishEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: "published" } : e))
      );

      toast.success("Event published!");
    } catch (error: any) {
      toast.error("Could not publish event: " + error.message);
    }
  };

  const unpublishEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "draft" })
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: "draft" } : e))
      );

      toast.success("Event moved back to drafts");
    } catch (error: any) {
      toast.error("Could not unpublish event: " + error.message);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      // First, try to delete from ticketTiers table if it exists
      try {
        const { error: tiersError } = await supabase
          .from("ticketTiers")
          .delete()
          .eq("event_id", eventId);

        if (tiersError && !tiersError.message.includes("does not exist")) {
          console.warn("Could not delete ticket tiers:", tiersError);
        }
      } catch (err) {
        console.warn("Ticket tiers deletion skipped:", err);
      }

      // Then delete the event
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setShowDeleteConfirm(null);
      toast.success("Event deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete event: " + error.message);
      console.error(error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return "Past";
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Tomorrow";
      if (diffDays <= 7) return `In ${diffDays} days`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Invalid date";
    }
  };

  // Filter events by search term
  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === "published").length,
    draft: events.filter((e) => e.status === "draft").length,
    completed: events.filter((e) => e.status === "completed").length,
    totalRevenue: events.reduce((sum, e) => sum + (e.total_revenue || 0), 0),
    totalTicketsSold: events.reduce((sum, e) => sum + (e.total_tickets_sold || 0), 0),
  };

  // Debug function to check ticket tiers
  const debugTicketTiers = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      console.log(`🔍 Debug ticket tiers for "${event.title}":`, {
        eventId: event.id,
        hasTicketTiers: !!event.ticketTiers,
        ticketTiersCount: event.ticketTiers?.length || 0,
        ticketTiers: event.ticketTiers,
        totalSold: event.total_tickets_sold,
        totalRevenue: event.total_revenue
      });
    }
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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Top bar */}
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">My Events</h1>
                <p className="text-gray-400">Manage all your events in one place</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => console.log("Events debug:", events)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                >
                  Debug Events
                </button>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/30 hover:scale-105"
                >
                  <PlusCircle size={22} />
                  Create New Event
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Events</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Calendar className="text-purple-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Published</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">{stats.published}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Drafts</p>
                    <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.draft}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Clock className="text-yellow-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tickets Sold</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalTicketsSold.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">₦{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-pink-400" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search events by title, venue, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Drafts</option>
                    <option value="published">Published</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center py-32">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredEvents.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl mb-8">
                  <Calendar size={56} className="text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No events found</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "You haven't created any events yet. Start by creating your first one!"}
                </p>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-xl text-white font-semibold shadow-lg transition hover:scale-105"
                >
                  <PlusCircle className="inline mr-2" size={22} />
                  Create Your First Event
                </button>
              </div>
            )}

            {/* Events Grid */}
            {!loading && filteredEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredEvents.map((event) => {
                  const imageUrl =
                    event.image ||
                    event.cover_image ||
                    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";

                  const ticketTiersCount = event.ticketTiers?.length || 0;
                  const totalSold = event.total_tickets_sold || 0;
                  const totalRevenue = event.total_revenue || 0;

                  return (
                    <div
                      key={event.id}
                      className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                    >
                      {/* Debug button - only visible on hover */}
                      <button
                        onClick={() => debugTicketTiers(event.id)}
                        className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs"
                        title="Debug ticket tiers"
                      >
                        Debug
                      </button>

                      {/* Cover Image */}
                      <div className="h-48 relative overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                        {/* Event date badge */}
                        <div className="absolute top-4 right-4">
                          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                            <p className="text-xs opacity-90">Event</p>
                            <p className="text-sm font-bold">{formatDate(event.date)}</p>
                          </div>
                        </div>

                        {/* Quick actions overlay */}
                        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/organizer/event/${event.id}/edit`);
                            }}
                            className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition"
                            title="Edit"
                          >
                            <Edit size={18} className="text-white" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/event/${event.slug || event.id}`);
                            }}
                            className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition"
                            title="View"
                          >
                            <Eye size={18} className="text-white" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(showDeleteConfirm === event.id ? null : event.id);
                              }}
                              className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition"
                              title="More options"
                            >
                              <MoreVertical size={18} className="text-white" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition line-clamp-2">
                            {event.title}
                          </h3>
                          <span className={getStatusBadge(event.status)}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-400 mb-4">
                          <MapPin size={16} />
                          <span className="text-sm truncate">{event.venue || "Venue not set"}</span>
                        </div>

                        <div className="text-sm text-gray-400 mb-2">
                          {event.date && (
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar size={14} />
                              <span>
                                {new Date(event.date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              {event.time && <span>• {event.time}</span>}
                            </div>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <Users size={12} />
                              <span>Tiers</span>
                            </div>
                            <div className="text-white font-semibold">{ticketTiersCount}</div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <Users size={12} />
                              <span>Sold</span>
                            </div>
                            <div className="text-white font-semibold">{totalSold}</div>
                          </div>

                          <div className="text-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <DollarSign size={12} />
                              <span>Revenue</span>
                            </div>
                            <div className="text-green-400 font-semibold">
                              ₦{totalRevenue.toLocaleString()}
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            Manage
                            <ExternalLink size={14} />
                          </button>
                        </div>

                        {/* Show ticket tier details if available */}
                        {event.ticketTiers && event.ticketTiers.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-gray-400 mb-2">Ticket Tiers:</p>
                            <div className="flex flex-wrap gap-2">
                              {event.ticketTiers.slice(0, 3).map((tier: any, index: number) => (
                                <span
                                  key={tier.id || index}
                                  className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-xs"
                                >
                                  {tier.tier_name || tier.name}: ₦{tier.price}
                                </span>
                              ))}
                              {event.ticketTiers.length > 3 && (
                                <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                                  +{event.ticketTiers.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-6">
                          {event.status === "draft" ? (
                            <button
                              onClick={() => publishEvent(event.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <Upload size={16} /> Publish
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/event/${event.slug || event.id}`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              <Eye size={16} /> View Live
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                            className="px-4 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Debug panel (visible in development) */}
            {process.env.NODE_ENV === 'development' && events.length > 0 && (
              <div className="mt-10 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Debug Info</h3>
                <div className="text-sm text-gray-300">
                  <p>Total events: {events.length}</p>
                  <p>Events with ticket tiers in JSONB: {events.filter(e => e.ticketTiers && e.ticketTiers.length > 0).length}</p>
                  <button
                    onClick={() => {
                      console.log("All events data:", events);
                      toast.success("Check console for event data");
                    }}
                    className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                  >
                    Log All Events to Console
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Delete Event?</h3>
            <p className="text-gray-400 mb-8">
              Are you sure you want to delete this event? This action cannot be undone and all associated data will be lost.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => deleteEvent(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}