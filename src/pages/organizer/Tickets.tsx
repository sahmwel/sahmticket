// src/pages/organizer/Tickets.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Ticket {
  id: string;
  ticket_type: string;
  price: number;
  purchased_at: string;
  event_title: string;
  buyer_email: string;
  qr_code_url: string | null;
}

export default function OrganizerTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          window.location.href = "/auth";
          return;
        }

        const { data, error } = await supabase
          .from("tickets")
          .select(`
            id,
            ticket_type,
            price,
            purchased_at,
            qr_code_url,
            event:event_id (
              id,
              title,
              organizer_id
            ),
            buyer:buyer_id (
              email
            )
          `)
          .eq("event.organizer_id", user.id)
          .order("purchased_at", { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((t: any) => ({
          id: t.id,
          ticket_type: t.ticket_type,
          price: t.price,
          purchased_at: t.purchased_at,
          qr_code_url: t.qr_code_url,
          event_title: t.event?.title ?? "Unknown Event",
          buyer_email: t.buyer?.email ?? "Unknown Buyer",
        }));

        setTickets(formatted);
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const downloadQR = (url: string | null, name: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}-ticket.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p className="text-white p-6">Loading tickets...</p>;

  return (
    <div className="flex">
      <Sidebar role="organizer" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="organizer" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-6">Tickets</h1>

          {tickets.length === 0 ? (
            <p className="text-white/70">No tickets sold yet.</p>
          ) : (
            <ul className="space-y-6">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="p-4 bg-white/10 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-lg text-white">{ticket.event_title}</p>
                    <p className="text-white/80">Ticket: {ticket.ticket_type}</p>
                    <p className="text-white/80">Price: ₦{ticket.price.toLocaleString()}</p>
                    <p className="text-white/80">Buyer: {ticket.buyer_email}</p>
                    <p className="text-sm text-gray-400">
                      Purchased: {new Date(ticket.purchased_at).toLocaleString()}
                    </p>
                  </div>

                  {ticket.qr_code_url && (
                    <div className="mt-4 md:mt-0 flex flex-col items-center">
                      <img
                        src={ticket.qr_code_url}
                        alt="Ticket QR Code"
                        className="w-32 h-32 object-contain mb-2"
                      />
                      <button
                        onClick={() => downloadQR(ticket.qr_code_url, ticket.event_title)}
                        className="bg-purple-600 text-white px-3 py-1 rounded-xl text-sm"
                      >
                        Download QR
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
