interface SendEmailPayload {
    type: "event" | "otp" | "ticket" | "newsletter";
    to: string;
    data: Record<string, any>;
    fromAccountKey?: "noreply" | "info" | "hello";
}
export declare const sendEmailViaSupabase: (payload: SendEmailPayload) => Promise<any>;
export {};
