// src/pages/organizer/EditEvent.tsx - FULLY UPDATED WITH UUID v4
import Sidebar from "../../components/Sidebar";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";   // ✅ Added for UUID generation
import {
  Upload, X, Plus, CheckCircle, AlertCircle,
  Calendar, MapPin, Image as ImageIcon, Menu,
  Tag, Globe, DollarSign, Users, Save, Clock,
  ArrowLeft, Loader2, Eye, ChevronDown, Music,
  Mic, UserPlus, Trash2, Globe as GlobeIcon,
  Navigation, Map, Star, CreditCard, Receipt,
  Banknote, Currency
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ---- Interfaces (same as CreateEvent) ----
interface Category { id: number; name: string; }
interface TicketTier {
  id: string;
  name: string;
  price: string;            // displayed price in event's base currency
  description: string;
  quantity: string;
  quantity_sold?: number;
  original_currency?: string;
  original_price?: number;
}
interface GuestArtiste {
  id: string;
  name: string;
  role: string;
  image_url: string;
  imageFile?: File | null;
  imagePreview?: string | null;
  bio: string;
  social_media: { instagram?: string; twitter?: string; youtube?: string; spotify?: string; };
}
interface EventData {
  id: string; title: string; date: string; time: string; venue: string; location?: string;
  city?: string; state?: string; country: string; description?: string; image?: string;
  cover_image?: string; category_id?: number; featured: boolean; trending: boolean;
  isnew: boolean; sponsored: boolean; event_type: string; virtual_link?: string;
  contact_email?: string; contact_phone?: string; tags: string[]; status: string;
  ticketTiers?: any[]; guest_artistes?: any[]; created_at?: string; updated_at?: string;
  slug?: string; lat?: number; lng?: number; base_currency?: string; timezone?: string;
  fee_strategy?: 'pass_to_attendees' | 'absorb_fees';
  organizer_subaccount_code?: string;
  organizer_flutterwave_subaccount?: string;
}

// ---- Constants (same as CreateEvent) ----
type CurrencyType = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR' | 'CAD';
type FeeStrategy = 'pass_to_attendees' | 'absorb_fees';
const TIMEZONES: Record<string, string> = {
  'Nigeria': 'WAT (UTC+1)', 'United States': 'EST (UTC-5)', 'United Kingdom': 'GMT (UTC+0)',
  'European Union': 'CET (UTC+1)', 'Ghana': 'GMT (UTC+0)', 'Kenya': 'EAT (UTC+3)',
  'South Africa': 'SAST (UTC+2)', 'Canada': 'EST (UTC-5)'
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
const GUEST_ROLES = [ "Headliner", "Main Act", "Support Act", "Opening Act", "Guest Artiste", "Host", "DJ", "MC", "Comedian", "Speaker" ];

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

function baseSlug(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}
async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  if (!title?.trim()) return `event-${Date.now()}`;
  let slug = baseSlug(title);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    let query = supabase.from('events').select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${slug}-${Math.random().toString(36).substring(2, 8)}`;
}

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);

  // ---- State ----
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
  const [existingBanner, setExistingBanner] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories] = useState<Category[]>(COMPLETE_CATEGORIES);
  // ✅ Use UUID for default ticket tier
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: uuidv4(), name: "General Admission", price: "0", description: "Standard admission", quantity: "100" }
  ]);
  const [guestArtistes, setGuestArtistes] = useState<GuestArtiste[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('NGN');
  const [feeStrategy, setFeeStrategy] = useState<FeeStrategy>('pass_to_attendees');
  const [organizerSubaccountCode, setOrganizerSubaccountCode] = useState("");
  const [organizerFlutterwaveSubaccount, setOrganizerFlutterwaveSubaccount] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [guestDragActiveId, setGuestDragActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [originalEvent, setOriginalEvent] = useState<EventData | null>(null);
  const [eventStatus, setEventStatus] = useState("draft");

  // Helper: get remaining tickets
  const getRemainingTickets = useCallback((tier: TicketTier) => {
    const total = parseInt(tier.quantity) || 0;
    const sold = tier.quantity_sold || 0;
    return total - sold;
  }, []);

  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price) || 0;
    const symbol = CURRENCY_INFO[selectedCurrency].symbol;
    if (selectedCurrency === 'NGN') return `${symbol}${numPrice.toLocaleString()}`;
    return `${symbol}${numPrice.toFixed(2)}`;
  };

  // Geocoding with debounce
  const geocodeAddressOnBlur = async () => {
    if (!address.trim() || manualCoordinates) return;
    setGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setLatitude(data[0].lat);
          setLongitude(data[0].lon);
        }
      }
    } catch (err) { console.warn("Geocoding failed:", err); }
    finally { setGeocoding(false); }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setManualCoordinates(true);
        setGeocoding(false);
      },
      (err) => { setError(`Unable to get location: ${err.message}`); setGeocoding(false); }
    );
  };

  const toggleManualCoordinates = () => {
    setManualCoordinates(!manualCoordinates);
    if (!manualCoordinates) { setLatitude(""); setLongitude(""); }
  };

  // ---- Load event data ----
  useEffect(() => {
    if (!id) return;
    const loadEvent = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }

        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();

        if (eventError || !event) {
          toast.error("Event not found or you don't have permission to edit it");
          navigate("/organizer/my-events");
          return;
        }

        setOriginalEvent(event);
        setEventStatus(event.status || "draft");

        // Basic fields
        setTitle(event.title || "");
        if (event.date) {
          const dateObj = new Date(event.date);
          setDate(dateObj.toISOString().split('T')[0]);
          setTime(event.time || `${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}`);
        }
        setVenue(event.venue || "");
        setAddress(event.location || "");
        setCity(event.city || "");
        setState(event.state || "");
        setCountry(event.country || "Nigeria");
        setDescription(event.description || "");
        setExistingBanner(event.image || event.cover_image || null);
        setCategoryId(event.category_id || "");
        setFeatured(event.featured || false);
        setTrending(event.trending || false);
        setIsNew(event.isnew || false);
        setSponsored(event.sponsored || false);
        setEventType(event.event_type || "physical");
        setVirtualLink(event.virtual_link || "");
        setContactEmail(event.contact_email || "");
        setContactPhone(event.contact_phone || "");
        setTags(event.tags || []);

        // Currency (static, cannot change)
        if (event.base_currency) {
          setSelectedCurrency(event.base_currency as CurrencyType);
        }
        if (event.fee_strategy) {
          setFeeStrategy(event.fee_strategy as FeeStrategy);
        }
        if (event.organizer_subaccount_code) {
          setOrganizerSubaccountCode(event.organizer_subaccount_code);
        }
        if (event.organizer_flutterwave_subaccount) {
          setOrganizerFlutterwaveSubaccount(event.organizer_flutterwave_subaccount);
        }

        // Coordinates
        if (event.lat && event.lng) {
          setLatitude(event.lat.toString());
          setLongitude(event.lng.toString());
          setManualCoordinates(true);
        }

        // Ticket tiers – convert stored NGN price back to original currency for display
        let tiers: TicketTier[] = [];
        if (event.ticketTiers && Array.isArray(event.ticketTiers)) {
          tiers = event.ticketTiers.map((tier: any, index: number) => {
            const originalCurrency = tier.original_currency || event.base_currency || 'NGN';
            let displayPrice = tier.original_price || 0;
            if (!displayPrice && tier.price) {
              const rate = EXCHANGE_RATES[event.base_currency as CurrencyType] || 1;
              displayPrice = parseFloat(tier.price) / rate; // approximate
            }
            return {
              id: tier.id || `tier-${index}`,  // keep original ID (already UUID if created correctly)
              name: tier.name || tier.tier_name || "",
              price: displayPrice.toString(),
              description: tier.description || "",
              quantity: tier.quantity_available?.toString() || tier.quantity_total?.toString() || "100",
              quantity_sold: tier.quantity_sold || 0,
              original_currency: originalCurrency,
              original_price: displayPrice
            };
          });
        }
        if (tiers.length === 0) {
          tiers = [{ id: uuidv4(), name: "General Admission", price: "0", description: "Standard admission", quantity: "100" }];
        }
        setTicketTiers(tiers);

        // Guest artistes
        const { data: artistesData } = await supabase
          .from("guest_artistes")
          .select("*")
          .eq("event_id", id)
          .order("created_at", { ascending: true });

        if (artistesData && artistesData.length > 0) {
          setGuestArtistes(artistesData.map((artiste: any) => ({
            id: artiste.id,
            name: artiste.name || "",
            role: artiste.role || "Guest Artiste",
            image_url: artiste.image_url || "",
            imageFile: null,
            imagePreview: artiste.image_url || null,
            bio: artiste.bio || "",
            social_media: artiste.social_media || {}
          })));
        }

      } catch (err: any) {
        toast.error("Failed to load event data");
        navigate("/organizer/my-events");
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [id, navigate]);

  // Banner preview cleanup
  useEffect(() => {
    if (bannerFile) {
      const url = URL.createObjectURL(bannerFile);
      setBannerPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [bannerFile]);

  // Cleanup guest previews on unmount
  useEffect(() => {
    return () => {
      guestArtistes.forEach(artiste => {
        if (artiste.imagePreview) URL.revokeObjectURL(artiste.imagePreview);
      });
    };
  }, []);

  // Handlers (same as CreateEvent)
  const handleBannerChange = useCallback((file: File) => {
    if (file?.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large (max 5MB)");
        return;
      }
      setBannerFile(file);
      setError("");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleBannerChange(e.dataTransfer.files[0]);
  }, [handleBannerChange]);

  // Guest Artistes - clear image function
  const clearGuestImage = useCallback((artisteId: string) => {
    setGuestArtistes(prev => prev.map(a => {
      if (a.id === artisteId) {
        if (a.imagePreview) URL.revokeObjectURL(a.imagePreview);
        return { ...a, imageFile: null, imagePreview: null, image_url: "" };
      }
      return a;
    }));
  }, []);

  const handleGuestImageChange = useCallback((artisteId: string, file: File) => {
    if (!file?.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Please select a valid image file (max 5MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    setGuestArtistes(prev => prev.map(artiste => {
      if (artiste.id === artisteId) {
        if (artiste.imagePreview) URL.revokeObjectURL(artiste.imagePreview);
        return { ...artiste, imageFile: file, imagePreview: url, image_url: "" };
      }
      return artiste;
    }));
  }, []);

  const handleGuestDrop = useCallback((e: React.DragEvent<HTMLDivElement>, artisteId: string) => {
    e.preventDefault();
    setGuestDragActiveId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleGuestImageChange(artisteId, e.dataTransfer.files[0]);
    }
  }, [handleGuestImageChange]);

  // Ticket Tiers
  // ✅ Add new tier with UUID
  const addTicketTier = useCallback(() => {
    setTicketTiers(prev => [...prev, {
      id: uuidv4(),
      name: "", price: "0", description: "", quantity: "100"
    }]);
  }, []);
  const removeTicketTier = useCallback((id: string) => {
    if (ticketTiers.length > 1) setTicketTiers(prev => prev.filter(t => t.id !== id));
  }, [ticketTiers.length]);
  const updateTier = useCallback((id: string, field: keyof Omit<TicketTier, "id" | "quantity_sold" | "original_currency" | "original_price">, value: string) => {
    setTicketTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }, []);

  // Guest Artistes CRUD
  const addGuestArtiste = useCallback(() => {
    setGuestArtistes(prev => [...prev, {
      id: Date.now().toString(), name: "", role: "Support Act", image_url: "",
      imageFile: null, imagePreview: null, bio: "", social_media: {}
    }]);
  }, []);
  const removeGuestArtiste = useCallback((id: string) => {
    setGuestArtistes(prev => {
      const artiste = prev.find(g => g.id === id);
      if (artiste?.imagePreview) URL.revokeObjectURL(artiste.imagePreview);
      return prev.filter(g => g.id !== id);
    });
  }, []);
  const updateGuestArtiste = useCallback((id: string, field: keyof GuestArtiste | `social_media.${string}`, value: string) => {
    setGuestArtistes(prev => prev.map(g => {
      if (g.id !== id) return g;
      if (field.startsWith('social_media.')) {
        const socialField = field.replace('social_media.', '') as keyof GuestArtiste['social_media'];
        return { ...g, social_media: { ...g.social_media, [socialField]: value } };
      }
      return { ...g, [field]: value };
    }));
  }, []);

  // Tags
  const addTag = useCallback((e?: React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setTagInput("");
    }
  }, [tagInput, tags]);
  const removeTag = useCallback((tag: string) => setTags(prev => prev.filter(t => t !== tag)), []);
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTag(e);
  }, [addTag]);

  // Upload guest image to Supabase
  const uploadGuestImage = async (file: File, artisteName: string, userId: string): Promise<string | null> => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `guest-artistes/${userId}/${Date.now()}-${artisteName.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("event-banners").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("event-banners").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Guest image upload error:", err);
      return null;
    }
  };

  // Save event
  const handleSave = async () => {
    setError("");
    setSuccess(false);

    // Validation
    if (!title.trim() || !date || !venue.trim() || !categoryId) {
      setError("Title, Date, Venue, and Category are required");
      return;
    }
    if (eventType === "virtual" && virtualLink.trim() && !virtualLink.trim().match(/^https?:\/\/.+/)) {
      setError("Please enter a valid virtual event URL (starting with http:// or https://)");
      return;
    }
    const validTiers = ticketTiers.filter(t => t.name.trim() && parseFloat(t.price) >= 0 && parseInt(t.quantity) > 0);
    if (validTiers.length === 0) {
      setError("At least one valid ticket tier is required");
      return;
    }
    // Check if any tier has quantity less than already sold
    for (const tier of validTiers) {
      const newQuantity = parseInt(tier.quantity);
      const sold = tier.quantity_sold || 0;
      if (newQuantity < sold) {
        setError(`Cannot reduce quantity of "${tier.name}" below ${sold} tickets already sold.`);
        return;
      }
    }
    const invalidArtiste = guestArtistes.find(g => !g.name.trim());
    if (invalidArtiste) {
      setError("All guest artistes must have a name");
      return;
    }

    let latNum = null, lngNum = null;
    if (latitude.trim() || longitude.trim()) {
      latNum = parseFloat(latitude);
      lngNum = parseFloat(longitude);
      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        setError("Invalid coordinate values");
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in to edit events");
      const userId = session.user.id;

      // 1. Upload new banner if changed
      let banner_url = existingBanner;
      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("event-banners").upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("event-banners").getPublicUrl(fileName);
        banner_url = urlData.publicUrl;
      }

      // 2. Upload new guest images and clear image_url for those with no imageFile and no existing URL
      const artistesWithImages = [...guestArtistes];
      for (const artiste of artistesWithImages) {
        if (artiste.imageFile) {
          const imageUrl = await uploadGuestImage(artiste.imageFile, artiste.name, userId);
          if (imageUrl) artiste.image_url = imageUrl;
        } else if (!artiste.image_url && !artiste.imagePreview) {
          // User cleared the image: ensure image_url is empty
          artiste.image_url = "";
        }
      }

      // 3. Generate unique slug if title changed
      let newSlug = originalEvent?.slug;
      if (originalEvent?.title !== title.trim() && title.trim()) {
        newSlug = await generateUniqueSlug(title.trim(), id);
      }

      // 4. Prepare ticket tiers data (for JSON column and ticketTiers table)
      const ticketTiersData = validTiers.map(tier => {
        const displayPrice = parseFloat(tier.price) || 0; // in event's base currency (selectedCurrency)
        const priceInNGN = selectedCurrency === 'NGN' ? displayPrice : displayPrice * EXCHANGE_RATES[selectedCurrency];
        const quantity_total = parseInt(tier.quantity) || 100;
        // Preserve sold quantity from original
        let quantity_sold = 0;
        if (originalEvent?.ticketTiers) {
          const existing = originalEvent.ticketTiers.find((t: any) => t.id === tier.id || t.name === tier.name);
          if (existing) quantity_sold = existing.quantity_sold || 0;
        }
        return {
          id: tier.id,   // already a UUID (or preserved from original)
          name: tier.name.trim(),
          tier_name: tier.name.trim(),
          price: priceInNGN,
          description: tier.description.trim() || "",
          quantity_total,
          quantity_sold,
          is_active: true,
          original_currency: selectedCurrency,
          original_price: displayPrice
        };
      });

      // 5. Prepare guest artistes data (for insert)
      const artistesToInsert = artistesWithImages
        .filter(a => a.name.trim())
        .map(a => ({
          id: a.id.startsWith('artiste-') ? undefined : a.id,
          event_id: id,
          name: a.name.trim(),
          role: a.role,
          image_url: a.image_url.trim() || null,
          bio: a.bio.trim() || null,
          social_media: a.social_media || {},
          updated_at: new Date().toISOString()
        }));

      // 6. Build event update payload
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        date: `${date}T${time || "18:00"}:00`,
        time: time || "18:00",
        venue: venue.trim(),
        location: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || "Nigeria",
        event_type: eventType,
        virtual_link: eventType === "virtual" ? virtualLink.trim() : null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        featured,
        trending,
        isnew: isNew,
        sponsored,
        tags: tags.length > 0 ? tags : null,
        updated_at: new Date().toISOString(),
        timezone: TIMEZONES[country] || 'WAT (UTC+1)',
        lat: latNum,
        lng: lngNum,
        ticketTiers: ticketTiersData.map(t => ({
          id: t.id,
          name: t.name,
          price: t.price,
          description: t.description,
          quantity_available: t.quantity_total,
          quantity_sold: t.quantity_sold,
          is_active: t.is_active,
          original_currency: t.original_currency,
          original_price: t.original_price
        })),
        base_currency: selectedCurrency,   // keep same; not changed
        fee_strategy: feeStrategy,
        organizer_subaccount_code: organizerSubaccountCode.trim() || null,
        organizer_flutterwave_subaccount: organizerFlutterwaveSubaccount.trim() || null
      };
      if (newSlug) updateData.slug = newSlug;
      if (banner_url) {
        updateData.image = banner_url;
        updateData.cover_image = banner_url;
      }

      // 7. Update events table
      const { error: updateError } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .eq("organizer_id", userId);
      if (updateError) throw updateError;

      // 8. Update ticketTiers table (delete old, insert new)
      await supabase.from("ticketTiers").delete().eq("event_id", id);
      if (ticketTiersData.length > 0) {
        const tiersForTable = ticketTiersData.map(t => ({
          event_id: id,
          tier_name: t.tier_name,
          description: t.description,
          price: t.price,
          quantity_total: t.quantity_total,
          quantity_sold: t.quantity_sold,
          is_active: true,
          created_at: new Date().toISOString()
        }));
        const { error: tiersError } = await supabase.from("ticketTiers").insert(tiersForTable);
        if (tiersError) console.error("Failed to update ticketTiers table:", tiersError);
      }

      // 9. Update guest_artistes table (delete old, insert new)
      await supabase.from("guest_artistes").delete().eq("event_id", id);
      if (artistesToInsert.length > 0) {
        const { error: artistesError } = await supabase.from("guest_artistes").insert(artistesToInsert);
        if (artistesError) console.error("Failed to update guest artistes:", artistesError);
      }

      setSuccess(true);
      toast.success("Event updated successfully!");
      setTimeout(() => navigate("/organizer/my-events"), 1500);

    } catch (err: any) {
      setError(err.message || "Failed to update event");
      toast.error("Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  // Publish event
  const publishEvent = async () => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setEventStatus("published");
      toast.success("Event published!");
      setTimeout(() => navigate("/organizer/my-events"), 1500);
    } catch (err) {
      toast.error("Failed to publish event");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-white/10">
        <Menu size={24} className="text-white" />
      </button>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-950 border-r border-white/10">
            <Sidebar role="organizer" />
          </div>
        </div>
      )}
      <div className="hidden lg:block"><Sidebar role="organizer" /></div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 md:mb-10 gap-3 sm:gap-4">
              <div>
                <button onClick={() => navigate("/organizer/my-events")} className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 sm:mb-3 md:mb-4 transition-colors text-sm sm:text-base">
                  <ArrowLeft size={16} className="sm:w-5 sm:h-5" /> Back to Events
                </button>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Edit Event</h1>
                <p className="text-gray-400 text-xs sm:text-sm md:text-base">Update your event details</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button onClick={() => navigate(`/event/${originalEvent?.slug || id}`)} className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors text-xs sm:text-sm">
                  <Eye size={14} className="sm:w-4 sm:h-4" /> Preview
                </button>
                {eventStatus === "draft" && (
                  <button onClick={publishEvent} className="px-4 sm:px-5 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm">
                    Publish Now
                  </button>
                )}
              </div>
            </div>

            {success && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3 text-green-300 text-sm">
                <CheckCircle size={20} /> <div><p className="font-bold">Event Updated Successfully!</p><p className="text-xs">Redirecting...</p></div>
              </div>
            )}
            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-300 text-sm">
                <AlertCircle size={20} /> <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {/* Left Column */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                {/* Currency (static) */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 block flex items-center gap-2">
                    <Currency size={20} /> Base Currency
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white">
                    <span className="text-xl">{CURRENCY_INFO[selectedCurrency].flag}</span>
                    <div className="text-left">
                      <div className="font-medium">{selectedCurrency}</div>
                      <div className="text-xs text-gray-400">{CURRENCY_INFO[selectedCurrency].name}</div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-300 font-medium mb-1">Exchange Rates (for reference):</p>
                    <div className="text-xs text-purple-300/80">
                      <p>1 {selectedCurrency} = ₦{EXCHANGE_RATES[selectedCurrency].toLocaleString()} NGN</p>
                    </div>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 block text-sm sm:text-base">Event Banner</label>
                  <div onDragOver={(e)=>{e.preventDefault(); setDragActive(true);}} onDragLeave={()=>setDragActive(false)} onDrop={handleDrop} className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50"}`}>
                    <input type="file" id="banner-upload" accept="image/*" onChange={(e)=>e.target.files?.[0] && handleBannerChange(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {(bannerPreview || existingBanner) ? (
                      <div className="relative">
                        <img src={bannerPreview || existingBanner || ""} alt="Event banner" className="w-full h-40 sm:h-48 md:h-56 object-cover rounded-lg" onError={(e)=>(e.target as HTMLImageElement).src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"} />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button onClick={()=>{ setBannerFile(null); setBannerPreview(null); setExistingBanner(null); }} className="bg-red-600 hover:bg-red-700 p-1.5 rounded-full transition"><X size={14} className="text-white" /></button>
                          <label htmlFor="banner-upload" className="bg-purple-600 hover:bg-purple-700 p-1.5 rounded-full transition cursor-pointer"><Upload size={14} className="text-white" /></label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 py-8"><ImageIcon size={32} className="mx-auto text-gray-500" /><p className="text-white font-medium text-sm">Drop image or click to upload</p><p className="text-gray-500 text-xs">PNG, JPG up to 5MB</p></div>
                    )}
                  </div>
                </div>

                {/* Event Status */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <h3 className="text-white font-medium mb-3 block text-sm sm:text-base">Event Status</h3>
                  <div className="space-y-3">
                    <div><p className="text-gray-400 text-xs">Current Status</p><div className={`px-3 py-1.5 rounded-lg inline-block mt-1 text-xs ${eventStatus==="published"?"bg-green-500/20 text-green-300":"bg-yellow-500/20 text-yellow-300"}`}>{eventStatus.toUpperCase()}</div></div>
                    <div><p className="text-gray-400 text-xs">Created</p><p className="text-white text-sm">{originalEvent?.created_at ? new Date(originalEvent.created_at).toLocaleDateString() : "N/A"}</p></div>
                    <div><p className="text-gray-400 text-xs">Last Updated</p><p className="text-white text-sm">{originalEvent?.updated_at ? new Date(originalEvent.updated_at).toLocaleDateString() : "Never"}</p></div>
                    <div><p className="text-gray-400 text-xs">Timezone</p><p className="text-white text-sm flex items-center gap-1"><GlobeIcon size={12} /> {TIMEZONES[country] || 'WAT (UTC+1)'}</p></div>
                  </div>
                </div>

                {/* Event Features */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 block text-sm sm:text-base">Event Features</label>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-white text-sm cursor-pointer"><span>Featured Event</span><input type="checkbox" checked={featured} onChange={(e)=>setFeatured(e.target.checked)} className="w-4 h-4 accent-purple-500" /></label>
                    <label className="flex items-center justify-between text-white text-sm cursor-pointer"><span>Trending</span><input type="checkbox" checked={trending} onChange={(e)=>setTrending(e.target.checked)} className="w-4 h-4 accent-purple-500" /></label>
                    <label className="flex items-center justify-between text-white text-sm cursor-pointer"><span>New Event</span><input type="checkbox" checked={isNew} onChange={(e)=>setIsNew(e.target.checked)} className="w-4 h-4 accent-purple-500" /></label>
                    <label className="flex items-center justify-between text-white text-sm cursor-pointer"><span>Sponsored</span><input type="checkbox" checked={sponsored} onChange={(e)=>setSponsored(e.target.checked)} className="w-4 h-4 accent-purple-500" /></label>
                  </div>
                </div>

                {/* Event Type */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <label className="text-white font-medium mb-3 block text-sm sm:text-base">Event Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer"><input type="radio" name="eventType" value="physical" checked={eventType==="physical"} onChange={(e)=>setEventType(e.target.value)} className="w-4 h-4 accent-purple-500" /> Physical Event</label>
                    <label className="flex items-center gap-2 text-white text-sm cursor-pointer"><input type="radio" name="eventType" value="virtual" checked={eventType==="virtual"} onChange={(e)=>setEventType(e.target.value)} className="w-4 h-4 accent-purple-500" /> Virtual Event</label>
                    {eventType==="virtual" && (
                      <div className="mt-2"><label className="text-white font-medium mb-1 block text-sm">Virtual Link</label><input value={virtualLink} onChange={(e)=>setVirtualLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm" /></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Main Form */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Basic Information</h2>
                  <div className="space-y-4">
                    <div><label className="text-white font-medium mb-2 block text-sm sm:text-base">Event Title *</label><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Afro Nation 2025" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm sm:text-base" required /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div><label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm"><Calendar size={16} /> Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm" required min={new Date().toISOString().split('T')[0]} /></div>
                      <div><label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm"><Clock size={16} /> Time ({TIMEZONES[country] || 'WAT (UTC+1)'}) *</label><input type="time" value={time} onChange={(e)=>setTime(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm" required /><p className="text-gray-500 text-xs mt-1">Timezone: {TIMEZONES[country] || 'WAT (UTC+1)'}</p></div>
                    </div>
                    <div><label className="text-white font-medium mb-2 block text-sm"><Tag size={16} className="inline mr-2" /> Category *</label><select value={categoryId} onChange={(e)=>setCategoryId(e.target.value ? Number(e.target.value) : "")} className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white text-sm"><option value="">Select category</option>{categories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>{(categoryId===4||categoryId===16)&&<p className="text-purple-300 text-xs mt-1 flex items-center gap-1"><Star size={12}/> Great choice! {categoryId===4?'Rave parties':'Beach parties'} are trending!</p>}</div>
                    <div><label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm"><MapPin size={16} /> Venue *</label><input value={venue} onChange={(e)=>setVenue(e.target.value)} placeholder="e.g. Eko Hotel & Suites, Lagos" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" required /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div><label className="text-white font-medium mb-2 block text-xs">City</label><input value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Lagos" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                      <div><label className="text-white font-medium mb-2 block text-xs">State</label><input value={state} onChange={(e)=>setState(e.target.value)} placeholder="Lagos State" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                      <div><label className="text-white font-medium mb-2 block text-xs">Country</label><input value={country} onChange={(e)=>setCountry(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" readOnly /><p className="text-gray-500 text-xs mt-1">Auto-set from currency</p></div>
                    </div>
                    <div><label className="text-white font-medium mb-2 block text-sm">Full Address</label><input value={address} onChange={(e)=>setAddress(e.target.value)} onBlur={geocodeAddressOnBlur} placeholder="Plot 1415, Ahmadu Bello Way, Victoria Island" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" /><p className="text-gray-500 text-xs mt-1">{geocoding?"Finding coordinates...":"Address will be used to get coordinates"}</p></div>
                    {/* Coordinates Section */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <label className="text-white font-medium flex items-center gap-2 text-sm"><Map size={16} /> Coordinates (Optional)</label>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={getCurrentLocation} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-xs transition" disabled={geocoding}><Navigation size={12} /> Use My Location</button>
                          <label className="flex items-center gap-1 text-xs text-gray-400"><input type="checkbox" checked={manualCoordinates} onChange={toggleManualCoordinates} className="w-3 h-3 accent-purple-500" /> Manual Entry</label>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="text-gray-300 text-xs mb-1 block">Latitude</label><input type="number" value={latitude} onChange={(e)=>setLatitude(e.target.value)} step="0.000001" min="-90" max="90" placeholder="e.g., 6.5244" className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm" disabled={!manualCoordinates} /></div>
                        <div><label className="text-gray-300 text-xs mb-1 block">Longitude</label><input type="number" value={longitude} onChange={(e)=>setLongitude(e.target.value)} step="0.000001" min="-180" max="180" placeholder="e.g., 3.3792" className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm" disabled={!manualCoordinates} /></div>
                      </div>
                    </div>
                    <div><label className="text-white font-medium mb-2 block text-sm">Description</label><textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={4} placeholder="Tell attendees what to expect at your event..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none text-sm" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="text-white font-medium mb-2 block text-sm">Contact Email</label><input type="email" value={contactEmail} onChange={(e)=>setContactEmail(e.target.value)} placeholder="contact@example.com" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                      <div><label className="text-white font-medium mb-2 block text-sm">Contact Phone</label><input value={contactPhone} onChange={(e)=>setContactPhone(e.target.value)} placeholder="+234 800 000 0000" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /></div>
                    </div>
                    <div><label className="text-white font-medium mb-2 block text-sm">Tags</label><div className="flex gap-2 mb-3"><input value={tagInput} onChange={(e)=>setTagInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Add tags (press Enter)" className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" /><button onClick={() => addTag()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm">Add</button></div><div className="flex flex-wrap gap-1.5">{tags.map(tag=><span key={tag} className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs flex items-center gap-1.5">#{tag}<button onClick={()=>removeTag(tag)} className="text-purple-400 hover:text-white"><X size={12}/></button></span>)}</div></div>
                  </div>
                </div>

                {/* Guest Artistes */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div><h2 className="text-lg sm:text-xl font-bold text-white">Guest Artistes (Optional)</h2><p className="text-gray-400 text-xs sm:text-sm mt-1">Add performers, speakers, or special guests</p></div>
                    <button onClick={addGuestArtiste} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition text-sm"><UserPlus size={18} /> Add Artiste</button>
                  </div>
                  {guestArtistes.length===0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10"><UserPlus size={40} className="mx-auto text-gray-500 mb-3" /><p className="text-gray-400">No guest artistes added yet</p><button onClick={addGuestArtiste} className="mt-3 text-purple-400 hover:text-purple-300 font-medium text-sm">+ Add your first artiste</button></div>
                  ) : (
                    <div className="space-y-4">{guestArtistes.map(artiste=>(
                      <div key={artiste.id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative">
                        {guestArtistes.length>1 && <button onClick={()=>removeGuestArtiste(artiste.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-400 transition"><Trash2 size={18} /></button>}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div><label className="text-white font-medium mb-2 block text-sm">Name *</label><input value={artiste.name} onChange={(e)=>updateGuestArtiste(artiste.id,"name",e.target.value)} placeholder="e.g., Burna Boy, Wizkid" className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm" /></div>
                            <div><label className="text-white font-medium mb-2 block text-sm">Role</label><select value={artiste.role} onChange={(e)=>updateGuestArtiste(artiste.id,"role",e.target.value)} className="w-full px-3 py-2 bg-gray-800 rounded-lg text-white text-sm border border-white/10">{GUEST_ROLES.map(role=><option key={role} value={role}>{role}</option>)}</select></div>
                          </div>
                          <div><label className="text-white font-medium mb-2 block text-sm">Profile Image</label>
                            <div onDragOver={(e)=>{e.preventDefault(); setGuestDragActiveId(artiste.id);}} onDragLeave={()=>setGuestDragActiveId(null)} onDrop={(e)=>handleGuestDrop(e,artiste.id)} className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${guestDragActiveId===artiste.id?"border-purple-500 bg-purple-500/10":"border-white/20 hover:border-purple-500/50"}`}>
                              <input type="file" accept="image/*" onChange={(e)=>e.target.files?.[0] && handleGuestImageChange(artiste.id,e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                              {artiste.imagePreview ? (
                                <div className="relative">
                                  <img src={artiste.imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg mx-auto" />
                                  <button onClick={() => clearGuestImage(artiste.id)} className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 p-1 rounded-full transition"><X size={14} className="text-white" /></button>
                                </div>
                              ) : (
                                <div className="space-y-2 py-2"><ImageIcon size={32} className="mx-auto text-gray-500" /><p className="text-white font-medium text-sm">Drop image or click to upload</p><p className="text-gray-500 text-xs">PNG, JPG up to 5MB</p></div>
                              )}
                            </div>
                          </div>
                          <div><label className="text-white font-medium mb-2 block text-sm">Bio</label><textarea value={artiste.bio} onChange={(e)=>updateGuestArtiste(artiste.id,"bio",e.target.value)} rows={2} placeholder="Short description about the artiste..." className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 resize-none text-sm" /></div>
                          <div className="bg-white/5 rounded-lg p-3"><label className="text-white font-medium mb-3 block text-sm">Social Media Links</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <div><label className="text-gray-300 text-xs mb-1 block">Instagram</label><input type="url" value={artiste.social_media.instagram||""} onChange={(e)=>updateGuestArtiste(artiste.id,"social_media.instagram",e.target.value)} placeholder="https://instagram.com/" className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs" /></div>
                              <div><label className="text-gray-300 text-xs mb-1 block">Twitter/X</label><input type="url" value={artiste.social_media.twitter||""} onChange={(e)=>updateGuestArtiste(artiste.id,"social_media.twitter",e.target.value)} placeholder="https://twitter.com/" className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs" /></div>
                              <div><label className="text-gray-300 text-xs mb-1 block">YouTube</label><input type="url" value={artiste.social_media.youtube||""} onChange={(e)=>updateGuestArtiste(artiste.id,"social_media.youtube",e.target.value)} placeholder="https://youtube.com/" className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs" /></div>
                              <div><label className="text-gray-300 text-xs mb-1 block">Spotify</label><input type="url" value={artiste.social_media.spotify||""} onChange={(e)=>updateGuestArtiste(artiste.id,"social_media.spotify",e.target.value)} placeholder="https://open.spotify.com/" className="w-full px-3 py-2 bg-white/10 rounded text-white text-xs" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </div>

                {/* Ticket Tiers */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                    <div><h2 className="text-lg sm:text-xl font-bold text-white">Ticket Tiers</h2><p className="text-gray-400 text-xs sm:text-sm mt-1">Prices in {selectedCurrency} ({CURRENCY_INFO[selectedCurrency].symbol})</p></div>
                    <button onClick={addTicketTier} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition text-sm"><Plus size={18} /> Add Tier</button>
                  </div>
                  <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-300">💡 <span className="font-medium">Note:</span> Prices stored in NGN ({EXCHANGE_RATES[selectedCurrency].toLocaleString()} NGN per 1 {selectedCurrency})</p>
                  </div>
                  <div className="space-y-3">
                    {ticketTiers.map((tier) => (
                      <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative">
                        {ticketTiers.length > 1 && <button onClick={()=>removeTicketTier(tier.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-400 transition"><X size={18} /></button>}
                        <div className="space-y-3">
                          <div><label className="text-white font-medium mb-2 block text-sm">Tier Name *</label><input value={tier.name} onChange={(e)=>updateTier(tier.id,"name",e.target.value)} placeholder="e.g., VIP, Early Bird, General Admission" className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm" required /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div><label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm"><DollarSign size={14} /> Price ({selectedCurrency}) *</label>
                              <div className="relative"><input type="number" value={tier.price} onChange={(e)=>updateTier(tier.id,"price",e.target.value)} placeholder="0.00" min="0" step="0.01" className="w-full pl-8 pr-3 py-2 bg-white/10 rounded-lg text-white text-sm" /><div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{CURRENCY_INFO[selectedCurrency].symbol}</div></div>
                              {tier.price && tier.price !== "0" && <p className="text-xs text-gray-500 mt-1">≈ ₦{(parseFloat(tier.price) * EXCHANGE_RATES[selectedCurrency]).toLocaleString()} NGN</p>}
                            </div>
                            <div><label className="text-white font-medium mb-2 block flex items-center gap-2 text-sm"><Users size={14} /> Quantity *</label><input type="number" value={tier.quantity} onChange={(e)=>updateTier(tier.id,"quantity",e.target.value)} placeholder="100" min="1" className="w-full px-3 py-2 bg-white/10 rounded-lg text-white text-sm" required /><div className="mt-1 text-xs"><div className="text-gray-400">Sold: {tier.quantity_sold || 0} • Remaining: {getRemainingTickets(tier)}</div>{tier.quantity_sold ? <div className="text-xs text-yellow-400 mt-0.5">⚠️ {tier.quantity_sold} tickets already sold</div> : null}</div></div>
                            <div className="sm:col-span-2 lg:col-span-1"><label className="text-white font-medium mb-2 block text-sm">Description</label><input value={tier.description} onChange={(e)=>updateTier(tier.id,"description",e.target.value)} placeholder="What's included in this tier" className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-500 text-sm" /></div>
                          </div>
                          {tier.price && tier.price !== "0" && (
                            <div className="pt-3 border-t border-white/10"><div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-400">Price Summary:</span><div className="text-right"><div className="text-white font-medium">{formatPrice(tier.price)} {selectedCurrency}</div><div className="text-gray-500 text-xs">≈ ₦{(parseFloat(tier.price) * EXCHANGE_RATES[selectedCurrency]).toLocaleString()} NGN</div></div></div></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fee Settings */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2"><Receipt size={20} /> Fee Settings</h2>
                  <p className="text-gray-400 text-sm mb-4">Choose who pays the <span className="text-purple-400 font-medium">5% service fee</span>. VAT is always calculated at checkout based on the buyer's country and paid by the buyer.</p>
                  <div className="space-y-3">
                    <label className={`flex items-center justify-between p-4 bg-white/5 border rounded-xl transition cursor-pointer ${feeStrategy==='pass_to_attendees'?'border-purple-500 bg-purple-500/10':'border-white/10 hover:bg-white/10'}`}>
                      <div className="flex items-center gap-4"><input type="radio" name="feeStrategy" value="pass_to_attendees" checked={feeStrategy==='pass_to_attendees'} onChange={(e)=>setFeeStrategy('pass_to_attendees')} className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-white/20 bg-white/10" /><div><p className="text-white font-medium">Pass fees to attendees</p><p className="text-gray-400 text-sm">Buyers pay ticket price + 5% service fee + VAT</p></div></div>
                      {feeStrategy==='pass_to_attendees' && <span className="text-purple-400 text-xs sm:text-sm font-medium bg-purple-500/20 px-3 py-1 rounded-full">Recommended</span>}
                    </label>
                    <label className={`flex items-center p-4 bg-white/5 border rounded-xl transition cursor-pointer ${feeStrategy==='absorb_fees'?'border-purple-500 bg-purple-500/10':'border-white/10 hover:bg-white/10'}`}>
                      <div className="flex items-center gap-4"><input type="radio" name="feeStrategy" value="absorb_fees" checked={feeStrategy==='absorb_fees'} onChange={(e)=>setFeeStrategy('absorb_fees')} className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-white/20 bg-white/10" /><div><p className="text-white font-medium">I'll pay the fees myself</p><p className="text-gray-400 text-sm">Organizer absorbs 5% service fee, buyers only pay ticket price + VAT</p></div></div>
                    </label>
                  </div>
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"><p className="text-xs sm:text-sm text-purple-300"><span className="font-medium">💡 Note:</span> VAT is calculated in real-time at checkout based on the buyer's selected country and is always paid by the buyer. The service fee is a fixed 5% of the ticket price.</p></div>
                </div>

                {/* Payment Settings – Subaccounts */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2"><CreditCard size={20} /> Payment Settings (Subaccounts)</h2>
                  <p className="text-gray-400 text-sm mb-4">If you have a Paystack or Flutterwave subaccount, enter the codes below to receive ticket revenue directly (minus platform fees). Leave empty to use the default account.</p>
                  <div className="space-y-4">
                    <div><label className="text-white font-medium mb-2 block text-sm sm:text-base flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Paystack Subaccount Code</label><input type="text" value={organizerSubaccountCode} onChange={(e)=>setOrganizerSubaccountCode(e.target.value)} placeholder="e.g., ACCT_6uujpqtzmnufzkw" className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-500 text-sm sm:text-base" /><p className="text-gray-500 text-xs mt-1">Find this in your Paystack dashboard → Settings → Subaccounts.</p></div>
                    <div><label className="text-white font-medium mb-2 block text-sm sm:text-base flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Flutterwave Subaccount ID</label><input type="text" value={organizerFlutterwaveSubaccount} onChange={(e)=>setOrganizerFlutterwaveSubaccount(e.target.value)} placeholder="e.g., RS_D87A9EE339AE28BFA2AE86041C6DE70E" className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-500 text-sm sm:text-base" /><p className="text-gray-500 text-xs mt-1">Find this in your Flutterwave dashboard → Subaccounts.</p></div>
                  </div>
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"><p className="text-xs sm:text-sm text-purple-300"><span className="font-medium">💡 How it works:</span> When a buyer pays, the exact ticket price (minus fees) goes to the subaccount you provide. Fees are credited to your main platform account.</p></div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl shadow-xl transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
                    {saving ? <><Loader2 className="animate-spin w-4 h-4" />Saving Changes...</> : <><Save size={18} />Save Changes</>}
                  </button>
                  <button onClick={()=>navigate("/organizer/my-events")} className="px-4 py-4 border border-white/20 text-white rounded-xl hover:bg-white/10 transition text-sm">Cancel</button>
                </div>
                <p className="text-gray-500 text-xs text-center pt-4">* Required fields | Base Currency: {selectedCurrency} ({CURRENCY_INFO[selectedCurrency].symbol}) | Timezone: {TIMEZONES[country] || 'WAT (UTC+1)'}</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}