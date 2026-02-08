// src/pages/EventDetails.tsx - UPDATED WITH RIDES SECTION AND FIXED GUEST ARTISTS
'use client';

import { useNavigate, useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
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
  Lock,
  FileText,
  Sparkles,
  BadgeCheck,
  Truck,
  SmartphoneIcon,
  Wallet,
  QrCode,
  Banknote,
  Globe2,
  Smartphone as MobileIcon,
  Building,
  Landmark,
  Smartphone as PhoneIcon,
  Flag,
  Music,
  Mic,
  User,
  Bike,
  Train,
  Bus,
  Navigation2,
  Car as CarIcon,
  Clock,
  Compass,
  Map
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

interface GuestArtist {
  id: string;
  event_id: string;
  name: string;
  image_url?: string;
  role?: string;
  bio?: string;
  social_media?: {
    instagram?: string;
    twitter?: string;
    website?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    [key: string]: string | undefined;
  };
  created_at?: string;
  updated_at?: string;
}

interface EventDetailsType {
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
  guest_artists?: GuestArtist[];
}

// Ride service type
interface RideService {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  appUrl: string;
  websiteUrl?: string;
  description: string;
  estimatedPrice?: string;
  estimatedTime?: string;
  availableCountries: string[];
  rideTypes?: string[];
}

// Payment gateway type
type PaymentGateway = 'paystack' | 'flutterwave';
type Currency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR' | 'CAD';

declare global {
  interface Window {
    PaystackPop?: any;
    FlutterwaveCheckout?: any;
    dataLayer?: any[];
  }
}

// --- CONSTANTS ---
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
const API_URL = import.meta.env.VITE_API_URL || 'https://api.sahmtickethub.online';

// Payment Gateway Keys
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_KEY || '';
const FLUTTERWAVE_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '';
const FLUTTERWAVE_ENCRYPTION_KEY = import.meta.env.VITE_FLUTTERWAVE_ENCRYPTION_KEY || '';

// Exchange rates
const EXCHANGE_RATES: Record<Currency, number> = {
  NGN: 1,
  USD: 1600,
  GBP: 2000,
  EUR: 1700,
  GHS: 100,
  KES: 12,
  ZAR: 85,
  CAD: 1200
};

// Payment Methods Configuration
const PAYMENT_GATEWAYS = [
  {
    id: 'paystack',
    name: 'Paystack',
    description: 'Local NGN payments via card, bank transfer, USSD, or OPay',
    icon: Shield,
    color: 'bg-green-600',
    currencies: ['NGN'],
    processingFee: 100,
    paymentMethods: ['card', 'bank_transfer', 'ussd', 'opay'],
    supportedCountries: ['Nigeria'],
    currencySymbol: '₦'
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Global payments in multiple currencies',
    icon: Globe,
    color: 'bg-blue-600',
    currencies: ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD'],
    processingFee: {
      NGN: 100,
      USD: 1,
      GBP: 1,
      EUR: 1,
      GHS: 2,
      KES: 20,
      ZAR: 10,
      CAD: 1.5
    },
    paymentMethods: ['card', 'bank_transfer', 'mobile_money', 'ussd', 'qr', 'account'],
    supportedCountries: ['All Countries'],
    currencySymbol: ''
  }
];

// Ride Services Configuration
const RIDE_SERVICES: RideService[] = [
  {
    id: 'uber',
    name: 'Uber',
    icon: CarIcon,
    color: 'bg-black',
    appUrl: 'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=TARGET_LOCATION&dropoff[latitude]=TARGET_LAT&dropoff[longitude]=TARGET_LNG',
    websiteUrl: 'https://www.uber.com/',
    description: 'Book a ride with Uber - available in 70+ countries',
    estimatedPrice: '₦1,500 - ₦4,000',
    estimatedTime: '5-15 min',
    availableCountries: ['Nigeria', 'USA', 'UK', 'Canada', 'Australia', 'South Africa', 'Ghana', 'Kenya', '100+ countries'],
    rideTypes: ['UberX', 'Uber Comfort', 'Uber Black', 'UberXL']
  },
  {
    id: 'bolt',
    name: 'Bolt',
    icon: Car,
    color: 'bg-teal-600',
    appUrl: 'https://bolt.eu/ride/?pickup_lat=CURRENT_LAT&pickup_lng=CURRENT_LNG&destination_lat=TARGET_LAT&destination_lng=TARGET_LNG',
    websiteUrl: 'https://bolt.eu/',
    description: 'Affordable rides in Europe and Africa',
    estimatedPrice: '₦1,200 - ₦3,500',
    estimatedTime: '3-10 min',
    availableCountries: ['Nigeria', 'UK', 'France', 'Germany', 'Poland', 'South Africa', 'Kenya', 'Ghana', '40+ countries'],
    rideTypes: ['Bolt', 'Bolt Premier', 'Bolt Van']
  },
  {
    id: 'indrive',
    name: 'inDrive',
    icon: Navigation2,
    color: 'bg-orange-500',
    appUrl: 'https://indriver.com/',
    description: 'Negotiate your ride price - popular in emerging markets',
    estimatedPrice: 'Negotiable',
    estimatedTime: '5-20 min',
    availableCountries: ['Nigeria', 'Brazil', 'Mexico', 'India', 'Russia', 'Kazakhstan', '20+ countries'],
    rideTypes: ['Economy', 'Comfort', 'Business']
  },
  {
    id: 'lyft',
    name: 'Lyft',
    icon: Car,
    color: 'bg-pink-500',
    appUrl: 'https://lyft.com/ride',
    description: 'Popular ride-hailing service in North America',
    estimatedPrice: '$15 - $40',
    estimatedTime: '5-15 min',
    availableCountries: ['USA', 'Canada'],
    rideTypes: ['Lyft', 'Lyft XL', 'Lux Black']
  },
  {
    id: 'taxify',
    name: 'Taxify',
    icon: Car,
    color: 'bg-blue-500',
    appUrl: 'https://taxify.eu/',
    description: 'European ride-hailing service (now part of Bolt)',
    estimatedPrice: '€10 - €30',
    estimatedTime: '5-15 min',
    availableCountries: ['UK', 'France', 'Germany', 'Spain', 'Italy', 'Portugal'],
    rideTypes: ['Taxify', 'Taxify Business']
  },
  {
    id: 'public-transport',
    name: 'Public Transport',
    icon: Bus,
    color: 'bg-purple-600',
    appUrl: 'https://www.google.com/maps/dir/Current+Location/TARGET_LOCATION/@TARGET_LAT,TARGET_LNG,15z/data=!4m2!4m1!3e3',
    description: 'Buses, trains, and metros near the venue',
    estimatedPrice: '₦200 - ₦1,000',
    estimatedTime: 'Varies',
    availableCountries: ['All Countries'],
    rideTypes: ['Bus', 'Train', 'Metro', 'Tram']
  }
];

// Get processing fee helper
const getProcessingFee = (gateway: typeof PAYMENT_GATEWAYS[0], currency: Currency): number => {
  if (gateway.id === 'paystack') {
    return gateway.processingFee as number;
  } else if (gateway.id === 'flutterwave') {
    const fees = gateway.processingFee as Record<Currency, number>;
    return fees[currency] || 0;
  }
  return 0;
};

// --- UTILITY FUNCTIONS ---
const parsePrice = (price: string | number): { amount: number; isFree: boolean } => {
  if (typeof price === 'number') return { amount: price, isFree: price === 0 };
  if (typeof price === 'string') {
    const cleaned = price.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleaned) || 0;
    const lowerPrice = price.toLowerCase();
    if (lowerPrice.includes('free') || amount === 0) return { amount: 0, isFree: true };
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

// Currency conversion
const convertCurrency = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
  if (fromCurrency === toCurrency) return amount;
  
  const amountInNGN = amount * EXCHANGE_RATES[fromCurrency];
  return parseFloat((amountInNGN / EXCHANGE_RATES[toCurrency]).toFixed(2));
};

// Convert NGN amount to other currency
const convertFromNGN = (amountNGN: number, toCurrency: Currency): number => {
  if (toCurrency === 'NGN') return amountNGN;
  return parseFloat((amountNGN / EXCHANGE_RATES[toCurrency]).toFixed(2));
};

// Convert to NGN from other currency
const convertToNGN = (amount: number, fromCurrency: Currency): number => {
  if (fromCurrency === 'NGN') return amount;
  return amount * EXCHANGE_RATES[fromCurrency];
};

const formatCurrency = (amount: number, currency: Currency): string => {
  const formatters: Record<Currency, Intl.NumberFormat> = {
    NGN: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
    GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }),
    EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }),
    GHS: new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }),
    KES: new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2 }),
    ZAR: new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }),
    CAD: new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })
  };
  return formatters[currency].format(amount);
};

