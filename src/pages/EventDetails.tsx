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
  Navigation,
  Share2,
  Car,
  Loader2,
  X,
  CreditCard,
  Mail,
  User,
  Smartphone,
  CheckCircle,
  Clock,
  Lock,
} from "lucide-react";
import EventMap from "../components/EventMap";
import { supabase } from "../lib/supabaseClient";

interface TicketTier {
  name: string;
  price: string;
  description?: string;
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
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export default function EventDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingTier, setBuyingTier] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error(error);
        setLoading(false);
        return;
      }

      const parsedEvent = {
        ...data,
        ticketTiers: typeof data.ticketTiers === "string"
          ? JSON.parse(data.ticketTiers)
          : data.ticketTiers || [],
      };

      setEvent(parsedEvent);
      setLoading(false);
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (event?.ticketTiers) {
      const init: { [key: string]: number } = {};
      event.ticketTiers.forEach((tier) => (init[tier.name] = 1));
      setQuantities(init);
    }
  }, [event]);

  useEffect(() => {
    if (!showCheckout) return;
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [showCheckout]);

  if (loading) return <div className="min-h-screen flex-center"><Loader2 className="w-12 h-12 animate-spin text-purple-600" /></div>;
  if (!event) return <div className="min-h-screen flex-center text-2xl text-purple-700">Event not found</div>;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

  const handleQuantityChange = (tierName: string, increment: boolean) => {
    setQuantities(prev => ({
      ...prev,
      [tierName]: Math.max(1, (prev[tierName] || 1) + (increment ? 1 : -1))
    }));
  };

  const handleBuyTicket = (tier: TicketTier) => {
    const quantity = quantities[tier.name] || 1;
    setBuyingTier(tier.name);

    setTimeout(() => {
      setCheckoutData({
        orderId: `ORD-${Date.now()}`,
        tier,
        quantity,
      });
      setShowCheckout(true);
      setBuyingTier(null);
    }, 600);
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setCheckoutData(null);
    setFormData({ fullName: "", email: "", phone: "" });
    setCheckoutLoading(false);
  };

  const cleanPrice = checkoutData?.tier.price
    ? parseInt(checkoutData.tier.price.replace(/[^0-9]/g, ""), 10) || 0
    : 0;
  const totalAmount = cleanPrice * (checkoutData?.quantity || 1);
  const formattedTotal = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(totalAmount);

  const initializePaystack = () => {
    if (!window.PaystackPop) {
      alert("Payment gateway loading...");
      setCheckoutLoading(false);
      return;
    }

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert("Please fill in all fields");
      setCheckoutLoading(false);
      return;
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
      },
      callback: (response: { reference: string }) => {
        closeCheckout();
        navigate(`/bag/${checkoutData.orderId}?ref=${response.reference}`);
      },
      onClose: () => setCheckoutLoading(false),
    });

    handler.openIframe ? handler.openIframe() : handler();
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);
    initializePaystack();
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/events" className="flex items-center gap-2 text-purple-600 hover:underline font-medium">
            <ArrowLeft className="w-5 h-5" /> Back to Events
          </Link>
        </div>
      </div>

      {/* Hero + Info on Top */}
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
                  <p className="text-xl font-bold">{formatTime(event.date)}</p>
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
                <p className="text-lg text-gray-700">
                  {event.description || "An amazing night of music and vibes!"}
                </p>
              </motion.div>

              {/* Ticket Tiers */}
              {event.ticketTiers && Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                    <h2 className="text-3xl font-black">Get Your Ticket</h2>
                  </div>
                  <div className="p-8 space-y-6">
                    {event.ticketTiers.map((tier: TicketTier) => (
                      <div key={tier.name} className="border-2 border-purple-200 rounded-3xl p-6 hover:border-purple-500 transition">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-2xl font-black">{tier.name}</h3>
                          <span className="text-3xl font-black text-purple-600">{tier.price}</span>
                        </div>
                        {tier.description && <p className="text-gray-600 mb-4">{tier.description}</p>}
                        <div className="flex items-center gap-4 mb-6">
                          <button
                            onClick={() => handleQuantityChange(tier.name, false)}
                            className="w-12 h-12 rounded-full border-2 hover:bg-gray-100"
                          >−</button>
                          <span className="text-xl font-bold w-16 text-center">
                            {quantities[tier.name] || 1}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(tier.name, true)}
                            className="w-12 h-12 rounded-full border-2 hover:bg-gray-100"
                          >+</button>
                        </div>
                        <button
                          onClick={() => handleBuyTicket(tier)}
                          disabled={buyingTier === tier.name}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                          {buyingTier === tier.name ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Ticket className="w-6 h-6" />
                              Get {tier.name} • {tier.price}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-10">
              {/* Venue & Map */}
              {(event.venue || event.lat) && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden"
                >
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
                        href={`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${event.lat}&dropoff[longitude]=${event.lng}&dropoff[nickname]=${encodeURIComponent(event.venue || "Event")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-black text-white text-center font-bold py-4 rounded-2xl hover:bg-gray-900 transition"
                      >
                        <Car className="inline mr-2" /> Ride with Uber
                      </a>
                    )}
                    <button className="w-full border-2 border-purple-600 text-purple-600 font-bold py-4 rounded-2xl hover:bg-purple-50 transition">
                      <Navigation className="inline mr-2" /> Get Directions
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Share */}
              <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
                <Share2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
                <p className="text-2xl font-black">Share This Event</p>
                <p className="text-gray-600">Let your friends know!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {showCheckout && checkoutData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
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
              <button onClick={closeCheckout} className="p-2 hover:bg-white/20 rounded-xl">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={(e) => { e.preventDefault(); setCheckoutLoading(true); }}>
                <div className="space-y-6">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-5 py-4 border rounded-2xl"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-4 border rounded-2xl"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-5 py-4 border rounded-2xl"
                    required
                  />
                </div>

                <div className="mt-8 p-6 bg-gray-50 rounded-2xl text-center">
                  <p className="text-3xl font-black text-purple-600">
                    {formattedTotal}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl py-5 rounded-3xl"
                >
                  {checkoutLoading ? "Processing..." : `Pay ${formattedTotal}`}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}