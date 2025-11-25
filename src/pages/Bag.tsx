'use client';

import { useParams, Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { ArrowLeft, Calendar, MapPin, Car, Share2, Download, CheckCircle } from "lucide-react";

interface Event {
  id: string;
  title: string;
  location: string;
  venue: string;
  address: string;
  date: string;
  time?: string;
  lat: number;
  lng: number;
  ticketTiers?: { name: string; price: string; description: string; available?: boolean }[];
}

const allEvents: Event[] = [
  {
    id: "love-in-the-boulevard-ibadan",
    title: "Love In The Boulevard",
    location: "The Patio Ibadan",
    venue: "Basorun Road, Ibadan, Oyo State",
    address: "Basorun Road, Ibadan, Oyo State, Nigeria",
    date: "Nov 29, 2025",
    time: "6:00 PM",
    lat: 7.3775,
    lng: 3.9470,
    ticketTiers: [
      { name: "Regular Access", price: "₦7,500", description: "Admits 1 person", available: true },
      { name: "Queen & Slim", price: "₦13,500", description: "Admits 2 people", available: true },
      { name: "Table for 8", price: "₦525,000", description: "VIP Table + Premium Drinks", available: true },
      { name: "Table for 12", price: "₦1,050,000", description: "Ultra VIP + Bottle Service", available: false },
    ],
  },
];

interface Order {
  id: string;
  eventId: string;
  eventTitle: string;
  location: string;
  venue: string;
  date: string;
  time: string;
  tickets: number;
  ticketType: string;
  totalPaid: string;
  lat: number;
  lng: number;
}

export default function Bag() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const eventId = searchParams.get("event");
    const ticketType = searchParams.get("type");
    const price = searchParams.get("price");
    const tickets = parseInt(searchParams.get("qty") || "1");

    if (!eventId || !ticketType || !price) {
      setLoading(false);
      return;
    }

    const event = allEvents.find(e => e.id === eventId);
    if (!event) {
      setLoading(false);
      return;
    }

    const newOrder: Order = {
      id: orderId,
      eventId: event.id,
      eventTitle: event.title,
      location: event.location,
      venue: event.venue,
      date: event.date,
      time: event.time || "6:00 PM",
      tickets,
      ticketType,
      totalPaid: price,
      lat: event.lat,
      lng: event.lng,
    };

    setTimeout(() => {
      setOrder(newOrder);
      setLoading(false);
    }, 800);
  }, [orderId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-bold text-purple-600">Preparing your ticket...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-2xl">
        Invalid order — please try again
      </div>
    );
  }

  const uberUrl = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${order.lat}&dropoff[longitude]=${order.lng}&dropoff[nickname]=${encodeURIComponent(order.location)}`;

  return (
    <>
      {/* ONLY CHANGE: Added padding so sticky navbar doesn't cover the success header */}
      <div className="pt-24 lg:pt-28">

        {/* Success Header */}
        <section className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center text-white">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.8 }}>
              <CheckCircle className="w-24 h-24 mx-auto mb-6 text-white" />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-black mb-4">You're In!</h1>
            <p className="text-xl md:text-2xl opacity-90">Your tickets are confirmed. Get ready for an unforgettable night.</p>
          </div>
        </section>

        {/* Main Ticket Card */}
        <section className="py-16 -mt-10 relative z-10">
          <div className="max-w-2xl mx-auto px-6">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-purple-100"
            >
              {/* Ticket Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black">{order.eventTitle}</h2>
                    <p className="text-xl opacity-90 mt-2">{order.ticketType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-80">Order ID</p>
                    <p className="text-lg font-mono font-bold break-all">
                      {order.id.slice(0, 16).toUpperCase()}...
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket Body */}
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6 text-lg">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="font-semibold">{order.date}</p>
                      <p className="text-gray-600">{order.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <MapPin className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="font-semibold">{order.location}</p>
                      <p className="text-gray-600 text-sm">{order.venue}</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center py-8 bg-gray-50 rounded-2xl">
                  <div className="p-6 bg-white rounded-2xl shadow-lg">
                    <QRCode 
                      value={order.id}
                      size={200}
                      level="H"
                    />
                    <p className="text-center mt-4 font-mono text-sm text-gray-600">
                      Order {order.id.slice(0, 12).toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="text-center py-6 border-t-2 border-dashed border-gray-300">
                  <p className="text-4xl font-black text-purple-600">
                    {order.tickets} Ticket{order.tickets > 1 ? "s" : ""}
                  </p>
                  <p className="text-2xl font-bold mt-2">Total Paid: {order.totalPaid}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 p-8 space-y-4">
                <a
                  href={uberUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-black text-white font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-900 transition"
                >
                  <Car className="w-6 h-6" /> Ride with Uber
                </a>

                <div className="grid grid-cols-2 gap-4">
                  <button className="border-2 border-purple-600 text-purple-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-50 transition">
                    <Download className="w-5 h-5" /> Save PDF
                  </button>
                  <button className="border-2 border-purple-600 text-purple-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-50 transition">
                    <Share2 className="w-5 h-5" /> Share
                  </button>
                </div>

                <Link to="/events" className="block text-center text-purple-600 font-semibold hover:underline mt-6">
                  Back to Events
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center mt-12 text-gray-600">
              <p className="text-sm">
                Your tickets are secured • Verified event • Instant delivery
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}