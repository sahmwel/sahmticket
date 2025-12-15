export type EmailAccountKey = "noreply" | "info" | "hello";
export interface EmailAccount {
    user: string;
    pass: string;
    host: string;
    port: number;
    secure: boolean;
}
export declare const emailAccounts: Record<EmailAccountKey, EmailAccount>;
