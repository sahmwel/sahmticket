// src/pages/Bag.tsx – Updated with fallback orderId detection
import { useParams, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import {
  Calendar,
  MapPin,
  Car,
  Share2,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Ticket as TicketIcon,
  Mail,
  User,
  Phone,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Ticket {
  id: string;
  order_id: string;
  full_name: string;
  email: string;
  phone: string;
  qr_code_url: string;
  price: number;
  reference: string;
  tier_name: string;
  ticket_type: string;
  quantity: number;
  purchased_at: string;
  event: {
    title: string;
    date: string;
    time?: string;
    location: string;
    venue?: string;
    lat?: number;
    lng?: number;
    image?: string;
  } | null;
}

export default function Bag() {
  const { orderId: pathOrderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract orderId from path, query params, or sessionStorage
  useEffect(() => {
    // 1. Try path parameter
    if (pathOrderId && pathOrderId !== "undefined") {
      setOrderId(pathOrderId);
      return;
    }
    // 2. Try query parameter ?orderId=...
    const queryParams = new URLSearchParams(location.search);
    const queryOrderId = queryParams.get("orderId");
    if (queryOrderId) {
      setOrderId(queryOrderId);
      return;
    }
    // 3. Last resort: sessionStorage (in case of page refresh after redirect)
    const storedOrderId = sessionStorage.getItem("lastOrderId");
    if (storedOrderId) {
      setOrderId(storedOrderId);
      sessionStorage.removeItem("lastOrderId"); // clear after use
      return;
    }
    setError("No order ID provided. Please check your ticket email or link.");
    setLoading(false);
  }, [pathOrderId, location.search]);

  // Fetch tickets once orderId is known
  useEffect(() => {
    if (!orderId) return;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select(
            `
            id,
            order_id,
            full_name,
            email,
            phone,
            qr_code_url,
            price,
            reference,
            tier_name,
            ticket_type,
            quantity,
            purchased_at,
            event_id
          `,
          )
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

        if (ticketsError) throw ticketsError;
        if (!ticketsData || ticketsData.length === 0) {
          setError("No tickets found for this order.");
          setLoading(false);
          return;
        }

        // Get unique event IDs
        const eventIds = [
          ...new Set(ticketsData.map((t: any) => t.event_id).filter(Boolean)),
        ];
        let eventsMap = new Map();
        if (eventIds.length > 0) {
          const { data: eventsData, error: eventsError } = await supabase
            .from("events")
            .select("id, title, date, time, location, venue, lat, lng, image")
            .in("id", eventIds);
          if (!eventsError && eventsData) {
            eventsData.forEach((e: any) => eventsMap.set(e.id, e));
          }
        }

        const ticketsWithEvents: Ticket[] = ticketsData.map((ticket: any) => ({
          ...ticket,
          event: eventsMap.get(ticket.event_id) || null,
        }));

        setTickets(ticketsWithEvents);
      } catch (err: any) {
        console.error("Error fetching tickets:", err);
        setError(err.message || "Failed to load ticket information");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [orderId]);

  // Store orderId in sessionStorage when we have it (for fallback after refresh)
  useEffect(() => {
    if (orderId && tickets.length > 0) {
      sessionStorage.setItem("lastOrderId", orderId);
    }
  }, [orderId, tickets]);

  // ... rest of your component (helpers, formatting, JSX) remains exactly the same ...
  // (I'll include it below for completeness, but you already have it)

  // Calculate totals, etc.
  const totalAmount = tickets.reduce(
    (sum, t) => sum + t.price * (t.quantity || 1),
    0,
  );
  const totalTickets = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
  const firstTicket = tickets[0];
  const event = firstTicket?.event;

  // Date & time helpers (same as before)
  const parseDateString = (
    dateString: string,
  ): { year: number; month: number; day: number; dayOfWeek: string } | null => {
    if (!dateString) return null;
    try {
      const dateOnly = dateString.split("T")[0];
      const [yearStr, monthStr, dayStr] = dateOnly.split("-");
      if (!yearStr || !monthStr || !dayStr) return null;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
      let y = year,
        m = month,
        d = day;
      if (m < 3) {
        m += 12;
        y -= 1;
      }
      const K = y % 100;
      const J = Math.floor(y / 100);
      const h =
        (d +
          Math.floor((13 * (m + 1)) / 5) +
          K +
          Math.floor(K / 4) +
          Math.floor(J / 4) -
          2 * J) %
        7;
      const days = [
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ];
      const dayOfWeek = days[(h + 7) % 7];
      return { year, month, day, dayOfWeek };
    } catch {
      return null;
    }
  };

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "Date not set";
    const parsed = parseDateString(timestamp);
    if (!parsed) return "Invalid date";
    const { year, month, day, dayOfWeek } = parsed;
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthName = monthNames[month - 1];
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const eventUTC = Date.UTC(year, month - 1, day);
    const diffDays = Math.floor((eventUTC - todayUTC) / (1000 * 60 * 60 * 24));
    const formattedDate = `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ""}`;
    if (diffDays < -1) return `${formattedDate} (Past)`;
    if (diffDays === -1) return `Yesterday`;
    if (diffDays === 0) return `Today`;
    if (diffDays === 1) return `Tomorrow`;
    if (diffDays <= 7) return `${formattedDate} (in ${diffDays} days)`;
    return formattedDate;
  };

  const formatEventTime = (eventDate: string, eventTime?: string): string => {
    if (eventTime) {
      try {
        let timeStr = eventTime.trim().toLowerCase();
        const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = match[2] ? parseInt(match[2], 10) : 0;
          const period = match[3] ? match[3].toUpperCase() : null;
          if (period === "PM" && hours < 12) hours += 12;
          if (period === "AM" && hours === 12) hours = 0;
          const displayHour = hours % 12 || 12;
          const displayMinute = minutes.toString().padStart(2, "0");
          const displayPeriod = hours >= 12 ? "PM" : "AM";
          return `${displayHour}:${displayMinute} ${displayPeriod}`;
        }
        return timeStr;
      } catch {
        /* fall through */
      }
    }
    try {
      const date = new Date(eventDate);
      if (!isNaN(date.getTime())) {
        let hours = date.getUTCHours();
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");
        const period = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${period}`;
      }
    } catch {}
    return "Time TBD";
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return "FREE";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getMonthName = (month: number): string => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || "Month";
  };
  const getDayAbbreviation = (fullDay: string): string =>
    fullDay.substring(0, 3);
  const getDateWithOrdinal = (date: number): string => {
    if (date >= 11 && date <= 13) return `${date}th`;
    switch (date % 10) {
      case 1:
        return `${date}st`;
      case 2:
        return `${date}nd`;
      case 3:
        return `${date}rd`;
      default:
        return `${date}th`;
    }
  };

  const handleShare = async () => {
    if (tickets.length === 0) return;
    const text = event
      ? `Check out my ticket for ${event.title}! 🎫\nOrder: ${orderId}`
      : `My ticket order ${orderId} is confirmed! 🎫`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Event Ticket",
          text,
          url: window.location.href,
        });
      } catch {
        navigator.clipboard
          .writeText(window.location.href)
          .then(() => alert("Link copied!"));
      }
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => alert("Link copied!"));
    }
  };

  const getUberUrl = () => {
    if (!event) return "#";
    if (event.lat && event.lng) {
      return `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${event.lat}&dropoff[longitude]=${event.lng}&dropoff[nickname]=${encodeURIComponent(event.location)}`;
    }
    const address = event.venue || event.location || "";
    return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}`;
  };

  const qrValue = firstTicket?.reference || orderId || "ticket";
  const parsedDate = event ? parseDateString(event.date) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto" />
        <p className="text-2xl font-bold text-purple-800 mt-4">
          Loading your tickets...
        </p>
      </div>
    );
  }

  if (error || tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            {error || "No Tickets Found"}
          </h2>
          <p className="text-gray-600 mb-8">
            We couldn't find any tickets for this order.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl"
            >
              Browse Events
            </Link>
            <Link
              to="/profile/tickets"
              className="border-2 border-purple-600 text-purple-600 font-bold py-3 px-6 rounded-2xl"
            >
              My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN RENDER (same as before – very long, but I'll include it) ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Success Header */}
      <section className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mb-6"
          >
            <CheckCircle className="w-24 h-24 mx-auto" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black mb-4">
            Ticket Confirmed! 🎉
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            Your tickets have been sent to your email • PDF attached
          </p>
        </div>
      </section>

      {/* Ticket Card */}
      <section className="py-8 md:py-12 -mt-8 md:-mt-12">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-100"
          >
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-purple-700 to-pink-700 p-6 md:p-8 text-white">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black mb-2">
                    {event?.title || "Event Ticket"}
                  </h2>
                  <div className="flex items-center gap-2 text-lg opacity-90">
                    <TicketIcon className="w-5 h-5" /> Order #{orderId}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <span className="text-lg font-bold">{totalTickets}</span>{" "}
                  Tickets
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* Event Details */}
              {event && (
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Calendar className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-semibold text-lg">
                          {formatDate(event.date)}
                        </p>
                        <div className="flex gap-3 mt-1">
                          {parsedDate && (
                            <span className="text-gray-600 text-sm bg-gray-100 px-3 py-1 rounded-full">
                              {getDayAbbreviation(parsedDate.dayOfWeek)}
                            </span>
                          )}
                          <Clock className="w-4 h-4" />
                          {formatEventTime(event.date, event.time)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <MapPin className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-semibold text-lg">
                          {event.venue || event.location}
                        </p>
                        {event.venue && event.venue !== event.location && (
                          <p className="text-gray-600 mt-1">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <User className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-semibold text-lg">
                          {firstTicket.full_name}
                        </p>
                        <p className="text-gray-600 text-sm">Ticket Holder</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Mail className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-semibold text-lg">
                          {firstTicket.email}
                        </p>
                        <p className="text-gray-600 text-sm">Email sent to</p>
                      </div>
                    </div>
                    {firstTicket.phone && (
                      <div className="flex gap-3">
                        <Phone className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="font-semibold text-lg">
                            {firstTicket.phone}
                          </p>
                          <p className="text-gray-600 text-sm">Phone number</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 mb-8 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Your QR Code
                </h3>
                <p className="text-gray-600 mb-6">
                  Show this at the entrance for check-in
                </p>
                <div className="flex justify-center">
                  <div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-purple-100 inline-block">
                    <QRCode value={qrValue} size={200} level="H" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="font-mono text-sm text-gray-500">
                    Reference: {firstTicket.reference || orderId}
                  </p>
                  <p className="text-xs text-gray-400">
                    Purchased on{" "}
                    {new Date(firstTicket.purchased_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="border-t pt-8">
                <h3 className="text-2xl font-bold mb-6">Ticket Details</h3>
                <div className="space-y-4">
                  {tickets.map((ticket, idx) => (
                    <div
                      key={ticket.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-semibold">{ticket.tier_name}</p>
                        <p className="text-gray-600 text-sm">
                          {ticket.ticket_type} • Ticket #{idx + 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-700">
                          {formatPrice(ticket.price)} × {ticket.quantity || 1}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Total:{" "}
                          {formatPrice(ticket.price * (ticket.quantity || 1))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold">Order Total</p>
                    <p className="text-gray-600 text-sm">
                      {totalTickets} tickets
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-purple-700">
                      {formatPrice(totalAmount)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">
                        Payment Confirmed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Date Box (if event exists) */}
              {event && parsedDate && (
                <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
                  <div className="text-center mb-4">
                    <p className="text-sm opacity-90 uppercase tracking-wider">
                      Event Date
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-center">
                    <div>
                      <p className="text-sm opacity-90">Day</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {getDayAbbreviation(parsedDate.dayOfWeek)}
                      </h3>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Date</p>
                      <p className="text-4xl font-black">{parsedDate.day}</p>
                      <p className="text-lg font-semibold">
                        {getMonthName(parsedDate.month)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Time</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {formatEventTime(event.date, event.time)}
                      </h3>
                    </div>
                  </div>
                  <div className="text-center mt-4 pt-4 border-t border-white/20">
                    <p className="text-sm opacity-90">
                      {parsedDate.dayOfWeek},{" "}
                      {getDateWithOrdinal(parsedDate.day)} of{" "}
                      {getMonthName(parsedDate.month)} {parsedDate.year}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-8 border-t space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <a
                    href={getUberUrl()}
                    target="_blank"
                    className="bg-black text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-900"
                  >
                    <Car className="w-6 h-6" /> Book Ride to Event
                  </a>
                  <button
                    onClick={handleShare}
                    className="bg-white border-2 border-purple-600 text-purple-600 font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-50"
                  >
                    <Share2 className="w-6 h-6" /> Share Ticket
                  </button>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <h4 className="font-bold text-yellow-800 mb-2">
                    Important Information
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>
                      • Present this QR code at the event entrance for check-in
                    </li>
                    <li>
                      • Arrive at least 30 minutes before the event start time
                    </li>
                    <li>
                      • Bring a valid ID that matches the ticket holder name
                    </li>
                    <li>• Tickets are non-refundable and non-transferable</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                  <Link
                    to="/events"
                    className="text-purple-600 font-bold hover:text-purple-800"
                  >
                    ← Discover More Events
                  </Link>
                  <Link
                    to="/profile/tickets"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl"
                  >
                    View All My Tickets
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
