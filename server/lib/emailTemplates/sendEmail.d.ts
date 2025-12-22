import type { Buffer } from "buffer";

export interface SendEmailOptions {
  to: string;
  type: string;
  data: any;
  fromAccountKey?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export declare function sendEmail(options: SendEmailOptions): Promise<void>;
