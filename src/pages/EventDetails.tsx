// src/pages/EventDetails.tsx
'use client';

import { useNavigate, useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Clock,
  Loader2,
  X,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  Share2,
  Car,
  Navigation
} from "lucide-react";
import EventMap from "../components/EventMap";
import { supabase } from "../lib/supabaseClient";
import QRCode from "qrcode";
import Modal from "../components/Modal";

interface TicketTier {
  name: string;
  price: string | number;
  description?: string;
  available?: number;
  sold?: number;
  quantity_available?: number;
  quantity_sold?: number;
  tickets_sold?: number;
  total_tickets?: number;
}

interface EventType {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  address?: string;
  venue?: string;
  image: string;
  description?: string;
  lat?: number;
  lng?: number;
  ticketTiers?: TicketTier[];
  slug?: string;
}

declare global {
  interface Window { PaystackPop?: any }
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Phone validation helper
const isValidPhone = (phone: string): boolean => {
  // Basic phone validation - adjust for your country
  const phoneRegex = /^[+]?[\d\s-]{10,}$/;
  return phoneRegex.test(phone.trim());
};

// Helper function to parse price
const parsePrice = (price: string | number): { amount: number; isFree: boolean } => {
  if (typeof price === 'number') {
    return { amount: price, isFree: price === 0 };
  }
  
  if (typeof price === 'string') {
    const cleaned = price.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleaned) || 0;
    const lowerPrice = price.toLowerCase();
    
    // Check for "free" text or zero amount
    if (lowerPrice.includes('free') || amount === 0) {
      return { amount: 0, isFree: true };
    }
    
    return { amount, isFree: false };
  }
  
  return { amount: 0, isFree: true };
};

// Helper to check if tier is sold out
const isTierSoldOut = (tier: TicketTier): boolean => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  
  // If available is undefined/null, it's unlimited - not sold out
  if (available == null) return false;
  
  // Check if sold out
  return sold >= available;
};

// Get available tickets for a tier
const getAvailableTickets = (tier: TicketTier): number => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  
  // If available is undefined/null, it's unlimited
  if (available == null) return Infinity;
  
  return Math.max(0, available - sold);
};

