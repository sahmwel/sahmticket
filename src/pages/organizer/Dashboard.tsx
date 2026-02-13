// src/pages/organizer/Dashboard.tsx - UPDATED FOR RESPONSIVENESS
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
  ChevronRight,
  Users,
  Star,
  Globe,
  Filter,
  ArrowUpRight,
  ArrowDownRight
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
  city?: string | null;
  state?: string | null;
  country?: string | null;
  image?: string | null;
  cover_image?: string | null;
  status: "draft" | "published" | "cancelled" | "completed";
  created_at: string;
  total_tickets_sold: number;
  total_revenue: number;
  ticketTiers?: any[];
  slug?: string;
  timezone?: string;
  featured?: boolean;
  trending?: boolean;
  event_type?: string;
}

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentEventsFilter, setRecentEventsFilter] = useState("all");
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

  // Get event timezone
  const getEventTimezone = (event: Event) => {
    if (event.timezone) return event.timezone;
    if (event.country) return TIMEZONES[event.country] || 'WAT (UTC+1)';
    return 'WAT (UTC+1)';
  };

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

          // Get ticket tiers count
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
    
    // Combine date and time
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

    const combined = combineDateTime(event.date, event.time || "00:00");
    const formattedDate = formatDate(combined);
    const timezone = getEventTimezone(event);
    
    return `${formattedDate} (${timezone})`;
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
    totalTicketTiers: events.reduce((sum: number, e) => sum + (e.ticketTiers?.length || 0), 0),
    featuredEvents: events.filter(e => e.featured).length,
    trendingEvents: events.filter(e => e.trending).length,
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchEvents();
    toast.success("Dashboard refreshed!");
  };

  const goToMyEvents = () => {
    navigate("/organizer/my-events");
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Filter recent events
  const filteredRecentEvents = events.filter(event => {
    if (recentEventsFilter === "all") return true;
    if (recentEventsFilter === "published") return event.status === "published";
    if (recentEventsFilter === "draft") return event.status === "draft";
    if (recentEventsFilter === "upcoming") {
      try {
        const eventDate = new Date(event.date);
        const now = new Date();
        return eventDate > now && event.status === "published";
      } catch {
        return false;
      }
    }
    return true;
  });

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
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 lg:mb-10 gap-4 sm:gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Dashboard</h1>
                <p className="text-gray-400 text-sm sm:text-base">Overview of your events and performance</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition text-xs sm:text-sm"
                  aria-label="Refresh dashboard data"
                >
                  <RefreshCw size={14} className="sm:w-4 sm:h-4" />
                  Refresh
                </button>
                <button
                  onClick={goToMyEvents}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition text-xs sm:text-sm"
                  aria-label="View all events"
                >
                  <Eye size={14} className="sm:w-4 sm:h-4" />
                  View All Events
                </button>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 text-sm sm:text-base"
                  aria-label="Create new event"
                >
                  <PlusCircle size={18} className="sm:w-6 sm:h-6" />
                  Create New Event
                </button>
              </div>
            </div>

            {/* Stats Overview - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Events</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1">{stats.totalEvents}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Calendar className="text-purple-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-400">
                  {stats.publishedEvents} published • {stats.draftEvents} drafts
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Tickets Sold</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1">
                      {stats.totalTicketsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Ticket className="text-green-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-400">
                  Across all your events
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <DollarSign className="text-blue-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-400">
                  {stats.totalTicketsSold > 0 
                    ? `Avg: ${formatCurrency(Math.round(stats.totalRevenue / stats.totalTicketsSold))} per ticket`
                    : "No sales yet"
                  }
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Active Events</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1">{stats.publishedEvents}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-pink-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-pink-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-gray-400">
                  {stats.upcomingEvents} upcoming • {stats.completedEvents} completed
                </div>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8 lg:mb-10">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Upcoming</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400 mt-1">{stats.upcomingEvents}</p>
                  </div>
                  <Clock className="text-green-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Drafts</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-400 mt-1">{stats.draftEvents}</p>
                  </div>
                  <Calendar className="text-yellow-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Completed</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400 mt-1">{stats.completedEvents}</p>
                  </div>
                  <Ticket className="text-blue-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Ticket Tiers</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mt-1">{stats.totalTicketTiers}</p>
                  </div>
                  <Users className="text-white w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Featured</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-400 mt-1">{stats.featuredEvents}</p>
                  </div>
                  <Star className="text-purple-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Trending</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-400 mt-1">{stats.trendingEvents}</p>
                  </div>
                  <ArrowUpRight className="text-orange-400 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
              </div>
            </div>

            {/* Recent Events Section */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Recent Events</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
                  <select
                    value={recentEventsFilter}
                    onChange={(e) => setRecentEventsFilter(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs sm:text-sm appearance-none"
                  >
                    <option value="all">All Events</option>
                    <option value="published">Published</option>
                    <option value="draft">Drafts</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
                <button
                  onClick={goToMyEvents}
                  className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium group"
                  aria-label="View all events"
                >
                  View All 
                  <ChevronRight size={12} className="sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className="flex flex-col sm:flex-row justify-center items-center py-12 sm:py-20">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-purple-500 mb-3 sm:mb-4"></div>
                <p className="text-gray-400 text-sm sm:text-base">Loading events...</p>
              </div>
            ) : filteredRecentEvents.length === 0 ? (
              <div className="text-center py-12 sm:py-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl">
                <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <Calendar size={24} className="sm:w-12 sm:h-12 text-gray-600" />
                </div>
                <h3 className="text-lg sm:text-2xl font-semibold text-white mb-1 sm:mb-2">No events found</h3>
                <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-8">Get started by creating your first event!</p>
                <button
                  onClick={() => navigate("/organizer/create-event")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl text-white font-medium shadow-lg transition hover:scale-105 text-sm sm:text-base"
                  aria-label="Create your first event"
                >
                  <PlusCircle className="inline mr-1.5 sm:mr-2 w-3 h-3 sm:w-5 sm:h-5" />
                  Create Your First Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredRecentEvents.map((event) => {
                  const imageUrl = event.image || event.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                  const ticketsSold = event.total_tickets_sold || 0;
                  const revenue = event.total_revenue || 0;
                  const formattedDateTime = formatEventDateTime(event);
                  const dateOnly = formatDateOnly(event.date);
                  const eventTimezone = getEventTimezone(event);
                  const isUpcoming = new Date(event.date) > new Date() && event.status === "published";

                  return (
                    <div
                      key={event.id}
                      className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10"
                      role="article"
                      aria-labelledby={`event-title-${event.id}`}
                    >
                      {/* Event Banner */}
                      <div className="h-32 sm:h-40 md:h-48 relative overflow-hidden">
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
                        
                        {/* Event type badge */}
                        {event.event_type && (
                          <div className="absolute top-2 left-2">
                            <div className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs">
                              <Globe size={10} className="inline mr-1" />
                              {event.event_type}
                            </div>
                          </div>
                        )}

                        {/* Event date badge */}
                        <div className="absolute top-2 right-2">
                          <div className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs">
                            <Clock size={10} className="inline mr-1" />
                            {eventTimezone}
                          </div>
                        </div>

                        {/* Featured/Trending badges */}
                        <div className="absolute top-10 sm:top-12 left-2 flex gap-1">
                          {event.featured && (
                            <span className="px-1.5 py-0.5 bg-purple-500/80 text-white text-xs rounded-full flex items-center gap-1">
                              <Star size={8} /> Featured
                            </span>
                          )}
                          {event.trending && (
                            <span className="px-1.5 py-0.5 bg-blue-500/80 text-white text-xs rounded-full flex items-center gap-1">
                              <TrendingUp size={8} /> Trending
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 md:p-6">
                        <div className="flex justify-between items-start mb-2 sm:mb-3 md:mb-4">
                          <h3 
                            id={`event-title-${event.id}`}
                            className="text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 pr-2 flex-1"
                          >
                            {event.title}
                          </h3>
                          <span 
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}
                            aria-label={`Status: ${event.status}`}
                          >
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-gray-400 mb-2 sm:mb-3">
                          <MapPin size={12} className="sm:w-4 sm:h-4 flex-shrink-0" aria-hidden="true" />
                          <span className="text-xs sm:text-sm truncate">{event.venue || "Venue not set"}</span>
                        </div>

                        {/* Event date & time */}
                        <div className="flex items-center gap-1.5 text-gray-400 mb-3 sm:mb-4 md:mb-6">
                          <Calendar size={12} className="sm:w-4 sm:h-4 flex-shrink-0" aria-hidden="true" />
                          <span className="text-xs sm:text-sm">{formattedDateTime}</span>
                        </div>

                        {/* Event Stats */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Tiers</div>
                            <div className="text-white font-semibold text-sm sm:text-lg">
                              {event.ticketTiers?.length || 0}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Sold</div>
                            <div className="text-white font-semibold text-sm sm:text-lg">
                              {ticketsSold.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 text-xs mb-1">Revenue</div>
                            <div className="text-green-400 font-semibold text-sm sm:text-lg">
                              {formatCurrency(revenue)}
                            </div>
                          </div>
                        </div>

                        {/* Date and Action */}
                        <div className="flex items-center justify-between pt-3 sm:pt-4 md:pt-6 border-t border-white/10">
                          <div className="text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              {isUpcoming ? (
                                <>
                                  <Clock size={10} aria-hidden="true" />
                                  <span>Upcoming</span>
                                </>
                              ) : (
                                <span>{dateOnly}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5 sm:gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/organizer/event/${event.id}`);
                              }}
                              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium flex items-center gap-1 hover:bg-white/5 px-2 sm:px-3 py-1 rounded-lg transition"
                              aria-label={`View details for ${event.title}`}
                            >
                              <Eye size={12} className="sm:w-3 sm:h-3" /> Details
                            </button>
                            {event.slug && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/event/${event.slug}`);
                                }}
                                className="text-gray-400 hover:text-white text-xs sm:text-sm font-medium flex items-center gap-1 hover:bg-white/5 px-2 sm:px-3 py-1 rounded-lg transition"
                                aria-label={`View public page for ${event.title}`}
                              >
                                <ExternalLink size={12} className="sm:w-3 sm:h-3" />
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
              <div className="mt-6 sm:mt-8 lg:mt-10 p-4 sm:p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-white/10 rounded-xl sm:rounded-2xl">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <button
                    onClick={() => navigate("/organizer/create-event")}
                    className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-left transition flex items-center gap-2 sm:gap-3 group"
                    aria-label="Create new event"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition">
                      <PlusCircle size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">Create New Event</p>
                      <p className="text-gray-400 text-xs sm:text-sm">Start a new event</p>
                    </div>
                  </button>
                  <button
                    onClick={goToMyEvents}
                    className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-left transition flex items-center gap-2 sm:gap-3 group"
                    aria-label="View all events"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition">
                      <Eye size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">View All Events</p>
                      <p className="text-gray-400 text-xs sm:text-sm">See complete event list</p>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate("/organizer/analytics")}
                    className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-left transition flex items-center gap-2 sm:gap-3 group"
                    aria-label="View analytics"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition">
                      <BarChart3 size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">View Analytics</p>
                      <p className="text-gray-400 text-xs sm:text-sm">Check detailed reports</p>
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