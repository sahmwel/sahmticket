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
  Navigation,
  Tag,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Star
} from "lucide-react";
import EventMap from "../components/EventMap";
import { supabase } from "../lib/supabaseClient";
import QRCode from "qrcode";
import Modal from "../components/Modal";

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
}

interface TicketTierRow {
  id: string;
  tier_name: string;
  is_active?: boolean;
  quantity_total?: number;
  quantity_sold?: number;
}

declare global {
  interface Window { PaystackPop?: any }
}

// Helper to check if tier is sold out
const isTierSoldOut = (tier: TicketTier): boolean => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  
  if (available == null || available === 0) return false;
  return sold >= available;
};

// Get available tickets for a tier
const getAvailableTickets = (tier: TicketTier): number => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  
  if (available == null || available === 0) {
    const priceInfo = parsePrice(tier.price);
    return priceInfo.isFree ? 100 : 50;
  }
  
  return Math.max(0, available - sold);
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
    
    if (lowerPrice.includes('free') || amount === 0) {
      return { amount: 0, isFree: true };
    }
    
    return { amount, isFree: false };
  }
  
  return { amount: 0, isFree: true };
};

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Phone validation helper
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[\d\s-]{10,}$/;
  return phoneRegex.test(phone.trim());
};

// Ensure ticket tier exists for a given event
const ensureTicketTierExists = async (
  eventId: string,
  tierName: string
): Promise<string | null> => {
  try {
    console.log("🔍 [TIER LOOKUP] Searching for:", { eventId, tierName });
    
    const { data: tiers, error } = await supabase
      .from("ticketTiers")
      .select("id, tier_name, is_active, quantity_total, quantity_sold")
      .eq("event_id", eventId)
      .eq("is_active", true);
    
    if (error) {
      console.error("❌ [TIER LOOKUP] Database error:", error);
      return null;
    }
    
    if (!tiers || tiers.length === 0) {
      console.warn(`❌ [TIER LOOKUP] No active tiers found for event ${eventId}`);
      return null;
    }
    
    console.log(`📋 [TIER LOOKUP] Found ${tiers.length} tiers:`, 
      tiers.map((t: TicketTierRow) => `"${t.tier_name}"`).join(", ")
    );
    
    const searchName = tierName.trim().toLowerCase();
    
    // CASE-INSENSITIVE EXACT MATCH
   const foundTier = tiers.find((tier: TicketTierRow) =>
  tier.tier_name.trim() === tierName.trim()  // Compare trimmed values directly
);
    if (foundTier) {
      console.log(`✅ [TIER LOOKUP] Matched: "${foundTier.tier_name}" -> ${foundTier.id}`);
      return foundTier.id;
    }
    
    // DEBUG: Show what we're comparing
    console.log("🔍 [TIER LOOKUP] Comparing:", {
      searchingFor: searchName,
      available: tiers.map((t: TicketTierRow) => t.tier_name.trim().toLowerCase())
    });
    
    console.error(`❌ [TIER LOOKUP] Tier "${tierName}" not found!`);
    return null;
    
  } catch (err) {
    console.error("❌ [TIER LOOKUP] Error:", err);
    return null;
  }
};

