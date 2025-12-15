import { serve } from "https://deno.land/std@0.201.0/http/server.ts";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Only POST allowed" }),
        { status: 405 }
      );
    }

    const payload = await req.json();

    // Forward request to your Node.js email backend
    const response = await fetch("https://your-node-backend.com/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { status: response.status });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
});
