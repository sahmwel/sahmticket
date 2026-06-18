// src/pages/EventDetails.tsx – Free tickets: skip confirm & payment
import { useNavigate, useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, MapPin, Ticket, ShieldCheck, Loader2, X, ImageOff,
  Youtube, Instagram, CreditCard, Smartphone, Building2, CheckCircle, Share2,
  Car, Navigation, Tag, Users, AlertCircle, ExternalLink, ChevronDown, Star,
  Shield, Zap, Heart, Globe, Phone, Mail, Lock, FileText, Sparkles,
  BadgeCheck, Truck, SmartphoneIcon, Wallet, QrCode, Banknote, Globe2,
  Smartphone as MobileIcon, Building, Landmark, Smartphone as PhoneIcon,
  Flag, Music, Mic, User, Bike, Train, Bus, Navigation2, Car as CarIcon,
  Clock, Compass, Map, Percent, Receipt, Timer
} from "lucide-react";
import EventMap from "../components/EventMap";
import { supabase } from "../lib/supabaseClient";
import QRCode from "qrcode";
import Modal from "../components/Modal";

// ==================== TYPES ====================
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
  original_currency?: string;
  original_price?: number;
}

interface FeeBreakdown {
  item: string;
  amount: number;
  percentage?: number;
}

interface FeeCalculation {
  baseAmount: number;
  serviceFee: number;
  vatFee: number;
  platformFee: number;
  processingFee: number;
  stampDuty: number;
  totalAmount: number;
  totalAmountInNGN: number;
  breakdown: FeeBreakdown[];
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
  category?: string;
  location: string;
  venue?: string;
  image: string;
  description?: string;
  lat?: number;
  lng?: number;
  ticketTiers?: TicketTier[];
  slug?: string;
  organizer?: { name: string; email?: string; phone?: string };
  contact_email?: string;
  contact_phone?: string;
  guest_artists?: GuestArtist[];
  fee_strategy?: "pass_to_attendees" | "absorb_fees";
  organizer_subaccount_code?: string;
  organizer_flutterwave_subaccount?: string;
  base_currency?: string;
}

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

type PaymentGateway = "paystack" | "flutterwave";
type Currency = "NGN" | "USD" | "GBP" | "EUR" | "GHS" | "KES" | "ZAR" | "CAD";

// ==================== CONSTANTS ====================
const VAT_RATES: Record<string, number> = {
  NG: 7.5, US: 0, GB: 20, DE: 19, FR: 20, IT: 22, ES: 21, CA: 5,
  GH: 12.5, KE: 16, ZA: 15, AU: 10, IN: 18, JP: 10, CN: 13,
  BR: 12, MX: 16, AE: 5, SA: 15, DEFAULT: 7.5
};

declare global {
  interface Window {
    PaystackPop?: any;
    FlutterwaveCheckout?: any;
    dataLayer?: any[];
  }
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
const API_URL = import.meta.env.VITE_API_URL || "https://api.sahmtickethub.online";
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_KEY || "";
const FLUTTERWAVE_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || "";

const SERVICE_FEE_PERCENT = 5;
const PLATFORM_FEE_PERCENT = 2;

const EXCHANGE_RATES: Record<Currency, number> = {
  NGN: 1, USD: 1600, GBP: 2000, EUR: 1700, GHS: 70, KES: 12, ZAR: 85, CAD: 1200
};

const PAYMENT_GATEWAYS = [
  {
    id: "paystack", name: "Paystack",
    description: "Local NGN payments via card, bank transfer, USSD, or OPay",
    icon: Shield, color: "bg-green-600", currencies: ["NGN"], processingFee: 100,
    paymentMethods: ["card", "bank_transfer", "ussd", "opay"],
    supportedCountries: ["Nigeria"], currencySymbol: "₦"
  },
  {
    id: "flutterwave", name: "Flutterwave",
    description: "Global payments in multiple currencies",
    icon: Globe, color: "bg-blue-600",
    currencies: ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD"],
    processingFee: { NGN: 100, USD: 1, GBP: 1, EUR: 1, GHS: 2, KES: 20, ZAR: 10, CAD: 1.5 },
    paymentMethods: ["card", "bank_transfer", "mobile_money", "ussd", "qr", "account"],
    supportedCountries: ["All Countries"], currencySymbol: ""
  }
];

const RIDE_SERVICES: RideService[] = [
  { id: "uber", name: "Uber", icon: CarIcon, color: "bg-black", appUrl: "https://m.uber.com?action=setPickup&pickup=my_location&dropoff[latitude]={LAT}&dropoff[longitude]={LNG}&dropoff[formatted_address]={ADDR}", description: "Global standard.", availableCountries: ["Nigeria", "USA", "UK", "South Africa", "Ghana"] },
  { id: "bolt", name: "Bolt", icon: Car, color: "bg-teal-600", appUrl: "https://bolt.eu?pickup=my_location&destination_lat={LAT}&destination_lng={LNG}", description: "Fast local rides.", availableCountries: ["Nigeria", "UK", "France", "Germany", "South Africa"] },
  { id: "indrive", name: "inDrive", icon: Navigation2, color: "bg-orange-500", appUrl: "https://indriver.com", description: "Negotiate fare.", availableCountries: ["Nigeria", "Brazil", "Mexico", "India"] },
  { id: "lyft", name: "Lyft", icon: Car, color: "bg-pink-500", appUrl: "https://lyft.com?pickup=my_location&destination[latitude]={LAT}&destination[longitude]={LNG}", description: "Popular in North America.", availableCountries: ["USA", "Canada", "UK"] },
  { id: "public-transport", name: "Public Transport", icon: Bus, color: "bg-purple-600", appUrl: "https://www.google.com/maps/dir/?api=1&destination={LAT},{LNG}&travelmode=transit", description: "Buses, trains, metros.", availableCountries: ["All Countries"] }
];

const getProcessingFee = (gateway: typeof PAYMENT_GATEWAYS[0], currency: Currency): number => {
  if (gateway.id === "paystack") return gateway.processingFee as number;
  return (gateway.processingFee as Record<Currency, number>)[currency] || 0;
};

// ==================== UTILITIES ====================
const parsePrice = (price: string | number): { amount: number; isFree: boolean } => {
  if (typeof price === "number") return { amount: price, isFree: price === 0 };
  const cleaned = price.replace(/[^\d.-]/g, "");
  const amount = parseFloat(cleaned) || 0;
  const lower = price.toLowerCase();
  if (lower.includes("free") || amount === 0) return { amount: 0, isFree: true };
  return { amount, isFree: false };
};

const isTierSoldOut = (tier: TicketTier): boolean => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  if (available == null) return false;
  return sold >= available;
};

