// src/pages/organizer/CreateEvent.tsx - UUID v4 for ticket tiers
import Sidebar from "../../components/Sidebar";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";   // ✅ Added for UUID generation
import {
  Upload, X, Plus, CheckCircle, AlertCircle,
  Calendar, MapPin, Image as ImageIcon, Menu,
  Tag, Globe, DollarSign, Users, Map, Navigation,
  CreditCard, Flag, ChevronDown, Currency,
  Music, Mic, Star, UserPlus, Trash2, Clock, Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Interfaces (unchanged)
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

type CurrencyType = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR' | 'CAD';
type FeeStrategy = 'pass_to_attendees' | 'absorb_fees';

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

const EXCHANGE_RATES: Record<CurrencyType, number> = {
  NGN: 1, USD: 1600, GBP: 2000, EUR: 1700, GHS: 70, KES: 12, ZAR: 85, CAD: 1200
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

const COMPLETE_CATEGORIES = [
  { id: 1, name: "🎵 Concerts & Live Music" }, { id: 2, name: "🎪 Festivals" },
  { id: 3, name: "🕺 Parties & Nightlife" }, { id: 4, name: "✨ Rave / EDM Parties" },
  { id: 5, name: "🏠 House Party" }, { id: 6, name: "🤝 Networking Events" },
  { id: 7, name: "🎨 Workshop & Classes" }, { id: 8, name: "💼 Conference & Seminars" },
  { id: 9, name: "⚽ Sports Events" }, { id: 10, name: "🎭 Theatre & Performing Arts" },
  { id: 11, name: "🎉 Birthday Parties" }, { id: 12, name: "💍 Weddings & Engagements" },
  { id: 13, name: "🏢 Corporate Events" }, { id: 14, name: "❤️ Charity & Fundraisers" },
  { id: 15, name: "🍔 Food & Drink Tastings" }, { id: 16, name: "🏖️ Beach Party" },
  { id: 17, name: "🏊 Pool Party" }, { id: 19, name: "🎭 Themed Costume Party" },
  { id: 20, name: "🎤 Karaoke Night" }, { id: 21, name: "👻 Halloween Party" },
  { id: 22, name: "🎄 Christmas Party" }, { id: 23, name: "🎆 New Year's Eve Party" }
];

const GUEST_ROLES = ["Headliner", "Main Act", "Support Act", "Opening Act", "Guest Artiste", "Host", "DJ", "MC", "Comedian", "Speaker"];

function baseSlug(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function generateUniqueSlug(title: string): Promise<string> {
  if (!title?.trim()) return `event-${Date.now()}`;
  let slug = baseSlug(title);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const { data } = await supabase.from('events').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${slug}-${Math.random().toString(36).substring(2, 8)}`;
}

async function geocodeAddress(address: string): Promise<{ lat: number | null; lng: number | null }> {
  if (!address.trim()) return { lat: null, lng: null };
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return { lat: null, lng: null };
  } catch { return { lat: null, lng: null }; }
}

export default function CreateEvent() {
  const navigate = useNavigate();
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
  // ✅ Use UUID for initial ticket tier
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([{ id: uuidv4(), name: "General Admission", price: "0", description: "Standard admission", quantity: "100" }]);
  const [guestArtistes, setGuestArtistes] = useState<GuestArtiste[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('NGN');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [feeStrategy, setFeeStrategy] = useState<FeeStrategy>('pass_to_attendees');
  const [organizerSubaccountCode, setOrganizerSubaccountCode] = useState("");
  const [organizerFlutterwaveSubaccount, setOrganizerFlutterwaveSubaccount] = useState("");
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
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [guestDragActiveId, setGuestDragActiveId] = useState<string | null>(null);

  const currentTimezone = TIMEZONES[country] || 'WAT (UTC+1)';

  // Cleanup banner preview on unmount
  useEffect(() => {
    if (bannerFile) {
      const url = URL.createObjectURL(bannerFile);
      setBannerPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBannerPreview(null);
  }, [bannerFile]);

  // Cleanup all guest artiste previews on component unmount
  useEffect(() => {
    return () => {
      guestArtistes.forEach(artiste => {
        if (artiste.imagePreview) URL.revokeObjectURL(artiste.imagePreview);
      });
    };
  }, []);

  // Geocode address when it changes (with debounce)
  useEffect(() => {
    if (address.trim() && !manualCoordinates) {
      const timeout = setTimeout(() => geocodeAddressOnBlur(), 1000);
      return () => clearTimeout(timeout);
    }
  }, [address, manualCoordinates]);

  // Update country based on currency
  useEffect(() => {
    const currencyToCountry: Record<CurrencyType, string> = {
      NGN: "Nigeria", USD: "United States", GBP: "United Kingdom", EUR: "European Union",
      GHS: "Ghana", KES: "Kenya", ZAR: "South Africa", CAD: "Canada"
    };
    setCountry(currencyToCountry[selectedCurrency]);
  }, [selectedCurrency]);

  const handleBannerChange = (file: File) => {
    if (!file.type.startsWith("image/")) return setError("Please select a valid image file");
    if (file.size > 5 * 1024 * 1024) return setError("Image too large (max 5MB)");
    setBannerFile(file);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleBannerChange(e.dataTransfer.files[0]);
  };

  const clearGuestImage = (artisteId: string) => {
    setGuestArtistes(prev => prev.map(a => {
      if (a.id === artisteId) {
        if (a.imagePreview) URL.revokeObjectURL(a.imagePreview);
        return { ...a, imageFile: null, imagePreview: null, image_url: "" };
      }
      return a;
    }));
  };

  const handleGuestImageChange = (artisteId: string, file: File) => {
    if (!file.type.startsWith("image/")) return setError("Please select a valid image file");
    if (file.size > 5 * 1024 * 1024) return setError("Image too large (max 5MB)");
    const url = URL.createObjectURL(file);
    setGuestArtistes(prev => prev.map(a => {
      if (a.id === artisteId) {
        if (a.imagePreview) URL.revokeObjectURL(a.imagePreview);
        return { ...a, imageFile: file, imagePreview: url, image_url: "" };
      }
      return a;
    }));
  };

  // ✅ Add ticket tier with UUID
  const addTicketTier = () => setTicketTiers(prev => [...prev, { id: uuidv4(), name: "", price: "0", description: "", quantity: "" }]);
  const removeTicketTier = (id: string) => { if (ticketTiers.length > 1) setTicketTiers(prev => prev.filter(t => t.id !== id)); };
  const updateTier = (id: string, field: keyof Omit<TicketTier, "id">, value: string) => setTicketTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));

  const addGuestArtiste = () => setGuestArtistes(prev => [...prev, { id: Date.now().toString(), name: "", role: "Support Act", image_url: "", imageFile: null, imagePreview: null, bio: "", social_media: {} }]);
  const removeGuestArtiste = (id: string) => {
    const artiste = guestArtistes.find(g => g.id === id);
    if (artiste?.imagePreview) URL.revokeObjectURL(artiste.imagePreview);
    setGuestArtistes(prev => prev.filter(g => g.id !== id));
  };
  const updateGuestArtiste = (id: string, field: keyof GuestArtiste | `social_media.${string}`, value: string) => {
    setGuestArtistes(prev => prev.map(g => {
      if (g.id !== id) return g;
      if (field.startsWith('social_media.')) {
        const socialField = field.replace('social_media.', '') as keyof GuestArtiste['social_media'];
        return { ...g, social_media: { ...g.social_media, [socialField]: value } };
      }
      return { ...g, [field]: value };
    }));
  };

  const addTag = (e?: React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags(prev => [...prev, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };
  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const geocodeAddressOnBlur = async () => {
    if (!address.trim() || manualCoordinates) return;
    setGeocoding(true);
    try {
      const { lat, lng } = await geocodeAddress(address);
      if (lat !== null && lng !== null) {
        setLatitude(lat.toString());
        setLongitude(lng.toString());
      } else {
        const full = `${venue}, ${city}, ${state}, ${country}`.trim();
        if (full !== ', , , ' && full !== address) {
          const { lat: lat2, lng: lng2 } = await geocodeAddress(full);
          if (lat2 && lng2) { setLatitude(lat2.toString()); setLongitude(lng2.toString()); }
        }
      }
    } catch (err) { console.warn(err); } finally { setGeocoding(false); }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return setError("Geolocation not supported");
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(pos.coords.latitude.toString()); setLongitude(pos.coords.longitude.toString()); setManualCoordinates(true); setGeocoding(false); },
      (err) => { setError(`Location error: ${err.message}`); setGeocoding(false); }
    );
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price) || 0;
    const symbol = CURRENCY_INFO[selectedCurrency].symbol;
    return selectedCurrency === 'NGN' ? `${symbol}${num.toLocaleString()}` : `${symbol}${num.toFixed(2)}`;
  };

  const uploadGuestImage = async (file: File, artisteName: string, userId: string): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `guest-artistes/${userId}/${Date.now()}-${artisteName.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      const { error } = await supabase.storage.from("event-banners").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("event-banners").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) { console.error("Guest image upload error:", err); return null; }
  };

  const handleCreateEvent = async () => {
    setError("");
    setSuccess(false);
    if (!title.trim() || !date || !venue.trim() || !categoryId) {
      return setError("Title, Date, Venue, and Category are required");
    }
    if (eventType === "virtual" && virtualLink.trim() && !virtualLink.trim().match(/^https?:\/\/.+/)) {
      return setError("Please enter a valid virtual event URL (starting with http:// or https://)");
    }
    const invalidTier = ticketTiers.find(t => !t.name.trim() || !t.quantity.trim() || parseInt(t.quantity) <= 0);
    if (invalidTier) return setError("All ticket tiers must have a name and a quantity greater than 0");

    let latNum = null, lngNum = null;
    if (latitude.trim() || longitude.trim()) {
      latNum = parseFloat(latitude);
      lngNum = parseFloat(longitude);
      if (isNaN(latNum) || isNaN(lngNum)) return setError("Invalid latitude/longitude values");
      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return setError("Invalid coordinate range");
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("Please log in to create events");
      const userId = session.user.id;

      // Upload banner
      let banner_url: string | null = null;
      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop() || "jpg";
        const fileName = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("event-banners").upload(fileName, bannerFile);
        if (!error) {
          const { data } = supabase.storage.from("event-banners").getPublicUrl(fileName);
          banner_url = data.publicUrl;
        } else console.warn("Banner upload failed:", error);
      }

      const uniqueSlug = await generateUniqueSlug(title.trim());

      // Upload guest artiste images for those with names and images
      const artistesWithImages = [...guestArtistes];
      for (const artiste of artistesWithImages) {
        if (artiste.imageFile && artiste.name.trim()) {
          const imageUrl = await uploadGuestImage(artiste.imageFile, artiste.name, userId);
          if (imageUrl) artiste.image_url = imageUrl;
        }
      }
      const validArtistes = artistesWithImages.filter(a => a.name.trim());

      // ✅ Prepare ticket tiers using UUID (no custom strings)
      const ticketTiersForEventsColumn = ticketTiers.map(tier => {
        const priceInSelected = parseFloat(tier.price) || 0;
        let priceInNGN = priceInSelected;
        if (selectedCurrency !== 'NGN') priceInNGN = priceInSelected * EXCHANGE_RATES[selectedCurrency];
        const quantity = parseInt(tier.quantity) || 100;
        return {
          id: tier.id,   // already a UUID
          name: tier.name.trim(),
          price: priceInNGN,
          original_price: priceInSelected,
          original_currency: selectedCurrency,
          description: tier.description.trim() || `${tier.name} ticket`,
          quantity_available: quantity,
          quantity_sold: 0,
          is_active: true
        };
      });

      // Main event payload – store ticketTiers in JSONB column (with UUIDs)
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
        featured: featured,
        trending: trending,
        isnew: isNew,
        sponsored: sponsored,
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
        ticketTiers: ticketTiersForEventsColumn,   // JSONB storage – now uses UUIDs
        organizer_subaccount_code: organizerSubaccountCode.trim() || null,
        organizer_flutterwave_subaccount: organizerFlutterwaveSubaccount.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert(eventPayload)
        .select("id, title, slug, status, base_currency, fee_strategy")
        .single();

      if (eventError) throw eventError;
      if (!event?.id) throw new Error("Failed to create event - no ID returned");

      // Insert guest artistes into separate table
      if (validArtistes.length) {
        const artistesToInsert = validArtistes.map(a => ({
          event_id: event.id,
          name: a.name.trim(),
          role: a.role,
          image_url: a.image_url.trim() || null,
          bio: a.bio.trim() || null,
          social_media: a.social_media || {},
          created_at: new Date().toISOString()
        }));
        const { error: artistsError } = await supabase.from("guest_artistes").insert(artistesToInsert);
        if (artistsError) console.error("Guest artistes insert error:", artistsError);
      }

      // (Optional) If you also want to insert into a separate `ticketTiers` table for relational queries,
      // you can do so using the same UUIDs. Uncomment the block below if needed.
      /*
      if (ticketTiersForEventsColumn.length) {
        const tiersWithEventId = ticketTiersForEventsColumn.map(t => ({
          event_id: event.id,
          tier_name: t.name,
          description: t.description,
          price: t.price,
          original_currency: t.original_currency,
          original_price: t.original_price,
          quantity_total: t.quantity_available,
          quantity_sold: 0,
          is_active: true,
          id: t.id,   // UUID
          created_at: new Date().toISOString()
        }));
        await supabase.from("ticketTiers").insert(tiersWithEventId);
      }
      */

      const shouldPublish = window.confirm(
        `Draft event created!\n\nCurrency: ${selectedCurrency}\nFee Strategy: ${feeStrategy === 'pass_to_attendees' ? 'Buyers pay fees' : 'Organizer pays fees'}\nTimezone: ${currentTimezone}\n\nPublish now?`
      );

      if (shouldPublish) {
        await supabase.from("events").update({
          status: "published",
          published_at: new Date().toISOString(),
          featured, trending, isnew: isNew, sponsored,
          updated_at: new Date().toISOString()
        }).eq("id", event.id);
      }

      setSuccess(true);
      setTimeout(() => navigate("/organizer/dashboard"), 1500);
    } catch (err: any) {
      console.error("Event creation error:", err);
      let msg = err.message || "Failed to create event. Please try again.";
      if (err.code === "23505") msg = "An event with similar title already exists. Try changing the title slightly.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
                  onClick={() => { setSelectedCurrency(currency as CurrencyType); setShowCurrencyDropdown(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition ${selectedCurrency === currency ? 'bg-purple-500/20 text-purple-300' : 'text-white'}`}
                >
                  <span className="text-xl">{info.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{currency}</div>
                    <div className="text-xs text-gray-400">{info.name}</div>
                  </div>
                  {selectedCurrency === currency && <CheckCircle className="w-5 h-5 text-purple-400" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // The JSX remains identical (no changes needed)
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar role="organizer" />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-6xl mx-auto">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Create New Event</h1>
              <p className="text-gray-400 text-sm sm:text-base">Fill in the details to launch your event</p>
            </div>

            {success && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3 text-green-300">
                <CheckCircle size={24} /><div><p className="font-bold">Event Created Successfully!</p><p className="text-xs">Redirecting to dashboard...</p></div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-300">
                <AlertCircle size={24} /><div><p className="font-bold">Error</p><p className="text-xs">{error}</p></div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column – unchanged */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <label className="text-white font-medium mb-3 block flex items-center gap-2"><Currency size={20} /> Base Currency *</label>
                  <CurrencyDropdown />
                  <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs text-purple-300">1 {selectedCurrency} = ₦{EXCHANGE_RATES[selectedCurrency].toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <label className="text-white font-medium mb-3 block">Event Banner *</label>
                  <div onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition ${dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50"}`}>
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleBannerChange(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {bannerPreview ? (
                      <div className="relative"><img src={bannerPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" /><button onClick={() => { setBannerFile(null); setBannerPreview(null); }} className="absolute top-2 right-2 bg-red-600 p-1 rounded-full"><X size={16} /></button></div>
                    ) : (
                      <div className="space-y-2 py-6"><ImageIcon size={40} className="mx-auto text-gray-500" /><p className="text-white font-medium">Drop image or click to upload</p><p className="text-gray-500 text-xs">PNG, JPG up to 5MB</p></div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <label className="text-white font-medium mb-3 block">Event Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEventType("physical")} className={`py-2 rounded-lg transition ${eventType === "physical" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"}`}>Physical</button>
                    <button type="button" onClick={() => setEventType("virtual")} className={`py-2 rounded-lg transition ${eventType === "virtual" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"}`}>Virtual</button>
                  </div>
                  {eventType === "virtual" && (
                    <input type="url" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full mt-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                  )}
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <label className="text-white font-medium mb-3 block">Event Features</label>
                  <div className="space-y-2">
                    <label className="flex justify-between text-white"><span>Featured Event</span><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-purple-500" /></label>
                    <label className="flex justify-between text-white"><span>Trending</span><input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="accent-purple-500" /></label>
                    <label className="flex justify-between text-white"><span>New Event</span><input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="accent-purple-500" /></label>
                    <label className="flex justify-between text-white"><span>Sponsored</span><input type="checkbox" checked={sponsored} onChange={(e) => setSponsored(e.target.checked)} className="accent-purple-500" /></label>
                  </div>
                </div>
              </div>

              {/* Right Column – unchanged */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
                  <div className="space-y-4">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event Title *" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    </div>
                    <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-800/80 border border-white/10 rounded-lg text-white">
                      <option value="">Select category</option>
                      {COMPLETE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue *" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                      <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                      <input value={country} disabled className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70" />
                    </div>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={geocodeAddressOnBlur} placeholder="Full Address" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">Coordinates</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={getCurrentLocation} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Use My Location</button>
                          <label className="flex items-center gap-1 text-xs text-gray-400"><input type="checkbox" checked={manualCoordinates} onChange={() => setManualCoordinates(!manualCoordinates)} className="accent-purple-500" /> Manual</label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" disabled={!manualCoordinates} className="px-3 py-2 bg-white/10 rounded text-white text-sm" />
                        <input type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" disabled={!manualCoordinates} className="px-3 py-2 bg-white/10 rounded text-white text-sm" />
                      </div>
                    </div>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Event Description" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white resize-none" />
                  </div>
                </div>

                {/* Guest Artistes */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">Guest Artistes (Optional)</h2><button onClick={addGuestArtiste} className="text-purple-400 flex items-center gap-1"><UserPlus size={18} /> Add</button></div>
                  {guestArtistes.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-xl"><UserPlus size={40} className="mx-auto text-gray-500 mb-2" /><p className="text-gray-400">No artistes added</p><button onClick={addGuestArtiste} className="mt-2 text-purple-400 text-sm">+ Add first artiste</button></div>
                  ) : (
                    <div className="space-y-4">
                      {guestArtistes.map(artiste => (
                        <div key={artiste.id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative">
                          {guestArtistes.length > 1 && <button onClick={() => removeGuestArtiste(artiste.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-400"><X size={18} /></button>}
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input value={artiste.name} onChange={(e) => updateGuestArtiste(artiste.id, "name", e.target.value)} placeholder="Name *" className="px-3 py-2 bg-white/10 rounded text-white" />
                              <select value={artiste.role} onChange={(e) => updateGuestArtiste(artiste.id, "role", e.target.value)} className="px-3 py-2 bg-gray-800 rounded text-white border border-white/10">
                                {GUEST_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                              </select>
                            </div>
                            <div
                              onDragOver={(e) => { e.preventDefault(); setGuestDragActiveId(artiste.id); }}
                              onDragLeave={() => setGuestDragActiveId(null)}
                              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleGuestImageChange(artiste.id, e.dataTransfer.files[0]); setGuestDragActiveId(null); }}
                              className={`border-2 border-dashed rounded-lg p-3 text-center ${guestDragActiveId === artiste.id ? "border-purple-500 bg-purple-500/10" : "border-white/20"}`}
                            >
                              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleGuestImageChange(artiste.id, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                              {artiste.imagePreview ? (
                                <div className="relative inline-block">
                                  <img src={artiste.imagePreview} className="w-20 h-20 object-cover rounded-lg" />
                                  <button onClick={() => clearGuestImage(artiste.id)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5"><X size={12} /></button>
                                </div>
                              ) : <div><ImageIcon size={24} className="mx-auto text-gray-500" /><p className="text-xs text-gray-400">Upload image</p></div>}
                            </div>
                            <textarea value={artiste.bio} onChange={(e) => updateGuestArtiste(artiste.id, "bio", e.target.value)} rows={2} placeholder="Bio" className="w-full px-3 py-2 bg-white/10 rounded text-white text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                              <input value={artiste.social_media.instagram || ""} onChange={(e) => updateGuestArtiste(artiste.id, "social_media.instagram", e.target.value)} placeholder="Instagram URL" className="px-2 py-1 bg-white/10 rounded text-xs text-white" />
                              <input value={artiste.social_media.twitter || ""} onChange={(e) => updateGuestArtiste(artiste.id, "social_media.twitter", e.target.value)} placeholder="Twitter URL" className="px-2 py-1 bg-white/10 rounded text-xs text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ticket Tiers */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">Ticket Tiers</h2><button onClick={addTicketTier} className="text-purple-400 flex items-center gap-1"><Plus size={18} /> Add Tier</button></div>
                  <div className="space-y-3">
                    {ticketTiers.map(tier => (
                      <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative">
                        {ticketTiers.length > 1 && <button onClick={() => removeTicketTier(tier.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-400"><X size={18} /></button>}
                        <div className="space-y-3">
                          <input value={tier.name} onChange={(e) => updateTier(tier.id, "name", e.target.value)} placeholder="Tier Name *" className="w-full px-3 py-2 bg-white/10 rounded text-white" />
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-gray-400 text-xs">Price ({selectedCurrency})</label><input type="number" value={tier.price} onChange={(e) => updateTier(tier.id, "price", e.target.value)} min="0" step="0.01" className="w-full px-3 py-2 bg-white/10 rounded text-white" /></div>
                            <div><label className="text-gray-400 text-xs">Quantity *</label><input type="number" value={tier.quantity} onChange={(e) => updateTier(tier.id, "quantity", e.target.value)} min="1" className="w-full px-3 py-2 bg-white/10 rounded text-white" /></div>
                          </div>
                          <input value={tier.description} onChange={(e) => updateTier(tier.id, "description", e.target.value)} placeholder="Description" className="w-full px-3 py-2 bg-white/10 rounded text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fee Settings */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Receipt size={20} /> Fee Settings</h2>
                  <div className="space-y-3">
                    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${feeStrategy === 'pass_to_attendees' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}>
                      <div className="flex items-center gap-3"><input type="radio" name="feeStrategy" checked={feeStrategy === 'pass_to_attendees'} onChange={() => setFeeStrategy('pass_to_attendees')} className="accent-purple-500" /><div><p className="text-white font-medium">Pass fees to attendees</p><p className="text-gray-400 text-sm">Buyers pay ticket + 5% fee + VAT</p></div></div>
                    </label>
                    <label className={`flex items-center p-3 rounded-xl border cursor-pointer ${feeStrategy === 'absorb_fees' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'}`}>
                      <div className="flex items-center gap-3"><input type="radio" name="feeStrategy" checked={feeStrategy === 'absorb_fees'} onChange={() => setFeeStrategy('absorb_fees')} className="accent-purple-500" /><div><p className="text-white font-medium">I'll pay the fees myself</p><p className="text-gray-400 text-sm">Organizer absorbs 5% fee</p></div></div>
                    </label>
                  </div>
                </div>

                {/* Payment Settings (Subaccounts) */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CreditCard size={20} /> Payment Settings (Subaccounts)</h2>
                  <div className="space-y-3">
                    <input value={organizerSubaccountCode} onChange={(e) => setOrganizerSubaccountCode(e.target.value)} placeholder="Paystack Subaccount Code (optional)" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    <input value={organizerFlutterwaveSubaccount} onChange={(e) => setOrganizerFlutterwaveSubaccount(e.target.value)} placeholder="Flutterwave Subaccount ID (optional)" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    <p className="text-gray-400 text-xs">Leave empty to use default platform account.</p>
                  </div>
                </div>

                {/* Tags & Contact */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Additional Details</h2>
                  <div className="space-y-4">
                    <div><label className="text-white text-sm">Tags</label><div className="flex flex-wrap gap-1 my-2">{tags.map(t => <span key={t} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs flex items-center gap-1">#{t}<button onClick={() => removeTag(t)}><X size={12} /></button></span>)}</div><div className="flex gap-2"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTag(e)} placeholder="Add tag" className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /><button onClick={() => addTag()} className="px-4 py-2 bg-purple-600 rounded-lg">Add</button></div></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact Email" className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                      <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact Phone" className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                    </div>
                  </div>
                  <div className="mt-4 p-2 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-400">Event timezone: <span className="text-white">{currentTimezone}</span></p>
                  </div>
                </div>

                <button onClick={handleCreateEvent} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl transition transform hover:scale-[1.02] disabled:opacity-60">
                  {loading ? "Creating Event..." : `Create Event (${selectedCurrency})`}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}