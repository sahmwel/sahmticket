// src/pages/admin/Dashboard.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface User {
  id: string;
  email: string;
  role: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
}

interface Ticket {
  id: string;
  ticket_type: string;
  price: number;
  buyer_email: string;
  event_title: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // ✅ Get current logged-in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("You must be logged in as admin");

        // 1️⃣ Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, email, role")
          .order("created_at", { ascending: true });
        if (usersError) throw usersError;
        setUsers(usersData || []);

        // 2️⃣ Fetch events
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, title, date, venue")
          .order("date", { ascending: true });
        if (eventsError) throw eventsError;
        setEvents(eventsData || []);

        // 3️⃣ Fetch tickets with event and buyer info
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select(`
            id,
            ticket_type,
            price,
            buyer:buyer_id ( email ),
            event:event_id ( title )
          `)
          .order("purchased_at", { ascending: false });
        if (ticketsError) throw ticketsError;

        const formattedTickets = ticketsData?.map((t: any) => ({
          id: t.id,
          ticket_type: t.ticket_type,
          price: t.price,
          buyer_email: t.buyer?.email || "N/A",
          event_title: t.event?.title || "N/A",
        })) || [];
        setTickets(formattedTickets);

      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <p className="text-white p-6">Loading dashboard...</p>;
  if (error) return <p className="text-red-400 p-6">Error: {error}</p>;

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

          {/* Users */}
          <section className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Users</h2>
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id} className="p-4 bg-white/10 rounded-xl">
                  {user.email} - {user.role}
                </li>
              ))}
            </ul>
          </section>

          {/* Events */}
          <section className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Events</h2>
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id} className="p-4 bg-white/10 rounded-xl">
                  {event.title} - {new Date(event.date).toLocaleDateString()} - {event.venue}
                </li>
              ))}
            </ul>
          </section>

          {/* Tickets */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Tickets</h2>
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="p-4 bg-white/10 rounded-xl">
                  {ticket.ticket_type} - ₦{ticket.price.toLocaleString()} - {ticket.buyer_email} - {ticket.event_title}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
