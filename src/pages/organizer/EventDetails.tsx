// src/pages/organizer/EventDetails.tsx - UPDATED WITH GUEST ARTISTES
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
  Tag,
  Music,
  Mic,
  Star,
  Image as ImageIcon,
  Instagram,
  Twitter,
  Youtube,
  Headphones
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
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

interface GuestArtiste {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  bio: string | null;
  social_media: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
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
  timezone?: string;
  ticketTiers?: TicketTier[];
  purchases?: any[];
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
  const [guestArtistes, setGuestArtistes] = useState<GuestArtiste[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestArtiste | null>(null);

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

  // Get current timezone
  const getEventTimezone = () => {
    if (event?.timezone) return event.timezone;
    if (event?.country) return TIMEZONES[event.country] || 'WAT (UTC+1)';
    return 'WAT (UTC+1)';
  };

  // Enhanced date formatting functions
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

  // Combine date and time for display
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

  // Format event date and time with timezone
  const formatEventDateTime = (dateString: string, timeString: string) => {
    const combinedDateTime = combineDateTime(dateString, timeString);
    const formattedDate = formatDate(combinedDateTime);
    const timezone = getEventTimezone();
    
    return `${formattedDate} (${timezone})`;
  };

  // Format purchase date
  const formatPurchaseDateTime = (timestamp: string) => {
    return formatDate(timestamp);
  };

  // Fetch all event data
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

      // ===== Fetch event – explicitly select columns (avoid missing column errors) =====
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          date,
          time,
          location,
          venue,
          image,
          lat,
          lng,
          organizer_id,
          created_at,
          updated_at,
          status,
          slug
          // fee_strategy – add this later after column exists
        `)
        .eq("id", id)
        .eq("organizer_id", session.user.id)
        .single();

      if (eventError) throw eventError;
      if (!eventData) {
        navigate("/organizer/my-events");
        return;
      }

      // ===== Try to fetch fee_strategy separately (gracefully handle missing column) =====
      let feeStrategy = 'pass_to_attendees';
      try {
        const { data: feeData } = await supabase
          .from("events")
          .select("fee_strategy")
          .eq("id", id)
          .maybeSingle();
        if (feeData?.fee_strategy) feeStrategy = feeData.fee_strategy;
      } catch (feeErr) {
        console.warn("⚠️ fee_strategy column not available, using default");
      }

      // ===== Fetch guest artists =====
      const { data: artistesData, error: artistesError } = await supabase
        .from("guest_artistes")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: true });

      if (!artistesError && artistesData) {
        setGuestArtistes(artistesData);
      }

      // ===== Fetch purchases (include fee columns if they exist) =====
      let purchasesData: any[] = [];
      let totalSold = 0;
      let totalRevenue = 0;
      let totalServiceFee = 0;
      let totalVatFee = 0;
      let totalProcessingFee = 0;

      try {
        // Try to select new fee columns – if they don't exist, fallback to basic select
        const { data: purchases, error: purchasesError } = await supabase
          .from("purchases")
          .select(`
            id, 
            quantity, 
            price, 
            purchased_at, 
            full_name, 
            email, 
            tier_name, 
            reference, 
            qr_code_url,
            service_fee,
            vat_fee,
            processing_fee,
            fee_strategy
          `)
          .eq("event_id", id)
          .order("purchased_at", { ascending: false });

        if (!purchasesError && purchases) {
          purchasesData = purchases;
          setPurchases(purchasesData);
          
          purchasesData.forEach((purchase: any) => {
            const quantity = parseInt(purchase.quantity) || 0;
            const price = parseFloat(purchase.price) || 0;
            totalSold += quantity;
            totalRevenue += price * quantity;
            totalServiceFee += parseFloat(purchase.service_fee) || 0;
            totalVatFee += parseFloat(purchase.vat_fee) || 0;
            totalProcessingFee += parseFloat(purchase.processing_fee) || 0;
          });
        }
      } catch (purchaseErr) {
        // Fallback: select without fee columns
        console.warn("⚠️ Fee columns missing in purchases, using basic query");
        const { data: purchases, error: purchasesError } = await supabase
          .from("purchases")
          .select("id, quantity, price, purchased_at, full_name, email, tier_name, reference, qr_code_url")
          .eq("event_id", id)
          .order("purchased_at", { ascending: false });

        if (!purchasesError && purchases) {
          purchasesData = purchases;
          setPurchases(purchasesData);
          
          purchasesData.forEach((purchase: any) => {
            const quantity = parseInt(purchase.quantity) || 0;
            const price = parseFloat(purchase.price) || 0;
            totalSold += quantity;
            totalRevenue += price * quantity;
          });
        }
      }

      // ===== Fetch ticket tiers =====
      let ticketTiers: TicketTier[] = [];
      try {
        const { data: tiersData, error: tiersError } = await supabase
          .from("ticketTiers")
          .select("id, tier_name, price, quantity_sold, quantity_total, is_active, created_at")
          .eq("event_id", id);

        if (!tiersError && tiersData) {
          ticketTiers = tiersData;
          
          // If no purchases, get sold counts from tiers
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
        console.error("Could not fetch ticket tiers:", err);
      }

      // ===== Calculate average ticket price =====
      const avgTicketPrice = totalSold > 0 ? totalRevenue / totalSold : 0;

      // ===== Enrich event object =====
      const enrichedEvent: Event = {
        ...eventData,
        fee_strategy: feeStrategy,
        ticketTiers,
        purchases: purchasesData,
        total_tickets_sold: totalSold,
        total_revenue: totalRevenue,
        total_service_fee: totalServiceFee,
        total_vat_fee: totalVatFee,
        total_processing_fee: totalProcessingFee,
        total_purchases: purchasesData.length,
        avg_ticket_price: avgTicketPrice,
      };

      setEvent(enrichedEvent);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Failed to load event data");
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
    return `px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border ${
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

  // Share event function
  const shareEvent = async () => {
    if (!event) return;
    
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} on SahmTicketHub`,
      url: `${window.location.origin}/event/${event.slug || event.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url);
      toast.success("Link copied to clipboard!");
    }
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
  const eventTimezone = getEventTimezone();

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

      {/* Sidebar for Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-950 border-r border-white/10">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => navigate("/organizer/my-events")}
                  className="p-2 rounded-lg hover:bg-white/10 transition text-white"
                  aria-label="Back to events"
                >
                  <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">{event.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                    <span className={getStatusBadge(event.status)}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                    <span className="text-gray-400 text-xs sm:text-sm">
                      Created: {formatDateOnly(event.created_at)}
                    </span>
                    <div className="text-gray-400 text-xs sm:text-sm flex items-center gap-1">
                      <Clock size={12} className="sm:w-4 sm:h-4" /> {eventTimezone}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 lg:mt-0">
                <button
                  onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition text-sm sm:text-base"
                  aria-label="Edit event"
                >
                  <Edit size={16} className="sm:w-5 sm:h-5" /> Edit Event
                </button>
                <button
                  onClick={() => navigate(`/event/${event.slug || event.id}`)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition text-sm sm:text-base"
                  aria-label="View public page"
                >
                  <Eye size={16} className="sm:w-5 sm:h-5" /> View Public Page
                </button>
              </div>
            </div>

            {/* Event Banner */}
            <div className="relative h-48 sm:h-56 md:h-64 lg:h-80 rounded-xl sm:rounded-2xl overflow-hidden mb-6 sm:mb-8">
              <img 
                src={event.image || event.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"} 
                alt={event.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 text-white">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <Calendar size={16} className="sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-lg">{formatEventDateTime(event.date, event.time)}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <MapPin size={16} className="sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-lg">{event.venue}</span>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Tickets Sold</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                      {event.total_tickets_sold.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Ticket className="text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                      {formatCurrency(event.total_revenue)}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <DollarSign className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Total Purchases</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                      {purchaseCount.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 sm:mt-2">
                      Transactions
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Users className="text-purple-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Avg. Ticket Price</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                      {formatCurrency(averageTicketPrice)}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-pink-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-white/10 mb-6 sm:mb-8">
              <button
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition text-sm sm:text-base ${activeTab === "overview" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition text-sm sm:text-base ${activeTab === "tickets" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("tickets")}
              >
                Ticket Tiers
              </button>
              <button
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition text-sm sm:text-base ${activeTab === "guests" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("guests")}
              >
                Guest Artistes ({guestArtistes.length})
              </button>
              <button
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition text-sm sm:text-base ${activeTab === "purchases" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("purchases")}
              >
                Purchases ({purchaseCount})
              </button>
              <button
                className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition text-sm sm:text-base ${activeTab === "analytics" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}
                onClick={() => setActiveTab("analytics")}
              >
                Analytics
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                  {/* Event Details */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Event Details</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="text-gray-400 mt-1 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                        <div>
                          <p className="text-gray-400 text-xs sm:text-sm">Date & Time</p>
                          <p className="text-white text-sm sm:text-base">{formatEventDateTime(event.date, event.time)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="text-gray-400 mt-1 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                        <div>
                          <p className="text-gray-400 text-xs sm:text-sm">Venue</p>
                          <p className="text-white text-sm sm:text-base">{event.venue}</p>
                          {event.location && (
                            <p className="text-gray-400 text-xs sm:text-sm mt-1">{event.location}</p>
                          )}
                          {(event.city || event.state || event.country) && (
                            <p className="text-gray-400 text-xs sm:text-sm">
                              {[event.city, event.state, event.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      {event.virtual_link && (
                        <div className="flex items-start gap-3">
                          <Globe className="text-gray-400 mt-1 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                          <div>
                            <p className="text-gray-400 text-xs sm:text-sm">Virtual Link</p>
                            <a href={event.virtual_link} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
                              {event.virtual_link}
                            </a>
                          </div>
                        </div>
                      )}
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Tag className="text-gray-400 mt-1 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                          <div>
                            <p className="text-gray-400 text-xs sm:text-sm">Tags</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                              {event.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs sm:text-sm">
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
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Description</h3>
                      <p className="text-gray-300 text-sm sm:text-base whitespace-pre-line">{event.description}</p>
                    </div>
                  )}

                  {/* Contact Information */}
                  {(event.contact_email || event.contact_phone) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Contact Information</h3>
                      <div className="space-y-4">
                        {event.contact_email && (
                          <div className="flex items-center gap-3">
                            <Mail className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <a href={`mailto:${event.contact_email}`} className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
                              {event.contact_email}
                            </a>
                          </div>
                        )}
                        {event.contact_phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <a href={`tel:${event.contact_phone}`} className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
                              {event.contact_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6 sm:space-y-8">
                  {/* Quick Stats */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Quick Stats</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">Ticket Tiers</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">{ticketTiers.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">Remaining Capacity</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          {ticketTiers.reduce((sum, tier) => sum + (tier.quantity_total - tier.quantity_sold), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">Sales Rate</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          {ticketTiers.reduce((sum, tier) => sum + tier.quantity_total, 0) > 0 
                            ? `${Math.round((event.total_tickets_sold / ticketTiers.reduce((sum, tier) => sum + tier.quantity_total, 0)) * 100)}%`
                            : "0%"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Features */}
                  {(event.featured || event.trending || event.isnew || event.sponsored) && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Event Features</h3>
                      <div className="space-y-3">
                        {event.featured && (
                          <div className="flex items-center gap-3">
                            <CheckCircle className="text-green-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="text-white text-sm sm:text-base">Featured Event</span>
                          </div>
                        )}
                        {event.trending && (
                          <div className="flex items-center gap-3">
                            <TrendingUp className="text-blue-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="text-white text-sm sm:text-base">Trending</span>
                          </div>
                        )}
                        {event.isnew && (
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <span className="text-xs font-bold">NEW</span>
                            </div>
                            <span className="text-white text-sm sm:text-base">New Event</span>
                          </div>
                        )}
                        {event.sponsored && (
                          <div className="flex items-center gap-3">
                            <DollarSign className="text-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="text-white text-sm sm:text-base">Sponsored</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "tickets" && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/10">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Ticket Tiers</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Tier Name</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Price</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Quantity</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Sold</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Remaining</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Revenue</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Status</th>
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
                              <td className="p-4 sm:p-6">
                                <div>
                                  <p className="text-white font-medium text-sm sm:text-base">{tier.tier_name}</p>
                                  {tier.description && (
                                    <p className="text-gray-400 text-xs sm:text-sm mt-1">{tier.description}</p>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 sm:p-6">
                                <p className="text-white font-medium text-sm sm:text-base">{formatCurrency(tier.price)}</p>
                              </td>
                              <td className="p-4 sm:p-6">
                                <p className="text-white text-sm sm:text-base">{tier.quantity_total.toLocaleString()}</p>
                              </td>
                              <td className="p-4 sm:p-6">
                                <div>
                                  <p className="text-white text-sm sm:text-base">{tier.quantity_sold.toLocaleString()}</p>
                                  <div className="w-24 sm:w-32 h-2 bg-gray-700 rounded-full mt-1 sm:mt-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full" 
                                      style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-gray-400 text-xs mt-0.5 sm:mt-1">{Math.round(soldPercentage)}% sold</p>
                                </div>
                              </td>
                              <td className="p-4 sm:p-6">
                                <p className={`font-medium text-sm sm:text-base ${remaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                                  {remaining.toLocaleString()}
                                </p>
                              </td>
                              <td className="p-4 sm:p-6">
                                <p className="text-green-400 font-medium text-sm sm:text-base">{formatCurrency(revenue)}</p>
                              </td>
                              <td className="p-4 sm:p-6">
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
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
                          <td colSpan={7} className="p-6 text-center text-gray-400 text-sm sm:text-base">
                            No ticket tiers found for this event
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {ticketTiers.length > 0 && (
                  <div className="p-4 sm:p-6 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">Total from all tiers</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(event.total_revenue)}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition text-sm sm:text-base"
                      >
                        Edit Ticket Tiers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "guests" && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/10">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Guest Artistes ({guestArtistes.length})</h3>
                </div>
                
                {guestArtistes.length > 0 ? (
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {guestArtistes.map((artiste) => (
                        <div 
                          key={artiste.id} 
                          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer"
                          onClick={() => setSelectedGuest(artiste)}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                              {artiste.image_url ? (
                                <img 
                                  src={artiste.image_url} 
                                  alt={artiste.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
                                  <Music className="text-purple-400 w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-white font-medium text-sm sm:text-base truncate">{artiste.name}</h4>
                                  <p className="text-purple-400 text-xs sm:text-sm mt-0.5">{artiste.role}</p>
                                </div>
                              </div>
                              {artiste.bio && (
                                <p className="text-gray-400 text-xs sm:text-sm mt-2 line-clamp-2">{artiste.bio}</p>
                              )}
                              
                              {/* Social Media Icons */}
                              {artiste.social_media && (
                                <div className="flex gap-2 mt-3">
                                  {artiste.social_media.instagram && (
                                    <a 
                                      href={artiste.social_media.instagram} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-gray-400 hover:text-pink-400 transition"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Instagram size={14} className="sm:w-4 sm:h-4" />
                                    </a>
                                  )}
                                  {artiste.social_media.twitter && (
                                    <a 
                                      href={artiste.social_media.twitter} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-gray-400 hover:text-blue-400 transition"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Twitter size={14} className="sm:w-4 sm:h-4" />
                                    </a>
                                  )}
                                  {artiste.social_media.youtube && (
                                    <a 
                                      href={artiste.social_media.youtube} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-gray-400 hover:text-red-400 transition"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Youtube size={14} className="sm:w-4 sm:h-4" />
                                    </a>
                                  )}
                                  {artiste.social_media.spotify && (
                                    <a 
                                      href={artiste.social_media.spotify} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-gray-400 hover:text-green-400 transition"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Headphones size={14} className="sm:w-4 sm:h-4" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <Music className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                    <p className="text-sm sm:text-base">No guest artistes added to this event</p>
                    <button
                      onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm"
                    >
                      Add Guest Artistes
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Purchases ({purchaseCount})</h3>
                  <div className="flex gap-2 sm:gap-3">
                    <button 
                      onClick={shareEvent}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition text-xs sm:text-sm"
                    >
                      <Share2 size={14} className="sm:w-4 sm:h-4" /> Share
                    </button>
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition text-xs sm:text-sm">
                      <Download size={14} className="sm:w-4 sm:h-4" /> Export
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Name</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Email</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Ticket</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Qty</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Price</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Total</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">Date</th>
                        <th className="text-left p-4 sm:p-6 text-gray-400 font-medium text-xs sm:text-sm">QR Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.length > 0 ? (
                        purchases.map((purchase) => (
                          <tr key={purchase.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-4 sm:p-6">
                              <p className="text-white font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{purchase.full_name}</p>
                            </td>
                            <td className="p-4 sm:p-6">
                              <p className="text-white text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{purchase.email}</p>
                            </td>
                            <td className="p-4 sm:p-6">
                              <p className="text-white text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{purchase.tier_name}</p>
                            </td>
                            <td className="p-4 sm:p-6">
                              <p className="text-white text-xs sm:text-sm">{purchase.quantity}</p>
                            </td>
                            <td className="p-4 sm:p-6">
                              <p className="text-white text-xs sm:text-sm">{formatCurrency(purchase.price)}</p>
                            </td>
                            <td className="p-4 sm:p-6">
                              <p className="text-green-400 font-medium text-xs sm:text-sm">{formatCurrency(purchase.price * purchase.quantity)}</p>
                            </td>
                            <td className="p-4 sm:p-6">
                              <p className="text-gray-400 text-xs sm:text-sm">
                                {formatPurchaseDateTime(purchase.purchased_at)}
                              </p>
                            </td>
                            <td className="p-4 sm:p-6">
                              {purchase.qr_code_url ? (
                                <button
                                  onClick={() => setSelectedPurchase(purchase)}
                                  className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                                >
                                  <QrCode size={16} className="sm:w-5 sm:h-5 text-white" />
                                </button>
                              ) : (
                                <span className="text-gray-500 text-xs sm:text-sm">No QR</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-400 text-sm sm:text-base">
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
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Analytics Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Sales Performance</p>
                      <p className="text-white text-2xl font-bold mt-1">{formatCurrency(event.total_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Conversion Rate</p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {ticketTiers.reduce((sum, tier) => sum + tier.quantity_total, 0) > 0 
                          ? `${Math.round((event.total_tickets_sold / ticketTiers.reduce((sum, tier) => sum + tier.quantity_total, 0)) * 100)}%`
                          : "0%"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Average Order Value</p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {purchaseCount > 0 ? formatCurrency(event.total_revenue / purchaseCount) : formatCurrency(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Tickets per Order</p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {purchaseCount > 0 ? (event.total_tickets_sold / purchaseCount).toFixed(1) : "0"}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mt-6">
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
          <div className="bg-gray-800 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">Ticket QR Code</h3>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="text-center">
              <div className="bg-white p-3 sm:p-4 rounded-xl inline-block mb-4 sm:mb-6">
                {selectedPurchase.qr_code_url ? (
                  <img 
                    src={selectedPurchase.qr_code_url} 
                    alt="QR Code" 
                    className="w-48 h-48 sm:w-64 sm:h-64"
                  />
                ) : (
                  <QRCode 
                    value={`https://sahmtickethub.online/${selectedPurchase.reference}`}
                    size={192}
                    level="H"
                    className="w-48 h-48 sm:w-64 sm:h-64"
                  />
                )}
              </div>
              
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Attendee</p>
                  <p className="text-white font-medium text-sm sm:text-base">{selectedPurchase.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Ticket Tier</p>
                  <p className="text-white text-sm sm:text-base">{selectedPurchase.tier_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Purchase Date</p>
                  <p className="text-white text-sm sm:text-base">{formatPurchaseDateTime(selectedPurchase.purchased_at)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Reference</p>
                  <p className="text-white font-mono text-xs sm:text-sm">{selectedPurchase.reference}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 sm:py-3 rounded-xl font-medium transition text-sm sm:text-base"
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
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 sm:py-3 rounded-xl font-medium transition text-sm sm:text-base"
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Artiste Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">Guest Artiste</h3>
              <button
                onClick={() => setSelectedGuest(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="text-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full overflow-hidden bg-gray-700 mb-4 sm:mb-6">
                {selectedGuest.image_url ? (
                  <img 
                    src={selectedGuest.image_url} 
                    alt={selectedGuest.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
                    <Music className="text-purple-400 w-16 h-16" />
                  </div>
                )}
              </div>
              
              <h4 className="text-white text-xl sm:text-2xl font-bold mb-1 sm:mb-2">{selectedGuest.name}</h4>
              <p className="text-purple-400 text-sm sm:text-base mb-3 sm:mb-4">{selectedGuest.role}</p>
              
              {selectedGuest.bio && (
                <p className="text-gray-300 text-sm sm:text-base mb-6">{selectedGuest.bio}</p>
              )}
              
              {/* Social Media Links */}
              {selectedGuest.social_media && (
                <div className="flex justify-center gap-4 mb-6">
                  {selectedGuest.social_media.instagram && (
                    <a 
                      href={selectedGuest.social_media.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-pink-400 transition"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {selectedGuest.social_media.twitter && (
                    <a 
                      href={selectedGuest.social_media.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-400 transition"
                    >
                      <Twitter size={20} />
                    </a>
                  )}
                  {selectedGuest.social_media.youtube && (
                    <a 
                      href={selectedGuest.social_media.youtube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-red-400 transition"
                    >
                      <Youtube size={20} />
                    </a>
                  )}
                  {selectedGuest.social_media.spotify && (
                    <a 
                      href={selectedGuest.social_media.spotify} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-green-400 transition"
                    >
                      <Headphones size={20} />
                    </a>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setSelectedGuest(null)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 sm:py-3 rounded-xl font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}