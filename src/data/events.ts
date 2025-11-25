// src/data/events.ts
export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  address?: string;
  price: string;
  category: string;
  state?: string;
  image: string;
  description?: string;
  featured?: boolean;
  trending?: boolean;
  isNew?: boolean;
  sponsored?: boolean;
  lat?: number;
  lng?: number;
  venue?: string;
  ticketTiers?: { name: string; price: string; description: string; available?: boolean }[];
}

export const events: Event[] = [
  // -------------------------------
  // Events used on HOME + DETAILS
  // -------------------------------

  {
    id: "afrobeats-night-lagos",
    title: "Afrobeats Night — Lagos",
    date: "2025-11-20",
    time: "8:00 PM",
    location: "Eko Atlantic Beach",
    address: "Victoria Island, Lagos",
    price: "₦15,000",
    category: "Concerts",
    state: "Lagos",
    image: "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=800",
    description: "Burna Boy, Wizkid, Davido — live under the stars!",
    featured: true,
    trending: true,
    lat: 6.4241,
    lng: 3.4379,
    venue: "Eko Atlantic Beach",
  },

  {
    id: "comedy-explosion-abuja",
    title: "Comedy Explosion — Abuja",
    date: "2025-11-20",
    time: "7:00 PM",
    location: "Transcorp Hilton",
    address: "Maitama, Abuja",
    price: "₦8,000",
    category: "Comedy",
    state: "FCT",
    sponsored: true,
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800",
    description: "The funniest comedians in Nigeria on one stage!",
    lat: 9.0765,
    lng: 7.3986,
    venue: "Transcorp Hilton",
  },

  {
    id: "lagos-art-culture-fest",
    title: "Lagos Art & Culture Fest",
    date: "2025-11-22",
    location: "Freedom Park",
    address: "Broad Street, Lagos Island",
    price: "₦3,000",
    category: "Exhibitions",
    state: "Lagos",
    isNew: true,
    image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800",
    description: "A celebration of Lagos arts, paintings, sculpture and culture."
  },

  {
    id: "jazz-under-the-stars",
    title: "Jazz Under the Stars",
    date: "2025-11-25",
    time: "9:00 PM",
    location: "Terra Kulture",
    address: "Victoria Island, Lagos",
    price: "₦20,000",
    category: "Concerts",
    state: "Lagos",
    trending: true,
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53a029?w=800",
    description: "Smooth jazz vibes with Nigeria’s best live instrumentalists.",
  },

  // -----------------------------------
  // Event ONLY in EventDetails originally
  // -----------------------------------
  {
    id: "love-in-the-boulevard-ibadan",
    title: "Love In The Boulevard",
    state: "Oyo",
    date: "2025-11-29",
    time: "6:00 PM",
    location: "The Patio Ibadan",
    address: "Basorun Road, Ibadan, Oyo State",
    price: "From ₦7,500",
    category: "Concerts",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
    description:
      "LITB offers an escape for romantics seeking soulful melodies over rave beats.",
    lat: 7.3775,
    lng: 3.9470,
    venue: "The Patio Ibadan",
    ticketTiers: [
      { name: "Regular Access", price: "₦7,500", description: "Admits 1 person", available: true },
      { name: "Queen & Slim", price: "₦13,500", description: "Admits 2 people", available: true },
      { name: "Table for 8", price: "₦525,000", description: "VIP Table + Premium Drinks", available: true },
      { name: "Table for 12", price: "₦1,050,000", description: "Ultra VIP + Bottle Service", available: false },
    ],
  },
];
