// src/pages/organizer/CreateEvent.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Upload, X, Plus, CheckCircle, AlertCircle, Calendar, MapPin, Image as ImageIcon, Menu } from "lucide-react";
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

export default function CreateEvent() {
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
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: "1", name: "General Admission", price: "", description: "", quantity: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ← Mobile toggle
  const navigate = useNavigate();

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) {
        console.error(error);
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
    if (file && file.type.startsWith("image/") && file.size < 5 * 1024 * 1024) {
      setBannerFile(file);
      setError("");
    } else {
      setError("Invalid image or too large (max 5MB)");
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

  const handleCreateEvent = async () => {
    setError("");
    setSuccess(false);

    if (!title.trim() || !date || !venue.trim() || !categoryId) {
      setError("Title, Date, Venue, and Category are required");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      let banner_url: string | null = null;
      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        const fileName = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event-banners")
          .upload(fileName, bannerFile, { upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("event-banners").getPublicUrl(fileName);
        banner_url = urlData.publicUrl;
      }

      const { data: event, error: evErr } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          date: time ? `${date}T${time}` : date,
          venue: venue.trim(),
          address: address.trim() || null,
          description: description.trim() || null,
          banner_url,
          category_id: categoryId,
          organizer_id: session.user.id,
          status: "draft"
        })
        .select()
        .single();

      if (evErr) throw evErr;

      const validTiers = ticketTiers.filter(t => t.name && t.price && t.quantity);
      if (validTiers.length > 0) {
        await supabase.from("ticket_tiers").insert(
          validTiers.map(t => ({
            event_id: event.id,
            ticket_type: t.name,
            price: Number(t.price),
            description: t.description || null,
            quantity_available: Number(t.quantity),
            quantity_sold: 0,
          }))
        );
      }

      setSuccess(true);
      setTimeout(() => navigate("/organizer/events"), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar - Mobile Slide In */}
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
          <button onClick={() => setSidebarOpen(true)} className="text-white p-2 rounded-lg hover:bg-white/10">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Create Event</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <Navbar role="organizer" />

          <main className="p-6 lg:p-10 max-w-5xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-3">Create New Event</h1>
            <p className="text-gray-400 mb-10">Fill in the details to launch your event</p>

            {success && (
              <div className="mb-8 p-6 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center gap-4 text-green-300">
                <CheckCircle size={32} />
                <div>
                  <p className="font-bold">Event Created!</p>
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
                <label className="text-white font-medium mb-3 block">Event Banner *</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                    dragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20"
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
                      <img src={bannerPreview} alt="Preview" className="w-full h-64 object-cover rounded-xl" />
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
                      <p className="text-white font-medium">Drop image or click</p>
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
                    placeholder="e.g. Afro Nation 2025"
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

                {/* CATEGORY — NOW DARK & VISIBLE */}
                <div>
                  <label className="text-white font-medium mb-2 block">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-5 py-4 bg-gray-800/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/60 appearance-none"
                    style={{ backgroundImage: "none" }} // removes default arrow
                  >
                    <option value="" className="bg-gray-900 text-white">Select category</option>
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
                    placeholder="e.g. Eko Hotel"
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Address (optional)</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Lagos Street..."
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-white font-medium mb-2 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Tell people why they should come..."
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
                  <button onClick={addTicketTier} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium">
                    <Plus size={20} /> Add Tier
                  </button>
                </div>

                <button
                  onClick={handleCreateEvent}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-5 rounded-2xl shadow-2xl transition transform hover:scale-105 disabled:opacity-60"
                >
                  {loading ? "Creating Event..." : "Create Event"}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}