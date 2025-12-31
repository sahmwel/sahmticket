'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  MapPin,
  Ticket,
  Sparkles,
  Flame,
  Star,
  Plus,
  Car,
  Navigation,
  BadgeCheck,
  Clock,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// --- Constants ---
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
const EVENTS_PER_PAGE = 50;
const NOTIFICATION_TIMEOUT = 5000;

// --- Event Type ---
export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  image: string;
  featured?: boolean;
  trending?: boolean;
  isNew?: boolean;
  sponsored?: boolean;
  ticketTiers: {
    name: string;
    price: string | number;
    sold?: number;
    available?: number;
    quantity_sold?: number;
    quantity_available?: number;
    description?: string;
  }[];
  slug?: string;
}

// --- Your Date Formatting Functions ---
const formatDate = (timestamp: string | null) => {
  if (!timestamp) return "Date not set";

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const datePart = timestamp.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[month - 1];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(year, month - 1, day);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''}`;
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    if (diffDays < -1) return `${formattedDate} (Past)`;
    if (diffDays === -1) return `Yesterday at ${formattedTime}`;
    if (diffDays === 0) return `Today at ${formattedTime}`;
    if (diffDays === 1) return `Tomorrow at ${formattedTime}`;
    if (diffDays <= 7) return `${formattedDate} (in ${diffDays} days)`;
    
    return formattedDate;
  } catch (error) {
    return "Invalid date";
  }
};

const formatDateOnly = (timestamp: string | null) => {
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

// Helper functions that don't use hooks
const getLowestPriceFromTiers = (event: Event): { price: number; isFree: boolean } => {
  if (!event.ticketTiers || !Array.isArray(event.ticketTiers) || event.ticketTiers.length === 0) {
    return { price: 0, isFree: true };
  }

  let hasPaidTier = false;
  let lowestPaidPrice = Infinity;
  let hasFreeTier = false;

  event.ticketTiers.forEach(tier => {
    if (!tier || typeof tier !== 'object') return;
    
    const available = tier.available || tier.quantity_available;
    const sold = tier.sold || tier.quantity_sold || 0;
    
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

  if (hasPaidTier) {
    return { price: lowestPaidPrice, isFree: false };
  }
  
  if (hasFreeTier) {
    return { price: 0, isFree: true };
  }
  
  return { price: 0, isFree: true };
};

const isEventSoldOut = (event: Event): boolean => {
  if (!event.ticketTiers || event.ticketTiers.length === 0) return false;
  
  const hasAvailableTickets = event.ticketTiers.some(tier => {
    if (!tier) return false;
    
    const available = tier.available || tier.quantity_available;
    const sold = tier.sold || tier.quantity_sold || 0;
    
    if (available == null) return true;
    
    return available > 0 && sold < available;
  });
  
  return !hasAvailableTickets;
};

const getAvailableTickets = (event: Event): number => {
  if (!event.ticketTiers || !Array.isArray(event.ticketTiers)) return 0;
  
  return event.ticketTiers.reduce((total, tier) => {
    if (!tier) return total;
    
    const available = tier.available || tier.quantity_available;
    const sold = tier.sold || tier.quantity_sold || 0;
    
    if (available == null) return total + 9999;
    
    return total + Math.max(0, available - sold);
  }, 0);
};

const formatPriceDisplay = (price: number, isFree: boolean): string => {
  if (isFree) return "Free";
  return `₦${price.toLocaleString('en-NG')}`;
};

// Updated formatEventDateShort to use your formatDate function
const formatEventDateShort = (iso: string): string => {
  const formatted = formatDate(iso);
  // Extract just the date part from your formatDate output
  if (formatted.includes("(")) {
    return formatted.split("(")[0].trim();
  }
  if (formatted.includes(" at ")) {
    return formatted.split(" at ")[0].trim();
  }
  return formatted;
};

// Updated formatEventTime to extract time from your formatDate function
const formatEventTime = (eventDate: string, eventTime?: string): string => {
  // First try to use the event.time if available
  if (eventTime) {
    // Try to parse and format the time string
    try {
      const [hours, minutes] = eventTime.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes || 0, 0);
      let hoursFormatted = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const minutesFormatted = minutes ? minutes.toString().padStart(2, '0') : '00';
      return `${hoursFormatted}:${minutesFormatted} ${ampm}`;
    } catch {
      return eventTime;
    }
  }
  
  // If no event.time, try to extract time from formatDate output
  const formatted = formatDate(eventDate);
  if (formatted.includes(" at ")) {
    return formatted.split(" at ")[1].trim();
  }
  
  // Fallback to time from ISO string
  try {
    const date = new Date(eventDate);
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

// --- Loading Skeleton Component ---
const EventCardSkeleton = () => (
  <div className="group relative bg-white rounded-2xl overflow-hidden shadow-md animate-pulse">
    <div className="aspect-[3/2] bg-gray-200" />
    <div className="p-4 pb-6 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="h-10 bg-gray-200 rounded-xl" />
    </div>
  </div>
);

const EventSectionSkeleton = () => (
  <div className="px-4 md:px-6 mb-20">
    <div className="h-10 bg-gray-200 rounded w-48 mx-auto mb-10" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {[1, 2, 3, 4].map(i => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// --- Badge Component ---
const badgeConfig = {
  featured: { gradient: "from-purple-500 to-pink-600", icon: Star, text: "Star" },
  trending: { gradient: "from-orange-500 to-red-600", icon: Flame, text: "Hot" },
  new: { gradient: "from-emerald-500 to-teal-600", icon: Sparkles, text: "New" },
  sponsored: { gradient: "from-blue-500 to-cyan-600", icon: BadgeCheck, text: "Sponsored" },
} as const;

type BadgeVariant = keyof typeof badgeConfig;

const Badge = ({ variant }: { variant: BadgeVariant }) => {
  const { gradient, icon: Icon, text } = badgeConfig[variant];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${gradient}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {text}
    </span>
  );
};

// --- TimelineSchedule Component ---
const TimelineSchedule = ({ events }: { events: Event[] }) => {
  const navigate = useNavigate();
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 2);

  // Helper function to check if event is on a specific date
  const isEventOnDate = useCallback((event: Event, targetDate: Date): boolean => {
    if (!event.date) return false;
    
    try {
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) return false;
      
      const eventDateOnly = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      const targetDateOnly = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      
      return eventDateOnly.getTime() === targetDateOnly.getTime();
    } catch {
      return false;
    }
  }, []);

  const eventsToday = useMemo(() => events.filter(
    (e) => isEventOnDate(e, today)
  ), [events, today, isEventOnDate]);

  const eventsTomorrow = useMemo(() => events.filter(
    (e) => isEventOnDate(e, tomorrow)
  ), [events, tomorrow, isEventOnDate]);

  const eventsNext = useMemo(() => events.filter(
    (e) => isEventOnDate(e, nextDay)
  ), [events, nextDay, isEventOnDate]);

  const handleEventClick = useCallback((event: Event) => {
    const path = event.slug ? `/event/${event.slug}` : `/event/${event.id}`;
    navigate(path);
  }, [navigate]);

  const renderEvents = useCallback((eventList: Event[], label: string) => {
    if (!eventList || eventList.length === 0) return null;

    const firstEventWithDate = eventList.find((e) => e.date);
    if (!firstEventWithDate?.date) return null;

    return (
      <motion.section
        key={label}
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        viewport={{ once: false, amount: 0.2 }}
        className="py-16 md:py-24 bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-6">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl font-black text-white text-center mb-4"
          >
            {label}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-pink-200 text-lg mb-10"
          >
            {/* Use formatDate to show relative date */}
            {firstEventWithDate.date ? formatDate(firstEventWithDate.date) : "Date TBD"}
          </motion.p>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {eventList.map((event, i) => {
              const { price, isFree } = getLowestPriceFromTiers(event);
              const priceDisplay = formatPriceDisplay(price, isFree);
              const soldOut = isEventSoldOut(event);
              const availableTickets = getAvailableTickets(event);
              const isLowStock = availableTickets > 0 && availableTickets <= 10;
              
              return (
                <motion.div
                  key={`${event.id}-${i}-${label}`}
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  whileHover={{ scale: 1.03 }}
                  className={`group relative backdrop-blur-xl rounded-3xl p-6 border overflow-hidden cursor-pointer ${
                    soldOut ? 'bg-gray-800/30 border-gray-700/50' : 'bg-white/12 border-white/10'
                  }`}
                  onClick={() => handleEventClick(event)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleEventClick(event)}
                  aria-label={`View ${event.title} event`}
                >
                  {soldOut && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold text-white bg-gradient-to-r from-red-600 to-red-800">
                        <Ticket className="w-5 h-5" />
                        SOLD OUT
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-rose-600/20 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <h3 className={`text-xl md:text-2xl font-bold line-clamp-2 mb-3 group-hover:text-pink-300 transition ${
                    soldOut ? 'text-gray-300' : 'text-white'
                  }`}>
                    {event.title || "Untitled Event"}
                  </h3>

                  <div className={`flex flex-col gap-2 text-sm mb-6 ${
                    soldOut ? 'text-gray-400' : 'text-pink-100'
                  }`}>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {formatEventTime(event.date, event.time)}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {event.location || "Location TBD"}
                    </span>
                    {!soldOut && isLowStock && (
                      <span className="flex items-center gap-2 text-orange-300 font-bold">
                        🔥 Only {availableTickets} tickets left!
                      </span>
                    )}
                    {!soldOut && availableTickets >= 9999 && (
                      <span className="flex items-center gap-2 text-green-300 font-bold">
                        ✓ Unlimited tickets available
                      </span>
                    )}
                  </div>

                  {!soldOut && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center gap-2 ${
                        isFree 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/50' 
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      aria-label={`Get ticket for ${event.title} for ${priceDisplay}`}
                    >
                      <Ticket className="w-4 h-4" />
                      Get Ticket • {priceDisplay}
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>
    );
  }, [handleEventClick]);

  return (
    <AnimatePresence mode="wait">
      {renderEvents(eventsToday, "Today")}
      {renderEvents(eventsTomorrow, "Tomorrow")}
      {renderEvents(eventsNext, "Next")}
    </AnimatePresence>
  );
};

// --- EventCard Component ---
const containerVariants = { hidden: { opacity: 1 }, visible: { transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1 } };

const EventCard = ({ event }: { event: Event }) => {
  const navigate = useNavigate();
  const { price, isFree } = getLowestPriceFromTiers(event);
  const priceDisplay = formatPriceDisplay(price, isFree);
  const soldOut = isEventSoldOut(event);
  const availableTickets = getAvailableTickets(event);
  const isLowStock = availableTickets > 0 && availableTickets <= 10;

  const handleEventClick = useCallback(() => {
    const path = event.slug ? `/event/${event.slug}` : `/event/${event.id}`;
    navigate(path);
  }, [event.slug, event.id, navigate]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  }, []);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -16, scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100 cursor-pointer ${
        soldOut ? 'opacity-90' : ''
      }`}
      onClick={handleEventClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleEventClick()}
      aria-label={`View ${event.title} event details`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-rose-600/20 blur-3xl -z-10 opacity-0 group-hover:opacity-100" />
      <div className="relative aspect-[3/2] bg-gray-50 overflow-hidden">
        <img
          src={event.image || PLACEHOLDER_IMAGE}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={handleImageError}
          loading="lazy"
          width={300}
          height={200}
        />
        
        {soldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold text-white bg-gradient-to-r from-red-600 to-red-800">
              <Ticket className="w-5 h-5" />
              SOLD OUT
            </span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {event.trending && <Badge variant="trending" />}
          {event.featured && <Badge variant="featured" />}
          {event.isNew && <Badge variant="new" />}
          {event.sponsored && <Badge variant="sponsored" />}
        </div>
        
        {!soldOut && isLowStock && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-600">
              🔥 {availableTickets} left
            </span>
          </div>
        )}
        
        {!soldOut && availableTickets >= 9999 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
              ✓ Unlimited
            </span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-4 pb-6">
        <h3 className="font-bold text-sm line-clamp-2 text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
          {event.title || "Untitled Event"}
        </h3>
        <div className="mt-3 space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-purple-600" />
            <span>{event.date ? formatDate(event.date) : "Date not set"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-purple-600" />
            <span className="font-semibold">
              {formatEventTime(event.date, event.time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-purple-600" />
            <span className="truncate">{event.location || "Location TBD"}</span>
          </div>
        </div>
        
        {soldOut ? (
          <div className="w-full bg-gray-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-md mt-4 cursor-not-allowed">
            <Ticket size={24} />
            Sold Out
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-transform mt-4 ${
              isFree 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/50 hover:scale-105' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/50 hover:scale-105'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleEventClick();
            }}
            aria-label={`Get ticket for ${event.title} for ${priceDisplay}`}
          >
            <Ticket size={24} />
            Get Ticket • {priceDisplay}
          </motion.button>
        )}
      </div>
    </motion.article>
  );
};

const EventSection = ({ title, events }: { title: string; events: Event[] }) => {
  if (!events.length) return null;
  
  return (
    <section className="px-4 md:px-6 mb-20">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-black text-center mb-10 md:mb-14 text-gray-900"
      >
        {title}
      </motion.h2>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
      >
        {events.map((event, i) => (
          <motion.div key={`${event.id || i}-${i}`} variants={itemVariants}>
            <EventCard event={event} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

// --- SearchBar Component ---
const SearchBar = ({ 
  searchTerm, 
  setSearchTerm,
  resultsCount 
}: { 
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  resultsCount: number;
}) => {
  const handleClear = useCallback(() => setSearchTerm(""), [setSearchTerm]);

  return (
    <div className="max-w-2xl mx-auto px-5 my-16">
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
      <p className="text-center text-gray-600 mt-4">
        Found {resultsCount} event{resultsCount !== 1 ? 's' : ''}
        {searchTerm && ` for "${searchTerm}"`}
      </p>
    </div>
  );
};

// --- Main Home Component ---
export default function Home() {
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newEventNotification, setNewEventNotification] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let subscription: any;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("events")
          .select(`
            id, title, date, time, venue, location, image, cover_image,
            featured, trending, isnew, sponsored, slug, status,
            ticketTiers!ticketTiers_event_id_fkey (
              id, tier_name, description, price,
              quantity_total, quantity_sold, is_active
            )
          `)
          .eq("status", "published")
          .order("date", { ascending: true })
          .limit(EVENTS_PER_PAGE);

        if (fetchError) throw fetchError;

        if (!isMounted) return;

        const parsedEvents = (data || []).map((event: any) => {
          const ticketTiers = (event.ticketTiers || []).map((t: any) => ({
            name: t.tier_name || "General Admission",
            price: Number(t.price) || 0,
            description: t.description,
            quantity_available: t.quantity_total ?? null,
            quantity_sold: t.quantity_sold || 0,
            is_active: t.is_active ?? true,
          }));

          const activeTiers = ticketTiers.filter((tier: any) => tier.is_active !== false);

          return {
            id: event.id,
            title: event.title || "Untitled Event",
            date: event.date,
            time: event.time,
            location: event.location || event.venue || "Location TBD",
            image: event.image || event.cover_image || PLACEHOLDER_IMAGE,
            ticketTiers: activeTiers,
            featured: event.featured ?? false,
            trending: event.trending ?? false,
            isNew: event.isnew ?? false,
            sponsored: event.sponsored ?? false,
            slug: event.slug || null,
          };
        });

        setEventsList(parsedEvents);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load events");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const setupRealtime = () => {
      try {
        subscription = supabase
          .channel("public:events")
          .on(
            "postgres_changes",
            { 
              event: "*", 
              schema: "public", 
              table: "events",
              filter: "status=eq.published"
            },
            async (payload: any) => {
              if (!isMounted) return;
              
              if (payload.eventType === "INSERT") {
                try {
                  const { data: newEventWithTiers, error: fetchError } = await supabase
                    .from("events")
                    .select(`
                      id, title, date, time, venue, location, image, cover_image,
                      featured, trending, isnew, sponsored, slug, status,
                      ticketTiers!ticketTiers_event_id_fkey (
                        id, tier_name, description, price,
                        quantity_total, quantity_sold, is_active
                      )
                    `)
                    .eq("id", payload.new.id)
                    .single();

                  if (fetchError) throw fetchError;

                  if (newEventWithTiers) {
                    const ticketTiers = (newEventWithTiers.ticketTiers || []).map((t: any) => ({
                      name: t.tier_name || "General Admission",
                      price: Number(t.price) || 0,
                      description: t.description,
                      quantity_available: t.quantity_total ?? null,
                      quantity_sold: t.quantity_sold || 0,
                    })).filter((t: any) => (t.is_active ?? true) !== false);

                    const parsed = {
                      id: newEventWithTiers.id,
                      title: newEventWithTiers.title || "Untitled Event",
                      date: newEventWithTiers.date,
                      time: newEventWithTiers.time,
                      location: newEventWithTiers.location || newEventWithTiers.venue || "Location TBD",
                      image: newEventWithTiers.image || newEventWithTiers.cover_image || PLACEHOLDER_IMAGE,
                      ticketTiers,
                      featured: newEventWithTiers.featured ?? false,
                      trending: newEventWithTiers.trending ?? false,
                      isNew: newEventWithTiers.isnew ?? false,
                      sponsored: newEventWithTiers.sponsored ?? false,
                      slug: newEventWithTiers.slug || null,
                    };
                    
                    setEventsList(prev => [parsed as Event, ...prev]);
                    setNewEventNotification(parsed as Event);
                    setTimeout(() => {
                      if (isMounted) setNewEventNotification(null);
                    }, NOTIFICATION_TIMEOUT);
                  }
                } catch (err) {
                  console.error("Error processing new event:", err);
                }
              } else if (payload.eventType === "UPDATE") {
                setEventsList(prev => 
                  prev.map(event => 
                    event.id === payload.new.id 
                      ? { ...event, ...payload.new } 
                      : event
                  )
                );
              } else if (payload.eventType === "DELETE") {
                setEventsList(prev => prev.filter(event => event.id !== payload.old.id));
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error("Realtime setup error:", err);
      }
    };

    fetchData();
    setupRealtime();

    return () => {
      isMounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  const filteredEvents = useMemo(
    () =>
      eventsList.filter(
        e =>
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [eventsList, searchTerm]
  );

  const trendingEvents = useMemo(() => filteredEvents.filter(e => e.trending), [filteredEvents]);
  const featuredEvents = useMemo(() => filteredEvents.filter(e => e.featured), [filteredEvents]);
  const newEvents = useMemo(() => filteredEvents.filter(e => e.isNew), [filteredEvents]);
  const sponsoredEvents = useMemo(() => filteredEvents.filter(e => e.sponsored), [filteredEvents]);

  const handleNotificationClick = useCallback((event: Event) => {
    const path = event.slug ? `/event/${event.slug}` : `/event/${event.id}`;
    navigate(path);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    window.location.reload();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
        <div className="pt-28 pb-16 text-center px-5">
          <div className="h-12 bg-gray-200 rounded w-64 mx-auto mb-6 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-10 animate-pulse" />
        </div>
        <EventSectionSkeleton />
        <EventSectionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Events</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={handleRetry}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200 w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasEvents = eventsList.length > 0;
  const hasSearchResults = filteredEvents.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 relative">
      {/* New Event Notification */}
      <AnimatePresence>
        {newEventNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 cursor-pointer max-w-md"
            onClick={() => handleNotificationClick(newEventNotification)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(newEventNotification)}
            aria-label={`New event: ${newEventNotification.title}. Click to view.`}
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">New Event: </span>
              <span className="truncate">{newEventNotification.title}</span>
            </div>
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="pt-28 pb-16 text-center px-5">
        <motion.h1 
          initial={{ y: 40, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight text-gray-900"
        >
          Discover Events
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Across Nigeria</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.4 }} 
          className="mt-5 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto"
        >
          Concerts • Comedy • Festivals • Parties • Art & More
        </motion.p>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ delay: 0.7 }} 
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link 
            to="/teaser" 
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-4 rounded-full shadow-xl hover:scale-105 transition-transform duration-200"
          >
            <Plus className="w-6 h-6" /> Create Event
          </Link>
          <Link 
            to="/events" 
            className="bg-black text-white font-bold px-10 py-4 rounded-full shadow-xl hover:scale-105 transition-transform duration-200"
          >
            Explore Events
          </Link>
          <Link 
            to="/about" 
            className="bg-transparent border-2 border-gray-800 text-gray-800 font-bold px-10 py-4 rounded-full hover:bg-gray-900 hover:text-white transition-colors duration-200"
          >
            Learn More
          </Link>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 1 }} 
          className="mt-12 flex flex-wrap justify-center gap-6 text-sm md:text-base text-gray-700 font-medium"
        >
          <span className="flex items-center gap-2"><Car className="w-5 h-5 text-purple-600" /> Uber Rides</span>
          <span className="flex items-center gap-2"><Navigation className="w-5 h-5 text-pink-600" /> Live Map</span>
          <span className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-600" /> Verified Only</span>
        </motion.div>
      </section>

      {/* Timeline */}
      {hasEvents && <TimelineSchedule events={filteredEvents} />}

      {/* Search */}
      <SearchBar 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        resultsCount={filteredEvents.length}
      />

      {/* Event Sections */}
      <div className="space-y-20 pb-28">
        {hasEvents ? (
          <>
            {trendingEvents.length > 0 && <EventSection title=" Trending Now" events={trendingEvents} />}
            {featuredEvents.length > 0 && <EventSection title=" Featured Events" events={featuredEvents} />}
            {newEvents.length > 0 && <EventSection title=" Fresh Drops" events={newEvents} />}
            {sponsoredEvents.length > 0 && <EventSection title=" Sponsored Picks" events={sponsoredEvents} />}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No events available yet</h3>
            <p className="text-gray-600 mb-8">Be the first to create an amazing event!</p>
            <Link 
              to="/teaser"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200"
            >
              <Plus className="w-5 h-5" /> Create First Event
            </Link>
          </div>
        )}

        {!hasSearchResults && searchTerm && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No events found</h3>
            <p className="text-gray-600 mb-8">Try a different search term or browse all events</p>
            <Link 
              to="/events"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200"
            >
              Browse All Events
            </Link>
          </div>
        )}

        {hasSearchResults && !searchTerm && filteredEvents.length > 0 && (
          <EventSection 
            title="All Events" 
            events={filteredEvents.slice(0, 8)}
          />
        )}
      </div>
    </div>
  );
}