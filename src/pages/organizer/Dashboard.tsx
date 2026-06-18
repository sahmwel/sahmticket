// src/pages/organizer/Dashboard.tsx - Country‑filtered dashboard ✅
import Sidebar from "../../components/Sidebar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Calendar, MapPin, PlusCircle, Ticket, Menu,
  DollarSign, TrendingUp, Clock, Eye, ExternalLink,
  BarChart3, RefreshCw, ChevronRight, Users, Star,
  Globe, Filter, ArrowUpRight
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
  tierCount?: number;
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
  const [organizerCountry, setOrganizerCountry] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const getEventTimezone = (event: Event) => {
    if (event.timezone) return event.timezone;
    if (event.country) return TIMEZONES[event.country] || 'WAT (UTC+1)';
    return 'WAT (UTC+1)';
  };

  // Fetch organizer's country
  useEffect(() => {
    const fetchOrganizerProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      let country = user.user_metadata?.country || null;
      if (!country) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("country")
          .eq("id", user.id)
          .single();
        if (!error && profile) country = profile.country;
      }
      setOrganizerCountry(country || "Nigeria");
    };
    fetchOrganizerProfile();
  }, [navigate]);

  const fetchEvents = useCallback(async () => {
    if (!organizerCountry) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("country", organizerCountry)
        .order("created_at", { ascending: false })
        .limit(8);

      if (eventsError) throw eventsError;

      const enrichedEvents = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          let totalSold = 0, totalRevenue = 0;
          let tierCount = 0;

          // Try to get tiers from ticketTiers table first (most reliable for sold counts)
          const { data: tiersData, error: tiersError } = await supabase
            .from("ticketTiers")
            .select("id, quantity_sold, price")
            .eq("event_id", event.id);

          if (!tiersError && tiersData && tiersData.length > 0) {
            tierCount = tiersData.length;
            tiersData.forEach((tier: any) => {
              totalSold += tier.quantity_sold || 0;
              totalRevenue += (tier.price || 0) * (tier.quantity_sold || 0);
            });
          } else {
            // Fallback to JSONB column
            const jsonTiers = event.ticketTiers;
            if (jsonTiers && Array.isArray(jsonTiers) && jsonTiers.length > 0) {
              tierCount = jsonTiers.length;
              jsonTiers.forEach((tier: any) => {
                totalSold += tier.quantity_sold || 0;
                totalRevenue += (tier.price || 0) * (tier.quantity_sold || 0);
              });
            }
          }

          // Override with actual ticket sales (most accurate for sold/revenue)
          const { data: tickets } = await supabase
            .from("tickets")
            .select("quantity, amount_in_ngn")
            .eq("event_id", event.id);
          if (tickets && tickets.length > 0) {
            totalSold = tickets.reduce<number>((sum: number, t: any) => sum + (t.quantity || 1), 0);
            totalRevenue = tickets.reduce<number>((sum: number, t: any) => sum + (t.amount_in_ngn || 0), 0);
          }

          return {
            ...event,
            total_tickets_sold: totalSold,
            total_revenue: totalRevenue,
            ticketTiers: event.ticketTiers,  // keep original JSONB data
            tierCount: tierCount
          };
        })
      );
      setEvents(enrichedEvents);
    } catch (err) {
      console.error("Fetch events error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [navigate, organizerCountry]);

  useEffect(() => {
    if (organizerCountry) fetchEvents();
  }, [fetchEvents, organizerCountry]);

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
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const dayName = dayNames[date.getDay()];
      const monthName = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2,'0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const formattedTime = `${hours}:${minutes} ${ampm}`;
      if (diffDays === 0) return `Today at ${formattedTime}`;
      if (diffDays === 1) return `Tomorrow at ${formattedTime}`;
      if (diffDays === -1) return `Yesterday at ${formattedTime}`;
      if (diffDays > -7 && diffDays < 7) return `${dayName}, ${monthName} ${day} at ${formattedTime}`;
      return `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''} at ${formattedTime}`;
    } catch { return "Invalid date"; }
  };

  const formatDateOnly = (timestamp: string | null) => {
    if (!timestamp) return "No date";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return "Invalid date"; }
  };

  const formatEventDateTime = (event: Event) => {
    if (!event.date) return "Date not set";
    const combineDateTime = (dateString: string, timeString: string): string | null => {
      if (!dateString) return null;
      try {
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        let hours = 0, minutes = 0;
        if (timeString) {
          const [th, tm] = timeString.split(':').map(Number);
          hours = th || 0;
          minutes = tm || 0;
        }
        return new Date(year, month-1, day, hours, minutes).toISOString();
      } catch { return null; }
    };
    const combined = combineDateTime(event.date, event.time || "00:00");
    const formattedDate = formatDate(combined);
    const timezone = getEventTimezone(event);
    return `${formattedDate} (${timezone})`;
  };

  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(e => { try { return new Date(e.date) > new Date() && e.status === "published"; } catch { return false; } }).length,
    publishedEvents: events.filter(e => e.status === "published").length,
    draftEvents: events.filter(e => e.status === "draft").length,
    completedEvents: events.filter(e => { try { return new Date(e.date) < new Date() && e.status === "published"; } catch { return false; } }).length,
    totalTicketsSold: events.reduce((sum, e) => sum + (e.total_tickets_sold || 0), 0),
    totalRevenue: events.reduce((sum, e) => sum + (e.total_revenue || 0), 0),
    totalTicketTiers: events.reduce((sum, e) => sum + (e.tierCount || e.ticketTiers?.length || 0), 0),
    featuredEvents: events.filter(e => e.featured).length,
    trendingEvents: events.filter(e => e.trending).length,
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

  const filteredRecentEvents = events.filter(event => {
    if (recentEventsFilter === "all") return true;
    if (recentEventsFilter === "published") return event.status === "published";
    if (recentEventsFilter === "draft") return event.status === "draft";
    if (recentEventsFilter === "upcoming") {
      try { return new Date(event.date) > new Date() && event.status === "published"; } catch { return false; }
    }
    return true;
  });

  const handleRefresh = () => { setLoading(true); fetchEvents(); toast.success("Dashboard refreshed!"); };
  const goToMyEvents = () => navigate("/organizer/my-events");

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar role="organizer" />
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header with country info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Dashboard</h1>
                <p className="text-gray-400 text-sm">
                  Overview of your events in <span className="text-purple-400 font-medium">{organizerCountry || "..."}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button onClick={handleRefresh} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 text-sm"><RefreshCw size={14} /> Refresh</button>
                <button onClick={goToMyEvents} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 text-sm"><Eye size={14} /> View All</button>
                <button onClick={() => navigate("/organizer/create-event")} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg"><PlusCircle size={18} /> Create Event</button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
              <div className="bg-white/5 rounded-xl p-3 sm:p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-xs">Total Events</p><p className="text-xl font-bold text-white">{stats.totalEvents}</p></div><div className="bg-purple-500/20 p-2 rounded-lg"><Calendar className="text-purple-400 w-4 h-4" /></div></div><div className="mt-2 text-xs text-gray-400">{stats.publishedEvents} published • {stats.draftEvents} drafts</div></div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-xs">Tickets Sold</p><p className="text-xl font-bold text-white">{stats.totalTicketsSold.toLocaleString()}</p></div><div className="bg-green-500/20 p-2 rounded-lg"><Ticket className="text-green-400 w-4 h-4" /></div></div><div className="mt-2 text-xs text-gray-400">Across all events</div></div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-xs">Total Revenue</p><p className="text-xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p></div><div className="bg-blue-500/20 p-2 rounded-lg"><DollarSign className="text-blue-400 w-4 h-4" /></div></div><div className="mt-2 text-xs text-gray-400">{stats.totalTicketsSold ? `Avg ${formatCurrency(Math.round(stats.totalRevenue/stats.totalTicketsSold))}` : "No sales"}</div></div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-xs">Active Events</p><p className="text-xl font-bold text-white">{stats.publishedEvents}</p></div><div className="bg-pink-500/20 p-2 rounded-lg"><TrendingUp className="text-pink-400 w-4 h-4" /></div></div><div className="mt-2 text-xs text-gray-400">{stats.upcomingEvents} upcoming • {stats.completedEvents} completed</div></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3"><div className="flex justify-between"><p className="text-gray-400 text-xs">Upcoming</p><Clock className="text-green-400 w-4 h-4" /></div><p className="text-lg font-bold text-green-400">{stats.upcomingEvents}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><div className="flex justify-between"><p className="text-gray-400 text-xs">Drafts</p><Calendar className="text-yellow-400 w-4 h-4" /></div><p className="text-lg font-bold text-yellow-400">{stats.draftEvents}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><div className="flex justify-between"><p className="text-gray-400 text-xs">Completed</p><Ticket className="text-blue-400 w-4 h-4" /></div><p className="text-lg font-bold text-blue-400">{stats.completedEvents}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><div className="flex justify-between"><p className="text-gray-400 text-xs">Ticket Tiers</p><Users className="text-white w-4 h-4" /></div><p className="text-lg font-bold text-white">{stats.totalTicketTiers}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><div className="flex justify-between"><p className="text-gray-400 text-xs">Featured</p><Star className="text-purple-400 w-4 h-4" /></div><p className="text-lg font-bold text-purple-400">{stats.featuredEvents}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><div className="flex justify-between"><p className="text-gray-400 text-xs">Trending</p><ArrowUpRight className="text-orange-400 w-4 h-4" /></div><p className="text-lg font-bold text-orange-400">{stats.trendingEvents}</p></div>
            </div>

            {/* Recent Events */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-white">Recent Events</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" /><select value={recentEventsFilter} onChange={e=>setRecentEventsFilter(e.target.value)} className="pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"><option value="all">All Events</option><option value="published">Published</option><option value="draft">Drafts</option><option value="upcoming">Upcoming</option></select></div>
                <button onClick={goToMyEvents} className="flex items-center gap-1 text-purple-400 text-sm group">View All <ChevronRight size={12} className="group-hover:translate-x-1 transition" /></button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-500" /><p className="ml-3 text-gray-400">Loading events...</p></div>
            ) : filteredRecentEvents.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl"><Calendar size={32} className="mx-auto text-gray-500 mb-3" /><p className="text-gray-400">No events found in {organizerCountry}</p><button onClick={()=>navigate("/organizer/create-event")} className="mt-4 bg-purple-600 px-4 py-2 rounded-xl text-white">Create Event</button></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRecentEvents.map(event => {
                  const imageUrl = event.image || event.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                  const isUpcoming = new Date(event.date) > new Date() && event.status === "published";
                  const displayTierCount = event.tierCount !== undefined ? event.tierCount : (event.ticketTiers?.length || 0);
                  return (
                    <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/60 transition">
                      <div className="h-32 relative overflow-hidden"><img src={imageUrl} alt={event.title} className="w-full h-full object-cover" /><div className="absolute top-2 left-2"><div className="bg-black/60 text-white px-2 py-1 rounded-lg text-xs"><Globe size={10} className="inline mr-1" />{event.event_type}</div></div><div className="absolute top-2 right-2"><div className="bg-black/60 text-white px-2 py-1 rounded-lg text-xs"><Clock size={10} className="inline mr-1" />{getEventTimezone(event)}</div></div></div>
                      <div className="p-4"><div className="flex justify-between items-start"><h3 className="text-lg font-bold text-white">{event.title}</h3><span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(event.status)}`}>{event.status}</span></div><div className="flex items-center gap-1 text-gray-400 mt-2"><MapPin size={12} /><span className="text-sm truncate">{event.venue}</span></div><div className="flex items-center gap-1 text-gray-400 mt-2"><Calendar size={12} /><span className="text-sm">{formatEventDateTime(event)}</span></div><div className="grid grid-cols-3 gap-2 mt-4"><div className="text-center"><div className="text-gray-400 text-xs">Tiers</div><div className="text-white font-semibold">{displayTierCount}</div></div><div className="text-center"><div className="text-gray-400 text-xs">Sold</div><div className="text-white font-semibold">{(event.total_tickets_sold || 0).toLocaleString()}</div></div><div className="text-center"><div className="text-gray-400 text-xs">Revenue</div><div className="text-green-400 font-semibold">{formatCurrency(event.total_revenue || 0)}</div></div></div><div className="flex justify-between items-center pt-3 border-t border-white/10 mt-3"><div className="text-xs text-gray-400">{isUpcoming ? "Upcoming" : formatDateOnly(event.date)}</div><div className="flex gap-2"><button onClick={()=>navigate(`/organizer/event/${event.id}`)} className="text-purple-400 text-xs flex items-center gap-1"><Eye size={12} /> Details</button>{event.slug && <button onClick={()=>navigate(`/event/${event.slug}`)} className="text-gray-400 text-xs flex items-center gap-1"><ExternalLink size={12} /> View</button>}</div></div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}