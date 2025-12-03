'use client';

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { events as eventsData, Event } from "../data/events";

const formatEventDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",  // Thursday
    day: "2-digit",   // 03
    month: "long",    // December
  }); // Thursday, 03 December


const formatEventTime = (isoOrTime?: string) => {
  if (!isoOrTime) return "";
  if (!isoOrTime.includes("T")) return isoOrTime;

  const d = new Date(isoOrTime);
  return d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }); // 8:00 pm
};



// Badge configuration
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

// Timeline Section
const TimelineSchedule = ({ events }: { events: Event[] }) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const next = new Date(today);
  next.setDate(today.getDate() + 2);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const eventsToday = events.filter(e => e.date.split("T")[0] === formatDate(today));
  const eventsTomorrow = events.filter(e => e.date.split("T")[0] === formatDate(tomorrow));
  const eventsNext = events.filter(e => e.date.split("T")[0] === formatDate(next));

  const renderEvents = (eventList: Event[], label: string) => {
    if (!eventList.length) return null;
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
            {formatEventDateShort(eventList[0].date)}

          </motion.p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {eventList.map((event, i) => (
              <motion.div
                key={`${event.id}-${i}`}
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{ scale: 1.03 }}
                className="group relative bg-white/12 backdrop-blur-xl rounded-3xl p-6 border border-white/10 overflow-hidden"
              >
                <Link to={`/event/${event.id}`} className="block">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-rose-600/20 blur-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ scale: 0.8 }}
                    whileHover={{ scale: 1.3 }}
                    transition={{ duration: 0.6 }}
                  />
                  <h3 className="text-xl md:text-2xl font-bold text-white line-clamp-2 mb-3 group-hover:text-pink-300 transition">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-2 text-pink-100 text-sm mb-6">
                    {event.time && (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {event.time}
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {event.location}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    Get Ticket • {event.ticketTiers[0]?.price ?? "N/A"}
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    );
  };

  return (
    <AnimatePresence>
      {renderEvents(eventsToday, "Today")}
      {renderEvents(eventsTomorrow, "Tomorrow")}
      {renderEvents(eventsNext, "Next")}
    </AnimatePresence>
  );
};


// EventCard and EventSection remain unchanged
const EventCard = ({ event }: { event: Event }) => (
  <motion.article
    layout
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -16, scale: 1.04 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100"
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-rose-600/20 blur-3xl -z-10 opacity-0 group-hover:opacity-100"
      initial={{ scale: 0.8 }}
      whileHover={{ scale: 1.3 }}
      transition={{ duration: 0.6 }}
    />
    <Link to={`/event/${event.id}`} className="block">
      <div className="relative aspect-[3/2] bg-gray-50 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {event.trending && <Badge variant="trending" />}
          {event.featured && <Badge variant="featured" />}
          {event.isNew && <Badge variant="new" />}
          {event.sponsored && <Badge variant="sponsored" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-4 pb-6">
        <h3 className="font-bold text-sm line-clamp-2 text-gray-900 group-hover:text-purple-600 transition-colors duration-300">
          {event.title}
        </h3>
      <div className="mt-3 space-y-2 text-xs text-gray-600">
  <div className="flex items-center gap-2">
    <Calendar size={13} className="text-purple-600" />
    <span>{formatEventDateShort(event.date)}</span>
  </div>
  <div className="flex items-center gap-2">
    <Clock size={13} className="text-purple-600" />
    <span className="font-semibold">
      {formatEventTime(event.date || event.time)}
    </span>
  </div>
  <div className="flex items-center gap-2">
    <MapPin size={13} className="text-purple-600" />
    <span className="truncate">{event.location}</span>
  </div>
</div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:shadow-purple-500/50 transition-transform"
        >
          <Ticket size={24} />
          Get Ticket • {event.ticketTiers[0]?.price ?? "N/A"}
        </motion.button>
      </div>
    </Link>
  </motion.article>
);

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const EventSection = ({ title, events }: { title: string; events: Event[] }) => {
  if (!events.length) return null;

  return (
    <section className="px-4 md:px-6">
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
          <motion.div key={`${event.id}-${i}`} variants={itemVariants}>
            <EventCard event={event} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

// Main Home Component
export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const eventsList: Event[] = eventsData;

  const filteredEvents = useMemo(() => {
    return eventsList.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [eventsList, searchTerm]);

  const trendingEvents = filteredEvents.filter((e: Event) => e.trending);
  const featuredEvents = filteredEvents.filter((e: Event) => e.featured);
  const newEvents = filteredEvents.filter((e: Event) => e.isNew);
  const sponsoredEvents = filteredEvents.filter((e: Event) => e.sponsored);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {/* Hero */}
      <section className="pt-28 pb-16 text-center px-5">
        <motion.h1
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight text-gray-900"
        >
          Discover Events
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            Across Nigeria
          </span>
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
            to="/create-event"
            className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-4 rounded-full shadow-xl hover:scale-105 transition"
          >
            <Plus className="w-6 h-6" /> Create Event
          </Link>
          <Link
            to="/events"
            className="bg-black text-white font-bold px-10 py-4 rounded-full shadow-xl hover:scale-105 transition"
          >
            Explore Events
          </Link>
          <Link
            to="/about"
            className="bg-transparent border-2 border-gray-800 text-gray-800 font-bold px-10 py-4 rounded-full hover:bg-gray-900 hover:text-white transition"
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
          <span className="flex items-center gap-2">
            <Car className="w-5 h-5 text-purple-600" /> Uber Rides
          </span>
          <span className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-pink-600" /> Live Map
          </span>
          <span className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-emerald-600" /> Verified Only
          </span>
        </motion.div>
      </section>

      {/* Timeline Section */}
      <TimelineSchedule events={eventsList} />

      {/* Search */}
      <div className="max-w-2xl mx-auto px-5 my-16">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
          <input
            type="text"
            placeholder="Search events, artists, venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white border border-gray-200 focus:border-purple-500 focus:outline-none shadow-lg text-base transition"
          />
        </div>
      </div>

      {/* Event Categories */}
      <div className="space-y-20 pb-28">
        <EventSection title="Trending Now" events={trendingEvents} />
        <EventSection title="Featured Events" events={featuredEvents} />
        <EventSection title="Fresh Drops" events={newEvents} />
        <EventSection title="Sponsored Picks" events={sponsoredEvents} />
      </div>
    </div>
  );
}
