// src/pages/FAQ.tsx
'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Ticket,
  Calendar,
  CreditCard,
  Shield,
  MessageCircle,
  HelpCircle,
  Zap,
  Users,
  Clock,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ElementType;
}

const faqs: FAQItem[] = [
  {
    question: "How do I buy tickets?",
    answer:
      "Browse events → Pick your vibe → Choose ticket type & quantity → Enter your details → Pay securely with card or transfer → Get your e-ticket instantly via email & WhatsApp.",
    icon: Ticket,
  },
  {
    question: "Can I create my own event?",
    answer:
      "Yes! Click “Create Event” → Fill in details → Upload fire photos → Set your prices → Publish and start selling instantly. It’s 100% free to create!",
    icon: Calendar,
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "All Nigerian cards (Verve, Visa, MasterCard), bank transfers, USSD, and mobile money. Powered by Paystack — 100% secure and trusted.",
    icon: CreditCard,
  },
  {
    question: "Are my tickets secure?",
    answer:
      "Every ticket has a unique QR code. No fakes. No duplicates. Bank-level encryption. Your data stays private — always.",
    icon: Shield,
  },
  {
    question: "What’s your refund policy?",
    answer:
      "Full refund if the event is cancelled. For no-shows or change of plans, refunds depend on the organizer’s policy — always shown on the event page.",
    icon: Clock,
  },
  {
    question: "How fast do organizers get paid?",
    answer:
      "Within 24 hours after the event ends. No delays. No stories. Straight to their bank account.",
    icon: Zap,
  },
  {
    question: "I have a problem with my ticket — help!",
    answer:
      "We’re here 24/7. Chat with us instantly on WhatsApp (+234 703 565 1109) or email hello@sahmtickethub.online — we reply in minutes, not days.",
    icon: MessageCircle,
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-24 lg:py-32 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight">
            Got Questions?
          </h1>
          <p className="text-2xl md:text-3xl text-gray-700 font-medium">
            We’ve got answers — fast, clear, and real.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-6">
          {faqs.map((faq, index) => {
            const Icon = faq.icon;
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden border border-purple-100"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-8 py-7 flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Icon size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 pr-4">
                      {faq.question}
                    </h3>
                  </div>
                  <ChevronDown
                    size={32}
                    className={`text-purple-600 transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    } group-hover:scale-110`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-8 pt-2">
                        <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Still Need Help? */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-20 p-12 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 rounded-3xl text-white text-center shadow-2xl"
        >
          <HelpCircle size={64} className="mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Still Have Questions?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-95">
            Talk to a real human because we reply in minutes, not days
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-md mx-auto">
            <a
              href="https://wa.me/2347035651109"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-purple-600 font-black text-lg py-5 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <MessageCircle size={24} />
              Chat on WhatsApp
            </a>
            <a
              href="mailto:hello@sahmtickethub.online"
              className="bg-black/30 backdrop-blur-lg font-bold text-lg py-5 px-10 rounded-2xl hover:bg-black/50 transition-all border border-white/20"
            >
              Email Us
            </a>
          </div>

          <p className="mt-8 text-lg opacity-90">
            We’re here 24/7 no bots, just vibes
          </p>
        </motion.div>
      </div>
    </div>
  );
}