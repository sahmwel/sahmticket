'use client';

import { useParams, Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import {
  Calendar,
  MapPin,
  Car,
  Share2,
  Download,
  CheckCircle,
} from "lucide-react";

interface Order {
  id: string;
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

  // PDF download
  const handleDownloadPDF = () => {
    const element = document.getElementById("ticket-section");
    if (!element) return;

    import("html2canvas").then((html2canvas) => {
      import("jspdf").then((jsPDF) => {
        (html2canvas.default as any)(element, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF.jsPDF("p", "mm", "a4");
          const width = pdf.internal.pageSize.getWidth();
          const height = (canvas.height * width) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, width, height);
          pdf.save(`ticket-${order?.id}.pdf`);
        });
      });
    });
  };

  // Web share API
  const handleShare = async () => {
    if (!order) return;

    const text = `Your ticket for ${order.eventTitle} is confirmed!\nOrder: ${order.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Event Ticket",
          text,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      alert("Sharing not supported on this device");
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const eventTitle = searchParams.get("title");
    const location = searchParams.get("location");
    const venue = searchParams.get("venue");
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const ticketType = searchParams.get("type") || "Regular";
    const tickets = parseInt(searchParams.get("qty") || "1");
    const totalPaid = searchParams.get("price") || "₦0";

    if (!eventTitle || !location || !date || !totalPaid) {
      setLoading(false);
      return;
    }

    setOrder({
      id: orderId,
      eventTitle,
      location,
      venue: venue || location,
      date,
      time: time || "6:00 PM",
      lat,
      lng,
      tickets,
      ticketType,
      totalPaid,
    });

    setLoading(false);
  }, [orderId, searchParams]);

  const uberUrl = order
    ? `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${order.lat}&dropoff[longitude]=${order.lng}&dropoff[nickname]=${encodeURIComponent(order.location)}`
    : "#";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-2xl font-bold text-purple-800">Preparing your ticket...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md">
          <div className="text-6xl mb-6">Error</div>
          <h2 className="text-3xl font-black text-red-600 mb-4">Invalid Ticket</h2>
          <Link to="/events" className="bg-purple-600 text-white font-bold py-4 px-8 rounded-2xl inline-block">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 lg:pt-28">
      <section className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <CheckCircle className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black mb-4">You're In!</h1>
          <p className="text-xl md:text-2xl opacity-90">Payment successful • Ticket confirmed</p>
        </div>
      </section>

      <section className="py-12 md:py-16 -mt-10 relative z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <motion.div
            id="ticket-section"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-purple-100"
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 md:p-8 text-white">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black">{order.eventTitle}</h2>
                  <p className="text-lg md:text-xl opacity-90 mt-2">{order.ticketType}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm opacity-80">Order ID</p>
                  <p className="text-sm md:text-lg font-mono font-bold">{order.id}</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-lg">
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

              <div className="flex justify-center py-8 bg-gray-50 rounded-2xl">
                <div className="p-6 bg-white rounded-2xl shadow-lg border-2 border-purple-100">
                  <QRCode value={order.id} size={200} level="H" />
                  <p className="text-center mt-4 font-mono text-sm text-gray-600">
                    {order.id.slice(0, 12).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-center py-6 border-t-2 border-dashed border-gray-300">
                <p className="text-3xl md:text-4xl font-black text-purple-600">
                  {order.tickets} Ticket{order.tickets > 1 ? "s" : ""}
                </p>
                <p className="text-xl md:text-2xl font-bold mt-3">Total Paid: {order.totalPaid}</p>
              </div>

              <div className="text-center">
                <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold">
                  <CheckCircle className="w-6 h-6" /> Payment Confirmed
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-6 md:p-8 space-y-4">
              <a
                href={uberUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-black text-white font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-900 transition"
              >
                <Car className="w-6 h-6" /> Ride with Uber
              </a>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="border-2 border-purple-600 text-purple-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-50 transition"
                >
                  <Download className="w-5 h-5" /> Save PDF
                </button>
                <button
                  onClick={handleShare}
                  className="border-2 border-purple-600 text-purple-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-50 transition"
                >
                  <Share2 className="w-5 h-5" /> Share
                </button>
              </div>

              <div className="text-center pt-6 text-sm text-gray-500">
                <p>E-ticket sent to your email • Show QR code at entrance</p>
                <Link to="/events" className="block mt-6 text-purple-600 font-bold hover:underline">
                  ← Back to Events
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
