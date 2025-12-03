// src/data/events.ts

export interface TicketTier {
  name: string;
  price: string;
  description: string;
  available?: boolean;
}

export interface Event {
  id: string;
  slug?: string;
  title: string;
  date: string;
  time?: string;
  price?: string;
  location: string;
  address?: string;
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
  ticketTiers: TicketTier[];
   coords?: [number, number]
}

// Fixed toISO function
function toISO(date: string, time?: string) {
  const [year, month, day] = date.split("-").map(Number);
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (!time) {
    return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00`).toISOString();
  }

  const [timePart, modifier] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier?.toUpperCase() === "PM" && hours < 12) hours += 12;
  if (modifier?.toUpperCase() === "AM" && hours === 12) hours = 0;

  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`
  ).toISOString();
}

export const events: Event[] = [
  {
    id: "afrobeats-night-lagos",
    title: "Afrobeats Night — Lagos",
    date: toISO("2025-12-3", "8:00 PM"),
    time: "8:00 PM",
    location: "Eko Atlantic Beach",
    address: "Victoria Island, Lagos",
    category: "Concerts",
    state: "Lagos",
    featured: true,
    trending: true,
    lat: 6.4241,
    lng: 3.4379,
    venue: "Eko Atlantic Beach",
    image:
      "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=800",
    description: "Burna Boy, Wizkid, Davido — live under the stars!",
    ticketTiers: [
      {
        name: "General Admission",
        price: "₦15,000",
        description: "Admits 1 person",
        available: true,
      },
      {
        name: "VIP Access",
        price: "₦50,000",
        description: "Premium view + VIP lounge",
        available: true,
      },
      {
        name: "Couple Ticket",
        price: "₦28,000",
        description: "Admits 2 people",
        available: true,
      },
    ],
  },
  {
    id: "comedy-explosion-abuja",
    title: "Comedy Explosion — Abuja",
    date: toISO("2025-12-4", "7:00 PM"),
    time: "7:00 PM",
    location: "Transcorp Hilton",
    address: "Maitama, Abuja",
    category: "Comedy",
    state: "FCT",
    sponsored: true,
    lat: 9.0765,
    lng: 7.3986,
    venue: "Transcorp Hilton",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800",
    description: "The funniest comedians in Nigeria on one stage!",
    ticketTiers: [
      {
        name: "Standard",
        price: "₦8,000",
        description: "Admits 1 person",
        available: true,
      },
      {
        name: "VIP",
        price: "₦20,000",
        description:
          "Front row seats + complimentary drinks",
        available: true,
      },
      {
        name: "Couple Pack",
        price: "₦15,000",
        description: "Admits 2 people",
        available: true,
      },
    ],
  },
  {
    id: "lagos-art-culture-fest",
    title: "Lagos Art & Culture Fest",
    date: toISO("2025-12-5"),
    time: "7:00 PM",
    location: "Freedom Park",
    address: "Broad Street, Lagos Island",
    category: "Exhibitions",
    state: "Lagos",
    isNew: true,
    lat: 6.4441,
    lng: 3.4011,
    venue: "Freedom Park",
    image:
      "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800",
    description:
      "A celebration of Lagos arts, paintings, sculpture and culture.",
    ticketTiers: [
      {
        name: "General Admission",
        price: "₦3,000",
        description: "Admits 1 person",
        available: true,
      },
      {
        name: "VIP Access",
        price: "₦8,000",
        description: "Priority access + guided tour",
        available: true,
      },
    ],
  },
  {
    id: "jazz-under-the-stars",
    title: "Jazz Under the Stars",
    date: toISO("2025-12-25", "9:00 PM"),
    time: "9:00 PM",
    location: "Terra Kulture",
    address: "Victoria Island, Lagos",
    category: "Concerts",
    state: "Lagos",
    trending: true,
    lat: 6.4368,
    lng: 3.4561,
    venue: "Terra Kulture",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53a029?w=800",
    description:
      "Smooth jazz vibes with Nigeria’s best live instrumentalists.",
    ticketTiers: [
      {
        name: "General Admission",
        price: "₦20,000",
        description: "Admits 1 person",
        available: true,
      },
      {
        name: "VIP Lounge",
        price: "₦45,000",
        description: "Premium view + drinks",
        available: true,
      },
      {
        name: "Couple Ticket",
        price: "₦38,000",
        description: "Admits 2 people",
        available: true,
      },
    ],
  },
  {
    id: "love-in-the-boulevard-ibadan",
    title: "Love In The Boulevard",
    date: toISO("2025-12-5", "6:00 PM"),
    time: "6:00 PM",
    location: "The Patio Ibadan",
    address: "Basorun Road, Ibadan, Oyo State",
    category: "Concerts",
    state: "Oyo",
    lat: 7.3775,
    lng: 3.9470,
    venue: "The Patio Ibadan",
    image:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
    description:
      "LITB offers an escape for romantics seeking soulful melodies over rave beats.",
    ticketTiers: [
      {
        name: "Regular Access",
        price: "₦7,500",
        description: "Admits 1 person",
        available: true,
      },
      {
        name: "Queen & Slim",
        price: "₦13,500",
        description: "Admits 2 people",
        available: true,
      },
      {
        name: "Table for 8",
        price: "₦525,000",
        description:
          "VIP Table + Premium Drinks",
        available: true,
      },
      {
        name: "Table for 12",
        price: "₦1,050,000",
        description:
          "Ultra VIP + Bottle Service",
        available: true,
      },
    ],
  },
];
