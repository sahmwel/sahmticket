// src/pages/organizer/CreateEvent.tsx - COMPLETE VERSION WITH FEE STRATEGY
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Upload, X, Plus, CheckCircle, AlertCircle,
  Calendar, MapPin, Image as ImageIcon, Menu,
  Tag, Globe, DollarSign, Users, Map, Navigation,
  CreditCard, Flag, ChevronDown, Currency,
  Music, Mic, Star, UserPlus, Trash2, Clock, Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Interfaces
interface Category {
  id: number;
  name: string;
}

interface TicketTier {
  id: string;
  name: string;
  price: string;
  description: string;
  quantity: string;
}

interface GuestArtiste {
  id: string;
  name: string;
  role: string;
  image_url: string;
  imageFile?: File | null;
  imagePreview?: string | null;
  bio: string;
  social_media: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
}

// Currency types
type CurrencyType = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR' | 'CAD';

// Fee Strategy type
type FeeStrategy = 'pass_to_attendees' | 'absorb_fees';

// Timezones for different countries
const TIMEZONES: Record<string, string> = {
  'Nigeria': 'WAT (UTC+1)',
  'United States': 'EST (UTC-5)',
  'United Kingdom': 'GMT (UTC+0)',
  'European Union': 'CET (UTC+1)',
  'Ghana': 'GMT (UTC+0)',
  'Kenya': 'EAT (UTC+3)',
  'South Africa': 'SAST (UTC+2)',
  'Canada': 'EST (UTC-5)'
};

// Exchange rates
const EXCHANGE_RATES: Record<CurrencyType, number> = {
  NGN: 1,
  USD: 1600,
  GBP: 2000,
  EUR: 1700,
  GHS: 100,
  KES: 12,
  ZAR: 85,
  CAD: 1200
};