const getAvailableTickets = (tier: TicketTier): number => {
  const available = tier.available ?? tier.quantity_available ?? tier.total_tickets;
  const sold = tier.sold ?? tier.quantity_sold ?? tier.tickets_sold ?? 0;
  if (available == null) {
    const { isFree } = parsePrice(tier.price);
    return isFree ? 100 : 50;
  }
  return Math.max(0, available - sold);
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isValidPhone = (phone: string): boolean => /^[+]?[\d\s-]{10,}$/.test(phone.trim());

// Currency conversion
const toNGN = (amount: number, fromCurrency: Currency): number => {
  if (fromCurrency === "NGN") return amount;
  return amount * EXCHANGE_RATES[fromCurrency];
};
const fromNGN = (amountNGN: number, toCurrency: Currency): number => {
  if (toCurrency === "NGN") return amountNGN;
  return amountNGN / EXCHANGE_RATES[toCurrency];
};

const formatCurrency = (amount: number, currency: Currency): string => {
  const formatters: Record<Currency, Intl.NumberFormat> = {
    NGN: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }),
    USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }),
    GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }),
    EUR: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }),
    GHS: new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }),
    KES: new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }),
    ZAR: new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }),
    CAD: new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 })
  };
  return formatters[currency].format(amount);
};

const getCurrencySymbol = (currency: Currency): string => {
  const symbols: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", GHS: "GH₵", KES: "KSh", ZAR: "R", CAD: "C$" };
  return symbols[currency];
};

const getVatRate = (countryName?: string): number => {
  if (!countryName) return VAT_RATES.DEFAULT;
  const map: Record<string, string> = {
    Nigeria: "NG", USA: "US", "United States": "US", UK: "GB", "United Kingdom": "GB",
    Canada: "CA", Ghana: "GH", Kenya: "KE", "South Africa": "ZA", Germany: "DE", France: "FR"
  };
  const code = map[countryName] || countryName.slice(0, 2).toUpperCase();
  return VAT_RATES[code] || VAT_RATES.DEFAULT;
};

// Calculate fees in NGN (base currency)
const calculateFeesInNGN = (
  baseAmountNGN: number,
  feeStrategy: "pass_to_attendees" | "absorb_fees" = "pass_to_attendees"
): FeeCalculation => {
  if (baseAmountNGN === 0) {
    return {
      baseAmount: 0, serviceFee: 0, vatFee: 0, platformFee: 0, processingFee: 0, stampDuty: 0,
      totalAmount: 0, totalAmountInNGN: 0, breakdown: [{ item: "Ticket Price", amount: 0 }]
    };
  }
  const SERVICE_FEE_PERCENT = 5;
  const GATEWAY_RATE = 0.015;
  const GATEWAY_FLAT = baseAmountNGN < 2500 ? 0 : 100;
  const VAT_RATE = 0.075;
  const GATEWAY_CAP = 2000;
  const STAMP_DUTY_THRESHOLD = 10000;
  const STAMP_DUTY_AMOUNT = 50;

  const serviceFee = (baseAmountNGN * SERVICE_FEE_PERCENT) / 100;
  let gatewayProcessingFee = ((baseAmountNGN + serviceFee) * GATEWAY_RATE) + GATEWAY_FLAT;
  if (gatewayProcessingFee > GATEWAY_CAP) gatewayProcessingFee = GATEWAY_CAP;
  const vatFee = (serviceFee + gatewayProcessingFee) * VAT_RATE;
  const stampDuty = (baseAmountNGN + serviceFee) >= STAMP_DUTY_THRESHOLD ? STAMP_DUTY_AMOUNT : 0;
  const totalFees = serviceFee + gatewayProcessingFee + vatFee + stampDuty;
  const totalAmountNGN = feeStrategy === "pass_to_attendees" ? baseAmountNGN + totalFees : baseAmountNGN;

  const breakdown: FeeBreakdown[] = [
    { item: "Ticket Price", amount: baseAmountNGN },
    { item: `Service Fee (${SERVICE_FEE_PERCENT}%)`, amount: serviceFee, percentage: SERVICE_FEE_PERCENT },
    { item: "Processing Fee (1.5% + 100)", amount: gatewayProcessingFee },
    { item: `VAT (7.5% on Fees)`, amount: vatFee, percentage: 7.5 }
  ];
  if (stampDuty > 0) breakdown.push({ item: "Stamp Duty (EMTL)", amount: stampDuty });
  if (feeStrategy === "absorb_fees") breakdown.push({ item: "Fees Covered by Organizer", amount: -totalFees });

  return {
    baseAmount: baseAmountNGN,
    serviceFee, vatFee, platformFee: serviceFee, processingFee: gatewayProcessingFee, stampDuty,
    totalAmount: totalAmountNGN, totalAmountInNGN: totalAmountNGN, breakdown
  };
};

const getRideDeepLink = (ride: RideService, eventLocation: string, lat?: number, lng?: number): string => {
  let link = ride.appUrl;
  if (lat && lng) link = link.replace(/{ADDR}/g, encodeURIComponent(eventLocation)).replace(/{LAT}/g, lat.toString()).replace(/{LNG}/g, lng.toString());
  else link = link.replace(/{ADDR}/g, encodeURIComponent(eventLocation));
  return link;
};

// ==================== DATABASE FUNCTIONS ====================
const insertTicket = async (ticketData: any) => {
  if (!ticketData.phone?.trim()) throw new Error("Phone number required");
  const isValidUUID = (str: string | null | undefined): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };
  const event_id = isValidUUID(ticketData.event_id) ? ticketData.event_id : null;
  const tier_id = isValidUUID(ticketData.tier_id) ? ticketData.tier_id : null;
  const insertData = {
    event_id, tier_id,
    full_name: ticketData.full_name?.trim() || null,
    email: ticketData.email?.trim() || null,
    phone: ticketData.phone.trim(),
    qr_code_url: ticketData.qr_code_url || null,
    price: ticketData.price || 0,
    reference: ticketData.reference || null,
    order_id: ticketData.order_id || null,
    purchased_at: ticketData.purchased_at || new Date().toISOString().replace("Z", ""),
    created_at: new Date().toISOString(),
    buyer_email: ticketData.buyer_email?.trim() || ticketData.email?.trim() || null,
    tier_name: ticketData.tier_name?.trim() || null,
    tier_description: ticketData.tier_description?.trim() || null,
    quantity: ticketData.quantity || 1,
    ticket_type: ticketData.ticket_type?.trim() || ticketData.tier_name?.trim() || null,
    currency: ticketData.currency || "NGN",
    payment_gateway: ticketData.payment_gateway || "paystack",
    exchange_rate: ticketData.exchange_rate || 1,
    amount_in_ngn: ticketData.amount_in_ngn || ticketData.price,
    service_fee: ticketData.service_fee || 0,
    vat_fee: ticketData.vat_fee || 0,
    processing_fee: ticketData.processing_fee || 0,
    fee_strategy: ticketData.fee_strategy || "pass_to_attendees"
  };
  const { data, error } = await supabase.from("tickets").insert([insertData]).select().single();
  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return data;
};

const updateTierQuantity = async (tierId: string | undefined, quantity: number) => {
  if (!tierId) throw new Error("No tier ID");
  const { error } = await supabase.rpc("increment_ticket_sold", { tier_id: tierId, inc: quantity });
  if (error) throw error;
};

