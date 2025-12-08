// src/pages/admin/Tickets.tsx
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

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("You must be logged in as admin");

        const { data, error: ticketsError } = await supabase
          .from("tickets")
          .select(`
            id,
            ticket_type,
            price,
            purchased_at,
            qr_code_url,
            event:event_id ( title ),
            buyer:buyer_id ( email )
          `)
          .order("purchased_at", { ascending: false });

        if (ticketsError) throw ticketsError;

        const formattedTickets = (data || []).map((t: any) => ({
          id: t.id,
          ticket_type: t.ticket_type,
          price: t.price,
          purchased_at: t.purchased_at,
          qr_code_url: t.qr_code_url,
          event_title: t.event?.title || "Unknown Event",
          buyer_email: t.buyer?.email || "Unknown Buyer",
        }));

        setTickets(formattedTickets);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  if (loading) return <p className="text-white p-6">Loading tickets...</p>;
  if (error) return <p className="text-red-400 p-6">Error: {error}</p>;

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-6">Tickets</h1>
          {tickets.length === 0 ? (
            <p className="text-white/70">No tickets sold yet.</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="p-4 bg-white/10 rounded-xl">
                  <strong>{ticket.event_title}</strong> - {ticket.ticket_type} - ₦{ticket.price.toLocaleString()}<br />
                  Buyer: {ticket.buyer_email} <br />
                  Purchased: {new Date(ticket.purchased_at).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
