'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
  Eye,
  EyeOff,
  History,
  X,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import { supabase } from "../lib/supabaseClient";
import "leaflet/dist/leaflet.css";

// --- Constants ---
const DEFAULT_LOCATION: [number, number] = [6.5244, 3.3792]; // Lagos, Nigeria
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
const EVENTS_PER_PAGE = 50;
const CAROUSEL_INTERVAL = 5000;

// --- Type Definitions ---
interface TicketTier {
  name: string;
  price: string | number;
  sold?: number;
  available?: number;
  quantity_sold?: number;
  quantity_available?: number;
  description?: string;
}

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
  ticketTiers: TicketTier[];
  featured?: boolean;
  trending?: boolean;
  isNew?: boolean;
  sponsored?: boolean;
  coordinates?: { lat: number; lng: number };
  slug?: string;
  isPast?: boolean;
}

interface Category {
  id: number;
  name: string;
  gradient: string;
}

// --- Date Formatting Functions ---
const formatDateOnly = (timestamp: string | null): string => {
  if (!timestamp) return "No date";
  try {
    const datePart = timestamp.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[month - 1];
    
    return `${monthName} ${day}, ${year}`;
  } catch {
    return "Invalid date";
  }
};

// FIXED: Updated to match Home page formatting
const formatEventDateShort = (dateString: string): string => {
  if (!dateString) return "Date TBD";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[month - 1];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(year, month - 1, day);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''}`;
    
    if (diffDays < -1) return `${formattedDate} (Past)`;
    if (diffDays === -1) return `Yesterday`;
    if (diffDays === 0) return `Today`;
    if (diffDays === 1) return `Tomorrow`;
    if (diffDays <= 7) return `${formattedDate} (in ${diffDays} days)`;
    
    return formattedDate;
  } catch (error) {
    return "Date TBD";
  }
};

const formatEventTime = (dateString: string, timeString?: string): string => {
  if (!dateString) return "Time TBD";
  
  // First try to use the timeString if available
  if (timeString) {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes ? minutes.toString().padStart(2, '0') : '00';
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      // Fall through to extracting from date
    }
  }
  
  // Extract from date string if it contains time
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Time TBD";
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return "Time TBD";
  }
};

const isEventPast = (dateString: string): boolean => {
  if (!dateString) return false;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const eventDateStr = dateString.split('T')[0];
    return eventDateStr < today;
  } catch {
    return false;
  }
};

// --- Helper Functions ---
const parsePrice = (price: string | number): { amount: number; isFree: boolean } => {
  if (typeof price === 'number') {
    return { amount: price, isFree: price === 0 };
  }
  
  if (typeof price === 'string') {
    const lowerPrice = price.toLowerCase().trim();
    
    if (['free', '0', '₦0', 'ngn0', 'n0', '0.00', '0.0'].includes(lowerPrice)) {
      return { amount: 0, isFree: true };
    }
    
    const cleaned = price.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleaned) || 0;
    
    return { amount, isFree: amount === 0 };
  }
  
  return { amount: 0, isFree: true };
};

const getLowestPriceFromTiers = (ticketTiers: TicketTier[]): { price: number; isFree: boolean } => {
  if (!ticketTiers?.length) {
    return { price: 0, isFree: true };
  }

  let hasPaidTier = false;
  let lowestPaidPrice = Infinity;
  let hasFreeTier = false;

  ticketTiers.forEach(tier => {
    if (!tier) return;
    
    const available = tier.available ?? tier.quantity_available;
    const sold = tier.sold ?? tier.quantity_sold ?? 0;
    
    if (available !== undefined && (available === 0 || sold >= available)) {
      return;
    }
    
    const priceInfo = parsePrice(tier.price);
    
    if (priceInfo.isFree) {
      hasFreeTier = true;
    } else if (priceInfo.amount > 0) {
      hasPaidTier = true;
      lowestPaidPrice = Math.min(lowestPaidPrice, priceInfo.amount);
    }
  });

  if (hasPaidTier) {
    return { price: lowestPaidPrice, isFree: false };
  }
  
  if (hasFreeTier) {
    return { price: 0, isFree: true };
  }
  
  return { price: 0, isFree: true };
};

const isEventSoldOut = (ticketTiers: TicketTier[]): boolean => {
  if (!ticketTiers?.length) return false;
  
  const hasAvailableTickets = ticketTiers.some(tier => {
    if (!tier) return false;
    
    const available = tier.available ?? tier.quantity_available;
    const sold = tier.sold ?? tier.quantity_sold ?? 0;
    
    if (available == null) return true;
    
    return available > 0 && sold < available;
  });
  
  return !hasAvailableTickets;
};

const getAvailableTickets = (ticketTiers: TicketTier[]): number => {
  if (!ticketTiers?.length) return 0;
  
  return ticketTiers.reduce((total, tier) => {
    if (!tier) return total;
    
    const available = tier.available ?? tier.quantity_available;
    const sold = tier.sold ?? tier.quantity_sold ?? 0;
    
    if (available == null) return total + 9999;
    
    return total + Math.max(0, available - sold);
  }, 0);
};

const formatPriceDisplay = (price: number, isFree: boolean): string => {
  if (isFree) return "Free";
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price);
};

// --- Map Components ---
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
            className="mt-2 px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
            aria-label="Center map on your location"
          >
            <LocateFixed size={14} className="inline mr-1" />
            Center Map
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

// --- UI Components ---
const Badge: React.FC<{ type: "new" | "sponsored" | "featured" | "trending" | "past" }> = ({ type }) => {
  const config = {
    new: { icon: Sparkles, color: "from-emerald-500 to-teal-600", text: "New" },
    sponsored: { icon: BadgeCheck, color: "from-blue-500 to-cyan-600", text: "Sponsored" },
    featured: { icon: Star, color: "from-purple-500 to-pink-600", text: "Featured" },
    trending: { icon: Flame, color: "from-orange-500 to-red-600", text: "Trending" },
    past: { icon: History, color: "from-gray-500 to-gray-700", text: "Past" },
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

// --- SearchBar Component ---
const SearchBar: React.FC<{ 
  searchTerm: string; 
  setSearchTerm: (term: string) => void;
  resultsCount: number;
  showPast: boolean;
  setShowPast: (show: boolean) => void;
}> = ({ searchTerm, setSearchTerm, resultsCount, showPast, setShowPast }) => {
  const handleClear = useCallback(() => setSearchTerm(""), [setSearchTerm]);

  return (
    <div className="max-w-2xl mx-auto px-5 mb-12">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
        <input
          type="text"
          placeholder="Search events, artists, venues..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-10 py-5 rounded-2xl bg-white border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none shadow-lg text-base transition"
          aria-label="Search events"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <p className="text-center text-gray-600">
          Found {resultsCount} event{resultsCount !== 1 ? 's' : ''}
          {searchTerm && ` for "${searchTerm}"`}
        </p>
        
        <button
          onClick={() => setShowPast(!showPast)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
          style={{
            background: showPast 
              ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' 
              : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            color: 'white'
          }}
        >
          {showPast ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPast ? 'Hide Past Events' : 'Show Past Events'}
        </button>
      </div>
    </div>
  );
};

// --- Main Components ---
const EventCard: React.FC<{ 
  event: Event;
  onEventClick: (event: Event) => void;
}> = React.memo(({ event, onEventClick }) => {
  const [imageError, setImageError] = useState(false);
  
  const { price, isFree } = getLowestPriceFromTiers(event.ticketTiers);
  const soldOut = isEventSoldOut(event.ticketTiers);
  const availableTickets = getAvailableTickets(event.ticketTiers);
  const isLowStock = availableTickets > 0 && availableTickets <= 10;
  const isUnlimited = availableTickets >= 9999;
  const eventIsPast = isEventPast(event.date);
  
  const handleClick = useCallback(() => {
    onEventClick(event);
  }, [event, onEventClick]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEventClick(event);
    }
  }, [event, onEventClick]);
  
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${event.title} - ${eventIsPast ? 'Past Event' : soldOut ? 'Sold Out' : isFree ? 'Free' : `₦${price.toLocaleString('en-NG')}`}`}
      className={`bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all cursor-pointer border overflow-hidden group flex flex-col h-full focus:outline-none focus:ring-4 focus:ring-purple-300 ${
        eventIsPast ? 'border-gray-200 opacity-80 hover:opacity-100' :
        soldOut ? 'opacity-90 border-gray-200' : 'border-purple-100'
      }`}
    >
      <div className="relative">
        {imageError ? (
          <div className="w-full h-64 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Calendar size={48} className="text-purple-300" aria-hidden="true" />
          </div>
        ) : (
          <>
            <img 
              src={event.image || PLACEHOLDER_IMAGE} 
              alt={event.title} 
              className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
              onError={handleImageError}
              loading="lazy"
              width={400}
              height={256}
            />
            {soldOut && !eventIsPast && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2">
                  <span className="text-lg">SOLD OUT</span>
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {eventIsPast && <Badge type="past" />}
          {!eventIsPast && event.isNew && <Badge type="new" />}
          {!eventIsPast && event.sponsored && <Badge type="sponsored" />}
          {!eventIsPast && event.featured && <Badge type="featured" />}
          {!eventIsPast && event.trending && <Badge type="trending" />}
        </div>
        
        {!eventIsPast && !soldOut && isLowStock && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-600">
              🔥 {availableTickets} left
            </span>
          </div>
        )}
        
        {!eventIsPast && !soldOut && isUnlimited && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
              ✓ Unlimited
            </span>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-2">
          {event.title}
        </h3>

        <div className="mt-4 space-y-3 text-gray-700">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-purple-600 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">{formatEventDateShort(event.date)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-purple-600 flex-shrink-0" aria-hidden="true" />
            <span>{formatEventTime(event.date, event.time)}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-purple-600 flex-shrink-0" aria-hidden="true" />
            <span className="truncate" title={event.location}>{event.location}</span>
          </div>
        </div>

        <button 
          className={`mt-auto w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300 ${
            eventIsPast
              ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:scale-105' 
              : soldOut 
                ? 'bg-gray-400 text-white cursor-not-allowed hover:scale-100 hover:shadow-lg' 
                : isFree 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:scale-105' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105'
          }`}
          aria-label={`${eventIsPast ? 'View past event: ' : ''}${event.title} - ${eventIsPast ? 'Past Event' : soldOut ? 'Sold Out' : isFree ? 'Free' : `₦${price.toLocaleString('en-NG')}`}`}
          disabled={soldOut && !eventIsPast}
        >
          <Ticket size={24} aria-hidden="true" />
          {eventIsPast 
            ? 'View Event Details' 
            : soldOut 
              ? 'SOLD OUT' 
              : `Get Ticket • ${isFree ? 'Free' : `₦${price.toLocaleString('en-NG')}`}`
          }
        </button>
      </div>
    </motion.div>
  );
});

