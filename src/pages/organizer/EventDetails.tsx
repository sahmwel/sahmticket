// src/pages/organizer/EventDetails.tsx - UPDATED WITH FEE BREAKDOWN AND ENHANCED GUEST DETAILS ✅
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
  Download,
  Eye,
  XCircle,
  TrendingUp,
  Menu,
  QrCode,
  Mail,
  Phone,
  Globe,
  Tag,
  Music,
  Instagram,
  Twitter,
  Youtube,
  Headphones,
  Receipt,
  Percent,
  CreditCard,
  Star
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
}

interface Purchase {
  id: string;
  full_name: string;
  email: string;
  quantity: number;
  price: number;
  tier_name: string;
  reference: string;
  purchased_at: string;
  qr_code_url: string | null;
  service_fee?: number;
  vat_fee?: number;
  processing_fee?: number;
  fee_strategy?: string;
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
  status: "draft" | "published" | "cancelled" | "completed";
  created_at: string;
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
  fee_strategy?: "pass_to_attendees" | "absorb_fees";
  ticketTiers: TicketTier[];
  purchases: Purchase[];
  total_tickets_sold: number;
  total_revenue: number;
  total_purchases: number;
  avg_ticket_price: number;
  total_service_fee: number;
  total_vat_fee: number;
  total_processing_fee: number;
}

// Helper to extract username from social URL
const extractUsername = (url: string, platform: string): string => {
  try {
    if (platform === 'instagram') {
      const match = url.match(/instagram\.com\/([^/?]+)/);
      return match ? `@${match[1]}` : url;
    }
    if (platform === 'twitter') {
      const match = url.match(/twitter\.com\/([^/?]+)/);
      return match ? `@${match[1]}` : url;
    }
    if (platform === 'youtube') {
      const match = url.match(/youtube\.com\/(?:c|channel|user)\/([^/?]+)/);
      return match ? match[1] : url;
    }
    if (platform === 'spotify') {
      const match = url.match(/spotify\.com\/artist\/([^/?]+)/);
      return match ? match[1] : url;
    }
    return url;
  } catch {
    return url;
  }
};

