// src/pages/admin/Dashboard.tsx - UPDATED FOR RESPONSIVENESS + PROPER AUTH
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import {
  Users,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Eye,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Loader2,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  Star,
  Clock,
  MapPin,
  Mail,
  UserCheck,
  UserX,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  created_at: string;
  last_sign_in?: string;
}

// Define your Profile type
interface Profile {
  role: 'organizer' | 'attendee' | string;
}

// Define your Event type
interface Event {
  status: 'published' | 'draft' | string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: string;
  organizer_id: string;
  ticketTiers?: any[];
  total_tickets_sold?: number;
  total_revenue?: number;
}

interface Ticket {
  id: string;
  ticket_type: string;
  price: number;
  buyer_email: string;
  event_title: string;
  purchased_at: string;
  quantity: number;
  amount_in_ngn: number;
}

interface TicketRecord {
  quantity: number;
  amount_in_ngn: number;
}

interface Stats {
  totalUsers: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  publishedEvents: number;
  draftEvents: number;
  organizers: number;
  attendees: number;
}

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    publishedEvents: 0,
    draftEvents: 0,
    organizers: 0,
    attendees: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "events" | "tickets">("users");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // ✅ Refresh token by getting user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/auth");
        return;
      }

      // 1️⃣ Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, role, full_name, created_at, last_sign_in")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // 2️⃣ Fetch events with sales data
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          date,
          venue,
          status,
          organizer_id,
          ticketTiers
        `)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      // Enrich events with sales counts from tickets
      const enrichedEvents = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          let totalSold = 0;
          let totalRevenue = 0;

          // Get tickets for this event
          const { data: ticketsForEvent } = await supabase
            .from("tickets")
            .select("quantity, amount_in_ngn")
            .eq("event_id", event.id);

          if (ticketsForEvent) {
            ticketsForEvent.forEach((t: any) => {
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

      // 3️⃣ Fetch recent tickets (last 50)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_type,
          price,
          buyer_email,
          event:event_id ( title ),
          purchased_at,
          quantity,
          amount_in_ngn
        `)
        .order("purchased_at", { ascending: false })
        .limit(50);

      if (ticketsError) throw ticketsError;

      const formattedTickets = ticketsData?.map((t: any) => ({
        id: t.id,
        ticket_type: t.ticket_type,
        price: t.price,
        buyer_email: t.buyer_email || "N/A",
        event_title: t.event?.title || "N/A",
        purchased_at: t.purchased_at,
        quantity: t.quantity || 1,
        amount_in_ngn: t.amount_in_ngn || 0,
      })) || [];
      setTickets(formattedTickets);

      // Calculate stats
      const totalUsers = profilesData?.length || 0;
      const totalEvents = eventsData?.length || 0;
      const totalTicketsSold = formattedTickets.reduce((sum: number, t: TicketRecord) => sum + t.quantity, 0);
      const totalRevenue = formattedTickets.reduce((sum: number, t: TicketRecord) => sum + t.amount_in_ngn, 0);
      const publishedEvents = eventsData?.filter((e: any) => e.status === "published").length || 0;
      const draftEvents = eventsData?.filter((e: any) => e.status === "draft").length || 0;
      const organizers = profilesData?.filter((p: any) => p.role === "organizer").length || 0;
      const attendees = profilesData?.filter((p: any) => p.role === "attendee").length || 0;

      setStats({
        totalUsers,
        totalEvents,
        totalTicketsSold,
        totalRevenue,
        publishedEvents,
        draftEvents,
        organizers,
        attendees,
      });

    } catch (err: any) {
      console.error("Admin dashboard fetch error:", err);
      setError(err.message);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
    toast.success("Dashboard refreshed!");
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
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Filter data based on search term
 const filteredProfiles = profiles.filter((p) => {
  // Ensure searchTerm is a string to prevent errors
  const search = searchTerm?.toLowerCase() || '';

  return (
    p.email?.toLowerCase().includes(search) ||
    p.full_name?.toLowerCase().includes(search) ||
    p.role?.toLowerCase().includes(search)
  );
});

  const filteredEvents = events.filter((e) => {
  const search = searchTerm?.toLowerCase() || '';

  return (
    e.title?.toLowerCase().includes(search) ||
    e.venue?.toLowerCase().includes(search) ||
    e.status?.toLowerCase().includes(search)
  );
});

  const filteredTickets = tickets.filter((t) => {
  const search = searchTerm?.toLowerCase() || '';

  return (
    t.ticket_type?.toLowerCase().includes(search) ||
    t.buyer_email?.toLowerCase().includes(search) ||
    t.event_title?.toLowerCase().includes(search)
  );
});

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
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Dashboard</h3>
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
          <Navbar role="admin" />
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-400 text-sm sm:text-base">Overview of platform activity</p>
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
                    <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.totalUsers}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Users className="text-purple-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {stats.organizers} organizers • {stats.attendees} attendees
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Events</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.totalEvents}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Calendar className="text-blue-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {stats.publishedEvents} published • {stats.draftEvents} drafts
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Tickets Sold</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                      {stats.totalTicketsSold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Ticket className="text-green-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">Across all events</div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-pink-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <DollarSign className="text-pink-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Avg: {stats.totalTicketsSold ? formatCurrency(Math.round(stats.totalRevenue / stats.totalTicketsSold)) : "N/A"}
                </div>
              </div>
            </div>

            {/* Search and Tabs */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("users")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeTab === "users"
                        ? "bg-purple-600 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab("events")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeTab === "events"
                        ? "bg-purple-600 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Events
                  </button>
                  <button
                    onClick={() => setActiveTab("tickets")}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeTab === "tickets"
                        ? "bg-purple-600 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Tickets
                  </button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
              </div>
            </div>

            {/* Data Tables */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              {activeTab === "users" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/10 text-gray-300">
                      <tr>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Email</th>
                        <th className="px-6 py-3 font-medium">Role</th>
                        <th className="px-6 py-3 font-medium">Joined</th>
                        <th className="px-6 py-3 font-medium">Last Sign In</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 text-white">
                            {profile.full_name || "—"}
                          </td>
                          <td className="px-6 py-4 text-gray-300">{profile.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              profile.role === "admin"
                                ? "bg-purple-500/20 text-purple-300"
                                : profile.role === "organizer"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-green-500/20 text-green-300"
                            }`}>
                              {profile.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {profile.created_at ? formatDate(profile.created_at) : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {profile.last_sign_in ? formatDate(profile.last_sign_in) : "Never"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === profile.id ? null : profile.id)}
                                className="p-1 hover:bg-white/10 rounded-lg transition"
                              >
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>
                              {openMenuId === profile.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                                    <button
                                      onClick={() => {
                                        // TODO: implement edit user role
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                    >
                                      <Edit size={14} /> Edit Role
                                    </button>
                                    <button
                                      onClick={() => {
                                        // TODO: implement delete user (with caution)
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> Delete User
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredProfiles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "events" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/10 text-gray-300">
                      <tr>
                        <th className="px-6 py-3 font-medium">Event</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Venue</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Tickets Sold</th>
                        <th className="px-6 py-3 font-medium">Revenue</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 text-white">{event.title}</td>
                          <td className="px-6 py-4 text-gray-400">{formatDate(event.date)}</td>
                          <td className="px-6 py-4 text-gray-400">{event.venue}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === "published"
                                ? "bg-green-500/20 text-green-300"
                                : event.status === "draft"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-gray-500/20 text-gray-300"
                            }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-white">{event.total_tickets_sold || 0}</td>
                          <td className="px-6 py-4 text-green-400">{formatCurrency(event.total_revenue || 0)}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => navigate(`/event/${event.id}`)}
                              className="p-1 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredEvents.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                            No events found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "tickets" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/10 text-gray-300">
                      <tr>
                        <th className="px-6 py-3 font-medium">Ticket Type</th>
                        <th className="px-6 py-3 font-medium">Event</th>
                        <th className="px-6 py-3 font-medium">Buyer</th>
                        <th className="px-6 py-3 font-medium">Quantity</th>
                        <th className="px-6 py-3 font-medium">Price (NGN)</th>
                        <th className="px-6 py-3 font-medium">Total (NGN)</th>
                        <th className="px-6 py-3 font-medium">Purchased At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 text-white">{ticket.ticket_type}</td>
                          <td className="px-6 py-4 text-gray-400">{ticket.event_title}</td>
                          <td className="px-6 py-4 text-gray-300">{ticket.buyer_email}</td>
                          <td className="px-6 py-4 text-white">{ticket.quantity}</td>
                          <td className="px-6 py-4 text-white">{formatCurrency(ticket.price)}</td>
                          <td className="px-6 py-4 text-green-400">{formatCurrency(ticket.amount_in_ngn)}</td>
                          <td className="px-6 py-4 text-gray-400">{formatDate(ticket.purchased_at)}</td>
                        </tr>
                      ))}
                      {filteredTickets.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                            No tickets found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/admin/users")}
                className="p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition group"
              >
                <Users className="w-6 h-6 text-purple-400 mb-2" />
                <h3 className="text-white font-medium">Manage Users</h3>
                <p className="text-gray-400 text-sm mt-1">View and edit user roles</p>
              </button>
              <button
                onClick={() => navigate("/admin/events")}
                className="p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition group"
              >
                <Calendar className="w-6 h-6 text-blue-400 mb-2" />
                <h3 className="text-white font-medium">Manage Events</h3>
                <p className="text-gray-400 text-sm mt-1">Approve or moderate events</p>
              </button>
              <button
                onClick={() => navigate("/admin/settings")}
                className="p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 transition group"
              >
                <DollarSign className="w-6 h-6 text-green-400 mb-2" />
                <h3 className="text-white font-medium">Platform Settings</h3>
                <p className="text-gray-400 text-sm mt-1">Configure fees and policies</p>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}