// src/pages/admin/Tickets.tsx - UPDATED
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import {
  Ticket,
  DollarSign,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Loader2,
  Menu,
  Eye,
  QrCode,
  X,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react";
import Modal from "../../components/Modal";

interface TicketRecord {
  id: string;
  ticket_type: string;
  price: number;
  quantity: number;
  amount_in_ngn: number;
  purchased_at: string;
  qr_code_url: string | null;
  event_title: string;
  buyer_email: string;
  buyer_name?: string;
  reference?: string;
  order_id?: string;
  tier_name?: string;
}

interface Ticket {
  quantity: number;
  amount_in_ngn: number;
  buyer_email: string | null;
  ticket_type?: string;
}

interface Stats {
  totalTickets: number;
  totalRevenue: number;
  uniqueBuyers: number;
  avgTicketPrice: number;
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalTickets: 0,
    totalRevenue: 0,
    uniqueBuyers: 0,
    avgTicketPrice: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/auth");
        return;
      }

      const { data, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_type,
          tier_name,
          price,
          quantity,
          amount_in_ngn,
          purchased_at,
          qr_code_url,
          reference,
          order_id,
          buyer_email,
          event:event_id ( title )
        `)
        .order("purchased_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      const formattedTickets = (data || []).map((t: any) => ({
        id: t.id,
        ticket_type: t.ticket_type,
        tier_name: t.tier_name,
        price: t.price || 0,
        quantity: t.quantity || 1,
        amount_in_ngn: t.amount_in_ngn || 0,
        purchased_at: t.purchased_at,
        qr_code_url: t.qr_code_url,
        reference: t.reference,
        order_id: t.order_id,
        event_title: t.event?.title || "Unknown Event",
        buyer_email: t.buyer_email || "N/A",
      }));

      setTickets(formattedTickets);

  
      // 1. Calculate total tickets (fixed sum: number)
      const totalTickets = formattedTickets.reduce(
        (sum: number, t: any) => sum + (t.quantity || 0),
        0
      );

      // 2. Calculate total revenue (fixed sum: number)
      const totalRevenue = formattedTickets.reduce(
        (sum: number, t: any) => sum + (t.amount_in_ngn || 0),
        0
      );

      // 3. Unique buyers (fixed t: any to match the others)
      const uniqueBuyers = new Set(
        formattedTickets.map((t: any) => t.buyer_email || 'unknown')
      ).size;

      // 4. Average price
      const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;



      setStats({
        totalTickets,
        totalRevenue,
        uniqueBuyers,
        avgTicketPrice,
      });
    } catch (err: any) {
      console.error("Fetch tickets error:", err);
      setError(err.message);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Filter and sort tickets
  useEffect(() => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.event_title.toLowerCase().includes(term) ||
          t.buyer_email.toLowerCase().includes(term) ||
          t.ticket_type?.toLowerCase().includes(term) ||
          t.reference?.toLowerCase().includes(term)
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = today - 30 * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((t) => {
        const purchaseDate = new Date(t.purchased_at).getTime();
        if (dateFilter === "today") return purchaseDate >= today;
        if (dateFilter === "week") return purchaseDate >= weekAgo;
        if (dateFilter === "month") return purchaseDate >= monthAgo;
        return true;
      });
    }

    // Apply sorting
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime());
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.amount_in_ngn - a.amount_in_ngn);
    } else if (sortBy === "price-low") {
      filtered.sort((a, b) => a.amount_in_ngn - b.amount_in_ngn);
    } else if (sortBy === "event-az") {
      filtered.sort((a, b) => a.event_title.localeCompare(b.event_title));
    } else if (sortBy === "event-za") {
      filtered.sort((a, b) => b.event_title.localeCompare(a.event_title));
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, dateFilter, sortBy]);

  const handleRefresh = () => {
    setLoading(true);
    fetchTickets();
    toast.success("Tickets refreshed!");
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
      return new Date(dateString).toLocaleString("en-NG", {
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

  const viewQR = (ticket: TicketRecord) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
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
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Tickets</h3>
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
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Navbar role="admin" />
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Tickets</h1>
                <p className="text-gray-400 text-sm sm:text-base">View all ticket sales</p>
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
                    <p className="text-gray-400 text-xs sm:text-sm">Total Tickets</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.totalTickets.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Ticket className="text-purple-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <DollarSign className="text-green-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Unique Buyers</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-400 mt-1">{stats.uniqueBuyers.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Users className="text-blue-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Avg Ticket Price</p>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-400 mt-1">{formatCurrency(stats.avgTicketPrice)}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Ticket className="text-yellow-400 w-5 h-5 lg:w-6 lg:h-6" />
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
                  placeholder="Search by event, buyer, ticket type, reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/60"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/60"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-high">Price (High to Low)</option>
                  <option value="price-low">Price (Low to High)</option>
                  <option value="event-az">Event (A-Z)</option>
                  <option value="event-za">Event (Z-A)</option>
                </select>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/10 text-gray-300">
                    <tr>
                      <th className="px-6 py-3 font-medium">Event</th>
                      <th className="px-6 py-3 font-medium">Ticket Type</th>
                      <th className="px-6 py-3 font-medium">Buyer</th>
                      <th className="px-6 py-3 font-medium">Qty</th>
                      <th className="px-6 py-3 font-medium">Price</th>
                      <th className="px-6 py-3 font-medium">Total (NGN)</th>
                      <th className="px-6 py-3 font-medium">Purchased At</th>
                      <th className="px-6 py-3 font-medium">Reference</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-white">{ticket.event_title}</td>
                        <td className="px-6 py-4 text-gray-300">{ticket.ticket_type || ticket.tier_name || "—"}</td>
                        <td className="px-6 py-4 text-gray-400">{ticket.buyer_email}</td>
                        <td className="px-6 py-4 text-white">{ticket.quantity}</td>
                        <td className="px-6 py-4 text-white">{formatCurrency(ticket.price)}</td>
                        <td className="px-6 py-4 text-green-400">{formatCurrency(ticket.amount_in_ngn)}</td>
                        <td className="px-6 py-4 text-gray-400">{formatDate(ticket.purchased_at)}</td>
                        <td className="px-6 py-4 text-gray-500 text-xs font-mono">{ticket.reference || "—"}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => viewQR(ticket)}
                            className="p-1 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
                            title="View QR Code"
                          >
                            <QrCode size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                          No tickets found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary footer */}
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredTickets.length} of {tickets.length} total tickets
            </div>
          </main>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedTicket && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
            <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Ticket QR Code</h3>
                <button onClick={() => setShowQRModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="text-gray-300">
                  <p><span className="font-medium">Event:</span> {selectedTicket.event_title}</p>
                  <p><span className="font-medium">Ticket:</span> {selectedTicket.ticket_type || selectedTicket.tier_name}</p>
                  <p><span className="font-medium">Buyer:</span> {selectedTicket.buyer_email}</p>
                  <p><span className="font-medium">Reference:</span> {selectedTicket.reference}</p>
                </div>
                {selectedTicket.qr_code_url ? (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={selectedTicket.qr_code_url} alt="QR Code" className="w-48 h-48" />
                  </div>
                ) : (
                  <div className="text-center p-8 bg-white/5 rounded-lg">
                    <p className="text-gray-400">No QR code available</p>
                  </div>
                )}
                <button
                  onClick={() => window.open(selectedTicket.qr_code_url || undefined, "_blank")}
                  disabled={!selectedTicket.qr_code_url}
                  className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  View Full Size
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}