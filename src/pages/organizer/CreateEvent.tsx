// src/pages/organizer/CreateEvent.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Category {
  id: number;
  name: string;
}

interface TicketTier {
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
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([{ name: "", price: "", description: "", quantity: "" }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) console.error(error);
      else if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Update preview when banner changes
  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(bannerFile);
    setBannerPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [bannerFile]);

  const handleAddTicketTier = () => {
    setTicketTiers([...ticketTiers, { name: "", price: "", description: "", quantity: "" }]);
  };

  const handleTicketChange = (index: number, field: keyof TicketTier, value: string) => {
    const updated = [...ticketTiers];
    updated[index][field] = value;
    setTicketTiers(updated);
  };

  const handleBannerChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setBannerFile(file);
    } else {
      setMessage("Please upload a valid image file");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBannerChange(e.dataTransfer.files[0]);
    }
  };

  const handleCreate = async () => {
    setMessage("");
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in!");

      if (!title || !date || !time || !venue || !categoryId) {
        setMessage("Please fill in all required fields");
        setLoading(false);
        return;
      }

      let banner_url: string | null = null;
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("event-banners").upload(fileName, bannerFile);
        if (uploadError) throw new Error("Image upload failed: " + uploadError.message);
        const { data: { publicUrl } } = supabase.storage.from("event-banners").getPublicUrl(fileName);
        banner_url = publicUrl;
      }

      const { data: eventData, error: eventError } = await supabase.from("events")
        .insert([{
          title,
          date,
          time,
          venue,
          address,
          description,
          banner_url,
          category_id: categoryId,
          organizer_id: user.id,
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      for (const tier of ticketTiers) {
        if (tier.name && tier.price && tier.quantity) {
          await supabase.from("tickets").insert([{
            event_id: eventData.id,
            ticket_type: tier.name,
            price: parseFloat(tier.price.replace(/[^0-9.-]+/g,"")),
            description: tier.description,
            quantity: parseInt(tier.quantity, 10),
            qr_code_url: null,
          }]);
        }
      }

      setTitle("");
      setDate("");
      setTime("");
      setVenue("");
      setAddress("");
      setDescription("");
      setBannerFile(null);
      setBannerPreview(null);
      setCategoryId(null);
      setTicketTiers([{ name: "", price: "", description: "", quantity: "" }]);
      setMessage("Event created successfully!");
    } catch (err: any) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar role="organizer" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="organizer" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Create Event</h1>

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event Title"
            className="w-full mb-2 p-3 rounded-xl"
          />

          <select
            value={categoryId ?? ""}
            onChange={e => setCategoryId(Number(e.target.value))}
            className="w-full mb-2 p-3 rounded-xl"
          >
            <option value="">Select Category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mb-2 p-3 rounded-xl" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full mb-2 p-3 rounded-xl" />
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue" className="w-full mb-2 p-3 rounded-xl" />
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="w-full mb-2 p-3 rounded-xl" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Event Description" className="w-full mb-2 p-3 rounded-xl" />

          <label className="block mb-2 text-white font-medium">Event Banner</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full mb-2 p-6 rounded-xl border-2 border-dashed ${dragActive ? "border-blue-400" : "border-white/30"} text-center cursor-pointer`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={e => e.target.files && handleBannerChange(e.target.files[0])}
              className="hidden"
              id="bannerInput"
            />
            <label htmlFor="bannerInput" className="cursor-pointer text-white">
              {bannerFile ? "Change Banner" : "Drag & Drop Banner or Click to Upload"}
            </label>
          </div>
          {bannerPreview && <img src={bannerPreview} alt="Banner Preview" className="w-full mb-4 rounded-xl" />}

          <h2 className="text-xl font-semibold text-white mt-4 mb-2">Ticket Tiers</h2>
          {ticketTiers.map((tier, index) => (
            <div key={index} className="mb-2 p-3 border rounded-xl bg-white/10">
              <input
                value={tier.name}
                onChange={e => handleTicketChange(index, "name", e.target.value)}
                placeholder="Ticket Name"
                className="w-full mb-1 p-2 rounded-xl"
              />
              <input
                value={tier.price}
                onChange={e => handleTicketChange(index, "price", e.target.value)}
                placeholder="Price (₦)"
                className="w-full mb-1 p-2 rounded-xl"
              />
              <input
                value={tier.quantity}
                onChange={e => handleTicketChange(index, "quantity", e.target.value)}
                placeholder="Number of Tickets"
                className="w-full mb-1 p-2 rounded-xl"
              />
              <input
                value={tier.description}
                onChange={e => handleTicketChange(index, "description", e.target.value)}
                placeholder="Description"
                className="w-full mb-1 p-2 rounded-xl"
              />
            </div>
          ))}
          <button onClick={handleAddTicketTier} className="mb-4 bg-blue-600 text-white px-3 py-1 rounded-xl">
            + Add Ticket Tier
          </button>

          <button onClick={handleCreate} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded-xl disabled:opacity-50">
            {loading ? "Creating..." : "Create Event"}
          </button>

          {message && <p className="text-yellow-300 mt-2">{message}</p>}
        </main>
      </div>
    </div>
  );
}
