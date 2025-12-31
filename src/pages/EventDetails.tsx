// src/pages/EventDetails.tsx - PRODUCTION READY VERSION
'use client';

import { useNavigate, useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  Navigation,
  Tag,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Star,
  Shield,
  Zap,
  Heart,
  Globe,
  Phone,
  Mail,
  Download
} from "lucide-react";
import EventMap from "../components/EventMap";
import { supabase } from "../lib/supabaseClient";
import QRCode from "qrcode";
import Modal from "../components/Modal";

// --- TYPES ---
interface TicketTier {
  id?: string;
  name: string;
  price: string | number;
  description?: string;
  available?: number;
  sold?: number;
  quantity_available?: number;
  quantity_sold?: number;
  tickets_sold?: number;
  total_tickets?: number;
  is_active?: boolean;
}

interface EventType {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  venue?: string;
  image: string;
  description?: string;
  lat?: number;
  lng?: number;
  ticketTiers?: TicketTier[];
  slug?: string;
  organizer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

interface TicketTierRow {
  id: string;
  tier_name: string;
  is_active?: boolean;
  quantity_total?: number;
  quantity_sold?: number;
}

declare global {
  interface Window { 
    PaystackPop?: any;
    dataLayer?: any[];
  }
}

// --- CONSTANTS ---
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
const API_URL = import.meta.env.VITE_API_URL || 'https://api.sahmtickethub.online';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_KEY || '';

// Ride-hailing services
const RIDE_SERVICES = [
  {
    id: 'uber',
    name: 'Uber',
    color: 'bg-black hover:bg-gray-800',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    ),
    getUrl: (lat: number, lng: number, address: string, title: string) => 
      `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(title)}`
  },
  {
    id: 'bolt',
    name: 'Bolt',
    color: 'bg-green-600 hover:bg-green-700',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    getUrl: (lat: number, lng: number, address: string) =>
      `https://bolt.eu/en-ng/ride/?pickup=Current%20Location&destination=${encodeURIComponent(address)}&destination_lat=${lat}&destination_lng=${lng}`
  },
  {
    id: 'indrive',
    name: 'inDrive',
    color: 'bg-orange-600 hover:bg-orange-700',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    getUrl: (lat: number, lng: number, address: string) =>
      `https://indriver.com/en/ride/?address=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}`
  }
];

// --- UTILITY FUNCTIONS ---
const parsePrice = (price: string | number): { amount: number; isFree: boolean } => {
  if (typeof price === 'number') {
    return { amount: price, isFree: price === 0 };
  }
  
  if (typeof price === 'string') {
    const cleaned = price.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleaned) || 0;
    const lowerPrice = price.toLowerCase();
    
    if (lowerPrice.includes('free') || amount === 0) {
      return { amount: 0, isFree: true };
    }
    
    return { amount, isFree: false };
  }
  
  return { amount: 0, isFree: true };
};

const isTierSoldOut = (tier: TicketTier): boolean => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  
  if (available == null || available === 0) return false;
  return sold >= available;
};

const getAvailableTickets = (tier: TicketTier): number => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  
  if (available == null || available === 0) {
    const priceInfo = parsePrice(tier.price);
    return priceInfo.isFree ? 100 : 50;
  }
  
  return Math.max(0, available - sold);
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[\d\s-]{10,}$/;
  return phoneRegex.test(phone.trim());
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  } catch {
    return "Date TBD";
  }
};

