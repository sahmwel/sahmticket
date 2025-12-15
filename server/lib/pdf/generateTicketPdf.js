import PDFDocument from "pdfkit";
import qr from "qr-image";
import axios from "axios";

/**
 * Generate ticket PDF with each ticket in its own box with QR code
 * @param {Object} data
 * @returns {Promise<Buffer>}
 */
export async function generateTicketPdf(data) {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate input data
      if (!data || typeof data !== 'object') {
        throw new Error('data must be a valid object');
      }
      
      const requiredFields = ['eventTitle', 'eventDate', 'eventTime', 'eventVenue', 'name'];
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const watermarkUrl = "https://sahmtickethub.online/logo-white.png";

      // Load watermark image
      let watermarkBuffer;
      try {
        const response = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
        watermarkBuffer = response.data;
      } catch (err) {
        console.warn("Could not load watermark:", err.message);
      }

      const drawWatermark = () => {
        if (!watermarkBuffer) return;
        const { width, height } = doc.page;
        doc.save();
        doc.rotate(-45, { origin: [width / 2, height / 2] });
        doc.opacity(0.1);
        doc.image(watermarkBuffer, width / 4, height / 2 - 100, { width: width / 2 });
        doc.opacity(1);
        doc.restore();
      };

      drawWatermark();
      doc.on("pageAdded", drawWatermark);

      // ===== EVENT HEADER =====
      doc.fontSize(22).fillColor("#7c3aed").text("Sahm Ticket Hub", { align: "center" });
      doc.moveDown(0.5).fontSize(16).fillColor("#111827").text(data.eventTitle, { align: "center" });
      doc.moveDown(1.5);

      // ===== EVENT POSTER (optional) =====
      if (data.eventPosterUrl) {
        try {
          const response = await axios.get(data.eventPosterUrl, { responseType: "arraybuffer" });
          doc.image(response.data, { fit: [500, 250], align: "center", valign: "center" });
          doc.moveDown(1.5);
        } catch (err) {
          console.warn("Could not load event poster:", err.message);
        }
      }

      // ===== EVENT DETAILS =====
      doc.fontSize(12).fillColor("#334155");
      doc.text(`Name: ${data.name}`);
      doc.text(`Date: ${data.eventDate}`);
      doc.text(`Time: ${data.eventTime}`);
      doc.text(`Venue: ${data.eventVenue}`);
      doc.moveDown(1.5);

      // ===== TICKETS =====
      if (!data.tickets || !Array.isArray(data.tickets) || data.tickets.length === 0) {
        console.error('Invalid tickets data:', data.tickets);
        throw new Error('data.tickets must be a non-empty array');
      }

      for (const ticket of data.tickets) {
        if (!ticket?.codes || !Array.isArray(ticket.codes) || ticket.codes.length === 0) {
          console.warn('Skipping invalid ticket:', ticket);
          continue;
        }

        for (let i = 0; i < ticket.codes.length; i++) {
          const code = ticket.codes[i];
          if (!code) continue;

          // Start ticket box
          const boxX = 50;
          const boxY = doc.y;
          const boxWidth = 495;
          const boxHeight = 180;

          // Draw rounded rectangle
          doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 10)
             .strokeColor("#e2e8f0")
             .lineWidth(1)
             .stroke();

          // QR Code
          const qrPng = qr.imageSync(code, { type: "png", margin: 1, size: 6 });
          doc.image(qrPng, boxX + 20, boxY + 30, { width: 120, height: 120 });

          // Ticket info
          const infoX = boxX + 160;
          let infoY = boxY + 30;
          doc.fontSize(14).fillColor("#1e293b").text(`Ticket Type: ${ticket.ticketType || 'N/A'}`, infoX, infoY);
          infoY += 22;
          doc.fontSize(12).fillColor("#475569").text(`Quantity: ${ticket.quantity || 1}`, infoX, infoY);
          infoY += 18;
          doc.text(`Amount: ${ticket.amount || 'N/A'}`, infoX, infoY);
          infoY += 18;
          doc.fillColor("#7c3aed").text(`Code: ${code}`, infoX, infoY);

          // Move cursor below the box
          doc.y = boxY + boxHeight + 20;

          // Add page if needed
          if (doc.y > 650) doc.addPage();
        }
      }

      // ===== FOOTER =====
      doc.moveDown(2)
         .fontSize(10)
         .fillColor("#64748b")
         .text(
           "This ticket is non-transferable. Present this ticket or QR code at the entrance.",
           { align: "center" }
         );

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}
