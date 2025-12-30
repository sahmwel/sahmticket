'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Loader2,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  ticketTiers: {
    name: string;
    price: string | number;
    sold?: number;
    available?: number;
    quantity_sold?: number;
    quantity_available?: number;
  }[];
  featured?: boolean;
  trending?: boolean;
  isNew?: boolean;
  sponsored?: boolean;
  coordinates?: { lat: number; lng: number };
  slug?: string;
}

interface Category {
  id: number;
  name: string;
  gradient: string;
}

// ---------------- Helper Functions ----------------

// Parse price helper
const parsePrice = (price: string | number): { amount: number; isFree: boolean } => {
  if (typeof price === 'number') {
    return { amount: price, isFree: price === 0 };
  }
  
  if (typeof price === 'string') {
    const lowerPrice = price.toLowerCase().trim();
    
    // Check for free indicators
    if (lowerPrice.includes('free') || 
        lowerPrice === '0' || 
        lowerPrice === '₦0' ||
        lowerPrice === 'ngn0' ||
        lowerPrice === 'n0' ||
        lowerPrice === '0.00' ||
        lowerPrice === '0.0') {
      return { amount: 0, isFree: true };
    }
    
    // Extract numeric value
    const cleaned = price.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleaned) || 0;
    
    return { amount, isFree: amount === 0 };
  }
  
  return { amount: 0, isFree: true };
};

// Get lowest price from ticket tiers - FIXED VERSION
const getLowestPriceFromTiers = (event: Event): { price: number; isFree: boolean } => {
  if (!event.ticketTiers || !Array.isArray(event.ticketTiers) || event.ticketTiers.length === 0) {
    return { price: 0, isFree: true };
  }

  let hasPaidTier = false;
  let lowestPaidPrice = Infinity;
  let hasFreeTier = false;

  event.ticketTiers.forEach(tier => {
    if (!tier || typeof tier !== 'object') return;
    
    // Check if tier has any tickets available
    const available = tier.available || tier.quantity_available;
    const sold = tier.sold || tier.quantity_sold || 0;
    
    // If tier has availability info and it's sold out, skip it
    if (available !== undefined && (available === 0 || sold >= available)) {
      return;
    }
    
    const priceInfo = parsePrice(tier.price);
    
    if (priceInfo.isFree) {
      hasFreeTier = true;
    } else if (priceInfo.amount > 0) {
      hasPaidTier = true;
      if (priceInfo.amount < lowestPaidPrice) {
        lowestPaidPrice = priceInfo.amount;
      }
    }
  });

  // If we found paid tiers, return the lowest price
  if (hasPaidTier) {
    return { price: lowestPaidPrice, isFree: false };
  }
  
  // If we found free tiers, return free
  if (hasFreeTier) {
    return { price: 0, isFree: true };
  }
  
  // Default to free
  return { price: 0, isFree: true };
};

// Check if event is sold out - FIXED VERSION
const isEventSoldOut = (event: Event): boolean => {
  if (!event.ticketTiers || event.ticketTiers.length === 0) return false;
  
  // Check if ANY tier has available tickets
  const hasAvailableTickets = event.ticketTiers.some(tier => {
    if (!tier) return false;
    
    const available = tier.available || tier.quantity_available;
    const sold = tier.sold || tier.quantity_sold || 0;
    
    // If available is undefined/null, it means unlimited tickets - not sold out
    if (available == null) return true;
    
    // Check if there are tickets left
    return available > 0 && sold < available;
  });
  
  // Return true if NO tiers have available tickets
  return !hasAvailableTickets;
};

// Get total available tickets
const getAvailableTickets = (event: Event): number => {
  if (!event.ticketTiers || !Array.isArray(event.ticketTiers)) return 0;
  
  return event.ticketTiers.reduce((total, tier) => {
    if (!tier) return total;
    
    const available = tier.available || tier.quantity_available;
    const sold = tier.sold || tier.quantity_sold || 0;
    
    // If available is undefined/null, it means unlimited - return a large number
    if (available == null) return total + 9999;
    
    return total + Math.max(0, available - sold);
  }, 0);
};

