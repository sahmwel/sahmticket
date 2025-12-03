// src/pages/EventDetails.tsx
'use client';

import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Navigation,
  Share2,
  Car,
  Loader2,
  X,
  CreditCard,
  Mail,
  User,
  Smartphone,
  Building2,
  CheckCircle,
  Clock,
} from "lucide-react";

import EventMap from "../components/EventMap";
import type { Event, TicketTier } from "../data/events";
import { events } from "../data/events";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: any) => { openIframe: () => void };
    };
  }
}


export default function EventDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [buyingTier, setBuyingTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{ [tier: string]: number }>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    orderId: string;
    eventId: string;
    tier: TicketTier;
    quantity: number;
  } | null>(null);

  // Checkout form states
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Get event from location state if available (clicked from Home/Events)
  let event: Event | undefined = location.state?.event;

  // Fallback: find event by ID from events data if direct URL access
  if (!event && id) {
    event = events.find((e) => e.id === id);
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-xl font-semibold text-purple-700">Event not found</p>
          <Link to="/events" className="mt-4 text-purple-600 underline">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const formatEventDate = (isoOrLabel?: string) => {
    if (!isoOrLabel) return "";
    // If it doesn’t look like ISO, assume it’s already a label
    if (!isoOrLabel.includes("T")) return isoOrLabel;

    const d = new Date(isoOrLabel);
    return d.toLocaleDateString("en-GB", {
      weekday: "long", // Friday
      day: "2-digit", // 28
      month: "long", // November
    }); // e.g. Friday, 28 November
  };
  const formatEventTime = (isoOrTime?: string) => {
    if (!isoOrTime) return "";
    // if it doesn’t look like ISO, assume it is already a clean time string
    if (!isoOrTime.includes("T")) return isoOrTime;

    const d = new Date(isoOrTime);
    return d.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }); // e.g. 8:00 PM
  };

  const generateOrderId = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

  const handleQuantityChange = (tierName: string, increment: boolean) => {
    setQuantities((prev) => {
      const current = prev[tierName] || 1;
      const next = increment ? current + 1 : Math.max(1, current - 1);
      return { ...prev, [tierName]: next };
    });
  };

  const handleBuyTicket = (tier: TicketTier) => {
    const quantity = quantities[tier.name] || 1;
    setBuyingTier(tier.name);

    setTimeout(() => {
      const orderId = generateOrderId();
      setCheckoutData({
        orderId,
        eventId: event!.id,
        tier,
        quantity,
      });
      setShowCheckout(true);
      setBuyingTier(null);
    }, 800);
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setCheckoutData(null);
    setFormData({ fullName: "", email: "", phone: "" });
  };

  // Checkout handlers
  const handleCheckoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const cleanPrice = parseInt(
    checkoutData?.tier.price.replace(/[^0-9]/g, "") || "0",
    10
  );
  const totalAmount = cleanPrice * (checkoutData?.quantity || 1);
  const formattedTotal = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(totalAmount);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert("Please fill all fields");
      return;
    }
    if (!formData.email.includes("@")) {
      alert("Enter a valid email");
      return;
    }

    setCheckoutLoading(true);

    // Load Paystack script if not loaded
    if (!window.PaystackPop && !document.getElementById("paystack-script")) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.id = "paystack-script";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => initializePaystack();
      return;
    }

    initializePaystack();
  };

  const initializePaystack = () => {
    if (!window.PaystackPop) {
      alert("Paystack is loading. Please try again.");
      setCheckoutLoading(false);
      return;
    }

    const handler = window.PaystackPop.setup({
      key: process.env.REACT_APP_PAYSTACK_KEY || "pk_test_your_key_here",
      email: formData.email,
      amount: totalAmount * 100,
      channels: ["card", "bank_transfer", "ussd", "mobile_money", "opay", "qr", "bank"],
      metadata: {
        custom_fields: [
          { display_name: "Event ID", variable_name: "event_id", value: event?.id },
          { display_name: "Ticket Type", variable_name: "ticket_type", value: checkoutData!.tier.name },
          { display_name: "Quantity", variable_name: "quantity", value: checkoutData!.quantity },
          { display_name: "Customer Name", variable_name: "customer_name", value: formData.fullName },
          { display_name: "Phone", variable_name: "phone", value: formData.phone },
        ],
      },
      reference: checkoutData!.orderId,
      callback: async () => {
        try {
          // Send ticket email via your API (optional)
          if (process.env.REACT_APP_API_URL) {
            await fetch(`${process.env.REACT_APP_API_URL}/api/send-ticket`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: formData.email,
                orderId: checkoutData!.orderId,
                ticketDetails: {
                  eventTitle: event?.title,
                  ticketType: checkoutData!.tier.name,
                  tickets: checkoutData!.quantity,
                  totalPaid: formattedTotal
                }
              })
            });
          }
        } catch (err) {
          console.error("Failed to send ticket email", err);
        } finally {
          closeCheckout();
          navigate(`/bag/${checkoutData!.orderId}`);
        }
      },
      onClose: () => {
        setCheckoutLoading(false);
      },
    });

    handler.openIframe();
  };

  return (
    <>
      {/* Breadcrumb - Tighter spacing */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link
            to="/events"
            className="flex items-center gap-1.5 text-purple-600 hover:text-purple-800 font-semibold transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Events
          </Link>
          <p className="text-xs font-bold text-gray-600 truncate max-w-[200px] sm:max-w-[300px]">
            {event.title}
          </p>
        </div>
      </div>

      {/* Hero - Fixed date format & full visibility */}
      <section className="relative w-full">
        <div className="relative h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />
          <div className="absolute bottom-10 sm:bottom-14 left-6 sm:left-8 right-6 sm:right-8 max-w-5xl">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-white drop-shadow-2xl space-y-4 sm:space-y-5"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                {event.title}
              </h1>

              {/* Date • Time • Location */}
              <div className="flex flex-wrap items-center gap-4 text-base sm:text-lg md:text-xl font-extrabold bg-black/55 rounded-2xl px-5 py-3 sm:px-7 sm:py-4 w-fit">
                {/* Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-yellow-400" />
                  <span className="uppercase tracking-wide">
                    {formatEventDate(event.date)}
                  </span>
                </div>

                <span className="text-gray-300">•</span>

                {/* Time (bold with AM/PM) */}
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-300" />
                  {(() => {
                    const t = formatEventTime(event.date || event.time); // e.g. "8:00 PM"
                    const [timePart, meridiem] = t.split(" ");
                    return (
                      <span className="tracking-wide">
                        <span className="font-black">{timePart}</span>{" "}
                        <span className="font-black">{meridiem}</span>
                      </span>
                    );
                  })()}
                </div>

                <span className="text-gray-300">•</span>

                {/* Location */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-400" />
                  <span className="whitespace-normal break-words">
                    {event.location}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 bg-gray-50 -mt-12 sm:-mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: Details & Tickets */}
            <div className="lg:col-span-2 space-y-8 lg:space-y-12">
              {/* About */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <h2 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6">About This Event</h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  {event.description || "An unforgettable night filled with music, energy, and pure vibes. Don't miss out!"}
                </p>
              </motion.div>

              {/* Tickets */}
              {event.ticketTiers && event.ticketTiers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 sm:p-8 text-white">
                    <h2 className="text-2xl sm:text-3xl font-black">Secure Your Spot</h2>
                    <p className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base">Choose your ticket tier below</p>
                  </div>
                  <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                    {event.ticketTiers.map((tier: TicketTier) => (
                      <div
                        key={tier.name}
                        className={`border-2 rounded-3xl p-5 sm:p-6 transition-all ${tier.available === false
                            ? "border-gray-300 opacity-60"
                            : "border-purple-500 hover:border-purple-600 shadow-lg hover:shadow-xl"
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="min-w-0">
                            <h3 className="text-xl sm:text-2xl font-black leading-tight">{tier.name}</h3>
                            <p className="text-gray-600 mt-1 text-sm sm:text-base line-clamp-2">{tier.description}</p>
                          </div>
                          <div className="text-2xl sm:text-3xl font-black text-purple-600 whitespace-nowrap">
                            {tier.price}
                          </div>
                        </div>

                        {tier.available !== false && (
                          <div className="flex items-center gap-3 sm:gap-4 mb-4">
                            <button
                              onClick={() => handleQuantityChange(tier.name, false)}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition flex items-center justify-center flex-shrink-0"
                            >
                              -
                            </button>
                            <span className="text-lg sm:text-xl font-bold min-w-[2rem] text-center">
                              {quantities[tier.name] || 1}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(tier.name, true)}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition flex items-center justify-center flex-shrink-0"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {tier.available !== false && (
                          <button
                            onClick={() => handleBuyTicket(tier)}
                            disabled={buyingTier === tier.name}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2.5 hover:scale-[1.02] transition-all shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {buyingTier === tier.name ? (
                              <>
                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
                                <span>Get Ticket • {tier.price}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Venue & Share */}
            <div className="space-y-6 sm:space-y-8">
              {(event.venue || event.lat) && (
                <motion.div
                  initial={{ opacity: 0, x: 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 sm:p-6 text-white">
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                      <MapPin className="w-6 h-6 sm:w-8 sm:h-8" /> Venue
                    </h3>
                  </div>
                  <div className="p-5 sm:p-6">
                    <h4 className="text-lg sm:text-xl font-bold">{event.venue || "Venue TBC"}</h4>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">{event.address || event.location}</p>
                  </div>

                  {event.lat && event.lng && (
                    <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-b-3xl overflow-hidden mx-1 sm:mx-0 -mt-1">
                      <EventMap lat={event.lat} lng={event.lng} venue={event.venue || event.title} />
                    </div>
                  )}

                  <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
                    {event.lat && event.lng && (
                      <a
                        href={`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${event.lat}&dropoff[longitude]=${event.lng}&dropoff[nickname]=${encodeURIComponent(event.venue || "Event Venue")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-black text-white text-center font-bold py-4 sm:py-5 rounded-2xl hover:bg-gray-900 transition text-sm sm:text-base"
                      >
                        <Car className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" /> Ride with Uber
                      </a>
                    )}
                    <button className="w-full border-2 border-purple-600 text-purple-600 font-bold py-4 sm:py-5 rounded-2xl hover:bg-purple-50 transition text-sm sm:text-base">
                      <Navigation className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2" /> Get Directions
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 text-center">
                <Share2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-purple-600 mb-3 sm:mb-4" />
                <p className="text-xl sm:text-2xl font-black">Share This Event</p>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Tell your friends!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Paystack Checkout Modal */}
      {showCheckout && checkoutData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeCheckout}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black">Checkout</h2>
                <p className="text-lg font-semibold">{checkoutData.tier.name}</p>
              </div>
              <button
                onClick={closeCheckout}
                className="p-2 hover:bg-white/20 rounded-xl transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              <div className="grid lg:grid-cols-2 gap-8 h-full">
                {/* Form */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-6 text-center">
                    <h3 className="text-xl font-black mb-3 flex items-center justify-center gap-2 text-purple-800">
                      <CreditCard className="w-6 h-6" />
                      Secure Payment
                    </h3>
                    <p className="text-purple-700 font-semibold">Paystack - Trusted by millions</p>
                  </div>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                    {/* Full Name */}
                    <div>
                      <label className="flex items-center gap-3 text-lg font-bold text-gray-700 mb-3">
                        <User size={22} className="text-purple-600" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleCheckoutChange}
                        placeholder="Enter your full name"
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none text-lg transition-all shadow-sm hover:shadow-md"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="flex items-center gap-3 text-lg font-bold text-gray-700 mb-3">
                        <Mail size={22} className="text-purple-600" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleCheckoutChange}
                        placeholder="your@email.com"
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none text-lg transition-all shadow-sm hover:shadow-md"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="flex items-center gap-3 text-lg font-bold text-gray-700 mb-3">
                        <Smartphone size={22} className="text-purple-600" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleCheckoutChange}
                        placeholder="08012345678"
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none text-lg transition-all shadow-sm hover:shadow-md"
                        required
                      />
                    </div>

                    {/* Pay Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={checkoutLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl py-5 rounded-3xl shadow-2xl hover:shadow-3xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Opening Paystack...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-6 h-6" />
                          Pay {formattedTotal} Now
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>

                {/* Order Summary */}
                <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl p-6 lg:p-8 border border-gray-100 sticky top-6">
                  <h3 className="text-2xl font-black mb-6 text-center lg:text-left">Order Summary</h3>

                  <div className="space-y-4 mb-8 text-lg">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-gray-600 font-semibold">{checkoutData.tier.name}</span>
                      <span className="font-black text-xl">{checkoutData.tier.price}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                      <span className="text-gray-600">Quantity</span>
                      <span className="font-black text-xl">{checkoutData.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 bg-purple-50 rounded-2xl p-4 border-2 border-purple-100">
                      <span className="text-2xl font-black">Total</span>
                      <span className="text-3xl font-black text-purple-600">{formattedTotal}</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-6 mb-6">
                    <h4 className="text-lg font-bold text-purple-800 mb-4 text-center">Pay with any method</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-xl shadow-sm text-center hover:shadow-md transition">
                        <CreditCard className="mx-auto mb-1 text-purple-600" size={20} />
                        <span className="text-xs font-bold">Card</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl shadow-sm text-center hover:shadow-md transition">
                        <Building2 className="mx-auto mb-1 text-purple-600" size={20} />
                        <span className="text-xs font-bold">Bank</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl shadow-sm text-center hover:shadow-md transition">
                        <Smartphone className="mx-auto mb-1 text-purple-600" size={20} />
                        <span className="text-xs font-bold">USSD</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-orange-200 text-center hover:shadow-md transition">
                        <div className="w-6 h-6 mx-auto mb-1 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">O</div>
                        <span className="text-xs font-bold text-orange-600">OPAY</span>
                      </div>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} className="text-green-500" />
                      Instant ticket delivery to email
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} className="text-green-500" />
                      100% secure via Paystack
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} className="text-green-500" />
                      Verified events only
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}