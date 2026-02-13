// src/pages/EventDetails.tsx - COMPLETE UPDATE with ID & Slug support
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
  Map,
  Percent,
  Receipt
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
  fee_strategy?: 'pass_to_attendees' | 'absorb_fees';
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

// VAT rates by country
const VAT_RATES: Record<string, number> = {
  'NG': 7.5,   // Nigeria VAT
  'US': 0,     // USA (varies by state)
  'GB': 20,    // UK VAT
  'DE': 19,    // Germany
  'FR': 20,    // France
  'IT': 22,    // Italy
  'ES': 21,    // Spain
  'CA': 5,     // Canada GST/HST (varies by province)
  'GH': 12.5,  // Ghana VAT
  'KE': 16,    // Kenya VAT
  'ZA': 15,    // South Africa VAT
  'AU': 10,    // Australia GST
  'IN': 18,    // India GST
  'JP': 10,    // Japan
  'CN': 13,    // China VAT
  'BR': 12,    // Brazil ICMS (varies by state)
  'MX': 16,    // Mexico VAT
  'AE': 5,     // UAE VAT
  'SA': 15,    // Saudi Arabia VAT
  'DEFAULT': 7.5 // Default VAT rate
};

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

// Fee Constants
const SERVICE_FEE_PERCENT = 5; // 5% service fee
const PLATFORM_FEE_PERCENT = 2; // 2% platform fee (your revenue)

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

// Get VAT rate based on country (simplified for demo)
const getVatRate = (countryCode?: string): number => {
  if (!countryCode) return VAT_RATES.DEFAULT;
  
  // Map country codes to VAT rates
  const countryMap: Record<string, string> = {
    'Nigeria': 'NG',
    'USA': 'US',
    'United States': 'US',
    'UK': 'GB',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Ghana': 'GH',
    'Kenya': 'KE',
    'South Africa': 'ZA',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES'
  };
  
  const code = countryMap[countryCode] || countryCode.substring(0, 2).toUpperCase();
  return VAT_RATES[code] || VAT_RATES.DEFAULT;
};

