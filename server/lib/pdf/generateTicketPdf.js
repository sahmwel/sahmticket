import PDFDocument from "pdfkit";
import QRCode from "qrcode";

/**
 * Generate ticket PDF with each ticket in its own box with QR code
 * @param {Object} data
 * @returns {Promise<Buffer>}
 */
export async function generateTicketPdf(data) {
  return new Promise(async (resolve, reject) => {
    try {
      // ===== Validate input =====
      if (!data || typeof data !== "object") {
        throw new Error("data must be a valid object");
      }

      const requiredFields = ["eventTitle", "eventDate", "eventTime", "eventVenue", "name"];
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      if (!data.tickets || !Array.isArray(data.tickets) || data.tickets.length === 0) {
        throw new Error("data.tickets must be a non-empty array");
      }

      const doc = new PDFDocument({ size: "A4", margin: 50 });
const chunks = [];

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ===== EVENT HEADER =====
      doc.fontSize(22).fillColor("#7c3aed").text("Sahm Ticket Hub", { align: "center" });
      doc.moveDown(0.5).fontSize(16).fillColor("#111827").text(data.eventTitle, { align: "center" });
      doc.moveDown(1.5);

      // ===== EVENT DETAILS =====
      doc.fontSize(12).fillColor("#334155");
      doc.text(`Name: ${data.name}`);
      doc.text(`Date: ${data.eventDate}`);
      doc.text(`Time: ${data.eventTime}`);
      doc.text(`Venue: ${data.eventVenue}`);
      doc.moveDown(1.5);

      // ===== TICKETS =====
      for (const ticket of data.tickets) {
        const ticketType = ticket.ticketType || "GENERAL";
        const quantity = Number(ticket.quantity) || 1;
        const amount = ticket.amount || "FREE";

        let codes = Array.isArray(ticket.codes) ? ticket.codes.slice(0, quantity) : [];
        if (codes.length === 0) {
          codes = Array.from({ length: quantity }, (_, i) => `TKT-${Date.now()}-${i + 1}`);
        }

        for (const code of codes) {
          if (code.length > 500) continue;

          const boxX = 50;
          const boxY = doc.y;
          const boxWidth = 495;
          const boxHeight = 180;

          // Draw ticket box
          doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 10)
            .lineWidth(1)
            .strokeColor("#e2e8f0")
            .stroke();

          // ===== Generate QR code buffer =====
          const qrBuffer = await QRCode.toBuffer(code, {
            errorCorrectionLevel: "M",
            type: "png",
            margin: 2,
            width: 120,
            color: { dark: "#000000", light: "#FFFFFF" }
          });

          // Draw QR code inside PDF
          doc.image(qrBuffer, boxX + 20, boxY + 20, { width: 120, height: 120 });

          // Ticket info
          const infoX = boxX + 160;
          let infoY = boxY + 30;

          doc.fontSize(14).fillColor("#1e293b").text(`Ticket Type: ${ticketType}`, infoX, infoY);
          infoY += 25;
          doc.fontSize(12).fillColor("#475569").text(`Quantity: 1 of ${quantity}`, infoX, infoY);
          infoY += 20;
          doc.text(`Amount: ${amount}`, infoX, infoY);
          infoY += 20;
          doc.fontSize(13).fillColor("#7c3aed").text(`Code: ${code}`, infoX, infoY);

          doc.y = boxY + boxHeight + 30;

          // Add new page if needed
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
        }
      }

      // ===== FOOTER =====
      doc.moveDown(2)
        .fontSize(10)
        .fillColor("#64748b")
        .text("This ticket is non-transferable. Present this ticket or QR code at the entrance.", {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
