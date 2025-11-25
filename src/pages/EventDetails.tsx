'use client';

import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
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
} from "lucide-react";

import EventMap from "../components/EventMap";

// ———————————————————————— Types ————————————————————————
export interface TicketTier {
  name: string;
  price: string;
  description: string;
  available?: boolean;
}

export interface Event {
  id: string;
  title: string;
  image: string;
  description?: string;
  date: string;
  time?: string;
  location: string;
  address?: string;
  venue?: string;
  price: string;
  lat?: number;
  lng?: number;
  ticketTiers?: TicketTier[];
}

// ———————————————————————— Props ————————————————————————
interface EventDetailsProps {
  events: Event[]; // All events passed from parent (e.g., via context, loader, or API)
}

// ———————————————————————— Component ————————————————————————
export default function EventDetails({ events }: EventDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [buyingTier, setBuyingTier] = useState<string | null>(null);

  // Find current event
  const event = events.find((e) => e.id === id);

  // Generate unique order ID
  const generateOrderId = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

  const handleBuyTicket = (tier: TicketTier) => {
    if (!event) return;

    setBuyingTier(tier.name);

    setTimeout(() => {
      const orderId = generateOrderId();
      let quantity = 1;

      if (tier.name.toLowerCase().includes("couple") || tier.name.includes("Queen & Slim")) {
        quantity = 2;
      } else if (tier.name.toLowerCase().includes("table")) {
        const match = tier.name.match(/\d+/);
        quantity = match ? parseInt(match[0]) : 6;
      }

      navigate({
        pathname: `/bag/${orderId}`,
        search: `?event=${event.id}&type=${encodeURIComponent(tier.name)}&price=${encodeURIComponent(tier.price)}&qty=${quantity}`,
      });
    }, 1800);
  };

  // Loading state (in real app, use React Router loader or Suspense)
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-xl font-semibold text-purple-700">Loading event...</p>
        </div>
      </div>
    );
  }

  // Similar events (exclude current)
  const similarEvents = events
    .filter((e) => e.id !== event.id && e.location.includes(event.location.split(",")[0]))
    .slice(0, 6);

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/events"
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold transition"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Events
          </Link>
          <p className="text-sm font-medium text-gray-600 truncate max-w-md">
            {event.title}
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="relative h-96 sm:h-screen max-h-screen overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white leading-tight drop-shadow-2xl">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-8 mt-8 text-white text-lg sm:text-2xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-7 h-7" />
                  {event.date} {event.time && `• ${event.time}`}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-7 h-7" />
                  {event.location}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-gray-50 -mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10 lg:gap-16">
            {/* Left: Details & Tickets */}
            <div className="lg:col-span-2 space-y-12">

              {/* About */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-8 shadow-2xl"
              >
                <h2 className="text-3xl font-black mb-6">About This Event</h2>
                <p className="text-lg text-gray-700 leading-relaxed">
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
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                    <h2 className="text-3xl font-black">Secure Your Spot</h2>
                    <p className="text-white/90 mt-2">Choose your ticket tier below</p>
                  </div>
                  <div className="p-8 space-y-6">
                    {event.ticketTiers.map((tier) => (
                      <div
                        key={tier.name}
                        className={`border-2 rounded-3xl p-6 transition-all ${
                          tier.available === false
                            ? "border-gray-300 opacity-60"
                            : "border-purple-500 hover:border-purple-600 shadow-lg"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="text-2xl font-black">{tier.name}</h3>
                            <p className="text-gray-600 mt-1">{tier.description}</p>
                          </div>
                          <div className="text-3xl font-black text-purple-600">
                            {tier.price}
                          </div>
                        </div>

                        {tier.available !== false && (
                          <button
                            onClick={() => handleBuyTicket(tier)}
                            disabled={buyingTier === tier.name}
                            className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl disabled:opacity-80"
                          >
                            {buyingTier === tier.name ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Ticket className="w-6 h-6" />
                                Get Ticket • {tier.price}
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
            <div className="space-y-8">
              {/* Venue Info */}
              {(event.venue || event.lat) && (
                <motion.div
                  initial={{ opacity: 0, x: 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <MapPin className="w-8 h-8" /> Venue
                    </h3>
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl font-bold">{event.venue || "Venue TBC"}</h4>
                    <p className="text-gray-600 mt-1">{event.address || event.location}</p>
                  </div>

                  {event.lat && event.lng && (
                    <div className="h-64 bg-gray-100">
                      <EventMap lat={event.lat} lng={event.lng} venue={event.venue || event.title} />
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {event.lat && event.lng && (
                      <a
                        href={`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${event.lat}&dropoff[longitude]=${event.lng}&dropoff[nickname]=${encodeURIComponent(event.venue || "Event Venue")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-black text-white text-center font-bold py-5 rounded-2xl hover:bg-gray-900 transition"
                      >
                        <Car className="w-6 h-6 inline mr-2" /> Ride with Uber
                      </a>
                    )}
                    <button className="w-full border-2 border-purple-600 text-purple-600 font-bold py-5 rounded-2xl hover:bg-purple-50 transition">
                      <Navigation className="w-6 h-6 inline mr-2" /> Get Directions
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Share */}
              <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
                <Share2 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
                <p className="text-2xl font-black">Share This Event</p>
                <p className="text-gray-600 mt-2">Tell your friends!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Events */}
      {similarEvents.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl font-black text-center mb-12 text-gray-900"
            >
              More Events You’ll Love
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {similarEvents.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to={`/event/${ev.id}`}
                    className="block bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-2"
                  >
                    <img src={ev.image} alt={ev.title} className="w-full h-56 object-cover" />
                    <div className="p-6">
                      <h3 className="text-xl font-black line-clamp-2 group-hover:text-purple-600 transition">
                        {ev.title}
                      </h3>
                      <div className="mt-3 flex items-center gap-2 text-gray-600">
                        <MapPin size={16} />
                        <span className="text-sm">{ev.location}</span>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-2xl font-black text-purple-600">{ev.price}</span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar size={16} /> {ev.date}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}