// Format price display
const formatPriceDisplay = (price: number, isFree: boolean): string => {
  if (isFree) return "Free";
  return `₦${price.toLocaleString()}`;
};

// ---------------- Components ----------------
const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

const LocationMarker: React.FC<{ position: [number, number] }> = ({ position }) => {
  const map = useMap();
  
  const handleClick = useCallback(() => {
    map.flyTo(position, 15, { duration: 1.5 });
  }, [map, position]);

  return (
    <Marker position={position} eventHandlers={{ click: handleClick }}>
      <Popup>
        <div className="p-2">
          <p className="font-bold text-purple-600">Your Location</p>
          <button
            onClick={handleClick}
            className="mt-2 px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition"
          >
            <LocateFixed size={14} className="inline mr-1" />
            Center Map
          </button>
        </div>
      </Popup>
    </Marker>
  );
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
    <span 
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${config.color} shadow-lg`}
      aria-label={config.text}
    >
      <Icon size={14} aria-hidden="true" />
      {config.text}
    </span>
  );
};

// ---------------- Event Card ----------------
interface EventCardProps {
  event: Event;
  goToEvent: (event: Event) => void;
}

const EventCard: React.FC<EventCardProps> = React.memo(({ event, goToEvent }) => {
  const [imageError, setImageError] = useState(false);
  
  const formatDate = useCallback((d: string) => 
    new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" }), []);
  
  const formatTime = useCallback((timeStr: string) => {
    if (!timeStr) return "Time TBD";
    if (timeStr.includes(" ") || timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
      return timeStr.trim();
    }
    const [hour, minute] = timeStr.split(":").map(Number);
    if (isNaN(hour)) return timeStr;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${(minute || 0).toString().padStart(2, "0")} ${period}`;
  }, []);

  // Get price info
  const { price, isFree } = getLowestPriceFromTiers(event);
  const soldOut = isEventSoldOut(event);
  const availableTickets = getAvailableTickets(event);
  const isLowStock = availableTickets > 0 && availableTickets <= 10;
  const isUnlimited = availableTickets >= 9999;
  
  // Debug logging
  console.log(`Event Card: ${event.title}`, {
    ticketTiers: event.ticketTiers,
    soldOut,
    availableTickets,
    price,
    isFree
  });

  const handleCardClick = () => {
    goToEvent(event);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToEvent(event);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${event.title} - ${soldOut ? 'Sold Out' : isFree ? 'Free' : `₦${price.toLocaleString()}`}`}
      className={`bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all cursor-pointer border overflow-hidden group flex flex-col h-full focus:outline-none focus:ring-4 focus:ring-purple-300 ${soldOut ? 'opacity-90 border-gray-200' : 'border-purple-100'}`}
    >
      <div className="relative">
        {imageError ? (
          <div className="w-full h-64 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Calendar size={48} className="text-purple-300" />
          </div>
        ) : (
          <>
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {soldOut && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2">
                  <span className="text-lg">SOLD OUT</span>
                </div>
              </div>
            )}
          </>
        )}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {event.isNew && <Badge type="new" />}
          {event.sponsored && <Badge type="sponsored" />}
          {event.featured && <Badge type="featured" />}
          {event.trending && <Badge type="trending" />}
        </div>
        
        {/* Stock Indicators */}
        {!soldOut && isLowStock && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-600">
              🔥 {availableTickets} left
            </span>
          </div>
        )}
        
        {!soldOut && isUnlimited && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
              ✓ Unlimited
            </span>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition line-clamp-2">
          {event.title}
        </h3>

        <div className="mt-4 space-y-3 text-gray-700">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-purple-600 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-purple-600 flex-shrink-0" aria-hidden="true" />
            <span>{formatTime(event.time)}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-purple-600 flex-shrink-0" aria-hidden="true" />
            <span className="truncate" title={event.location}>{event.location}</span>
          </div>
        </div>

        <button 
          className={`mt-auto w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300 ${
            soldOut 
              ? 'bg-gray-400 text-white cursor-not-allowed hover:scale-100 hover:shadow-lg' 
              : isFree 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:scale-105' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105'
          }`}
          aria-label={`${soldOut ? 'Sold Out' : 'Get tickets for'} ${event.title} - ${soldOut ? 'Sold Out' : isFree ? 'Free' : `₦${price.toLocaleString()}`}`}
          disabled={soldOut}
        >
          <Ticket size={24} aria-hidden="true" />
          {soldOut ? 'SOLD OUT' : `Get Ticket • ${isFree ? 'Free' : `₦${price.toLocaleString()}`}`}
        </button>
      </div>
    </motion.div>
  );
});

EventCard.displayName = 'EventCard';

// ---------------- Loading Skeleton ----------------
const EventCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden animate-pulse">
    <div className="w-full h-64 bg-gray-200" />
    <div className="p-6 space-y-4">
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
      <div className="h-12 bg-gray-200 rounded-2xl mt-8" />
    </div>
  </div>
);

// ---------------- Main Component ----------------
export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState<"All" | number>("All");
  const [userLocation, setUserLocation] = useState<[number, number]>([6.5244, 3.3792]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(11);
  const navigate = useNavigate();
// Fetch events + ticket tiers relation
useEffect(() => {
  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try with explicit foreign key relationship (based on the error hint)
      const { data, error: fetchError } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          category_id,
          date,
          time,
          venue,
          location,
          image,
          featured,
          trending,
          isnew,
          sponsored,
          slug,
          lat,
          lng,
          ticketTiers!ticketTiers_event_id_fkey (
            tier_name,
            price,
            description,
            quantity_total,
            quantity_sold
          )
        `)
        .eq("status", "published")
        .order("date", { ascending: true })
        .limit(50);

      if (fetchError) {
        // If the first foreign key doesn't work, try the second one from the hint
        const { data: retryData, error: retryError } = await supabase
          .from("events")
          .select(`
            id,
            title,
            description,
            category_id,
            date,
            time,
            venue,
            location,
            image,
            featured,
            trending,
            isnew,
            sponsored,
            slug,
            lat,
            lng,
            ticketTiers!tickettiers_event_id_fkey (
              tier_name,
              price,
              description,
              quantity_total,
              quantity_sold
            )
          `)
          .eq("status", "published")
          .order("date", { ascending: true })
          .limit(50);
        
        if (retryError) throw retryError;
        
        // Process the data from retry
        console.log("Fetched events with fallback foreign key:", retryData);
        
        const parsed = (retryData || []).map((raw: any) => {
          const tiers = (raw.ticketTiers || []).map((t: any) => ({
            name: t.tier_name || "General Admission",
            price: t.price ?? 0,
            description: t.description,
            quantity_sold: t.quantity_sold ?? 0,
            quantity_available: t.quantity_total ?? null,
          }));

          return {
            id: raw.id,
            title: raw.title || "Untitled Event",
            description: raw.description,
            category_id: raw.category_id ?? 0,
            date: raw.date,
            time: raw.time || "",
            venue: raw.venue || "",
            location: raw.location || raw.venue || "Location TBD",
            image: raw.image || "https://via.placeholder.com/400x300?text=Event",
            ticketTiers: tiers,
            featured: raw.featured ?? false,
            trending: raw.trending ?? false,
            isNew: raw.isnew ?? false,
            sponsored: raw.sponsored ?? false,
            coordinates: raw.lat && raw.lng
              ? { lat: Number(raw.lat), lng: Number(raw.lng) }
              : undefined,
            slug: raw.slug,
          };
        });

        setEvents(parsed);
        return;
      }

      console.log("Fetched events (with tiers):", data);

      const parsed = (data || []).map((raw: any) => {
        const tiers = (raw.ticketTiers || []).map((t: any) => ({
          name: t.tier_name || "General Admission",
          price: t.price ?? 0,
          description: t.description,
          quantity_sold: t.quantity_sold ?? 0,
          quantity_available: t.quantity_total ?? null,
        }));

        return {
          id: raw.id,
          title: raw.title || "Untitled Event",
          description: raw.description,
          category_id: raw.category_id ?? 0,
          date: raw.date,
          time: raw.time || "",
          venue: raw.venue || "",
          location: raw.location || raw.venue || "Location TBD",
          image: raw.image || "https://via.placeholder.com/400x300?text=Event",
          ticketTiers: tiers,
          featured: raw.featured ?? false,
          trending: raw.trending ?? false,
          isNew: raw.isnew ?? false,
          sponsored: raw.sponsored ?? false,
          coordinates: raw.lat && raw.lng
            ? { lat: Number(raw.lat), lng: Number(raw.lng) }
            : undefined,
          slug: raw.slug,
        };
      });

      setEvents(parsed);
    } catch (err: any) {
      console.error("Events fetch failed:", err);
      
      // Fallback to separate queries if both foreign keys fail
      try {
        console.log("Trying fallback method with separate queries...");
        
        // Fetch events first
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("id, title, description, category_id, date, time, venue, location, image, featured, trending, isnew, sponsored, slug, lat, lng, status")
          .eq("status", "published")
          .order("date", { ascending: true })
          .limit(50);

        if (eventsError) throw eventsError;

        // Fetch all active ticket tiers
        const eventIds = eventsData.map((e: any) => e.id);
        const { data: ticketTiersData, error: tiersError } = await supabase
          .from("ticketTiers")
          .select("*")
          .in("event_id", eventIds)
          .eq("is_active", true);

        if (tiersError) throw tiersError;

        // Group ticket tiers by event_id
        const tiersByEventId: Record<string, any[]> = {};
        (ticketTiersData || []).forEach((tier: any) => {
          if (!tiersByEventId[tier.event_id]) {
            tiersByEventId[tier.event_id] = [];
          }
          tiersByEventId[tier.event_id].push(tier);
        });

        // Combine the data
        const parsed = eventsData.map((event: any) => {
          const eventTiers = tiersByEventId[event.id] || [];
          
          const tiers = eventTiers.map((t: any) => ({
            name: t.tier_name || "General Admission",
            price: t.price ?? 0,
            description: t.description,
            quantity_sold: t.quantity_sold ?? 0,
            quantity_available: t.quantity_total ?? null,
          }));

          return {
            id: event.id,
            title: event.title || "Untitled Event",
            description: event.description,
            category_id: event.category_id ?? 0,
            date: event.date,
            time: event.time || "",
            venue: event.venue || "",
            location: event.location || event.venue || "Location TBD",
            image: event.image || "https://via.placeholder.com/400x300?text=Event",
            ticketTiers: tiers,
            featured: event.featured ?? false,
            trending: event.trending ?? false,
            isNew: event.isnew ?? false,
            sponsored: event.sponsored ?? false,
            coordinates: event.lat && event.lng
              ? { lat: Number(event.lat), lng: Number(event.lng) }
              : undefined,
            slug: event.slug,
          };
        });

        setEvents(parsed);
        console.log("Successfully loaded events via fallback method");
      } catch (fallbackErr: any) {
        console.error("Fallback method also failed:", fallbackErr);
        setError("Failed to load events. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  fetchEvents();
}, []);
  // Fetch categories (unchanged)
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, gradient")
        .order("name");

      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Geolocation (unchanged)
  useEffect(() => {
    if (viewMode !== "map" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(13);
      },
      () => console.log("Geolocation denied/default used")
    );
  }, [viewMode]);

  // ---------------- Carousel Autoplay ----------------
  useEffect(() => {
    const featuredEvents = events.filter((e) => e.featured);
    if (featuredEvents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length]);

  // ---------------- Memoized Values ----------------
  const featuredEvents = useMemo(() => 
    events.filter((e) => e.featured), [events]
  );

  const filteredEvents = useMemo(() => 
    selectedCategory === "All" 
      ? events 
      : events.filter((e) => e.category_id === selectedCategory), 
    [events, selectedCategory]
  );

  const nearYouEvents = useMemo(() => 
    events.slice(0, 8), [events]
  );

  // ---------------- Handlers ----------------
  const goToEvent = useCallback((event: Event) => {
    const path = event.slug 
      ? `/event/${event.slug}` 
      : `/event/${event.id}`;
    navigate(path);
  }, [navigate]);

  const handleCategorySelect = useCallback((category: "All" | number) => {
    setSelectedCategory(category);
    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + featuredEvents.length) % featuredEvents.length);
  }, [featuredEvents.length]);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % featuredEvents.length);
  }, [featuredEvents.length]);

  const handleMapZoomIn = useCallback(() => {
    setMapZoom(prev => Math.min(prev + 2, 18));
  }, []);

  const handleMapZoomOut = useCallback(() => {
    setMapZoom(prev => Math.max(prev - 2, 1));
  }, []);

  // ---------------- Loading State ----------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-6"
        >
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto" />
          <h2 className="text-3xl font-bold text-gray-800">Loading Events...</h2>
          <p className="text-gray-600">Discovering amazing experiences for you</p>
        </motion.div>
      </div>
    );
  }

  // ---------------- Error State ----------------
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md text-center space-y-6"
        >
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
          <h2 className="text-3xl font-bold text-gray-800">Oops! Something went wrong</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-2xl hover:shadow-xl transition-all"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 mb-3">
            Discover Events Around You
          </h1>
          <p className="text-xl text-gray-700">
            Live events across Nigeria • {events.length} events available
          </p>
        </motion.header>

        {/* Featured Carousel */}
        <AnimatePresence mode="wait">
          {featuredEvents.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-12"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Flame className="w-10 h-10 text-red-600 animate-pulse" />
                  <h2 className="text-3xl sm:text-4xl font-black">Hot & Featured</h2>
                </div>
                <div className="text-sm text-gray-600">
                  Slide {currentSlide + 1} of {featuredEvents.length}
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-3xl shadow-2xl group">
                {/* Carousel Navigation */}
                {featuredEvents.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevSlide}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={handleNextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Next slide"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Carousel Content */}
                <div 
                  className="flex transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {featuredEvents.map((event) => {
                    const { price, isFree } = getLowestPriceFromTiers(event);
                    const soldOut = isEventSoldOut(event);
                    const availableTickets = getAvailableTickets(event);
                    
                    return (
                      <div key={event.id} className="w-full flex-shrink-0">
                        <button
                          onClick={() => goToEvent(event)}
                          className="w-full text-left"
                          aria-label={`View featured event: ${event.title} - ${soldOut ? 'Sold Out' : isFree ? 'Free' : `₦${price.toLocaleString()}`}`}
                        >
                          <div className="relative h-96 md:h-[560px] bg-black rounded-3xl overflow-hidden group/carousel">
                            <img 
                              src={event.image} 
                              alt={event.title}
                              className="w-full h-full object-cover opacity-70 group-hover/carousel:opacity-90 transition-opacity duration-500"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/1200x560?text=Event+Image";
                              }}
                            />
                            {soldOut && (
                              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                                <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-8 py-4 rounded-full font-bold flex items-center gap-3">
                                  <span className="text-2xl">SOLD OUT</span>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            <div className="absolute bottom-8 left-8 right-8 text-white z-20">
                              <div className="flex flex-wrap gap-2 mb-4">
                                {event.sponsored && <Badge type="sponsored" />}
                                {event.isNew && <Badge type="new" />}
                                {event.featured && <Badge type="featured" />}
                                {event.trending && <Badge type="trending" />}
                              </div>
                              <h3 className="text-5xl md:text-7xl font-black mt-4 leading-tight">
                                {event.title}
                              </h3>
                              <p className="text-2xl mt-3 flex items-center gap-3">
                                <Calendar size={28} aria-hidden="true" />
                                <span className="font-bold">
                                  {new Date(event.date).toLocaleDateString("en-GB", { 
                                    weekday: "long", 
                                    day: "2-digit", 
                                    month: "long",
                                    year: "numeric" 
                                  })}
                                </span>
                              </p>
                              <div className="flex items-center justify-between mt-6">
                                <p className={`text-3xl font-bold ${soldOut ? 'text-red-400' : isFree ? 'text-emerald-400' : 'text-purple-400'}`}>
                                  {soldOut ? 'SOLD OUT' : isFree ? 'Free' : `₦${price.toLocaleString()}`}
                                </p>
                                <span className="text-white/80 text-lg">
                                  {event.location}
                                </span>
                              </div>
                              {!soldOut && availableTickets < 9999 && availableTickets > 0 && availableTickets <= 10 && (
                                <div className="mt-4 text-center">
                                  <span className="inline-flex items-center gap-2 text-orange-300 font-bold">
                                    🔥 Only {availableTickets} tickets left!
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Carousel Indicators */}
                {featuredEvents.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                    {featuredEvents.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`w-3 h-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white ${
                          currentSlide === i 
                            ? "bg-white w-12 scale-110" 
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* AD: After Featured Carousel */}
        <div className="max-w-7xl mx-auto px-5 my-12">
          <AdsenseAd slot="1111111111" style={{ minHeight: "120px" }} />
        </div>

        {/* Near You Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Navigation className="w-10 h-10 text-purple-600" />
              <h2 className="text-3xl sm:text-4xl font-black">Near You</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter size={16} />
              <span>Based on your location</span>
            </div>
          </div>
          
          {nearYouEvents.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {nearYouEvents.map((event) => (
                <EventCard key={event.id} event={event} goToEvent={goToEvent} />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-xl">No events found near your location</p>
              <button
                onClick={() => setViewMode("map")}
                className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all"
              >
                Explore All Events on Map
              </button>
            </div>
          )}
        </section>

        {/* AD: After Near You Section */}
        <div className="max-w-7xl mx-auto px-5 my-12">
          <AdsenseAd slot="2222222222" style={{ minHeight: "120px" }} />
        </div>

        {/* View Mode Toggle */}
        <motion.div 
          className="flex justify-center gap-6 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-purple-300 ${
              viewMode === "map"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "bg-white text-gray-800 hover:shadow-2xl"
            }`}
            aria-pressed={viewMode === "map"}
          >
            <MapPinned size={24} /> Map View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-purple-300 ${
              viewMode === "list"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "bg-white text-gray-800 hover:shadow-2xl"
            }`}
            aria-pressed={viewMode === "list"}
          >
            <List size={24} /> List View
          </button>
        </motion.div>

        {/* Map View */}
        {viewMode === "map" && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[70vh] rounded-3xl overflow-hidden shadow-2xl mb-16 relative"
            id="map-section"
          >
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button
                onClick={handleMapZoomIn}
                className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition"
                aria-label="Zoom in"
              >
                <span className="text-xl font-bold">+</span>
              </button>
              <button
                onClick={handleMapZoomOut}
                className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition"
                aria-label="Zoom out"
              >
                <span className="text-xl font-bold">−</span>
              </button>
            </div>

            <MapContainer
              center={userLocation}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              className="rounded-3xl"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ChangeView center={userLocation} zoom={mapZoom} />
              <LocationMarker position={userLocation} />
              
              {/* Event Markers */}
              {events
                .filter(event => event.coordinates)
                .map((event) => {
                  const { price, isFree } = getLowestPriceFromTiers(event);
                  const soldOut = isEventSoldOut(event);
                  const availableTickets = getAvailableTickets(event);
                  const isLowStock = availableTickets > 0 && availableTickets <= 10;
                  
                  return (
                    <Marker
                      key={event.id}
                      position={[event.coordinates!.lat, event.coordinates!.lng]}
                      eventHandlers={{
                        click: () => goToEvent(event),
                      }}
                    >
                      <Popup>
                        <div className="p-2 max-w-xs">
                          <img 
                            src={event.image} 
                            alt={event.title}
                            className="w-full h-32 object-cover rounded-lg mb-2"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/300x200?text=Event";
                            }}
                          />
                          <h4 className="font-bold text-lg text-purple-700">{event.title}</h4>
                          {soldOut && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold mt-1">
                              SOLD OUT
                            </div>
                          )}
                          {!soldOut && isLowStock && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold mt-1">
                              🔥 {availableTickets} left
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            <Calendar size={12} className="inline mr-1" />
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <MapPin size={12} className="inline mr-1" />
                            {event.location}
                          </p>
                          <div className={`text-sm font-bold mt-2 ${soldOut ? 'text-red-600' : isFree ? 'text-emerald-600' : 'text-purple-600'}`}>
                            {soldOut ? 'SOLD OUT' : isFree ? 'Free' : `₦${price.toLocaleString()}`}
                          </div>
                          <button
                            onClick={() => goToEvent(event)}
                            className={`mt-3 w-full py-2 rounded-lg hover:shadow transition text-sm font-bold ${
                              soldOut 
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : isFree
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg'
                                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                            }`}
                            disabled={soldOut}
                          >
                            {soldOut ? 'Sold Out' : 'View Details'}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
            
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
              <p className="text-sm font-semibold text-gray-800">
                📍 {events.filter(e => e.coordinates).length} events on map
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Click on markers for event details
              </p>
            </div>
          </motion.section>
        )}

        {/* List View with Categories */}
        {viewMode === "list" && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            id="events-section"
          >
            {/* Category Filter */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black">Browse by Category</h2>
                <span className="text-gray-600">
                  {filteredEvents.length} events
                </span>
              </div>
              
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent pb-4">
                <div className="flex gap-4 min-w-max">
                  <button
                    onClick={() => handleCategorySelect("All")}
                    className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all whitespace-nowrap focus:outline-none focus:ring-4 focus:ring-purple-300 ${
                      selectedCategory === "All"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl"
                        : "bg-white text-gray-800 border hover:shadow-xl"
                    }`}
                    aria-pressed={selectedCategory === "All"}
                  >
                    All Events ({events.length})
                  </button>
                  {categories.map((cat) => {
                    const count = events.filter((e) => e.category_id === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold shadow-lg transition-all whitespace-nowrap focus:outline-none focus:ring-4 focus:ring-purple-300 ${
                          selectedCategory === cat.id
                            ? `bg-gradient-to-r ${cat.gradient} text-white shadow-xl`
                            : "bg-white text-gray-800 border hover:shadow-xl"
                        }`}
                        aria-pressed={selectedCategory === cat.id}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Events Grid */}
            <div className="mb-8">
              <h2 className="text-4xl font-black mb-8">
                {selectedCategory === "All"
                  ? "All Events"
                  : categories.find((c) => c.id === selectedCategory)?.name || "Events"}
                <span className="text-purple-600 ml-3">({filteredEvents.length})</span>
              </h2>

              {filteredEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-12 h-12 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No events found
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {selectedCategory === "All"
                      ? "Check back soon for new events!"
                      : `No ${categories.find(c => c.id === selectedCategory)?.name?.toLowerCase()} events available. Try another category.`}
                  </p>
                  {selectedCategory !== "All" && (
                    <button
                      onClick={() => setSelectedCategory("All")}
                      className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-2xl hover:shadow-xl transition-all"
                    >
                      View All Events
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                  layout
                >
                  <AnimatePresence>
                    {filteredEvents.map((event) => (
                      <EventCard key={event.id} event={event} goToEvent={goToEvent} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Load More (if needed) */}
            {filteredEvents.length > 0 && filteredEvents.length < events.length && (
              <div className="text-center mt-12">
                <button
                  className="bg-white border-2 border-purple-600 text-purple-600 font-bold py-4 px-12 rounded-2xl hover:bg-purple-50 hover:shadow-xl transition-all"
                  onClick={() => {
                    // Implement load more logic here
                    console.log("Load more events");
                  }}
                >
                  Load More Events
                </button>
              </div>
            )}
          </motion.section>
        )}

        {/* Footer AD */}
        <div className="max-w-7xl mx-auto px-5 mt-16">
          <AdsenseAd slot="3333333333" style={{ minHeight: "120px" }} />
        </div>
      </div>
    </div>
  );
}