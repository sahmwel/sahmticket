'use client';

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import AdsenseAd from "../components/AdsenseAd";
import {
  Calendar,
  MapPin,
  Clock,
  Flame,
  MapPinned,
  List,
  Ticket,
  BadgeCheck,
  Sparkles,
  Star,
  Navigation,
} from "lucide-react";
import { motion } from "framer-motion";
import L from "leaflet";
import { supabase } from "../lib/supabaseClient";
import "leaflet/dist/leaflet.css";

// Leaflet icon fix for TypeScript
const iconDefault = L.Icon.Default.prototype as any;
delete iconDefault._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ---------------- Types ----------------
interface Event {
  id: string;
  title: string;
  description?: string;
  category_id: number;
  date: string;
  time: string;
  venue: string;
  location: string;
  image: string;
  ticketTiers: { price: string }[]; // Always array of objects with price
  featured?: boolean;
  trending?: boolean;
  isNew?: boolean;
  sponsored?: boolean;
}


interface Category {
  id: number;
  name: string;
  gradient: string;
}

// ---------------- Helpers ----------------
const ChangeView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 11, { animate: true }); }, [center, map]);
  return null;
};

const Badge = ({ type }: { type: "new" | "sponsored" | "featured" | "trending" }) => {
  const config = {
    new: { icon: Sparkles, color: "from-emerald-500 to-teal-600", text: "New" },
    sponsored: { icon: BadgeCheck, color: "from-blue-500 to-cyan-600", text: "Sponsored" },
    featured: { icon: Star, color: "from-purple-500 to-pink-600", text: "Featured" },
    trending: { icon: Flame, color: "from-orange-500 to-red-600", text: "Trending" },
  }[type];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${config.color}`}>
      <Icon size={14} />{config.text}
    </span>
  );
};

// ---------------- Event Card ----------------
interface EventCardProps {
  event: Event;
  goToEvent: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, goToEvent }) => {
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "Time TBD";
    if (timeStr.includes(" ") || timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) return timeStr.trim();
    const [hour, minute] = timeStr.split(":").map(Number);
    if (isNaN(hour)) return timeStr;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${(minute || 0).toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div onClick={() => goToEvent(event.id)} className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all cursor-pointer border border-purple-100 overflow-hidden group flex flex-col h-full">
      <div className="relative">
        <img src={event.image} alt={event.title} className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {event.isNew && <Badge type="new" />}
          {event.sponsored && <Badge type="sponsored" />}
          {event.featured && <Badge type="featured" />}
          {event.trending && <Badge type="trending" />}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition line-clamp-2">{event.title}</h3>

        <div className="mt-4 space-y-3 text-gray-700">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-purple-600" />
            <span className="font-semibold">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-purple-600" />
            <span>{formatTime(event.time)}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-purple-600" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <button className="mt-auto w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg">
          <Ticket size={24} />
          Get Ticket • {event.ticketTiers?.[0]?.price ?? "Free"}
        </button>

      </div>
    </div>
  );
};

// ---------------- Main Component ----------------
export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState<"All" | number>("All");
  const [userLocation] = useState<[number, number]>([6.5244, 3.3792]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  // ---------------- Fetch Events ----------------
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("date", { ascending: true });

        if (error) return console.error(error);
        if (!data) return setEvents([]);

        const parsedEvents: Event[] = data.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          category_id: event.category_id,
          date: event.date,
          time: event.time,
          venue: event.venue,
          location: event.location,
          image: event.image || "https://via.placeholder.com/400x300?text=No+Image",
          ticketTiers: Array.isArray(event.ticketTiers) ? event.ticketTiers : [],
          featured: event.featured ?? false,
          trending: event.trending ?? false,
          isNew: event.isnew ?? false, // Map to camelCase
          sponsored: event.sponsored ?? false,
        }));

        setEvents(parsedEvents);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEvents();
  }, []);

  // ---------------- Fetch Categories ----------------
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("id, name, gradient");
      if (!error && data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const featuredEvents = events.filter((e) => e.featured);
  const filteredEvents = selectedCategory === "All" ? events : events.filter((e) => e.category_id === selectedCategory);
  const goToEvent = (id: string) => navigate(`/event/${id}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 mb-3">Discover Events Around You</h1>
          <p className="text-xl text-gray-700">Live events across Nigeria</p>
        </motion.div>

        {/* Featured Carousel */}
        {featuredEvents.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Flame className="w-10 h-10 text-red-600 animate-pulse" />
              <h2 className="text-3xl sm:text-4xl font-black">Hot & Featured</h2>
            </div>
            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {featuredEvents.map((event) => (
                  <div key={event.id} className="w-full flex-shrink-0 cursor-pointer" onClick={() => goToEvent(event.id)}>
                    <div className="relative h-96 md:h-[560px] bg-black rounded-3xl overflow-hidden group">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className="absolute bottom-8 left-8 right-8 text-white">
                        {event.sponsored && <Badge type="sponsored" />}
                        {event.isNew && <Badge type="new" />}
                        <h3 className="text-5xl md:text-7xl font-black mt-4 leading-tight">{event.title}</h3>
                        <p className="text-2xl mt-3 flex items-center gap-3">
                          <Calendar size={28} />
                          <span className="font-bold">{new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })}</span>
                        </p>
                        <p className="text-3xl font-bold text-purple-400 mt-6">
                          {event.ticketTiers?.[0]?.price ?? "Free"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                {featuredEvents.map((_, i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)} className={`w-3 h-3 rounded-full transition-all ${currentSlide === i ? "bg-white w-12" : "bg-white/50"}`} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* AD: After Featured Carousel */}
        <div className="max-w-7xl mx-auto px-5 my-12">
          <AdsenseAd slot="1111111111" style={{ minHeight: "120px" }} />
        </div>

        {/* Near You */}
        {events.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <Navigation className="w-10 h-10 text-purple-600" />
              <h2 className="text-3xl sm:text-4xl font-black">Near You</h2>
            </div>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {events.slice(0, 8).map((event) => <EventCard key={event.id} event={event} goToEvent={goToEvent} />)}
            </motion.div>
          </div>
        )}

        {/* AD: After Near You Section */}
        <div className="max-w-7xl mx-auto px-5 my-12">
          <AdsenseAd slot="2222222222" style={{ minHeight: "120px" }} />
        </div>



        {/* View Mode Toggle */}
        <div className="flex justify-center gap-6 mb-10">
          <button onClick={() => setViewMode("map")} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all ${viewMode === "map" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-white text-gray-800"}`}>
            <MapPinned size={24} /> Map
          </button>
          <button onClick={() => setViewMode("list")} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all ${viewMode === "list" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-white text-gray-800"}`}>
            <List size={24} /> List
          </button>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="h-[70vh] rounded-3xl overflow-hidden shadow-2xl mb-16">
            <MapContainer center={userLocation} zoom={11} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ChangeView center={userLocation} />
              <Marker position={userLocation}>
                <Popup>You are here</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* List View with Categories */}
        {viewMode === "list" && (
          <>
            <div className="mb-12 overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 pb-4">
                <button onClick={() => setSelectedCategory("All")} className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all ${selectedCategory === "All" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "bg-white text-gray-800 border"}`}>
                  All Events ({events.length})
                </button>
                {categories.map((cat) => {
                  const count = events.filter((e) => e.category_id === cat.id).length;
                  return (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold shadow-lg transition-all whitespace-nowrap ${selectedCategory === cat.id ? `bg-gradient-to-r ${cat.gradient} text-white` : "bg-white text-gray-800 border"}`}>
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <h2 className="text-4xl font-black mb-8">
              {selectedCategory === "All" ? "All Events" : categories.find((c) => c.id === selectedCategory)?.name || "Events"}
            </h2>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredEvents.length === 0 ? (

                <p className="col-span-full text-center text-gray-500 text-xl py-20">No events found</p>
              ) : (
                filteredEvents.map((event) => <EventCard key={event.id} event={event} goToEvent={goToEvent} />)
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