// Get currency symbol
const getCurrencySymbol = (currency: Currency): string => {
  const symbols: Record<Currency, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
    GHS: 'GH₵',
    KES: 'KSh',
    ZAR: 'R',
    CAD: 'C$'
  };
  return symbols[currency];
};

// Get ride service deep link
const getRideDeepLink = (ride: RideService, eventLocation: string, lat?: number, lng?: number): string => {
  let link = ride.appUrl;
  
  if (lat && lng) {
    link = link
      .replace(/TARGET_LOCATION/g, encodeURIComponent(eventLocation))
      .replace(/TARGET_LAT/g, lat.toString())
      .replace(/TARGET_LNG/g, lng.toString());
  } else {
    link = link.replace(/TARGET_LOCATION/g, encodeURIComponent(eventLocation));
  }
  
  return link;
};

// --- DATABASE FUNCTIONS ---
const insertTicket = async (ticketData: any) => {
  try {
    if (!ticketData.phone || ticketData.phone.trim() === '') {
      throw new Error("Phone number is required");
    }

    console.log("📝 Inserting ticket with order_id:", ticketData.order_id);

    const insertData = {
      event_id: ticketData.event_id,
      tier_id: ticketData.tier_id || null,
      full_name: ticketData.full_name?.trim() || null,
      email: ticketData.email?.trim() || null,
      phone: ticketData.phone.trim(),
      qr_code_url: ticketData.qr_code_url || null,
      price: ticketData.price || 0,
      reference: ticketData.reference || null,
      order_id: ticketData.order_id || null,
      purchased_at: ticketData.purchased_at || new Date().toISOString().replace('Z', ''),
      created_at: new Date().toISOString(),
      buyer_email: ticketData.buyer_email?.trim() || ticketData.email?.trim() || null,
      tier_name: ticketData.tier_name?.trim() || null,
      tier_description: ticketData.tier_description?.trim() || null,
      quantity: ticketData.quantity || 1,
      ticket_type: ticketData.ticket_type?.trim() || ticketData.tier_name?.trim() || null,
      currency: ticketData.currency || 'NGN',
      payment_gateway: ticketData.payment_gateway || 'paystack',
      payment_method: ticketData.payment_method || null,
      exchange_rate: ticketData.exchange_rate || 1,
      amount_in_ngn: ticketData.amount_in_ngn || ticketData.price
    };

    const { data, error } = await supabase
      .from("tickets")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      throw new Error(`Database insert failed: ${error.message}`);
    }

    console.log("✅ Ticket inserted successfully, ID:", data?.id);
    return data;

  } catch (err: any) {
    console.error("❌ Ticket insertion failed:", err);
    throw err;
  }
};

const verifyTicketsInDatabase = async (orderId: string, reference?: string) => {
  console.log("🔍 Verifying tickets in database...");
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  let query = supabase
    .from("tickets")
    .select("id, order_id, reference, email, created_at, quantity, currency, payment_gateway, price, amount_in_ngn")
    .order("created_at", { ascending: false });

  if (orderId && orderId !== "undefined" && orderId !== "null") {
    query = query.eq("order_id", orderId);
  }
  else if (reference) {
    query = query.eq("reference", reference);
  } else {
    console.error("❌ No order_id or reference provided for verification");
    return { tickets: [], error: "No identifier provided" };
  }

  const { data: tickets, error } = await query;

  console.log("🔍 Verification result:", {
    ticketsFound: tickets?.length || 0,
    error: error?.message
  });

  if (error) {
    console.error("❌ Verification error:", error);
    return { tickets: [], error: error.message };
  }

  if (!tickets || tickets.length === 0) {
    console.error("❌ No tickets found in database!");
    return { tickets: [], error: "No tickets found" };
  }

  console.log(`✅ Found ${tickets.length} tickets in database`);
  
  const totalQuantity = tickets.reduce((sum: number, ticket: { quantity?: number }) => {
    return sum + (ticket.quantity || 1);
  }, 0);
  
  return { tickets, error: null, totalQuantity };
};