const sendTicketEmail = async (
  reference: string, email: string, name: string, event: EventDetailsType,
  tier: TicketTier, quantity: number, currency: Currency, amount: number,
  amountInNGN: number, serviceFee: number, vatFee: number, feeStrategy: string
) => {
  try {
    await fetch(`${API_URL}/api/tickets/send-with-pdf`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email, name, eventTitle: event.title, eventDate: event.date,
        eventTime: event.time || "", eventVenue: event.venue || event.location,
        tickets: [{
          ticketType: tier.name, quantity,
          amount: amount === 0 ? "FREE" : formatCurrency(amount, currency),
          amountInNGN: amountInNGN === 0 ? "FREE" : `₦${amountInNGN.toLocaleString()}`,
          serviceFee: serviceFee > 0 ? `₦${serviceFee.toLocaleString()}` : "N/A",
          vatFee: vatFee > 0 ? `₦${vatFee.toLocaleString()}` : "N/A",
          feeStrategy: feeStrategy === "absorb_fees" ? "Fees Absorbed by Organizer" : "Fees Paid by Buyer",
          codes: Array(quantity).fill(0).map((_, i) => `${reference}-${i + 1}`)
        }],
        orderId: reference, currency, exchangeRate: currency !== "NGN" ? EXCHANGE_RATES[currency] : 1
      })
    });
  } catch (err) { console.error("Email send error:", err); }
};

// ========== DATE & TIME FORMATTING (UTC‑aware) ==========
const formatEventDate = (dateString: string): string => {
  if (!dateString) return "Date TBD";
  try {
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    const eventDateUTC = Date.UTC(year, month - 1, day);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((eventDateUTC - todayUTC) / (1000 * 60 * 60 * 24));
    const date = new Date(eventDateUTC);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[date.getUTCMonth()];
    const dayNum = date.getUTCDate();
    const yearNum = date.getUTCFullYear();
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    if (diffDays < -7) return `${monthName} ${dayNum}${yearNum !== now.getFullYear() ? `, ${yearNum}` : ""} (Past)`;
    return `${monthName} ${dayNum}${yearNum !== now.getFullYear() ? `, ${yearNum}` : ""}`;
  } catch { return "Invalid date"; }
};

const formatEventTime = (timeStr?: string): string => {
  if (!timeStr) return "Time TBD";
  try {
    const parts = timeStr.split(":");
    let hours = parseInt(parts[0]);
    const minutes = parts[1] ? parseInt(parts[1]) : 0;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
  } catch { return timeStr; }
};