// Helper to insert ticket
const insertTicket = async (ticketData: any) => {
  try {
    console.log("🎫 [INSERT] Starting ticket insertion...");

    // Validate required fields for YOUR schema
    if (!ticketData.phone || ticketData.phone.trim() === '') {
      throw new Error("Phone number is required for ticket purchase");
    }

    // Create data matching YOUR exact schema
    const insertData = {
      event_id: ticketData.event_id,
      tier_id: ticketData.tier_id, // Can be null (nullable: YES)
      full_name: ticketData.full_name?.trim() || null, // REQUIRED - add trim/safety
      email: ticketData.email?.trim() || null,         // REQUIRED
      phone: ticketData.phone.trim(),                  // REQUIRED - must have value
      qr_code_url: ticketData.qr_code_url || null,
      price: ticketData.price || 0,
      reference: ticketData.reference || null,
      order_id: ticketData.order_id || null,
      purchased_at: ticketData.purchased_at || new Date().toISOString(),
      created_at: ticketData.created_at || new Date().toISOString(),
      buyer_email: ticketData.email?.trim() || null,
      tier_name: ticketData.tier_name?.trim() || null,    // Normalize!
      tier_description: ticketData.tier_description?.trim() || null,
      quantity: ticketData.quantity || 1,
      ticket_type: ticketData.ticket_type?.trim() || ticketData.tier_name?.trim()|| null
    };

    console.log("📦 [INSERT] Inserting data:", insertData);

    // CRITICAL: Do NOT use .select() for anonymous inserts!
    // Use returning: 'none' or 'minimal' instead
    const { data, error } = await supabase
      .from("tickets")
      .insert(insertData, { returning: 'minimal' });  // 'minimal' returns only id, 'none' returns nothing

    if (error) {
      console.error("❌ [INSERT] Database error:", error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("✅ [INSERT] Success! Inserted row ID:", data?.[0]?.id || 'no return data');
    return data;

  } catch (err: any) {
    console.error("❌ [INSERT] Failed:", err);
    throw err;
  }
};

// Helper to update tier quantity
const updateTierQuantity = async (tierId: string, quantity: number) => {
  try {
    // Get current tier data
    const { data: tier, error: fetchError } = await supabase
      .from("ticketTiers")
      .select("quantity_sold")
      .eq("id", tierId)
      .single();
    
    if (fetchError) {
      return;
    }
    
    // Update the quantity
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

// Ride-hailing services in Nigeria
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
  },
  {
    id: 'lagosride',
    name: 'LagosRide',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    getUrl: () => 'https://lagosride.ng/'
  }
];

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

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.sahmtickethub.online';

  // Format date
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", 
    day: "2-digit", 
    month: "long",
    year: "numeric"
  });

  // Format time
  const formatTime = (timeStr?: string) => {
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

  // Format price display
  const formatPrice = (price: string | number) => {
    const { amount, isFree } = parsePrice(price);
    if (isFree) return "FREE";
    return `₦${amount.toLocaleString()}`;
  };

  // Get tier badge color based on price/type
  const getTierBadgeColor = (tier: TicketTier) => {
    const { isFree, amount } = parsePrice(tier.price);
    
    if (isFree) return "bg-gradient-to-r from-emerald-500 to-teal-600";
    if (amount < 2000) return "bg-gradient-to-r from-blue-500 to-cyan-600";
    if (amount < 5000) return "bg-gradient-to-r from-purple-500 to-pink-600";
    if (amount < 10000) return "bg-gradient-to-r from-orange-500 to-amber-600";
    return "bg-gradient-to-r from-red-500 to-rose-600";
  };

  // Get tier icon based on price/type
  const getTierIcon = (tier: TicketTier) => {
    const { isFree, amount } = parsePrice(tier.price);
    
    if (isFree) return "🎟️";
    if (amount < 2000) return "🎫";
    if (amount < 5000) return "⭐";
    if (amount < 10000) return "👑";
    return "💎";
  };

// Fetch Event - UPDATED VERSION
useEffect(() => {
  if (!slug) {
    setLoading(false);
    return;
  }

  const fetchEvent = async () => {
    try {
      let eventData;
      
      // First try to fetch by slug
      const { data: eventBySlug, error: eventError } = await supabase
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
        .eq("slug", slug)
        .single();

      if (eventError || !eventBySlug) {
        // If not found by slug, check if it's a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        
        if (isUuid) {
          const { data: fallbackData, error: fallbackError } = await supabase
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
            .eq("id", slug)
            .single();
            
          if (fallbackError || !fallbackData) {
            throw new Error("Event not found");
          }
          
          eventData = fallbackData;
        } else {
          throw new Error("Event not found");
        }
      } else {
        eventData = eventBySlug;
      }

      console.log("✅ Event found:", eventData.id, eventData.title);

      // Fetch ticket tiers for this event
      console.log("🔍 Fetching ticket tiers for event:", eventData.id);
      const { data: ticketTiersData, error: tiersError } = await supabase
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

      if (tiersError) {
        console.error("Error fetching tiers:", tiersError);
      }

      console.log("📋 Ticket tiers data:", ticketTiersData);

      // Map ticket tiers - CRITICAL: Use EXACT tier_name from database
      const ticketTiers: TicketTier[] = (ticketTiersData || []).map((t: any) => {
        console.log(`Processing tier: "${t.tier_name}" -> id: ${t.id}`);
        return {
          id: t.id, // Use database ID
          name: t.tier_name, // Use EXACT database tier_name
          price: t.price ?? 0,
          description: t.description ?? "",
          quantity_available: t.quantity_total ?? null,
          quantity_sold: t.quantity_sold ?? 0,
          is_active: t.is_active ?? true
        };
      });

      console.log("🎫 Mapped tiers:", ticketTiers.map(t => ({ name: t.name, id: t.id })));

      // Use default tier if none found
      let displayTiers = ticketTiers;
      if (ticketTiers.length === 0) {
        console.log("⚠️ No active tiers found, creating default tier");
        displayTiers = [{
          id: "default-" + eventData.id,
          name: "General Admission",
          price: 0,
          description: "Standard admission ticket",
          quantity_available: 100,
          quantity_sold: 0,
          is_active: true
        }];
      }

      // Set the complete event with tiers
      setEvent({
        ...eventData,
        ticketTiers: displayTiers
      });

      // Store the EXACT tier names in a ref for purchase lookup
      if (ticketTiersData) {
        const exactTierMap: Record<string, string> = {};
        ticketTiersData.forEach((tier: any) => {
          exactTierMap[tier.tier_name.toLowerCase()] = tier.tier_name; // Store exact case
        });
        console.log("🗺️ Exact tier name map:", exactTierMap);
      }

      setNotFound(false);
      
    } catch (err) {
      console.error("Event fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  fetchEvent();
}, [slug]);

  // Set document title when event is loaded
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

  // Initialize quantities
  useEffect(() => {
    if (!event?.ticketTiers) return;
    const initQuantities: { [key: string]: number } = {};
    event.ticketTiers.forEach(tier => {
      if (tier.id) {
        initQuantities[tier.id] = 1;
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

  // Handle tier selection for purchase
  const handleSelectTier = (tier: TicketTier) => {
    if (!tier.id) {
      console.error("Ticket tier has no ID");
      return;
    }
    
    setSelectedTier(tier);

    if (!quantities[tier.id]) {
      setQuantities(prev => ({
        ...prev,
        [tier.id!]: 1,
      }));
    }
  };

  // Handle quantity change
  const handleQuantityChange = (tierId: string, delta: number) => {
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
  };

  // Handle buying a ticket
 const handleBuyTicket = async (tier: TicketTier) => {
  if (loading) {
    alert("Event is still loading. Please wait...");
    return;
  }
  
  if (!event?.id) {
    alert("Error: Event information is not loaded yet.");
    return;
  }

  console.log("🛒 [BUY TICKET] Starting purchase:", {
    eventId: event.id,
    tierName: tier.name, // This is the EXACT name from database
    tierId: tier.id
  });

  // Validate we have the tier ID
  if (!tier.id) {
    console.error("❌ Tier has no ID:", tier);
    
    // Try to fetch it again
    const { data: dbTiers } = await supabase
      .from("ticketTiers")
      .select("id, tier_name")
      .eq("event_id", event.id)
      .eq("tier_name", tier.name) // Match by exact name
      .eq("is_active", true)
      .single();
    
    if (!dbTiers) {
      alert(`Ticket tier "${tier.name}" not found. Please refresh and try again.`);
      return;
    }
    
    tier.id = dbTiers.id;
    console.log("🔄 Found tier ID:", tier.id);
  }

  setSelectedTier(tier);

 if (!tier.id) {
  console.error("Cannot proceed: Tier ID is missing");
  return;
}

const checkoutInfo = {
  orderId: `ORD-${Date.now()}`,
  tier: {
    ...tier,
    id: tier.id, // TypeScript now knows this is a string
    name: tier.name
  },
  quantity: quantities[tier.id] || 1,
};

  console.log("💰 [BUY TICKET] Checkout info ready:", checkoutInfo);
  setCheckoutData(checkoutInfo);
  setShowCheckout(true);
};

  // Close checkout modal
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
    return !errors.fullName && !errors.email && !errors.phone;
  };

  // Handle input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  // Compute total amount
  const totalAmount = checkoutData
    ? parsePrice(checkoutData.tier.price).amount * (checkoutData.quantity || 1)
    : 0;

  const formattedTotal = totalAmount === 0
    ? "FREE"
    : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(totalAmount);

  // Handle checkout submit
 const handleCheckoutSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Initial Guards
  if (!checkoutData || !event) return;
  if (!validateForm()) {
    console.error("Form validation failed");
    return;
  }

  setCheckoutLoading(true);

  try {
    // 2. Definitive Tier Data Fetching
    const dbTier = event.ticketTiers?.find(t => t.id === checkoutData.tier.id);
    
    if (!dbTier || !dbTier.id) {
      throw new Error("Ticket tier selection is invalid. Please refresh the page.");
    }

    const tierId = dbTier.id;
    const tierName = dbTier.name; 
    const quantity = checkoutData.quantity || 1;
    const orderId = checkoutData.orderId;
    const currentTime = new Date().toISOString();

    // 3. Stock Check (Server-side source of truth)
    const { data: stockCheck, error: stockError } = await supabase
      .from("ticketTiers")
      .select("quantity_total, quantity_sold")
      .eq("id", tierId)
      .single();

    if (stockError || !stockCheck) throw new Error("Unable to verify ticket availability.");
    
    const remaining = (stockCheck.quantity_total || 0) - (stockCheck.quantity_sold || 0);
    if (remaining < quantity) {
      throw new Error(`Sold out! Only ${remaining} tickets left for ${tierName}.`);
    }

    // 4. Handle Free Tickets
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
await sendTicketEmail(freeRef);

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

    // 5. Handle Paid Tickets (Paystack)
    let paystackInstance = window.PaystackPop;

    // If script isn't loaded, try to load it dynamically
    if (!paystackInstance) {
      console.warn("Paystack SDK not found. Attempting to load...");
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);

      // Wait a moment for script to attach
      await new Promise((resolve) => setTimeout(resolve, 1000));
      paystackInstance = window.PaystackPop;
    }

    if (!paystackInstance) {
      throw new Error("Payment gateway (Paystack) failed to load. Please check your internet connection and refresh.");
    }

    // --- CRITICAL PARAMETER VALIDATION ---
    const pKey = import.meta.env.VITE_PAYSTACK_KEY; 
    const amountInKobo = Math.round(Number(totalAmount) * 100);
    const cleanEmail = formData.email.trim().toLowerCase();
    const uniqueRef = `TIX-${orderId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');

    // Debugging logs
    console.log("Paystack Config Check:", {
      hasKey: !!pKey,
      keyValid: pKey?.startsWith('pk_'),
      amount: amountInKobo,
      ref: uniqueRef,
      email: cleanEmail
    });

    if (!pKey) {
      throw new Error("Payment Configuration Error: VITE_PAYSTACK_KEY is missing from .env. Restart your dev server.");
    }

    if (isNaN(amountInKobo) || amountInKobo <= 0) {
      throw new Error("Transaction Error: Invalid total amount calculated.");
    }
    // -------------------------------------

    const handler = paystackInstance.setup({
      key: pKey.trim(),
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
      callback: async (response: any) => {
        try {
          // Success callback from Paystack
          const paidPromises = Array.from({ length: quantity }).map(async (_, i) => {
            const qrData = `${event.id}|${tierId}|${response.reference}|${i}`;
            const qr_code_url = await QRCode.toDataURL(qrData);

            return insertTicket({
              event_id: event.id,
              tier_id: tierId,
              tier_name: tierName,
              full_name: formData.fullName.trim(),
              email: formData.email.trim(),
              phone: formData.phone.trim(),
              ticket_type: tierName,
              price: Number(totalAmount) / quantity,
              qr_code_url,
              reference: response.reference,
              order_id: orderId,
              purchased_at: currentTime,
              buyer_email: formData.email.trim(),
              created_at: currentTime,
            });
          });

      
await Promise.all(paidPromises);
await updateTierQuantity(tierId, quantity);
await sendTicketEmail(response.reference);

const params = new URLSearchParams({
  paid: "true",
  ref: response.reference,
  title: event.title,
  location: event.location,
  venue: event.venue || event.location,
  date: event.date,
  time: event.time || "6:00 PM",
  type: tierName,
  qty: quantity.toString(),
  price: `₦${totalAmount.toLocaleString()}`,
  lat: event.lat?.toString() || "0",
  lng: event.lng?.toString() || "0"
}).toString();

closeCheckout();
navigate(`/bag/${orderId}?${params}`);
        } catch (innerErr) {
          console.error("Database Insert Error:", innerErr);
          alert("Payment successful, but ticket generation failed. Contact support with ref: " + response.reference);
        }
      },
      onClose: () => {
        setCheckoutLoading(false);
      }
    });

    handler.openIframe();
    

  } catch (err: any) {
    console.error("Checkout Failure:", err);
    alert(err.message || "An unexpected error occurred during checkout.");
    setCheckoutLoading(false);
  }
};

  // Helper function to send ticket email
  const sendTicketEmail = async (reference: string) => {
    if (!checkoutData || !event) return;

    try {
      const response = await fetch(`${API_URL}/api/tickets/send-with-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.email.trim(),
          name: formData.fullName.trim(),
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: formatTime(event.time || ""),
          eventVenue: event.venue || event.location,
          tickets: [
            {
              ticketType: checkoutData.tier.name,
              quantity: checkoutData.quantity,
              amount: formattedTotal,
              codes: Array(checkoutData.quantity).fill(0).map((_, i) => `${reference}-${i + 1}`)
            }
          ],
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

  // Share event
  const shareEvent = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: `Check out this event: ${event?.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-bold group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Events
            </button>
            
            <div className="flex items-center gap-4">
              <button
                onClick={shareEvent}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                title="Share Event"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Event Image & Details */}
          <div className="space-y-8">
            {/* Event Image */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl"
            >
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-96 lg:h-[500px] object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgb(147,51,234);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgb(219,39,119);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='32' fill='white'%3EEvent Image%3C/text%3E%3C/svg%3E";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* Event badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {event.ticketTiers?.some(t => parsePrice(t.price).isFree) && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3" /> FREE TICKETS AVAILABLE
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

              {/* Event Description */}
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
                
                {/* Ride Options Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowRideOptions(!showRideOptions)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition"
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
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Ride availability varies by location. You'll need the respective apps installed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Map */}
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
                  <p className="text-gray-600 text-center mb-4">
                    Location coordinates not provided
                  </p>
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
              
              {/* Location Info */}
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-gray-800">{event.location}</p>
                {event.venue && (
                  <p className="text-gray-600">{event.venue}</p>
                )}
              </div>
              
              {/* Quick Ride Buttons */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
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

              {/* Ticket Tiers */}
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
                            <span className="text-2xl">{tierIcon}</span>
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
                          
                          {/* Ticket Availability */}
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
                            
                            {!soldOut && available <= 0 && (
                              <span className="flex items-center gap-1 text-red-600 font-bold">
                                <AlertCircle className="w-4 h-4" />
                                Selling fast
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Quantity Selector for selected tier */}
                        {isSelected && !soldOut && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(tier.id!, -1);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
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
                        {formatPrice(selectedTier.price) === "FREE" 
                          ? "FREE" 
                          : `₦${(parsePrice(selectedTier.price).amount * (quantities[selectedTier.id] || 1)).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleBuyTicket(selectedTier)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                  >
                    <CreditCard className="w-5 h-5" />
                    Get Tickets Now
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Secure Payment</span>
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

            {/* Additional Info */}
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">🎉 Why Choose SahmTicketHub?</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>Zero fake tickets - 100% authentic tickets only</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>Instant payouts to event organizers</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>QR code entry - fast & secure check-in</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                  <span>Real-time analytics for event insights</span>
                </li>
              </ul>
              
              {/* Ride Services Info */}
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
          </motion.div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SahmTicketHub. Nigeria's fastest event ticketing platform.</p>
          <p className="mt-1">Need help? Contact support@sahmtickethub.online</p>
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
    </div>
  );
}