EventCard.displayName = 'EventCard';

// --- Main Events Page Component ---
export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState<"All" | number>("All");
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(11);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastEvents, setShowPastEvents] = useState(false);
  
  const navigate = useNavigate();

  // --- Memoized Values ---
  const today = new Date().toISOString().split('T')[0];
  
  // FIXED: Featured events should NOT show past events
  const featuredEvents = useMemo(() => {
    return events
      .filter((e) => e.featured)
      .filter(event => {
        const eventDateStr = event.date?.split('T')[0];
        return eventDateStr && eventDateStr >= today; // Only future/present events
      });
  }, [events, today]);

  const filteredEvents = useMemo(() => {
    // First filter by search term
    let filtered = events.filter(
      e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    // Then filter by category
    filtered = selectedCategory === "All" 
      ? filtered 
      : filtered.filter((e) => e.category_id === selectedCategory);
    
    // Then filter by past events toggle
    if (!showPastEvents) {
      filtered = filtered.filter(event => {
        const eventDateStr = event.date?.split('T')[0];
        return eventDateStr && eventDateStr >= today;
      });
    }
    
    return filtered;
  }, [events, searchTerm, selectedCategory, showPastEvents, today]);

  const futureEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const eventDateStr = event.date?.split('T')[0];
      return eventDateStr && eventDateStr >= today;
    });
  }, [filteredEvents, today]);

  const pastEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const eventDateStr = event.date?.split('T')[0];
      return eventDateStr && eventDateStr < today;
    });
  }, [filteredEvents, today]);

  const nearYouEvents = useMemo(() => 
    futureEvents.slice(0, 8), [futureEvents]
  );

  // --- Data Fetching ---
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
        .limit(EVENTS_PER_PAGE);

      if (fetchError) throw fetchError;

      const parsedEvents = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || "Untitled Event",
        description: item.description,
        category_id: item.category_id ?? 0,
        date: item.date,
        time: item.time || "",
        venue: item.venue || "",
        location: item.location || item.venue || "Location TBD",
        image: item.image || PLACEHOLDER_IMAGE,
        ticketTiers: (item.ticketTiers || []).map((tier: any) => ({
          name: tier.tier_name || "General Admission",
          price: tier.price ?? 0,
          description: tier.description,
          quantity_sold: tier.quantity_sold ?? 0,
          quantity_available: tier.quantity_total ?? null,
        })),
        featured: item.featured ?? false,
        trending: item.trending ?? false,
        isNew: item.isnew ?? false,
        sponsored: item.sponsored ?? false,
        coordinates: item.lat && item.lng
          ? { lat: Number(item.lat), lng: Number(item.lng) }
          : undefined,
        slug: item.slug,
      }));

      setEvents(parsedEvents);
    } catch (err: any) {
      console.error("Events fetch failed:", err);
      setError("Failed to load events. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("categories")
        .select("id, name, gradient")
        .order("name");
      
      if (data) setCategories(data);
    } catch (err) {
      console.error("Categories fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, [fetchEvents, fetchCategories]);

  // --- Geolocation ---
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

  // --- Carousel Autoplay ---
  useEffect(() => {
    if (featuredEvents.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, CAROUSEL_INTERVAL);

    return () => clearInterval(interval);
  }, [featuredEvents]);

  // --- Event Handlers ---
  const handleEventClick = useCallback((event: Event) => {
    const path = event.slug ? `/event/${event.slug}` : `/event/${event.id}`;
    navigate(path);
  }, [navigate]);

  const handleCategorySelect = useCallback((category: "All" | number) => {
    setSelectedCategory(category);
    const eventsSection = document.getElementById("events-section");
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + featuredEvents.length) % featuredEvents.length);
  }, [featuredEvents]);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % featuredEvents.length);
  }, [featuredEvents]);

  const handleMapZoomIn = useCallback(() => {
    setMapZoom(prev => Math.min(prev + 2, 18));
  }, []);

  const handleMapZoomOut = useCallback(() => {
    setMapZoom(prev => Math.max(prev - 2, 1));
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-6"
        >
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto" aria-hidden="true" />
          <h2 className="text-3xl font-bold text-gray-800">Loading Events...</h2>
          <p className="text-gray-600">Discovering amazing experiences for you</p>
        </motion.div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md text-center space-y-6"
        >
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto" aria-hidden="true" />
          <h2 className="text-3xl font-bold text-gray-800">Oops! Something went wrong</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-2xl hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-600"
            aria-label="Try loading events again"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Main Render ---
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
            {showPastEvents ? 'All events including past' : 'Upcoming events only'} • {filteredEvents.length} events available
          </p>
        </motion.header>

        {/* Search Bar */}
        <SearchBar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          resultsCount={filteredEvents.length}
          showPast={showPastEvents}
          setShowPast={setShowPastEvents}
        />

        {/* Featured Carousel - Only shows future featured events */}
        <AnimatePresence mode="wait">
          {featuredEvents.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-12"
              aria-label="Featured events carousel"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Flame className="w-10 h-10 text-red-600" aria-hidden="true" />
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
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft size={24} aria-hidden="true" />
                    </button>
                    <button
                      onClick={handleNextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      aria-label="Next slide"
                    >
                      <ChevronRight size={24} aria-hidden="true" />
                    </button>
                  </>
                )}

                {/* Carousel Content */}
                <div 
                  className="flex transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {featuredEvents.map((event, index) => {
                    const { price, isFree } = getLowestPriceFromTiers(event.ticketTiers);
                    const soldOut = isEventSoldOut(event.ticketTiers);
                    const availableTickets = getAvailableTickets(event.ticketTiers);
                    const eventIsPast = isEventPast(event.date);
                    
                    return (
                      <div key={event.id} className="w-full flex-shrink-0">
                        <button
                          onClick={() => handleEventClick(event)}
                          className="w-full text-left focus:outline-none focus:ring-4 focus:ring-purple-300 rounded-3xl"
                          aria-label={`Featured event ${index + 1}: ${event.title} - ${soldOut ? 'Sold Out' : isFree ? 'Free' : `₦${price.toLocaleString('en-NG')}`}`}
                        >
                          <div className="relative h-96 md:h-[560px] bg-black rounded-3xl overflow-hidden group/carousel">
                            <img 
                              src={event.image || PLACEHOLDER_IMAGE} 
                              alt={event.title}
                              className="w-full h-full object-cover opacity-70 group-hover/carousel:opacity-90 transition-opacity duration-500"
                              loading="lazy"
                              width={1200}
                              height={560}
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
                                  {formatEventDateShort(event.date)} at {formatEventTime(event.date, event.time)}
                                </span>
                              </p>
                              <div className="flex items-center justify-between mt-6">
                                <p className={`text-3xl font-bold ${
                                  soldOut ? 'text-red-400' : 
                                  isFree ? 'text-emerald-400' : 'text-purple-400'
                                }`}>
                                  {soldOut ? 'SOLD OUT' : 
                                   isFree ? 'Free' : formatPriceDisplay(price, isFree)}
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
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3" role="tablist" aria-label="Featured events slides">
                    {featuredEvents.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`w-3 h-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white ${
                          currentSlide === i 
                            ? "bg-white w-12 scale-110" 
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                        role="tab"
                        aria-label={`Go to slide ${i + 1}`}
                        aria-selected={currentSlide === i}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Near You Section (Future Events Only) */}
        {!showPastEvents && futureEvents.length > 0 && (
          <section className="mb-16" aria-label="Events near your location">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Navigation className="w-10 h-10 text-purple-600" aria-hidden="true" />
                <h2 className="text-3xl sm:text-4xl font-black">Near You</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter size={16} aria-hidden="true" />
                <span>Based on your location</span>
              </div>
            </div>
            
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {nearYouEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onEventClick={handleEventClick} 
                />
              ))}
            </motion.div>
          </section>
        )}

        {/* View Mode Toggle */}
        <motion.div 
          className="flex justify-center gap-6 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="radiogroup"
          aria-label="View mode selection"
        >
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-purple-300 ${
              viewMode === "map"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "bg-white text-gray-800 hover:shadow-2xl"
            }`}
            role="radio"
            aria-checked={viewMode === "map"}
            aria-label="Map view"
          >
            <MapPinned size={24} aria-hidden="true" /> Map View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-purple-300 ${
              viewMode === "list"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "bg-white text-gray-800 hover:shadow-2xl"
            }`}
            role="radio"
            aria-checked={viewMode === "list"}
            aria-label="List view"
          >
            <List size={24} aria-hidden="true" /> List View
          </button>
        </motion.div>

        {/* Map View */}
        {viewMode === "map" && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[70vh] rounded-3xl overflow-hidden shadow-2xl mb-16 relative"
            id="map-section"
            aria-label="Map showing event locations"
          >
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button
                onClick={handleMapZoomIn}
                className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-600"
                aria-label="Zoom in"
              >
                <span className="text-xl font-bold">+</span>
              </button>
              <button
                onClick={handleMapZoomOut}
                className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-600"
                aria-label="Zoom out"
              >
                <span className="text-xl font-bold">−</span>
              </button>
            </div>

            {/* Past Events Warning */}
            {showPastEvents && (
              <div className="absolute top-4 left-4 z-[1000] bg-yellow-500/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  ⚠️ Showing past events
                </p>
              </div>
            )}

            <MapContainer
              center={userLocation}
              zoom={mapZoom}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              className="rounded-3xl"
              aria-label="Interactive map showing event locations"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ChangeView center={userLocation} zoom={mapZoom} />
              <LocationMarker position={userLocation} />
              
              {/* Event Markers */}
              {filteredEvents
                .filter(event => event.coordinates)
                .map((event) => {
                  const { price, isFree } = getLowestPriceFromTiers(event.ticketTiers);
                  const soldOut = isEventSoldOut(event.ticketTiers);
                  const availableTickets = getAvailableTickets(event.ticketTiers);
                  const isLowStock = availableTickets > 0 && availableTickets <= 10;
                  const eventIsPast = isEventPast(event.date);
                  
                  return (
                    <Marker
                      key={event.id}
                      position={[event.coordinates!.lat, event.coordinates!.lng]}
                      eventHandlers={{
                        click: () => handleEventClick(event),
                      }}
                      aria-label={`Event: ${event.title} at ${event.location}`}
                    >
                      <Popup>
                        <div className="p-2 max-w-xs">
                          <img 
                            src={event.image || PLACEHOLDER_IMAGE} 
                            alt={event.title}
                            className="w-full h-32 object-cover rounded-lg mb-2"
                            loading="lazy"
                            width={300}
                            height={128}
                          />
                          <h4 className="font-bold text-lg text-purple-700">{event.title}</h4>
                          {eventIsPast && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold mt-1">
                              📅 Past Event
                            </div>
                          )}
                          {!eventIsPast && soldOut && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold mt-1">
                              SOLD OUT
                            </div>
                          )}
                          {!eventIsPast && !soldOut && isLowStock && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold mt-1">
                              🔥 {availableTickets} left
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            <Calendar size={12} className="inline mr-1" aria-hidden="true" />
                            {formatEventDateShort(event.date)} at {formatEventTime(event.date, event.time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <MapPin size={12} className="inline mr-1" aria-hidden="true" />
                            {event.location}
                          </p>
                          <div className={`text-sm font-bold mt-2 ${
                            eventIsPast ? 'text-gray-600' :
                            soldOut ? 'text-red-600' : 
                            isFree ? 'text-emerald-600' : 'text-purple-600'
                          }`}>
                            {eventIsPast ? 'PAST EVENT' : 
                             soldOut ? 'SOLD OUT' : 
                             isFree ? 'Free' : formatPriceDisplay(price, isFree)}
                          </div>
                          <button
                            onClick={() => handleEventClick(event)}
                            className={`mt-3 w-full py-2 rounded-lg hover:shadow transition text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                              eventIsPast
                                ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white hover:shadow-lg'
                                : soldOut 
                                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                                  : isFree
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                            }`}
                            disabled={!eventIsPast && soldOut}
                            aria-label={`View details for ${event.title}`}
                          >
                            {eventIsPast ? 'View Details' : soldOut ? 'Sold Out' : 'View Details'}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
            
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
              <p className="text-sm font-semibold text-gray-800">
                📍 {filteredEvents.filter(e => e.coordinates).length} events on map
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
            aria-label="All events list"
          >
            {/* Category Filter */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black">Browse by Category</h2>
                <span className="text-gray-600">
                  {filteredEvents.length} events
                  {showPastEvents && pastEvents.length > 0 && ` (${pastEvents.length} past)`}
                </span>
              </div>
              
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent pb-4">
                <div className="flex gap-4 min-w-max" role="tablist" aria-label="Event categories">
                  <button
                    onClick={() => handleCategorySelect("All")}
                    className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all whitespace-nowrap focus:outline-none focus:ring-4 focus:ring-purple-300 ${
                      selectedCategory === "All"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl"
                        : "bg-white text-gray-800 border hover:shadow-xl"
                    }`}
                    role="tab"
                    aria-selected={selectedCategory === "All"}
                    aria-label="All categories"
                  >
                    All Events ({filteredEvents.length})
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
                        role="tab"
                        aria-selected={selectedCategory === cat.id}
                        aria-label={`${cat.name} events (${count} available)`}
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
                  ? showPastEvents ? "All Events" : "Upcoming Events"
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
                    <Calendar className="w-12 h-12 text-purple-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No events found
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {searchTerm
                      ? `No events found for "${searchTerm}". Try a different search.`
                      : selectedCategory === "All"
                        ? `No ${showPastEvents ? 'events' : 'upcoming events'} found.`
                        : `No ${categories.find(c => c.id === selectedCategory)?.name?.toLowerCase()} ${showPastEvents ? 'events' : 'upcoming events'} found. Try another category.`}
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center mt-6">
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-600"
                        aria-label="Clear search"
                      >
                        Clear Search
                      </button>
                    )}
                    {!showPastEvents && pastEvents.length > 0 && (
                      <button
                        onClick={() => setShowPastEvents(true)}
                        className="bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-600"
                        aria-label="Show past events"
                      >
                        <History className="w-5 h-5 inline mr-2" />
                        Show Past Events ({pastEvents.length})
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                  layout
                >
                  <AnimatePresence>
                    {filteredEvents.map((event) => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        onEventClick={handleEventClick} 
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Past Events Section (When toggled on) */}
            {showPastEvents && pastEvents.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-16 pt-8 border-t border-gray-200"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <History className="w-8 h-8 text-gray-600" aria-hidden="true" />
                    <h2 className="text-3xl font-black text-gray-800">Past Events</h2>
                  </div>
                  <span className="text-gray-600">
                    {pastEvents.length} past events
                  </span>
                </div>
                
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.1 }}
                >
                  {pastEvents.map((event) => (
                    <EventCard 
                      key={`past-${event.id}`} 
                      event={event} 
                      onEventClick={handleEventClick} 
                    />
                  ))}
                </motion.div>
              </motion.section>
            )}

            {/* Load More */}
            {filteredEvents.length > 0 && filteredEvents.length < events.length && (
              <div className="text-center mt-12">
                <button
                  className="bg-white border-2 border-purple-600 text-purple-600 font-bold py-4 px-12 rounded-2xl hover:bg-purple-50 hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                  onClick={() => console.log("Load more events")}
                  aria-label="Load more events"
                >
                  Load More Events
                </button>
              </div>
            )}
          </motion.section>
        )}
      </div>
    </div>
  );
}