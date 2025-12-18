// Fix for shared hosting memory limit (CloudLinux LVE) — disable WebAssembly in undici
process.env.UNDICI_NO_WASM = "1";

import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Horizon } from "@stellar/stellar-sdk";
import { sendEmail } from "./lib/emailTemplates/sendEmail.js";
import { generateTicketPdf } from "./lib/pdf/generateTicketPdf.js";

// ------------------------
// Environment Validation
// ------------------------
const requiredEnv = ["SUPABASE_URL", "SUPABASE_KEY"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT) || 5000;
const STELLAR_ACCOUNT = process.env.STELLAR_ACCOUNT?.trim();

// ------------------------
// Supabase Client
// ------------------------
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// ------------------------
// Stellar Polling (Optional)
// ------------------------
if (STELLAR_ACCOUNT) {
  const stellarServer = new Horizon.Server("https://horizon.stellar.org");

  async function pollStellarPayments(accountId: string) {
    if (!accountId) return;

    try {
      const payments = await stellarServer
        .payments()
        .forAccount(accountId)
        .limit(20)
        .order("desc")
        .call();

      for (const op of payments.records) {
        // Type guard for payment operations
        if (op.type === "payment" && op.to === accountId) {
          // Manual interface for payment fields (current SDK)
          const payment = op as {
            transaction_hash: string;
            amount: string;
            asset_type: "native" | "credit_alphanum4" | "credit_alphanum12";
            asset_code?: string;
            asset_issuer?: string;
            from: string;
          };

          const asset = payment.asset_type === "native"
            ? "XLM"
            : `${payment.asset_code}:${payment.asset_issuer}`;

          const { error } = await supabase
            .from("tickets")
            .update({
              status: "confirmed",
              tx_hash: payment.transaction_hash,
              payment_amount: payment.amount,
              payment_asset: asset,
              confirmed_at: new Date().toISOString(),
            })
            .eq("payment_account", payment.from)
            .eq("status", "pending"); // Prevent double confirmation

          if (error) {
            console.error("Supabase update error:", error.message);
          } else {
            console.log(`✅ Ticket confirmed — tx: ${payment.transaction_hash} (${payment.amount} ${asset})`);
          }
        }
      }
    } catch (err) {
      console.error("Stellar polling error:", err instanceof Error ? err.message : String(err));
    }
  }

  // Poll every 60 seconds + initial poll
  setInterval(() => pollStellarPayments(STELLAR_ACCOUNT!), 60_000);
  pollStellarPayments(STELLAR_ACCOUNT!).catch(console.error);
}

// ------------------------
// Express App
// ------------------------
const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "🚀 TicketHub API running with Stellar + Supabase ✅",
    timestamp: new Date().toISOString(),
    stellarPolling: !!STELLAR_ACCOUNT,
  });
});

// Generate PDF
app.post("/api/tickets/generate-pdf", async (req: Request, res: Response) => {
  try {
    const { name, eventTitle, eventDate, eventTime, eventVenue, tickets } = req.body;

    if (!eventTitle || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: "Missing or invalid eventTitle/tickets" });
    }

    const pdfBuffer = await generateTicketPdf({
      name: (name as string)?.trim() || "Customer",
      eventTitle: eventTitle.trim(),
      eventDate,
      eventTime: eventTime || "TBC",
      eventVenue: eventVenue || "TBC",
      tickets,
    });

    const filename = `sahm-ticket-${eventTitle.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "PDF generation failed" });
  }
});

// Email + PDF Combo
app.post("/api/tickets/send-with-pdf", async (req: Request, res: Response) => {
  try {
    const { to, name, eventTitle, eventDate, eventTime, eventVenue, tickets, orderId } = req.body;

    if (!to || !eventTitle || !tickets || !Array.isArray(tickets)) {
      return res.status(400).json({ error: "Missing required fields (to, eventTitle, tickets)" });
    }

    const pdfBuffer = await generateTicketPdf({ name, eventTitle, eventDate, eventTime, eventVenue, tickets });

    await sendEmail({
      to,
      type: "ticket",
      data: {
        name,
        eventTitle,
        eventDate,
        eventTime,
        eventVenue,
        ticketCode: orderId || tickets[0]?.codes?.[0] || "TKT123",
        ticketType: tickets[0]?.ticketType || "GENERAL",
        quantity: tickets[0]?.quantity || 1,
        amount: tickets[0]?.amount || "FREE",
        orderId,
      },
    });

    res.json({
      success: true,
      message: "✅ Ticket PDF generated and emailed successfully!",
      pdfSizeKB: Number((pdfBuffer.length / 1024).toFixed(1)),
    });
  } catch (error) {
    console.error("Email+PDF Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Email+PDF failed" });
  }
});

// QR Validation
app.post("/api/tickets/validate", async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    if (!qrData || typeof qrData !== "string") {
      return res.status(400).json({ error: "Invalid or missing qrData" });
    }

    const isValid = qrData.includes("RAEXp") || qrData.includes("TKT");
    const parts = qrData.split("|");
    const eventId = parts[0] || null;
    const ticketType = parts[1] || null;

    res.json({
      valid: isValid,
      eventId,
      ticketType,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("QR Validation Error:", error);
    res.status(500).json({ error: "Validation failed" });
  }
});

// General email
app.post("/send-email", async (req: Request, res: Response) => {
  try {
    const { to, type, data, fromAccountKey } = req.body;
    if (!to || !type || !data) {
      return res.status(400).json({ error: "Missing required fields: to, type, data" });
    }

    await sendEmail({ to, type, data, fromAccountKey });
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Email failed" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TicketHub API running on port ${PORT}`);
  console.log(`Health check: https://api.sahmtickethub.online/`);
  if (STELLAR_ACCOUNT) {
    console.log(`Stellar polling enabled for account: ${STELLAR_ACCOUNT}`);
  }
});