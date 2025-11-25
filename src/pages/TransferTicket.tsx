// src/components/TransferTicket.tsx
import { useState } from "react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";

export default function TransferTicket({ ticketId }: { ticketId: string }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;

    // In real app: call your backend → invalidate old ticket → send new one
    setDone(true);
    setTimeout(() => {
      alert(`Ticket transferred to ${name} (${phone})! They’ll get it on WhatsApp in seconds.`);
    }, 500);
  };

  if (done) {
    return (
      <div className="text-center p-10 bg-green-50 rounded-3xl">
        <div className="text-6xl mb-4">Transferred successfully</div>
        <p className="text-xl">Your friend just received their ticket on WhatsApp!</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8">
      <h2 className="text-3xl font-black mb-6 text-center">Transfer Ticket</h2>
      <form onSubmit={handleTransfer} className="space-y-6">
        <input
          type="text"
          placeholder="Friend's full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-6 py-4 rounded-2xl border border-gray-300 focus:border-purple-600 focus:outline-none text-lg"
        />
        <input
          type="tel"
          placeholder="Friend's phone (e.g. 08012345678)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-6 py-4 rounded-2xl border border-gray-300 focus:border-purple-600 focus:outline-none text-lg"
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-5 rounded-2xl text-xl hover:scale-105 transition shadow-xl"
        >
          Send Ticket via WhatsApp
        </button>
      </form>
      <p className="text-center mt-6 text-gray-600">
        Your original ticket will be cancelled automatically.
      </p>
    </div>
  );
}