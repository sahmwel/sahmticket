import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: "Email and OTP required" }), { status: 400 });
    }

    // Send email using Supabase SMTP
    const { error } = await supabase.functions.invoke("send-email", {
      body: JSON.stringify({
        to: email,
        subject: "Welcome to TicketHub – Verify Your Account",
        html: `
          <div style="font-family: sans-serif; text-align: center;">
            <h2>Welcome to TicketHub!</h2>
            <p>Use the OTP below to verify your account:</p>
            <h1 style="color: #7f00ff;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>Thank you for joining TicketHub!</p>
          </div>
        `,
      }),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ message: "OTP sent successfully" }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
