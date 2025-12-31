// src/pages/organizer/CreateEvent.tsx
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Upload, X, Plus, CheckCircle, AlertCircle,
  Calendar, MapPin, Image as ImageIcon, Menu,
  Tag, Globe, DollarSign, Users, Map, Navigation
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

// Geocoding function to get coordinates from address
async function geocodeAddress(address: string): Promise<{ lat: number | null; lng: number | null }> {
  if (!address.trim()) return { lat: null, lng: null };

  try {
    // Using OpenStreetMap Nominatim API (free, no API key required)
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
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { 
      id: "1", 
      name: "General Admission", 
      price: "0", 
      description: "Standard admission to the event", 
      quantity: "100" 
    }
  ]);

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

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (!error && data) setCategories(data);
    };
    loadCategories();
  }, []);

  // Banner preview
  useEffect(() => {
    if (bannerFile) {
      const url = URL.createObjectURL(bannerFile);
      setBannerPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBannerPreview(null);
  }, [bannerFile]);

  // Geocode address when address changes
  useEffect(() => {
    if (address.trim() && !manualCoordinates) {
      const timeoutId = setTimeout(async () => {
        await geocodeAddressOnBlur();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [address, manualCoordinates]);

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
        // Try with venue + city + country if address alone fails
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
      // When enabling manual mode, clear auto-generated coordinates
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

  const handleCreateEvent = async () => {
    setError("");
    setSuccess(false);

    // Basic validation
    if (!title.trim() || !date || !venue.trim() || !categoryId) {
      setError("Title, Date, Venue, and Category are required");
      return;
    }

    // Check ticket tiers are valid
    const invalidTier = ticketTiers.find(t => !t.name.trim() || !t.quantity.trim());
    if (invalidTier) {
      setError("All ticket tiers must have a name and quantity");
      return;
    }

    // Validate coordinates if provided
    let latNum = null;
    let lngNum = null;
    
    if (latitude.trim() || longitude.trim()) {
      latNum = parseFloat(latitude);
      lngNum = parseFloat(longitude);
      
      if (isNaN(latNum) || isNaN(lngNum)) {
        setError("Invalid latitude/longitude values");
        return;
      }
      
      if (latNum < -90 || latNum > 90) {
        setError("Latitude must be between -90 and 90");
        return;
      }
      
      if (lngNum < -180 || lngNum > 180) {
        setError("Longitude must be between -180 and 180");
        return;
      }
    }

    setLoading(true);

    try {
      console.log("=== STARTING EVENT CREATION ===");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error("No session found");
        throw new Error("Please log in to create events");
      }

      console.log("User ID:", session.user.id);

      // Upload banner
      let banner_url: string | null = null;
      if (bannerFile) {
        console.log("Uploading banner...");
        const ext = bannerFile.name.split(".").pop() || "jpg";
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;

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

      // Prepare ticket tiers for separate ticketTiers table (PRIMARY SOURCE)
      const tiersToInsert = ticketTiers.map(tier => {
        const price = parseFloat(tier.price) || 0;
        const quantity = parseInt(tier.quantity) || 100;
        
        return {
          event_id: "", // Will be set after event creation
          tier_name: tier.name.trim(),
          description: tier.description.trim() || `${tier.name} ticket`,
          price: price,
          quantity_total: quantity,
          quantity_sold: 0,
          is_active: true
        };
      });

      console.log("📋 Ticket tiers for ticketTiers table:", tiersToInsert);

      // Build event data - set as DRAFT first
      const eventPayload = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        date: `${date}T${time}:00+01:00`,  // Nigeria is UTC+1
        time: time || "00:00",
        venue: venue.trim(),
        location: venue.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || "Nigeria",
        image: banner_url,
        cover_image: banner_url,
        featured: false, // Always false for drafts
        trending: false, // Always false for drafts
        isnew: false, // Always false for drafts
        sponsored: false, // Always false for drafts
        status: "draft",
        organizer_id: session.user.id,
        slug: uniqueSlug,
        tags: tags.length > 0 ? tags : null,
        lat: latNum,
        lng: lngNum,
        event_type: eventType || "physical",
        virtual_link: eventType === "virtual" ? virtualLink.trim() : null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        published_at: null,
      };

      console.log("📦 Event payload (draft):", JSON.stringify(eventPayload, null, 2));
      console.log("📍 Coordinates:", { lat: latNum, lng: lngNum });

      // Test events table access
      console.log("🔍 Testing events table access...");
      const { error: testError } = await supabase
        .from("events")
        .select("id")
        .limit(1);
      
      if (testError) {
        console.error("❌ Events table permission test failed:", testError);
        throw testError;
      }
      console.log("✅ Events table access OK");

      // Create event as DRAFT
      console.log("🚀 Creating event as DRAFT...");
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert(eventPayload)
        .select("id, title, slug, status")
        .single();

      
      if (!event?.id) throw new Error("Failed to create event - no ID returned");

      console.log("✅ Draft event created successfully:", event);

      // CRITICAL FIX: Save ticket tiers to separate ticketTiers table
      console.log(`📋 Creating ${ticketTiers.length} ticket tiers in ticketTiers table...`);
      
      // Update tiers with the actual event ID
      const tiersWithEventId = tiersToInsert.map(tier => ({
        ...tier,
        event_id: event.id
      }));

      try {
        // Check if ticketTiers table exists and is accessible
        console.log("🔍 Checking ticketTiers table...");
        const { error: tableCheckError } = await supabase
          .from("ticketTiers")
          .select("id")
          .limit(1);
        
        if (tableCheckError) {
          console.error("❌ ticketTiers table check failed:", tableCheckError);
          throw new Error(`ticketTiers table not accessible: ${tableCheckError.message}`);
        }
        
        console.log("✅ ticketTiers table accessible, inserting tiers...");
        
        // Insert into ticketTiers table
        const { data: insertedTiers, error: tiersError } = await supabase
          .from("ticketTiers")
          .insert(tiersWithEventId)
          .select("id, tier_name, event_id");
        
        if (tiersError) {
          console.error("❌ Failed to insert into ticketTiers table:", tiersError);
          throw new Error(`Failed to create ticket tiers: ${tiersError.message}`);
        }
        
        console.log("✅ Ticket tiers created in ticketTiers table:", insertedTiers);
        
        // Also save to events.ticketTiers column for backup/compatibility
        try {
          const ticketTiersForEventsColumn = tiersWithEventId.map(tier => ({
            id: tier.event_id + "-" + tier.tier_name.toLowerCase().replace(/\s+/g, '-'),
            name: tier.tier_name,
            price: tier.price,
            description: tier.description,
            quantity_available: tier.quantity_total,
            quantity_sold: 0,
            is_active: true
          }));
          
          const { error: updateEventError } = await supabase
            .from("events")
            .update({ ticketTiers: ticketTiersForEventsColumn })
            .eq("id", event.id);
          
          if (updateEventError) {
            console.warn("⚠️ Could not update events.ticketTiers column:", updateEventError.message);
          } else {
            console.log("✅ Also saved to events.ticketTiers column");
          }
        } catch (columnErr) {
          console.warn("⚠️ Error updating events.ticketTiers column:", columnErr);
        }
        
      } catch (tiersErr: any) {
        console.error("💥 Critical: Failed to create ticket tiers:", tiersErr);
        // Delete the event since ticket tiers failed
        await supabase.from("events").delete().eq("id", event.id);
        throw new Error(`Failed to create ticket tiers: ${tiersErr.message}`);
      }

      // Ask user if they want to publish
      const shouldPublish = window.confirm(
        "Draft event created successfully!\n\nWould you like to publish it now?\n\n" +
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
          setSuccess(true);
        } else {
          console.log("✅ Event published successfully!");
          setSuccess(true);
        }
      } else {
        console.log("📝 Keeping event as draft");
        setSuccess(true);
        setError(""); // Clear any previous error
      }

      // Navigate to edit page
      setTimeout(() => {
        navigate(`/organizer/event/${event.id}/edit`);
      }, 1500);

    } catch (err: any) {
      console.error("💥 ERROR in event creation:", err);
      
      // Clean up error message
      let userMessage = err.message || "Failed to create event. Please try again.";
      
      // Handle specific database errors
      if (err.code) {
        switch (err.code) {
          case "23505":
            userMessage = "An event with similar title already exists. Try changing the title slightly.";
            break;
          case "42501":
            userMessage = "Permission denied. Please make sure you have organizer permissions.";
            break;
          case "42703":
            if (err.message?.includes("ticketTiers")) {
              userMessage = "Ticket tiers table has schema issues. Please contact support.";
            } else {
              userMessage = `Database column error: ${err.message}.`;
            }
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
      
      // Handle RLS errors
      if (err.message?.includes("violates row-level security policy")) {
        userMessage = "Permission denied. Check your RLS policies and organizer permissions.";
      }
      
      // Handle network errors
      if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        userMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setError(userMessage);
      
    } finally {
      setLoading(false);
      console.log("=== EVENT CREATION PROCESS ENDED ===");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:z-auto`}>
        <Sidebar role="organizer" />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-2 rounded-lg hover:bg-white/10"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Create Event</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">

          <main className="p-6 lg:p-10 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Create New Event</h1>
                <p className="text-gray-400">Fill in the details to launch your event</p>
              </div>
              <div className="flex gap-2">
                
              </div>
            </div>

            {success && (
              <div className="mb-8 p-6 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center gap-4 text-green-300">
                <CheckCircle size={32} />
                <div>
                  <p className="font-bold">Event Created Successfully!</p>
                  <p className="text-sm">Redirecting to events page...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-8 p-6 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-4 text-red-300">
                <AlertCircle size={32} />
                <div>
                  <p className="font-bold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Banner & Basic Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Banner Upload */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-3 block">Event Banner *</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50"
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
                          className="w-full h-64 object-cover rounded-xl"
                        />
                        <button
                          onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full transition"
                        >
                          <X size={18} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 py-8">
                        <ImageIcon size={48} className="mx-auto text-gray-500" />
                        <p className="text-white font-medium">Drop image or click to upload</p>
                        <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Type */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-4 block">Event Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEventType("physical")}
                      className={`py-3 px-4 rounded-lg text-center transition ${eventType === "physical" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      Physical
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType("virtual")}
                      className={`py-3 px-4 rounded-lg text-center transition ${eventType === "virtual" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      Virtual
                    </button>
                  </div>

                  {eventType === "virtual" && (
                    <div className="mt-4">
                      <label className="text-white font-medium mb-2 block">Virtual Link *</label>
                      <input
                        type="url"
                        value={virtualLink}
                        onChange={(e) => setVirtualLink(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                  )}
                </div>

                {/* Event Flags */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-4 block">Event Features</label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-white">
                      <span>Featured Event</span>
                      <input
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => setFeatured(e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white">
                      <span>Trending</span>
                      <input
                        type="checkbox"
                        checked={trending}
                        onChange={(e) => setTrending(e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white">
                      <span>New Event</span>
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={(e) => setIsNew(e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white">
                      <span>Sponsored</span>
                      <input
                        type="checkbox"
                        checked={sponsored}
                        onChange={(e) => setSponsored(e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column - Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="text-white font-medium mb-2 block">Event Title *</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Afro Nation 2025"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block flex items-center gap-2">
                          <Calendar size={18} /> Date *
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white"
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">Time *</label>
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white"
                          required
                        />
                        <p className="text-gray-500 text-sm mt-1">Required field</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">
                        <Tag size={18} className="inline mr-2" />
                        Category *
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full px-5 py-4 bg-gray-800/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/60"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block flex items-center gap-2">
                        <MapPin size={18} /> Venue *
                      </label>
                      <input
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="e.g. Eko Hotel & Suites, Lagos"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block">City</label>
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Lagos"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">State</label>
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="Lagos State"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">Country</label>
                        <input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block">Full Address</label>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onBlur={geocodeAddressOnBlur}
                        placeholder="Plot 1415, Ahmadu Bello Way, Victoria Island"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                      />
                      <p className="text-gray-500 text-sm mt-1">
                        {geocoding ? "Finding coordinates..." : "Address will be used to get coordinates"}
                      </p>
                    </div>

                    {/* Coordinates Section */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-white font-medium flex items-center gap-2">
                          <Map size={18} /> Coordinates (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={getCurrentLocation}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-sm transition"
                            disabled={geocoding}
                          >
                            <Navigation size={14} />
                            Use My Location
                          </button>
                          <label className="flex items-center gap-2 text-sm text-gray-400">
                            <input
                              type="checkbox"
                              checked={manualCoordinates}
                              onChange={toggleManualCoordinates}
                              className="w-4 h-4 accent-purple-500"
                            />
                            Manual Entry
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-300 text-sm mb-1 block">Latitude</label>
                          <input
                            type="number"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            step="0.000001"
                            min="-90"
                            max="90"
                            placeholder="e.g., 6.5244"
                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white"
                            disabled={!manualCoordinates}
                          />
                        </div>
                        <div>
                          <label className="text-gray-300 text-sm mb-1 block">Longitude</label>
                          <input
                            type="number"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            step="0.000001"
                            min="-180"
                            max="180"
                            placeholder="e.g., 3.3792"
                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white"
                            disabled={!manualCoordinates}
                          />
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm mt-2">
                        {manualCoordinates 
                          ? "Enter coordinates manually (e.g., Lagos: 6.5244, 3.3792)" 
                          : "Coordinates will be auto-generated from address"}
                      </p>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Tell attendees what to expect at your event..."
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Ticket Tiers */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Ticket Tiers</h2>
                    <button
                      onClick={addTicketTier}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition"
                    >
                      <Plus size={20} /> Add Tier
                    </button>
                  </div>

                  <p className="text-gray-400 text-sm mb-4">
                    Ticket tiers will be saved to the database. At least one tier is required.
                  </p>

                  <div className="space-y-4">
                    {ticketTiers.map((tier) => (
                      <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-6 relative">
                        {ticketTiers.length > 1 && (
                          <button
                            onClick={() => removeTicketTier(tier.id)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-400 transition"
                          >
                            <X size={20} />
                          </button>
                        )}

                        <div className="space-y-4">
                          <div>
                            <label className="text-white font-medium mb-2 block">Tier Name *</label>
                            <input
                              value={tier.name}
                              onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                              placeholder="e.g., VIP, Early Bird, General Admission"
                              className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-500"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-white font-medium mb-2 block flex items-center gap-2">
                                <DollarSign size={16} /> Price (₦) *
                              </label>
                              <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => updateTier(tier.id, "price", e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-3 bg-white/10 rounded-lg text-white"
                              />
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block flex items-center gap-2">
                                <Users size={16} /> Quantity *
                              </label>
                              <input
                                type="number"
                                value={tier.quantity}
                                onChange={(e) => updateTier(tier.id, "quantity", e.target.value)}
                                placeholder="100"
                                min="1"
                                className="w-full px-4 py-3 bg-white/10 rounded-lg text-white"
                              />
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block">Description</label>
                              <input
                                value={tier.description}
                                onChange={(e) => updateTier(tier.id, "description", e.target.value)}
                                placeholder="What's included in this tier"
                                className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags & Contact */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">Additional Details</h2>

                  <div className="space-y-6">
                    {/* Tags */}
                    <div>
                      <label className="text-white font-medium mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-2"
                          >
                            #{tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-purple-400 hover:text-white"
                            >
                              <X size={14} />
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
                          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                        <button
                          onClick={addTag}
                          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block">Contact Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="contact@example.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">Contact Phone</label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleCreateEvent}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-5 rounded-2xl shadow-2xl transition transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Event...
                    </span>
                  ) : (
                    "Create Event"
                  )}
                </button>

                <p className="text-gray-500 text-sm text-center">
                  * Required fields
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}