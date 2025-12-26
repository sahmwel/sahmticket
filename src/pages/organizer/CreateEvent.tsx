// src/pages/organizer/CreateEvent.tsx
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { 
  Upload, X, Plus, CheckCircle, AlertCircle, 
  Calendar, MapPin, Image as ImageIcon, Menu, 
  Tag, Globe, DollarSign, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

// Helper function to generate slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export default function CreateEvent() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
const [time, setTime] = useState("18:00"); // Set a default time  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [venue, setVenue] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [description, setDescription] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: "1", name: "General Admission", price: "", description: "Standard access to the event", quantity: "100" }
  ]);

  // Flags
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [sponsored, setSponsored] = useState(false);

  // Additional fields
  const [eventType, setEventType] = useState("physical"); // "physical" or "virtual"
  const [virtualLink, setVirtualLink] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [tags, setTags] = useState<string[]>(["music", "concert"]);
  const [tagInput, setTagInput] = useState("");

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

      if (error) {
        console.error("Failed to load categories:", error);
        setError("Failed to load categories");
      } else {
        setCategories(data || []);
      }
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

  const handleBannerChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
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

  const addTicketTier = () => {
    setTicketTiers(prev => [...prev, { 
      id: Date.now().toString(), 
      name: "", 
      price: "", 
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      handleBannerChange(e.dataTransfer.files[0]);
    }
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


const handleCreateEvent = async () => {
  setError("");
  setSuccess(false);

  // Validation
  if (!title.trim() || !date || !venue.trim() || !categoryId) {
    setError("Title, Date, Venue, and Category are required");
    return;
  }

  setLoading(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please log in to create events");

    console.log("User ID:", session.user.id);

    // Upload banner image - with error handling
    let banner_url: string | null = null;
    if (bannerFile) {
      try {
        const ext = bannerFile.name.split(".").pop() || 'jpg';
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from("event-banners")
          .upload(fileName, bannerFile);
        
        if (uploadError) {
          console.error("Image upload failed, continuing without image:", uploadError);
          // Continue without image
        } else {
          const { data: urlData } = supabase.storage
            .from("event-banners")
            .getPublicUrl(fileName);
          banner_url = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error("Image upload error:", uploadErr);
        // Continue without image
      }
    }

    // Prepare ticket tiers
    const validTiers = ticketTiers.filter(t => t.name && t.price && t.quantity);
    const ticketTiersData = validTiers.map(tier => ({
      name: tier.name,
      price: parseFloat(tier.price) || 0,
      description: tier.description || "",
      quantity_available: parseInt(tier.quantity) || 0,
      quantity_sold: 0
    }));

    // Build event data with only essential fields
    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      date: time ? `${date}T${time}:00` : `${date}T00:00:00`,
      time: time || "00:00",
      venue: venue.trim(),
      location: address.trim() || null,
      image: banner_url,
      cover_image: banner_url,
      ticketTiers: ticketTiersData.length > 0 ? ticketTiersData : null,
      featured: featured || false,
      trending: trending || false,
      isnew: isNew || false,
      sponsored: sponsored || false,
      status: "draft",
      organizer_id: session.user.id, // CRITICAL: This must match auth.uid()
      slug: generateSlug(title.trim()),
      tags: tags.length > 0 ? tags : null,
      lat: null,
      lng: null,
      created_at: new Date().toISOString()
    };

    console.log("Inserting event data:", eventData);

    // Try to insert with error handling
    const { data: event, error: insertError } = await supabase
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      
      // Try minimal insert as fallback
      const minimalData = {
        title: title.trim(),
        category_id: categoryId,
        date: time ? `${date}T${time}:00` : `${date}T00:00:00`,
        time: time || "00:00",
        venue: venue.trim(),
        organizer_id: session.user.id,
        status: "draft"
      };
      
      console.log("Trying minimal insert:", minimalData);
      const { error: minimalError } = await supabase
        .from("events")
        .insert(minimalData);
      
      if (minimalError) {
        console.error("Minimal insert failed:", minimalError);
        
        // Check user's role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        console.log("User profile:", profile);
        
        if (profile && profile.role !== 'organizer') {
          throw new Error(`Only organizers can create events. Your role is: ${profile.role}`);
        }
        
        throw new Error(`RLS Policy Violation: ${minimalError.message}`);
      }
      
      // If minimal insert worked, get the event ID and update
      const { data: createdEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (createdEvents && createdEvents[0]) {
        await supabase
          .from("events")
          .update({
            description: description.trim() || null,
            location: address.trim() || null,
            image: banner_url,
            cover_image: banner_url,
            ticketTiers: ticketTiersData.length > 0 ? ticketTiersData : null,
            featured,
            trending,
            isnew: isNew,
            sponsored,
            slug: generateSlug(title.trim()),
            tags: tags.length > 0 ? tags : null
          })
          .eq("id", createdEvents[0].id);
      }
    }

    console.log("Event created successfully");
    setSuccess(true);
    
    setTimeout(() => {
      navigate("/organizer/events");
    }, 1500);

  } catch (err: any) {
    console.error("Error creating event:", err);
    
    // User-friendly error messages
    if (err.message.includes("violates row-level security policy")) {
      setError("Permission denied. Please make sure you're logged in and have organizer permissions.");
    } else if (err.message.includes("Only organizers can create events")) {
      setError(err.message);
    } else if (err.message.includes("StorageApiError")) {
      setError("Failed to upload image. Please try a different image or continue without one.");
    } else {
      setError(err.message || "Failed to create event. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};
  // Test RLS function
  const testRLS = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please log in first");
      return;
    }

    const testData = {
      title: "RLS Test Event",
      category_id: 1,
      date: new Date().toISOString(),
      venue: "Test Venue",
      organizer_id: session.user.id,
      status: "draft"
    };

    const { error } = await supabase
      .from("events")
      .insert(testData);

    if (error) {
      alert(`RLS Error: ${error.message}\n\nCheck if organizer_id column exists and RLS policies are set.`);
      console.error("RLS Test Error:", error);
    } else {
      alert("RLS Test: Insert succeeded! Cleaning up...");
      // Clean up
      await supabase
        .from("events")
        .delete()
        .eq("title", "RLS Test Event");
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
              <button
                onClick={testRLS}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
              >
                Test RLS
              </button>
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
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50"}`}
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
                        placeholder="Plot 1415, Ahmadu Bello Way, Victoria Island"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                      />
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