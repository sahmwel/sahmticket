// src/pages/organizer/EditEvent.tsx
import Sidebar from "../../components/Sidebar";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Upload, X, Plus, CheckCircle, AlertCircle, Calendar, MapPin, Image as ImageIcon, Menu, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

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
  const [description, setDescription] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load event data
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      try {
        // Load categories
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");

        setCategories(cats || []);

        // Load event
        const { data: event, error: evErr } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .eq("organizer_id", session.user.id)
          .single();

        if (evErr || !event) throw new Error("Event not found");

        setTitle(event.title);
        setDate(event.date.split("T")[0]);
        setTime(event.date.split("T")[1] || "");
        setVenue(event.venue);
        setAddress(event.address || "");
        setDescription(event.description || "");
        setCategoryId(event.category_id || "");
        setBannerPreview(event.banner_url || null);

        // Load ticket tiers
        const { data: tiers } = await supabase
          .from("ticket_tiers")
          .select("id, ticket_type, price, description, quantity_available, quantity_sold")
          .eq("event_id", id);

        if (tiers && tiers.length > 0) {
          setTicketTiers(
            tiers.map(t => ({
              id: t.id,
              name: t.ticket_type,
              price: t.price.toString(),
              description: t.description || "",
              quantity: t.quantity_available.toString(),
              quantity_sold: t.quantity_sold || 0,
            }))
          );
        } else {
          setTicketTiers([{ id: "1", name: "", price: "", description: "", quantity: "" }]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, navigate]);

  const handleBannerChange = (file: File) => {
    if (file && file.type.startsWith("image/") && file.size < 5 * 1024 * 1024) {
      setBannerFile(file);
      const url = URL.createObjectURL(file);
      setBannerPreview(url);
      setError("");
    } else {
      setError("Invalid image (max 5MB)");
    }
  };

  const addTicketTier = () => {
    setTicketTiers(prev => [...prev, { id: Date.now().toString(), name: "", price: "", description: "", quantity: "" }]);
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
    if (e.dataTransfer.files[0]) handleBannerChange(e.dataTransfer.files[0]);
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    if (!title.trim() || !date || !venue.trim() || categoryId === "") {
      setError("Title, Date, Venue, and Category are required");
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      let banner_url: string | null = bannerPreview;

      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        const fileName = `${session.user.id}/edit_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event-banners")
          .upload(fileName, bannerFile, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("event-banners").getPublicUrl(fileName);
        banner_url = urlData.publicUrl;
      }

      // Update event
      const { error: evErr } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          date: date + (time ? `T${time}` : ""),
          venue: venue.trim(),
          address: address.trim() || null,
          description: description.trim() || null,
          banner_url,
          category_id: categoryId,
        })
        .eq("id", id);

      if (evErr) throw evErr;

      // Delete old tiers and add new ones
      await supabase.from("ticket_tiers").delete().eq("event_id", id);

      const validTiers = ticketTiers.filter(t => t.name && t.price && t.quantity);
      if (validTiers.length > 0) {
        const { error: tierErr } = await supabase.from("ticket_tiers").insert(
          validTiers.map(t => ({
            event_id: id,
            ticket_type: t.name,
            price: Number(t.price),
            description: t.description || null,
            quantity_available: Number(t.quantity),
            quantity_sold: t.quantity_sold || 0,
          }))
        );
        if (tierErr) throw tierErr;
      }

      setSuccess(true);
      setTimeout(() => navigate(`/organizer/event/${id}`), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
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
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:static md:z-auto`}>
        <Sidebar role="organizer" />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <button onClick={() => setSidebarOpen(true)} className="text-white p-2 rounded-lg hover:bg-white/10">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Edit Event</h1>
          <button onClick={() => navigate(-1)} className="text-white flex items-center gap-2">
            <ArrowLeft size={20} /> Back
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-6 lg:p-10 max-w-5xl mx-auto">
            <div className="mb-10 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-3">Edit Event</h1>
                <p className="text-gray-400">Update your event information</p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="hidden md:flex items-center gap-2 text-gray-400 hover:text-white"
              >
                <ArrowLeft size={20} /> Back
              </button>
            </div>

            {success && (
              <div className="mb-8 p-6 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center gap-4 text-green-300">
                <CheckCircle size={32} />
                <div>
                  <p className="font-bold">Event Updated!</p>
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
              {/* Banner */}
              <div className="lg:col-span-1">
                <label className="text-white font-medium mb-3 block">Event Banner</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20"}`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleBannerChange(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {bannerPreview ? (
                    <div className="relative">
                      <img src={bannerPreview} alt="Banner" className="w-full h-64 object-cover rounded-xl" />
                      <button
                        onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full"
                      >
                        <X size={18} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon size={48} className="mx-auto text-gray-500" />
                      <p className="text-white font-medium">Drop new banner or click</p>
                      <p className="text-gray-500 text-sm">Max 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="text-white font-medium mb-2 block">Event Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white font-medium mb-2 block flex items-center gap-2">
                      <Calendar size={18} /> Date *
                    </label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="text-white font-medium mb-2 block">Time</label>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white" />
                  </div>
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-5 py-4 bg-gray-800/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/60 appearance-none"
                    style={{ backgroundImage: "none" }}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-gray-900 text-white">
                        {cat.name}
                      </option>
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
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Address</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none"
                  />
                </div>

                {/* Ticket Tiers */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Ticket Tiers</h3>
                  {ticketTiers.map((tier) => (
                    <div key={tier.id} className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4 relative">
                      {ticketTiers.length > 1 && (
                        <button onClick={() => removeTicketTier(tier.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-400">
                          <X size={20} />
                        </button>
                      )}
                      <input
                        value={tier.name}
                        onChange={(e) => updateTier(tier.id, "name", e.target.value)}
                        placeholder="Tier name"
                        className="w-full mb-3 px-4 py-3 bg-white/10 rounded-lg text-white"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input value={tier.price} onChange={(e) => updateTier(tier.id, "price", e.target.value)} placeholder="Price (₦)" className="px-4 py-3 bg-white/10 rounded-lg text-white" />
                        <input value={tier.quantity} onChange={(e) => updateTier(tier.id, "quantity", e.target.value)} placeholder="Quantity" type="number" className="px-4 py-3 bg-white/10 rounded-lg text-white" />
                        <input value={tier.description} onChange={(e) => updateTier(tier.id, "description", e.target.value)} placeholder="Description" className="px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-500" />
                      </div>
                    </div>
                  ))}
                  <button onClick={addTicketTier} className="flex items-center gap-2 text-purple-400 hover:text-purple-300">
                    <Plus size={20} /> Add Tier
                  </button>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-5 rounded-2xl shadow-2xl transition transform hover:scale-105 disabled:opacity-60"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}