// ==================== MAIN COMPONENT ====================
export default function EventDetails() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
  const [formErrors, setFormErrors] = useState({ fullName: false, email: false, phone: false });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>("paystack");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("NGN");
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculation | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("Nigeria");

  type CheckoutStep = "tiers" | "billing" | "confirm" | "payment";
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("tiers");
  const [tempSelectedTier, setTempSelectedTier] = useState<TicketTier | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  // Guard to prevent double execution of free ticket update
  const processingFreeRef = useRef(false);

  // Check if the selected tier is free
  const isFree = feeCalculation?.totalAmount === 0;

  // Timer effect
  useEffect(() => {
    if (showCheckout && tempSelectedTier && !timerActive) { setTimerSeconds(600); setTimerActive(true); }
    if (!showCheckout) { setTimerActive(false); setTimerSeconds(null); }
  }, [showCheckout, tempSelectedTier]);

  useEffect(() => {
    if (!timerActive || timerSeconds === null) return;
    if (timerSeconds <= 0) { alert("Reservation expired. Please select again."); closeCheckout(); return; }
    const interval = setInterval(() => setTimerSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTimer = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const formatPriceInOriginalCurrency = useCallback((tier: TicketTier): string => {
    const currency = (tier.original_currency || event?.base_currency || "NGN") as Currency;
    const amount = typeof tier.price === "number" ? tier.price : parseFloat(tier.price);
    if (isNaN(amount) || amount === 0) return "FREE";
    return formatCurrency(amount, currency);
  }, [event?.base_currency]);

  // Recalculate fees
  useEffect(() => {
    if (!tempSelectedTier) { setFeeCalculation(null); return; }
    const priceInfo = parsePrice(tempSelectedTier.price);
    const baseAmountNGN = toNGN(priceInfo.amount, (tempSelectedTier.original_currency || event?.base_currency || "NGN") as Currency) * tempQuantity;
    const ngnCalc = calculateFeesInNGN(baseAmountNGN, event?.fee_strategy || "pass_to_attendees");
    const totalInSelected = fromNGN(ngnCalc.totalAmount, selectedCurrency);
    const breakdownSelected = ngnCalc.breakdown.map(item => ({ ...item, amount: fromNGN(item.amount, selectedCurrency) }));
    setFeeCalculation({ ...ngnCalc, totalAmount: totalInSelected, totalAmountInNGN: ngnCalc.totalAmount, breakdown: breakdownSelected });
  }, [tempSelectedTier, tempQuantity, selectedCurrency, selectedCountry, event?.fee_strategy, event?.base_currency]);

  // Fetch event
  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) { setLoading(false); return; }
      try {
        let eventData: any = null;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (isUuid) {
          const { data } = await supabase.from("events").select("*").eq("id", slug).maybeSingle();
          if (data) eventData = data;
        }
        if (!eventData) {
          const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
          eventData = data;
        }
        if (!eventData) throw new Error("Event not found");

        let feeStrategy: "pass_to_attendees" | "absorb_fees" = "pass_to_attendees";
        const { data: feeData } = await supabase.from("events").select("fee_strategy").eq("id", eventData.id).maybeSingle();
        if (feeData?.fee_strategy === "absorb_fees") feeStrategy = "absorb_fees";

        const { data: artists } = await supabase.from("guest_artistes").select("*").eq("event_id", eventData.id);
        setGuestArtists((artists || []).map((a: any) => ({ ...a, social_media: typeof a.social_media === "string" ? JSON.parse(a.social_media) : (a.social_media || {}) })));

        let tiers: TicketTier[] = [];
        const { data: tableTiers } = await supabase.from("ticketTiers").select("*").eq("event_id", eventData.id).eq("is_active", true);
        if (tableTiers?.length) {
          tiers = tableTiers.map((t: any) => ({
            id: t.id, name: t.tier_name, price: t.price, description: t.description,
            quantity_available: t.quantity_total, quantity_sold: t.quantity_sold ?? 0,
            original_currency: eventData.base_currency || "NGN", original_price: t.price
          }));
        } else if (eventData.ticketTiers?.length) {
          tiers = eventData.ticketTiers.map((t: any, idx: number) => ({
            id: t.id || `json-${idx}`, name: t.name, price: t.original_price ?? t.price,
            description: t.description, quantity_available: t.quantity_available ?? 100,
            quantity_sold: t.quantity_sold ?? 0, original_currency: t.original_currency || eventData.base_currency || "NGN",
            original_price: t.original_price ?? t.price
          }));
        }
        if (!tiers.length) {
          tiers = [{ id: `default-${eventData.id}`, name: "General Admission", price: 0, description: "Standard admission", quantity_available: 100, quantity_sold: 0, original_currency: eventData.base_currency || "NGN", original_price: 0 }];
        }

        setEvent({
          ...eventData,
          ticketTiers: tiers,
          guest_artists: artists || [],
          fee_strategy: feeStrategy,
          organizer_subaccount_code: eventData.organizer_subaccount_code,
          organizer_flutterwave_subaccount: eventData.organizer_flutterwave_subaccount,
          base_currency: eventData.base_currency
        });
        if (eventData.base_currency && ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD"].includes(eventData.base_currency)) {
          setSelectedCurrency(eventData.base_currency);
          if (eventData.base_currency !== "NGN") setSelectedGateway("flutterwave");
        }
      } catch (err) { setNotFound(true); } finally { setLoading(false); }
    };
    fetchEvent();
  }, [slug]);

  useEffect(() => {
    document.title = event ? `${event.title} | SahmTicketHub` : (loading ? "Loading..." : "Event Not Found");
    return () => { document.title = "SahmTicketHub - Discover Events"; };
  }, [event, loading]);

  // Load Paystack script
  useEffect(() => {
    if (!showCheckout || !feeCalculation || feeCalculation.totalAmount === 0 || selectedGateway !== "paystack") return;
    if (!window.PaystackPop) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v2/inline.js";
      document.body.appendChild(script);
    }
  }, [showCheckout, feeCalculation, selectedGateway]);

  const handleOpenCheckout = () => {
    if (loading || !event?.id) { alert("Event not loaded yet."); return; }
    setTempSelectedTier(null);
    setTempQuantity(1);
    setCheckoutStep("tiers");
    setShowCheckout(true);
  };

  const closeCheckout = useCallback(() => {
    setShowCheckout(false);
    setCheckoutStep("tiers");
    setTempSelectedTier(null);
    setTempQuantity(1);
    setFormData({ fullName: "", email: "", phone: "" });
    setFormErrors({ fullName: false, email: false, phone: false });
    setCheckoutLoading(false);
    setAcceptPrivacy(false);
    setSelectedGateway("paystack");
    setSelectedCurrency(event?.base_currency as Currency || "NGN");
    setSelectedCountry("Nigeria");
    setFeeCalculation(null);
    setTimerActive(false);
    setTimerSeconds(null);
  }, [event]);

  const validateForm = (): boolean => {
    const errors = { fullName: !formData.fullName.trim(), email: !isValidEmail(formData.email), phone: !isValidPhone(formData.phone) };
    setFormErrors(errors);
    if (!acceptPrivacy) { alert("Please accept Privacy Policy"); return false; }
    return !errors.fullName && !errors.email && !errors.phone;
  };

  // Handle free ticket submission (directly from billing step)
  const handleFreeTicketSubmit = useCallback(async () => {
    if (!tempSelectedTier || !event || !feeCalculation || !validateForm()) return;
    if (processingFreeRef.current) return;
    processingFreeRef.current = true;
    setCheckoutLoading(true);
    try {
      const tier = tempSelectedTier;
      const quantity = tempQuantity;
      const orderId = `STH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const isDefaultTier = tier.id?.toString().startsWith("default-");
      const freeRef = `STH-FREE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      // Insert each ticket
      for (let i = 0; i < quantity; i++) {
        const qr = await QRCode.toDataURL(`${event.id}|${tier.id}|${freeRef}|${i}`);
        await insertTicket({
          event_id: event.id,
          tier_id: tier.id,
          tier_name: tier.name,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          ticket_type: tier.name,
          price: 0,
          amount_in_ngn: 0,
          service_fee: 0,
          vat_fee: 0,
          processing_fee: 0,
          qr_code_url: qr,
          reference: freeRef,
          order_id: orderId,
          purchased_at: new Date().toISOString().replace("Z", ""),
          buyer_email: formData.email.trim(),
          created_at: new Date().toISOString(),
          quantity: 1,
          tier_description: tier.description || tier.name,
          payment_gateway: "free",
          currency: "NGN",
          fee_strategy: event.fee_strategy || "pass_to_attendees"
        });
      }
      if (!isDefaultTier) {
        await updateTierQuantity(tier.id, quantity);
      }
      await sendTicketEmail(freeRef, formData.email, formData.fullName, event, tier, quantity, "NGN", 0, 0, 0, 0, event.fee_strategy || "pass_to_attendees");
      const params = new URLSearchParams({
        free: "true",
        title: event.title,
        location: event.location,
        venue: event.venue || event.location,
        date: formatEventDate(event.date),
        time: formatEventTime(event.time),
        type: tier.name,
        qty: quantity.toString(),
        price: "₦0",
        serviceFee: "₦0",
        vatFee: "₦0",
        feeStrategy: event.fee_strategy || "pass_to_attendees",
        lat: event.lat?.toString() || "0",
        lng: event.lng?.toString() || "0",
        orderId
      }).toString();
      closeCheckout();
      navigate(`/bag/${orderId}?${params}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to get free ticket. Please try again.");
      setCheckoutLoading(false);
    } finally {
      processingFreeRef.current = false;
      setCheckoutLoading(false);
    }
  }, [tempSelectedTier, tempQuantity, event, formData, feeCalculation, closeCheckout, navigate, validateForm]);

  // Navigation: skip confirm & payment for free tickets
  const handleNextStep = () => {
    if (checkoutStep === "tiers") {
      if (tempSelectedTier) {
        if (isFree) {
          // For free tickets, go directly to billing
          setCheckoutStep("billing");
        } else {
          setCheckoutStep("billing");
        }
      }
    } else if (checkoutStep === "billing") {
      if (validateForm()) {
        if (isFree) {
          // Submit free ticket immediately
          handleFreeTicketSubmit();
        } else {
          setCheckoutStep("confirm");
        }
      }
    } else if (checkoutStep === "confirm") {
      setCheckoutStep("payment");
    }
  };

  const handlePrevStep = () => {
    if (checkoutStep === "billing") setCheckoutStep("tiers");
    else if (checkoutStep === "confirm") setCheckoutStep("billing");
    else if (checkoutStep === "payment") setCheckoutStep("confirm");
  };

  // Paystack handler (unchanged)
  const handlePaystackPayment = useCallback(async (orderId: string, tier: TicketTier, quantity: number) => {
    if (!event || !window.PaystackPop || !feeCalculation) throw new Error("Paystack not ready");
    const totalKobo = Math.round(feeCalculation.totalAmountInNGN * 100);
    let organizerShareKobo = Math.round(feeCalculation.baseAmount * 100);
    if (event.fee_strategy === "absorb_fees") {
      const totalFees = feeCalculation.serviceFee + feeCalculation.processingFee + feeCalculation.vatFee + (feeCalculation.stampDuty || 0);
      organizerShareKobo = Math.round((feeCalculation.baseAmount - totalFees) * 100);
    }
    let split_code = null;
    if (event.organizer_subaccount_code && organizerShareKobo > 0 && organizerShareKobo < totalKobo) {
      const res = await fetch(`${API_URL}/api/paystack/create-split`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subaccountCode: event.organizer_subaccount_code, flatAmount: organizerShareKobo, currency: "NGN" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Split creation failed");
      split_code = data.split_code;
    }
    return new Promise((resolve, reject) => {
      const config: any = {
        key: PAYSTACK_PUBLIC_KEY, email: formData.email.trim(), amount: totalKobo, currency: "NGN",
        ref: orderId, metadata: { custom_fields: [{ display_name: "Event", variable_name: "event_name", value: event.title }] },
        ...(split_code ? { split_code } : { subaccount: event.organizer_subaccount_code }),
        callback: resolve, onClose: () => reject(new Error("Transaction cancelled"))
      };
      window.PaystackPop.setup(config).openIframe();
    });
  }, [event, formData, feeCalculation]);

  // Flutterwave handler (unchanged)
  const handleFlutterwavePayment = useCallback(async (orderId: string, tier: TicketTier, quantity: number) => {
    if (!event || !FLUTTERWAVE_PUBLIC_KEY || !feeCalculation) throw new Error("Flutterwave not ready");
    const config: any = {
      public_key: FLUTTERWAVE_PUBLIC_KEY, tx_ref: orderId, amount: feeCalculation.totalAmount, currency: selectedCurrency,
      payment_options: "card,account,ussd,banktransfer,mobilemoney",
      customer: { email: formData.email, phone_number: formData.phone, name: formData.fullName },
      customizations: { title: "SahmTicketHub", description: `${tier.name} Ticket for ${event.title}`, logo: "https://sahmtickethub.online/logo.png" },
      meta: { event_id: event.id, tier_id: tier.id, quantity, order_id: orderId, currency: selectedCurrency, exchange_rate: EXCHANGE_RATES[selectedCurrency], total_in_ngn: feeCalculation.totalAmountInNGN }
    };
    if (event.organizer_flutterwave_subaccount) config.subaccounts = [{ id: event.organizer_flutterwave_subaccount }];
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.flutterwave.com/v3.js";
      script.onload = () => window.FlutterwaveCheckout({ ...config, callback: resolve, onclose: () => reject(new Error("Payment cancelled")) });
      script.onerror = () => reject(new Error("Failed to load Flutterwave"));
      document.head.appendChild(script);
    });
  }, [event, formData, selectedCurrency, feeCalculation]);

  // Process successful payment – NO increment for paid tickets (webhook handles it)
  const processSuccessfulPayment = useCallback(async (response: any, orderId: string, tier: TicketTier, quantity: number, gateway: PaymentGateway) => {
    if (!event || !feeCalculation) throw new Error("Missing data");
    const reference = response.reference || response.transaction_id;
    for (let i = 0; i < quantity; i++) {
      const qr = await QRCode.toDataURL(`${event.id}|${tier.id}|${reference}|${i}`);
      await insertTicket({
        event_id: event.id,
        tier_id: tier.id,
        tier_name: tier.name,
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        ticket_type: tier.name,
        price: feeCalculation.totalAmount,
        amount_in_ngn: feeCalculation.totalAmountInNGN,
        service_fee: feeCalculation.serviceFee,
        vat_fee: feeCalculation.vatFee,
        processing_fee: feeCalculation.processingFee,
        qr_code_url: qr,
        reference,
        order_id: orderId,
        purchased_at: new Date().toISOString().replace("Z", ""),
        buyer_email: formData.email.trim(),
        created_at: new Date().toISOString(),
        quantity: 1,
        tier_description: tier.description || tier.name,
        payment_gateway: gateway,
        currency: selectedCurrency,
        exchange_rate: gateway === "flutterwave" ? EXCHANGE_RATES[selectedCurrency] : 1,
        fee_strategy: event.fee_strategy || "pass_to_attendees"
      });
    }
    // Paid tickets: DO NOT update tier quantity here – webhook will do it.
    await sendTicketEmail(
      reference,
      formData.email,
      formData.fullName,
      event,
      tier,
      quantity,
      selectedCurrency,
      feeCalculation.totalAmount,
      feeCalculation.totalAmountInNGN,
      feeCalculation.serviceFee,
      feeCalculation.vatFee,
      event.fee_strategy || "pass_to_attendees"
    );

    const params = new URLSearchParams({
      paid: "true",
      ref: reference,
      title: event.title,
      location: event.location,
      venue: event.venue || event.location,
      date: formatEventDate(event.date),
      time: formatEventTime(event.time),
      type: tier.name,
      qty: quantity.toString(),
      price: formatCurrency(feeCalculation.totalAmount, selectedCurrency),
      priceInNGN: formatCurrency(feeCalculation.totalAmountInNGN, "NGN"),
      serviceFee: formatCurrency(feeCalculation.serviceFee, selectedCurrency),
      vatFee: formatCurrency(feeCalculation.vatFee, selectedCurrency),
      feeStrategy: event.fee_strategy || "pass_to_attendees",
      lat: event.lat?.toString() || "0",
      lng: event.lng?.toString() || "0",
      orderId,
      paymentGateway: gateway,
      currency: selectedCurrency,
      exchangeRate: selectedCurrency !== "NGN" ? EXCHANGE_RATES[selectedCurrency].toString() : "1"
    }).toString();
    closeCheckout();
    navigate(`/bag/${orderId}?${params}`);
  }, [event, formData, selectedCurrency, feeCalculation, closeCheckout, navigate]);

  // Payment submit for paid tickets (unchanged)
  const handlePaymentSubmit = useCallback(async () => {
    if (!tempSelectedTier || !event || !feeCalculation) return;
    setCheckoutLoading(true);
    try {
      const tier = tempSelectedTier;
      const quantity = tempQuantity;
      const orderId = `STH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const isDefaultTier = tier.id?.toString().startsWith("default-");
      if (!isDefaultTier) {
        const { data: stock, error: stockError } = await supabase
          .from("ticketTiers")
          .select("quantity_total, quantity_sold")
          .eq("id", tier.id)
          .maybeSingle();

        if (stockError && stockError.code !== "PGRST116") {
          console.error("Stock check error:", stockError);
        }
        if (stock) {
          const remaining = (stock.quantity_total || 0) - (stock.quantity_sold || 0);
          if (remaining < quantity) {
            throw new Error(`Only ${remaining} tickets left.`);
          }
        }
      }
      let paymentResponse;
      if (selectedGateway === "paystack") paymentResponse = await handlePaystackPayment(orderId, tier, quantity);
      else paymentResponse = await handleFlutterwavePayment(orderId, tier, quantity);
      await processSuccessfulPayment(paymentResponse, orderId, tier, quantity, selectedGateway);
    } catch (err: any) {
      console.error(err);
      if (err.message !== "Payment cancelled by user") alert(err.message + "\nPlease try again.");
      setCheckoutLoading(false);
    }
  }, [tempSelectedTier, tempQuantity, event, formData, feeCalculation, selectedGateway, selectedCurrency, handlePaystackPayment, handleFlutterwavePayment, processSuccessfulPayment, closeCheckout, navigate]);

  const CountrySelector = () => {
    const countries = [
      { name: "Nigeria", code: "NG", vat: 7.5 }, { name: "United States", code: "US", vat: 0 },
      { name: "United Kingdom", code: "GB", vat: 20 }, { name: "Canada", code: "CA", vat: 5 },
      { name: "Ghana", code: "GH", vat: 12.5 }, { name: "Kenya", code: "KE", vat: 16 },
      { name: "South Africa", code: "ZA", vat: 15 }, { name: "Germany", code: "DE", vat: 19 },
      { name: "France", code: "FR", vat: 20 }, { name: "Italy", code: "IT", vat: 22 },
      { name: "Spain", code: "ES", vat: 21 }, { name: "Australia", code: "AU", vat: 10 },
      { name: "India", code: "IN", vat: 18 }, { name: "Japan", code: "JP", vat: 10 },
      { name: "China", code: "CN", vat: 13 }, { name: "Brazil", code: "BR", vat: 12 },
      { name: "Mexico", code: "MX", vat: 16 }, { name: "UAE", code: "AE", vat: 5 },
      { name: "Saudi Arabia", code: "SA", vat: 15 }
    ];
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" /> Select Your Country for VAT Calculation</h4>
        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          {countries.map(c => <option key={c.code} value={c.name}>{c.name} {c.vat > 0 ? `(VAT: ${c.vat}%)` : "(No VAT)"}</option>)}
        </select>
        <p className="text-sm text-gray-600 mt-2">VAT rate varies by country. Your selection affects the final amount.</p>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin text-purple-600" /></div>;
  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold">Event Not Found</h1>
        <Link to="/events" className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-xl">Browse Events</Link>
      </div>
    );
  }

  // ==================== FULL RENDER (all original sections, unchanged) ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-purple-700 font-bold group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" /> Back
          </button>
          <button onClick={() => { if (navigator.share) navigator.share({ title: event.title, url: window.location.href }); else { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); } }} className="p-2 text-gray-600 hover:text-purple-600 rounded-full transition">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN – all event details (image, info, guest artists, map, rides) */}
          <div className="space-y-8">
            {/* Event Image */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative group rounded-3xl overflow-hidden shadow-2xl bg-gray-100">
              <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px]">
                <img src={event.image || PLACEHOLDER_IMAGE} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; setImageError(true); }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
                <div className="absolute top-6 left-6 flex flex-wrap gap-3">
                  {event.ticketTiers?.some(t => parsePrice(t.price).isFree) && <div className="px-4 py-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase rounded-xl flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Free Entry</div>}
                  <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase rounded-xl flex items-center gap-2"><Globe className="w-3 h-3" /> Global Event</div>
                  {event.fee_strategy === "absorb_fees" && <div className="px-4 py-2 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase rounded-xl flex items-center gap-2"><Receipt className="w-3 h-3" /> No Extra Fees</div>}
                </div>
                <div className="absolute bottom-10 left-10 right-10">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                    <span className="text-purple-400 font-black text-xs uppercase tracking-[0.4em] mb-4 block">{event.category || ""}</span>
                    <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight drop-shadow-2xl">{event.title}</h1>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Event Details Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-50">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-100/50 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase">Tickets Available</span></div>
                  <span className="text-gray-300">|</span><span className="text-[10px] font-bold text-gray-400 uppercase">{event.category || "Event"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                  <div className="group flex items-center gap-4 p-4 rounded-3xl bg-gray-50 hover:bg-purple-50 transition">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-purple-600 group-hover:scale-110"><Calendar className="w-6 h-6" /></div>
                    <div><p className="text-[10px] font-black text-gray-400 uppercase">When</p><p className="font-bold text-gray-900">{formatEventDate(event.date)}{event.time && <span className="text-purple-600 ml-1">@ {formatEventTime(event.time)}</span>}</p></div>
                  </div>
                  <div className="group flex items-center gap-4 p-4 rounded-3xl bg-gray-50 hover:bg-blue-50 transition">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110"><MapPin className="w-6 h-6" /></div>
                    <div className="min-w-0"><p className="text-[10px] font-black text-gray-400 uppercase">Where</p><p className="font-bold text-gray-900 truncate">{event.location}</p>{event.venue && event.venue !== event.location && <p className="text-[11px] text-gray-500 truncate">{event.venue}</p>}</div>
                  </div>
                </div>
                {(event.contact_email || event.contact_phone) && (
                  <div className="mb-8 p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl border border-purple-100">
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-purple-600" /> Contact Organizer</h3>
                    <div className="space-y-3">
                      {event.contact_email && <a href={`mailto:${event.contact_email}`} className="flex items-center gap-3 text-gray-700 hover:text-purple-700"><Mail className="w-5 h-5 text-purple-500" /><span className="font-medium break-all">{event.contact_email}</span></a>}
                      {event.contact_phone && <a href={`tel:${event.contact_phone}`} className="flex items-center gap-3 text-gray-700 hover:text-purple-700"><Phone className="w-5 h-5 text-purple-500" /><span className="font-medium">{event.contact_phone}</span></a>}
                    </div>
                  </div>
                )}
                {event.description && (
                  <div className="relative pt-8 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-4">The Experience</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Guest Artists Section */}
            {guestArtists.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-12 space-y-8">
                <div className="flex items-end justify-between px-2">
                  <div className="space-y-1"><h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3"><div className="w-2 h-8 bg-purple-600 rounded-full" />The Lineup</h3><p className="text-gray-500 font-medium">Experience world-class performances</p></div>
                  <div className="hidden sm:block px-4 py-2 bg-purple-50 rounded-2xl border border-purple-100"><span className="text-purple-700 font-bold">{guestArtists.length} Headliners</span></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {guestArtists.map(artist => {
                    const social = artist.social_media || {};
                    return (
                      <motion.div key={artist.id} whileHover={{ y: -8 }} className="group bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition">
                        <div className="relative h-64 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                          <img src={artist.image_url || `https://ui-avatars.com/api/?name=${artist.name}&background=7c3aed&color=fff`} alt={artist.name} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-110 transition duration-700" />
                          {artist.role && <div className="absolute top-4 right-4 z-20 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full"><span className="text-white text-[10px] font-black uppercase">{artist.role}</span></div>}
                          <div className="absolute bottom-4 left-6 z-20"><h4 className="text-2xl font-black text-white drop-shadow-lg">{artist.name}</h4></div>
                        </div>
                        <div className="p-6 pt-4 space-y-4">
                          <p className="text-gray-500 text-sm italic line-clamp-2">"{artist.bio || "Performing live at the main stage."}"</p>
                          <div className="flex gap-4">
                            {social.instagram && <a href={social.instagram} target="_blank" className="text-gray-400 hover:text-pink-500"><Instagram className="w-5 h-5" /></a>}
                            {social.youtube && <a href={social.youtube} target="_blank" className="text-gray-400 hover:text-red-600"><Youtube className="w-5 h-5" /></a>}
                            {social.twitter && <a href={social.twitter} target="_blank" className="text-gray-400 hover:text-blue-400"><X className="w-5 h-5" /></a>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Map Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
              <div className="flex justify-between mb-4"><h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Navigation className="w-5 h-5 text-purple-600" /> Event Location</h3><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" className="text-sm text-purple-600 font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> Open in Google Maps</a></div>
              {event.lat && event.lng ? <div className="h-48 sm:h-64 rounded-xl overflow-hidden mb-4"><EventMap lat={event.lat} lng={event.lng} venue={event.venue || event.location} title={event.title} /></div> : <div className="h-48 sm:h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex flex-col items-center justify-center p-6"><div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mb-4"><MapPin className="w-8 h-8 text-purple-600" /></div><p className="text-gray-700 font-medium mb-2">Map Not Available</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-6 rounded-full">Search on Google Maps</a></div>}
            </motion.div>

            {/* Rides Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl sm:rounded-3xl p-4 md:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between mb-6"><div><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CarIcon className="w-6 h-6 text-purple-600" /> Get a Ride to the Event</h3><p className="text-gray-600 text-sm">Book rides with your favorite ride-hailing apps</p></div><div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full">{RIDE_SERVICES.length} Options</div></div>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
                {RIDE_SERVICES.map(ride => {
                  const Icon = ride.icon;
                  const link = getRideDeepLink(ride, event.location, event.lat, event.lng);
                  return (
                    <motion.a key={ride.id} href={link} target="_blank" whileHover={{ scale: 1.02, y: -2 }} className="group p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition bg-gradient-to-br from-white to-gray-50">
                      <div className="flex items-start gap-4"><div className={`w-12 h-12 ${ride.color} rounded-2xl flex items-center justify-center shadow-sm`}><Icon className="w-6 h-6 text-white" /></div><div><h4 className="font-bold text-gray-900 group-hover:text-purple-700">{ride.name}</h4><p className="text-xs text-gray-600 line-clamp-2">{ride.description}</p>{ride.rideTypes && <div className="flex flex-wrap gap-1 mt-2">{ride.rideTypes.slice(0, 3).map((type, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{type}</span>)}</div>}</div></div>
                    </motion.a>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN – "Get Ticket" button */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl sticky top-20 sm:top-24 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center"><Ticket className="w-10 h-10 text-purple-600" /></div>
                <h3 className="text-2xl font-black text-gray-800">Ready to attend?</h3>
                <p className="text-gray-500 text-sm">Secure your spot now – tickets are limited!</p>
                <button onClick={handleOpenCheckout} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl transition flex items-center justify-center gap-3 text-lg"><Ticket className="w-5 h-5" /> Get Ticket</button>
                <div className="flex justify-center gap-4 text-xs text-gray-400 pt-4 border-t border-gray-100 w-full"><span><Shield className="w-3 h-3 inline" /> Secure Checkout</span><span><Globe className="w-3 h-3 inline" /> Global Payments</span><span><Zap className="w-3 h-3 inline" /> Instant Delivery</span></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trust Signals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
          <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl sm:rounded-3xl p-6 lg:p-8 text-white overflow-hidden">
            <div className="relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <div className="lg:col-span-2"><div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center"><Sparkles className="w-7 h-7" /></div><div><h3 className="text-2xl font-bold">Transparent Fee System</h3><p className="text-purple-200">Clear breakdown of all charges</p></div></div><div className="mb-6"><h4 className="font-bold mb-2 flex items-center gap-2"><Receipt className="w-5 h-5 text-blue-300" /> Fee Structure</h4><div className="grid grid-cols-2 gap-3"><div className="bg-white/10 p-4 rounded-xl"><div className="text-xs text-purple-200">Service Fee</div><div className="font-bold text-xl">{SERVICE_FEE_PERCENT}%</div><div className="text-xs opacity-80">{event.fee_strategy === "absorb_fees" ? "Paid by organizer" : "Paid by buyer"}</div></div><div className="bg-white/10 p-4 rounded-xl"><div className="text-xs text-purple-200">VAT</div><div className="font-bold text-xl">Varies by country</div><div className="text-xs opacity-80">Always applied</div></div></div></div><div className="flex flex-wrap gap-2"><span className="px-3 py-1 bg-white/10 rounded-full text-xs flex items-center gap-1"><Percent className="w-3 h-3" /> Clear Pricing</span><span className="px-3 py-1 bg-white/10 rounded-full text-xs flex items-center gap-1"><Receipt className="w-3 h-3" /> Itemized Receipt</span><span className="px-3 py-1 bg-white/10 rounded-full text-xs flex items-center gap-1"><CreditCard className="w-3 h-3" /> Multi‑Currency</span></div></div>
                <div className="space-y-4"><div className="bg-white/10 p-5 rounded-2xl"><h4 className="font-bold mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-green-300" /> Paystack (NGN)</h4><p className="text-sm text-purple-200 mb-2">Local payments in Nigerian Naira</p><div className="text-xs space-y-1"><div className="flex justify-between"><span>Processing Fee:</span><span>₦100</span></div><div className="flex justify-between"><span>Currencies:</span><span>NGN only</span></div></div></div><div className="bg-white/10 p-5 rounded-2xl"><h4 className="font-bold mb-2 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-300" /> Flutterwave (Global)</h4><p className="text-sm text-purple-200 mb-2">International payments</p><div className="flex flex-wrap gap-1"><span className="px-2 py-0.5 bg-blue-500/20 rounded text-xs">USD</span><span className="px-2 py-0.5 bg-blue-500/20 rounded text-xs">GBP</span><span className="px-2 py-0.5 bg-blue-500/20 rounded text-xs">EUR</span><span className="px-2 py-0.5 bg-blue-500/20 rounded text-xs">GHS</span></div></div></div>
                <div className="space-y-4"><div className="flex items-start gap-3"><div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-300" /></div><div><h4 className="font-bold">No Hidden Fees</h4><p className="text-sm text-purple-200">All charges clearly displayed before payment</p></div></div><div className="flex items-start gap-3"><div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center"><BadgeCheck className="w-5 h-5 text-emerald-300" /></div><div><h4 className="font-bold">VAT Compliant</h4><p className="text-sm text-purple-200">Proper tax calculation based on country</p></div></div><div className="flex items-start gap-3"><div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center"><Receipt className="w-5 h-5 text-orange-300" /></div><div><h4 className="font-bold">Flexible Fee Options</h4><p className="text-sm text-purple-200">Organizers can choose who pays fees</p></div></div></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ==================== MODALS ==================== */}
      {showCheckout && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-2" onClick={closeCheckout}>
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sticky top-0 flex justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {checkoutStep === "tiers" && "Select Tickets"}
                    {checkoutStep === "billing" && "Billing Info"}
                    {checkoutStep === "confirm" && "Confirm Order"}
                    {checkoutStep === "payment" && "Payment"}
                  </h2>
                  <p className="text-sm">{event.title}</p>
                </div>
                <button onClick={closeCheckout}><X className="w-6 h-6" /></button>
              </div>
              {timerActive && timerSeconds !== null && timerSeconds > 0 && (
                <div className="bg-amber-50 p-3 text-center text-amber-700 flex justify-center gap-2">
                  <Timer className="w-4 h-4" /> Reservation expires in {formatTimer(timerSeconds)}
                </div>
              )}
              {/* Step indicator – hide confirm & payment for free tickets */}
              <div className="flex px-4 pt-2 gap-1 text-center text-xs">
                {["tiers", "billing", ...(isFree ? [] : ["confirm", "payment"])].map((step) => (
                  <div key={step} className="flex-1">
                    <div className={`h-1 rounded-full ${checkoutStep === step ? "bg-purple-600" : "bg-gray-200"}`} />
                    {step}
                  </div>
                ))}
              </div>
              <div className="p-5">
                {checkoutStep === "tiers" && (
                  <div className="space-y-3">
                    {event.ticketTiers?.map((tier) => {
                      const soldOut = isTierSoldOut(tier);
                      const available = getAvailableTickets(tier);
                      const isSelected = tempSelectedTier?.id === tier.id;
                      return (
                        <div
                          key={tier.id}
                          onClick={() => !soldOut && setTempSelectedTier(tier)}
                          className={`p-3 border rounded-xl cursor-pointer transition ${
                            soldOut
                              ? "opacity-50 cursor-not-allowed bg-gray-100"
                              : isSelected
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-900">{tier.name}</h4>
                              <p className="text-sm text-gray-600">{tier.description}</p>
                              <p className="text-xs mt-1 font-medium">
                                {soldOut ? (
                                  <span className="text-red-500">Sold Out</span>
                                ) : (
                                  <span className="text-green-600">{available} ticket{available !== 1 ? 's' : ''} available</span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-purple-700">
                                {formatPriceInOriginalCurrency(tier)}
                              </span>
                            </div>
                          </div>
                          {isSelected && !soldOut && (
                            <div className="flex justify-end gap-3 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTempQuantity(Math.max(1, tempQuantity - 1));
                                }}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300"
                              >
                                -
                              </button>
                              <span className="text-lg font-bold">{tempQuantity}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (available > tempQuantity) setTempQuantity(tempQuantity + 1);
                                  else alert(`Only ${available} tickets left`);
                                }}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={handleNextStep}
                      disabled={!tempSelectedTier}
                      className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                    >
                      {isFree ? "Continue →" : "Continue →"}
                    </button>
                  </div>
                )}
                {checkoutStep === "billing" && (
                  <div className="space-y-4">
                    <input type="text" placeholder="Full name *" value={formData.fullName} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} className={`w-full p-3 border rounded-xl ${formErrors.fullName ? "border-red-500" : ""}`} />
                    <input type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className={`w-full p-3 border rounded-xl ${formErrors.email ? "border-red-500" : ""}`} />
                    <input type="tel" placeholder="Phone *" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className={`w-full p-3 border rounded-xl ${formErrors.phone ? "border-red-500" : ""}`} />
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)} /> I agree to <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-purple-600 underline">Privacy Policy</button>
                    </label>
                    <div className="flex gap-3">
                      <button onClick={handlePrevStep} className="flex-1 bg-gray-200 py-3 rounded-xl">← Back</button>
                      {isFree ? (
                        <button
                          onClick={handleFreeTicketSubmit}
                          disabled={checkoutLoading}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                        >
                          {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get Free Ticket"}
                        </button>
                      ) : (
                        <button onClick={handleNextStep} className="flex-1 bg-purple-600 text-white py-3 rounded-xl">Continue →</button>
                      )}
                    </div>
                  </div>
                )}
                {!isFree && checkoutStep === "confirm" && feeCalculation && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between"><span>Event</span><span>{event.title}</span></div>
                      <div className="flex justify-between"><span>Ticket</span><span>{tempSelectedTier?.name} × {tempQuantity}</span></div>
                      {feeCalculation.breakdown.map((item, idx) => <div key={idx} className="flex justify-between text-sm"><span>{item.item}</span><span>{formatCurrency(item.amount, selectedCurrency)}</span></div>)}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>{formatCurrency(feeCalculation.totalAmount, selectedCurrency)}</span></div>
                    </div>
                    <div className="flex gap-3"><button onClick={handlePrevStep} className="flex-1 bg-gray-200 py-3 rounded-xl">← Back</button><button onClick={handleNextStep} className="flex-1 bg-purple-600 text-white py-3 rounded-xl">Proceed →</button></div>
                  </div>
                )}
                {!isFree && checkoutStep === "payment" && feeCalculation && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {PAYMENT_GATEWAYS.map(gw => {
                        const Icon = gw.icon;
                        const isDisabled = feeCalculation.totalAmount !== 0 && gw.id === "paystack" && selectedCurrency !== "NGN";
                        return (
                          <button key={gw.id} onClick={() => { if (!isDisabled) { setSelectedGateway(gw.id as PaymentGateway); if (gw.id === "paystack") setSelectedCurrency("NGN"); } }} className={`p-3 rounded-xl border-2 ${selectedGateway === gw.id && !isDisabled ? "border-purple-500 bg-purple-50" : "border-gray-200"} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`} disabled={isDisabled}>
                            <Icon className="w-6 h-6 mx-auto mb-1" /><div className="font-bold text-sm">{gw.name}</div><div className="text-xs text-gray-500">{gw.description}</div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedGateway === "flutterwave" && feeCalculation.totalAmount !== 0 && (
                      <div className="flex justify-between p-3 bg-gray-100 rounded-xl">
                        <span>Currency: {selectedCurrency} ({getCurrencySymbol(selectedCurrency)})</span>
                        <button onClick={() => setShowCurrencySelector(true)} className="text-purple-600 text-sm">Change</button>
                      </div>
                    )}
                    <button onClick={handlePaymentSubmit} disabled={checkoutLoading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                      {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${formatCurrency(feeCalculation.totalAmount, selectedCurrency)}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showCurrencySelector && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowCurrencySelector(false)}>
            <div className="bg-white rounded-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-3">Select Currency</h3>
              <div className="space-y-2">
                {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.currencies.map(curr => (
                  <button key={curr} onClick={() => { setSelectedCurrency(curr as Currency); setShowCurrencySelector(false); }} className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 flex justify-between">
                    <span>{curr} ({getCurrencySymbol(curr as Currency)})</span>
                    {selectedCurrency === curr && <CheckCircle className="w-5 h-5 text-purple-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showPrivacyModal && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPrivacyModal(false)}>
            <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-3">Privacy Policy</h2>
              <p className="text-gray-700 mb-6">Your information is used only for ticket delivery and payment processing.</p>
              <button onClick={() => { setShowPrivacyModal(false); setAcceptPrivacy(true); }} className="w-full bg-purple-600 text-white py-3 rounded-xl">I Accept</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}