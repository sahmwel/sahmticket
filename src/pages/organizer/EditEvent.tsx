// src/pages/organizer/EditEvent.tsx
import Sidebar from "../../components/Sidebar";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { 
  Upload, X, Plus, CheckCircle, AlertCircle, 
  Calendar, MapPin, Image as ImageIcon, Menu,
  Tag, Globe, DollarSign, Users, Save,
  ArrowLeft, Loader2, Eye
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

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

interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  location?: string;
  city?: string;
  state?: string;
  country: string;
  description?: string;
  image?: string;
  cover_image?: string;
  category_id?: number;
  featured: boolean;
  trending: boolean;
  isnew: boolean;
  sponsored: boolean;
  event_type: string;
  virtual_link?: string;
  contact_email?: string;
  contact_phone?: string;
  tags: string[];
  status: string;
  ticketTiers?: any[];
  created_at?: string;
  updated_at?: string;
  slug?: string;
}

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Form state
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
    { id: "1", name: "General Admission", price: "", description: "", quantity: "100" }
  ]);

  // Feature flags
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

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [originalEvent, setOriginalEvent] = useState<EventData | null>(null);
  const [eventStatus, setEventStatus] = useState("draft");

  // Memoized functions
  const generateSlug = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }, []);

  const getRemainingTickets = useCallback((tier: TicketTier) => {
    const total = parseInt(tier.quantity) || 0;
    const sold = tier.quantity_sold || 0;
    return total - sold;
  }, []);

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

        // Populate form fields
        setTitle(event.title || "");
        
        if (event.date) {
          const dateObj = new Date(event.date);
          setDate(dateObj.toISOString().split('T')[0]);
          
          if (event.time) {
            setTime(event.time);
          } else {
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
          }
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

        // Load ticket tiers
        let tiers: TicketTier[] = [];
        
        // 1. Check JSONB column
        if (event.ticketTiers && Array.isArray(event.ticketTiers)) {
          tiers = event.ticketTiers.map((tier: any, index: number) => ({
            id: tier.id || `tier-${index}`,
            name: tier.name || tier.tier_name || "",
            price: tier.price?.toString() || "0",
            description: tier.description || "",
            quantity: tier.quantity_available?.toString() || tier.quantity_total?.toString() || tier.quantity?.toString() || "100",
            quantity_sold: tier.quantity_sold || 0
          }));
        }
        
        // 2. Check separate table
        if (tiers.length === 0) {
          const { data: tiersData } = await supabase
            .from("ticketTiers")
            .select("*")
            .eq("event_id", id);

          if (tiersData && tiersData.length > 0) {
            tiers = tiersData.map((tier: any, index: number) => ({
              id: tier.id || `tier-${index}`,
              name: tier.tier_name || tier.name || "",
              price: tier.price?.toString() || "0",
              description: tier.description || "",
              quantity: tier.quantity_total?.toString() || tier.quantity?.toString() || "100",
              quantity_sold: tier.quantity_sold || 0
            }));
          }
        }
        
        // 3. Use default if still empty
        if (tiers.length === 0) {
          tiers = [{ id: "1", name: "General Admission", price: "", description: "", quantity: "100" }];
        }
        
        setTicketTiers(tiers);

      } catch (err: any) {
        toast.error("Failed to load event data");
        navigate("/organizer/my-events");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, navigate]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (data) {
        setCategories(data);
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

  // Event handlers
  const handleBannerChange = useCallback((file: File) => {
    if (file && file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large (max 5MB)");
        return;
      }
      setBannerFile(file);
      setError("");
    }
  }, []);

  const addTicketTier = useCallback(() => {
    setTicketTiers(prev => [...prev, { 
      id: Date.now().toString(), 
      name: "", 
      price: "", 
      description: "", 
      quantity: "100" 
    }]);
  }, []);

  const removeTicketTier = useCallback((id: string) => {
    if (ticketTiers.length > 1) {
      setTicketTiers(prev => prev.filter(t => t.id !== id));
    }
  }, [ticketTiers.length]);

  const updateTier = useCallback((id: string, field: keyof TicketTier, value: string | number) => {
    setTicketTiers(prev => prev.map(t => {
      if (t.id === id) {
        const updatedTier = { ...t };
        
        if (field === "quantity_sold") {
          updatedTier.quantity_sold = typeof value === "number" ? value : parseInt(value as string) || 0;
        } else if (field === "quantity") {
          const newQuantity = value as string;
          updatedTier.quantity = newQuantity;
          
          const newQuantityNum = parseInt(newQuantity) || 0;
          const currentSold = updatedTier.quantity_sold || 0;
          if (newQuantityNum < currentSold) {
            updatedTier.quantity_sold = newQuantityNum;
          }
        } else {
          updatedTier[field as keyof Omit<TicketTier, "id" | "quantity_sold">] = value as string;
        }
        
        return updatedTier;
      }
      return t;
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      handleBannerChange(e.dataTransfer.files[0]);
    }
  }, [handleBannerChange]);

  const addTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  // Save event
const handleSave = async () => {
  setError("");
  setSuccess(false);

  // Validation
  if (!title.trim()) {
    setError("Event title is required");
    return;
  }
  if (!date) {
    setError("Event date is required");
    return;
  }
  if (!venue.trim()) {
    setError("Venue is required");
    return;
  }

  const validTiers = ticketTiers.filter(t => t.name.trim() && t.price && parseInt(t.quantity) > 0);
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

    // Prepare ticket tiers data
    const ticketTiersData = validTiers.map(tier => {
      let quantity_sold = 0;
      let originalId = tier.id;
      
      // Preserve existing sales
      if (originalEvent?.ticketTiers && Array.isArray(originalEvent.ticketTiers)) {
        const existingTier = originalEvent.ticketTiers.find((t: any) => 
          t.id === tier.id || t.name?.toLowerCase() === tier.name.toLowerCase()
        );
        if (existingTier) {
          quantity_sold = existingTier.quantity_sold || 0;
          originalId = existingTier.id || tier.id;
        }
      }
      
      return {
        id: originalId,
        name: tier.name.trim(),
        tier_name: tier.name.trim(),
        price: parseFloat(tier.price) || 0,
        description: tier.description.trim() || "",
        quantity_total: parseInt(tier.quantity) || 100,
        quantity_sold: quantity_sold,
        is_active: true
      };
    });

    // Build update data
    const updateData: any = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      date: `${date}T${time || "00:00"}:00`,
      time: time || "00:00",
      venue: venue.trim(),
      location: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      country: country.trim() || "Nigeria",
      event_type: eventType,
      virtual_link: eventType === "virtual" ? virtualLink.trim() : null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      featured: featured,
      trending: trending,
      isnew: isNew,
      sponsored: sponsored,
      tags: tags.length > 0 ? tags : null,
      slug: generateSlug(title.trim()),
      updated_at: new Date().toISOString(),
      ticketTiers: ticketTiersData.map(tier => ({
        id: tier.id,
        name: tier.name,
        price: tier.price,
        description: tier.description,
        quantity_total: tier.quantity_total,
        quantity_sold: tier.quantity_sold,
        is_active: tier.is_active
      }))
    };

    // Update banner if changed
    if (banner_url) {
      updateData.image = banner_url;
      updateData.cover_image = banner_url;
    }

    // Update event
    const { error: updateError } = await supabase
      .from("events")
      .update(updateData)
      .eq("id", id)
      .eq("organizer_id", session.user.id);

    if (updateError) throw updateError;

    // Update ticket tiers table
   try {
  const { data: existingTiers } = await supabase
    .from("ticketTiers")
    .select("id, tier_name, quantity_sold")
    .eq("event_id", id);

  if (existingTiers) {
    // Update existing tiers
    for (const newTier of ticketTiersData) {
      const existingTier = existingTiers.find((et: { tier_name?: string; id: string }) => {
        // Safely compare tier names
        const existingTierName = et.tier_name?.toLowerCase();
        const newTierName = newTier.name.toLowerCase();
        return (existingTierName === newTierName) || et.id === newTier.id;
      });
      
      if (existingTier) {
        await supabase
          .from("ticketTiers")
          .update({
            tier_name: newTier.name.trim(),
            description: newTier.description.trim() || null,
            price: newTier.price,
            quantity_total: newTier.quantity_total,
            quantity_sold: existingTier.quantity_sold,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingTier.id);
      } else {
        await supabase
          .from("ticketTiers")
          .insert({
            event_id: id,
            tier_name: newTier.name.trim(),
            description: newTier.description.trim() || null,
            price: newTier.price,
            quantity_total: newTier.quantity_total,
            quantity_sold: 0,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }

    // Handle tier deletions
    const newTierNames = ticketTiersData.map(t => t.name.toLowerCase());
    const tiersToDelete = existingTiers.filter((et: { tier_name?: string; quantity_sold: number }) => {
      const tierName = et.tier_name?.toLowerCase();
      return !tierName || !newTierNames.includes(tierName);
    });
    
    for (const tierToDelete of tiersToDelete) {
      if (tierToDelete.quantity_sold === 0) {
        await supabase
          .from("ticketTiers")
          .delete()
          .eq("id", tierToDelete.id);
      } else {
        await supabase
          .from("ticketTiers")
          .update({ is_active: false })
          .eq("id", tierToDelete.id);
      }
    }
  } else {
    // Insert all as new
    await supabase
      .from("ticketTiers")
      .insert(
        ticketTiersData.map(tier => ({
          ...tier,
          event_id: id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      );
  }
} catch (err) {
  // Ticket tiers update failed silently - main event data is saved
}

    setSuccess(true);
    toast.success("Event updated successfully!");
    
    setTimeout(() => {
      navigate("/organizer/my-events");
    }, 1500);

  } catch (err: any) {
    setError(err.message || "Failed to update event");
    toast.error("Failed to update event");
  } finally {
    setSaving(false);
  }
};

  // Publish event
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

      setEventStatus("published");
      toast.success("Event published successfully!");
      
      setTimeout(() => {
        navigate("/organizer/my-events");
      }, 1500);
    } catch (err: any) {
      toast.error("Failed to publish event");
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
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:static md:z-auto`}>
        <Sidebar role="organizer" />
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="text-white p-2 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Edit Event</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-6 lg:p-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-4">
              <div>
                <button
                  onClick={() => navigate("/organizer/my-events")}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                  aria-label="Back to events"
                >
                  <ArrowLeft size={20} />
                  Back to Events
                </button>
                <h1 className="text-4xl font-bold text-white">Edit Event</h1>
                <p className="text-gray-400">Update your event details</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/event/${originalEvent?.slug || id}`)}
                  className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors"
                  aria-label="Preview event"
                >
                  <Eye size={18} />
                  Preview
                </button>
                {eventStatus === "draft" && (
                  <button
                    onClick={publishEvent}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                    aria-label="Publish event"
                  >
                    Publish Now
                  </button>
                )}
              </div>
            </div>

            {success && (
              <div className="mb-8 p-6 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center gap-4 text-green-300">
                <CheckCircle size={32} aria-hidden="true" />
                <div>
                  <p className="font-bold">Event Updated Successfully!</p>
                  <p className="text-sm">Redirecting...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-8 p-6 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center gap-4 text-red-300">
                <AlertCircle size={32} aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Banner & Sidebar Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Banner Upload */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-3 block">Event Banner</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                      dragActive 
                        ? "border-purple-500 bg-purple-500/10" 
                        : "border-white/20 hover:border-purple-500/50"
                    }`}
                    aria-label="Event banner upload area"
                  >
                    <input
                      type="file"
                      id="banner-upload"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleBannerChange(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      aria-label="Upload event banner"
                    />
                    
                    {(bannerPreview || existingBanner) ? (
                      <div className="relative">
                        <img 
                          src={bannerPreview || existingBanner || ""} 
                          alt="Event banner preview" 
                          className="w-full h-64 object-cover rounded-xl" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
                          }}
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => { 
                            setBannerFile(null); 
                            setBannerPreview(null);
                            setExistingBanner(null);
                          }}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full transition-colors"
                          aria-label="Remove banner"
                        >
                          <X size={18} className="text-white" />
                        </button>
                        <label 
                          htmlFor="banner-upload"
                          className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700 p-2 rounded-full transition-colors cursor-pointer"
                          aria-label="Change banner"
                        >
                          <Upload size={18} className="text-white" />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4 py-12">
                        <ImageIcon size={48} className="mx-auto text-gray-500" aria-hidden="true" />
                        <div>
                          <p className="text-white font-medium">Drop image or click to upload</p>
                          <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => document.getElementById('banner-upload')?.click()}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          Choose Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Status */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-medium mb-4">Event Status</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Current Status</p>
                      <div className={`px-4 py-2 rounded-lg inline-block mt-1 ${
                        eventStatus === "published" 
                          ? "bg-green-500/20 text-green-300" 
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}>
                        {eventStatus.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Created</p>
                      <p className="text-white">
                        {originalEvent?.created_at 
                          ? new Date(originalEvent.created_at).toLocaleDateString() 
                          : "N/A"}
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

                {/* Event Features */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-4 block">Event Features</label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-white cursor-pointer">
                      <span>Featured Event</span>
                      <input 
                        type="checkbox" 
                        checked={featured} 
                        onChange={(e) => setFeatured(e.target.checked)} 
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white cursor-pointer">
                      <span>Trending</span>
                      <input 
                        type="checkbox" 
                        checked={trending} 
                        onChange={(e) => setTrending(e.target.checked)} 
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white cursor-pointer">
                      <span>New Event</span>
                      <input 
                        type="checkbox" 
                        checked={isNew} 
                        onChange={(e) => setIsNew(e.target.checked)} 
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white cursor-pointer">
                      <span>Sponsored</span>
                      <input 
                        type="checkbox" 
                        checked={sponsored} 
                        onChange={(e) => setSponsored(e.target.checked)} 
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Event Type */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <label className="text-white font-medium mb-4 block">Event Type</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-white cursor-pointer">
                      <input 
                        type="radio" 
                        name="eventType" 
                        value="physical" 
                        checked={eventType === "physical"} 
                        onChange={(e) => setEventType(e.target.value)} 
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                      <span>Physical Event</span>
                    </label>
                    <label className="flex items-center gap-3 text-white cursor-pointer">
                      <input 
                        type="radio" 
                        name="eventType" 
                        value="virtual" 
                        checked={eventType === "virtual"} 
                        onChange={(e) => setEventType(e.target.value)} 
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                      <span>Virtual/Online Event</span>
                    </label>
                    {eventType === "virtual" && (
                      <div className="mt-3">
                        <label className="text-white font-medium mb-2 block">Virtual Link</label>
                        <input
                          value={virtualLink}
                          onChange={(e) => setVirtualLink(e.target.value)}
                          placeholder="https://meet.google.com/abc-defg-hij"
                          className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          aria-label="Virtual event link"
                        />
                      </div>
                    )}
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
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block flex items-center gap-2">
                          <Calendar size={18} aria-hidden="true" /> Date *
                        </label>
                        <input 
                          type="date" 
                          value={date} 
                          onChange={(e) => setDate(e.target.value)} 
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">Time *</label>
                        <input 
                          type="time" 
                          value={time} 
                          onChange={(e) => setTime(e.target.value)} 
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block">
                        <Tag size={18} className="inline mr-2" aria-hidden="true" />
                        Category
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block flex items-center gap-2">
                        <MapPin size={18} aria-hidden="true" /> Venue *
                      </label>
                      <input
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="e.g. Eko Hotel & Suites, Lagos"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block">City</label>
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Lagos"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">State</label>
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="Lagos State"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">Country</label>
                        <input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block">Full Address</label>
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Plot 1415, Ahmadu Bello Way, Victoria Island"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-white font-medium mb-2 block">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Tell attendees what to expect at your event..."
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white font-medium mb-2 block">Contact Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="contact@example.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-white font-medium mb-2 block">Contact Phone</label>
                        <input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="text-white font-medium mb-2 block">Tags</label>
                      <div className="flex gap-2 mb-3">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Add a tag..."
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          aria-label="Add tag"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          aria-label="Add tag"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="text-purple-400 hover:text-purple-200"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket Tiers */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Ticket Tiers</h2>
                    <button
                      type="button"
                      onClick={addTicketTier}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      aria-label="Add ticket tier"
                    >
                      <Plus size={20} aria-hidden="true" /> Add Tier
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {ticketTiers.map((tier) => (
                      <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-6 relative">
                        {ticketTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicketTier(tier.id)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${tier.name} tier`}
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
                              className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-white font-medium mb-2 block flex items-center gap-2">
                                <DollarSign size={16} aria-hidden="true" /> Price (₦) *
                              </label>
                              <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => updateTier(tier.id, "price", e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-3 bg-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block flex items-center gap-2">
                                <Users size={16} aria-hidden="true" /> Quantity *
                              </label>
                              <input
                                type="number"
                                value={tier.quantity}
                                onChange={(e) => updateTier(tier.id, "quantity", e.target.value)}
                                placeholder="100"
                                min="1"
                                className="w-full px-4 py-3 bg-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                              />
                              <div className="mt-2 text-sm">
                                <div className="text-gray-400">
                                  Sold: {tier.quantity_sold || 0} • Remaining: {getRemainingTickets(tier)}
                                </div>
                                {tier.quantity_sold !== undefined && tier.quantity_sold > 0 && (
                                  <div className="text-xs text-yellow-400 mt-1">
                                    ⚠️ {tier.quantity_sold} tickets already sold
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-white font-medium mb-2 block">Description</label>
                              <input
                                value={tier.description}
                                onChange={(e) => updateTier(tier.id, "description", e.target.value)}
                                placeholder="What's included in this tier"
                                className="w-full px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-5 rounded-2xl shadow-2xl transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    aria-label="Save changes"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={22} aria-hidden="true" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save size={22} aria-hidden="true" />
                        Save Changes
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate("/organizer/my-events")}
                    className="px-8 py-5 border border-white/20 text-white rounded-2xl hover:bg-white/10 transition-colors"
                    aria-label="Cancel and go back"
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