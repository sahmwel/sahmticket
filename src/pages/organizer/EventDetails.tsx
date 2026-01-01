// src/pages/organizer/EventDetails.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Ticket,
  Edit,
  ArrowLeft,
  Share2,
  Printer,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  Menu,
  MoreVertical,
  QrCode,
  Mail,
  Phone,
  Globe,
  Tag
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import QRCode from "react-qr-code";

interface TicketTier {
  id: string;
  tier_name: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  is_active: boolean;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  venue: string;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string;
  image: string | null;
  cover_image: string | null;
  category_id: number | null;
  status: "draft" | "published" | "cancelled" | "completed";
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  featured: boolean;
  trending: boolean;
  isnew: boolean;
  sponsored: boolean;
  event_type: string;
  virtual_link: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  tags: string[] | null;
  slug: string | null;
  ticketTiers?: TicketTier[];
  purchases?: any[]; // Array of purchase objects
  total_tickets_sold: number;
  total_revenue: number;
  total_purchases: number;
  avg_ticket_price: number;
}

interface Purchase {
  id: string;
  event_id: string;
  ticket_id: string;
  full_name: string;
  email: string;
  phone: string;
  quantity: number;
  price: number;
  reference: string;
  order_id: string;
  purchased_at: string;
  created_at: string;
  buyer_email: string;
  tier_name: string;
  tier_description: string | null;
  qr_code_url: string | null;
}