const formatTime = (timeStr?: string): string => {
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

const getTierBadgeColor = (tier: TicketTier): string => {
  const { isFree, amount } = parsePrice(tier.price);
  
  if (isFree) return "bg-gradient-to-r from-emerald-500 to-teal-600";
  if (amount < 2000) return "bg-gradient-to-r from-blue-500 to-cyan-600";
  if (amount < 5000) return "bg-gradient-to-r from-purple-500 to-pink-600";
  if (amount < 10000) return "bg-gradient-to-r from-orange-500 to-amber-600";
  return "bg-gradient-to-r from-red-500 to-rose-600";
};

const getTierIcon = (tier: TicketTier): string => {
  const { isFree, amount } = parsePrice(tier.price);
  
  if (isFree) return "🎟️";
  if (amount < 2000) return "🎫";
  if (amount < 5000) return "⭐";
  if (amount < 10000) return "👑";
  return "💎";
};

// --- HELPER FUNCTIONS ---
const insertTicket = async (ticketData: any) => {
  try {
    console.log("🎫 [INSERT] Starting ticket insertion...");

    if (!ticketData.phone || ticketData.phone.trim() === '') {
      throw new Error("Phone number is required");
    }

    const insertData = {
      event_id: ticketData.event_id,
      tier_id: ticketData.tier_id,
      full_name: ticketData.full_name?.trim() || null,
      email: ticketData.email?.trim() || null,
      phone: ticketData.phone.trim(),
      qr_code_url: ticketData.qr_code_url || null,
      price: ticketData.price || 0,
      reference: ticketData.reference || null,
      order_id: ticketData.order_id || null,
      purchased_at: ticketData.purchased_at || new Date().toISOString(),
      created_at: ticketData.created_at || new Date().toISOString(),
      buyer_email: ticketData.email?.trim() || null,
      tier_name: ticketData.tier_name?.trim() || null,
      tier_description: ticketData.tier_description?.trim() || null,
      quantity: ticketData.quantity || 1,
      ticket_type: ticketData.ticket_type?.trim() || ticketData.tier_name?.trim() || null
    };

    const { data, error } = await supabase
      .from("tickets")
      .insert(insertData, { returning: 'minimal' });

    if (error) throw error;

    console.log("✅ [INSERT] Success!");
    return data;

  } catch (err: any) {
    console.error("❌ [INSERT] Failed:", err);
    throw err;
  }
};

const updateTierQuantity = async (tierId: string, quantity: number) => {
  try {
    const { data: tier, error: fetchError } = await supabase
      .from("ticketTiers")
      .select("quantity_sold")
      .eq("id", tierId)
      .single();
    
    if (fetchError) return;
    
    const newQuantitySold = (tier.quantity_sold || 0) + quantity;
    const { error: updateError } = await supabase
      .from("ticketTiers")
      .update({ quantity_sold: newQuantitySold })
      .eq("id", tierId);
    
    if (updateError) {
      console.error("Failed to update tier quantity:", updateError);
    }
    
  } catch (err) {
    console.error("Failed to update tier:", err);
  }
};

const sendTicketEmail = async (reference: string, email: string, name: string, event: EventType, tier: TicketTier, quantity: number) => {
  try {
    const response = await fetch(`${API_URL}/api/tickets/send-with-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        name: name,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: formatTime(event.time || ""),
        eventVenue: event.venue || event.location,
        tickets: [{
          ticketType: tier.name,
          quantity: quantity,
          amount: parsePrice(tier.price).isFree ? "FREE" : `₦${parsePrice(tier.price).amount.toLocaleString()}`,
          codes: Array(quantity).fill(0).map((_, i) => `${reference}-${i + 1}`)
        }],
        orderId: reference
      })
    });

    if (!response.ok) {
      console.warn("Failed to send email:", await response.text());
    }
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

// --- MAIN COMPONENT ---
export default function EventDetails() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [imageError, setImageError] = useState(false);

  // --- MEMOIZED VALUES ---
  const totalAmount = useMemo(() => {
    if (!checkoutData || !selectedTier) return 0;
    const priceInfo = parsePrice(selectedTier.price);
    return priceInfo.amount * (checkoutData.quantity || 1);
  }, [checkoutData, selectedTier]);

  const formattedTotal = useMemo(() => {
    if (totalAmount === 0) return "FREE";
    return new Intl.NumberFormat("en-NG", { 
      style: "currency", 
      currency: "NGN", 
      minimumFractionDigits: 0 
    }).format(totalAmount);
  }, [totalAmount]);

  // --- EFFECTS ---
  // Load event data
  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        let eventData;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        
        // Try slug first, then UUID
        const query = supabase
          .from("events")
          .select(`
            id,
            title,
            date,
            time,
            location,
            venue,
            image,
            description,
            lat,
            lng,
            slug
          `)
          .eq(isUuid ? "id" : "slug", slug)
          .single();

        const { data, error } = await query;

        if (error || !data) {
          throw new Error("Event not found");
        }

        eventData = data;

        // Fetch ticket tiers
        const { data: ticketTiersData } = await supabase
          .from("ticketTiers")
          .select(`
            id,
            tier_name,
            price,
            description,
            quantity_total,
            quantity_sold,
            is_active
          `)
          .eq("event_id", eventData.id)
          .eq("is_active", true);

        const ticketTiers: TicketTier[] = (ticketTiersData || []).map((t: any) => ({
          id: t.id,
          name: t.tier_name,
          price: t.price ?? 0,
          description: t.description ?? "",
          quantity_available: t.quantity_total ?? null,
          quantity_sold: t.quantity_sold ?? 0,
          is_active: t.is_active ?? true
        }));

        // Set default tier if none found
        const displayTiers = ticketTiers.length > 0 ? ticketTiers : [{
          id: "default-" + eventData.id,
          name: "General Admission",
          price: 0,
          description: "Standard admission ticket",
          quantity_available: 100,
          quantity_sold: 0,
          is_active: true
        }];

        setEvent({
          ...eventData,
          ticketTiers: displayTiers
        });
        setNotFound(false);

        // Initialize quantities
        const initQuantities: { [key: string]: number } = {};
        displayTiers.forEach(tier => {
          if (tier.id) {
            initQuantities[tier.id] = 1;
          }
        });
        setQuantities(initQuantities);

      } catch (err) {
        console.error("Event fetch error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  // Set document title
  useEffect(() => {
    if (event) {
      document.title = `${event.title} | SahmTicketHub`;
    } else if (!loading) {
      document.title = "Event Not Found | SahmTicketHub";
    }
    
    return () => {
      document.title = "SahmTicketHub - Discover Events";
    };
  }, [event, loading]);

  // Load Paystack script when needed
  useEffect(() => {
    if (!showCheckout || totalAmount === 0) return;
    
    if (window.PaystackPop) return;

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => console.log("Paystack script loaded");
    script.onerror = () => console.error("Failed to load Paystack script");
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [showCheckout, totalAmount]);

  // --- EVENT HANDLERS ---
  const handleBuyTicket = useCallback(async (tier: TicketTier) => {
    if (loading || !event?.id || !tier.id) {
      alert("Event information is not loaded yet.");
      return;
    }

    console.log("🛒 Starting purchase:", { eventId: event.id, tierName: tier.name });

    const checkoutInfo = {
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tier: {
        ...tier,
        id: tier.id,
        name: tier.name
      },
      quantity: quantities[tier.id] || 1,
    };

    setSelectedTier(tier);
    setCheckoutData(checkoutInfo);
    setShowCheckout(true);
  }, [loading, event, quantities]);

  const closeCheckout = useCallback(() => {
    setShowCheckout(false);
    setCheckoutData(null);
    setFormData({ fullName: "", email: "", phone: "" });
    setFormErrors({ fullName: false, email: false, phone: false });
    setCheckoutLoading(false);
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors = {
      fullName: !formData.fullName.trim(),
      email: !isValidEmail(formData.email),
      phone: !isValidPhone(formData.phone)
    };
    setFormErrors(errors);
    return !errors.fullName && !errors.email && !errors.phone;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: false }));
    }
  }, [formErrors]);

  const handleQuantityChange = useCallback((tierId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[tierId] ?? 1;
      const newValue = Math.max(1, current + delta);

      const tier = event?.ticketTiers?.find(t => t.id === tierId);
      if (!tier) return prev;

      const available = getAvailableTickets(tier);
      if (available < newValue) {
        alert(`Only ${available} tickets available for this tier`);
        return prev;
      }

      return {
        ...prev,
        [tierId]: newValue
      };
    });
  }, [event]);

// Replace your handleCheckoutSubmit function with this:

const handleCheckoutSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!checkoutData || !event || !validateForm()) {
    console.error("Checkout validation failed");
    return;
  }

  setCheckoutLoading(true);

  try {
    const tier = event.ticketTiers?.find(t => t.id === checkoutData.tier.id);
    if (!tier || !tier.id) {
      throw new Error("Invalid ticket tier selection");
    }

    const tierId = tier.id;
    const tierName = tier.name;
    const quantity = checkoutData.quantity || 1;
    const orderId = checkoutData.orderId;
    const currentTime = new Date().toISOString();

    // Stock check
    const { data: stockCheck, error: stockError } = await supabase
      .from("ticketTiers")
      .select("quantity_total, quantity_sold")
      .eq("id", tierId)
      .single();

    if (stockError || !stockCheck) throw new Error("Unable to verify ticket availability.");
    
    const remaining = (stockCheck.quantity_total || 0) - (stockCheck.quantity_sold || 0);
    if (remaining < quantity) {
      throw new Error(`Sold out! Only ${remaining} tickets left.`);
    }

    // Handle free tickets
    if (totalAmount === 0) {
      const freeRef = `FREE-${orderId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');
      
      const insertPromises = Array.from({ length: quantity }).map(async (_, i) => {
        const qrData = `${event.id}|${tierId}|${Date.now()}|${i}`;
        const qr_code_url = await QRCode.toDataURL(qrData);

        return insertTicket({
          event_id: event.id,
          tier_id: tierId,
          tier_name: tierName,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          ticket_type: tierName,
          price: 0,
          qr_code_url,
          reference: freeRef,
          order_id: orderId,
          purchased_at: currentTime,
          buyer_email: formData.email.trim(),
          created_at: currentTime,
        });
      });

      await Promise.all(insertPromises);
      await updateTierQuantity(tierId, quantity);
      await sendTicketEmail(freeRef, formData.email, formData.fullName, event, tier, quantity);

      const params = new URLSearchParams({
        free: "true",
        title: event.title,
        location: event.location,
        venue: event.venue || event.location,
        date: event.date,
        time: event.time || "6:00 PM",
        type: tierName,
        qty: quantity.toString(),
        price: "₦0",
        lat: event.lat?.toString() || "0",
        lng: event.lng?.toString() || "0"
      }).toString();

      closeCheckout();
      navigate(`/bag/${orderId}?${params}`);
      return;
    }

    // Handle paid tickets with Paystack
    if (!window.PaystackPop) {
      throw new Error("Payment gateway failed to load. Please refresh and try again.");
    }

    if (!PAYSTACK_PUBLIC_KEY || !PAYSTACK_PUBLIC_KEY.startsWith('pk_')) {
      throw new Error("Payment configuration error. Please contact support.");
    }

    const amountInKobo = Math.round(totalAmount * 100);
    const cleanEmail = formData.email.trim().toLowerCase();
    const uniqueRef = `TIX-${orderId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    // Store references for the callback
    const paymentData = {
      event,
      tierId,
      tierName,
      quantity,
      orderId,
      currentTime,
      totalAmount,
      formData: { ...formData },
      navigate,
      closeCheckout
    };

    // Create a regular function (not async) for the callback
    const handlePaymentSuccess = function(response: any) {
      console.log("💰 Payment successful:", response);
      
      // Create an async function to handle the success logic
      const processSuccess = async () => {
        try {
          const paidPromises = Array.from({ length: paymentData.quantity }).map(async (_, i) => {
            const qrData = `${paymentData.event.id}|${paymentData.tierId}|${response.reference}|${i}`;
            const qr_code_url = await QRCode.toDataURL(qrData);

            return insertTicket({
              event_id: paymentData.event.id,
              tier_id: paymentData.tierId,
              tier_name: paymentData.tierName,
              full_name: paymentData.formData.fullName.trim(),
              email: paymentData.formData.email.trim(),
              phone: paymentData.formData.phone.trim(),
              ticket_type: paymentData.tierName,
              price: paymentData.totalAmount / paymentData.quantity,
              qr_code_url,
              reference: response.reference,
              order_id: paymentData.orderId,
              purchased_at: paymentData.currentTime,
              buyer_email: paymentData.formData.email.trim(),
              created_at: paymentData.currentTime,
            });
          });

          await Promise.all(paidPromises);
          await updateTierQuantity(paymentData.tierId, paymentData.quantity);
          await sendTicketEmail(
            response.reference, 
            paymentData.formData.email, 
            paymentData.formData.fullName, 
            paymentData.event, 
            tier, 
            paymentData.quantity
          );

          const params = new URLSearchParams({
            paid: "true",
            ref: response.reference,
            title: paymentData.event.title,
            location: paymentData.event.location,
            venue: paymentData.event.venue || paymentData.event.location,
            date: paymentData.event.date,
            time: paymentData.event.time || "6:00 PM",
            type: paymentData.tierName,
            qty: paymentData.quantity.toString(),
            price: `₦${paymentData.totalAmount.toLocaleString()}`,
            lat: paymentData.event.lat?.toString() || "0",
            lng: paymentData.event.lng?.toString() || "0"
          }).toString();

          paymentData.closeCheckout();
          paymentData.navigate(`/bag/${paymentData.orderId}?${params}`);
        } catch (innerErr) {
          console.error("Database Insert Error:", innerErr);
          alert("Payment successful, but ticket generation failed. Contact support with ref: " + response.reference);
        }
      };
      
      // Start processing
      processSuccess();
    };

    // For onClose callback
    const handlePaymentClose = function() {
      console.log("Payment popup closed");
      setCheckoutLoading(false);
    };

    console.log("Setting up Paystack with:", {
      key: PAYSTACK_PUBLIC_KEY.trim().substring(0, 10) + "...",
      email: cleanEmail,
      amount: amountInKobo,
      ref: uniqueRef
    });

    // **FIX: Use regular function syntax, not arrow function**
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY.trim(),
      email: cleanEmail,
      amount: amountInKobo,
      currency: 'NGN',
      ref: uniqueRef,
      metadata: {
        custom_fields: [
          { display_name: "Event", variable_name: "event_name", value: event.title },
          { display_name: "Tier", variable_name: "tier_name", value: tierName },
          { display_name: "Quantity", variable_name: "quantity", value: quantity.toString() },
          { display_name: "Order ID", variable_name: "order_id", value: orderId }
        ]
      },
      callback: handlePaymentSuccess, // Use function reference
      onClose: handlePaymentClose     // Use function reference
    });

    console.log("Opening Paystack iframe...");
    handler.openIframe();

  } catch (err: any) {
    console.error("Checkout Failure:", err);
    alert(err.message || "An unexpected error occurred during checkout.");
    setCheckoutLoading(false);
  }
}, [checkoutData, event, formData, totalAmount, validateForm, closeCheckout, navigate]);

  const shareEvent = useCallback(async () => {
    if (!event) return;

    const shareData = {
      title: event.title,
      text: `Check out "${event.title}" on SahmTicketHub!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.log('Share cancelled:', err);
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Event link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [event]);

  const handleSelectTier = useCallback((tier: TicketTier) => {
    if (!tier.id) return;
    setSelectedTier(tier);
    if (!quantities[tier.id]) {
      setQuantities(prev => ({
        ...prev,
        [tier.id!]: 1,
      }));
    }
  }, [quantities]);

  // --- RENDER STATES ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-6">
          <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto" />
          <p className="text-lg text-purple-700 font-medium">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist or has been removed.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              Browse All Events
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="bg-white border-2 border-purple-600 text-purple-600 font-bold py-3 px-6 rounded-2xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-bold group"
              aria-label="Go back to events"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Events
            </button>
            
            <div className="flex items-center gap-4">
              <button
                onClick={shareEvent}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                title="Share Event"
                aria-label="Share event"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Event Image */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl"
            >
              <img
                src={imageError ? PLACEHOLDER_IMAGE : event.image}
                alt={event.title}
                className="w-full h-96 lg:h-[500px] object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {event.ticketTiers?.some(t => parsePrice(t.price).isFree) && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3" /> FREE TICKETS
                  </span>
                )}
                {event.ticketTiers?.some(t => parsePrice(t.price).amount >= 10000) && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> VIP AVAILABLE
                  </span>
                )}
              </div>
            </motion.div>

            {/* Event Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl"
            >
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-6">
                {event.title}
              </h1>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800">{formatDate(event.date)}</p>
                    <p className="text-gray-600">{formatTime(event.time)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800">{event.location}</p>
                    {event.venue && event.venue !== event.location && (
                      <p className="text-gray-600">{event.venue}</p>
                    )}
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">About This Event</h3>
                  <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
                </div>
              )}
            </motion.div>

            {/* Map Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-purple-600" />
                  Event Location
                </h3>
                
                <div className="relative">
                  <button
                    onClick={() => setShowRideOptions(!showRideOptions)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition"
                    aria-expanded={showRideOptions}
                    aria-label="Get a ride"
                  >
                    <Car className="w-4 h-4" />
                    Get a Ride
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showRideOptions && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-gray-900">Ride Services</span>
                          <button 
                            onClick={() => setShowRideOptions(false)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label="Close ride options"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {RIDE_SERVICES.map((service) => {
                            const location = event.venue || event.location;
                            const url = event.lat && event.lng 
                              ? service.getUrl(event.lat, event.lng, location, event.title)
                              : service.getUrl(0, 0, location, event.title);
                            
                            return (
                              <a
                                key={service.id}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-between p-3 ${service.color} text-white rounded-lg hover:shadow-md transition`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                    {service.icon}
                                  </div>
                                  <span className="font-bold">{service.name}</span>
                                </div>
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {event.lat && event.lng ? (
                <div className="h-64 rounded-2xl overflow-hidden mb-4">
                  <EventMap 
                    lat={event.lat} 
                    lng={event.lng} 
                    venue={event.venue}
                    title={event.title}
                  />
                </div>
              ) : (
                <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl flex flex-col items-center justify-center p-6 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Map Not Available</p>
                  <a 
                    href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-6 rounded-full hover:shadow-xl transition-all"
                  >
                    Search on Google Maps
                  </a>
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {RIDE_SERVICES.map((service) => {
                  const address = event.venue || event.location;
                  const url = event.lat && event.lng 
                    ? service.getUrl(event.lat, event.lng, address, event.title)
                    : service.getUrl(0, 0, address, event.title);
                  
                  return (
                    <a
                      key={service.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center justify-center p-3 ${service.color} text-white rounded-xl hover:shadow-lg transition`}
                      title={`Book ${service.name}`}
                    >
                      {service.icon}
                      <span className="text-xs mt-1 font-medium">{service.name}</span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Ticket Selection */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            {/* Ticket Selection Card */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-2xl sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900">
                  Select Your Ticket
                </h2>
                <div className="flex items-center gap-2 text-gray-600">
                  <Ticket className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {event.ticketTiers?.length || 0} options
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {event.ticketTiers?.map((tier, index) => {
                  if (!tier.id) return null;
                  
                  const { isFree, amount } = parsePrice(tier.price);
                  const soldOut = isTierSoldOut(tier);
                  const available = getAvailableTickets(tier);
                  const isSelected = selectedTier?.id === tier.id;
                  const badgeColor = getTierBadgeColor(tier);
                  const tierIcon = getTierIcon(tier);
                  const isLowStock = available > 0 && available <= 10;
                  
                  return (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: soldOut ? 1 : 1.02 }}
                      onClick={() => !soldOut && handleSelectTier(tier)}
                      className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        soldOut 
                          ? 'bg-gray-50 border-gray-200 opacity-75 cursor-not-allowed' 
                          : isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-disabled={soldOut}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          !soldOut && handleSelectTier(tier);
                        }
                      }}
                    >
                      {soldOut && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10">
                          <span className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-full">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl" aria-hidden="true">{tierIcon}</span>
                            <h3 className="text-lg font-bold text-gray-900">
                              {tier.name}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-bold text-white rounded-full ${badgeColor}`}>
                              {isFree ? 'FREE' : `₦${amount.toLocaleString()}`}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 mb-3">
                            {tier.description || "Standard admission ticket"}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm">
                            {!soldOut && isLowStock && (
                              <span className="flex items-center gap-1 text-orange-600 font-bold">
                                <AlertCircle className="w-4 h-4" />
                                Only {available} left!
                              </span>
                            )}
                            
                            {!soldOut && !isLowStock && available > 10 && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Users className="w-4 h-4" />
                                {available} tickets available
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && !soldOut && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(tier.id!, -1);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="font-bold text-lg min-w-[2rem] text-center">
                              {quantities[tier.id] || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(tier.id!, 1);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                              disabled={available <= (quantities[tier.id] || 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Purchase Button */}
              {selectedTier && !isTierSoldOut(selectedTier) && selectedTier.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 pt-8 border-t border-gray-200"
                >
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Selected:</span>
                      <span className="font-bold text-lg">{selectedTier.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-bold text-lg">{quantities[selectedTier.id] || 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="text-2xl font-black text-purple-700">
                        {totalAmount === 0 ? "FREE" : `₦${totalAmount.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleBuyTicket(selectedTier)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                    aria-label={`Buy ${quantities[selectedTier.id] || 1} ${selectedTier.name} tickets`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Get Tickets Now
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">Instant Delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Guaranteed Entry</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {!selectedTier && (
                <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-600">Select a ticket option to continue</p>
                </div>
              )}
            </div>

            {/* Trust Signals */}
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-300" />
                Why Choose SahmTicketHub?
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>Zero fake tickets - 100% authentic tickets only</span>
                </li>
                <li className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>Instant payouts to event organizers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>QR code entry - fast & secure check-in</span>
                </li>
                <li className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>Real-time analytics for event insights</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-white/20">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Need a ride to the event?
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {RIDE_SERVICES.map((service) => (
                    <div key={service.id} className="flex items-center gap-2">
                      <div className={`w-6 h-6 ${service.color.split(' ')[0]} rounded flex items-center justify-center`}>
                        {service.icon}
                      </div>
                      <span className="text-sm">{service.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs opacity-75 mt-3">
                  Click "Get a Ride" button above to book transportation
                </p>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-white rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-800">Call Support</p>
                    <p className="text-gray-600">+234 900 000 0000</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-800">Email Support</p>
                    <p className="text-gray-600">support@sahmtickethub.online</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-800">Support Hours</p>
                    <p className="text-gray-600">24/7 via email, 8AM-8PM via phone</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

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
                  aria-label="Close checkout"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

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
                        aria-invalid={formErrors.fullName}
                        aria-describedby={formErrors.fullName ? "name-error" : undefined}
                      />
                      {formErrors.fullName && (
                        <p id="name-error" className="text-red-500 text-sm mt-1 ml-1">Please enter your full name</p>
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
                        aria-invalid={formErrors.email}
                        aria-describedby={formErrors.email ? "email-error" : undefined}
                      />
                      {formErrors.email && (
                        <p id="email-error" className="text-red-500 text-sm mt-1 ml-1">Please enter a valid email</p>
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
                        aria-invalid={formErrors.phone}
                        aria-describedby={formErrors.phone ? "phone-error" : undefined}
                      />
                      {formErrors.phone && (
                        <p id="phone-error" className="text-red-500 text-sm mt-1 ml-1">Please enter a valid phone number</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800">Order Summary</h3>
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
                      </div>
                    </div>

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
    </div>
  );
}