export default function EventDetails() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingTier, setBuyingTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    fullName: "", 
    email: "", 
    phone: "" 
  });
  const [formErrors, setFormErrors] = useState({
    fullName: false,
    email: false,
    phone: false
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.sahmtickethub.online';

  // Fetch Event
  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching event for slug:", slug);
        
        // FIRST: Try to fetch by slug directly
        const { data: slugData, error: slugError } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!slugError && slugData) {
          console.log("Found by slug:", slugData);
          const eventData = parseEventData(slugData);
          setEvent(eventData);
          setNotFound(false);
          return;
        }

        // SECOND: If not found by slug, check if it's a UUID format
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        
        if (isUuid) {
          console.log("Parameter is UUID, trying by ID:", slug);
          const { data: idData, error: idError } = await supabase
            .from("events")
            .select("*")
            .eq("id", slug)
            .single();

          if (!idError && idData) {
            console.log("Found by ID:", idData);
            const eventData = parseEventData(idData);
            setEvent(eventData);
            setNotFound(false);
            
            // If found by ID and has a slug, redirect to slug URL for better UX
            if (eventData.slug && eventData.slug !== slug) {
              navigate(`/event/${eventData.slug}`, { replace: true });
            }
            return;
          }
        }

        // THIRD: Try the OR query as a last resort
        console.log("Trying OR query as fallback");
        const { data: orData, error: orError } = await supabase
          .from("events")
          .select("*")
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .single();

        if (!orError && orData) {
          console.log("Found by OR query:", orData);
          const eventData = parseEventData(orData);
          setEvent(eventData);
          setNotFound(false);
          
          // Redirect to slug URL if found by ID in OR query
          if (eventData.slug && eventData.slug !== slug) {
            navigate(`/event/${eventData.slug}`, { replace: true });
          }
          return;
        }

        // If nothing worked
        console.error("Event not found with any method");
        setNotFound(true);
        throw new Error("Event not found");
        
      } catch (err) {
        console.error("Error fetching event:", err);
        setEvent(null);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug, navigate]);

  // Helper function to parse event data - IMPROVED VERSION
  const parseEventData = (data: any): EventType => {
    // Parse ticket tiers - IMPROVED VERSION
    let ticketTiers: TicketTier[] = [];
    const rawTiers = data.ticketTiers;

    console.log("Raw ticket tiers from DB:", rawTiers);

    if (rawTiers) {
      try {
        // Case 1: Already an array
        if (Array.isArray(rawTiers)) {
          ticketTiers = rawTiers.filter(tier => tier && typeof tier === 'object').map(tier => ({
            name: tier.name || tier.tier_name || "General Admission",
            price: tier.price || tier.tier_price || 0,
            description: tier.description || tier.tier_description,
            available: tier.available ?? tier.quantity_available ?? tier.total_tickets,
            sold: tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0,
            quantity_available: tier.quantity_available ?? tier.available ?? tier.total_tickets,
            quantity_sold: tier.quantity_sold ?? tier.sold ?? tier.tickets_sold ?? 0,
            tickets_sold: tier.tickets_sold,
            total_tickets: tier.total_tickets
          }));
        }
        // Case 2: JSON string
        else if (typeof rawTiers === "string") {
          const parsed = JSON.parse(rawTiers || "[]");
          if (Array.isArray(parsed)) {
            ticketTiers = parsed.filter(tier => tier && typeof tier === 'object').map(tier => ({
              name: tier.name || tier.tier_name || "General Admission",
              price: tier.price || tier.tier_price || 0,
              description: tier.description || tier.tier_description,
              available: tier.available ?? tier.quantity_available ?? tier.total_tickets,
              sold: tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0,
              quantity_available: tier.quantity_available ?? tier.available ?? tier.total_tickets,
              quantity_sold: tier.quantity_sold ?? tier.sold ?? tier.tickets_sold ?? 0,
              tickets_sold: tier.tickets_sold,
              total_tickets: tier.total_tickets
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to parse ticket tiers:", err);
        // Fallback: create a default tier
        ticketTiers = [{
          name: "General Admission",
          price: 0,
          description: "Standard admission ticket",
          available: undefined,
          sold: 0
        }];
      }
    }

    // If no tiers found, create a default one
    if (ticketTiers.length === 0) {
      ticketTiers = [{
        name: "General Admission",
        price: 0,
        description: "Standard admission ticket",
        available: undefined,
        sold: 0
      }];
    }

    console.log("Parsed ticket tiers:", ticketTiers);

    return {
      id: data.id,
      title: data.title,
      date: data.date,
      time: data.time,
      location: data.location,
      address: data.address,
      venue: data.venue,
      image: data.image || data.cover_image || "https://via.placeholder.com/800x600?text=Event+Image",
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      ticketTiers,
      slug: data.slug || null,
    };
  };

  // Debug event data
  useEffect(() => {
    if (event) {
      console.log("EVENT DETAILS DEBUG:", {
        title: event.title,
        hasTicketTiers: !!event.ticketTiers,
        ticketTiersCount: event.ticketTiers?.length || 0,
        ticketTiers: event.ticketTiers?.map(tier => ({
          name: tier.name,
          price: tier.price,
          available: tier.available,
          sold: tier.sold,
          quantity_available: tier.quantity_available,
          quantity_sold: tier.quantity_sold,
          isSoldOut: isTierSoldOut(tier),
          availableTickets: getAvailableTickets(tier)
        }))
      });
    }
  }, [event]);

  // Set document title when event is loaded
  useEffect(() => {
    if (event) {
      document.title = `${event.title} | SahmTicketHub`;
    } else if (!loading) {
      document.title = "Event Not Found | SahmTicketHub";
    }
    
    // Reset title when component unmounts
    return () => {
      document.title = "SahmTicketHub - Discover Events";
    };
  }, [event, loading]);

  // Initialize quantities
  useEffect(() => {
    if (!event?.ticketTiers) return;
    const initQuantities: { [key: string]: number } = {};
    event.ticketTiers.forEach(tier => {
      if (tier.name) {
        initQuantities[tier.name] = 1;
      }
    });
    setQuantities(initQuantities);
  }, [event]);

  // Load Paystack script
  useEffect(() => {
    if (!showCheckout) return;
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [showCheckout]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );

  if (notFound || !event)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist or has been removed.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all"
            >
              Browse All Events
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="bg-white border-2 border-purple-600 text-purple-600 font-bold py-3 px-6 rounded-2xl hover:bg-purple-50 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "long",
  });

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "Time TBD";
    if (timeStr.includes(" ") || timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
      return timeStr.trim();
    }
    const [hour, minute] = timeStr.split(":").map(Number);
    if (isNaN(hour)) return timeStr;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${(minute || 0).toString().padStart(2, "0")} ${period}`;
  };

  const handleQuantityChange = (tierName: string, increment: boolean) => {
    setQuantities(prev => ({
      ...prev,
      [tierName]: Math.max(1, (prev[tierName] || 1) + (increment ? 1 : -1)),
    }));
  };

  const handleBuyTicket = (tier: TicketTier) => {
    if (!tier.name) return;
    
    setBuyingTier(tier.name);
    setTimeout(() => {
      setCheckoutData({ 
        orderId: `ORD-${Date.now()}`, 
        tier, 
        quantity: quantities[tier.name] || 1 
      });
      setShowCheckout(true);
      setBuyingTier(null);
    }, 300);
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setCheckoutData(null);
    setFormData({ fullName: "", email: "", phone: "" });
    setFormErrors({ fullName: false, email: false, phone: false });
    setCheckoutLoading(false);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors = {
      fullName: !formData.fullName.trim(),
      email: !isValidEmail(formData.email),
      phone: !isValidPhone(formData.phone)
    };
    
    setFormErrors(errors);
    
    if (errors.fullName || errors.email || errors.phone) {
      return false;
    }
    
    return true;
  };

  // Calculate totals
  const cleanPrice = checkoutData?.tier.price ? 
    parsePrice(checkoutData.tier.price).amount : 0;
  const totalAmount = cleanPrice * (checkoutData?.quantity || 1);
  const formattedTotal = totalAmount === 0 
    ? "FREE" 
    : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(totalAmount);

  // Complete Paystack + Backend Integration - FIXED VERSION
  const initializePaystack = async () => {
    // Validate form first
    if (!validateForm()) {
      setCheckoutLoading(false);
      return;
    }

    setCheckoutLoading(true);

    // Handle FREE tickets
    if (totalAmount <= 0) {
      try {
        const freeRef = `FREE-${checkoutData.orderId}-${Date.now()}`;
        const currentTime = new Date().toISOString();

        // 1. Save to Supabase WITH EMAIL
        const ticketPromises = [];
        for (let i = 0; i < (checkoutData.quantity || 1); i++) {
          const qrData = `${event.id}|${checkoutData.tier.name}|${Date.now()}|${i}|${Math.random().toString(36).substring(2, 6)}`;
          const qr_code_url = await QRCode.toDataURL(qrData);

          ticketPromises.push(
            supabase.from("tickets").insert({
              event_id: event.id,
              full_name: formData.fullName.trim(),
              email: formData.email.trim(), // EMAIL INCLUDED
              phone: formData.phone.trim(),
              qr_code_url,
              ticket_type: checkoutData.tier.name,
              price: 0,
              reference: freeRef,
              purchased_at: currentTime // ADD TIMESTAMP
            })
          );
        }

        // Wait for all tickets to be saved
        await Promise.all(ticketPromises);

        // 2. Send Email + PDF
        try {
          const emailResponse = await fetch(`${API_URL}/api/tickets/send-with-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.email.trim(),
              name: formData.fullName.trim(),
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: formatTime(event.time || ""),
              eventVenue: event.venue || event.location,
              tickets: [{
                ticketType: checkoutData.tier.name,
                quantity: checkoutData.quantity,
                amount: formattedTotal,
                codes: Array(checkoutData.quantity).fill(0).map((_, i) => `${freeRef}-${i + 1}`)
              }],
              orderId: freeRef
            })
          });

          if (!emailResponse.ok) {
            console.warn("Email sending failed, but ticket was created");
          }
        } catch (emailErr) {
          console.warn("Email sending error:", emailErr);
          // Continue even if email fails
        }

        closeCheckout();
        navigate(
          `/bag/${checkoutData.orderId}` +
          `?title=${encodeURIComponent(event.title)}` +
          `&location=${encodeURIComponent(event.location)}` +
          `&venue=${encodeURIComponent(event.venue || event.location)}` +
          `&date=${encodeURIComponent(event.date)}` +
          `&time=${encodeURIComponent(event.time || "")}` +
          `&lat=${event.lat || 0}` +
          `&lng=${event.lng || 0}` +
          `&type=${encodeURIComponent(checkoutData.tier.name)}` +
          `&qty=${checkoutData.quantity}` +
          `&price=${formattedTotal}` +
          `&ref=${freeRef}` +
          `&email=${encodeURIComponent(formData.email.trim())}` +
          `&name=${encodeURIComponent(formData.fullName.trim())}`
        );
      } catch (err) {
        console.error("Free ticket error:", err);
        alert("Could not issue free ticket. Please try again.");
        setCheckoutLoading(false);
      }
      return;
    }

    // Handle PAID tickets (Paystack)
    if (!window.PaystackPop) {
      alert("Payment gateway loading... Please try again.");
      setCheckoutLoading(false);
      return;
    }

    interface PaystackResponse {
      reference: string;
    }

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_KEY || "pk_test_...",
      email: formData.email.trim(),
      amount: totalAmount * 100,
      currency: "NGN",
      ref: checkoutData.orderId,
      metadata: {
        event_id: event.id,
        event_title: event.title,
        tier: checkoutData.tier.name,
        quantity: checkoutData.quantity,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(), // Include email in metadata too
      },
      callback: async (response: PaystackResponse) => {
        try {
          const currentTime = new Date().toISOString();
          
          // 1. Save tickets to Supabase WITH EMAIL
          const ticketPromises = [];
          for (let i = 0; i < (checkoutData.quantity || 1); i++) {
            const qrData = `${event.id}|${checkoutData.tier.name}|${Date.now()}|${i}`;
            const qr_code_url = await QRCode.toDataURL(qrData);

            ticketPromises.push(
              supabase.from("tickets").insert({
                event_id: event.id,
                full_name: formData.fullName.trim(),
                email: formData.email.trim(), // EMAIL INCLUDED
                phone: formData.phone.trim(),
                ticket_type: checkoutData.tier.name,
                price: cleanPrice,
                qr_code_url,
                reference: response.reference,
                purchased_at: currentTime // ADD TIMESTAMP
              })
            );
          }

          // Wait for all tickets to be saved
          await Promise.all(ticketPromises);

          // 2. Send Email + PDF via Backend
          try {
            await fetch(`${API_URL}/api/tickets/send-with-pdf`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: formData.email.trim(),
                name: formData.fullName.trim(),
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: formatTime(event.time || ""),
                eventVenue: event.venue || event.location,
                tickets: [{
                  ticketType: checkoutData.tier.name,
                  quantity: checkoutData.quantity,
                  amount: formattedTotal,
                  codes: Array(checkoutData.quantity).fill(0).map((_, i) => `${response.reference}-${i + 1}`)
                }],
                orderId: response.reference
              })
            });
          } catch (emailErr) {
            console.warn("Email sending failed:", emailErr);
            // Continue even if email fails
          }

          closeCheckout();
          navigate(
            `/bag/${checkoutData.orderId}` +
            `?title=${encodeURIComponent(event.title)}` +
            `&location=${encodeURIComponent(event.location)}` +
            `&venue=${encodeURIComponent(event.venue || event.location)}` +
            `&date=${encodeURIComponent(event.date)}` +
            `&time=${encodeURIComponent(event.time || "")}` +
            `&lat=${event.lat || 0}` +
            `&lng=${event.lng || 0}` +
            `&type=${encodeURIComponent(checkoutData.tier.name)}` +
            `&qty=${checkoutData.quantity}` +
            `&price=${formattedTotal}` +
            `&ref=${response.reference}` +
            `&email=${encodeURIComponent(formData.email.trim())}` +
            `&name=${encodeURIComponent(formData.fullName.trim())}`
          );
        } catch (err) {
          console.error("Post-payment error:", err);
          alert("Payment succeeded but there was an issue saving your ticket. Please contact support with your reference: " + response.reference);
          setCheckoutLoading(false);
        }
      },
      onClose: () => {
        console.log("Payment window closed");
        setCheckoutLoading(false);
      },
    });

    handler.openIframe ? handler.openIframe() : handler();
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    initializePaystack();
  };

  // Handle input changes with validation
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-600">
          <Link to="/events" className="text-purple-600 hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Events
          </Link>
          <span className="mx-2">/</span>
          <span className="font-semibold text-gray-800 truncate">{event.title}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative">
        <div className="h-96 md:h-[500px] relative overflow-hidden">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="relative -mt-32 max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
          >
            <h1 className="text-4xl md:text-6xl font-black mb-8">{event.title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 bg-purple-50 rounded-2xl p-6">
                <Calendar className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="text-xl font-bold">{formatDate(event.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-pink-50 rounded-2xl p-6">
                <Clock className="w-10 h-10 text-pink-600" />
                <div>
                  <p className="text-gray-600">Time</p>
                  <p className="text-xl font-bold">{formatTime(event.time || "")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-indigo-50 rounded-2xl p-6">
                <MapPin className="w-10 h-10 text-indigo-600" />
                <div>
                  <p className="text-gray-600">Location</p>
                  <p className="text-xl font-bold">{event.location}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-12">
              {/* About */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-xl"
              >
                <h2 className="text-3xl font-black mb-6">About This Event</h2>
                <p className="text-lg text-gray-700">{event.description || "An amazing night of music and vibes!"}</p>
              </motion.div>

              {/* Ticket Tiers - ALWAYS SHOW THIS SECTION */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl overflow-visible"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                  <h2 className="text-3xl font-black">Get Your Ticket</h2>
                </div>
                <div className="p-8 space-y-6">
                  {/* ALWAYS SHOW AT LEAST ONE TICKET TIER */}
                  {event.ticketTiers && event.ticketTiers.length > 0 ? (
                    event.ticketTiers.map((tier, idx) => {
                      const isSoldOut = isTierSoldOut(tier);
                      const availableTickets = getAvailableTickets(tier);
                      const isUnlimited = availableTickets === Infinity;
                      const isLowStock = !isUnlimited && availableTickets > 0 && availableTickets <= 10;
                      
                      // Parse price
                      const priceInfo = parsePrice(tier.price);
                      const isFree = priceInfo.isFree;
                      
                      // Format price display
                      const displayPrice = isFree ? 'FREE' : 
                        typeof tier.price === 'string' ? tier.price : 
                        `₦${tier.price.toLocaleString()}`;

                      return (
                        <div
                          key={tier.name || idx}
                          className={`border-2 rounded-3xl p-6 transition flex flex-col md:flex-row md:justify-between md:items-center gap-4 ${
                            isSoldOut 
                              ? 'border-gray-300 bg-gray-50' 
                              : 'border-purple-200 hover:border-purple-500'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:gap-6">
                            <div>
                              <h3 className="text-2xl font-black">{tier.name}</h3>
                              {tier.description && <p className="text-gray-600">{tier.description}</p>}
                              <div className="mt-1 flex flex-wrap gap-2 items-center">
                                {isSoldOut && (
                                  <span className="text-red-600 font-bold text-sm bg-red-50 px-3 py-1 rounded-full">
                                    Sold Out
                                  </span>
                                )}
                                {!isSoldOut && isLowStock && (
                                  <span className="text-orange-600 font-bold text-sm bg-orange-50 px-3 py-1 rounded-full">
                                    🔥 Only {availableTickets} left!
                                  </span>
                                )}
                                {!isSoldOut && isUnlimited && (
                                  <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">
                                    ✓ Unlimited tickets
                                  </span>
                                )}
                                {!isSoldOut && !isUnlimited && !isLowStock && availableTickets > 10 && (
                                  <span className="text-gray-500 text-sm">
                                    {availableTickets} tickets available
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-3xl font-black mt-2 md:mt-0 ${
                              isFree ? 'text-emerald-600' : isSoldOut ? 'text-gray-400' : 'text-purple-600'
                            }`}>
                              {displayPrice}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-4 md:mt-0">
                            <button
                              onClick={() => handleQuantityChange(tier.name, false)}
                              className="w-12 h-12 rounded-full border-2 hover:bg-gray-100 disabled:opacity-50 transition"
                              disabled={isSoldOut || (quantities[tier.name] || 1) <= 1}
                            >
                              −
                            </button>
                            <span className="text-xl font-bold w-16 text-center">
                              {quantities[tier.name] || 1}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(tier.name, true)}
                              className="w-12 h-12 rounded-full border-2 hover:bg-gray-100 disabled:opacity-50 transition"
                              disabled={isSoldOut || (!isUnlimited && availableTickets !== undefined && (quantities[tier.name] || 1) >= availableTickets)}
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleBuyTicket(tier)}
                            disabled={isSoldOut || buyingTier === tier.name}
                            className={`w-full md:w-auto font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed mt-4 md:mt-0 transition-all ${
                              isSoldOut
                                ? 'bg-gray-400 text-white'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105'
                            }`}
                          >
                            {isSoldOut ? (
                              <>
                                <X className="w-6 h-6" /> Sold Out
                              </>
                            ) : buyingTier === tier.name ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : isFree ? (
                              <>
                                <Ticket className="w-6 h-6" /> Get Free Ticket
                              </>
                            ) : (
                              <>
                                <Ticket className="w-6 h-6" /> Buy Now
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    // FALLBACK: Show a default ticket tier if none exist
                    <div className="border-2 border-purple-200 rounded-3xl p-6 transition flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-purple-500">
                      <div className="flex flex-col md:flex-row md:items-center md:gap-6">
                        <div>
                          <h3 className="text-2xl font-black">General Admission</h3>
                          <p className="text-gray-600">Standard admission to the event</p>
                          <p className="mt-1 text-gray-500">Tickets available soon</p>
                        </div>
                        <span className="text-3xl font-black mt-2 md:mt-0 text-purple-600">
                          Coming Soon
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <button
                          className="w-12 h-12 rounded-full border-2 hover:bg-gray-100 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          −
                        </button>
                        <span className="text-xl font-bold w-16 text-center">1</span>
                        <button
                          className="w-12 h-12 rounded-full border-2 hover:bg-gray-100 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          +
                        </button>
                      </div>

                      <button
                        disabled
                        className="w-full md:w-auto font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 opacity-50 cursor-not-allowed mt-4 md:mt-0 bg-gray-300 text-white"
                      >
                        <Ticket className="w-6 h-6" /> Check Back Soon
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-10">
              {/* Venue & Map */}
              {(event.venue || event.lat) && (
                <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
                    <h3 className="text-2xl font-black flex items-center gap-3">
                      <MapPin className="w-8 h-8" /> Venue
                    </h3>
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-bold">{event.venue || "Venue TBC"}</h4>
                    <p className="text-gray-600">{event.address || event.location}</p>
                  </div>

                  {event.lat && event.lng && (
                    <div className="h-72 md:h-96">
                      <EventMap lat={event.lat} lng={event.lng} venue={event.venue || event.title} />
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {event.lat && event.lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block w-full bg-blue-600 text-white text-center font-bold py-4 rounded-2xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-5 h-5" /> Get Directions
                      </a>
                    )}
                    {event.lat && event.lng && (
                      <a 
                        href={`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${event.lat}&dropoff[longitude]=${event.lng}&dropoff[nickname]=${encodeURIComponent(event.venue || "Event")}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block w-full bg-black text-white text-center font-bold py-4 rounded-2xl hover:bg-gray-900 transition flex items-center justify-center gap-2"
                      >
                        <Car className="w-5 h-5" /> Ride with Uber
                      </a>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Share */}
              <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
                <Share2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
                <p className="text-2xl font-black">Share This Event</p>
                <p className="text-gray-600 mb-4">Let your friends know!</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/event/${event.slug || event.id}`;
                      navigator.share?.({
                        title: event.title,
                        text: `Check out ${event.title} on SahmTicketHub!`,
                        url: shareUrl,
                      }).catch(() => {
                        navigator.clipboard.writeText(shareUrl);
                        alert("Link copied to clipboard!");
                      });
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-lg transition"
                  >
                    Share Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {showCheckout && checkoutData && (
        <Modal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
            onClick={closeCheckout}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black">Checkout</h2>
                  <p className="text-xl opacity-90">
                    {checkoutData.tier.name} × {checkoutData.quantity}
                  </p>
                </div>
                <button
                  onClick={closeCheckout}
                  className="p-2 hover:bg-white/20 rounded-xl"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* Form + Order Summary */}
              <div className="p-8">
                <form onSubmit={handleCheckoutSubmit}>
                  <div className="space-y-6">
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.fullName && (
                        <p className="text-red-500 text-sm mt-1 ml-1">Please enter your full name</p>
                      )}
                    </div>

                    <div>
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          formErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                        pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                        title="Please enter a valid email address"
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-sm mt-1 ml-1">Please enter a valid email address</p>
                      )}
                    </div>

                    <div>
                      <input
                        type="tel"
                        placeholder="Phone Number *"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-5 py-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          formErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-sm mt-1 ml-1">Please enter a valid phone number</p>
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Order Summary
                    </h3>
                    <div className="flex justify-between">
                      <span>
                        {checkoutData.tier.name} × {checkoutData.quantity}
                      </span>
                      <span>{formattedTotal}</span>
                    </div>

                    <div className="flex flex-col gap-2 text-gray-600">
                      <span>Payment Methods:</span>
                      <div className="flex gap-4 mt-1">
                        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl shadow">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          <span className="text-xs">Card</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl shadow">
                          <Smartphone className="w-5 h-5 text-purple-600" />
                          <span className="text-xs">USSD</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl shadow">
                          <Building2 className="w-5 h-5 text-purple-600" />
                          <span className="text-xs">Bank</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl shadow">
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                          <span className="text-xs">OPAY</span>
                        </div>
                      </div>
                    </div>

                    <hr className="my-2" />
                    <div className="flex justify-between text-xl font-bold text-purple-600">
                      <span>Total</span>
                      <span>{formattedTotal}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl py-5 rounded-3xl flex justify-center items-center gap-2 hover:shadow-xl transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : totalAmount === 0 ? (
                      "Get Free Ticket"
                    ) : (
                      `Pay ${formattedTotal} securely`
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </Modal>
      )}
    </>
  );
}