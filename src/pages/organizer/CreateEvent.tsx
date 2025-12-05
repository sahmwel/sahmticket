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
}

export default function CreateEvent() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { name: "", price: "", description: "" },
  ]);
  const [message, setMessage] = useState("");

  // Fetch categories dynamically
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (!error && data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleAddTicketTier = () => {
    setTicketTiers([...ticketTiers, { name: "", price: "", description: "" }]);
  };

  const handleTicketChange = (index: number, field: keyof TicketTier, value: string) => {
    const updated = [...ticketTiers];
    updated[index][field] = value;
    setTicketTiers(updated);
  };

  const handleCreate = async () => {
    setMessage("");
    const organizer_id = supabase.auth.user()?.id;
    if (!organizer_id) return setMessage("You must be logged in!");
    if (!title || !date || !time || !venue || !categoryId)
      return setMessage("Please fill in all required fields");

    let banner_url = null;
    if (bannerFile) {
      const fileExt = bannerFile.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("event-banners")
        .upload(fileName, bannerFile);
      if (uploadError) return setMessage("Image upload failed: " + uploadError.message);
      const { publicUrl } = supabase.storage.from("event-banners").getPublicUrl(fileName);
      banner_url = publicUrl;
    }

    // Insert event
    const { data: eventData, error } = await supabase.from("events").insert([
      {
        title,
        date,
        time,
        venue,
        description,
        banner_url,
        category_id: categoryId,
        organizer_id,
        address,
      },
    ]).select().single();

    if (error) return setMessage(error.message);

    // Insert tickets for this event
    for (const tier of ticketTiers) {
      if (tier.name && tier.price) {
        await supabase.from("tickets").insert([
          {
            event_id: eventData.id,
            ticket_type: tier.name,
            price: parseFloat(tier.price.replace(/[^0-9.-]+/g,"")),
            qr_code_url: null, // generate later
          },
        ]);
      }
    }

    setMessage("Event created successfully!");
    setTitle("");
    setDate("");
    setTime("");
    setVenue("");
    setAddress("");
    setDescription("");
    setBannerFile(null);
    setCategoryId(null);
    setTicketTiers([{ name: "", price: "", description: "" }]);
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

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full mb-2 p-3 rounded-xl"
          />

          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full mb-2 p-3 rounded-xl"
          />

          <input
            value={venue}
            onChange={e => setVenue(e.target.value)}
            placeholder="Venue"
            className="w-full mb-2 p-3 rounded-xl"
          />

          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Address"
            className="w-full mb-2 p-3 rounded-xl"
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Event Description"
            className="w-full mb-2 p-3 rounded-xl"
          />

          <input
            type="file"
            accept="image/*"
            onChange={e => setBannerFile(e.target.files?.[0] || null)}
            className="w-full mb-2 p-3 rounded-xl text-white bg-white/10"
          />

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
                value={tier.description}
                onChange={e => handleTicketChange(index, "description", e.target.value)}
                placeholder="Description"
                className="w-full mb-1 p-2 rounded-xl"
              />
            </div>
          ))}
          <button
            onClick={handleAddTicketTier}
            className="mb-4 bg-blue-600 text-white px-3 py-1 rounded-xl"
          >
            + Add Ticket Tier
          </button>

          <button
            onClick={handleCreate}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl"
          >
            Create Event
          </button>

          {message && <p className="text-yellow-300 mt-2">{message}</p>}
        </main>
      </div>
    </div>
  );
}
