export type EmailAccountKey = "noreply" | "info" | "hello";

export interface EmailAccount {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
}

export const emailAccounts: Record<EmailAccountKey, EmailAccount> = {
  noreply: {
    user: process.env.EMAIL_NOREPLY_USER!,
    pass: process.env.EMAIL_NOREPLY_PASS!,
    host: process.env.EMAIL_SERVER || "mail.privateemail.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
  },
  info: {
    user: process.env.EMAIL_INFO_USER!,
    pass: process.env.EMAIL_INFO_PASS!,
    host: process.env.EMAIL_SERVER || "mail.privateemail.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
  },
  hello: {
    user: process.env.EMAIL_HELLO_USER!,
    pass: process.env.EMAIL_HELLO_PASS!,
    host: process.env.EMAIL_SERVER || "mail.privateemail.com",
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
  },
};