const updateTierQuantity = async (tierId: string | undefined, quantity: number) => {
  try {
    if (!tierId) {
      console.error("No tier ID provided for quantity update");
      return;
    }

    const { data: tier, error: fetchError } = await supabase
      .from("ticketTiers")
      .select("quantity_sold")
      .eq("id", tierId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch tier:", fetchError);
      return;
    }

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

const sendTicketEmail = async (reference: string, email: string, name: string, event: EventDetailsType, tier: TicketTier, quantity: number, currency: Currency = 'NGN', amount: number, amountInNGN: number) => {
  try {
    const response = await fetch(`${API_URL}/api/tickets/send-with-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        name: name,
        eventTitle: event.title,
        eventDate: formatEventDate(event.date),
        eventTime: formatTime(event.time || ""),
        eventVenue: event.venue || event.location,
        tickets: [{
          ticketType: tier.name,
          quantity: quantity,
          amount: amount === 0 ? "FREE" : formatCurrency(amount, currency),
          amountInNGN: amountInNGN === 0 ? "FREE" : `₦${amountInNGN.toLocaleString()}`,
          codes: Array(quantity).fill(0).map((_, i) => `${reference}-${i + 1}`)
        }],
        orderId: reference,
        currency: currency,
        exchangeRate: currency !== 'NGN' ? EXCHANGE_RATES[currency] : 1
      })
    });

    if (!response.ok) {
      console.warn("Failed to send email:", await response.text());
    }
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

// Date formatting functions
const formatEventDate = (dateString: string): string => {
  if (!dateString) return "Date TBD";
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const eventDateStr = dateString.split('T')[0];
    if (eventDateStr === todayStr) return "Today";
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (eventDateStr === tomorrowStr) return "Tomorrow";
    const eventDay = new Date(eventDateStr);
    const diffTime = eventDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 0) return "Past Event";
    const date = new Date(dateString);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${monthName} ${day}, ${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date TBD";
  }
};

const formatTime = (timeStr?: string): string => {
  if (!timeStr || timeStr.trim() === '') return "Time TBD";
  try {
    const cleanTime = timeStr.trim();
    const upperTime = cleanTime.toUpperCase();
    if (upperTime.includes('AM') || upperTime.includes('PM')) {
      const timeMatch = cleanTime.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const displayHour = hours % 12 || 12;
        const displayMinute = minutes.toString().padStart(2, '0');
        return `${displayHour}:${displayMinute} ${period}`;
      }
      return cleanTime;
    }
    const timeParts = cleanTime.split(':').map(Number);
    if (timeParts.length < 1) return cleanTime;
    let hours = timeParts[0];
    const minutes = timeParts[1] || 0;
    if (isNaN(hours)) return cleanTime;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const displayMinute = minutes.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeStr;
  }
};

// --- MAIN COMPONENT ---
export default function EventDetails() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetailsType | null>(null);
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
  const [imageError, setImageError] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);
  
  // Payment gateway state
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('paystack');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('NGN');
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [exchangeRates] = useState<Record<Currency, number>>(EXCHANGE_RATES);

  // Calculate ticket price in selected currency
  const calculateTicketPrice = useCallback((tier: TicketTier): { amount: number; amountInNGN: number } => {
    const priceInfo = parsePrice(tier.price);
    const amountInNGN = priceInfo.amount * (checkoutData?.quantity || 1);
    
    if (selectedCurrency === 'NGN') {
      return { amount: amountInNGN, amountInNGN };
    }
    
    const convertedAmount = convertFromNGN(amountInNGN, selectedCurrency);
    return { amount: convertedAmount, amountInNGN };
  }, [selectedCurrency, checkoutData]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    if (!checkoutData || !selectedTier) return 0;
    
    const { amount } = calculateTicketPrice(selectedTier);
    const gateway = PAYMENT_GATEWAYS.find(g => g.id === selectedGateway);
    
    if (!gateway) return amount;
    
    const processingFee = getProcessingFee(gateway, selectedCurrency);
    
    return amount + processingFee;
  }, [checkoutData, selectedTier, selectedGateway, selectedCurrency, calculateTicketPrice]);

  // Calculate amount in NGN
  const totalAmountInNGN = useMemo(() => {
    if (!checkoutData || !selectedTier) return 0;
    
    const { amountInNGN } = calculateTicketPrice(selectedTier);
    const gateway = PAYMENT_GATEWAYS.find(g => g.id === selectedGateway);
    
    if (!gateway) return amountInNGN;
    
    const processingFeeNGN = selectedCurrency === 'NGN' 
      ? getProcessingFee(gateway, 'NGN')
      : convertToNGN(getProcessingFee(gateway, selectedCurrency), selectedCurrency);
    
    return amountInNGN + processingFeeNGN;
  }, [checkoutData, selectedTier, selectedGateway, selectedCurrency, calculateTicketPrice]);

  // Format display amounts
  const formattedTotal = useMemo(() => {
    if (totalAmount === 0) return "FREE";
    return formatCurrency(totalAmount, selectedCurrency);
  }, [totalAmount, selectedCurrency]);

  const formattedNGNTotal = useMemo(() => {
    if (totalAmountInNGN === 0) return "FREE";
    return formatCurrency(totalAmountInNGN, 'NGN');
  }, [totalAmountInNGN]);

  // Get processing fee display
  const processingFee = useMemo(() => {
    return getProcessingFee(
      PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)!,
      selectedCurrency
    );
  }, [selectedGateway, selectedCurrency]);

  const processingFeeInNGN = useMemo(() => {
    if (selectedCurrency === 'NGN') return processingFee;
    return convertToNGN(processingFee, selectedCurrency);
  }, [processingFee, selectedCurrency]);

  // Fetch event and guest artists
  useEffect(() => {
    const fetchEventAndArtists = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        
        // Fetch event
        const { data: eventData, error: eventError } = await supabase
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

        if (eventError || !eventData) throw new Error("Event not found");

        // Fetch guest artists for this event - UPDATED TO MATCH SCHEMA
        const { data: guestArtistsData, error: artistsError } = await supabase
          .from("guest_artistes")
          .select(`
            id,
            event_id,
            name,
            role,
            image_url,
            social_media,
            bio,
            created_at,
            updated_at
          `)
          .eq("event_id", eventData.id)
          .order("created_at", { ascending: true });

        if (artistsError) {
          console.error("Error fetching guest artists:", artistsError);
        }

        // Process guest artists - UPDATED TO MATCH SCHEMA
const processedArtists: GuestArtist[] = (guestArtistsData || []).map((artist: any) => ({
  id: artist.id,
  event_id: artist.event_id,
  name: artist.name,
  role: artist.role,
  image_url: artist.image_url,
  bio: artist.bio,
  social_media: typeof artist.social_media === 'string' 
    ? JSON.parse(artist.social_media)
    : (artist.social_media || {}),
  created_at: artist.created_at,
  updated_at: artist.updated_at
}));

        setGuestArtists(processedArtists);

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
          ticketTiers: displayTiers,
          guest_artists: processedArtists
        });

        const initQuantities: { [key: string]: number } = {};
        displayTiers.forEach(tier => {
          if (tier.id) initQuantities[tier.id] = 1;
        });
        setQuantities(initQuantities);

        setNotFound(false);
      } catch (err) {
        console.error("Event fetch error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndArtists();
  }, [slug]);

  // Update document title
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

  // Load Paystack script
  useEffect(() => {
    if (!showCheckout || totalAmount === 0 || selectedGateway !== 'paystack') return;

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
  }, [showCheckout, totalAmount, selectedGateway]);

  // Event Handlers
  const handleBuyTicket = useCallback(async (tier: TicketTier) => {
    if (loading || !event?.id || !tier.id) {
      alert("Event information is not loaded yet.");
      return;
    }

    const checkoutInfo = {
      orderId: `STH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
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
    setAcceptPrivacy(false);
    setSelectedGateway('paystack');
    setSelectedCurrency('NGN');
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors = {
      fullName: !formData.fullName.trim(),
      email: !isValidEmail(formData.email),
      phone: !isValidPhone(formData.phone)
    };
    setFormErrors(errors);

    if (!acceptPrivacy) {
      alert("Please accept the Privacy Policy to continue");
      return false;
    }

    return !errors.fullName && !errors.email && !errors.phone;
  }, [formData, acceptPrivacy]);

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: false }));
    }
  }, [formErrors]);

  // Paystack Payment Handler
  const handlePaystackPayment = useCallback(async (orderId: string, tier: TicketTier, quantity: number) => {
    if (!event || !window.PaystackPop) {
      throw new Error("Payment gateway not available");
    }

    const amountInKobo = Math.round(totalAmount * 100);
    const cleanEmail = formData.email.trim().toLowerCase();
    const uniqueRef = `STH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return new Promise((resolve, reject) => {
      const paystackConfig = {
        key: PAYSTACK_PUBLIC_KEY.trim(),
        email: cleanEmail,
        amount: amountInKobo,
        currency: 'NGN',
        ref: uniqueRef,
        metadata: {
          custom_fields: [
            { display_name: "Event", variable_name: "event_name", value: event.title },
            { display_name: "Ticket Tier", variable_name: "tier_name", value: tier.name },
            { display_name: "Quantity", variable_name: "quantity", value: quantity.toString() },
            { display_name: "Order ID", variable_name: "order_id", value: orderId },
            { display_name: "Total NGN", variable_name: "total_ngn", value: totalAmountInNGN.toString() }
          ]
        },
        callback: (response: any) => {
          console.log("✅ Paystack payment successful:", response);
          resolve(response);
        },
        onClose: () => {
          console.log("❌ Paystack payment cancelled");
          setCheckoutLoading(false);
          reject(new Error("Payment cancelled by user"));
        }
      };

      try {
        const handler = window.PaystackPop.setup(paystackConfig);
        handler.openIframe();
      } catch (error: any) {
        reject(new Error("Failed to initialize Paystack: " + error.message));
      }
    });
  }, [event, formData, totalAmount, totalAmountInNGN]);

  // Flutterwave Payment Handler
  const handleFlutterwavePayment = useCallback(async (orderId: string, tier: TicketTier, quantity: number) => {
    if (!event || !FLUTTERWAVE_PUBLIC_KEY) {
      throw new Error("Flutterwave configuration error");
    }

    const finalAmount = totalAmount;
    const amountInSmallestUnit = Math.round(finalAmount * 100);

    const config = {
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: orderId,
      amount: finalAmount,
      currency: selectedCurrency,
      payment_options: 'card,account,ussd,banktransfer,mobilemoney',
      customer: {
        email: formData.email,
        phone_number: formData.phone,
        name: formData.fullName,
      },
      customizations: {
        title: "SahmTicketHub",
        description: `${tier.name} Ticket for ${event.title}`,
        logo: "https://sahmtickethub.online/logo.png",
      },
      meta: {
        event_id: event.id,
        tier_id: tier.id,
        tier_name: tier.name,
        quantity: quantity,
        order_id: orderId,
        currency: selectedCurrency,
        exchange_rate: exchangeRates[selectedCurrency],
        total_in_ngn: totalAmountInNGN
      }
    };

    return new Promise((resolve, reject) => {
      if (window.FlutterwaveCheckout) {
        window.FlutterwaveCheckout({
          ...config,
          callback: (response: any) => {
            console.log("✅ Flutterwave payment successful:", response);
            resolve(response);
          },
          onclose: () => {
            console.log("❌ Flutterwave payment modal closed");
            setCheckoutLoading(false);
            reject(new Error("Payment cancelled by user"));
          }
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.async = true;
        script.onload = () => {
          if (window.FlutterwaveCheckout) {
            window.FlutterwaveCheckout({
              ...config,
              callback: (response: any) => resolve(response),
              onclose: () => {
                setCheckoutLoading(false);
                reject(new Error("Payment cancelled by user"));
              }
            });
          }
        };
        script.onerror = () => reject(new Error("Failed to load Flutterwave"));
        document.head.appendChild(script);
      }
    });
  }, [event, formData, totalAmount, selectedCurrency, exchangeRates, totalAmountInNGN]);

  // Process successful payment
  const processSuccessfulPayment = useCallback(async (
    response: any,
    orderId: string,
    tier: TicketTier,
    quantity: number,
    gateway: PaymentGateway
  ) => {
    try {
      const ticketPromises = [];
      const { amount, amountInNGN } = calculateTicketPrice(tier);
      
      for (let i = 0; i < quantity; i++) {
        const qrData = `${event!.id}|${tier.id}|${response.reference || response.transaction_id}|${i}`;
        const qr_code_url = await QRCode.toDataURL(qrData);
        
        const ticketData = {
          event_id: event!.id,
          tier_id: tier.id,
          tier_name: tier.name,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          ticket_type: tier.name,
          price: gateway === 'paystack' ? totalAmountInNGN : amount,
          amount_in_ngn: totalAmountInNGN,
          qr_code_url,
          reference: response.reference || response.transaction_id,
          order_id: orderId,
          purchased_at: new Date().toISOString(),
          buyer_email: formData.email.trim(),
          created_at: new Date().toISOString(),
          quantity: 1,
          tier_description: tier?.description || tier.name,
          payment_gateway: gateway,
          payment_method: 'online',
          currency: selectedCurrency,
          exchange_rate: gateway === 'flutterwave' ? exchangeRates[selectedCurrency] : 1
        };
        
        ticketPromises.push(insertTicket(ticketData));
      }
      
      await Promise.all(ticketPromises);
      
      const verification = await verifyTicketsInDatabase(orderId, response.reference || response.transaction_id);
      if (!verification.tickets || verification.tickets.length === 0) {
        throw new Error(`Failed to create tickets. Contact support with ref: ${response.reference || response.transaction_id}`);
      }
      
      await updateTierQuantity(tier.id, quantity);
      
      await sendTicketEmail(
        response.reference || response.transaction_id,
        formData.email,
        formData.fullName,
        event!,
        tier,
        quantity,
        selectedCurrency,
        gateway === 'paystack' ? totalAmountInNGN : totalAmount,
        totalAmountInNGN
      );
      
      const params = new URLSearchParams({
        paid: "true",
        ref: response.reference || response.transaction_id,
        title: event!.title,
        location: event!.location,
        venue: event!.venue || event!.location,
        date: formatEventDate(event!.date),
        time: formatTime(event!.time || ""),
        type: tier.name,
        qty: quantity.toString(),
        price: formatCurrency(totalAmount, selectedCurrency),
        priceInNGN: formatCurrency(totalAmountInNGN, 'NGN'),
        lat: event!.lat?.toString() || "0",
        lng: event!.lng?.toString() || "0",
        orderId: orderId,
        paymentGateway: gateway,
        currency: selectedCurrency,
        exchangeRate: selectedCurrency !== 'NGN' ? exchangeRates[selectedCurrency].toString() : '1'
      }).toString();
      
      closeCheckout();
      navigate(`/bag/${orderId}?${params}`);
      
    } catch (error: any) {
      console.error("Payment processing error:", error);
      throw error;
    }
  }, [event, formData, selectedCurrency, totalAmount, totalAmountInNGN, exchangeRates, calculateTicketPrice, closeCheckout, navigate]);

  // Checkout submit handler
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
      
      let orderId = checkoutData.orderId;
      if (!orderId || orderId === "undefined" || orderId === "null") {
        orderId = `STH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        checkoutData.orderId = orderId;
      }
      
      console.log("✅ Processing order:", { 
        orderId, 
        gateway: selectedGateway, 
        currency: selectedCurrency,
        amount: totalAmount,
        amountInNGN: totalAmountInNGN
      });

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

      // Free ticket flow
      if (totalAmount === 0) {
        const freeRef = `STH-FREE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        console.log("🆓 FREE TICKET FLOW STARTED");
        console.log("🆓 Order ID:", orderId);

        const insertPromises = Array.from({ length: quantity }).map(async (_, i) => {
          const qrData = `${event.id}|${tierId}|${Date.now()}|${i}`;
          const qr_code_url = await QRCode.toDataURL(qrData);

          const ticketData = {
            event_id: event.id,
            tier_id: tierId,
            tier_name: tierName,
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            ticket_type: tierName,
            price: 0,
            amount_in_ngn: 0,
            qr_code_url,
            reference: freeRef,
            order_id: orderId,
            purchased_at: new Date().toISOString().replace('Z', ''),
            buyer_email: formData.email.trim(),
            created_at: new Date().toISOString(),
            quantity: 1,
            tier_description: tier?.description || tierName,
            payment_gateway: 'free',
            currency: 'NGN'
          };

          return await insertTicket(ticketData);
        });

        await Promise.all(insertPromises);

        const verification = await verifyTicketsInDatabase(orderId, freeRef);

        if (!verification.tickets || verification.tickets.length === 0) {
          throw new Error(`Failed to create tickets. Please contact support with Order ID: ${orderId}`);
        }

        console.log(`✅ ${verification.totalQuantity} free tickets verified in database`);

        await updateTierQuantity(tierId, quantity);
        await sendTicketEmail(freeRef, formData.email, formData.fullName, event, tier, quantity, 'NGN', 0, 0);

        const params = new URLSearchParams({
          free: "true",
          title: event.title,
          location: event.location,
          venue: event.venue || event.location,
          date: formatEventDate(event.date),
          time: formatTime(event.time || ""),
          type: tierName,
          qty: quantity.toString(),
          price: "₦0",
          lat: event.lat?.toString() || "0",
          lng: event.lng?.toString() || "0",
          orderId: orderId
        }).toString();

        closeCheckout();
        navigate(`/bag/${orderId}?${params}`);
        return;
      }

      // Paid ticket flow
      let paymentResponse;
      if (selectedGateway === 'paystack') {
        paymentResponse = await handlePaystackPayment(orderId, tier, quantity);
      } else if (selectedGateway === 'flutterwave') {
        paymentResponse = await handleFlutterwavePayment(orderId, tier, quantity);
      } else {
        throw new Error("Invalid payment gateway selected");
      }

      await processSuccessfulPayment(paymentResponse, orderId, tier, quantity, selectedGateway);

    } catch (err: any) {
      console.error("Checkout Failure:", err);
      
      const errorMessage = err.message !== "Payment cancelled by user" 
        ? `${err.message}\n\nPlease try:\n1. Checking your internet connection\n2. Refreshing the page\n3. Using a different browser\n\nIf the problem persists, contact support with:\n- Order ID: ${checkoutData?.orderId || 'N/A'}\n- Email: ${formData.email}`
        : "Payment was cancelled";

      if (errorMessage !== "Payment was cancelled") {
        alert(errorMessage);
      }
      setCheckoutLoading(false);
    }
  }, [checkoutData, event, formData, validateForm, closeCheckout, navigate, selectedGateway, selectedCurrency, totalAmount, totalAmountInNGN, handlePaystackPayment, handleFlutterwavePayment, processSuccessfulPayment]);

  // Currency selector modal
  const CurrencySelectorModal = () => {
    const selectedGatewayConfig = PAYMENT_GATEWAYS.find(g => g.id === selectedGateway);
    
    return (
      <Modal>
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto mx-2"
          >
            <div className="p-4 sm:p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold">Select Currency</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      All prices are originally in NGN.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCurrencySelector(false)}
                  className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Current Ticket Price in NGN */}
              {selectedTier && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs sm:text-sm text-purple-800">
                    <span className="font-semibold">Ticket Price:</span> 
                    <span className="ml-2">₦{(parsePrice(selectedTier.price).amount * (checkoutData?.quantity || 1)).toLocaleString()} NGN</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 sm:p-4">
              <div className="space-y-1 sm:space-y-2 max-h-[50vh] overflow-y-auto">
                {selectedGatewayConfig?.currencies.map((currency) => (
                  <button
                    key={currency}
                    onClick={() => {
                      setSelectedCurrency(currency as Currency);
                      setShowCurrencySelector(false);
                    }}
                    className={`w-full p-3 sm:p-4 rounded-xl text-left flex items-center gap-3 sm:gap-4 transition-all ${selectedCurrency === currency
                      ? 'bg-purple-50 border-2 border-purple-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-sm sm:text-base">{getCurrencySymbol(currency as Currency)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                        {currency}
                        <span className="text-xs sm:text-sm font-normal text-gray-600 truncate">
                          ({currency === 'NGN' ? 'Nigerian Naira' :
                           currency === 'USD' ? 'US Dollar' :
                           currency === 'GBP' ? 'British Pound' :
                           currency === 'EUR' ? 'Euro' :
                           currency === 'GHS' ? 'Ghanaian Cedi' :
                           currency === 'KES' ? 'Kenyan Shilling' :
                           currency === 'ZAR' ? 'South African Rand' :
                           'Canadian Dollar'})
                        </span>
                      </div>
                      
                      {/* Show exchange rate */}
                      {currency !== 'NGN' && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          1 {currency} = ₦{exchangeRates[currency as Currency]?.toLocaleString()}
                        </div>
                      )}
                    </div>
                    {selectedCurrency === currency && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Exchange rate calculator */}
              {selectedTier && selectedCurrency !== 'NGN' && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700 font-medium mb-1 sm:mb-2">Price Conversion:</p>
                  <div className="space-y-0.5 sm:space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Original Price:</span>
                      <span>₦{(parsePrice(selectedTier.price).amount * (checkoutData?.quantity || 1)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Converted to {selectedCurrency}:</span>
                      <span>{formatCurrency(calculateTicketPrice(selectedTier).amount, selectedCurrency)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5 sm:pt-1 border-t border-blue-200">
                      <span className="font-medium">Processing Fee:</span>
                      <span>{formatCurrency(processingFee, selectedCurrency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-900">
                      <span>Total:</span>
                      <span>{formattedTotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </Modal>
    );
  };

  // Loading and Not Found states
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist or has been removed.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 sm:gap-2 text-purple-700 hover:text-purple-900 font-bold group text-sm sm:text-base"
              aria-label="Go back to events"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Events
            </button>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  const shareData = {
                    title: event.title,
                    text: `Check out "${event.title}" on SahmTicketHub!`,
                    url: window.location.href,
                  };
                  if (navigator.share) {
                    navigator.share(shareData);
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Event link copied to clipboard!');
                  }
                }}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                title="Share Event"
                aria-label="Share event"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          {/* Left Column - Event Details */}
          <div className="space-y-6 sm:space-y-8">
            {/* Event Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl"
            >
              <div className="relative w-full h-64 sm:h-80 lg:h-96 xl:h-[500px]">
                <img
                  src={event.image || PLACEHOLDER_IMAGE}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = PLACEHOLDER_IMAGE;
                    setImageError(true);
                  }}
                  loading="lazy"
                  onLoad={() => setImageError(false)}
                />
                {imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                    <div className="text-center p-6 sm:p-8">
                      <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-purple-300 mx-auto mb-3 sm:mb-4" />
                      <p className="text-gray-600 font-medium text-sm sm:text-base">Event Image</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex flex-wrap gap-1 sm:gap-2">
                {event.ticketTiers?.some(t => parsePrice(t.price).isFree) && (
                  <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> FREE
                  </span>
                )}
                <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> GLOBAL
                </span>
              </div>
            </motion.div>

            {/* Event Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl"
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-4 sm:mb-6">
                {event.title}
              </h1>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">
                      {formatEventDate(event.date)}
                      {event.time && ` at ${formatTime(event.time)}`}
                    </p>
                    {!event.time && <p className="text-gray-600 text-sm">Time to be announced</p>}
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{event.location}</p>
                    {event.venue && event.venue !== event.location && (
                      <p className="text-gray-600 text-sm">{event.venue}</p>
                    )}
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">About This Event</h3>
                  <p className="text-gray-700 whitespace-pre-line text-sm sm:text-base">{event.description}</p>
                </div>
              )}
            </motion.div>

            {/* Guest Artists Section - ONLY SHOW IF ARTISTS EXIST */}
            {guestArtists.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                      Featured Artists
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">Meet the talented artists performing at this event</p>
                  </div>
                  <div className="px-2 py-1 sm:px-3 sm:py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    {guestArtists.length} Artist{guestArtists.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {guestArtists.map((artist: GuestArtist, index) => {
                    const socialLinks = artist.social_media || {};

                    return (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="relative">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden border-2 border-white shadow-md">
                              <img
                                src={artist.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=7c3aed&color=fff&bold=true&size=128`}
                                alt={artist.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=7c3aed&color=fff&bold=true&size=128`;
                                }}
                              />
                            </div>
                            {artist.role && (
                              <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                                {artist.role}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-purple-700 transition-colors truncate">
                              {artist.name}
                            </h4>
                            
                            {artist.bio && (
                              <p className="text-xs text-gray-600 mt-1 sm:mt-2 line-clamp-2">
                                {artist.bio}
                              </p>
                            )}

                            {Object.keys(socialLinks).length > 0 && (
                              <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                {'instagram' in socialLinks && socialLinks.instagram && (
                                  <a
                                    href={socialLinks.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-pink-600 transition-colors"
                                    title="Instagram"
                                  >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                  </a>
                                )}
                                {'twitter' in socialLinks && socialLinks.twitter && (
                                  <a
                                    href={socialLinks.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-blue-500 transition-colors"
                                    title="Twitter"
                                  >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.213c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                    </svg>
                                  </a>
                                )}
                                {'facebook' in socialLinks && socialLinks.facebook && (
                                  <a
                                    href={socialLinks.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-blue-700 transition-colors"
                                    title="Facebook"
                                  >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                  </a>
                                )}
                                {'website' in socialLinks && socialLinks.website && (
                                  <a
                                    href={socialLinks.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-purple-600 transition-colors"
                                    title="Website"
                                  >
                                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </a>
                                )}
                                {'youtube' in socialLinks && socialLinks.youtube && (
                                  <a
                                    href={socialLinks.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-red-600 transition-colors"
                                    title="YouTube"
                                  >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                  </a>
                                )}
                                {'tiktok' in socialLinks && socialLinks.tiktok && (
                                  <a
                                    href={socialLinks.tiktok}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-black transition-colors"
                                    title="TikTok"
                                  >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Map Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-purple-600" />
                  Event Location
                </h3>
              </div>
              
              {event.lat && event.lng ? (
                <div className="h-48 sm:h-64 rounded-xl sm:rounded-2xl overflow-hidden mb-4">
                  <EventMap
                    lat={event.lat}
                    lng={event.lng}
                    venue={event.venue || event.location}
                    title={event.title}
                  />
                </div>
              ) : (
                <div className="h-48 sm:h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2 text-sm sm:text-base">Map Not Available</p>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-4 sm:px-6 rounded-full hover:shadow-xl transition-all text-sm sm:text-base"
                  >
                    Search on Google Maps
                  </a>
                </div>
              )}
            </motion.div>

            {/* Rides Section */}
            <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.25 }}
  className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 shadow-xl"
>
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div className="flex-1">
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
        <CarIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-purple-600 flex-shrink-0" />
        <span>Get a Ride to the Event</span>
      </h3>
      <p className="text-gray-600 text-xs sm:text-sm md:text-base mt-1">
        Book rides with your favorite ride-hailing apps
      </p>
    </div>
    <div className="flex-shrink-0">
      <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs sm:text-sm font-bold rounded-full">
        {RIDE_SERVICES.length} Options
      </div>
    </div>
  </div>

  {/* Ride Cards Grid */}
  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
    {RIDE_SERVICES.map((ride: RideService) => {
      const Icon = ride.icon;
      const rideLink = getRideDeepLink(ride, event.location, event.lat, event.lng);
      
      return (
        <motion.a
          key={ride.id}
          href={rideLink}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50 hover:from-purple-50/30 hover:to-white"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Ride Icon */}
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${ride.color} rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            
            {/* Ride Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg group-hover:text-purple-700 transition-colors truncate">
                  {ride.name}
                </h4>
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-purple-600 flex-shrink-0 mt-1" />
              </div>
              
              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 sm:mb-3">
                {ride.description}
              </p>
              
              {/* Ride Types (if available) */}
              {ride.rideTypes && ride.rideTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                  {ride.rideTypes.slice(0, 3).map((type, idx) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200 group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors"
                    >
                      {type}
                    </span>
                  ))}
                  {ride.rideTypes.length > 3 && (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
                      +{ride.rideTypes.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Available Countries */}
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Available in {ride.availableCountries[0]}
                  {ride.availableCountries.length > 1 && (
                    <span className="ml-1 text-gray-400">
                      +{ride.availableCountries.length - 1} more
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {/* Quick Action Button */}
          <div className="mt-2 sm:mt-3">
            <button 
              onClick={(e) => {
                e.preventDefault();
                window.open(rideLink, '_blank');
              }}
              className="w-full py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-700 text-xs sm:text-sm font-medium rounded-lg border border-gray-200 hover:border-purple-300 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 group-hover:shadow-sm"
            >
              <span>Book Ride</span>
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </motion.a>
      );
    })}
  </div>
  
  {/* Ride Booking Tips */}
  <div className="mt-4 sm:mt-6 p-3 sm:p-4 md:p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl border border-blue-100">
    <h4 className="font-bold text-gray-800 text-sm sm:text-base md:text-lg mb-2 sm:mb-3 flex items-center gap-2">
      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
      <span>Ride Booking Tips</span>
    </h4>
    <ul className="text-xs sm:text-sm md:text-base text-gray-600 space-y-1.5 sm:space-y-2">
      <li className="flex items-start gap-2 sm:gap-3">
        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
        <span>Book in advance for peak hours to ensure availability</span>
      </li>
      <li className="flex items-start gap-2 sm:gap-3">
        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
        <span>Compare prices between different ride services before booking</span>
      </li>
      <li className="flex items-start gap-2 sm:gap-3">
        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
        <span>Consider carpooling with friends to split costs</span>
      </li>
      <li className="flex items-start gap-2 sm:gap-3">
        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
        <span>Allow extra time for traffic during event days</span>
      </li>
      <li className="flex items-start gap-2 sm:gap-3">
        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
        <span>Check for surge pricing during peak hours</span>
      </li>
    </ul>
  </div>

  {/* Additional Transportation Options */}
  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl border border-green-100">
    <h4 className="font-bold text-gray-800 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-2">
      <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
      <span>Other Transportation Options</span>
    </h4>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <button 
        onClick={() => {
          const mapsUrl = `https://www.google.com/maps/dir//${encodeURIComponent(event.location)}`;
          window.open(mapsUrl, '_blank');
        }}
        className="p-2 sm:p-3 bg-white hover:bg-green-50 rounded-lg border border-green-200 hover:border-green-300 transition-all flex flex-col items-center justify-center gap-1 sm:gap-2"
      >
        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
        <span className="text-xs sm:text-sm font-medium text-gray-700">Directions</span>
      </button>
      
      <button 
        onClick={() => {
          const parkingUrl = `https://www.google.com/maps/search/parking+near+${encodeURIComponent(event.location)}`;
          window.open(parkingUrl, '_blank');
        }}
        className="p-2 sm:p-3 bg-white hover:bg-green-50 rounded-lg border border-green-200 hover:border-green-300 transition-all flex flex-col items-center justify-center gap-1 sm:gap-2"
      >
        <Car className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        <span className="text-xs sm:text-sm font-medium text-gray-700">Parking</span>
      </button>
      
      <button 
        onClick={() => {
          const transitUrl = `https://www.google.com/maps/transit/nearby/${encodeURIComponent(event.location)}`;
          window.open(transitUrl, '_blank');
        }}
        className="p-2 sm:p-3 bg-white hover:bg-green-50 rounded-lg border border-green-200 hover:border-green-300 transition-all flex flex-col items-center justify-center gap-1 sm:gap-2"
      >
        <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
        <span className="text-xs sm:text-sm font-medium text-gray-700">Transit</span>
      </button>
      
      <button 
        onClick={() => {
          const taxiUrl = `https://www.google.com/maps/search/taxi+stand+near+${encodeURIComponent(event.location)}`;
          window.open(taxiUrl, '_blank');
        }}
        className="p-2 sm:p-3 bg-white hover:bg-green-50 rounded-lg border border-green-200 hover:border-green-300 transition-all flex flex-col items-center justify-center gap-1 sm:gap-2"
      >
        <Car className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
        <span className="text-xs sm:text-sm font-medium text-gray-700">Taxi Stands</span>
      </button>
    </div>
  </div>
</motion.div>
          </div>

          {/* Right Column - Ticket Selection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6 sm:space-y-8"
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl sticky top-20 sm:top-24">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900">
                  Select Your Ticket
                </h2>
                <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-medium">
                    {event.ticketTiers?.length || 0} options
                  </span>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {event.ticketTiers?.map((tier, index) => {
                  if (!tier.id) return null;

                  const { isFree, amount } = parsePrice(tier.price);
                  const soldOut = isTierSoldOut(tier);
                  const available = getAvailableTickets(tier);
                  const isSelected = selectedTier?.id === tier.id;
                  const isLowStock = available > 0 && available <= 10;

                  return (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: soldOut ? 1 : 1.02 }}
                      onClick={() => !soldOut && setSelectedTier(tier)}
                      className={`relative p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all ${soldOut
                          ? 'bg-gray-50 border-gray-200 opacity-75 cursor-not-allowed'
                          : isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                    >
                      {soldOut && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-xl sm:rounded-2xl flex items-center justify-center z-10">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold rounded-full text-xs">
                            SOLD OUT
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <span className="text-xl sm:text-2xl">🎫</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{tier.name}</h3>
                            </div>
                            <span className={`px-2 py-1 sm:px-3 sm:py-1 text-xs font-bold text-white rounded-full flex-shrink-0 ${isFree
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                : 'bg-gradient-to-r from-purple-500 to-pink-600'
                              }`}>
                              {isFree ? 'FREE' : `₦${amount.toLocaleString()}`}
                            </span>
                          </div>

                          <p className="text-gray-600 text-sm mb-2 sm:mb-3 line-clamp-2">
                            {tier.description || "Standard admission ticket"}
                          </p>

                          <div className="flex items-center gap-2 sm:gap-4 text-xs">
                            {!soldOut && isLowStock && (
                              <span className="flex items-center gap-1 text-orange-600 font-bold">
                                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                Only {available} left!
                              </span>
                            )}

                            {!soldOut && !isLowStock && available > 10 && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                {available} tickets available
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && !soldOut && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuantities(prev => ({
                                  ...prev,
                                  [tier.id!]: Math.max(1, (prev[tier.id!] || 1) - 1)
                                }));
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm"
                            >
                              -
                            </button>
                            <span className="font-bold text-base sm:text-lg min-w-[1.5rem] sm:min-w-[2rem] text-center">
                              {quantities[tier.id] || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (available <= (quantities[tier.id!] || 1)) {
                                  alert(`Only ${available} tickets available`);
                                  return;
                                }
                                setQuantities(prev => ({
                                  ...prev,
                                  [tier.id!]: (prev[tier.id!] || 1) + 1
                                }));
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm"
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
                  className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200"
                >
                  <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Selected:</span>
                      <span className="font-bold text-sm sm:text-base sm:text-lg truncate max-w-[50%]">{selectedTier.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Quantity:</span>
                      <span className="font-bold text-sm sm:text-base sm:text-lg">{quantities[selectedTier.id] || 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Total:</span>
                      <span className="text-lg sm:text-2xl font-black text-purple-700">
                        {parsePrice(selectedTier.price).isFree ? "FREE" : `₦${(parsePrice(selectedTier.price).amount * (quantities[selectedTier.id] || 1)).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyTicket(selectedTier)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    Get Tickets Now
                  </button>

                  <div className="mt-3 sm:mt-4 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm">
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Global Support</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Instant Delivery</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Trust Signals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 sm:mt-12"
        >
          <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 text-white overflow-hidden">
            <div className="relative">
              <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-20 sm:-translate-y-32 translate-x-20 sm:translate-x-32" />
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 relative z-10">
                {/* First Column */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold">Secure Global Payments</h3>
                      <p className="text-sm sm:text-lg text-purple-200">Pay in NGN or convert to your local currency</p>
                    </div>
                  </div>
                  
                  {/* Exchange Rates Display */}
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                      Exchange Rates
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2">
                      {Object.entries(exchangeRates).map(([currency, rate]) => (
                        currency !== 'NGN' && (
                          <div key={currency} className="bg-white/10 p-1.5 sm:p-2 rounded-lg">
                            <div className="text-xs text-purple-200">1 {currency}</div>
                            <div className="font-bold text-sm sm:text-base">₦{rate.toLocaleString()}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4">
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Multi-Currency
                    </span>
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <Banknote className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Real-time Rates
                    </span>
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Card Payments
                    </span>
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Bank Transfer
                    </span>
                  </div>
                </div>

                {/* Second Column */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white/10 p-3 sm:p-5 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                    <h4 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                      Paystack (NGN)
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-200 mb-2 sm:mb-3">Local payments in Nigerian Naira</p>
                    <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span>Processing Fee:</span>
                        <span>₦100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Currencies:</span>
                        <span>NGN only</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 p-3 sm:p-5 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                    <h4 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                      Flutterwave (Global)
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-200 mb-2 sm:mb-3">International payments</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-500/20 rounded text-xs">USD</span>
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-500/20 rounded text-xs">GBP</span>
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-500/20 rounded text-xs">EUR</span>
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-500/20 rounded text-xs">GHS</span>
                    </div>
                  </div>
                </div>

                {/* Third Column */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">Paystack Secure</h4>
                      <p className="text-xs sm:text-sm text-purple-200">Local NGN payments via card, bank transfer, USSD, or OPay</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">Verified Tickets</h4>
                      <p className="text-xs sm:text-sm text-purple-200">Instant QR code delivery with guaranteed entry</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">OPay Support</h4>
                      <p className="text-xs sm:text-sm text-purple-200">Fast mobile money payments with OPay integration</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Payments Banner */}
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h4 className="font-bold text-base sm:text-lg mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span>Need to pay in another currency?</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-200">
                      Switch to Flutterwave for payments in USD, GBP, EUR, GHS, KES, ZAR, or CAD
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <button 
                      onClick={() => {
                        setSelectedGateway('flutterwave');
                        setSelectedCurrency('USD');
                      }}
                      className="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                      Pay in USD
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedGateway('flutterwave');
                        setSelectedCurrency('GBP');
                      }}
                      className="px-2 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                      Pay in GBP
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedGateway('paystack');
                        setSelectedCurrency('NGN');
                      }}
                      className="px-2 py-1.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                      Pay in NGN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Checkout Modal - RESPONSIVE VERSION */}
      {showCheckout && checkoutData && (
        <Modal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-1 sm:p-2 md:p-4"
            onClick={closeCheckout}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-2xl max-h-[95vh] overflow-y-auto mx-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-5 lg:p-6 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black truncate">Checkout</h2>
                  <p className="text-base sm:text-xl opacity-90 truncate">
                    {checkoutData.tier.name} × {checkoutData.quantity}
                  </p>
                </div>
                <button
                  onClick={closeCheckout}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg ml-2 flex-shrink-0"
                  aria-label="Close checkout"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
                </button>
              </div>

              <div className="p-3 sm:p-5 lg:p-6 md:p-8">
                <form onSubmit={handleCheckoutSubmit}>
                  {/* Payment Gateway Selection */}
                  <div className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl border border-blue-100">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      Select Payment Gateway
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {PAYMENT_GATEWAYS.map((gateway) => {
                        const Icon = gateway.icon;
                        return (
                          <button
                            key={gateway.id}
                            type="button"
                            onClick={() => {
                              setSelectedGateway(gateway.id as PaymentGateway);
                              if (gateway.id === 'paystack') {
                                setSelectedCurrency('NGN');
                              } else {
                                setSelectedCurrency('USD');
                              }
                            }}
                            className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${selectedGateway === gateway.id
                                ? `${gateway.color} border-${gateway.color.replace('bg-', 'border-')} text-white`
                                : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 ${selectedGateway === gateway.id ? 'bg-white/20' : gateway.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              </div>
                              <div className="text-left min-w-0 flex-1">
                                <div className="font-bold text-sm sm:text-base truncate">{gateway.name}</div>
                                <div className="text-xs sm:text-sm opacity-80 truncate">{gateway.description}</div>
                              </div>
                            </div>
                            
                            {selectedGateway === gateway.id && (
                              <div className="mt-2 sm:mt-3 text-xs sm:text-sm bg-white/20 p-2 rounded-lg">
                                {gateway.id === 'paystack' ? (
                                  <span>Processing fee: ₦{gateway.processingFee as number}</span>
                                ) : gateway.id === 'flutterwave' ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span>Currency: {selectedCurrency}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowCurrencySelector(true);
                                        }}
                                        className="text-white hover:text-white/80 underline text-xs"
                                      >
                                        Change
                                      </button>
                                    </div>
                                    <span className="block text-xs">
                                      Processing fee: {formatCurrency(
                                        getProcessingFee(gateway, selectedCurrency),
                                        selectedCurrency
                                      )}
                                    </span>
                                </div>
                                ) : null}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Currency info */}
                    {selectedGateway === 'flutterwave' && (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                          <span className="text-xs sm:text-sm text-gray-700">
                            Selected: {selectedCurrency} ({getCurrencySymbol(selectedCurrency)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCurrencySelector(true)}
                          className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
                        >
                          Select Currency
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className={`w-full px-3 py-3 sm:px-4 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                          }`}
                        required
                      />
                      {formErrors.fullName && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 ml-1">Please enter your full name</p>
                      )}
                    </div>

                    <div>
                      <input
                        type="email"
                        placeholder="Email Address *"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full px-3 py-3 sm:px-4 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${formErrors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                        required
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 ml-1">Please enter a valid email</p>
                      )}
                    </div>

                    <div>
                      <input
                        type="tel"
                        placeholder="Phone Number *"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full px-3 py-3 sm:px-4 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${formErrors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                        required
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1 ml-1">Please enter a valid phone number</p>
                      )}
                    </div>
                  </div>

                  {/* Privacy Policy */}
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg sm:rounded-xl">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        id="privacy-policy"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-purple-600 rounded focus:ring-purple-500"
                        required
                      />
                      <div className="flex-1">
                        <label htmlFor="privacy-policy" className="text-gray-700 font-medium text-sm sm:text-base">
                          I agree to the Privacy Policy and Terms of Service
                        </label>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          By checking this box, you agree to our data collection and usage practices.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Order Summary</h3>
                    
                    <div className="space-y-2 sm:space-y-3">
                      {/* Original Price in NGN */}
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm sm:text-base">Original Price:</span>
                        <span className="font-medium text-sm sm:text-base">
                          ₦{(parsePrice(selectedTier!.price).amount * checkoutData.quantity).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Converted Price */}
                      {selectedCurrency !== 'NGN' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm sm:text-base">Converted to {selectedCurrency}:</span>
                          <span className="font-medium text-sm sm:text-base">
                            {formatCurrency(calculateTicketPrice(selectedTier!).amount, selectedCurrency)}
                          </span>
                        </div>
                      )}
                      
                      {/* Processing Fee */}
                      {processingFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 text-sm sm:text-base">Processing Fee:</span>
                          <span className="font-medium text-sm sm:text-base">
                            {formatCurrency(processingFee, selectedCurrency)}
                            {selectedCurrency !== 'NGN' && (
                              <span className="text-xs text-gray-500 ml-1">
                                (₦{processingFeeInNGN.toLocaleString()})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {/* Total */}
                      <div className="pt-3 sm:pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-base sm:text-xl font-bold text-purple-600">
                          <span>Total Amount</span>
                          <span>{formattedTotal}</span>
                        </div>
                        
                        {/* Equivalent in NGN */}
                        {selectedCurrency !== 'NGN' && (
                          <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                            Equivalent to: {formattedNGNTotal} Nigerian Naira
                            <div className="text-xs mt-0.5">
                              Rate: 1 {selectedCurrency} = ₦{exchangeRates[selectedCurrency]?.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={checkoutLoading || !acceptPrivacy}
                    className="mt-4 sm:mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base sm:text-xl py-3 sm:py-4 rounded-xl sm:rounded-2xl flex justify-center items-center gap-2 hover:shadow-xl transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin" />
                        <span className="text-sm sm:text-base">Processing...</span>
                      </>
                    ) : totalAmount === 0 ? (
                      <span className="text-sm sm:text-base">Get Free Ticket</span>
                    ) : selectedGateway === 'paystack' ? (
                      <span className="text-sm sm:text-base">Pay {formattedTotal} with Paystack</span>
                    ) : (
                      <span className="text-sm sm:text-base">Pay {formattedTotal} with Flutterwave</span>
                    )}
                  </button>

                  {/* Security Badges */}
                  <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>256-bit SSL Secure</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-xs sm:text-sm">
                      <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>PCI DSS Compliant</span>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </Modal>
      )}

      {/* Currency Selector Modal */}
      {showCurrencySelector && <CurrencySelectorModal />}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl w-full max-w-xs sm:max-w-sm md:max-w-lg max-h-[95vh] overflow-y-auto mx-2"
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6 flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Privacy Policy</h2>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg ml-2"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <p className="text-gray-700 text-sm sm:text-base">
                  Your privacy is important to us. We use your information only for processing payments and delivering tickets.
                </p>
                <button
                  onClick={() => {
                    setShowPrivacyModal(false);
                    setAcceptPrivacy(true);
                  }}
                  className="mt-4 sm:mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base"
                >
                  I Accept & Continue
                </button>
              </div>
            </motion.div>
          </div>
        </Modal>
      )}
    </div>
  );
}