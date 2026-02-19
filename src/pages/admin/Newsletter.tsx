// src/pages/admin/Newsletter.tsx - NEWSLETTER SUBSCRIBERS
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import {
  Mail,
  Users,
  Search,
  RefreshCw,
  Loader2,
  Menu,
  Trash2,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import Modal from "../../components/Modal";

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
  status?: "active" | "unsubscribed";
  source?: string;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
  newThisMonth: number;
}

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
    newThisMonth: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");

  const navigate = useNavigate();

  const fetchSubscribers = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/auth");
        return;
      }

      // Fetch subscribers from newsletters table
      const { data, error: fetchError } = await supabase
        .from("newsletters")
        .select("id, email, created_at, status, source")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const typedData = (data || []).map((item: any) => ({
        id: item.id,
        email: item.email,
        created_at: item.created_at,
        status: item.status || "active",
        source: item.source || "website",
      }));

      setSubscribers(typedData);

      // Calculate stats
      const total = typedData.length;
      const active = typedData.filter(s => s.status === "active").length;
      const unsubscribed = typedData.filter(s => s.status === "unsubscribed").length;
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const newThisMonth = typedData.filter(s => s.created_at >= firstDayOfMonth).length;

      setStats({ total, active, unsubscribed, newThisMonth });
    } catch (err: any) {
      console.error("Fetch subscribers error:", err);
      setError(err.message);
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Filter and sort subscribers
  useEffect(() => {
    let filtered = [...subscribers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.email.toLowerCase().includes(term));
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "email-asc") {
      filtered.sort((a, b) => a.email.localeCompare(b.email));
    } else if (sortBy === "email-desc") {
      filtered.sort((a, b) => b.email.localeCompare(a.email));
    }

    setFilteredSubscribers(filtered);
  }, [subscribers, searchTerm, statusFilter, sortBy]);

  const handleRefresh = () => {
    setLoading(true);
    fetchSubscribers();
    toast.success("Subscribers refreshed!");
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

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return "bg-green-500/20 text-green-300 border-green-500/50";
    }
    return "bg-gray-500/20 text-gray-300 border-gray-500/50";
  };

  const openDeleteModal = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!selectedSubscriber) return;
    try {
      const { error } = await supabase
        .from("newsletters")
        .delete()
        .eq("id", selectedSubscriber.id);

      if (error) throw error;

      toast.success("Subscriber removed");
      setShowDeleteModal(false);
      fetchSubscribers();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  const handleToggleStatus = async (subscriber: Subscriber) => {
    const newStatus = subscriber.status === "active" ? "unsubscribed" : "active";
    try {
      const { error } = await supabase
        .from("newsletters")
        .update({ status: newStatus })
        .eq("id", subscriber.id);

      if (error) throw error;

      toast.success(`Subscriber marked as ${newStatus}`);
      fetchSubscribers();
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const exportCSV = () => {
    const headers = ["Email", "Subscribed At", "Status", "Source"];
    const rows = filteredSubscribers.map(s => [
      s.email,
      new Date(s.created_at).toLocaleString(),
      s.status,
      s.source || "",
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter_subscribers_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
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
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Subscribers</h3>
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
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role="admin" />
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Newsletter Subscribers</h1>
                <p className="text-gray-400 text-sm sm:text-base">Manage email subscribers</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition"
                >
                  <Download size={16} />
                  Export CSV
                </button>
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
                    <p className="text-gray-400 text-xs sm:text-sm">Total Subscribers</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Mail className="text-purple-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Active</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400 mt-1">{stats.active}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Unsubscribed</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-400 mt-1">{stats.unsubscribed}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <XCircle className="text-gray-400 w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">New This Month</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-400 mt-1">{stats.newThisMonth}</p>
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/20 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <Users className="text-blue-400 w-5 h-5 lg:w-6 lg:h-6" />
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
                  placeholder="Search by email..."
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
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-purple-500/60"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="email-asc">Email A-Z</option>
                  <option value="email-desc">Email Z-A</option>
                </select>
              </div>
            </div>

            {/* Subscribers Table */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/10 text-gray-300">
                    <tr>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Subscribed At</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Source</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-white">{sub.email}</td>
                        <td className="px-6 py-4 text-gray-400">{formatDate(sub.created_at)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(sub.status || "active")}`}>
                            {sub.status || "active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{sub.source || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === sub.id ? null : sub.id)}
                              className="p-1 hover:bg-white/10 rounded-lg transition"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>
                            {openMenuId === sub.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 py-1">
                                  <button
                                    onClick={() => {
                                      handleToggleStatus(sub);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                  >
                                    {sub.status === "active" ? (
                                      <>
                                        <XCircle size={14} /> Mark as Unsubscribed
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={14} /> Mark as Active
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(sub)}
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
                    {filteredSubscribers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          No subscribers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary footer */}
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredSubscribers.length} of {stats.total} total subscribers
            </div>
          </main>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubscriber && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-white mb-4">Remove Subscriber</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to remove <span className="text-white font-medium">{selectedSubscriber.email}</span> from the newsletter? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}