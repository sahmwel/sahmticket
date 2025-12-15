export const sendEmailViaSupabase = async (payload) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/sendEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.error || "Failed to send email");
    return result;
};
