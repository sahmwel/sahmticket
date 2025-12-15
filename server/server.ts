import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import { sendEmail } from "./lib/emailTemplates/sendEmail.js";
import { generateTicketPdf } from "./lib/pdf/generateTicketPdf.js";  // ✅ Only this

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "🚀 Email + PDF API running ✅" });
});

// 🚀 Generate PDF
app.post("/api/tickets/generate-pdf", async (req: Request, res: Response) => {
  try {
    const { name, eventTitle, eventDate, eventTime, eventVenue, tickets } = req.body;

    if (!eventTitle || !tickets) {
      return res.status(400).json({ error: "Missing eventTitle or tickets" });
    }

    const pdfBuffer = await generateTicketPdf({
      name: name || "Customer",
      eventTitle,
      eventDate,
      eventTime: eventTime || "TBC",
      eventVenue: eventVenue || "TBC",
      tickets
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="sahm-ticket-${Date.now()}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (error: unknown) {  // ✅ Proper typing
    console.error("PDF Error:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "PDF generation failed" });
    }
  }
});

// 🚀 Email + PDF Combo
app.post("/api/tickets/send-with-pdf", async (req: Request, res: Response) => {
  try {
    const { to, name, eventTitle, eventDate, eventTime, eventVenue, tickets, orderId } = req.body;

    // 1. Generate PDF
    const pdfBuffer = await generateTicketPdf({
      name,
      eventTitle,
      eventDate,
      eventTime,
      eventVenue,
      tickets
    });

    // 2. Send HTML email + PDF (sendEmail handles attachments internally now)
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
        orderId  // 👈 Pass orderId for filename
      }
    });

    res.json({ 
      success: true, 
      message: "✅ Ticket PDF generated + emailed automatically!",
      pdfSize: `${(pdfBuffer.length / 1024).toFixed(1)} KB`
    });
  } catch (error: unknown) {  // ✅ FIXED: proper error handling
    console.error("Email+PDF Error:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Email+PDF failed" });  // ✅ FIXED
    }
  }
});

// 🚀 QR Validation
app.post("/api/tickets/validate", async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    const [eventId, ticketType] = qrData.split("|");
    const isValid = qrData.includes("RAEXp") || qrData.includes("TKT");
    
    res.json({ 
      valid: isValid,
      eventId,
      ticketType,
      scannedAt: new Date().toISOString()
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Validation failed" });
    }
  }
});

// Original email route
app.post("/send-email", async (req: Request, res: Response) => {
  try {
    const { to, type, data, fromAccountKey } = req.body;

    if (!to || !type || !data) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: 'to', 'type', or 'data'",
      });
    }

    await sendEmail({ to, type, data, fromAccountKey });
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error: unknown) {
    console.error("Email Error:", error);
    if (error instanceof Error) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Unknown error" });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 TicketHub API on port ${PORT}`));
