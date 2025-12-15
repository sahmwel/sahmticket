// server/types.d.ts
declare module "./lib/pdf/generateTicketPdf.js" {
  export interface TicketData {
    name: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventVenue: string;
    tickets: Array<{
      ticketType: string;
      quantity: number;
      amount: string;
      codes: string[];
    }>;
  }
  
  export function generateTicketPdf(data: TicketData): Promise<Buffer>;
}
