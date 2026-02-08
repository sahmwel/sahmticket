// src/pages/organizer/Tickets.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Search, Download, Calendar, Ticket, DollarSign, Users, 
  Shield, CheckCircle, Copy, QrCode, Hash, User, Clock, MapPin, 
  BadgeCheck, AlertCircle, FileText, Filter, ChevronDown, Eye,
  X, RefreshCw, Tag, Menu
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

interface Ticket {
  id: string;
  ticket_type: string;
  price: number;
  purchased_at: string;
  event_title: string;
  buyer_email: string;
  buyer_name: string;
  qr_code_url: string | null;
  event_id: string;
  reference: string;
  order_id: string;
  status: string;
  ticket_number: string;
  verified_at: string | null;
  currency: string;
  quantity: number;
  event_date?: string;
  event_venue?: string;
  event_location?: string;
  tier_name?: string;
  tier_description?: string;
}

interface TicketStats {
  totalRevenue: number;
  ticketsSold: number;
  uniqueBuyers: number;
  verifiedTickets: number;
  pendingVerification: number;
  recent24h: number;
  freeTickets: number;
  paidTickets: number;
}

export default function OrganizerTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<TicketStats>({
    totalRevenue: 0,
    ticketsSold: 0,
    uniqueBuyers: 0,
    verifiedTickets: 0,
    pendingVerification: 0,
    recent24h: 0,
    freeTickets: 0,
    paidTickets: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [eventsList, setEventsList] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [verifyingTicket, setVerifyingTicket] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTickets();
  }, [navigate]);

  const loadTickets = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    try {
      setLoading(true);
      
      // Get organizer's events first
      const { data: organizerEvents, error: eventsError } = await supabase
        .from("events")
        .select("id, title")
        .eq("organizer_id", session.user.id);

      if (eventsError) throw eventsError;

      const eventIds = organizerEvents?.map((e: { id: string }) => e.id) || [];
      const eventTitles = organizerEvents?.map((e: { title: string }) => e.title) || [];
      setEventsList(eventTitles);

      if (eventIds.length === 0) {
        setTickets([]);
        setFilteredTickets([]);
        setLoading(false);
        return;
      }

      // Get tickets for organizer's events
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_type,
          price,
          purchased_at,
          qr_code_url,
          event_id,
          reference,
          order_id,
          email,
          full_name,
          quantity,
          tier_name,
          tier_description,
          verified_at,
          events (
            title,
            date,
            venue,
            location
          )
        `)
        .in("event_id", eventIds)
        .order("purchased_at", { ascending: false });

      if (error) throw error;

      const formatted: Ticket[] = (data || []).map((t: any) => {
        // Generate ticket number from ID and reference
        const ticketNum = t.reference 
          ? `T-${t.reference.substring(0, 8).toUpperCase()}`
          : `T-${t.id.substring(0, 8).toUpperCase()}`;
        
        // Determine status based on verified_at
        const status = t.verified_at ? "verified" : "pending";
        
        return {
          id: t.id,
          ticket_type: t.ticket_type || t.tier_name || "General Admission",
          price: t.price || 0,
          purchased_at: t.purchased_at,
          qr_code_url: t.qr_code_url,
          event_title: t.events?.title || "Unknown Event",
          buyer_email: t.email || "No email",
          buyer_name: t.full_name || "Anonymous",
          event_id: t.event_id,
          reference: t.reference || `REF-${t.id.substring(0, 8)}`,
          order_id: t.order_id || `ORD-${t.id.substring(0, 8)}`,
          status: status,
          ticket_number: ticketNum,
          verified_at: t.verified_at,
          currency: "NGN",
          quantity: t.quantity || 1,
          tier_name: t.tier_name,
          tier_description: t.tier_description,
          event_date: t.events?.date,
          event_venue: t.events?.venue,
          event_location: t.events?.location
        };
      });

      setTickets(formatted);
      setFilteredTickets(formatted);
      calculateStats(formatted);
    } catch (err: any) {
      console.error("Error loading tickets:", err);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tickets: Ticket[]) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newStats: TicketStats = {
      totalRevenue: tickets.reduce((sum, t) => sum + t.price, 0),
      ticketsSold: tickets.length,
      uniqueBuyers: new Set(tickets.map(t => t.buyer_email)).size,
      verifiedTickets: tickets.filter(t => t.verified_at).length,
      pendingVerification: tickets.filter(t => !t.verified_at).length,
      recent24h: tickets.filter(t => new Date(t.purchased_at) > yesterday).length,
      freeTickets: tickets.filter(t => t.price === 0).length,
      paidTickets: tickets.filter(t => t.price > 0).length
    };

    setStats(newStats);
  };

  // Search and filter function
  useEffect(() => {
    let filtered = [...tickets];

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.event_title.toLowerCase().includes(term) ||
        t.buyer_email.toLowerCase().includes(term) ||
        t.buyer_name.toLowerCase().includes(term) ||
        t.ticket_type.toLowerCase().includes(term) ||
        t.ticket_number.toLowerCase().includes(term) ||
        t.order_id.toLowerCase().includes(term) ||
        t.reference.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Apply event filter
    if (filterEvent !== "all") {
      filtered = filtered.filter(t => t.event_title === filterEvent);
    }

    // Apply type filter
    if (filterType !== "all") {
      if (filterType === "free") {
        filtered = filtered.filter(t => t.price === 0);
      } else if (filterType === "paid") {
        filtered = filtered.filter(t => t.price > 0);
      }
    }

    setFilteredTickets(filtered);
  }, [searchTerm, filterStatus, filterEvent, filterType, tickets]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const downloadQR = async (url: string, name: string) => {
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name.replace(/\s+/g, "_")}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code downloaded");
    } catch (err) {
      console.error("Error downloading QR:", err);
      toast.error("Failed to download QR code");
    }
  };

  const generateTicketPDF = async (ticket: Ticket) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add gradient background
      doc.setFillColor(106, 13, 173); // Purple
      doc.rect(0, 0, 210, 50, 'F');
      
      // Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text("SAHMTICKETHUB", 105, 25, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text("OFFICIAL EVENT TICKET", 105, 35, { align: "center" });
      doc.text("Valid for Entry", 105, 42, { align: "center" });
      
      // Reset for content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Ticket details section
      let yPos = 65;
      
      // Ticket Number - Prominent
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("TICKET NUMBER:", 20, yPos);
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(106, 13, 173);
      doc.text(ticket.ticket_number, 70, yPos);
      
      // Reset
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      yPos += 15;
      
      // Event Details
      doc.setFont('helvetica', 'bold');
      doc.text("EVENT DETAILS", 20, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Event: ${ticket.event_title}`, 20, yPos);
      yPos += 7;
      
      if (ticket.event_date) {
        doc.text(`Date: ${formatDate(ticket.event_date)}`, 20, yPos);
        yPos += 7;
      }
      
      if (ticket.event_venue) {
        doc.text(`Venue: ${ticket.event_venue}`, 20, yPos);
        yPos += 7;
      }
      
      if (ticket.event_location) {
        doc.text(`Location: ${ticket.event_location}`, 20, yPos);
        yPos += 10;
      }
      
      // Ticket Info
      doc.setFont('helvetica', 'bold');
      doc.text("TICKET INFORMATION", 20, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Type: ${ticket.ticket_type}`, 20, yPos);
      yPos += 7;
      doc.text(`Quantity: ${ticket.quantity}`, 20, yPos);
      yPos += 7;
      doc.text(`Status: ${ticket.status.toUpperCase()}`, 20, yPos);
      yPos += 10;
      
      // Buyer Info
      doc.setFont('helvetica', 'bold');
      doc.text("BUYER INFORMATION", 20, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${ticket.buyer_name}`, 20, yPos);
      yPos += 7;
      doc.text(`Email: ${ticket.buyer_email}`, 20, yPos);
      yPos += 10;
      
      // Payment Info
      doc.setFont('helvetica', 'bold');
      doc.text("PAYMENT INFORMATION", 20, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Amount: ${formatCurrency(ticket.price)}`, 20, yPos);
      yPos += 7;
      doc.text(`Order ID: ${ticket.order_id}`, 20, yPos);
      yPos += 7;
      doc.text(`Reference: ${ticket.reference}`, 20, yPos);
      yPos += 7;
      doc.text(`Purchase Date: ${formatDate(ticket.purchased_at)}`, 20, yPos);
      yPos += 15;
      
      // Add QR Code if available
      if (ticket.qr_code_url) {
        try {
          const imgData = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
              } else {
                reject(new Error('Could not get canvas context'));
              }
            };
            img.onerror = reject;
            img.src = ticket.qr_code_url!;
          });
          
          doc.addImage(imgData, 'PNG', 140, 65, 50, 50);
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text("Scan for verification", 165, 120, { align: "center" });
        } catch (err) {
          console.warn("Could not add QR code to PDF:", err);
        }
      }
      
      // Security footer
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text("This ticket is non-transferable and valid only for the specified event.", 105, 200, { align: "center" });
      doc.text("Generated by SahmTicketHub Organizer Portal", 105, 205, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 210, { align: "center" });
      
      // Security border
      doc.setDrawColor(106, 13, 173);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277); // Outer border
      doc.rect(15, 15, 180, 267); // Inner border
      
      // Save PDF
      doc.save(`Ticket-${ticket.ticket_number}.pdf`);
      toast.success("Ticket PDF generated successfully");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate PDF");
    }
  };

  const verifyTicket = async (ticketId: string) => {
    setVerifyingTicket(ticketId);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ 
          verified_at: new Date().toISOString()
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, verified_at: new Date().toISOString(), status: "verified" } 
          : t
      ));

      setFilteredTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, verified_at: new Date().toISOString(), status: "verified" } 
          : t
      ));

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? {
          ...prev,
          verified_at: new Date().toISOString(),
          status: "verified"
        } : null);
      }

      toast.success("Ticket verified successfully!");
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("Failed to verify ticket");
    } finally {
      setVerifyingTicket(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterEvent("all");
    setFilterType("all");
    setShowFilters(false);
  };

  const exportCSV = () => {
    const headers = [
      'Ticket Number',
      'Event',
      'Ticket Type',
      'Buyer Name',
      'Buyer Email',
      'Price',
      'Quantity',
      'Order ID',
      'Reference',
      'Purchase Date',
      'Status',
      'Verification Date',
      'Venue'
    ];

    const csvData = filteredTickets.map(ticket => [
      ticket.ticket_number,
      ticket.event_title,
      ticket.ticket_type,
      ticket.buyer_name,
      ticket.buyer_email,
      ticket.price,
      ticket.quantity,
      ticket.order_id,
      ticket.reference,
      formatDate(ticket.purchased_at),
      ticket.status,
      ticket.verified_at ? formatDate(ticket.verified_at) : '',
      ticket.event_venue || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("CSV exported successfully");
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all group hover:shadow-xl hover:shadow-purple-500/10">
      <div className="p-4 sm:p-6">
        {/* Header with authenticity badge */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate group-hover:text-purple-300 transition">
                {ticket.event_title}
              </h3>
              {ticket.verified_at ? (
                <BadgeCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                {ticket.ticket_type}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                ticket.price === 0 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-green-500/20 text-green-300 border-green-500/50'
              }`}>
                {ticket.price === 0 ? 'FREE' : formatCurrency(ticket.price)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                ticket.verified_at
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
              }`}>
                {ticket.verified_at ? 'VERIFIED' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Number Section */}
        <div className="mb-4 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Hash className="w-4 h-4" />
                <span>Ticket Number</span>
              </div>
              <div className="flex items-center gap-3">
                <code className="text-base sm:text-lg font-mono font-bold text-white bg-black/30 px-2 sm:px-3 py-1 rounded-lg truncate">
                  {ticket.ticket_number}
                </code>
                <button
                  onClick={() => copyToClipboard(ticket.ticket_number, "Ticket number")}
                  className="p-1 sm:p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                  title="Copy ticket number"
                >
                  <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Shield className="w-4 h-4" />
                <span>Authenticity</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                {ticket.verified_at ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Verified
                  </span>
                ) : (
                  <>
                    <span className="text-yellow-400 font-medium">Pending</span>
                    <button
                      onClick={() => verifyTicket(ticket.id)}
                      disabled={verifyingTicket === ticket.id}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {verifyingTicket === ticket.id ? 'Verifying...' : 'Verify'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Buyer & Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <User className="w-4 h-4" />
              <span>Buyer Details</span>
            </div>
            <div className="text-white font-medium truncate">{ticket.buyer_name}</div>
            <div className="text-gray-400 text-xs truncate">{ticket.buyer_email}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Ticket className="w-4 h-4" />
              <span>Order Details</span>
            </div>
            <div className="text-white font-medium truncate text-sm sm:text-base">{ticket.order_id}</div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span className="truncate">Ref: {ticket.reference}</span>
              <button
                onClick={() => copyToClipboard(ticket.reference, "Reference")}
                className="hover:text-white transition flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 text-sm mb-6">
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="whitespace-nowrap">Purchased:</span>
            <span className="text-white truncate">{formatDate(ticket.purchased_at)}</span>
          </div>
          {ticket.verified_at && (
            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircle className="w-4 h-4" />
              <span className="whitespace-nowrap">Verified:</span>
              <span className="text-white truncate">{formatDate(ticket.verified_at)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
          {ticket.qr_code_url && (
            <>
              <button
                onClick={() => setSelectedQR(ticket.qr_code_url)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm font-medium transition flex-1 sm:flex-none justify-center"
              >
                <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">View QR</span>
              </button>
              <button
                onClick={() => {
                  if (ticket.qr_code_url) {
                    downloadQR(ticket.qr_code_url, `${ticket.ticket_number}`);
                  }
                }}
                disabled={!ticket.qr_code_url}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition flex-1 sm:flex-none justify-center ${
                  ticket.qr_code_url 
                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                    : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">QR</span>
              </button>
            </>
          )}
          <button
            onClick={() => generateTicketPDF(ticket)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 text-sm font-medium transition flex-1 sm:flex-none justify-center"
          >
            <FileText className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => setSelectedTicket(ticket)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm font-medium transition flex-1 sm:flex-none justify-center"
          >
            <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - Mobile Slide In */}
      {/* <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:static md:z-auto`}>
        <Sidebar role="organizer" />
      </div> */}

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-white/10 flex items-center justify-between">
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8 lg:mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Ticket Management</h1>
                  <p className="text-gray-400 text-sm sm:text-base">View, verify, and manage all ticket sales</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={loadTickets}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition text-sm sm:text-base"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-xl text-white transition text-sm sm:text-base"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    {showExportMenu && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            exportCSV();
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition"
                        >
                          Export as CSV
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { label: "Total Revenue", value: `₦${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "purple" },
                  { label: "Tickets Sold", value: stats.ticketsSold, icon: Ticket, color: "blue" },
                  { label: "Unique Buyers", value: stats.uniqueBuyers, icon: Users, color: "green" },
                  { label: "Verified", value: stats.verifiedTickets, icon: CheckCircle, color: "emerald" },
                  { label: "Pending", value: stats.pendingVerification, icon: AlertCircle, color: "yellow" },
                  { label: "Last 24h", value: stats.recent24h, icon: Clock, color: "pink" },
                  { label: "Free Tickets", value: stats.freeTickets, icon: Tag, color: "emerald" },
                  { label: "Paid Tickets", value: stats.paidTickets, icon: DollarSign, color: "green" }
                ].map((stat, index) => (
                  <div key={index} className={`bg-gradient-to-br from-${stat.color}-500/10 to-${stat.color === 'purple' ? 'pink' : stat.color === 'blue' ? 'cyan' : stat.color === 'green' ? 'emerald' : stat.color === 'yellow' ? 'orange' : stat.color}-500/10 backdrop-blur-xl border border-${stat.color}-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-xs sm:text-sm">{stat.label}</p>
                        <p className="text-lg sm:text-xl font-bold text-white mt-1">{stat.value}</p>
                      </div>
                      <stat.icon className={`text-${stat.color}-400`} size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Search & Filters */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 text-sm sm:text-base"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition"
                >
                  <Filter className="w-5 h-5" />
                  <span className="hidden sm:inline">Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="mt-4 p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-white">Filter Tickets</h3>
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" /> Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Verification Status</label>
                      <div className="flex flex-wrap gap-2">
                        {["all", "verified", "pending"].map(status => (
                          <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition ${
                              filterStatus === status
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {status === "all" ? "All" : status === "verified" ? "Verified" : "Pending"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Event</label>
                      <select
                        value={filterEvent}
                        onChange={(e) => setFilterEvent(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/60 text-sm sm:text-base"
                      >
                        <option value="all">All Events</option>
                        {eventsList.map(event => (
                          <option key={event} value={event}>{event}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Ticket Type</label>
                      <div className="flex flex-wrap gap-2">
                        {["all", "free", "paid"].map(type => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition ${
                              filterType === type
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {type === "all" ? "All" : type === "free" ? "Free" : "Paid"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-gray-400 text-sm sm:text-base">
                Showing <span className="text-white font-medium">{filteredTickets.length}</span> of{" "}
                <span className="text-white font-medium">{tickets.length}</span> tickets
              </p>
              {filteredTickets.length > 0 && (
                <p className="text-xs sm:text-sm text-purple-400">
                  Click on any ticket to view details and verify
                </p>
              )}
            </div>

            {/* Tickets Grid */}
            {loading ? (
              <div className="flex justify-center py-20 sm:py-32">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-purple-500" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-16 sm:py-20">
                <Ticket size={48} className="mx-auto text-gray-600 mb-4 sm:mb-6" />
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {searchTerm || filterStatus !== "all" || filterEvent !== "all" || filterType !== "all" 
                    ? "No matching tickets found" 
                    : "No tickets sold yet"}
                </h3>
                <p className="text-gray-400 text-sm sm:text-base mb-6 max-w-md mx-auto">
                  {searchTerm || filterStatus !== "all" || filterEvent !== "all" || filterType !== "all"
                    ? "Try adjusting your search or filters"
                    : "Tickets will appear here when attendees purchase from your events"}
                </p>
                {(searchTerm || filterStatus !== "all" || filterEvent !== "all" || filterType !== "all") && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedQR(null)}>
          <div className="bg-gray-900 border border-white/20 rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Ticket QR Code</h3>
            <img src={selectedQR} alt="QR Code" className="w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-6 rounded-xl" />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { downloadQR(selectedQR, "ticket"); setSelectedQR(null); }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 sm:px-6 py-3 rounded-xl text-white font-medium transition"
              >
                Download QR
              </button>
              <button 
                onClick={() => setSelectedQR(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 px-4 sm:px-6 py-3 rounded-xl text-white font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Ticket Details</h2>
                <p className="text-gray-400 text-sm sm:text-base">Complete information for {selectedTicket.ticket_number}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 sm:p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Event Info */}
              <div className="bg-white/5 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  Event Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Event Name</p>
                    <p className="text-white font-medium text-sm sm:text-base">{selectedTicket.event_title}</p>
                  </div>
                  {selectedTicket.event_date && (
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Event Date</p>
                      <p className="text-white font-medium text-sm sm:text-base">{formatDate(selectedTicket.event_date)}</p>
                    </div>
                  )}
                  {selectedTicket.event_venue && (
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Venue</p>
                      <p className="text-white font-medium text-sm sm:text-base">{selectedTicket.event_venue}</p>
                    </div>
                  )}
                  {selectedTicket.event_location && (
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Location</p>
                      <p className="text-white font-medium text-sm sm:text-base">{selectedTicket.event_location}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Info */}
              <div className="bg-white/5 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  Ticket Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Ticket Number</p>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono font-bold text-sm sm:text-base">{selectedTicket.ticket_number}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTicket.ticket_number, "Ticket number")}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Ticket Type</p>
                    <p className="text-white font-medium text-sm sm:text-base">{selectedTicket.ticket_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Quantity</p>
                    <p className="text-white font-medium text-sm sm:text-base">{selectedTicket.quantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedTicket.verified_at
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {selectedTicket.verified_at ? 'VERIFIED' : 'PENDING'}
                      </span>
                      {!selectedTicket.verified_at && (
                        <button
                          onClick={() => verifyTicket(selectedTicket.id)}
                          disabled={verifyingTicket === selectedTicket.id}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded text-xs disabled:opacity-50 whitespace-nowrap"
                        >
                          {verifyingTicket === selectedTicket.id ? '...' : 'Verify'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="bg-white/5 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  Buyer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Full Name</p>
                    <p className="text-white font-medium text-sm sm:text-base">{selectedTicket.buyer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm sm:text-base truncate">{selectedTicket.buyer_email}</p>
                      <button
                        onClick={() => copyToClipboard(selectedTicket.buyer_email, "Email")}
                        className="p-1 hover:bg-white/10 rounded flex-shrink-0"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white/5 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Amount Paid</p>
                    <p className="text-white font-medium text-sm sm:text-base">{formatCurrency(selectedTicket.price)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Order ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono text-xs sm:text-sm truncate">{selectedTicket.order_id}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTicket.order_id, "Order ID")}
                        className="p-1 hover:bg-white/10 rounded flex-shrink-0"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Reference</p>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono text-xs sm:text-sm truncate">{selectedTicket.reference}</code>
                      <button
                        onClick={() => copyToClipboard(selectedTicket.reference, "Reference")}
                        className="p-1 hover:bg-white/10 rounded flex-shrink-0"
                      >
                        <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs sm:text-sm">Purchase Date</p>
                    <p className="text-white font-medium text-sm sm:text-base">{formatDate(selectedTicket.purchased_at)}</p>
                  </div>
                  {selectedTicket.verified_at && (
                    <div>
                      <p className="text-gray-400 text-xs sm:text-sm">Verification Date</p>
                      <p className="text-white font-medium text-sm sm:text-base">{formatDate(selectedTicket.verified_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-white/10">
                {selectedTicket.qr_code_url && (
                  <>
                    <button
                      onClick={() => setSelectedQR(selectedTicket.qr_code_url)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm font-medium transition flex-1 sm:flex-none justify-center"
                    >
                      <QrCode className="w-4 h-4" /> View QR
                    </button>
                    <button
                      onClick={() => downloadQR(selectedTicket.qr_code_url!, `${selectedTicket.ticket_number}-QR`)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition flex-1 sm:flex-none justify-center"
                    >
                      <Download className="w-4 h-4" /> Download QR
                    </button>
                  </>
                )}
                <button
                  onClick={() => generateTicketPDF(selectedTicket)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 text-sm font-medium transition flex-1 sm:flex-none justify-center"
                >
                  <FileText className="w-4 h-4" /> Generate PDF
                </button>
                {!selectedTicket.verified_at && (
                  <button
                    onClick={() => verifyTicket(selectedTicket.id)}
                    disabled={verifyingTicket === selectedTicket.id}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white text-sm font-medium transition flex-1 sm:flex-none justify-center disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {verifyingTicket === selectedTicket.id ? 'Verifying...' : 'Verify Ticket'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}