export default function OrganizerEventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [guestArtistes, setGuestArtistes] = useState<GuestArtiste[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<GuestArtiste | null>(null);
  const [hoveredGuestId, setHoveredGuestId] = useState<string | null>(null);

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

  const getEventTimezone = () => {
    if (event?.timezone) return event.timezone;
    if (event?.country) return TIMEZONES[event.country] || 'WAT (UTC+1)';
    return 'WAT (UTC+1)';
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "Date not set";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
      if (Math.abs(diffDays) < 7) return `${dayName}, ${monthName} ${day} at ${formattedTime}`;
      return `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''} at ${formattedTime}`;
    } catch { return "Invalid date"; }
  };

  const formatDateOnly = (timestamp: string | null) => {
    if (!timestamp) return "No date";
    try {
      return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return "Invalid date"; }
  };

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

  const formatEventDateTime = () => {
    if (!event) return "Date not set";
    const combined = combineDateTime(event.date, event.time);
    const formatted = formatDate(combined);
    return `${formatted} (${getEventTimezone()})`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }

        // 1. Fetch event (including fee_strategy)
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();
        if (eventError) throw eventError;
        if (!eventData) { navigate("/organizer/my-events"); return; }

        // 2. Fetch ticket tiers
        const { data: tiersData, error: tiersError } = await supabase
          .from("ticketTiers")
          .select("*")
          .eq("event_id", id);
        if (tiersError) console.error("Tiers error:", tiersError);
        const ticketTiers = tiersData || [];

        // 3. Fetch guest artistes
        const { data: artistesData, error: artistsError } = await supabase
          .from("guest_artistes")
          .select("*")
          .eq("event_id", id)
          .order("created_at", { ascending: true });
        if (!artistsError && artistesData) setGuestArtistes(artistesData);

        // 4. Fetch purchases with fee columns (try first, fallback)
        let purchasesData: any[] = [];
        let totalSold = 0, totalRevenue = 0, totalService = 0, totalVat = 0, totalProcessing = 0;
        try {
          const { data: purchases, error: purchasesError } = await supabase
            .from("purchases")
            .select("id, full_name, email, quantity, price, tier_name, reference, purchased_at, qr_code_url, service_fee, vat_fee, processing_fee, fee_strategy")
            .eq("event_id", id)
            .order("purchased_at", { ascending: false });
          if (!purchasesError && purchases) {
            purchasesData = purchases;
            purchases.forEach((p: any) => {
              const qty = parseInt(p.quantity) || 1;
              const amt = parseFloat(p.price) || 0;
              totalSold += qty;
              totalRevenue += amt * qty;
              totalService += parseFloat(p.service_fee) || 0;
              totalVat += parseFloat(p.vat_fee) || 0;
              totalProcessing += parseFloat(p.processing_fee) || 0;
            });
          } else {
            // Fallback: fetch without fee columns
            const { data: fallback, error: fallbackError } = await supabase
              .from("purchases")
              .select("id, full_name, email, quantity, price, tier_name, reference, purchased_at, qr_code_url")
              .eq("event_id", id)
              .order("purchased_at", { ascending: false });
            if (!fallbackError && fallback) {
              purchasesData = fallback;
              fallback.forEach((p: any) => {
                const qty = parseInt(p.quantity) || 1;
                const amt = parseFloat(p.price) || 0;
                totalSold += qty;
                totalRevenue += amt * qty;
              });
            }
          }
        } catch (err) { console.warn("Purchase fetch error:", err); }

        // If no purchases, get sold counts from ticketTiers
        if (totalSold === 0 && ticketTiers.length) {
          ticketTiers.forEach((tier: any) => {
            const sold = tier.quantity_sold || 0;
            const price = tier.price || 0;
            totalSold += sold;
            totalRevenue += price * sold;
          });
        }

        const avgPrice = totalSold > 0 ? totalRevenue / totalSold : 0;
        const enrichedEvent: Event = {
          ...eventData,
          fee_strategy: eventData.fee_strategy || "pass_to_attendees",
          ticketTiers,
          purchases: purchasesData,
          total_tickets_sold: totalSold,
          total_revenue: totalRevenue,
          total_purchases: purchasesData.length,
          avg_ticket_price: avgPrice,
          total_service_fee: totalService,
          total_vat_fee: totalVat,
          total_processing_fee: totalProcessing
        };
        setEvent(enrichedEvent);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load event data");
        navigate("/organizer/my-events");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-500/20 text-green-300 border-green-500/50",
      draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
      cancelled: "bg-red-500/20 text-red-300 border-red-500/50",
      completed: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    };
    return `px-3 py-1.5 rounded-full text-xs font-semibold border ${styles[status] || "bg-gray-500/20 text-gray-300"}`;
  };

  const shareEvent = async () => {
    if (!event) return;
    const url = `${window.location.origin}/event/${event.slug || event.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: `Check out ${event.title}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="text-center"><h2 className="text-2xl font-bold text-white">Event not found</h2><button onClick={()=>navigate("/organizer/my-events")} className="mt-4 bg-purple-600 px-6 py-3 rounded-xl">Go back</button></div>
      </div>
    );
  }

  const { ticketTiers, purchases } = event;
  const hasSales = event.total_tickets_sold > 0;
  const totalCapacity = ticketTiers.reduce((sum, t) => sum + t.quantity_total, 0);
  const soldPercentage = totalCapacity > 0 ? (event.total_tickets_sold / totalCapacity) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/80 rounded-lg border border-white/10">
        <Menu size={24} className="text-white" />
      </button>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-950 border-r border-white/10"><Sidebar role="organizer" /></div>
        </div>
      )}
      <div className="hidden lg:block"><Sidebar role="organizer" /></div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate("/organizer/my-events")} className="p-2 rounded-lg hover:bg-white/10"><ArrowLeft size={20} /></button>
                <div>
                  <h1 className="text-2xl lg:text-4xl font-bold text-white">{event.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className={getStatusBadge(event.status)}>{event.status.toUpperCase()}</span>
                    <span className="text-gray-400 text-sm">Created: {formatDateOnly(event.created_at)}</span>
                    <span className="text-gray-400 text-sm flex items-center gap-1"><Clock size={12} /> {getEventTimezone()}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => navigate(`/organizer/event/${event.id}/edit`)} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 rounded-xl text-white hover:bg-purple-700"><Edit size={16} /> Edit</button>
                <button onClick={() => navigate(`/event/${event.slug || event.id}`)} className="flex items-center gap-2 px-6 py-2.5 border border-white/20 rounded-xl text-white hover:bg-white/10"><Eye size={16} /> View</button>
              </div>
            </div>

            {/* Banner */}
            <div className="relative h-48 sm:h-64 lg:h-80 rounded-2xl overflow-hidden mb-8">
              <img src={event.image || event.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-6 text-white">
                <div className="flex items-center gap-2 mb-1"><Calendar size={16} /><span>{formatEventDateTime()}</span></div>
                <div className="flex items-center gap-2"><MapPin size={16} /><span>{event.venue}</span></div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">Tickets Sold</p><p className="text-2xl font-bold text-white">{event.total_tickets_sold.toLocaleString()}</p></div><div className="bg-green-500/20 p-2 rounded-lg"><Ticket className="text-green-400 w-5 h-5" /></div></div></div>
              <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">Total Revenue</p><p className="text-2xl font-bold text-white">{formatCurrency(event.total_revenue)}</p></div><div className="bg-blue-500/20 p-2 rounded-lg"><DollarSign className="text-blue-400 w-5 h-5" /></div></div></div>
              <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">Purchases</p><p className="text-2xl font-bold text-white">{event.total_purchases}</p></div><div className="bg-purple-500/20 p-2 rounded-lg"><Users className="text-purple-400 w-5 h-5" /></div></div></div>
              <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">Avg. Ticket</p><p className="text-2xl font-bold text-white">{formatCurrency(event.avg_ticket_price)}</p></div><div className="bg-pink-500/20 p-2 rounded-lg"><TrendingUp className="text-pink-400 w-5 h-5" /></div></div></div>
            </div>

            {/* Fee breakdown row (only if fees exist) */}
            {(event.total_service_fee > 0 || event.total_vat_fee > 0 || event.total_processing_fee > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">Service Fees</p><p className="text-xl font-bold text-white">{formatCurrency(event.total_service_fee)}</p></div><div className="bg-amber-500/20 p-2 rounded-lg"><Percent className="text-amber-400 w-5 h-5" /></div></div></div>
                <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">VAT</p><p className="text-xl font-bold text-white">{formatCurrency(event.total_vat_fee)}</p></div><div className="bg-blue-500/20 p-2 rounded-lg"><Receipt className="text-blue-400 w-5 h-5" /></div></div></div>
                <div className="bg-white/5 rounded-xl p-4"><div className="flex justify-between"><div><p className="text-gray-400 text-sm">Processing Fees</p><p className="text-xl font-bold text-white">{formatCurrency(event.total_processing_fee)}</p></div><div className="bg-purple-500/20 p-2 rounded-lg"><CreditCard className="text-purple-400 w-5 h-5" /></div></div><p className="text-gray-400 text-xs mt-2">Strategy: {event.fee_strategy?.replace(/_/g, ' ') || 'pass to attendees'}</p></div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-white/10 mb-6">
              {["overview","tickets","guests","purchases","analytics"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium transition ${activeTab === tab ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === "guests" && `(${guestArtistes.length})`}{tab === "purchases" && `(${purchases.length})`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/5 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-4">Event Details</h3><div className="space-y-4">
                    <div className="flex gap-3"><Calendar className="text-gray-400 w-5 h-5"/><div><p className="text-gray-400 text-sm">Date & Time</p><p className="text-white">{formatEventDateTime()}</p></div></div>
                    <div className="flex gap-3"><MapPin className="text-gray-400 w-5 h-5"/><div><p className="text-gray-400 text-sm">Venue</p><p className="text-white">{event.venue}</p>{event.location && <p className="text-gray-400 text-sm">{event.location}</p>}{(event.city || event.state || event.country) && <p className="text-gray-400 text-sm">{`${event.city || ''} ${event.state || ''} ${event.country || ''}`.trim()}</p>}</div></div>
                    {event.virtual_link && <div className="flex gap-3"><Globe className="text-gray-400 w-5 h-5"/><div><p className="text-gray-400 text-sm">Virtual Link</p><a href={event.virtual_link} target="_blank" className="text-purple-400">{event.virtual_link}</a></div></div>}
                    {event.tags && event.tags.length > 0 && <div className="flex gap-3"><Tag className="text-gray-400 w-5 h-5"/><div><p className="text-gray-400 text-sm">Tags</p><div className="flex flex-wrap gap-2">{event.tags.map(tag => <span key={tag} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">{tag}</span>)}</div></div></div>}
                  </div></div>
                  {event.description && <div className="bg-white/5 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-4">Description</h3><p className="text-gray-300 whitespace-pre-line">{event.description}</p></div>}
                  {(event.contact_email || event.contact_phone) && <div className="bg-white/5 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-4">Contact</h3><div className="space-y-3">{event.contact_email && <div className="flex gap-3"><Mail className="text-gray-400"/><a href={`mailto:${event.contact_email}`} className="text-purple-400">{event.contact_email}</a></div>}{event.contact_phone && <div className="flex gap-3"><Phone className="text-gray-400"/><a href={`tel:${event.contact_phone}`} className="text-purple-400">{event.contact_phone}</a></div>}</div></div>}
                </div>
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3><div className="space-y-4"><div><p className="text-gray-400 text-sm">Ticket Tiers</p><p className="text-2xl font-bold text-white">{ticketTiers.length}</p></div><div><p className="text-gray-400 text-sm">Remaining Capacity</p><p className="text-2xl font-bold text-white">{(totalCapacity - event.total_tickets_sold).toLocaleString()}</p></div><div><p className="text-gray-400 text-sm">Sales Rate</p><p className="text-2xl font-bold text-white">{Math.round(soldPercentage)}%</p></div></div></div>
                  {(event.featured || event.trending || event.isnew || event.sponsored) && <div className="bg-white/5 rounded-xl p-6"><h3 className="text-xl font-bold text-white mb-4">Features</h3><div className="space-y-3">{event.featured && <div className="flex gap-2"><CheckIcon className="text-green-400"/><span>Featured</span></div>}{event.trending && <div className="flex gap-2"><TrendingUp className="text-blue-400"/><span>Trending</span></div>}{event.isnew && <div className="flex gap-2"><Star className="text-purple-400"/><span>New</span></div>}{event.sponsored && <div className="flex gap-2"><DollarSign className="text-yellow-400"/><span>Sponsored</span></div>}</div></div>}
                </div>
              </div>
            )}

            {activeTab === "tickets" && (
              <div className="bg-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10"><h3 className="text-xl font-bold text-white">Ticket Tiers</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-white/10"><th className="text-left p-4 text-gray-400">Tier</th><th className="text-left p-4 text-gray-400">Price</th><th className="text-left p-4 text-gray-400">Total</th><th className="text-left p-4 text-gray-400">Sold</th><th className="text-left p-4 text-gray-400">Remaining</th><th className="text-left p-4 text-gray-400">Revenue</th><th className="text-left p-4 text-gray-400">Status</th></tr></thead>
                    <tbody>
                      {ticketTiers.map(tier => {
                        const remaining = tier.quantity_total - tier.quantity_sold;
                        const revenue = tier.price * tier.quantity_sold;
                        const percent = tier.quantity_total ? (tier.quantity_sold / tier.quantity_total) * 100 : 0;
                        return (
                          <tr key={tier.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-4"><p className="text-white font-medium">{tier.tier_name}</p>{tier.description && <p className="text-gray-400 text-xs">{tier.description}</p>}</td>
                            <td className="p-4">{formatCurrency(tier.price)}</td>
                            <td className="p-4">{tier.quantity_total.toLocaleString()}</td>
                            <td className="p-4"><div>{tier.quantity_sold.toLocaleString()}</div><div className="w-24 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(percent,100)}%` }} /></div></td>
                            <td className="p-4"><span className={remaining <= 10 ? "text-red-400" : "text-white"}>{remaining.toLocaleString()}</span></td>
                            <td className="p-4 text-green-400">{formatCurrency(revenue)}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${tier.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>{tier.is_active ? "Active" : "Inactive"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "guests" && (
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Guest Artistes ({guestArtistes.length})</h3>
                {guestArtistes.length === 0 ? (
                  <div className="text-center py-12"><Music className="w-12 h-12 mx-auto text-gray-500 mb-3"/><p className="text-gray-400">No guest artistes added</p><button onClick={()=>navigate(`/organizer/event/${event.id}/edit`)} className="mt-4 bg-purple-600 px-4 py-2 rounded-lg text-white">Add Artistes</button></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guestArtistes.map(artist => (
                      <div key={artist.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 cursor-pointer transition relative" onClick={()=>setSelectedGuest(artist)} onMouseEnter={()=>setHoveredGuestId(artist.id)} onMouseLeave={()=>setHoveredGuestId(null)}>
                        <div className="flex gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">{artist.image_url ? <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover"/> : <Music className="w-8 h-8 text-purple-400 m-auto mt-4"/>}</div>
                          <div><h4 className="text-white font-medium">{artist.name}</h4><p className="text-purple-400 text-sm">{artist.role}</p><div className="flex gap-2 mt-2">{artist.social_media?.instagram && <a href={artist.social_media.instagram} target="_blank" className="text-gray-400 hover:text-pink-400" onClick={e=>e.stopPropagation()}><Instagram size={14}/></a>}{artist.social_media?.twitter && <a href={artist.social_media.twitter} target="_blank" className="text-gray-400 hover:text-blue-400" onClick={e=>e.stopPropagation()}><Twitter size={14}/></a>}{artist.social_media?.youtube && <a href={artist.social_media.youtube} target="_blank" className="text-gray-400 hover:text-red-400" onClick={e=>e.stopPropagation()}><Youtube size={14}/></a>}{artist.social_media?.spotify && <a href={artist.social_media.spotify} target="_blank" className="text-gray-400 hover:text-green-400" onClick={e=>e.stopPropagation()}><Headphones size={14}/></a>}</div></div>
                        </div>
                        {hoveredGuestId === artist.id && artist.bio && <div className="absolute left-0 right-0 bottom-full mb-2 p-2 bg-gray-800 rounded-lg text-xs text-gray-300 shadow-lg">{artist.bio}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="bg-white/5 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center"><h3 className="text-xl font-bold text-white">Purchases ({purchases.length})</h3><button onClick={shareEvent} className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/10"><Share2 size={16}/> Share</button></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-white/10"><th className="text-left p-4 text-gray-400">Name</th><th className="text-left p-4 text-gray-400">Email</th><th className="text-left p-4 text-gray-400">Ticket</th><th className="text-left p-4 text-gray-400">Qty</th><th className="text-left p-4 text-gray-400">Price</th><th className="text-left p-4 text-gray-400">Total</th><th className="text-left p-4 text-gray-400">Date</th><th className="text-left p-4 text-gray-400">QR</th></tr></thead>
                    <tbody>
                      {purchases.map(p => (
                        <tr key={p.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-4">{p.full_name}</td>
                          <td className="p-4 text-sm">{p.email}</td>
                          <td className="p-4">{p.tier_name}</td>
                          <td className="p-4">{p.quantity}</td>
                          <td className="p-4">{formatCurrency(p.price)}</td>
                          <td className="p-4 text-green-400">{formatCurrency(p.price * p.quantity)}</td>
                          <td className="p-4 text-gray-400 text-sm">{formatDate(p.purchased_at)}</td>
                          <td className="p-4">{p.qr_code_url ? <button onClick={()=>setSelectedPurchase(p)} className="p-1.5 bg-white/10 rounded-lg"><QrCode size={16}/></button> : <span className="text-gray-500">No QR</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Analytics Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div><p className="text-gray-400">Sales Performance</p><p className="text-2xl font-bold text-white">{formatCurrency(event.total_revenue)}</p></div>
                  <div><p className="text-gray-400">Conversion Rate</p><p className="text-2xl font-bold text-white">{Math.round(soldPercentage)}%</p></div>
                  <div><p className="text-gray-400">Service Fees Collected</p><p className="text-2xl font-bold text-white">{formatCurrency(event.total_service_fee)}</p></div>
                  <div><p className="text-gray-400">Average Order Value</p><p className="text-2xl font-bold text-white">{event.total_purchases ? formatCurrency(event.total_revenue / event.total_purchases) : formatCurrency(0)}</p></div>
                  <div><p className="text-gray-400">Tickets per Order</p><p className="text-2xl font-bold text-white">{event.total_purchases ? (event.total_tickets_sold / event.total_purchases).toFixed(1) : "0"}</p></div>
                  <div><p className="text-gray-400">VAT + Processing</p><p className="text-2xl font-bold text-white">{formatCurrency(event.total_vat_fee + event.total_processing_fee)}</p></div>
                </div>
                <p className="text-gray-400 text-sm mt-6">Fee Strategy: <span className="text-purple-400 font-medium">{event.fee_strategy?.replace(/_/g, ' ') || 'pass to attendees'}</span></p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">Ticket QR Code</h3><button onClick={()=>setSelectedPurchase(null)}><XCircle className="text-gray-400 hover:text-white"/></button></div>
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl inline-block mb-4">{selectedPurchase.qr_code_url ? <img src={selectedPurchase.qr_code_url} alt="QR" className="w-48 h-48"/> : <QRCode value={`https://sahmtickethub.online/${selectedPurchase.reference}`} size={192}/>}</div>
              <div className="space-y-2 text-left"><div><p className="text-gray-400 text-sm">Attendee</p><p className="text-white">{selectedPurchase.full_name}</p></div><div><p className="text-gray-400 text-sm">Ticket</p><p className="text-white">{selectedPurchase.tier_name}</p></div><div><p className="text-gray-400 text-sm">Date</p><p className="text-white">{formatDate(selectedPurchase.purchased_at)}</p></div><div><p className="text-gray-400 text-sm">Reference</p><p className="text-white font-mono text-xs">{selectedPurchase.reference}</p></div>{selectedPurchase.service_fee !== undefined && <div><p className="text-gray-400 text-sm">Service Fee Paid</p><p className="text-white">{formatCurrency(selectedPurchase.service_fee)}</p></div>}</div>
              <div className="flex gap-3 mt-6"><button onClick={()=>setSelectedPurchase(null)} className="flex-1 bg-gray-700 py-2 rounded-xl">Close</button><button onClick={()=>{const a=document.createElement('a');a.href=selectedPurchase.qr_code_url||'';a.download=`ticket-${selectedPurchase.reference}.png`;a.click();}} className="flex-1 bg-purple-600 py-2 rounded-xl">Download</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">Guest Artiste</h3><button onClick={()=>setSelectedGuest(null)}><XCircle className="text-gray-400 hover:text-white"/></button></div>
            <div className="text-center"><div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-700 mb-4">{selectedGuest.image_url ? <img src={selectedGuest.image_url} alt={selectedGuest.name} className="w-full h-full object-cover"/> : <Music className="w-12 h-12 text-purple-400 m-auto mt-10"/>}</div><h4 className="text-white text-2xl font-bold mb-1">{selectedGuest.name}</h4><p className="text-purple-400 mb-4">{selectedGuest.role}</p>{selectedGuest.bio && <p className="text-gray-300 mb-6">{selectedGuest.bio}</p>}<div className="flex justify-center gap-4 mb-6">{selectedGuest.social_media?.instagram && <a href={selectedGuest.social_media.instagram} target="_blank" className="text-gray-400 hover:text-pink-400"><Instagram size={20}/></a>}{selectedGuest.social_media?.twitter && <a href={selectedGuest.social_media.twitter} target="_blank" className="text-gray-400 hover:text-blue-400"><Twitter size={20}/></a>}{selectedGuest.social_media?.youtube && <a href={selectedGuest.social_media.youtube} target="_blank" className="text-gray-400 hover:text-red-400"><Youtube size={20}/></a>}{selectedGuest.social_media?.spotify && <a href={selectedGuest.social_media.spotify} target="_blank" className="text-gray-400 hover:text-green-400"><Headphones size={20}/></a>}</div><button onClick={()=>setSelectedGuest(null)} className="w-full bg-purple-600 py-2 rounded-xl">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Missing CheckIcon component (since we used CheckIcon in Features)
const CheckIcon = ({ className }: { className?: string }) => <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;