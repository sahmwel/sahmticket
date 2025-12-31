// src/pages/organizer/Tickets.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Search, Download, Calendar, Ticket, DollarSign, Users, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface Ticket {
  id: string;
  ticket_type: string;
  price: number;
  purchased_at: string;
  event_title: string;
  buyer_email: string;
  qr_code_url: string | null;
  event_id: string;
}

export default function OrganizerTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTickets = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    navigate("/auth");
    return;
  }

  try {
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        id,
        ticket_type,
        price,
        purchased_at,
        qr_code_url,
        event_id,
        event:event_id (title),
        email,
        full_name
      `)
      .order("purchased_at", { ascending: false });

    if (error) throw error;

    const formatted: Ticket[] = (data || []).map((t: any) => ({
      id: t.id,
      ticket_type: t.ticket_type,
      price: t.price || 0,
      purchased_at: t.purchased_at,
      qr_code_url: t.qr_code_url,
      event_title: t.event?.title || "Unknown Event",
      buyer_email: t.email || t.full_name || "No buyer info",
      event_id: t.event_id,
    }));

    setTickets(formatted);
    setFilteredTickets(formatted);
  } catch (err: any) {
    console.error("Error loading tickets:", err);
    toast.error("Failed to load tickets: " + (err.message || "Unknown error"));

    // Optional fallback: fetch raw data to debug columns
    try {
      const { data: debugData } = await supabase
        .from("tickets")
        .select("*")
        .limit(1);
      if (debugData?.[0]) {
        console.log("Actual columns in tickets table:", Object.keys(debugData[0]));
      }
    } catch {}
  } finally {
    setLoading(false);
  }
};

    loadTickets();
  }, [navigate]);

  // Search function - improved
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTickets(tickets);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = tickets.filter(t =>
      t.event_title.toLowerCase().includes(term) ||
      t.buyer_email.toLowerCase().includes(term) ||
      t.ticket_type.toLowerCase().includes(term)
    );
    setFilteredTickets(filtered);
  }, [searchTerm, tickets]);

  const totalRevenue = tickets.reduce((sum, t) => sum + t.price, 0);

  const downloadQR = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name.replace(/\s+/g, "_")}_QR_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - Mobile Slide In */}
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
          <button onClick={() => setSidebarOpen(true)} className="text-white p-2 rounded-lg hover:bg-white/10">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Ticket Sales</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <main className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-white mb-3">Ticket Sales</h1>
              <p className="text-gray-400">View all tickets purchased for your events</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">₦{totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="text-green-400" size={36} />
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Tickets Sold</p>
                    <p className="text-3xl font-bold text-white mt-2">{tickets.length}</p>
                  </div>
                  <Ticket className="text-purple-400" size={36} />
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Unique Buyers</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {new Set(tickets.map(t => t.buyer_email)).size}
                    </p>
                  </div>
                  <Users className="text-blue-400" size={36} />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search tickets by event, email, or ticket type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
              />
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex justify-center py-32">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-20">
                <Ticket size={64} className="mx-auto text-gray-600 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">
                  {searchTerm ? "No matching tickets" : "No tickets sold yet"}
                </h3>
                <p className="text-gray-400">
                  {searchTerm ? "Try a different search term" : "Tickets will appear here when purchased"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all group">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition truncate">
                            {ticket.event_title}
                          </h3>
                          <p className="text-purple-400 text-sm font-medium">{ticket.ticket_type}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs border ${ticket.price === 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-green-500/20 text-green-300 border-green-500/50'}`}>
                          {ticket.price === 0 ? 'Free' : 'Paid'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="truncate">
                          <span className="text-gray-500">Buyer:</span> 
                          <span className="text-gray-300 ml-1">{ticket.buyer_email}</span>
                        </p>
                        <p>
                          <span className="text-gray-500">Price:</span> 
                          <span className="text-white font-medium ml-1">₦{ticket.price.toLocaleString()}</span>
                        </p>
                        <p className="flex items-center gap-2 text-gray-400">
                          <Calendar size={14} />
                          {new Date(ticket.purchased_at).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </p>
                      </div>
                    </div>

                    {ticket.qr_code_url && (
                      <div className="bg-white/5 border-t border-white/10 p-6 text-center">
                        <img
                          src={ticket.qr_code_url}
                          alt="QR"
                          className="w-40 h-40 mx-auto mb-4 rounded-lg cursor-pointer hover:scale-105 transition"
                          onClick={() => setSelectedQR(ticket.qr_code_url)}
                        />
                        <button
                          onClick={() => downloadQR(ticket.qr_code_url!, ticket.event_title)}
                          className="flex items-center gap-2 mx-auto bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                        >
                          <Download size={16} /> Download QR
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedQR(null)}>
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-sm w-full text-center">
            <img src={selectedQR} alt="QR" className="w-64 h-64 mx-auto mb-6 rounded-xl" />
            <button
              onClick={() => { downloadQR(selectedQR, "ticket"); setSelectedQR(null); }}
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl text-white font-medium"
            >
              Download Full Size
            </button>
            <button onClick={() => setSelectedQR(null)} className="mt-4 text-gray-400 hover:text-white">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}