'use client';

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import {
  Calendar,
  MapPin,
  Music,
  Users,
  Headphones,
  Waves,
  GraduationCap,
  Gift,
  Moon,
  Palette,
  Flame,
  MapPinned,
  List,
  Ticket,
} from "lucide-react";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Types
export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  price: string;
  image: string;
  badge?: string;
  category: string;
  venue: string;
  city: string;
  coords: [number, number];
}

// Props
interface EventsPageProps {
  events?: Event[];
}

const categories = [
  { name: "House Party", icon: Moon, color: "from-pink-500 to-rose-500" },
  { name: "Concert", icon: Music, color: "from-purple-500 to-pink-500" },
  { name: "Listening Party", icon: Headphones, color: "from-indigo-500 to-blue-500" },
  { name: "Meet and Greet", icon: Users, color: "from-amber-500 to-orange-500" },
  { name: "Pool Party", icon: Waves, color: "from-blue-500 to-cyan-500" },
  { name: "Workshop/Seminar", icon: GraduationCap, color: "from-indigo-500 to-purple-500" },
  { name: "Birthday Party", icon: Gift, color: "from-green-500 to-emerald-500" },
  { name: "Club Party", icon: Moon, color: "from-fuchsia-500 to-violet-500" },
  { name: "Themed Party", icon: Palette, color: "from-fuchsia-500 to-purple-500" },
  { name: "Beach Party", icon: Waves, color: "from-teal-500 to-green-500" },
] as const;

// Map auto-center component
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11, { animate: true });
  }, [center, map]);
  return null;
}

export default function EventsPage({ events = [] }: EventsPageProps) {
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userLocation, setUserLocation] = useState<[number, number]>([6.5244, 3.3792]); // Default: Lagos
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => console.log("Geolocation access denied"),
        { timeout: 10000 }
      );
    }
  }, []);

  // Filter events by category
  const filteredEvents = selectedCategory === "All"
    ? events
    : events.filter((e) => e.category === selectedCategory);

  // Featured events for carousel (first 4)
  const featuredEvents = events.slice(0, 4);

  const goToEvent = (id: string) => {
    navigate(`/event/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-12"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-3">
            Discover Events Around You
          </h1>
          <p className="text-lg sm:text-xl text-gray-700">Hottest vibes in Nigeria & beyond</p>
        </motion.div>

        {/* Featured Carousel */}
        {featuredEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-10 sm:mb-12"
          >
            <div className="flex items-center gap-3 mb-5">
              <Flame className="w-8 h-8 sm:w-9 sm:h-9 text-red-600 animate-pulse" />
              <h2 className="text-2xl sm:text-3xl font-black">New & Hot Events</h2>
            </div>

            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {featuredEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => goToEvent(event.id)}
                    className="w-full flex-shrink-0 cursor-pointer"
                  >
                    <div className="relative h-80 sm:h-96 md:h-[520px] bg-black rounded-3xl overflow-hidden group">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 text-white">
                        {event.badge && (
                          <span className="inline-block bg-red-600 px-4 py-2 rounded-full text-sm font-bold">
                            {event.badge}
                          </span>
                        )}
                        <h3 className="text-3xl sm:text-4xl md:text-6xl font-black mt-4 leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-xl sm:text-2xl mt-2 flex items-center gap-2">
                          <Calendar size={22} /> {event.date}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-purple-400 mt-4">
                          {event.price}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                {featuredEvents.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentSlide === i ? "bg-white w-10" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* View Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-3 px-6 sm:px-8 py-4 rounded-2xl font-bold transition-all shadow-lg ${
              viewMode === "map"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "bg-white text-gray-800"
            }`}
          >
            <MapPinned size={20} /> Map
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-3 px-6 sm:px-8 py-4 rounded-2xl font-bold transition-all shadow-lg ${
              viewMode === "list"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "bg-white text-gray-800"
            }`}
          >
            <List size={20} /> List
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-10 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 sm:gap-4 pb-4 min-w-max">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-5 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-base whitespace-nowrap transition-all ${
                selectedCategory === "All"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "bg-white"
              }`}
            >
              All Events
            </button>
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-base whitespace-nowrap transition-all ${
                    selectedCategory === cat.name
                      ? `bg-gradient-to-r ${cat.color} text-white`
                      : "bg-white"
                  }`}
                >
                  <Icon size={20} /> {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="h-96 md:h-[70vh] rounded-3xl overflow-hidden shadow-2xl mb-12">
            <MapContainer center={userLocation} zoom={11} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ChangeView center={userLocation} />
              <Marker position={userLocation}>
                <Popup>You are here</Popup>
              </Marker>
              {filteredEvents.map((event) => (
                <Marker key={event.id} position={event.coords}>
                  <Popup>
                    <div
                      onClick={() => goToEvent(event.id)}
                      className="cursor-pointer text-center"
                    >
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                      <h4 className="font-bold text-base">{event.title}</h4>
                      <p className="text-sm text-gray-600">{event.venue}</p>
                      <p className="font-bold text-purple-600 mt-1">{event.price}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredEvents.length === 0 ? (
              <p className="col-span-full text-center text-gray-500 text-lg py-12">
                No events found in this category.
              </p>
            ) : (
              filteredEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div
                    onClick={() => goToEvent(event.id)}
                    className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border border-purple-100 overflow-hidden group"
                  >
                    <div className="relative">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-56 sm:h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {event.badge && (
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-full text-xs font-bold">
                          {event.badge}
                        </div>
                      )}
                    </div>
                    <div className="p-5 sm:p-6">
                      <h3 className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-purple-600 transition">
                        {event.title}
                      </h3>
                      <div className="mt-4 space-y-3 text-gray-700">
                        <div className="flex items-center gap-3">
                          <Calendar size={18} className="text-purple-600" />
                          <div>
                            <p className="font-semibold text-sm sm:text-base">{event.date}</p>
                            <p className="text-xs sm:text-sm text-gray-500">{event.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-purple-600" />
                          <p className="font-medium text-sm sm:text-base">{event.venue}</p>
                        </div>
                      </div>
                      <div className="mt-6 sm:mt-8">
                        <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 sm:py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-transform text-sm sm:text-base shadow-lg">
                          <Ticket size={22} />
                          Get Ticket • {event.price}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}