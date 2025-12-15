export interface SendEmailOptions {
  to: string;
  type: string;
  data: any;
  fromAccountKey?: string;
}

export declare function sendEmail(options: SendEmailOptions): Promise<void>;
