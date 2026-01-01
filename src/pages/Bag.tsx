'use client';

import { useParams, Link } from "react-router-dom";
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
  const { orderId } = useParams<{ orderId: string }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch actual ticket data from database
  useEffect(() => {
    const fetchTickets = async () => {
      if (!orderId) {
        setError("No order ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch tickets with order_id
        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select(`
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
          `)
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

        if (ticketsError) throw ticketsError;

        if (!ticketsData || ticketsData.length === 0) {
          setError("No tickets found for this order");
          setLoading(false);
          return;
        }

        // Fetch event details for each unique event
        // Fetch event details for each unique event
const eventIds = [...new Set(ticketsData.map((t: any) => t.event_id).filter(Boolean))] as string[];

if (eventIds.length > 0) {
  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select(`
      id,
      title,
      date,
      time,
      location,
      venue,
      lat,
      lng,
      image
    `)
    .in("id", eventIds);

  if (eventsError) throw eventsError;

  // Combine ticket and event data
  const ticketsWithEvents: Ticket[] = ticketsData.map((ticket: any) => {
    const event = eventsData?.find((e: any) => e.id === ticket.event_id) || null;
    return {
      ...ticket,
      event
    };
  });

  setTickets(ticketsWithEvents);
} else {
  // If no event found (shouldn't happen, but just in case)
  const ticketsWithNullEvents: Ticket[] = ticketsData.map((ticket: any) => ({
    ...ticket,
    event: null
  }));
  setTickets(ticketsWithNullEvents);
}

      } catch (err: any) {
        console.error("Error fetching tickets:", err);
        setError(err.message || "Failed to load ticket information");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [orderId]);

  // Calculate total amount
  const totalAmount = tickets.reduce((sum, ticket) => sum + (ticket.price * (ticket.quantity || 1)), 0);
  const totalTickets = tickets.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0);
  const firstTicket = tickets[0];
  const event = firstTicket?.event;

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Date TBD";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const eventDateStr = dateString.split('T')[0];
      
      if (eventDateStr === todayStr) return "Today";
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${monthName} ${day}, ${year}`;
    } catch {
      return "Date TBD";
    }
  };

  // Format time
  const formatTime = (timeStr?: string): string => {
    if (!timeStr || timeStr.trim() === '') return "Time TBD";
    
    try {
      const cleanTime = timeStr.trim();
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i;
      const match = cleanTime.match(timeRegex);
      
      if (!match) return cleanTime;
      
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3] ? match[3].toUpperCase() : '';
      
      if (period) {
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      }
      
      const displayPeriod = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      
      return `${displayHours}:${displayMinutes} ${displayPeriod}`;
      
    } catch (error) {
      return timeStr;
    }
  };

  // Format price
  const formatPrice = (price: number): string => {
    if (price === 0) return "FREE";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0
    }).format(price);
  };

  // Web share API
  const handleShare = async () => {
    if (tickets.length === 0) return;

    const firstTicket = tickets[0];
    const event = firstTicket.event;
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
      } catch (err) {
        console.error("Share failed:", err);
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
          .then(() => alert("Ticket link copied to clipboard! 📋"))
          .catch(() => alert("Sharing not supported on this device"));
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert("Ticket link copied to clipboard! 📋"))
        .catch(() => alert("Sharing not supported on this device"));
    }
  };

  // Get Uber URL
  const getUberUrl = () => {
    if (!event) return "#";
    
    if (event.lat && event.lng) {
      return `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${event.lat}&dropoff[longitude]=${event.lng}&dropoff[nickname]=${encodeURIComponent(event.location)}`;
    }
    
    const address = event.venue || event.location || "";
    const encodedAddress = encodeURIComponent(`${address}, Nigeria`);
    return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodedAddress}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6">
          <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto" />
          <div>
            <p className="text-2xl font-bold text-purple-800 mb-2">Loading your tickets...</p>
            <p className="text-gray-600">Getting your order details ready</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-4">
            {error || "No Tickets Found"}
          </h2>
          <p className="text-gray-600 mb-8">
            {error || "We couldn't find any tickets for this order ID."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all"
            >
              Browse Events
            </Link>
            <Link
              to="/profile/tickets"
              className="bg-white border-2 border-purple-600 text-purple-600 font-bold py-3 px-6 rounded-2xl hover:bg-purple-50 transition-all"
            >
              My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Success Header */}
      <section className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <CheckCircle className="w-24 h-24 md:w-28 md:h-28 mx-auto" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black mb-4">Ticket Confirmed! 🎉</h1>
          <p className="text-xl md:text-2xl opacity-90">
            Your tickets have been sent to your email • PDF attached
          </p>
          <p className="mt-4 opacity-80 flex items-center justify-center gap-2">
            <Mail className="w-5 h-5" />
            Check your inbox for the complete ticket PDF
          </p>
        </div>
      </section>

      {/* Main Ticket Section */}
      <section className="py-8 md:py-12 -mt-8 md:-mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            id="ticket-section"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-purple-100"
          >
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-purple-700 to-pink-700 p-6 md:p-8 text-white">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black mb-2">
                    {event?.title || "Event Ticket"}
                  </h2>
                  <div className="flex items-center gap-2 text-lg opacity-90">
                    <TicketIcon className="w-5 h-5" />
                    <span>Order #{orderId}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                    <span className="text-lg font-bold">{totalTickets}</span>
                    <span>Tickets</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Body */}
            <div className="p-6 md:p-8">
              {/* Event Details */}
              {event && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {formatDate(event.date)}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(event.time)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <MapPin className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {event.venue || event.location}
                        </p>
                        {event.venue && event.venue !== event.location && (
                          <p className="text-gray-600 mt-1">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Buyer Info */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {firstTicket.full_name || "Ticket Holder"}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">Ticket Holder</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Mail className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {firstTicket.email}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">Email sent to</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 mb-8">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Your QR Code</h3>
                  <p className="text-gray-600 mb-6">Show this at the entrance for check-in</p>
                  
                  <div className="flex justify-center">
                    <div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-purple-100 inline-block">
                      <QRCode 
                        value={firstTicket.reference || orderId || "ticket"} 
                        size={200} 
                        level="H" 
                      />
                    </div>
                  </div>
                  
                  <p className="font-mono text-sm text-gray-500 mt-4">
                    Ref: {firstTicket.reference || orderId}
                  </p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Ticket Details</h3>
                
                <div className="space-y-4">
                  {tickets.map((ticket, index) => (
                    <div 
                      key={ticket.id} 
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{ticket.tier_name}</p>
                        <p className="text-gray-600 text-sm">Ticket #{index + 1}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-700">
                          {formatPrice(ticket.price)} × {ticket.quantity || 1}
                        </p>
                        <p className="text-gray-600 text-sm">
                          Total: {formatPrice(ticket.price * (ticket.quantity || 1))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">Order Total</p>
                      <p className="text-gray-600 text-sm">Including all tickets</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-purple-700">
                        {formatPrice(totalAmount)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">Payment Confirmed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-8 border-t border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href={getUberUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-900 transition-all hover:scale-[1.02]"
                  >
                    <Car className="w-6 h-6" /> 
                    <span>Book Ride to Event</span>
                  </a>
                  
                  <button
                    onClick={handleShare}
                    className="bg-white border-2 border-purple-600 text-purple-600 font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-50 transition-all hover:scale-[1.02]"
                  >
                    <Share2 className="w-6 h-6" />
                    <span>Share Ticket</span>
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                  <Link
                    to="/events"
                    className="text-purple-600 font-bold hover:text-purple-800 transition flex items-center gap-2"
                  >
                    ← Discover More Events
                  </Link>
                  
                  <Link
                    to="/profile/tickets"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all"
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