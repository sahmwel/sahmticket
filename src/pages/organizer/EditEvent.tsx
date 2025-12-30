// src/pages/organizer/EditEvent.tsx
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { 
  Upload, X, Plus, CheckCircle, AlertCircle, 
  Calendar, MapPin, Image as ImageIcon, Menu,
  Tag, Globe, DollarSign, Users, Save,
  ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";

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
  quantity_sold?: number;
}

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: "1", name: "General Admission", price: "", description: "", quantity: "" }
  ]);

  // Flags
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [sponsored, setSponsored] = useState(false);

  // Additional fields
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [originalEvent, setOriginalEvent] = useState<any>(null);

  // Load event data
  useEffect(() => {
    if (!id) return;

    const loadEvent = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        // Fetch event
        const { data: event, error: eventError } = await supabase
          .from('events')
.select(`
  *,
  ticketTiers_event_id_fkey (*)   // <-- use the exact relationship name
`)

          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();

        if (eventError) throw eventError;
        if (!event) {
          toast.error("Event not found or you don't have permission to edit it");
          navigate("/organizer/events");
          return;
        }

        setOriginalEvent(event);

        // Populate form fields
        setTitle(event.title || "");
        
        if (event.date) {
          const dateObj = new Date(event.date);
          setDate(dateObj.toISOString().split('T')[0]);
          const hours = dateObj.getHours().toString().padStart(2, '0');
          const minutes = dateObj.getMinutes().toString().padStart(2, '0');
          setTime(`${hours}:${minutes}`);
        }
        
        setVenue(event.venue || "");
        setAddress(event.location || "");
        setCity(event.city || "");
        setState(event.state || "");
        setCountry(event.country || "Nigeria");
        setDescription(event.description || "");
        setExistingBanner(event.image || event.cover_image);
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

        // Set ticket tiers
        if (event.ticketTiers && Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0) {
          const tiers: TicketTier[] = event.ticketTiers.map((tier: any, index: number) => ({
            id: index.toString(),
            name: tier.name || "",
            price: tier.price?.toString() || "",
            description: tier.description || "",
            quantity: tier.quantity_available?.toString() || "0",
            quantity_sold: tier.quantity_sold || 0
          }));
          setTicketTiers(tiers);
        }

      } catch (err: any) {
        console.error("Error loading event:", err);
        toast.error("Failed to load event data");
        navigate("/organizer/events");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, navigate]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Failed to load categories:", error);
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

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    // Validation
    if (!title.trim() || !date || !venue.trim() || !categoryId) {
      setError("Title, Date, Venue, and Category are required");
      return;
    }

    if (eventType === "virtual" && !virtualLink.trim()) {
      setError("Virtual link is required for online events");
      return;
    }

    const validTiers = ticketTiers.filter(t => t.name && t.price && t.quantity);
    if (validTiers.length === 0) {
      setError("At least one valid ticket tier is required");
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in to edit events");

      let banner_url = existingBanner;
      
      // Upload new banner if selected
      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-banners")
          .upload(fileName, bannerFile, { 
            upsert: true,
            cacheControl: '3600'
          });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("event-banners")
          .getPublicUrl(fileName);
        banner_url = urlData.publicUrl;
      }

      // Prepare ticket tiers
      const ticketTiersData = validTiers.map(tier => {
        const existingTier = originalEvent?.ticketTiers?.find((t: any) => t.name === tier.name);
        return {
          name: tier.name,
          price: parseFloat(tier.price) || 0,
          description: tier.description || "",
          quantity_available: parseInt(tier.quantity) || 0,
          quantity_sold: existingTier?.quantity_sold || 0
        };
      });

      // Build update data
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        date: time ? `${date}T${time}:00` : `${date}T00:00:00`,
        time: time || "00:00",
        venue: venue.trim(),
        location: address.trim() || null,
        image: banner_url,
        cover_image: banner_url,
        ticketTiers: ticketTiersData,
        featured,
        trending,
        isnew: isNew,
        sponsored,
        event_type: eventType,
        virtual_link: eventType === "virtual" ? virtualLink.trim() : null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || "Nigeria",
        tags: tags.length > 0 ? tags : null,
        slug: generateSlug(title.trim()),
        updated_at: new Date().toISOString()
      };

      // Update event
      const { error: updateError } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .eq("organizer_id", session.user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success("Event updated successfully!");
      
      setTimeout(() => {
        navigate("/organizer/events");
      }, 1500);

    } catch (err: any) {
      console.error("Error updating event:", err);
      setError(err.message || "Failed to update event");
      toast.error("Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const publishEvent = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ 
          status: "published",
          published_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Event published successfully!");
      setSuccess(true);
      
      setTimeout(() => {
        navigate("/organizer/events");
      }, 1500);
    } catch (err: any) {
      toast.error("Failed to publish event: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:static md:z-auto`}>
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
          <h1 className="text-xl font-bold text-white">Edit Event</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">

          <main className="p-6 lg:p-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
              <div>
                <button
                  onClick={() => navigate("/organizer/events")}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
                >
                  <ArrowLeft size={20} />
                  Back to Events
                </button>
                <h1 className="text-4xl font-bold text-white">Edit Event</h1>
                <p className="text-gray-400">Update your event details</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/event/${id}`)}
                  className="px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition"
                >
                  Preview
                </button>
                <button
                  onClick={publishEvent}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition"
                >
                  Publish Now
                </button>
              </div>
            </div>

            {success && (
              <div className="mb-8 p-6 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center gap-4 text-green-300">
                <CheckCircle size={32} />
                <div>
                  <p className="font-bold">Event Updated Successfully!</p>
                  <p className="text-sm">Redirecting...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-8 p-6 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-4 text-red-300">
                <AlertCircle size={32} />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Banner & Basic Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Banner Upload */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-3 block">Event Banner</label>
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
                    
                    {(bannerPreview || existingBanner) ? (
                      <div className="relative">
                        <img 
                          src={bannerPreview || existingBanner || ""} 
                          alt="Preview" 
                          className="w-full h-64 object-cover rounded-xl" 
                        />
                        <button
                          onClick={() => { 
                            setBannerFile(null); 
                            setBannerPreview(null);
                            setExistingBanner(null);
                          }}
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

                {/* Quick Stats */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-medium mb-4">Event Status</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Current Status</p>
                      <div className={`px-4 py-2 rounded-lg inline-block mt-1 ${
                        originalEvent?.status === "published" 
                          ? "bg-green-500/20 text-green-300" 
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}>
                        {originalEvent?.status?.toUpperCase() || "DRAFT"}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Created</p>
                      <p className="text-white">
                        {originalEvent?.created_at ? new Date(originalEvent.created_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Last Updated</p>
                      <p className="text-white">
                        {originalEvent?.updated_at 
                          ? new Date(originalEvent.updated_at).toLocaleDateString() 
                          : "Never"}
                      </p>
                    </div>
                  </div>
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
                          
                          {tier.quantity_sold !== undefined && (
                            <div className="text-sm text-gray-400">
                              {tier.quantity_sold} tickets sold
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-5 rounded-2xl shadow-2xl transition transform hover:scale-105 disabled:opacity-60 flex items-center justify-center gap-3"
                  >
                    <Save size={22} />
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                  
                  <button
                    onClick={() => navigate("/organizer/events")}
                    className="px-8 py-5 border border-white/20 text-white rounded-2xl hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}