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
  History,
  Eye,
  EyeOff,
  Loader2
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
  isPast?: boolean;
}

// --- Date Formatting Functions ---
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
    
    // REMOVE THE TIME EXTRACTION FROM HERE
    // let hours = date.getHours();
    // const minutes = date.getMinutes().toString().padStart(2, '0');
    // const ampm = hours >= 12 ? 'PM' : 'AM';
    // hours = hours % 12;
    // hours = hours ? hours : 12;
    // const formattedTime = `${hours}:${minutes} ${ampm}`;

    if (diffDays < -1) return `${formattedDate} (Past)`;
    if (diffDays === -1) return `Yesterday`; // REMOVE "at ${formattedTime}"
    if (diffDays === 0) return `Today`; // REMOVE "at ${formattedTime}"
    if (diffDays === 1) return `Tomorrow`; // REMOVE "at ${formattedTime}"
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

const formatEventTime = (eventDate: string, eventTime?: string): string => {
  if (eventTime) {
    try {
      const [hours, minutes] = eventTime.split(':').map(Number);
      let hoursFormatted = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const minutesFormatted = minutes ? minutes.toString().padStart(2, '0') : '00';
      return `${hoursFormatted}:${minutesFormatted} ${ampm}`;
    } catch {
      return eventTime;
    }
  }
  
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
  past: { gradient: "from-gray-500 to-gray-700", icon: History, text: "Past" },
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

// --- Enhanced TimelineSchedule Component ---
const TimelineSchedule = ({ events, showPast = false }: { events: Event[]; showPast?: boolean }) => {
  const navigate = useNavigate();
  
  // FIXED: Get date group function - only uses date comparisons, not formatted dates
  const getDateGroup = useCallback((dateStr: string): string => {
  if (!dateStr) return "No Date";
  
  try {
    const now = new Date();
    const eventDate = new Date(dateStr);
    
    // Calculate the difference in days
    const diffMs = eventDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Check if event is within the next 24 hours for "Today"
    const isWithin24Hours = diffMs >= 0 && diffMs < (1000 * 60 * 60 * 24);
    
    if (isWithin24Hours) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1 && diffDays <= 7) return "This Week";
    if (diffDays > 7 && diffDays <= 14) return "Next Week";
    if (diffDays > 14 && diffDays <= 30) return "This Month";
    if (diffDays > 30 && diffDays <= 60) return "Next Month";
    if (diffDays > 60) return "Future Events";
    if (diffDays < 0 && diffDays >= -7) return "Last Week";
    if (diffDays < -7 && diffDays >= -30) return "Last Month";
    return "Long Ago";
  } catch {
    return "Unknown Date";
  }
}, []);

  // FIXED: New function specifically for timeline display - shows clean dates
  const formatTimelineDate = useCallback((dateStr: string): string => {
    if (!dateStr) return "";
    
    try {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[month - 1];
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(year, month - 1, day);
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const formattedDate = `${monthName} ${day}${year !== now.getFullYear() ? `, ${year}` : ''}`;
      
      if (diffDays === 0) return `Today, ${formattedDate}`;
      if (diffDays === 1) return `Tomorrow, ${formattedDate}`;
      
      return formattedDate;
    } catch (error) {
      return "Invalid date";
    }
  }, []);

  // FIXED: New function for event card date display
  const formatEventCardDate = useCallback((dateStr: string): string => {
    if (!dateStr) return "";
    
    try {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[month - 1];
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(year, month - 1, day);
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const formattedDate = `${monthName} ${day}`;
      
      if (diffDays === 0) return `Today`;
      if (diffDays === 1) return `Tomorrow`;
      if (diffDays < 7 && diffDays > 1) return `${formattedDate} (in ${diffDays} days)`;
      
      return formattedDate;
    } catch (error) {
      return "";
    }
  }, []);

  // Group events by timeline category
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    
    events.forEach(event => {
      const group = getDateGroup(event.date);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(event);
    });
    
    // Define display order
    const order = [
      "Today", "Tomorrow", "This Week", "Next Week", 
      "This Month", "Next Month", "Future Events",
      "Last Week", "Last Month", "Long Ago"
    ];
    
    // Sort events within each group by date
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
    });
    
    // Sort groups according to order
    const sortedGroups: Record<string, Event[]> = {};
    order.forEach(key => {
      if (groups[key] && groups[key].length > 0) {
        sortedGroups[key] = groups[key];
      }
    });
    
    return sortedGroups;
  }, [events, getDateGroup]);

  const getGroupIcon = useCallback((groupName: string) => {
    switch (groupName) {
      case "Today":
        return <Clock className="w-6 h-6 text-emerald-500" />;
      case "Tomorrow":
        return <Sparkles className="w-6 h-6 text-blue-500" />;
      case "This Week":
        return <Flame className="w-6 h-6 text-orange-500" />;
      case "Next Week":
        return <Calendar className="w-6 h-6 text-purple-500" />;
      case "This Month":
        return <Star className="w-6 h-6 text-yellow-500" />;
      case "Next Month":
        return <Calendar className="w-6 h-6 text-indigo-500" />;
      case "Future Events":
        return <Sparkles className="w-6 h-6 text-pink-500" />;
      case "Last Week":
      case "Last Month":
      case "Long Ago":
        return <History className="w-6 h-6 text-gray-500" />;
      default:
        return <Calendar className="w-6 h-6 text-gray-500" />;
    }
  }, []);

  const getGroupGradient = useCallback((groupName: string, isPast: boolean) => {
    if (isPast) {
      return "from-gray-800 via-gray-900 to-black";
    }
    
    switch (groupName) {
      case "Today":
        return "from-emerald-900 via-emerald-800 to-teal-900";
      case "Tomorrow":
        return "from-blue-900 via-indigo-900 to-purple-900";
      case "This Week":
        return "from-orange-900 via-amber-900 to-yellow-900";
      case "Next Week":
        return "from-purple-900 via-violet-900 to-fuchsia-900";
      case "This Month":
        return "from-rose-900 via-pink-900 to-rose-800";
      case "Next Month":
        return "from-indigo-900 via-purple-900 to-violet-900";
      case "Future Events":
        return "from-pink-900 via-rose-900 to-red-900";
      default:
        return "from-purple-900 via-pink-900 to-rose-900";
    }
  }, []);

  const handleEventClick = useCallback((event: Event) => {
    const path = event.slug ? `/event/${event.slug}` : `/event/${event.id}`;
    navigate(path);
  }, [navigate]);

  const renderEventCard = useCallback((event: Event, index: number, groupName: string) => {
    const { price, isFree } = getLowestPriceFromTiers(event);
    const priceDisplay = formatPriceDisplay(price, isFree);
    const soldOut = isEventSoldOut(event);
    const availableTickets = getAvailableTickets(event);
    const isLowStock = availableTickets > 0 && availableTickets <= 10;
    const isPastGroup = groupName.includes("Last") || groupName === "Long Ago";
    
    // FIXED: Use the new function for event card dates
    const eventDate = formatEventCardDate(event.date);
    
    return (
      <motion.div
        key={`${event.id}-${index}`}
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className={`relative backdrop-blur-lg rounded-2xl p-5 border overflow-hidden cursor-pointer transition-all duration-300 ${
          isPastGroup 
            ? 'bg-gray-800/40 border-gray-700/60 hover:bg-gray-800/60' 
            : soldOut 
              ? 'bg-gray-800/30 border-gray-700/50' 
              : 'bg-white/10 border-white/20 hover:bg-white/20'
        }`}
        onClick={() => handleEventClick(event)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleEventClick(event)}
        aria-label={`View ${event.title} event`}
      >
        {/* Time indicator */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          isPastGroup 
            ? 'bg-gray-600' 
            : soldOut 
              ? 'bg-gray-500' 
              : isFree 
                ? 'bg-emerald-500' 
                : 'bg-purple-500'
        }`} />
        
        <div className="ml-4">
          {/* Event header */}
          <div className="flex items-start justify-between mb-3">
            <h3 className={`text-lg font-bold line-clamp-2 ${
              isPastGroup 
                ? 'text-gray-300 group-hover:text-gray-200' 
                : soldOut 
                  ? 'text-gray-300' 
                  : 'text-white'
            }`}>
              {event.title || "Untitled Event"}
            </h3>
            
            {isPastGroup && (
              <Badge variant="past" />
            )}
          </div>
          
          {/* Event details */}
          <div className={`space-y-2 text-sm mb-4 ${
            isPastGroup 
              ? 'text-gray-400' 
              : soldOut 
                ? 'text-gray-400' 
                : 'text-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{eventDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatEventTime(event.date, event.time)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{event.location || "Location TBD"}</span>
            </div>
            
            {!isPastGroup && !soldOut && (
              <>
                {isLowStock && (
                  <div className="flex items-center gap-1.5 text-orange-300 font-semibold">
                    <Flame className="w-4 h-4" />
                    <span>Only {availableTickets} tickets left!</span>
                  </div>
                )}
                
                {availableTickets >= 9999 && (
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <BadgeCheck className="w-4 h-4" />
                    <span>Unlimited tickets available</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Action button */}
          {!soldOut && !isPastGroup ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 ${
                isFree 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:shadow-emerald-500/30' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-700 hover:shadow-purple-500/30'
              } shadow-lg hover:shadow-xl transition-all duration-300`}
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(event);
              }}
              aria-label={`Get ticket for ${event.title} for ${priceDisplay}`}
            >
              <Ticket className="w-4 h-4" />
              Get Ticket • {priceDisplay}
            </motion.button>
          ) : isPastGroup ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-gray-500/30 hover:shadow-xl transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(event);
              }}
              aria-label={`View ${event.title} event details`}
            >
              <Eye className="w-4 h-4" />
              View Details
            </motion.button>
          ) : (
            <div className="w-full bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md">
              <Ticket className="w-4 h-4" />
              Sold Out
            </div>
          )}
        </div>
      </motion.div>
    );
  }, [handleEventClick, getLowestPriceFromTiers, isEventSoldOut, getAvailableTickets, formatEventCardDate, formatEventTime]);

  // FIXED: Use formatTimelineDate for group header date range
  const renderTimelineGroup = useCallback((groupName: string, events: Event[], index: number) => {
    const isPastGroup = groupName.includes("Last") || groupName === "Long Ago";
    const groupGradient = getGroupGradient(groupName, isPastGroup);
    const groupIcon = getGroupIcon(groupName);
    const eventCount = events.length;
    
    // Get date range for the group - FIXED with new function
    const getGroupDateRange = () => {
      if (eventCount === 0) return "";
      
      const firstDate = events[0].date;
      const lastDate = events[events.length - 1].date;
      
      // For single-day groups, show formatted date
      if (groupName === "Today") {
        return formatTimelineDate(firstDate);
      }
      
      if (groupName === "Tomorrow") {
        return formatTimelineDate(firstDate);
      }
      
      if (groupName === "This Week") {
        const firstFormatted = formatTimelineDate(firstDate);
        const lastFormatted = formatTimelineDate(lastDate);
        // Check if all events are on the same day
        if (firstFormatted === lastFormatted) {
          return firstFormatted;
        }
        return `${firstFormatted} - ${lastFormatted}`;
      }
      
      if (groupName === "Next Week") {
        const firstFormatted = formatTimelineDate(firstDate);
        const lastFormatted = formatTimelineDate(lastDate);
        if (firstFormatted === lastFormatted) {
          return firstFormatted;
        }
        return `${firstFormatted} - ${lastFormatted}`;
      }
      
      if (groupName === "This Month") {
        const firstFormatted = formatTimelineDate(firstDate);
        const lastFormatted = formatTimelineDate(lastDate);
        if (firstFormatted === lastFormatted) {
          return firstFormatted;
        }
        return `${firstFormatted} - ${lastFormatted}`;
      }
      
      if (groupName === "Next Month") {
        const firstFormatted = formatTimelineDate(firstDate);
        const lastFormatted = formatTimelineDate(lastDate);
        if (firstFormatted === lastFormatted) {
          return firstFormatted;
        }
        return `${firstFormatted} - ${lastFormatted}`;
      }
      
      if (groupName === "Future Events") {
        return `${formatTimelineDate(firstDate)} onward`;
      }
      
      return "";
    };
    
    // Get date range text
    const dateRangeText = getGroupDateRange();
    
    return (
      <motion.section
        key={groupName}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.1 }}
        transition={{ duration: 0.6, delay: index * 0.1 }}
        className={`py-12 md:py-16 bg-gradient-to-br ${groupGradient}`}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-6">
          {/* Group header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm"
              >
                {groupIcon}
              </motion.div>
              
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`text-2xl md:text-3xl font-bold ${
                    isPastGroup ? 'text-gray-300' : 'text-white'
                  }`}
                >
                  {groupName}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`text-sm ${
                    isPastGroup ? 'text-gray-400' : 'text-gray-200'
                  }`}
                >
                  {eventCount} event{eventCount !== 1 ? 's' : ''}
                </motion.p>
              </div>
            </div>
            
            {!isPastGroup && dateRangeText && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="hidden md:block text-right"
              >
                <p className={`text-lg font-semibold ${
                  isPastGroup ? 'text-gray-400' : 'text-gray-200'
                }`}>
                  {dateRangeText}
                </p>
                {(groupName === "This Week" || groupName === "Next Week" || 
                 groupName === "This Month" || groupName === "Next Month") && 
                 eventCount > 1 ? (
                  <p className={`text-xs ${
                    isPastGroup ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    {eventCount} events in this period
                  </p>
                ) : null}
              </motion.div>
            )}
          </div>
          
          {/* Events grid */}
          {eventCount <= 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {events.map((event, i) => renderEventCard(event, i, groupName))}
            </div>
          ) : (
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.slice(0, 6).map((event, i) => renderEventCard(event, i, groupName))}
              </div>
              
              {eventCount > 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  className="mt-8 text-center"
                >
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    isPastGroup 
                      ? 'bg-gray-700/50 text-gray-300' 
                      : 'bg-white/10 text-white'
                  }`}>
                    +{eventCount - 6} more events in {groupName}
                  </span>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.section>
    );
  }, [renderEventCard, getGroupGradient, getGroupIcon, formatTimelineDate]);

  // Filter groups based on showPast toggle
  const visibleGroups = useMemo(() => {
    const allGroups = Object.entries(groupedEvents);
    
    if (!showPast) {
      return allGroups.filter(([groupName]) => 
        !groupName.includes("Last") && groupName !== "Long Ago"
      );
    }
    
    return allGroups;
  }, [groupedEvents, showPast]);

  if (visibleGroups.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-12 h-12 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {showPast ? "No events found" : "No upcoming events"}
        </h3>
        <p className="text-gray-600 mb-8">
          {showPast 
            ? "No past events available" 
            : "Check back soon for new events!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visibleGroups.map(([groupName, groupEvents], index) => 
        renderTimelineGroup(groupName, groupEvents, index)
      )}
    </div>
  );
};

// Also add this new helper function if not already present:
const getDaySuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// --- EventCard Component ---
const containerVariants = { hidden: { opacity: 1 }, visible: { transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1 } };

const EventCard = ({ event, isPast = false }: { event: Event; isPast?: boolean }) => {
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

  // Check if event is past
  const todayStr = new Date().toISOString().split('T')[0];
  const eventDateStr = event.date?.split('T')[0];
  const isEventPast = isPast || (eventDateStr && eventDateStr < todayStr);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -16, scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border cursor-pointer ${
        isEventPast ? 'border-gray-200 opacity-80 hover:opacity-100' : 
        soldOut ? 'border-gray-100 opacity-90' : 'border-gray-100'
      }`}
      onClick={handleEventClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleEventClick()}
      aria-label={`View ${event.title} event details`}
    >
      <div className={`absolute inset-0 blur-3xl -z-10 opacity-0 group-hover:opacity-100 ${
        isEventPast ? 'bg-gradient-to-r from-gray-200/20 via-gray-300/20 to-gray-400/20' :
        'bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-rose-600/20'
      }`} />
      
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
        
        {isEventPast && (
          <div className="absolute top-3 right-3">
            <Badge variant="past" />
          </div>
        )}
        
        {!isEventPast && soldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold text-white bg-gradient-to-r from-red-600 to-red-800">
              <Ticket className="w-5 h-5" />
              SOLD OUT
            </span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {event.trending && !isEventPast && <Badge variant="trending" />}
          {event.featured && !isEventPast && <Badge variant="featured" />}
          {event.isNew && !isEventPast && <Badge variant="new" />}
          {event.sponsored && !isEventPast && <Badge variant="sponsored" />}
        </div>
        
        {!isEventPast && !soldOut && isLowStock && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-600">
              🔥 {availableTickets} left
            </span>
          </div>
        )}
        
        {!isEventPast && !soldOut && availableTickets >= 9999 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600">
              ✓ Unlimited
            </span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      
      <div className="p-4 pb-6">
        <h3 className={`font-bold text-sm line-clamp-2 group-hover:text-purple-600 transition-colors duration-300 ${
          isEventPast ? 'text-gray-700' : 'text-gray-900'
        }`}>
          {event.title || "Untitled Event"}
        </h3>
        
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Calendar size={13} className={isEventPast ? "text-gray-500" : "text-purple-600"} />
            <span className={isEventPast ? "text-gray-600" : "text-gray-700"}>
              {formatDate(event.date)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={13} className={isEventPast ? "text-gray-500" : "text-purple-600"} />
            <span className={`font-semibold ${isEventPast ? "text-gray-600" : "text-gray-700"}`}>
              {formatEventTime(event.date, event.time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className={isEventPast ? "text-gray-500" : "text-purple-600"} />
            <span className={`truncate ${isEventPast ? "text-gray-600" : "text-gray-700"}`}>
              {event.location || "Location TBD"}
            </span>
          </div>
        </div>
        
        {isEventPast ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-transform mt-4 hover:shadow-gray-500/50 hover:scale-105"
            onClick={(e) => {
              e.stopPropagation();
              handleEventClick();
            }}
            aria-label={`View ${event.title} event details`}
          >
            <Eye className="w-5 h-5" />
            View Event Details
          </motion.button>
        ) : soldOut ? (
          <div className="w-full bg-gray-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-md mt-4 cursor-not-allowed">
            <Ticket size={24} />
            Sold Out
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-transform mt-4 hover:scale-105 ${
              isFree 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/50' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/50'
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

const EventSection = ({ title, events, isPast = false }: { title: string; events: Event[]; isPast?: boolean }) => {
  if (!events.length) return null;
  
  return (
    <section className="px-4 md:px-6 mb-20">
      <div className="flex items-center justify-center gap-3 mb-10 md:mb-14">
        {isPast && <History className="w-8 h-8 text-gray-500" />}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`text-3xl md:text-4xl font-black text-center ${isPast ? 'text-gray-700' : 'text-gray-900'}`}
        >
          {title}
        </motion.h2>
      </div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
      >
        {events.map((event, i) => (
          <motion.div key={`${event.id || i}-${i}`} variants={itemVariants}>
            <EventCard event={event} isPast={isPast} />
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
  resultsCount,
  showPast,
  setShowPast 
}: { 
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  resultsCount: number;
  showPast: boolean;
  setShowPast: (show: boolean) => void;
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

// --- Main Home Component ---
export default function Home() {
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastEvents, setShowPastEvents] = useState(false);
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

  // Filter events based on search and past events toggle
  const filteredEvents = useMemo(
    () => {
      const today = new Date().toISOString().split('T')[0];
      
      // First filter by search term
      const searched = eventsList.filter(
        e =>
          e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      // Then filter by date if not showing past events
      if (!showPastEvents) {
        return searched.filter(event => {
          const eventDateStr = event.date?.split('T')[0];
          return eventDateStr && eventDateStr >= today;
        });
      }
      
      return searched;
    },
    [eventsList, searchTerm, showPastEvents]
  );

  // Separate past events for special display
 const pastEvents = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return filteredEvents.filter(event => {
    if (!event.date) return false;
    
    try {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() < today.getTime();
    } catch {
      return false;
    }
  });
}, [filteredEvents]);

  // Future events (for regular sections)
const futureEvents = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  return filteredEvents.filter(event => {
    if (!event.date) return false;
    
    try {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0); // Start of event day
      
      return eventDate >= today;
    } catch {
      return false;
    }
  });
}, [filteredEvents]);

  // Filter sections
  const trendingEvents = useMemo(() => futureEvents.filter(e => e.trending), [futureEvents]);
  const featuredEvents = useMemo(() => futureEvents.filter(e => e.featured), [futureEvents]);
  const newEvents = useMemo(() => futureEvents.filter(e => e.isNew), [futureEvents]);
  const sponsoredEvents = useMemo(() => futureEvents.filter(e => e.sponsored), [futureEvents]);

  const handleNotificationClick = useCallback((event: Event) => {
    const path = event.slug ? `/event/${event.slug}` : `/event/${event.id}`;
    navigate(path);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    window.location.reload();
  }, []);

 // --- Loading State ---
   if (loading) {
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

  const hasEvents = eventsList.length > 0;
  const hasFutureEvents = futureEvents.length > 0;
  const hasPastEvents = pastEvents.length > 0;
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

      {/* Timeline - Only shows future events by default */}
      {hasFutureEvents && <TimelineSchedule events={futureEvents} showPast={showPastEvents} />}

      {/* Search Bar with Past Events Toggle */}
      <SearchBar 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        resultsCount={filteredEvents.length}
        showPast={showPastEvents}
        setShowPast={setShowPastEvents}
      />

      {/* Event Sections */}
      <div className="space-y-20 pb-28">
        {hasFutureEvents ? (
          <>
            {trendingEvents.length > 0 && <EventSection title="Trending Now" events={trendingEvents} />}
            {featuredEvents.length > 0 && <EventSection title="Featured Events" events={featuredEvents} />}
            {newEvents.length > 0 && <EventSection title="Fresh Drops" events={newEvents} />}
            {sponsoredEvents.length > 0 && <EventSection title="Sponsored Picks" events={sponsoredEvents} />}
          </>
        ) : !showPastEvents && !searchTerm ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No upcoming events</h3>
            <p className="text-gray-600 mb-8">Check back soon or create your own event!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/teaser"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200"
              >
                <Plus className="w-5 h-5" /> Create Event
              </Link>
              <button
                onClick={() => setShowPastEvents(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200"
              >
                <History className="w-5 h-5" /> View Past Events
              </button>
            </div>
          </div>
        ) : null}

        {/* Show Past Events Section if toggled */}
        {showPastEvents && hasPastEvents && (
          <EventSection 
            title="Past Events" 
            events={pastEvents} 
            isPast={true}
          />
        )}

        {!hasSearchResults && searchTerm && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No events found</h3>
            <p className="text-gray-600 mb-8">Try a different search term or browse all events</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200"
              >
                Clear Search
              </button>
              {hasPastEvents && !showPastEvents && (
                <button
                  onClick={() => setShowPastEvents(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform duration-200"
                >
                  <History className="w-5 h-5" /> Search Past Events
                </button>
              )}
            </div>
          </div>
        )}

        {hasSearchResults && !searchTerm && hasFutureEvents && !showPastEvents && (
          <EventSection 
            title="All Upcoming Events" 
            events={futureEvents.slice(0, 8)}
          />
        )}
      </div>
    </div>
  );
}