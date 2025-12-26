// src/pages/organizer/EventDetail.tsx
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { 
  Calendar, MapPin, Users, DollarSign, Ticket, 
  Eye, Edit, Trash2, Upload, Download, Share2,
  BarChart3, QrCode, Mail, Phone, Globe, Tag,
  ArrowLeft, CheckCircle, XCircle, Clock, User,
  ChevronRight, Copy, MoreVertical,Menu
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  image: string;
  cover_image: string;
  status: string;
  category_id: number;
  ticketTiers: any[];
  featured: boolean;
  trending: boolean;
  isnew: boolean;
  sponsored: boolean;
  organizer_id: string;
  slug: string;
  created_at: string;
  published_at: string;
  tickets_sold: number;
  total_revenue: number;
}

interface TicketSale {
  id: string;
  ticket_id: string;
  user_id: string;
  event_id: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  payment_method: string;
  user_email: string;
  user_name: string;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showQR, setShowQR] = useState(false);
  const [eventUrl, setEventUrl] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadEventData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();

        if (eventError) throw eventError;
        if (!eventData) {
          toast.error("Event not found");
          navigate("/organizer/events");
          return;
        }

        setEvent(eventData);
        setEventUrl(`${window.location.origin}/event/${eventData.id}`);

        // Fetch ticket sales (if you have a ticket_sales table)
        const { data: salesData, error: salesError } = await supabase
          .from("ticket_sales")
          .select("*")
          .eq("event_id", id)
          .order("created_at", { ascending: false });

        if (!salesError && salesData) {
          setTicketSales(salesData);
        }

      } catch (err: any) {
        console.error("Error loading event:", err);
        toast.error("Failed to load event data");
        navigate("/organizer/events");
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id, navigate]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-4 py-2 rounded-full text-sm font-semibold border ${styles[status] || "bg-gray-500/20 text-gray-300 border-gray-500/50"}`;
  };

  const calculateStats = () => {
    if (!event) return { totalTickets: 0, totalRevenue: 0, availableTickets: 0 };
    
    const totalTickets = event.ticketTiers?.reduce((sum, tier) => sum + (tier.quantity_sold || 0), 0) || 0;
    const totalRevenue = ticketSales.reduce((sum, sale) => sum + sale.total_price, 0);
    const availableTickets = event.ticketTiers?.reduce((sum, tier) => 
      sum + ((tier.quantity_available || 0) - (tier.quantity_sold || 0)), 0) || 0;
    
    return { totalTickets, totalRevenue, availableTickets };
  };

  const publishEvent = async () => {
    if (!event) return;
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ 
          status: "published",
          published_at: new Date().toISOString()
        })
        .eq("id", event.id);

      if (error) throw error;

      setEvent({ ...event, status: "published" });
      toast.success("Event published successfully!");
    } catch (err: any) {
      toast.error("Failed to publish event: " + err.message);
    }
  };

  const unpublishEvent = async () => {
    if (!event) return;
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "draft" })
        .eq("id", event.id);

      if (error) throw error;

      setEvent({ ...event, status: "draft" });
      toast.success("Event moved to drafts");
    } catch (err: any) {
      toast.error("Failed to unpublish event: " + err.message);
    }
  };

  const deleteEvent = async () => {
    if (!event) return;
    
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      toast.success("Event deleted successfully");
      navigate("/organizer/events");
    } catch (err: any) {
      toast.error("Failed to delete event: " + err.message);
    }
  };

  const copyEventLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Event link copied to clipboard!");
  };

  const exportTicketSales = () => {
    if (ticketSales.length === 0) {
      toast.error("No ticket sales to export");
      return;
    }

    const csv = [
      ["Ticket ID", "Customer Name", "Customer Email", "Quantity", "Total Price", "Payment Method", "Date"],
      ...ticketSales.map(sale => [
        sale.ticket_id,
        sale.user_name || "N/A",
        sale.user_email || "N/A",
        sale.quantity,
        sale.total_price,
        sale.payment_method,
        new Date(sale.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.title.replace(/\s+/g, '_')}_sales.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Event not found</h2>
          <button
            onClick={() => navigate("/organizer/events")}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const ticketTiers = event.ticketTiers || [];

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:static md:z-auto`}>
        <Sidebar role="organizer" />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="text-white p-2 rounded-lg hover:bg-white/10"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Event Details</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-6 lg:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
              <div className="flex-1">
                <button
                  onClick={() => navigate("/organizer/events")}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
                >
                  <ArrowLeft size={20} />
                  Back to Events
                </button>
                <div className="flex flex-wrap items-center gap-4">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white">{event.title}</h1>
                  <span className={getStatusBadge(event.status)}>
                    {event.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400 mt-2">{event.description?.substring(0, 100)}...</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="px-5 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition flex items-center gap-2"
                >
                  <Eye size={18} />
                  View Live
                </button>
                <button
                  onClick={() => navigate(`/organizer/edit-event/${event.id}`)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-2"
                >
                  <Edit size={18} />
                  Edit Event
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition flex items-center gap-2"
                  >
                    <QrCode size={18} />
                    QR Code
                  </button>
                  
                  {showQR && (
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <div className="bg-gray-800 border border-white/10 rounded-xl p-6 shadow-2xl">
                        <QRCode value={eventUrl} size={160} />
                        <p className="text-white text-sm mt-4 text-center">{eventUrl}</p>
                        <button
                          onClick={copyEventLink}
                          className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          <Copy size={16} />
                          Copy Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Tickets Sold</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalTickets}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Ticket className="text-green-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">₦{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-blue-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Available Tickets</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.availableTickets}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <Users className="text-yellow-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Ticket Tiers</p>
                    <p className="text-3xl font-bold text-white mt-2">{ticketTiers.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Tag className="text-purple-400" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-8">
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-4 font-medium border-b-2 transition ${activeTab === "overview" ? "border-purple-500 text-purple-400" : "border-transparent text-gray-400 hover:text-white"}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("tickets")}
                  className={`px-6 py-4 font-medium border-b-2 transition ${activeTab === "tickets" ? "border-purple-500 text-purple-400" : "border-transparent text-gray-400 hover:text-white"}`}
                >
                  Ticket Sales
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`px-6 py-4 font-medium border-b-2 transition ${activeTab === "analytics" ? "border-purple-500 text-purple-400" : "border-transparent text-gray-400 hover:text-white"}`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-6 py-4 font-medium border-b-2 transition ${activeTab === "settings" ? "border-purple-500 text-purple-400" : "border-transparent text-gray-400 hover:text-white"}`}
                >
                  Settings
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-8">
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Event Details Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                      <h3 className="text-xl font-bold text-white mb-6">Event Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-gray-400 text-sm">Date & Time</label>
                            <div className="flex items-center gap-2 text-white mt-2">
                              <Calendar size={18} />
                              <span>{new Date(event.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}</span>
                              {event.time && (
                                <>
                                  <span>•</span>
                                  <Clock size={18} />
                                  <span>{event.time}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-gray-400 text-sm">Venue</label>
                            <div className="flex items-center gap-2 text-white mt-2">
                              <MapPin size={18} />
                              <span>{event.venue}</span>
                            </div>
                            {event.location && (
                              <p className="text-gray-400 text-sm mt-1">{event.location}</p>
                            )}
                          </div>

                          <div>
                            <label className="text-gray-400 text-sm">Event Type</label>
                            <p className="text-white mt-2">Physical Event</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-gray-400 text-sm">Created</label>
                            <p className="text-white mt-2">
                              {new Date(event.created_at).toLocaleDateString()} • 
                              {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          <div>
                            <label className="text-gray-400 text-sm">Published</label>
                            <p className="text-white mt-2">
                              {event.published_at 
                                ? new Date(event.published_at).toLocaleDateString()
                                : "Not published yet"}
                            </p>
                          </div>

                          <div>
                            <label className="text-gray-400 text-sm">Event URL</label>
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="text"
                                value={eventUrl}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                              />
                              <button
                                onClick={copyEventLink}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <label className="text-gray-400 text-sm">Description</label>
                        <p className="text-white mt-2">{event.description}</p>
                      </div>
                    </div>

                    {/* Ticket Tiers Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Ticket Tiers</h3>
                        <span className="text-gray-400">{ticketTiers.length} tiers</span>
                      </div>
                      
                      <div className="space-y-4">
                        {ticketTiers.map((tier, index) => (
                          <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-bold text-white text-lg">{tier.name}</h4>
                                <p className="text-gray-400 text-sm mt-1">{tier.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-white">₦{(tier.price || 0).toLocaleString()}</p>
                                <p className="text-gray-400 text-sm">per ticket</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <p className="text-gray-400 text-sm">Available</p>
                                <p className="text-xl font-bold text-white">{tier.quantity_available || 0}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-400 text-sm">Sold</p>
                                <p className="text-xl font-bold text-green-400">{tier.quantity_sold || 0}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-400 text-sm">Revenue</p>
                                <p className="text-xl font-bold text-white">
                                  ₦{((tier.price || 0) * (tier.quantity_sold || 0)).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${Math.min(100, ((tier.quantity_sold || 0) / (tier.quantity_available || 1)) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <p className="text-gray-400 text-xs text-center mt-2">
                                {((tier.quantity_sold || 0) / (tier.quantity_available || 1) * 100).toFixed(1)}% sold
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Event Image */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                      <img
                        src={event.image || event.cover_image}
                        alt={event.title}
                        className="w-full h-64 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                        }}
                      />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        {event.status === "draft" ? (
                          <button
                            onClick={publishEvent}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl flex items-center justify-center gap-3 font-medium"
                          >
                            <Upload size={18} />
                            Publish Event
                          </button>
                        ) : (
                          <button
                            onClick={unpublishEvent}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl flex items-center justify-center gap-3 font-medium"
                          >
                            <Upload size={18} />
                            Move to Drafts
                          </button>
                        )}
                        
                        <button
                          onClick={exportTicketSales}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl flex items-center justify-center gap-3 font-medium"
                        >
                          <Download size={18} />
                          Export Sales
                        </button>
                        
                        <button
                          onClick={() => setShowQR(true)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl flex items-center justify-center gap-3 font-medium"
                        >
                          <QrCode size={18} />
                          Generate QR Code
                        </button>
                        
                        <button
                          onClick={deleteEvent}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl flex items-center justify-center gap-3 font-medium"
                        >
                          <Trash2 size={18} />
                          Delete Event
                        </button>
                      </div>
                    </div>

                    {/* Event Features */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Event Features</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Featured</span>
                          {event.featured ? (
                            <CheckCircle className="text-green-400" size={18} />
                          ) : (
                            <XCircle className="text-gray-500" size={18} />
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Trending</span>
                          {event.trending ? (
                            <CheckCircle className="text-green-400" size={18} />
                          ) : (
                            <XCircle className="text-gray-500" size={18} />
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">New</span>
                          {event.isnew ? (
                            <CheckCircle className="text-green-400" size={18} />
                          ) : (
                            <XCircle className="text-gray-500" size={18} />
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Sponsored</span>
                          {event.sponsored ? (
                            <CheckCircle className="text-green-400" size={18} />
                          ) : (
                            <XCircle className="text-gray-500" size={18} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tickets" && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Ticket Sales</h3>
                    <button
                      onClick={exportTicketSales}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <Download size={16} />
                      Export CSV
                    </button>
                  </div>
                  
                  {ticketSales.length === 0 ? (
                    <div className="p-12 text-center">
                      <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-white mb-2">No ticket sales yet</h4>
                      <p className="text-gray-400">Ticket sales will appear here once customers start purchasing tickets.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-gray-400 font-medium">Ticket ID</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Customer</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Quantity</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Payment Method</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                            <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticketSales.map((sale) => (
                            <tr key={sale.id} className="border-b border-white/10 hover:bg-white/5">
                              <td className="p-4 text-white font-mono text-sm">{sale.ticket_id.substring(0, 8)}...</td>
                              <td className="p-4">
                                <div>
                                  <p className="text-white">{sale.user_name || "Anonymous"}</p>
                                  <p className="text-gray-400 text-sm">{sale.user_email || "No email"}</p>
                                </div>
                              </td>
                              <td className="p-4 text-white">{sale.quantity}</td>
                              <td className="p-4 text-white font-semibold">₦{sale.total_price.toLocaleString()}</td>
                              <td className="p-4">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                                  {sale.payment_method || "Unknown"}
                                </span>
                              </td>
                              <td className="p-4 text-gray-400">
                                {new Date(sale.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  sale.status === "completed" 
                                    ? "bg-green-500/20 text-green-300" 
                                    : sale.status === "pending"
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : "bg-red-500/20 text-red-300"
                                }`}>
                                  {sale.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Event Analytics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">Sales Overview</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-400">Total Revenue</p>
                          <p className="text-3xl font-bold text-white">₦{stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Tickets Sold</p>
                          <p className="text-3xl font-bold text-white">{stats.totalTickets}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Average Ticket Price</p>
                          <p className="text-3xl font-bold text-white">
                            ₦{stats.totalTickets > 0 ? (stats.totalRevenue / stats.totalTickets).toFixed(2) : "0"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">Performance Metrics</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-400">Conversion Rate</p>
                          <div className="flex items-center gap-4">
                            <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                              <div 
                                className="bg-green-500 h-3 rounded-full"
                                style={{ width: "65%" }}
                              ></div>
                            </div>
                            <span className="text-white font-bold">65%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400">Capacity Filled</p>
                          <div className="flex items-center gap-4">
                            <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                              <div 
                                className="bg-purple-500 h-3 rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (stats.totalTickets / (stats.totalTickets + stats.availableTickets) * 100)).toFixed(1)}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-white font-bold">
                              {((stats.totalTickets / (stats.totalTickets + stats.availableTickets)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Event Settings</h3>
                  
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">Danger Zone</h4>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-bold text-white">Delete Event</h5>
                            <p className="text-red-300 text-sm mt-1">
                              Once you delete an event, there is no going back. Please be certain.
                            </p>
                          </div>
                          <button
                            onClick={deleteEvent}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
                          >
                            Delete Event
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-white mb-4">Event Status</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={publishEvent}
                          className={`p-6 rounded-xl border ${event.status === "published" ? "border-green-500 bg-green-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${event.status === "published" ? "bg-green-500" : "bg-gray-500"}`}></div>
                            <span className={`font-bold ${event.status === "published" ? "text-green-400" : "text-white"}`}>Published</span>
                          </div>
                          <p className="text-gray-400 text-sm mt-2">Event is visible to the public</p>
                        </button>
                        
                        <button
                          onClick={unpublishEvent}
                          className={`p-6 rounded-xl border ${event.status === "draft" ? "border-yellow-500 bg-yellow-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${event.status === "draft" ? "bg-yellow-500" : "bg-gray-500"}`}></div>
                            <span className={`font-bold ${event.status === "draft" ? "text-yellow-400" : "text-white"}`}>Draft</span>
                          </div>
                          <p className="text-gray-400 text-sm mt-2">Event is hidden from the public</p>
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from("events")
                                .update({ status: "cancelled" })
                                .eq("id", event.id);
                              
                              if (error) throw error;
                              setEvent({ ...event, status: "cancelled" });
                              toast.success("Event cancelled");
                            } catch (err: any) {
                              toast.error("Failed to cancel event");
                            }
                          }}
                          className={`p-6 rounded-xl border ${event.status === "cancelled" ? "border-red-500 bg-red-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${event.status === "cancelled" ? "bg-red-500" : "bg-gray-500"}`}></div>
                            <span className={`font-bold ${event.status === "cancelled" ? "text-red-400" : "text-white"}`}>Cancelled</span>
                          </div>
                          <p className="text-gray-400 text-sm mt-2">Event is cancelled with notice</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}