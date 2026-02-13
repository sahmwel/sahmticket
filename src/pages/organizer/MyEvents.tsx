// src/pages/organizer/MyEvents.tsx - UPDATED FOR RESPONSIVENESS
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
  Filter,
  Search,
  MoreVertical,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Ticket,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  Star,
  X,
  Globe,
  Clock as ClockIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";

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
  city?: string | null;
  state?: string | null;
  country?: string | null;
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
  event_type?: string;
  timezone?: string;
  ticketTiers?: TicketTier[];
  total_tickets_sold: number;
  total_revenue: number;
}

export default function OrganizerMyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  
  const navigate = useNavigate();

  // Timezone mapping
  const TIMEZONES: Record<string, string> = {
    'Nigeria': 'WAT (UTC+1)',
    'United States': 'EST (UTC-5)',
    'United Kingdom': 'GMT (UTC+0)',
    'European Union': 'CET (UTC+1)',
    'Ghana': 'GMT (UTC+0)',
    'Kenya': 'EAT (UTC+3)',
    'South Africa': 'SAST (UTC+2)',
    'Canada': 'EST (UTC-5)'
  };

  // Get timezone for event
  const getEventTimezone = (event: Event) => {
    if (event.timezone) return event.timezone;
    if (event.country) return TIMEZONES[event.country] || 'WAT (UTC+1)';
    return 'WAT (UTC+1)';
  };

  // Enhanced date formatting
  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "Date not set";

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      const dayName = dayNames[date.getDay()];
      const monthName = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${hours}:${minutes} ${ampm}`;

      if (diffDays === 0) return `Today at ${formattedTime}`;
      if (diffDays === 1) return `Tomorrow at ${formattedTime}`;
      if (diffDays === -1) return `Yesterday at ${formattedTime}`;
      if (diffDays > -7 && diffDays < 7) {
        return `${dayName}, ${monthName} ${day} at ${formattedTime}`;
      }
      
      return `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''} at ${formattedTime}`;
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDateOnly = (timestamp: string | null) => {
    if (!timestamp) return "No date";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${monthName} ${day}, ${year}`;
    } catch {
      return "Invalid date";
    }
  };

  // Format event date with timezone
  const formatEventDateTime = (event: Event) => {
    if (!event.date) return "Date not set";
    
    const combinedDateTime = (dateString: string, timeString: string): string | null => {
      if (!dateString) return null;
      
      try {
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        
        let hours = 0, minutes = 0;
        if (timeString) {
          const [timeHours, timeMinutes] = timeString.split(':').map(Number);
          hours = timeHours || 0;
          minutes = timeMinutes || 0;
        }
        
        const date = new Date(year, month - 1, day, hours, minutes);
        return date.toISOString();
      } catch (error) {
        console.error("Error combining date and time:", error);
        return null;
      }
    };

    const combined = combineDateTime(event.date, event.time || "00:00");
    const formattedDate = formatDate(combined);
    const timezone = getEventTimezone(event);
    
    return `${formattedDate} (${timezone})`;
  };

  const combineDateTime = (dateString: string, timeString: string): string | null => {
    if (!dateString) return null;
    
    try {
      const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
      
      let hours = 0, minutes = 0;
      if (timeString) {
        const [timeHours, timeMinutes] = timeString.split(':').map(Number);
        hours = timeHours || 0;
        minutes = timeMinutes || 0;
      }
      
      const date = new Date(year, month - 1, day, hours, minutes);
      return date.toISOString();
    } catch (error) {
      console.error("Error combining date and time:", error);
      return null;
    }
  };

  // Fetch events
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
        
        // Fetch purchases
        try {
          const { data: purchases, error: purchasesError } = await supabase
            .from("purchases")
            .select("quantity, price")
            .eq("event_id", event.id);
          
          if (!purchasesError && purchases && purchases.length > 0) {
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
        
        // Fetch ticket tiers
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
        
        // Check JSONB column
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
        
        const enrichedEvent: Event = {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time || "",
          venue: event.venue || "Venue not set",
          location: event.location,
          city: event.city,
          state: event.state,
          country: event.country,
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
          event_type: event.event_type,
          timezone: event.timezone,
          ticketTiers: ticketTiers,
          total_tickets_sold: totalSold,
          total_revenue: totalRevenue,
        };
        
        enrichedEvents.push(enrichedEvent);
      }

      // Apply sorting
      let sortedEvents = [...enrichedEvents];
      if (sortBy === "newest") {
        sortedEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === "oldest") {
        sortedEvents.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else if (sortBy === "title-asc") {
        sortedEvents.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === "title-desc") {
        sortedEvents.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sortBy === "revenue-high") {
        sortedEvents.sort((a, b) => b.total_revenue - a.total_revenue);
      } else if (sortBy === "revenue-low") {
        sortedEvents.sort((a, b) => a.total_revenue - b.total_revenue);
      } else if (sortBy === "sales-high") {
        sortedEvents.sort((a, b) => b.total_tickets_sold - a.total_tickets_sold);
      } else if (sortBy === "sales-low") {
        sortedEvents.sort((a, b) => a.total_tickets_sold - b.total_tickets_sold);
      }

      // Apply status filter
      const filteredEvents = statusFilter === "all" 
        ? sortedEvents 
        : sortedEvents.filter((event: Event) => event.status === statusFilter);

      setEvents(filteredEvents);

    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("Failed to load your events: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [navigate, statusFilter, sortBy]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold border ${
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
    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .select();   // ← 🔥 critical – returns the deleted rows

    if (error) throw error;

    // data will be an array of deleted rows. If empty, nothing was deleted.
    if (!data || data.length === 0) {
      throw new Error("Event not found or you don't have permission to delete it.");
    }

    // Only remove from UI if we actually deleted something
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setShowDeleteConfirm(null);
    toast.success("Event deleted successfully");
  } catch (error: any) {
    console.error("Delete error:", error);
    toast.error(`Failed to delete event: ${error.message}`);
  }
};

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (event.location?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (event.city?.toLowerCase() || "").includes(searchTerm.toLowerCase())
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
    featured: events.filter((e) => e.featured).length,
    trending: events.filter((e) => e.trending).length,
  };

  const handleRefresh = () => {
    fetchEvents();
    toast.success("Events refreshed!");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-white/10"
        aria-label="Toggle menu"
      >
        <Menu size={24} className="text-white" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-950 border-r border-white/10">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 lg:mb-10 gap-4 sm:gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">My Events</h1>
                <p className="text-gray-400 text-sm sm:text-base">Manage all your events in one place</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs sm:text-sm rounded-lg transition"
                  aria-label="Refresh events"
                >
                  <RefreshCw size={14} className="sm:w-4 sm:h-4" /> Refresh
                </button>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/30 text-sm sm:text-base"
                >
                  <PlusCircle size={18} className="sm:w-6 sm:h-6" />
                  Create New Event
                </button>
              </div>
            </div>

            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Events</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.total}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Calendar className="text-purple-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Published</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 mt-1 sm:mt-2">{stats.published}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Drafts</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400 mt-1 sm:mt-2">{stats.draft}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Clock className="text-yellow-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Ticket Tiers</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 sm:mt-2">{stats.totalTicketTiers}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Ticket className="text-blue-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Tickets Sold</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 sm:mt-2">
                      {stats.totalTicketsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-pink-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Users className="text-pink-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 sm:mt-2">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <DollarSign className="text-green-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <div className="flex items-center gap-2">
                  <Filter size={18} />
                  <span>Filters & Search</span>
                </div>
                <ChevronDown size={18} className={`transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Filters and Search - Desktop */}
            <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block mb-6 sm:mb-8`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search events by title, venue, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer text-sm sm:text-base"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Drafts</option>
                      <option value="published">Published</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="flex-1 relative">
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer text-sm sm:text-base"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="title-asc">Title A-Z</option>
                      <option value="title-desc">Title Z-A</option>
                      <option value="revenue-high">Revenue (High to Low)</option>
                      <option value="revenue-low">Revenue (Low to High)</option>
                      <option value="sales-high">Sales (High to Low)</option>
                      <option value="sales-low">Sales (Low to High)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col justify-center items-center py-20 sm:py-32">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-purple-500 mb-3 sm:mb-4"></div>
                <p className="text-gray-400 text-sm sm:text-base">Loading your events...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredEvents.length === 0 && (
              <div className="text-center py-12 sm:py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-32 sm:h-32 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl mb-6 sm:mb-8">
                  <Calendar size={32} className="sm:w-14 sm:h-14 text-gray-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">No events found</h3>
                <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto px-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "You haven't created any events yet. Start by creating your first one!"}
                </p>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-white font-semibold shadow-lg transition hover:scale-105 text-sm sm:text-base"
                >
                  <PlusCircle className="inline mr-2 w-4 h-4 sm:w-6 sm:h-6" />
                  Create Your First Event
                </button>
              </div>
            )}

            {/* Events Grid */}
            {!loading && filteredEvents.length > 0 && (
              <>
                <div className="mb-4 sm:mb-6 flex justify-between items-center">
                  <p className="text-gray-400 text-sm sm:text-base">
                    Showing <span className="text-white font-semibold">{filteredEvents.length}</span> event{filteredEvents.length !== 1 ? 's' : ''}
                  </p>
                  <div className="text-xs sm:text-sm text-gray-500">
                    Sorted by: {sortBy.replace('-', ' ')}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {filteredEvents.map((event) => {
                    const imageUrl =
                      event.image ||
                      event.cover_image ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";

                    const ticketTiersCount = event.ticketTiers?.length || 0;
                    const totalSold = event.total_tickets_sold || 0;
                    const totalRevenue = event.total_revenue || 0;
                    const hasTiers = ticketTiersCount > 0;
                    const eventTimezone = getEventTimezone(event);

                    return (
                      <div
                        key={event.id}
                        className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
                      >
                        {/* Cover Image */}
                        <div className="h-40 sm:h-48 relative overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                          {/* Event features badges */}
                          <div className="absolute top-2 left-2 flex gap-1 sm:gap-2">
                            {event.featured && (
                              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-500/80 text-white text-xs rounded-full flex items-center gap-1">
                                <Star size={10} className="sm:w-3 sm:h-3" /> Featured
                              </span>
                            )}
                            {event.trending && (
                              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-500/80 text-white text-xs rounded-full flex items-center gap-1">
                                <TrendingUp size={10} className="sm:w-3 sm:h-3" /> Trending
                              </span>
                            )}
                          </div>

                          {/* Event date badge */}
                          <div className="absolute top-2 right-2">
                            <div className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm">
                              <div className="flex items-center gap-1">
                                <ClockIcon size={10} className="sm:w-3 sm:h-3" /> {eventTimezone}
                              </div>
                            </div>
                          </div>

                          {/* Three-dot menu */}
                          <div className="absolute top-2 right-10 sm:right-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === event.id ? null : event.id);
                              }}
                              className="p-1 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition"
                              aria-label="Event options"
                            >
                              <MoreVertical size={16} className="sm:w-5 sm:h-5 text-white" />
                            </button>

                            {openMenuId === event.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-8 sm:top-10 z-20 w-48 sm:w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl py-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/organizer/event/${event.id}/edit`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 sm:px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2 sm:gap-3 text-sm"
                                  >
                                    <Edit size={14} className="sm:w-4 sm:h-4" />
                                    Edit Event
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/organizer/event/${event.id}`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 sm:px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2 sm:gap-3 text-sm"
                                  >
                                    <Eye size={14} className="sm:w-4 sm:h-4" />
                                    View Details
                                  </button>

                                  {event.status === "draft" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        publishEvent(event.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-3 sm:px-4 py-2 text-left text-green-400 hover:bg-white/10 flex items-center gap-2 sm:gap-3 text-sm"
                                    >
                                      <CheckCircle size={14} className="sm:w-4 sm:h-4" />
                                      Publish
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirm(event.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 sm:px-4 py-2 text-left text-red-400 hover:bg-white/10 flex items-center gap-2 sm:gap-3 text-sm"
                                  >
                                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 sm:p-6">
                          <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition line-clamp-2 pr-2">
                              {event.title}
                            </h3>
                            <span className={getStatusBadge(event.status)}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 mb-2 sm:mb-3">
                            <MapPin size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="text-xs sm:text-sm truncate">{event.venue}</span>
                          </div>

                          {/* Event date & time */}
                          <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400 mb-4 sm:mb-6">
                            <Calendar size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">{formatEventDateTime(event)}</span>
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Tiers</div>
                              <div className="text-white font-semibold text-sm sm:text-lg">
                                {hasTiers ? ticketTiersCount : "0"}
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Sold</div>
                              <div className="text-white font-semibold text-sm sm:text-lg">
                                {totalSold}
                              </div>
                            </div>

                            <div className="text-center">
                              <div className="text-gray-400 text-xs mb-1">Revenue</div>
                              <div className="text-green-400 font-semibold text-sm sm:text-lg">
                                {formatCurrency(totalRevenue)}
                              </div>
                            </div>
                          </div>

                          {/* Ticket tier preview - Only show on larger screens */}
                          {hasTiers && window.innerWidth >= 640 && (
                            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                              <div className="flex justify-between items-center mb-2 sm:mb-3">
                                <p className="text-xs text-gray-400">Ticket Tiers</p>
                                <span className="text-xs text-gray-500">{ticketTiersCount} tier{ticketTiersCount !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="space-y-1.5 sm:space-y-2">
                                {event.ticketTiers?.slice(0, 2).map((tier: TicketTier, index: number) => (
                                  <div
                                    key={tier.id || index}
                                    className="flex justify-between items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 rounded-lg"
                                  >
                                    <div>
                                      <div className="text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-none">{tier.tier_name}</div>
                                      <div className="text-xs text-gray-400">
                                        {formatCurrency(tier.price)} • {tier.quantity_sold}/{tier.quantity_total} sold
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {tier.quantity_sold > 0 ? (
                                        <span className="text-green-400">{formatCurrency(tier.price * tier.quantity_sold)}</span>
                                      ) : (
                                        "No sales"
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {ticketTiersCount > 2 && (
                                  <div className="text-center pt-1 sm:pt-2">
                                    <span className="text-xs text-gray-500">
                                      +{ticketTiersCount - 2} more tier{ticketTiersCount - 2 !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-4 sm:mt-6">
                            <button
                              onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition"
                            >
                              <Edit size={12} className="sm:w-4 sm:h-4" /> Manage
                            </button>
                            
                            <button
                              onClick={() => navigate(`/organizer/event/${event.id}`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition"
                            >
                              <Eye size={12} className="sm:w-4 sm:h-4" /> Details
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
          <div className="bg-gray-800 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Delete Event?</h3>
            <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => deleteEvent(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 sm:py-3 rounded-xl font-medium transition text-sm sm:text-base"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 sm:py-3 rounded-xl font-medium transition text-sm sm:text-base"
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