'use client';

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CreditCard, Mail, User, Loader2, Ticket, ArrowLeft, 
  CheckCircle, Smartphone, Building2 
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePaystackPayment } from "react-paystack";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const eventId = searchParams.get("event") || "";
  const ticketType = decodeURIComponent(searchParams.get("type") || "");
  const priceStr = decodeURIComponent(searchParams.get("price") || "");
  const qty = parseInt(searchParams.get("qty") || "1", 10);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const cleanPrice = parseInt(priceStr.replace(/[^0-9]/g, "") || "0", 10);
  const totalAmount = cleanPrice * qty;

  const formattedTotal = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(totalAmount);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const config = {
    reference: `THUB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    email: formData.email || "customer@tickethub.ng",
    amount: totalAmount * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxxxxxxxxxx",
    channels: [
      "card",
      "bank_transfer",
      "ussd",
      "mobile_money",
      "qr",
      "bank",
      "opay",
      "payattitude",
    ],
    metadata: {
      custom_fields: [
        { display_name: "Event ID", variable_name: "event_id", value: eventId },
        { display_name: "Ticket Type", variable_name: "ticket_type", value: ticketType },
        { display_name: "Quantity", variable_name: "quantity", value: qty },
        { display_name: "Customer Name", variable_name: "customer_name", value: formData.fullName },
        { display_name: "Phone", variable_name: "phone", value: formData.phone },
      ],
    },
  };

  const onSuccess = (reference: any) => {
    const orderId = reference.reference;

    navigate(`/bag/${orderId}`, {
      state: {
        eventId,
        ticketType,
        quantity: qty,
        totalPaid: priceStr,
        customer: formData,
        paymentRef: reference.reference,
        status: "paid",
        method: reference.channel || "card",
      },
    });
  };
  
  const onClose = () => {
    setLoading(false);
  };

  const initializePayment = usePaystackPayment(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      alert("Please enter a valid email");
      return;
    }

    setLoading(true);
    initializePayment({ onSuccess, onClose });
  };

  if (!eventId || !ticketType || !priceStr || totalAmount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 mb-4">Invalid Ticket</p>
          <Link to="/events" className="text-purple-600 underline">Back to Events</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ONLY CHANGE: This fixes sticky navbar overlap */}
      <div className="pt-24 lg:pt-28">

        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <Link to={`/event/${eventId}`} className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-6">
                <ArrowLeft size={20} /> Back to Event
              </Link>
              <h1 className="text-5xl font-black text-gray-900">Checkout</h1>
              <p className="text-2xl text-gray-700 mt-3">{ticketType}</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">

              {/* Form */}
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Your Details</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <User size={18} /> Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                      placeholder="Chinedu Okonkwo"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Mail size={18} /> Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                      placeholder="chinedu@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Smartphone size={18} /> Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                      placeholder="08012345678"
                      required
                    />
                  </div>

                  {/* Payment Methods Preview */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 text-center">
                    <p className="text-sm font-medium text-gray-700 mb-4">Pay with any method</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-xl"><CreditCard className="mx-auto mb-1 text-purple-600" size={28} /><span className="text-xs font-bold">Card</span></div>
                      <div className="bg-white p-3 rounded-xl"><Building2 className="mx-auto mb-1 text-purple-600" size={28} /><span className="text-xs font-bold">Bank</span></div>
                      <div className="bg-white p-3 rounded-xl"><Smartphone className="mx-auto mb-1 text-purple-600" size={28} /><span className="text-xs font-bold">USSD / OPay</span></div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl py-5 rounded-xl shadow-lg hover:shadow-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        Opening Paystack...
                      </>
                    ) : (
                      <>
                        <CreditCard size={24} />
                        Pay {formattedTotal} Now
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>

              {/* Order Summary */}
              <motion.div  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-2xl p-8 sticky top-6">
                <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
                <div className="space-y-5 text-lg">
                  <div className="flex justify-between"><span className="text-gray-600">Ticket</span><span className="font-bold">{ticketType}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Quantity</span><span className="font-bold">{qty} ticket{qty > 1 ? "s" : ""}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Price</span><span className="font-bold">{priceStr}</span></div>
                  <div className="border-t-2 border-dashed border-gray-300 pt-5">
                    <div className="flex justify-between text-2xl font-black">
                      <span>Total</span>
                      <span className="text-purple-600">{formattedTotal}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Card, Bank, USSD, OPay, PayAttitude</div>
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Instant QR ticket delivery</div>
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 100% secure via Paystack</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}