export default function OrganizerEventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Your date formatting functions
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

  // Helper function to combine date and time for your formatDate function
  const combineDateTime = (dateString: string, timeString: string): string | null => {
    if (!dateString) return null;
    
    try {
      // Parse the date part
      const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
      
      // Parse the time part if available
      let hours = 0, minutes = 0;
      if (timeString) {
        const [timeHours, timeMinutes] = timeString.split(':').map(Number);
        hours = timeHours || 0;
        minutes = timeMinutes || 0;
      }
      
      // Create a date object with the combined datetime
      const date = new Date(year, month - 1, day, hours, minutes);
      return date.toISOString();
    } catch (error) {
      console.error("Error combining date and time:", error);
      return null;
    }
  };

  // Format date and time together using your formatDate function
  const formatEventDateTime = (dateString: string, timeString: string) => {
    const combinedDateTime = combineDateTime(dateString, timeString);
    return formatDate(combinedDateTime);
  };

  // Format purchase date
  const formatPurchaseDateTime = (timestamp: string) => {
    return formatDate(timestamp);
  };

  useEffect(() => {
    if (!id) return;

    const fetchEventData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        // Fetch event with comprehensive data
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();

        if (eventError) throw eventError;
        if (!eventData) {
          navigate("/organizer/my-events");
          return;
        }

        let totalSold = 0;
        let totalRevenue = 0;
        let totalPurchases = 0;
        let avgTicketPrice = 0;
        let ticketTiers: TicketTier[] = [];
        let purchasesData: any[] = [];

        console.log(`🔍 Fetching data for event: ${id}`);

        // PRIMARY SOURCE: Fetch purchases (most accurate)
        const { data: purchases, error: purchasesError } = await supabase
          .from("purchases")
          .select("id, quantity, price, purchased_at, full_name, email, tier_name, reference, qr_code_url")
          .eq("event_id", id)
          .order("purchased_at", { ascending: false });

        console.log("📋 Purchases query result:", {
          purchasesCount: purchases?.length || 0,
          purchasesError: purchasesError?.message,
          purchasesData: purchases
        });

        if (!purchasesError && purchases) {
          purchasesData = purchases;
          setPurchases(purchasesData);
          totalPurchases = purchasesData.length; // This counts transactions
          
          // Calculate totals from purchases
          purchasesData.forEach((purchase: any) => {
            const quantity = parseInt(purchase.quantity) || 0;
            const price = parseFloat(purchase.price) || 0;
            totalSold += quantity;
            totalRevenue += price * quantity;
          });
          
          console.log(`📊 From purchases: ${totalSold} tickets, ₦${totalRevenue} revenue, ${totalPurchases} purchase transactions`);
        } else if (purchasesError) {
          console.error("❌ Error fetching purchases:", purchasesError);
        }

        // SECONDARY SOURCE: Fetch ticket tiers for backup data
        try {
          const { data: tiersData, error: tiersError } = await supabase
            .from("ticketTiers")
            .select("id, tier_name, price, quantity_sold, quantity_total, is_active")
            .eq("event_id", id);

          console.log("🎫 Ticket tiers query result:", {
            tiersCount: tiersData?.length || 0,
            tiersError: tiersError?.message,
            tiersData: tiersData
          });

          if (!tiersError && tiersData) {
            ticketTiers = tiersData;
            
            // If no purchases found, use ticket tiers data
            if (totalSold === 0) {
              tiersData.forEach((tier: any) => {
                const sold = parseInt(tier.quantity_sold) || 0;
                const price = parseFloat(tier.price) || 0;
                totalSold += sold;
                totalRevenue += price * sold;
              });
              console.log(`🎫 From ticketTiers: ${totalSold} tickets, ₦${totalRevenue} revenue`);
            }
          }
        } catch (err) {
          console.error("Could not fetch ticket tiers:", err);
        }

        // TERTIARY SOURCE: Check JSONB column as last resort
        if (totalSold === 0 && eventData.ticketTiers && Array.isArray(eventData.ticketTiers)) {
          console.log("📦 Checking JSONB ticketTiers column:", eventData.ticketTiers);
          
          eventData.ticketTiers.forEach((tier: any) => {
            const sold = parseInt(tier.quantity_sold) || 0;
            const price = parseFloat(tier.price) || 0;
            totalSold += sold;
            totalRevenue += price * sold;
          });
          console.log(`📦 From JSONB column: ${totalSold} tickets, ₦${totalRevenue} revenue`);
        }

        // Calculate average ticket price (if there are sales)
        if (totalSold > 0) {
          avgTicketPrice = totalRevenue / totalSold;
        }

        console.log(`📈 Event ${id} Summary:`);
        console.log(`   Tickets Sold: ${totalSold}`);
        console.log(`   Total Revenue: ₦${totalRevenue.toFixed(2)}`);
        console.log(`   Total Purchase Transactions: ${totalPurchases}`);
        console.log(`   Avg Ticket Price: ₦${avgTicketPrice.toFixed(2)}`);
        console.log(`   Ticket Tiers: ${ticketTiers.length}`);

        const enrichedEvent: Event = {
          ...eventData,
          ticketTiers,
          purchases: purchasesData,
          total_tickets_sold: totalSold,
          total_revenue: totalRevenue,
          total_purchases: totalPurchases,
          avg_ticket_price: avgTicketPrice,
        };

        setEvent(enrichedEvent);
      } catch (error) {
        console.error("Error fetching event:", error);
        navigate("/organizer/my-events");
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, navigate]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-4 py-2 rounded-full text-sm font-semibold border ${
      styles[status] || "bg-gray-500/20 text-gray-300 border-gray-500/50"
    }`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
            onClick={() => navigate("/organizer/my-events")}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl text-white"
          >
            Go back to events
          </button>
        </div>
      </div>
    );
  }

  const ticketTiers = event.ticketTiers || [];
  const hasSales = event.total_tickets_sold > 0;
  const purchaseCount = purchases.length;
  const averageTicketPrice = event.total_tickets_sold > 0 
    ? Math.round(event.total_revenue / event.total_tickets_sold)
    : 0;

  return (
    <div className="flex min-h-screen bg-gray-950">


      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-6 lg:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/organizer/my-events")}
                  className="p-2 rounded-lg hover:bg-white/10 transition text-white"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white">{event.title}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={getStatusBadge(event.status)}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      Created: {formatDateOnly(event.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition"
                >
                  <Edit size={18} /> Edit Event
                </button>
                <button
                  onClick={() => navigate(`/event/${event.slug || event.id}`)}
                  className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition"
                >
                  <Eye size={18} /> View Public Page
                </button>
              </div>
            </div>

            {/* Event Banner */}
            <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden mb-8">
              <img 
                src={event.image || event.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={20} />
                  <span className="text-lg">{formatEventDateTime(event.date, event.time)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={20} />
                  <span className="text-lg">{event.venue}</span>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tickets Sold</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {event.total_tickets_sold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Ticket className="text-green-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {formatCurrency(event.total_revenue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-blue-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Purchases</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {event?.total_purchases?.toLocaleString() || 0}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      {event?.purchases?.length || 0} transactions
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Users className="text-purple-400" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Avg. Ticket Price</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {formatCurrency(averageTicketPrice)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-pink-400" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-8">
              <button
                className={`px-6 py-3 font-medium transition ${activeTab === "overview" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`px-6 py-3 font-medium transition ${activeTab === "tickets" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("tickets")}
              >
                Ticket Tiers
              </button>
              <button
                className={`px-6 py-3 font-medium transition ${activeTab === "purchases" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("purchases")}
              >
                Purchases ({purchaseCount})
              </button>
              <button
                className={`px-6 py-3 font-medium transition ${activeTab === "analytics" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("analytics")}
              >
                Analytics
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Event Details */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Event Details</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-gray-400 text-sm">Date & Time</p>
                          <p className="text-white">{formatEventDateTime(event.date, event.time)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-gray-400 text-sm">Venue</p>
                          <p className="text-white">{event.venue}</p>
                          {event.location && (
                            <p className="text-gray-400 text-sm mt-1">{event.location}</p>
                          )}
                          {(event.city || event.state || event.country) && (
                            <p className="text-gray-400 text-sm">
                              {[event.city, event.state, event.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      {event.virtual_link && (
                        <div className="flex items-start gap-3">
                          <Globe className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                          <div>
                            <p className="text-gray-400 text-sm">Virtual Link</p>
                            <a href={event.virtual_link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                              {event.virtual_link}
                            </a>
                          </div>
                        </div>
                      )}
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Tag className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                          <div>
                            <p className="text-gray-400 text-sm">Tags</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {event.tags.map((tag, index) => (
                                <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-6">Description</h3>
                      <p className="text-gray-300 whitespace-pre-line">{event.description}</p>
                    </div>
                  )}

                  {/* Contact Information */}
                  {(event.contact_email || event.contact_phone) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-6">Contact Information</h3>
                      <div className="space-y-4">
                        {event.contact_email && (
                          <div className="flex items-center gap-3">
                            <Mail className="text-gray-400" size={20} />
                            <a href={`mailto:${event.contact_email}`} className="text-purple-400 hover:text-purple-300">
                              {event.contact_email}
                            </a>
                          </div>
                        )}
                        {event.contact_phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="text-gray-400" size={20} />
                            <a href={`tel:${event.contact_phone}`} className="text-purple-400 hover:text-purple-300">
                              {event.contact_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Quick Stats */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Quick Stats</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-sm">Ticket Tiers</p>
                        <p className="text-2xl font-bold text-white">{ticketTiers.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Remaining Capacity</p>
                        <p className="text-2xl font-bold text-white">
                          {ticketTiers.reduce((sum, tier) => sum + (tier.quantity_total - tier.quantity_sold), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Sales Rate</p>
                        <p className="text-2xl font-bold text-white">
                          {ticketTiers.reduce((sum, tier) => sum + tier.quantity_total, 0) > 0 
                            ? `${Math.round((event.total_tickets_sold / ticketTiers.reduce((sum, tier) => sum + tier.quantity_total, 0)) * 100)}%`
                            : "0%"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Features */}
                  {(event.featured || event.trending || event.isnew || event.sponsored) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-6">Event Features</h3>
                      <div className="space-y-3">
                        {event.featured && (
                          <div className="flex items-center gap-3">
                            <CheckCircle className="text-green-400" size={20} />
                            <span className="text-white">Featured Event</span>
                          </div>
                        )}
                        {event.trending && (
                          <div className="flex items-center gap-3">
                            <TrendingUp className="text-blue-400" size={20} />
                            <span className="text-white">Trending</span>
                          </div>
                        )}
                        {event.isnew && (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-xs font-bold">NEW</span>
                            </div>
                            <span className="text-white">New Event</span>
                          </div>
                        )}
                        {event.sponsored && (
                          <div className="flex items-center gap-3">
                            <DollarSign className="text-yellow-400" size={20} />
                            <span className="text-white">Sponsored</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "tickets" && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white">Ticket Tiers</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-6 text-gray-400 font-medium">Tier Name</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Price</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Quantity</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Sold</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Remaining</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Revenue</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticketTiers.length > 0 ? (
                        ticketTiers.map((tier) => {
                          const remaining = tier.quantity_total - tier.quantity_sold;
                          const revenue = tier.price * tier.quantity_sold;
                          const soldPercentage = tier.quantity_total > 0 
                            ? (tier.quantity_sold / tier.quantity_total) * 100 
                            : 0;

                          return (
                            <tr key={tier.id} className="border-b border-white/10 hover:bg-white/5">
                              <td className="p-6">
                                <div>
                                  <p className="text-white font-medium">{tier.tier_name}</p>
                                  {tier.description && (
                                    <p className="text-gray-400 text-sm mt-1">{tier.description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="p-6">
                                <p className="text-white font-medium">{formatCurrency(tier.price)}</p>
                              </td>
                              <td className="p-6">
                                <p className="text-white">{tier.quantity_total.toLocaleString()}</p>
                              </td>
                              <td className="p-6">
                                <div>
                                  <p className="text-white">{tier.quantity_sold.toLocaleString()}</p>
                                  <div className="w-32 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full" 
                                      style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-gray-400 text-xs mt-1">{Math.round(soldPercentage)}% sold</p>
                                </div>
                              </td>
                              <td className="p-6">
                                <p className={`font-medium ${remaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                                  {remaining.toLocaleString()}
                                </p>
                              </td>
                              <td className="p-6">
                                <p className="text-green-400 font-medium">{formatCurrency(revenue)}</p>
                              </td>
                              <td className="p-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  tier.is_active 
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                                    : 'bg-red-500/20 text-red-300 border border-red-500/50'
                                }`}>
                                  {tier.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400">
                            No ticket tiers found for this event
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {ticketTiers.length > 0 && (
                  <div className="p-6 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-400 text-sm">Total from all tiers</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(event.total_revenue)}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition"
                      >
                        Edit Ticket Tiers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">Purchases ({purchaseCount})</h3>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition">
                      <Download size={18} /> Export
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition">
                      <Printer size={18} /> Print
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-6 text-gray-400 font-medium">Name</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Email</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Ticket Tier</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Quantity</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Price</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Total</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Date</th>
                        <th className="text-left p-6 text-gray-400 font-medium">Reference</th>
                        <th className="text-left p-6 text-gray-400 font-medium">QR Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.length > 0 ? (
                        purchases.map((purchase) => (
                          <tr key={purchase.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-6">
                              <p className="text-white font-medium">{purchase.full_name}</p>
                            </td>
                            <td className="p-6">
                              <p className="text-white">{purchase.email}</p>
                            </td>
                            <td className="p-6">
                              <p className="text-white">{purchase.tier_name}</p>
                            </td>
                            <td className="p-6">
                              <p className="text-white">{purchase.quantity}</p>
                            </td>
                            <td className="p-6">
                              <p className="text-white">{formatCurrency(purchase.price)}</p>
                            </td>
                            <td className="p-6">
                              <p className="text-green-400 font-medium">{formatCurrency(purchase.price * purchase.quantity)}</p>
                            </td>
                            <td className="p-6">
                              <p className="text-gray-400">
                                {formatPurchaseDateTime(purchase.purchased_at)}
                              </p>
                            </td>
                            <td className="p-6">
                              <p className="text-gray-400 font-mono text-sm">{purchase.reference}</p>
                            </td>
                            <td className="p-6">
                              {purchase.qr_code_url ? (
                                <button
                                  onClick={() => setSelectedPurchase(purchase)}
                                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                                >
                                  <QrCode size={20} className="text-white" />
                                </button>
                              ) : (
                                <span className="text-gray-500">No QR</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-gray-400">
                            No purchases found for this event
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Analytics Coming Soon</h3>
                <p className="text-gray-400">
                  Detailed analytics including sales trends, customer demographics, and performance metrics
                  will be available in a future update.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Ticket QR Code</h3>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl inline-block mb-6">
                {selectedPurchase.qr_code_url ? (
                  <img 
                    src={selectedPurchase.qr_code_url} 
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                ) : (
                  <QRCode 
                    value={`https://sahmtickethub.online/${selectedPurchase.reference}`}
                    size={256}
                    level="H"
                  />
                )}
              </div>
              
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-gray-400 text-sm">Attendee</p>
                  <p className="text-white font-medium">{selectedPurchase.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Ticket Tier</p>
                  <p className="text-white">{selectedPurchase.tier_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Purchase Date</p>
                  <p className="text-white">{formatPurchaseDateTime(selectedPurchase.purchased_at)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Reference</p>
                  <p className="text-white font-mono text-sm">{selectedPurchase.reference}</p>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedPurchase.qr_code_url || `data:image/png;base64,${document.querySelector('canvas')?.toDataURL()}`;
                    link.download = `ticket-${selectedPurchase.reference}.png`;
                    link.click();
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition"
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}