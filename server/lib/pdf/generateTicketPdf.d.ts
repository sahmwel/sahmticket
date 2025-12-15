// server/lib/pdf/generateTicketPdf.d.ts
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

export declare function generateTicketPdf(data: TicketData): Promise<Buffer>;
