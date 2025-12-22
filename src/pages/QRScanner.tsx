// src/pages/QRScanner.tsx
'use client';

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../lib/supabaseClient";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface ScanResult {
  message: string;
  status: "success" | "error";
  ticketInfo?: {
    buyerName?: string | null;
    ticketType: string;
    price: number;
  };
}

interface QRScannerProps {
  onScan?: (result: ScanResult) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const scannedTickets = useRef<Set<string>>(new Set());

  useEffect(() => {
const scanner = new Html5QrcodeScanner(
  "qr-reader",
  { fps: 10, qrbox: 250, disableFlip: true } as any, // <- bypass TS check
  false
);


    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner.clear().catch(() => console.warn("Failed to clear scanner"));
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (scannedTickets.current.has(decodedText)) return;
    scannedTickets.current.add(decodedText);

    try {
      const [eventId, tierName] = decodedText.split("|");

      if (!eventId || !tierName) {
        const res: ScanResult = { status: "error", message: "Invalid QR code" };
        addResult(res);
        onScan?.(res);
        return;
      }

      // Fetch ticket from Supabase
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", eventId)
        .eq("ticket_type", tierName)
        .eq("qr_code_url", decodedText)
        .single();

      if (error || !ticket) {
        const res: ScanResult = { status: "error", message: "Ticket not found" };
        addResult(res);
        onScan?.(res);
        return;
      }

      if (ticket.used) {
        const res: ScanResult = { status: "error", message: "Ticket already used" };
        addResult(res);
        onScan?.(res);
        return;
      }

      // Mark ticket as used
      await supabase
        .from("tickets")
        .update({ used: true })
        .eq("id", ticket.id);

      const res: ScanResult = {
        status: "success",
        message: `Ticket valid ✅ (${ticket.ticket_type})`,
        ticketInfo: {
          buyerName: ticket.buyer_name || ticket.buyer_id || "Guest",
          ticketType: ticket.ticket_type,
          price: ticket.price,
        },
      };

      addResult(res);
      onScan?.(res);
    } catch (err) {
      console.error("Scan error:", err);
      const res: ScanResult = { status: "error", message: "Failed to process ticket" };
      addResult(res);
      onScan?.(res);
    } finally {
      // Allow rescans after 3 seconds
      setTimeout(() => scannedTickets.current.delete(decodedText), 3000);
    }
  };

  const onScanError = (errorMessage: string) => {
    console.warn("QR scan error:", errorMessage);
  };

  const addResult = (result: ScanResult) => {
    setScanResults(prev => [result, ...prev.slice(0, 4)]);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* QR Reader */}
      <div id="qr-reader" className="w-full max-w-md mx-auto"></div>

      {/* Scan Results */}
      <div className="w-full max-w-md mx-auto mt-4 space-y-2">
        {scanResults.map((result, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 p-3 rounded-xl ${
              result.status === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.status === "success" ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
              <span className="font-semibold">{result.message}</span>
            </div>

            {result.status === "success" && result.ticketInfo && (
              <div className="text-sm text-gray-700 pl-8">
                <p><strong>Buyer:</strong> {result.ticketInfo.buyerName}</p>
                <p><strong>Ticket:</strong> {result.ticketInfo.ticketType}</p>
                <p><strong>Price:</strong> ₦{result.ticketInfo.price}</p>
              </div>
            )}
          </div>
        ))}

        {scanResults.length === 0 && (
          <div className="flex items-center justify-center text-purple-600 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> Scanning...
          </div>
        )}
      </div>
    </div>
  );
}