// Calculate fees based on strategy
interface FeeCalculation {
  baseAmount: number;
  serviceFee: number;
  vatFee: number;
  platformFee: number;
  processingFee: number;
  totalAmount: number;
  totalAmountInNGN: number;
  breakdown: {
    item: string;
    amount: number;
    percentage?: number;
  }[];
}
const calculateFees = (
  baseAmount: number,
  feeStrategy: 'pass_to_attendees' | 'absorb_fees' = 'pass_to_attendees',
  currency: Currency = 'NGN',
  processingFee: number = 0,
  country?: string
): FeeCalculation => {
  // 🆓 FREE TICKET – absolutely no fees
  if (baseAmount === 0) {
    return {
      baseAmount: 0,
      serviceFee: 0,
      vatFee: 0,
      platformFee: 0,
      processingFee: 0,
      totalAmount: 0,
      totalAmountInNGN: 0,
      breakdown: [{ item: 'Ticket Price', amount: 0 }]
    };
  }

  const vatRate = getVatRate(country);
  
  if (feeStrategy === 'absorb_fees') {
    const vatFee = (baseAmount * vatRate) / 100;
    const totalAmount = baseAmount + vatFee + processingFee;
    
    const baseAmountInNGN = convertToNGN(baseAmount, currency);
    const vatFeeInNGN = convertToNGN(vatFee, currency);
    const processingFeeInNGN = convertToNGN(processingFee, currency);
    const totalAmountInNGN = baseAmountInNGN + vatFeeInNGN + processingFeeInNGN;
    
    return {
      baseAmount,
      serviceFee: 0,
      vatFee,
      platformFee: (baseAmount * PLATFORM_FEE_PERCENT) / 100,
      processingFee,
      totalAmount,
      totalAmountInNGN,
      breakdown: [
        { item: 'Ticket Price', amount: baseAmount },
        ...(vatFee > 0 ? [{ item: `VAT (${vatRate}%)`, amount: vatFee, percentage: vatRate }] : []),
        ...(processingFee > 0 ? [{ item: 'Processing Fee', amount: processingFee }] : [])
      ]
    };
  } else {
    const serviceFee = (baseAmount * SERVICE_FEE_PERCENT) / 100;
    const subtotal = baseAmount + serviceFee;
    const vatFee = (subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatFee + processingFee;
    
    const baseAmountInNGN = convertToNGN(baseAmount, currency);
    const serviceFeeInNGN = convertToNGN(serviceFee, currency);
    const vatFeeInNGN = convertToNGN(vatFee, currency);
    const processingFeeInNGN = convertToNGN(processingFee, currency);
    const totalAmountInNGN = baseAmountInNGN + serviceFeeInNGN + vatFeeInNGN + processingFeeInNGN;
    
    return {
      baseAmount,
      serviceFee,
      vatFee,
      platformFee: (baseAmount * PLATFORM_FEE_PERCENT) / 100,
      processingFee,
      totalAmount,
      totalAmountInNGN,
      breakdown: [
        { item: 'Ticket Price', amount: baseAmount },
        { item: `Service Fee (${SERVICE_FEE_PERCENT}%)`, amount: serviceFee, percentage: SERVICE_FEE_PERCENT },
        ...(vatFee > 0 ? [{ item: `VAT (${vatRate}%)`, amount: vatFee, percentage: vatRate }] : []),
        ...(processingFee > 0 ? [{ item: 'Processing Fee', amount: processingFee }] : [])
      ]
    };
  }
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

    // Helper: check if a string is a valid UUID (version 4)
    const isValidUUID = (str: string | null | undefined): boolean => {
      if (!str) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Sanitize UUID fields – set to null if not a valid UUID
    let event_id = isValidUUID(ticketData.event_id) ? ticketData.event_id : null;
    let tier_id = isValidUUID(ticketData.tier_id) ? ticketData.tier_id : null;

    // Warn if an invalid UUID was passed
    if (ticketData.event_id && !event_id) {
      console.warn(`⚠️ Invalid event_id UUID: "${ticketData.event_id}" – setting to NULL`);
    }
    if (ticketData.tier_id && !tier_id) {
      console.warn(`⚠️ Invalid tier_id UUID: "${ticketData.tier_id}" – setting to NULL`);
    }

    const insertData = {
      event_id: event_id,                  // ✅ now either valid UUID or null
      tier_id: tier_id,                   // ✅ now either valid UUID or null
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
      // ❌ REMOVED payment_method – column does not exist in your table
      exchange_rate: ticketData.exchange_rate || 1,
      amount_in_ngn: ticketData.amount_in_ngn || ticketData.price,
      service_fee: ticketData.service_fee || 0,
      vat_fee: ticketData.vat_fee || 0,
      processing_fee: ticketData.processing_fee || 0,
      fee_strategy: ticketData.fee_strategy || 'pass_to_attendees'
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
    .select("id, order_id, reference, email, created_at, quantity, currency, payment_gateway, price, amount_in_ngn, service_fee, vat_fee, fee_strategy")
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

const sendTicketEmail = async (
  reference: string, 
  email: string, 
  name: string, 
  event: EventDetailsType, 
  tier: TicketTier, 
  quantity: number, 
  currency: Currency = 'NGN', 
  amount: number, 
  amountInNGN: number,
  serviceFee: number,
  vatFee: number,
  feeStrategy: string
) => {
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
          serviceFee: serviceFee > 0 ? `₦${serviceFee.toLocaleString()}` : 'N/A',
          vatFee: vatFee > 0 ? `₦${vatFee.toLocaleString()}` : 'N/A',
          feeStrategy: feeStrategy === 'absorb_fees' ? 'Fees Absorbed by Organizer' : 'Fees Paid by Buyer',
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
  const { slug } = useParams<{ slug: string }>(); // This can be either ID or slug
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
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculation | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria');

  // Calculate fees when checkout data or settings change
  useEffect(() => {
    if (!checkoutData || !selectedTier) {
      setFeeCalculation(null);
      return;
    }

    const baseAmount = parsePrice(selectedTier.price).amount * (checkoutData.quantity || 1);
    const processingFee = getProcessingFee(
      PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)!,
      selectedCurrency
    );
    
    const calculation = calculateFees(
      baseAmount,
      event?.fee_strategy || 'pass_to_attendees',
      selectedCurrency,
      processingFee,
      selectedCountry
    );
    
    setFeeCalculation(calculation);
  }, [checkoutData, selectedTier, selectedGateway, selectedCurrency, event?.fee_strategy, selectedCountry]);

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

  // ================ UPDATED EVENT FETCHING ================
  // Handles BOTH ID and Slug with graceful fallback
useEffect(() => {
  const fetchEventAndArtists = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    console.log("🔍 Looking up event with identifier:", slug);

    try {
      let eventData: any = null;
      
      // ===== STEP 1: Check if identifier is a valid UUID =====
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      
      if (isUuid) {
        // Only try by ID if it's a valid UUID (prevents 400 errors)
        const { data: idData, error: idError } = await supabase
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
          .maybeSingle();

        if (!idError && idData) {
          eventData = idData;
          console.log(`✅ Event found by ID: ${idData.id}`);
        }
      }

      // ===== STEP 2: If not found by ID (or wasn't UUID), try by slug =====
      if (!eventData) {
        const { data: slugData, error: slugError } = await supabase
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
          .maybeSingle();

        if (!slugError && slugData) {
          eventData = slugData;
          console.log(`✅ Event found by slug: ${slugData.slug}`);
        }
      }

      // ===== If no event found, throw error =====
      if (!eventData) {
        console.error("❌ Event not found with identifier:", slug);
        throw new Error("Event not found");
      }

      // ===== STEP 3: Try to fetch fee_strategy (column may not exist yet) =====
      let feeStrategy: 'pass_to_attendees' | 'absorb_fees' = 'pass_to_attendees';
      try {
        const { data: feeData } = await supabase
          .from("events")
          .select("fee_strategy")
          .eq("id", eventData.id)
          .maybeSingle();

        if (feeData?.fee_strategy === 'absorb_fees') {
          feeStrategy = 'absorb_fees';
          console.log("📊 Fee strategy found:", feeStrategy);
        }
      } catch (feeErr) {
        console.warn("⚠️ fee_strategy column not available yet, using default");
      }

      // ===== STEP 4: Fetch guest artists =====
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

      // ===== STEP 5: Fetch ticket tiers =====
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

      // ===== STEP 6: Set event state =====
      setEvent({
        ...eventData,
        ticketTiers: displayTiers,
        guest_artists: processedArtists,
        fee_strategy: feeStrategy
      });

      // Initialize quantities for each tier
      const initQuantities: { [key: string]: number } = {};
      displayTiers.forEach(tier => {
        if (tier.id) initQuantities[tier.id] = 1;
      });
      setQuantities(initQuantities);

      setNotFound(false);
    } catch (err) {
      console.error("❌ Event fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  fetchEventAndArtists();
}, [slug]);
  // ================ END OF UPDATED FETCHING ================

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
    if (!showCheckout || !feeCalculation || feeCalculation.totalAmount === 0 || selectedGateway !== 'paystack') return;

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
  }, [showCheckout, feeCalculation, selectedGateway]);

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
    setSelectedCountry('Nigeria');
    setFeeCalculation(null);
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
    if (!event || !window.PaystackPop || !feeCalculation) {
      throw new Error("Payment gateway not available");
    }

    const amountInKobo = Math.round(feeCalculation.totalAmount * 100);
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
            { display_name: "Fee Strategy", variable_name: "fee_strategy", value: event.fee_strategy || 'pass_to_attendees' },
            { display_name: "Service Fee", variable_name: "service_fee", value: feeCalculation.serviceFee.toString() },
            { display_name: "VAT Fee", variable_name: "vat_fee", value: feeCalculation.vatFee.toString() },
            { display_name: "Total NGN", variable_name: "total_ngn", value: feeCalculation.totalAmountInNGN.toString() }
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
  }, [event, formData, feeCalculation]);

  // Flutterwave Payment Handler
  const handleFlutterwavePayment = useCallback(async (orderId: string, tier: TicketTier, quantity: number) => {
    if (!event || !FLUTTERWAVE_PUBLIC_KEY || !feeCalculation) {
      throw new Error("Flutterwave configuration error");
    }

    const finalAmount = feeCalculation.totalAmount;

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
        total_in_ngn: feeCalculation.totalAmountInNGN,
        fee_strategy: event.fee_strategy || 'pass_to_attendees',
        service_fee: feeCalculation.serviceFee,
        vat_fee: feeCalculation.vatFee,
        vat_country: selectedCountry,
        vat_rate: getVatRate(selectedCountry)
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
  }, [event, formData, selectedCurrency, exchangeRates, selectedCountry, feeCalculation]);

  // Process successful payment
  const processSuccessfulPayment = useCallback(async (
    response: any,
    orderId: string,
    tier: TicketTier,
    quantity: number,
    gateway: PaymentGateway
  ) => {
    try {
      if (!event || !feeCalculation) {
        throw new Error("Event or fee calculation not available");
      }

      const ticketPromises = [];
      
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
          price: feeCalculation.totalAmount,
          amount_in_ngn: feeCalculation.totalAmountInNGN,
          service_fee: feeCalculation.serviceFee,
          vat_fee: feeCalculation.vatFee,
          processing_fee: feeCalculation.processingFee,
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
          exchange_rate: gateway === 'flutterwave' ? exchangeRates[selectedCurrency] : 1,
          fee_strategy: event.fee_strategy || 'pass_to_attendees'
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
        feeCalculation.totalAmount,
        feeCalculation.totalAmountInNGN,
        feeCalculation.serviceFee,
        feeCalculation.vatFee,
        event.fee_strategy || 'pass_to_attendees'
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
        price: formatCurrency(feeCalculation.totalAmount, selectedCurrency),
        priceInNGN: formatCurrency(feeCalculation.totalAmountInNGN, 'NGN'),
        serviceFee: formatCurrency(feeCalculation.serviceFee, selectedCurrency),
        vatFee: formatCurrency(feeCalculation.vatFee, selectedCurrency),
        feeStrategy: event!.fee_strategy || 'pass_to_attendees',
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
  }, [event, formData, selectedCurrency, exchangeRates, feeCalculation, closeCheckout, navigate]);

  // Checkout submit handler
 const handleCheckoutSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();

  if (!checkoutData || !event || !validateForm() || !feeCalculation) {
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
      amount: feeCalculation.totalAmount,
      amountInNGN: feeCalculation.totalAmountInNGN,
      serviceFee: feeCalculation.serviceFee,
      vatFee: feeCalculation.vatFee,
      feeStrategy: event.fee_strategy
    });

    // ============ FIXED STOCK CHECK ============
    // Skip stock check for default tiers (they don't exist in the ticketTiers table)
    const isDefaultTier = tierId.toString().startsWith('default-');
    let remaining = Infinity; // Assume plenty available

    if (!isDefaultTier) {
      try {
        const { data: stockCheck, error: stockError } = await supabase
          .from("ticketTiers")
          .select("quantity_total, quantity_sold")
          .eq("id", tierId)
          .single();

        if (stockError || !stockCheck) {
          console.warn("⚠️ Stock check failed – assuming tickets are available", { tierId, error: stockError });
          // Do not throw – proceed with purchase
        } else {
          remaining = (stockCheck.quantity_total || 0) - (stockCheck.quantity_sold || 0);
          if (remaining < quantity) {
            throw new Error(`Sold out! Only ${remaining} tickets left.`);
          }
        }
      } catch (stockErr) {
        console.warn("⚠️ Stock check exception – assuming availability", stockErr);
        // Continue anyway
      }
    }
    // ============================================

    // Free ticket flow - NO FEES ON FREE TICKETS
    if (feeCalculation.totalAmount === 0) {
      const freeRef = `STH-FREE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      console.log("🆓 FREE TICKET FLOW STARTED - NO FEES");
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
          service_fee: 0,
          vat_fee: 0,
          processing_fee: 0,
          qr_code_url,
          reference: freeRef,
          order_id: orderId,
          purchased_at: new Date().toISOString().replace('Z', ''),
          buyer_email: formData.email.trim(),
          created_at: new Date().toISOString(),
          quantity: 1,
          tier_description: tier?.description || tierName,
          payment_gateway: 'free',
          currency: 'NGN',
          fee_strategy: event.fee_strategy || 'pass_to_attendees'
        };

        return await insertTicket(ticketData);
      });

      await Promise.all(insertPromises);

      const verification = await verifyTicketsInDatabase(orderId, freeRef);

      if (!verification.tickets || verification.tickets.length === 0) {
        throw new Error(`Failed to create tickets. Please contact support with Order ID: ${orderId}`);
      }

      console.log(`✅ ${verification.totalQuantity} free tickets verified in database`);

      // Only try to update tier quantity if it's a real tier
      if (!isDefaultTier) {
        await updateTierQuantity(tierId, quantity);
      }

      await sendTicketEmail(
        freeRef,
        formData.email,
        formData.fullName,
        event,
        tier,
        quantity,
        'NGN',
        0,
        0,
        0,
        0,
        event.fee_strategy || 'pass_to_attendees'
      );

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
        serviceFee: "₦0",
        vatFee: "₦0",
        feeStrategy: event.fee_strategy || 'pass_to_attendees',
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
    console.error("❌ Checkout Failure:", err);
    
    const errorMessage = err.message !== "Payment cancelled by user" 
      ? `${err.message}\n\nPlease try:\n1. Checking your internet connection\n2. Refreshing the page\n3. Using a different browser\n\nIf the problem persists, contact support with:\n- Order ID: ${checkoutData?.orderId || 'N/A'}\n- Email: ${formData.email}`
      : "Payment was cancelled";

    if (errorMessage !== "Payment was cancelled") {
      alert(errorMessage);
    }
    setCheckoutLoading(false);
  }
}, [
  checkoutData,
  event,
  formData,
  validateForm,
  closeCheckout,
  navigate,
  selectedGateway,
  selectedCurrency,
  feeCalculation,
  handlePaystackPayment,
  handleFlutterwavePayment,
  processSuccessfulPayment
]);
  // Country selector component
  const CountrySelector = () => {
    const countries = [
      { name: 'Nigeria', code: 'NG', vat: 7.5 },
      { name: 'United States', code: 'US', vat: 0 },
      { name: 'United Kingdom', code: 'GB', vat: 20 },
      { name: 'Canada', code: 'CA', vat: 5 },
      { name: 'Ghana', code: 'GH', vat: 12.5 },
      { name: 'Kenya', code: 'KE', vat: 16 },
      { name: 'South Africa', code: 'ZA', vat: 15 },
      { name: 'Germany', code: 'DE', vat: 19 },
      { name: 'France', code: 'FR', vat: 20 },
      { name: 'Italy', code: 'IT', vat: 22 },
      { name: 'Spain', code: 'ES', vat: 21 },
      { name: 'Australia', code: 'AU', vat: 10 },
      { name: 'India', code: 'IN', vat: 18 },
      { name: 'Japan', code: 'JP', vat: 10 },
      { name: 'China', code: 'CN', vat: 13 },
      { name: 'Brazil', code: 'BR', vat: 12 },
      { name: 'Mexico', code: 'MX', vat: 16 },
      { name: 'UAE', code: 'AE', vat: 5 },
      { name: 'Saudi Arabia', code: 'SA', vat: 15 }
    ];

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          Select Your Country for VAT Calculation
        </h4>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {countries.map(country => (
            <option key={country.code} value={country.name}>
              {country.name} {country.vat > 0 ? `(VAT: ${country.vat}%)` : '(No VAT)'}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-600 mt-2">
          VAT rate varies by country. Your selection affects the final amount.
        </p>
      </div>
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
                {event.fee_strategy === 'absorb_fees' && (
                  <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Receipt className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> FEES INCLUDED
                  </span>
                )}
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

            {/* Guest Artists Section */}
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
                        className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="relative">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-white shadow-md">
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
                              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                                {artist.role}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg sm:text-xl group-hover:text-purple-700 transition-colors mb-2">
                              {artist.name}
                            </h4>
                            
                            {artist.bio && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                {artist.bio}
                              </p>
                            )}

                            {Object.keys(socialLinks).length > 0 && (
                              <div className="flex gap-3 sm:gap-4">
                                {'instagram' in socialLinks && socialLinks.instagram && (
                                  <a
                                    href={socialLinks.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-pink-600 transition-colors"
                                    title="Instagram"
                                  >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
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
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
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
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
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
                                    <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
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
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${ride.color} rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg group-hover:text-purple-700 transition-colors truncate">
                              {ride.name}
                            </h4>
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-purple-600 flex-shrink-0 mt-1" />
                          </div>
                          
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 sm:mb-3">
                            {ride.description}
                          </p>
                          
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
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.a>
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
            className="space-y-6 sm:space-y-8"
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl sticky top-20 sm:top-24">
              {/* Fee Strategy Badge */}
              {event.fee_strategy && (
                <div className="mb-4 p-3 rounded-xl border bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-amber-800 text-sm">
                      {event.fee_strategy === 'absorb_fees' 
                        ? 'Organizer is covering service fees'
                        : 'Service fees apply to ticket purchase'
                      }
                    </span>
                  </div>
                </div>
              )}

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
                      className={`relative p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all ${
                        soldOut
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
                            <span className={`px-2 py-1 sm:px-3 sm:py-1 text-xs font-bold text-white rounded-full flex-shrink-0 ${
                              isFree
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
                      <span className="text-gray-600 text-sm sm:text-base">Ticket Price:</span>
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
                      <h3 className="text-lg sm:text-2xl lg:text-3xl font-bold">Transparent Fee System</h3>
                      <p className="text-sm sm:text-lg text-purple-200">Clear breakdown of all charges</p>
                    </div>
                  </div>
                  
                  {/* Fee Breakdown */}
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                      Fee Structure
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div className="bg-white/10 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="text-xs text-purple-200">Service Fee</div>
                        <div className="font-bold text-lg sm:text-xl">{SERVICE_FEE_PERCENT}%</div>
                        <div className="text-xs opacity-80 mt-1">
                          {event.fee_strategy === 'absorb_fees' ? 'Paid by organizer' : 'Paid by buyer'}
                        </div>
                      </div>
                      <div className="bg-white/10 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="text-xs text-purple-200">VAT</div>
                        <div className="font-bold text-lg sm:text-xl">Varies by country</div>
                        <div className="text-xs opacity-80 mt-1">Always applied</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4">
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <Percent className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Clear Pricing
                    </span>
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <Receipt className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Itemized Receipt
                    </span>
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                      <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Multi-Currency
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
                      <h4 className="font-bold text-white text-sm sm:text-base">No Hidden Fees</h4>
                      <p className="text-xs sm:text-sm text-purple-200">All charges clearly displayed before payment</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">VAT Compliant</h4>
                      <p className="text-xs sm:text-sm text-purple-200">Proper tax calculation based on country</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">Flexible Fee Options</h4>
                      <p className="text-xs sm:text-sm text-purple-200">Organizers can choose who pays fees</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Checkout Modal */}
{showCheckout && checkoutData && selectedTier && feeCalculation && (
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
            {event.fee_strategy && (
              <p className="text-sm opacity-80 mt-1">
                {event.fee_strategy === 'absorb_fees' 
                  ? 'Organizer is covering service fees'
                  : 'Service fees apply'
                }
              </p>
            )}
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
            {/* Country Selector - ONLY FOR PAID TICKETS */}
            {feeCalculation.totalAmount !== 0 && <CountrySelector />}

            {/* Payment Gateway Selection - ONLY FOR PAID TICKETS */}
            {feeCalculation.totalAmount !== 0 && (
              <div className="mt-6 mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl border border-blue-100">
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
                        className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                          selectedGateway === gateway.id
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
                      </button>
                    );
                  })}
                </div>
                
                {/* Currency info - ONLY FOR PAID FLUTTERWAVE */}
                {selectedGateway === 'flutterwave' && feeCalculation.totalAmount !== 0 && (
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
                      Change Currency
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Form Fields - ALWAYS SHOWN */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-3 py-3 sm:px-4 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${
                    formErrors.fullName ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-3 sm:px-4 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-3 sm:px-4 sm:py-4 border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${
                    formErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.phone && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1 ml-1">Please enter a valid phone number</p>
                )}
              </div>
            </div>

            {/* Privacy Policy - ALWAYS SHOWN */}
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

            {/* Order Summary with Fee Breakdown - ALWAYS SHOWN */}
            {feeCalculation && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Order Summary</h3>
                
                <div className="space-y-2 sm:space-y-3">
                  {/* Fee Strategy - ALWAYS SHOWN */}
                  {event.fee_strategy && (
                    <div className="mb-3 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                          {event.fee_strategy === 'absorb_fees' 
                            ? 'Service fees are covered by the organizer'
                            : 'Service fees apply to your purchase'
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Itemized Breakdown */}
                  {feeCalculation.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm sm:text-base">
                        {item.item}
                        {item.percentage !== undefined && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({item.percentage}%)
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-sm sm:text-base">
                        {formatCurrency(item.amount, selectedCurrency)}
                      </span>
                    </div>
                  ))}
                  
                  {/* Total */}
                  <div className="pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-base sm:text-xl font-bold text-purple-600">
                      <span>Total Amount</span>
                      <span>{formatCurrency(feeCalculation.totalAmount, selectedCurrency)}</span>
                    </div>
                    
                    {/* Equivalent in NGN - ONLY FOR PAID TICKETS */}
                    {selectedCurrency !== 'NGN' && feeCalculation.totalAmount !== 0 && (
                      <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                        Equivalent to: {formatCurrency(feeCalculation.totalAmountInNGN, 'NGN')} Nigerian Naira
                      </div>
                    )}
                    
                    {/* Free ticket notice */}
                    {feeCalculation.totalAmount === 0 && (
                      <div className="mt-2 p-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-800 text-center font-medium">
                          No fees on free tickets! Complete your order.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
              ) : feeCalculation.totalAmount === 0 ? (
                <span className="text-sm sm:text-base">Get Free Ticket</span>
              ) : selectedGateway === 'paystack' ? (
                <span className="text-sm sm:text-base">Pay with Paystack</span>
              ) : (
                <span className="text-sm sm:text-base">Pay with Flutterwave</span>
              )}
            </button>

            {/* Security Badges - ALWAYS SHOWN */}
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
      {showCurrencySelector && (
        <Modal>
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl w-full max-w-xs sm:max-w-sm md:max-w-lg max-h-[90vh] overflow-y-auto mx-2"
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6 flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Select Currency</h2>
                <button
                  onClick={() => setShowCurrencySelector(false)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg ml-2"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="space-y-2">
                  {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.currencies.map((currency) => (
                    <button
                      key={currency}
                      onClick={() => {
                        setSelectedCurrency(currency as Currency);
                        setShowCurrencySelector(false);
                      }}
                      className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl flex items-center justify-between ${
                        selectedCurrency === currency
                          ? 'bg-purple-50 border-2 border-purple-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{currency} ({getCurrencySymbol(currency as Currency)})</span>
                      {selectedCurrency === currency && (
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </Modal>
      )}

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