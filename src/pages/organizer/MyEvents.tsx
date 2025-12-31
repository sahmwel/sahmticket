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
  Ticket,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";

// ── Interfaces ────────────────────────────────────────────────────────────────
// (unchanged)

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
  ticketTiers?: TicketTier[];
  total_tickets_sold: number;
  total_revenue: number;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function OrganizerMyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  // NEW: Track which event's menu is open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // ── Your existing formatDate & formatDateOnly functions (unchanged) ──
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
      console.error("Date formatting error:", error);
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

  // ── fetchEvents (unchanged) ──
  const fetchEvents = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      const enrichedEvents: Event[] = [];
      
      for (const event of eventsData) {
        let totalSold = 0;
        let totalRevenue = 0;
        let ticketTiers: TicketTier[] = [];
        
        try {
          const { data: purchases, error: purchasesError } = await supabase
            .from("purchases")
            .select("quantity, price")
            .eq("event_id", event.id);
          
          if (!purchasesError && purchases && purchases.length > 0) {
            console.log(`Found ${purchases.length} purchases for event: ${event.title}`);
            
            purchases.forEach((purchase: any) => {
              const quantity = parseInt(purchase.quantity) || 0;
              const price = parseFloat(purchase.price) || 0;
              totalSold += quantity;
              totalRevenue += price * quantity;
            });
          }
        } catch (err) {
          console.warn("Could not fetch purchases:", err);
        }
        
        try {
          const { data: tiersData, error: tiersError } = await supabase
            .from("ticketTiers")
            .select("*")
            .eq("event_id", event.id);
          
          if (!tiersError && tiersData && tiersData.length > 0) {
            ticketTiers = tiersData.map((tier: any) => ({
              id: tier.id,
              event_id: tier.event_id,
              tier_name: tier.tier_name || tier.name || "Unnamed Tier",
              description: tier.description,
              price: parseFloat(tier.price) || 0,
              quantity_total: parseInt(tier.quantity_total) || 0,
              quantity_sold: parseInt(tier.quantity_sold) || 0,
              is_active: tier.is_active !== false,
              created_at: tier.created_at,
              updated_at: tier.updated_at
            }));
            
            if (totalSold === 0) {
              tiersData.forEach((tier: any) => {
                const sold = parseInt(tier.quantity_sold) || 0;
                const price = parseFloat(tier.price) || 0;
                totalSold += sold;
                totalRevenue += price * sold;
              });
            }
          }
        } catch (err) {
          console.log("ticketTiers table not accessible");
        }
        
        if (totalSold === 0 && event.ticketTiers && Array.isArray(event.ticketTiers)) {
          ticketTiers = event.ticketTiers
            .filter((tier: any) => tier)
            .map((tier: any, index: number) => {
              const sold = parseInt(tier.quantity_sold) || 0;
              const price = parseFloat(tier.price) || 0;
              
              totalSold += sold;
              totalRevenue += price * sold;
              
              return {
                id: tier.id || `json-${event.id}-${index}`,
                event_id: event.id,
                tier_name: tier.tier_name || tier.name || `Tier ${index + 1}`,
                description: tier.description || null,
                price: price,
                quantity_total: parseInt(tier.quantity_total) || parseInt(tier.quantity) || 0,
                quantity_sold: sold,
                is_active: tier.is_active !== false,
                created_at: tier.created_at || new Date().toISOString(),
                updated_at: tier.updated_at || null
              };
            });
        }
        
        console.log(`📈 "${event.title}": ${totalSold} tickets sold, ₦${totalRevenue} revenue`);
        
        const enrichedEvent: Event = {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time || "",
          venue: event.venue || "Venue not set",
          location: event.location,
          image: event.image,
          cover_image: event.cover_image,
          category_id: event.category_id,
          organizer_id: event.organizer_id,
          slug: event.slug,
          status: event.status || "draft",
          created_at: event.created_at,
          updated_at: event.updated_at,
          published_at: event.published_at,
          featured: event.featured,
          trending: event.trending,
          isnew: event.isnew,
          sponsored: event.sponsored,
          ticketTiers: ticketTiers,
          total_tickets_sold: totalSold,
          total_revenue: totalRevenue,
        };
        
        enrichedEvents.push(enrichedEvent);
      }

      const filteredEvents = statusFilter === "all" 
        ? enrichedEvents 
        : enrichedEvents.filter((event: Event) => event.status === statusFilter);

      setEvents(filteredEvents);
      console.log(`🎉 Loaded ${filteredEvents.length} events with data`);

    } catch (err: any) {
      console.error("💥 Fetch error:", err);
      toast.error("Failed to load your events: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const deleteEvent = async (eventId: string) => {
    try {
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
    }
  };

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === "published").length,
    draft: events.filter((e) => e.status === "draft").length,
    completed: events.filter((e) => e.status === "completed").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
    totalRevenue: events.reduce((sum: number, e) => sum + (e.total_revenue || 0), 0),
    totalTicketsSold: events.reduce((sum: number, e) => sum + (e.total_tickets_sold || 0), 0),
    totalTicketTiers: events.reduce((sum: number, e) => sum + (e.ticketTiers?.length || 0), 0),
  };

  const handleRefresh = () => {
    fetchEvents();
    toast.success("Events refreshed!");
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
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
          >
            <RefreshCw size={20} />
          </button>
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
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                >
                  <RefreshCw size={16} /> Refresh
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
              {/* ... stats cards unchanged ... */}
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
                    <p className="text-gray-400 text-sm">Ticket Tiers</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalTicketTiers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Ticket className="text-blue-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tickets Sold</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {stats.totalTicketsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                    <Users className="text-pink-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      ₦{stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-green-400" size={24} />
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
                  placeholder="Search events..."
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
                    className="pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer"
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
              <div className="flex flex-col justify-center items-center py-32">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
                <p className="text-gray-400">Loading your events...</p>
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
              <>
                <div className="mb-6 flex justify-between items-center">
                  <p className="text-gray-400">
                    Showing <span className="text-white font-semibold">{filteredEvents.length}</span> event{filteredEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filteredEvents.map((event) => {
                    const imageUrl =
                      event.image ||
                      event.cover_image ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";

                    const ticketTiersCount = event.ticketTiers?.length || 0;
                    const totalSold = event.total_tickets_sold || 0;
                    const totalRevenue = event.total_revenue || 0;
                    const hasTiers = ticketTiersCount > 0;

                    return (
                      <div
                        key={event.id}
                        className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                      >
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
                          <div className="absolute top-4 right-16">
                            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                              <p className="text-xs opacity-90">Event Date</p>
                              <p className="text-sm font-bold">{formatDate(event.date)}</p>
                            </div>
                          </div>

                          {/* Three-dot menu */}
                          <div className="absolute top-4 right-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === event.id ? null : event.id);
                              }}
                              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition"
                            >
                              <MoreVertical size={20} className="text-white" />
                            </button>

                            {openMenuId === event.id && (
                              <>
                                {/* Overlay to close on outside click */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                {/* Dropdown menu */}
                                <div className="absolute right-0 top-10 z-20 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl py-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/organizer/event/${event.id}/edit`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-white hover:bg-white/10 flex items-center gap-3"
                                  >
                                    <Edit size={18} />
                                    Edit Event
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/organizer/event/${event.id}`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-white hover:bg-white/10 flex items-center gap-3"
                                  >
                                    <Eye size={18} />
                                    View Details
                                  </button>

                                  {event.status === "draft" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        publishEvent(event.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-green-400 hover:bg-white/10 flex items-center gap-3"
                                    >
                                      <CheckCircle size={18} />
                                      Publish
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirm(event.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-white/10 flex items-center gap-3"
                                  >
                                    <Trash2 size={18} />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
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
                            <span className="text-sm truncate">{event.venue}</span>
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Tiers</div>
                              <div className="text-white font-semibold text-lg">
                                {hasTiers ? ticketTiersCount : "0"}
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Sold</div>
                              <div className="text-white font-semibold text-lg">
                                {totalSold}
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Revenue</div>
                              <div className="text-green-400 font-semibold text-lg">
                                ₦{totalRevenue.toLocaleString()}
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Date</div>
                              <div className="text-white font-semibold text-sm">
                                {formatDateOnly(event.date)}
                              </div>
                            </div>
                          </div>

                          {/* Ticket tier preview */}
                          {hasTiers && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-xs text-gray-400">Ticket Tiers</p>
                                <span className="text-xs text-gray-500">{ticketTiersCount} tier{ticketTiersCount !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="space-y-2">
                                {event.ticketTiers?.slice(0, 2).map((tier: TicketTier, index: number) => (
                                  <div
                                    key={tier.id || index}
                                    className="flex justify-between items-center px-3 py-2 bg-white/5 rounded-lg"
                                  >
                                    <div>
                                      <div className="text-sm text-white">{tier.tier_name}</div>
                                      <div className="text-xs text-gray-400">
                                        ₦{tier.price.toLocaleString()} • {tier.quantity_sold}/{tier.quantity_total} sold
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {tier.quantity_sold > 0 ? (
                                        <span className="text-green-400">₦{(tier.price * tier.quantity_sold).toLocaleString()}</span>
                                      ) : (
                                        "No sales"
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {ticketTiersCount > 2 && (
                                  <div className="text-center pt-2">
                                    <span className="text-xs text-gray-500">
                                      +{ticketTiersCount - 2} more tier{ticketTiersCount - 2 !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action buttons - kept as is */}
                          <div className="flex gap-2 mt-6">
                            <button
                              onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition"
                            >
                              <Edit size={16} /> Manage Event
                            </button>
                            
                            <button
                              onClick={() => navigate(`/organizer/event/${event.id}`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition"
                            >
                              <Eye size={16} /> View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => deleteEvent(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition"
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