const CURRENCY_INFO: Record<CurrencyType, { name: string; symbol: string; flag: string }> = {
  NGN: { name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  USD: { name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  GBP: { name: "British Pound", symbol: "£", flag: "🇬🇧" },
  EUR: { name: "Euro", symbol: "€", flag: "🇪🇺" },
  GHS: { name: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭" },
  KES: { name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  ZAR: { name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  CAD: { name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦" }
};

// COMPLETE CATEGORIES LIST - 50+ categories
const COMPLETE_CATEGORIES = [
  { id: 1, name: "🎵 Concerts & Live Music" },
  { id: 2, name: "🎪 Festivals" },
  { id: 3, name: "🕺 Parties & Nightlife" },
  { id: 4, name: "✨ Rave / EDM Parties" },
  { id: 5, name: "🏠 House Party" },
  { id: 6, name: "🤝 Networking Events" },
  { id: 7, name: "🎨 Workshop & Classes" },
  { id: 8, name: "💼 Conference & Seminars" },
  { id: 9, name: "⚽ Sports Events" },
  { id: 10, name: "🎭 Theatre & Performing Arts" },
  { id: 11, name: "🎉 Birthday Parties" },
  { id: 12, name: "💍 Weddings & Engagements" },
  { id: 13, name: "🏢 Corporate Events" },
  { id: 14, name: "❤️ Charity & Fundraisers" },
  { id: 15, name: "🍔 Food & Drink Tastings" },
  { id: 16, name: "🏖️ Beach Party" },
  { id: 17, name: "🏊 Pool Party" },
  { id: 19, name: "🎭 Themed Costume Party" },
  { id: 20, name: "🎤 Karaoke Night" },
  { id: 21, name: "👻 Halloween Party" },
  { id: 22, name: "🎄 Christmas Party" },
  { id: 23, name: "🎆 New Year's Eve Party" }
];

// Guest artiste roles
const GUEST_ROLES = [
  "Headliner",
  "Main Act",
  "Support Act",
  "Opening Act",
  "Guest Artiste",
  "Host",
  "DJ",
  "MC",
  "Comedian",
  "Speaker"
];

// Slug helpers
function baseSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function generateUniqueSlug(title: string): Promise<string> {
  if (!title?.trim()) return `event-${Date.now()}`;

  let slug = baseSlug(title);
  const maxAttempts = 6;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;

    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  // Fallback with random suffix
  const random = Math.random().toString(36).substring(2, 8);
  return `${slug}-${random}`;
}

// Geocoding function
async function geocodeAddress(address: string): Promise<{ lat: number | null; lng: number | null }> {
  if (!address.trim()) return { lat: null, lng: null };

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );

    if (!response.ok) {
      console.warn("Geocoding API error:", response.status);
      return { lat: null, lng: null };
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }

    return { lat: null, lng: null };
  } catch (error) {
    console.warn("Geocoding failed:", error);
    return { lat: null, lng: null };
  }
}

export default function CreateEvent() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [description, setDescription] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">(4);
  const [categories] = useState<Category[]>(COMPLETE_CATEGORIES);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    {
      id: "1",
      name: "General Admission",
      price: "0",
      description: "Standard admission to the event",
      quantity: "100"
    }
  ]);

  // Guest Artistes State
  const [guestArtistes, setGuestArtistes] = useState<GuestArtiste[]>([
    {
      id: "1",
      name: "",
      role: "Headliner",
      image_url: "",
      imageFile: null,
      imagePreview: null,
      bio: "",
      social_media: {}
    }
  ]);

  // Currency State
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('NGN');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // ===== NEW: Fee Strategy State =====
  const [feeStrategy, setFeeStrategy] = useState<FeeStrategy>('pass_to_attendees');

  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [sponsored, setSponsored] = useState(false);

  const [eventType, setEventType] = useState("physical");
  const [virtualLink, setVirtualLink] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Latitude and Longitude fields
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [geocoding, setGeocoding] = useState(false);
  const [manualCoordinates, setManualCoordinates] = useState(false);

  // Guest artiste drag & drop states
  const [guestDragActive, setGuestDragActive] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const navigate = useNavigate();

  // Get current timezone for selected country
  const currentTimezone = TIMEZONES[country] || 'WAT (UTC+1)';

  // Banner preview
  useEffect(() => {
    if (bannerFile) {
      const url = URL.createObjectURL(bannerFile);
      setBannerPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBannerPreview(null);
  }, [bannerFile]);

  // Geocode address
  useEffect(() => {
    if (address.trim() && !manualCoordinates) {
      const timeoutId = setTimeout(async () => {
        await geocodeAddressOnBlur();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [address, manualCoordinates]);

  // Update country based on currency
  useEffect(() => {
    const currencyToCountryMap: Record<CurrencyType, string> = {
      NGN: "Nigeria",
      USD: "United States",
      GBP: "United Kingdom",
      EUR: "European Union",
      GHS: "Ghana",
      KES: "Kenya",
      ZAR: "South Africa",
      CAD: "Canada"
    };

    if (currencyToCountryMap[selectedCurrency]) {
      setCountry(currencyToCountryMap[selectedCurrency]);
    }
  }, [selectedCurrency]);

  // Handle banner file
  const handleBannerChange = (file: File) => {
    if (file?.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image too large (max 5MB)");
        return;
      }
      setBannerFile(file);
      setError("");
    } else {
      setError("Please select a valid image file");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBannerChange(e.dataTransfer.files[0]);
    }
  };

  // Handle guest artiste image upload
  const handleGuestImageChange = (artisteId: string, file: File) => {
    if (!file?.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB)");
      return;
    }

    const url = URL.createObjectURL(file);

    setGuestArtistes(prev => prev.map(artiste => {
      if (artiste.id === artisteId) {
        // Clean up old preview URL
        if (artiste.imagePreview) {
          URL.revokeObjectURL(artiste.imagePreview);
        }
        return {
          ...artiste,
          imageFile: file,
          imagePreview: url
        };
      }
      return artiste;
    }));
  };

  const handleGuestDrop = (e: React.DragEvent<HTMLDivElement>, artisteId: string) => {
    e.preventDefault();
    setGuestDragActive(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleGuestImageChange(artisteId, e.dataTransfer.files[0]);
    }
  };

  // Ticket Tier Functions
  const addTicketTier = () => {
    setTicketTiers(prev => [...prev, {
      id: Date.now().toString(),
      name: "",
      price: "0",
      description: "",
      quantity: ""
    }]);
  };

  const removeTicketTier = (id: string) => {
    if (ticketTiers.length > 1) {
      setTicketTiers(prev => prev.filter(t => t.id !== id));
    }
  };

  const updateTier = (id: string, field: keyof Omit<TicketTier, "id">, value: string) => {
    setTicketTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // Guest Artiste Functions
  const addGuestArtiste = () => {
    setGuestArtistes(prev => [...prev, {
      id: Date.now().toString(),
      name: "",
      role: "Support Act",
      image_url: "",
      imageFile: null,
      imagePreview: null,
      bio: "",
      social_media: {}
    }]);
  };

  const removeGuestArtiste = (id: string) => {
    if (guestArtistes.length > 1) {
      setGuestArtistes(prev => {
        const artiste = prev.find(g => g.id === id);
        if (artiste?.imagePreview) {
          URL.revokeObjectURL(artiste.imagePreview);
        }
        return prev.filter(g => g.id !== id);
      });
    }
  };

  const updateGuestArtiste = (id: string, field: keyof GuestArtiste | `social_media.${string}`, value: string) => {
    setGuestArtistes(prev => prev.map(g => {
      if (g.id !== id) return g;

      if (field.startsWith('social_media.')) {
        const socialField = field.replace('social_media.', '') as keyof GuestArtiste['social_media'];
        return {
          ...g,
          social_media: {
            ...g.social_media,
            [socialField]: value
          }
        };
      }

      return { ...g, [field]: value };
    }));
  };

  // Tag Functions
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags(prev => [...prev, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // Geocode address function
  const geocodeAddressOnBlur = async () => {
    if (!address.trim() || manualCoordinates) return;

    setGeocoding(true);
    try {
      const { lat, lng } = await geocodeAddress(address);

      if (lat !== null && lng !== null) {
        setLatitude(lat.toString());
        setLongitude(lng.toString());
      } else {
        // Try with venue + city + country
        const fullAddress = `${venue}, ${city}, ${state}, ${country}`.trim();
        if (fullAddress !== ', , , ' && fullAddress !== address) {
          const { lat: lat2, lng: lng2 } = await geocodeAddress(fullAddress);
          if (lat2 !== null && lng2 !== null) {
            setLatitude(lat2.toString());
            setLongitude(lng2.toString());
          }
        }
      }
    } catch (err) {
      console.warn("Geocoding error:", err);
    } finally {
      setGeocoding(false);
    }
  };

  // Manual coordinate toggle
  const toggleManualCoordinates = () => {
    setManualCoordinates(!manualCoordinates);
    if (!manualCoordinates) {
      setLatitude("");
      setLongitude("");
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setManualCoordinates(true);
        setGeocoding(false);
      },
      (err) => {
        setError(`Unable to get location: ${err.message}`);
        setGeocoding(false);
      }
    );
  };

  // Format price with currency symbol
  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price) || 0;
    const symbol = CURRENCY_INFO[selectedCurrency].symbol;

    if (selectedCurrency === 'NGN') {
      return `${symbol}${numPrice.toLocaleString()}`;
    }
    return `${symbol}${numPrice.toFixed(2)}`;
  };

  // Upload guest artiste image to Supabase
  const uploadGuestImage = async (file: File, artisteName: string, userId: string): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `guest-artistes/${userId}/${Date.now()}-${artisteName.replace(/\s+/g, '-').toLowerCase()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-banners")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Failed to upload guest image:", uploadError);
        return null;
      }

      const { data } = supabase.storage.from("event-banners").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Guest image upload error:", err);
      return null;
    }
  };

  // Currency dropdown component
  const CurrencyDropdown = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{CURRENCY_INFO[selectedCurrency].flag}</span>
          <div className="text-left">
            <div className="font-medium">{selectedCurrency}</div>
            <div className="text-xs text-gray-400">{CURRENCY_INFO[selectedCurrency].name}</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showCurrencyDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyDropdown(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 max-h-60 overflow-y-auto">
              {Object.entries(CURRENCY_INFO).map(([currency, info]) => (
                <button
                  key={currency}
                  type="button"
                  onClick={() => {
                    setSelectedCurrency(currency as CurrencyType);
                    setShowCurrencyDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition ${selectedCurrency === currency ? 'bg-purple-500/20 text-purple-300' : 'text-white'}`}
                >
                  <span className="text-xl">{info.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{currency}</div>
                    <div className="text-xs text-gray-400">{info.name}</div>
                  </div>
                  {selectedCurrency === currency && (
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Handle create event - FIXED VERSION WITH FEE STRATEGY
const handleCreateEvent = async () => {
  setError("");
  setSuccess(false);

  // Basic validation
  if (!title.trim() || !date || !venue.trim() || !categoryId) {
    setError("Title, Date, Venue, and Category are required");
    return;
  }

  // Check ticket tiers
  const invalidTier = ticketTiers.find(t => !t.name.trim() || !t.quantity.trim());
  if (invalidTier) {
    setError("All ticket tiers must have a name and quantity");
    return;
  }

  // Validate guest artistes
  const invalidArtiste = guestArtistes.find(g => !g.name.trim());
  if (invalidArtiste) {
    setError("All guest artistes must have a name");
    return;
  }

  // Validate coordinates
  let latNum = null;
  let lngNum = null;

  if (latitude.trim() || longitude.trim()) {
    latNum = parseFloat(latitude);
    lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setError("Invalid latitude/longitude values");
      return;
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setError("Invalid coordinate values");
      return;
    }
  }

  setLoading(true);

  try {
    console.log("=== STARTING EVENT CREATION ===");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error("Please log in to create events");
    }

    const userId = session.user.id;
    console.log("User ID:", userId);
    console.log("Selected Currency:", selectedCurrency);
    console.log("Fee Strategy:", feeStrategy);

    // Upload banner
    let banner_url: string | null = null;
    if (bannerFile) {
      console.log("Uploading banner...");
      const ext = bannerFile.name.split(".").pop() || "jpg";
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-banners")
        .upload(fileName, bannerFile);

      if (!uploadError) {
        const { data } = supabase.storage.from("event-banners").getPublicUrl(fileName);
        banner_url = data.publicUrl;
        console.log("✅ Banner uploaded:", banner_url);
      } else {
        console.warn("⚠️ Banner upload failed:", uploadError);
      }
    }

    // Generate unique slug
    console.log("Generating unique slug...");
    const uniqueSlug = await generateUniqueSlug(title.trim());
    console.log("✅ Generated slug:", uniqueSlug);

    // Upload guest artiste images
    const artistesWithImages = [...guestArtistes];
    for (const artiste of artistesWithImages) {
      if (artiste.imageFile) {
        console.log(`Uploading image for ${artiste.name}...`);
        const imageUrl = await uploadGuestImage(artiste.imageFile, artiste.name, userId);
        if (imageUrl) {
          artiste.image_url = imageUrl;
          console.log(`✅ Image uploaded for ${artiste.name}:`, imageUrl);
        }
      }
    }

    // Convert ticket prices to NGN
    const tiersToInsert = ticketTiers.map(tier => {
      const priceInSelectedCurrency = parseFloat(tier.price) || 0;
      let priceInNGN = priceInSelectedCurrency;

      if (selectedCurrency !== 'NGN') {
        priceInNGN = priceInSelectedCurrency * EXCHANGE_RATES[selectedCurrency];
      }

      const quantity = parseInt(tier.quantity) || 100;

      return {
        event_id: "", // placeholder, will be replaced after event creation
        tier_name: tier.name.trim(),
        description: tier.description.trim() || `${tier.name} ticket`,
        price: priceInNGN,
        original_currency: selectedCurrency,
        original_price: priceInSelectedCurrency,
        quantity_total: quantity,
        quantity_sold: 0,
        is_active: true
      };
    });

    // Prepare ticket tiers for events.ticketTiers JSON column
    const ticketTiersForEventsColumn = tiersToInsert.map(tier => ({
      id: `${Date.now()}-${tier.tier_name.toLowerCase().replace(/\s+/g, '-')}`,
      name: tier.tier_name,
      price: tier.price,
      original_price: tier.original_price,
      original_currency: tier.original_currency,
      description: tier.description,
      quantity_available: tier.quantity_total,
      quantity_sold: 0,
      is_active: true
    }));

    // Build event data - set as DRAFT first
    const eventPayload = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      date: `${date}T${time}:00`,
      time: time || "00:00",
      venue: venue.trim(),
      location: venue.trim(),
      city: city.trim() || null,
      state: state.trim() || null,
      country: country.trim() || "Nigeria",
      image: banner_url,
      cover_image: banner_url,
      featured: false,
      trending: false,
      isnew: false,
      sponsored: false,
      status: "draft",
      organizer_id: userId,
      slug: uniqueSlug,
      tags: tags.length > 0 ? tags : null,
      lat: latNum,
      lng: lngNum,
      event_type: eventType || "physical",
      virtual_link: eventType === "virtual" ? virtualLink.trim() : null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      published_at: null,
      fee_strategy: feeStrategy,
      base_currency: selectedCurrency,
      exchange_rates: EXCHANGE_RATES,
      timezone: currentTimezone,
      ticketTiers: ticketTiersForEventsColumn,
      updated_at: new Date().toISOString()
    };

    console.log("📦 Event payload (draft):", JSON.stringify(eventPayload, null, 2));

    // Create event as DRAFT with ticketTiers included
    console.log("🚀 Creating event as DRAFT...");
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert(eventPayload)
      .select("id, title, slug, status, base_currency, fee_strategy")
      .single();

    if (eventError) {
      console.error("❌ Event creation error:", eventError);
      throw eventError;
    }

    if (!event?.id) throw new Error("Failed to create event - no ID returned");

    console.log("✅ Draft event created successfully:", event);
    console.log("✅ Fee strategy saved:", event.fee_strategy);

  // ============ 🎫 INSERT TICKET TIERS INTO ticketTiers TABLE ============
if (tiersToInsert.length > 0) {
  // ✅ Only include columns that ACTUALLY EXIST in your ticketTiers table
  const tiersWithEventId = tiersToInsert.map(tier => ({
    event_id: event.id,
    tier_name: tier.tier_name,
    description: tier.description,
    price: tier.price,
    quantity_total: tier.quantity_total,
    quantity_sold: 0,              // always start at 0
    is_active: true,
    created_at: new Date().toISOString()
    // ❌ REMOVED: original_currency, original_price – they DO NOT EXIST in your table
    // ❌ REMOVED: event_id placeholder, id, etc.
  }));

  const { error: tiersError } = await supabase
    .from("ticketTiers")
    .insert(tiersWithEventId);

  if (tiersError) {
    console.error("❌ Failed to insert ticket tiers:", tiersError);
    setError(`Event created, but ticket tiers could not be saved: ${tiersError.message}`);
  } else {
    console.log(`✅ Inserted ${tiersWithEventId.length} ticket tiers into ticketTiers table`);
  }
}
// =======================================================================

    // Create guest artistes
    const artistesToInsert = artistesWithImages
      .filter(artiste => artiste.name.trim())
      .map(artiste => ({
        event_id: event.id,
        name: artiste.name.trim(),
        role: artiste.role,
        image_url: artiste.image_url.trim() || null,
        bio: artiste.bio.trim() || null,
        social_media: artiste.social_media || {},
        created_at: new Date().toISOString()
      }));

    if (artistesToInsert.length > 0) {
      const { data: insertedArtistes, error: artistesError } = await supabase
        .from("guest_artistes")
        .insert(artistesToInsert)
        .select();

      if (artistesError) {
        console.error("❌ Failed to create guest artistes:", artistesError);
      } else {
        console.log(`✅ Created ${artistesToInsert.length} guest artistes`);
      }
    }

    // Ask user if they want to publish
    const shouldPublish = window.confirm(
      "Draft event created successfully!\n\n" +
      `Base Currency: ${selectedCurrency} (${CURRENCY_INFO[selectedCurrency].name})\n` +
      `Fee Strategy: ${feeStrategy === 'pass_to_attendees' ? 'Buyers pay fees' : 'Organizer pays fees'}\n` +
      `Timezone: ${currentTimezone}\n` +
      `Guest Artistes: ${artistesToInsert.length}\n\n` +
      "Would you like to publish it now?\n\n" +
      "Click OK to publish immediately.\n" +
      "Click Cancel to keep as draft and edit later."
    );

    if (shouldPublish) {
      console.log("📢 Publishing draft event...");

      const publishData = {
        status: "published",
        published_at: new Date().toISOString(),
        featured: featured || false,
        trending: trending || false,
        isnew: isNew || false,
        sponsored: sponsored || false,
        updated_at: new Date().toISOString()
      };

      const { error: publishError } = await supabase
        .from("events")
        .update(publishData)
        .eq("id", event.id);

      if (publishError) {
        console.error("❌ Failed to publish event:", publishError);
        setError(`Event saved as draft, but couldn't be published: ${publishError.message}`);
      } else {
        console.log("✅ Event published successfully!");
      }
    } else {
      console.log("📝 Keeping event as draft");
    }

    setSuccess(true);

    // Navigate to organizer dashboard
    setTimeout(() => {
      navigate("/organizer/dashboard");
    }, 1500);

  } catch (err: any) {
    console.error("💥 ERROR in event creation:", err);

    let userMessage = err.message || "Failed to create event. Please try again.";

    if (err.code) {
      switch (err.code) {
        case "23505":
          userMessage = "An event with similar title already exists. Try changing the title slightly.";
          break;
        case "42501":
          userMessage = "Permission denied. Please make sure you have organizer permissions.";
          break;
        case "42703":
          userMessage = "Database column error. Please contact support.";
          break;
        case "42P01":
          userMessage = "Database table not found. Please contact support.";
          break;
        case "22P02":
          userMessage = "Invalid data format. Please check your input values.";
          break;
        case "23502":
          userMessage = "Missing required field. Please fill all required fields.";
          break;
        case "23514":
          userMessage = "Data validation failed. Please check your input values.";
          break;
        case "22007":
          userMessage = "Invalid date/time format. Please check your date and time values.";
          break;
      }
    }

    setError(userMessage);

  } finally {
    setLoading(false);
    console.log("=== EVENT CREATION PROCESS ENDED ===");
  }
};

  return (
    <div className="flex min-h-screen bg-gray-950">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-6xl mx-auto">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Create New Event</h1>
              <p className="text-gray-400 text-sm sm:text-base">Fill in the details to launch your event</p>
            </div>

            {success && (
              <div className="mb-6 p-4 sm:p-6 bg-green-500/20 border border-green-500/50 rounded-xl md:rounded-2xl flex items-start sm:items-center gap-3 sm:gap-4 text-green-300">
                <CheckCircle size={24} className="flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm sm:text-base">Event Created Successfully!</p>
                  <p className="text-xs sm:text-sm">Redirecting to dashboard...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 sm:p-6 bg-red-500/20 border border-red-500/50 rounded-xl md:rounded-2xl flex items-start sm:items-center gap-3 sm:gap-4 text-red-300">
                <AlertCircle size={24} className="flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm sm:text-base">Error</p>
                  <p className="text-xs sm:text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Left Column - Banner & Basic Info */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                {/* Currency Selection */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 sm:mb-4 block flex items-center gap-2">
                    <Currency size={20} /> Base Currency *
                  </label>
                  <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                    Select the currency for your ticket prices.
                  </p>
                  <CurrencyDropdown />

                  {/* Exchange rate info */}
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-300 font-medium mb-1">Exchange Rates:</p>
                    <div className="text-xs text-purple-300/80">
                      <p>1 {selectedCurrency} = ₦{EXCHANGE_RATES[selectedCurrency].toLocaleString()} NGN</p>
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 block">Event Banner *</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 text-center transition-all ${
                      dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleBannerChange(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {bannerPreview ? (
                      <div className="relative">
                        <img
                          src={bannerPreview}
                          alt="Preview"
                          className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg md:rounded-xl"
                        />
                        <button
                          onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-1.5 sm:p-2 rounded-full transition"
                        >
                          <X size={16} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4 py-4 sm:py-6 md:py-8">
                        <ImageIcon size={40} className="mx-auto text-gray-500 sm:w-12 sm:h-12" />
                        <p className="text-white font-medium text-sm sm:text-base">Drop image or click to upload</p>
                        <p className="text-gray-500 text-xs sm:text-sm">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Type */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 sm:mb-4 block">Event Type</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setEventType("physical")}
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-center transition text-sm sm:text-base ${
                        eventType === "physical" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      Physical
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType("virtual")}
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-center transition text-sm sm:text-base ${
                        eventType === "virtual" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      Virtual
                    </button>
                  </div>

                  {eventType === "virtual" && (
                    <div className="mt-3 sm:mt-4">
                      <label className="text-white font-medium mb-2 block text-sm sm:text-base">Virtual Link *</label>
                      <input
                        type="url"
                        value={virtualLink}
                        onChange={(e) => setVirtualLink(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm sm:text-base"
                      />
                    </div>
                  )}
                </div>

                {/* Event Flags */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 sm:mb-4 block">Event Features</label>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="flex items-center justify-between text-white text-sm sm:text-base">
                      <span>Featured Event</span>
                      <input
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => setFeatured(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white text-sm sm:text-base">
                      <span>Trending</span>
                      <input
                        type="checkbox"
                        checked={trending}
                        onChange={(e) => setTrending(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white text-sm sm:text-base">
                      <span>New Event</span>
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={(e) => setIsNew(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white text-sm sm:text-base">
                      <span>Sponsored</span>
                      <input
                        type="checkbox"
                        checked={sponsored}
                        onChange={(e) => setSponsored(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 accent-purple-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column - Main Form */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Basic Information</h2>
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="text-white font-medium mb-2 block text-sm sm:text-base">Event Title *</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Afro Nation 2025"
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 text-sm sm:text-base"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm sm:text-base">
                          <Calendar size={16} /> Date *
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base"
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm sm:text-base">
                          <Clock size={16} /> Time ({currentTimezone}) *
                        </label>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base"
                          required
                        />
                        <p className="text-gray-500 text-xs mt-1">Timezone: {currentTimezone}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block text-sm sm:text-base">
                        <Tag size={16} className="inline mr-2" />
                        Category *
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-800/80 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-purple-500/60 text-sm sm:text-base"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>

                      {(categoryId === 4 || categoryId === 16) && (
                        <p className="text-purple-300 text-xs sm:text-sm mt-1 flex items-center gap-1">
                          <Star size={12} /> Great choice! {categoryId === 4 ? 'Rave parties' : 'Beach parties'} are trending!
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm sm:text-base">
                        <MapPin size={16} /> Venue *
                      </label>
                      <input
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="e.g., Eko Hotel & Suites, Lagos"
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-500 text-sm sm:text-base"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block text-xs sm:text-sm">City</label>
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Kaduna"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block text-xs sm:text-sm">State</label>
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="Kaduna State"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block text-xs sm:text-sm">Country</label>
                        <input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                          disabled
                        />
                        <p className="text-gray-500 text-xs mt-1">Auto-set from currency</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block text-sm sm:text-base">Full Address</label>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onBlur={geocodeAddressOnBlur}
                        placeholder="Plot 1415, Ahmadu Bello Way, Victoria Island"
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-500 text-sm sm:text-base"
                      />
                      <p className="text-gray-500 text-xs sm:text-sm mt-1">
                        {geocoding ? "Finding coordinates..." : "Address will be used to get coordinates"}
                      </p>
                    </div>

                    {/* Coordinates Section */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                        <label className="text-white font-medium flex items-center gap-2 text-sm sm:text-base">
                          <Map size={16} /> Coordinates (Optional)
                        </label>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={getCurrentLocation}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-xs sm:text-sm transition"
                            disabled={geocoding}
                          >
                            <Navigation size={12} />
                            Use My Location
                          </button>
                          <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                            <input
                              type="checkbox"
                              checked={manualCoordinates}
                              onChange={toggleManualCoordinates}
                              className="w-3 h-3 sm:w-4 sm:h-4 accent-purple-500"
                            />
                            Manual Entry
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="text-gray-300 text-xs sm:text-sm mb-1 block">Latitude</label>
                          <input
                            type="number"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            step="0.000001"
                            min="-90"
                            max="90"
                            placeholder="e.g., 6.5244"
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/10 rounded-lg text-white text-sm"
                            disabled={!manualCoordinates}
                          />
                        </div>
                        <div>
                          <label className="text-gray-300 text-xs sm:text-sm mb-1 block">Longitude</label>
                          <input
                            type="number"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            step="0.000001"
                            min="-180"
                            max="180"
                            placeholder="e.g., 3.3792"
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/10 rounded-lg text-white text-sm"
                            disabled={!manualCoordinates}
                          />
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs sm:text-sm mt-2">
                        {manualCoordinates
                          ? "Enter coordinates manually (e.g., Lagos: 6.5244, 3.3792)"
                          : "Coordinates will be auto-generated from address"}
                      </p>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block text-sm sm:text-base">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Tell attendees what to expect at your event..."
                        className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-500 resize-none text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Guest Artistes Section */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">Guest Artistes</h2>
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">Add performers, speakers, or special guests</p>
                    </div>
                    <button
                      onClick={addGuestArtiste}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition text-sm sm:text-base"
                    >
                      <UserPlus size={18} /> Add Artiste
                    </button>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {guestArtistes.map((artiste) => (
                      <div key={artiste.id} className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 relative">
                        {guestArtistes.length > 1 && (
                          <button
                            onClick={() => removeGuestArtiste(artiste.id)}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-red-400 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                              <label className="text-white font-medium mb-2 block text-sm sm:text-base">Name *</label>
                              <input
                                value={artiste.name}
                                onChange={(e) => updateGuestArtiste(artiste.id, "name", e.target.value)}
                                placeholder="e.g., Burna Boy, Wizkid"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm sm:text-base"
                              />
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block text-sm sm:text-base">Role</label>
                              <select
                                value={artiste.role}
                                onChange={(e) => updateGuestArtiste(artiste.id, "role", e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800 rounded-lg text-white text-sm sm:text-base border border-white/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              >
                                {GUEST_ROLES.map(role => (
                                  <option 
                                    key={role} 
                                    value={role}
                                    className="bg-gray-800 text-white py-2"
                                  >
                                    {role}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Guest Image Upload */}
                          <div>
                            <label className="text-white font-medium mb-2 block text-sm sm:text-base">Profile Image</label>
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setGuestDragActive(artiste.id);
                              }}
                              onDragLeave={() => setGuestDragActive(null)}
                              onDrop={(e) => handleGuestDrop(e, artiste.id)}
                              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                                guestDragActive === artiste.id ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50"
                              }`}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleGuestImageChange(artiste.id, e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              {artiste.imagePreview ? (
                                <div className="relative">
                                  <img
                                    src={artiste.imagePreview}
                                    alt="Preview"
                                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg mx-auto"
                                  />
                                  <button
                                    onClick={() => {
                                      setGuestArtistes(prev => prev.map(a => {
                                        if (a.id === artiste.id) {
                                          if (a.imagePreview) URL.revokeObjectURL(a.imagePreview);
                                          return { ...a, imageFile: null, imagePreview: null };
                                        }
                                        return a;
                                      }));
                                    }}
                                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 p-1 rounded-full transition"
                                  >
                                    <X size={14} className="text-white" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2 py-2">
                                  <ImageIcon size={32} className="mx-auto text-gray-500" />
                                  <p className="text-white font-medium text-sm">Drop image or click to upload</p>
                                  <p className="text-gray-500 text-xs">PNG, JPG up to 5MB</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-white font-medium mb-2 block text-sm sm:text-base">Bio</label>
                            <textarea
                              value={artiste.bio}
                              onChange={(e) => updateGuestArtiste(artiste.id, "bio", e.target.value)}
                              rows={2}
                              placeholder="Short description about the artiste..."
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 resize-none text-sm sm:text-base"
                            />
                          </div>

                          {/* Social Media */}
                          <div className="bg-white/5 rounded-lg p-3 sm:p-4">
                            <label className="text-white font-medium mb-2 sm:mb-3 block text-sm sm:text-base">Social Media Links</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                              <div>
                                <label className="text-gray-300 text-xs mb-1 block">Instagram</label>
                                <input
                                  type="url"
                                  value={artiste.social_media.instagram || ""}
                                  onChange={(e) => updateGuestArtiste(artiste.id, "social_media.instagram", e.target.value)}
                                  placeholder="https://instagram.com/"
                                  className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-gray-300 text-xs mb-1 block">Twitter/X</label>
                                <input
                                  type="url"
                                  value={artiste.social_media.twitter || ""}
                                  onChange={(e) => updateGuestArtiste(artiste.id, "social_media.twitter", e.target.value)}
                                  placeholder="https://twitter.com/"
                                  className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-gray-300 text-xs mb-1 block">YouTube</label>
                                <input
                                  type="url"
                                  value={artiste.social_media.youtube || ""}
                                  onChange={(e) => updateGuestArtiste(artiste.id, "social_media.youtube", e.target.value)}
                                  placeholder="https://youtube.com/"
                                  className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-gray-300 text-xs mb-1 block">Spotify</label>
                                <input
                                  type="url"
                                  value={artiste.social_media.spotify || ""}
                                  onChange={(e) => updateGuestArtiste(artiste.id, "social_media.spotify", e.target.value)}
                                  placeholder="https://open.spotify.com/"
                                  className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs sm:text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Tiers */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">Ticket Tiers</h2>
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        Prices in {selectedCurrency} ({CURRENCY_INFO[selectedCurrency].symbol})
                      </p>
                    </div>
                    <button
                      onClick={addTicketTier}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition text-sm sm:text-base"
                    >
                      <Plus size={18} /> Add Tier
                    </button>
                  </div>

                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-300">
                      💡 <span className="font-medium">Note:</span> Prices stored in NGN ({EXCHANGE_RATES[selectedCurrency].toLocaleString()} NGN per 1 {selectedCurrency})
                    </p>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {ticketTiers.map((tier) => (
                      <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 relative">
                        {ticketTiers.length > 1 && (
                          <button
                            onClick={() => removeTicketTier(tier.id)}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-red-400 transition"
                          >
                            <X size={18} />
                          </button>
                        )}

                        <div className="space-y-4">
                          <div>
                            <label className="text-white font-medium mb-2 block text-sm sm:text-base">Tier Name *</label>
                            <input
                              value={tier.name}
                              onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                              placeholder="e.g., VIP, Early Bird, General Admission"
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm sm:text-base"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                              <label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm sm:text-base">
                                <DollarSign size={14} /> Price ({selectedCurrency}) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={tier.price}
                                  onChange={(e) => updateTier(tier.id, "price", e.target.value)}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-3 sm:pl-10 sm:pr-4 py-2.5 sm:py-3 bg-white/10 rounded-lg text-white text-sm sm:text-base"
                                />
                                <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base">
                                  {CURRENCY_INFO[selectedCurrency].symbol}
                                </div>
                              </div>
                              {tier.price && tier.price !== "0" && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ≈ ₦{(parseFloat(tier.price) * EXCHANGE_RATES[selectedCurrency]).toLocaleString()} NGN
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm sm:text-base">
                                <Users size={14} /> Quantity *
                              </label>
                              <input
                                type="number"
                                value={tier.quantity}
                                onChange={(e) => updateTier(tier.id, "quantity", e.target.value)}
                                placeholder="100"
                                min="1"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 rounded-lg text-white text-sm sm:text-base"
                              />
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block text-sm sm:text-base">Description</label>
                              <input
                                value={tier.description}
                                onChange={(e) => updateTier(tier.id, "description", e.target.value)}
                                placeholder="What's included in this tier"
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm sm:text-base"
                              />
                            </div>
                          </div>

                          {/* Price summary */}
                          {tier.price && tier.price !== "0" && (
                            <div className="pt-3 border-t border-white/10">
                              <div className="flex justify-between text-xs sm:text-sm">
                                <span className="text-gray-400">Price Summary:</span>
                                <div className="text-right">
                                  <div className="text-white font-medium">{formatPrice(tier.price)} {selectedCurrency}</div>
                                  <div className="text-gray-500 text-xs">
                                    ≈ ₦{(parseFloat(tier.price) * EXCHANGE_RATES[selectedCurrency]).toLocaleString()} NGN
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ===== NEW: FEE SETTINGS SECTION ===== */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                    <Receipt size={20} /> Fee Settings
                  </h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Choose who pays the <span className="text-purple-400 font-medium">5% service fee</span>. 
                    VAT is always calculated at checkout based on the buyer's country and paid by the buyer.
                  </p>

                  <div className="space-y-3">
                    {/* Option 1: Pass to attendees (default) */}
                    <label className={`flex items-center justify-between p-4 bg-white/5 border rounded-xl transition cursor-pointer ${
                      feeStrategy === 'pass_to_attendees' 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-white/10 hover:bg-white/10'
                    }`}>
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="feeStrategy"
                          value="pass_to_attendees"
                          checked={feeStrategy === 'pass_to_attendees'}
                          onChange={(e) => setFeeStrategy('pass_to_attendees')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-white/20 bg-white/10"
                        />
                        <div>
                          <p className="text-white font-medium">Pass fees to attendees</p>
                          <p className="text-gray-400 text-sm">Buyers pay ticket price + 5% service fee + VAT</p>
                        </div>
                      </div>
                      {feeStrategy === 'pass_to_attendees' && (
                        <span className="text-purple-400 text-xs sm:text-sm font-medium bg-purple-500/20 px-3 py-1 rounded-full">
                          Recommended
                        </span>
                      )}
                    </label>

                    {/* Option 2: Organizer absorbs fees */}
                    <label className={`flex items-center p-4 bg-white/5 border rounded-xl transition cursor-pointer ${
                      feeStrategy === 'absorb_fees' 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-white/10 hover:bg-white/10'
                    }`}>
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="feeStrategy"
                          value="absorb_fees"
                          checked={feeStrategy === 'absorb_fees'}
                          onChange={(e) => setFeeStrategy('absorb_fees')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-white/20 bg-white/10"
                        />
                        <div>
                          <p className="text-white font-medium">I'll pay the fees myself</p>
                          <p className="text-gray-400 text-sm">Organizer absorbs 5% service fee, buyers only pay ticket price + VAT</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-300">
                      <span className="font-medium">💡 Note:</span> VAT is calculated in real-time at checkout based on the buyer's selected country and is always paid by the buyer. 
                      The service fee is a fixed 5% of the ticket price.
                    </p>
                  </div>
                </div>
                {/* ===== END OF FEE SETTINGS ===== */}

                {/* Tags & Contact */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Additional Details</h2>

                  <div className="space-y-4 sm:space-y-6">
                    {/* Tags */}
                    <div>
                      <label className="text-white font-medium mb-2 block text-sm sm:text-base">Tags</label>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs flex items-center gap-1.5"
                          >
                            #{tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-purple-400 hover:text-white"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          placeholder="Add tags (press Enter)"
                          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base"
                        />
                        <button
                          onClick={addTag}
                          className="px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm sm:text-base"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block text-sm sm:text-base">Contact Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="contact@example.com"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block text-sm sm:text-base">Contact Phone</label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleCreateEvent}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 sm:py-4 md:py-5 rounded-xl md:rounded-2xl shadow-2xl transition transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 text-sm sm:text-base">
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Event...
                    </span>
                  ) : (
                    `Create Event (${selectedCurrency})`
                  )}
                </button>

                <p className="text-gray-500 text-xs sm:text-sm text-center">
                  * Required fields | Base Currency: {selectedCurrency} ({CURRENCY_INFO[selectedCurrency].symbol}) | Timezone: {currentTimezone}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}