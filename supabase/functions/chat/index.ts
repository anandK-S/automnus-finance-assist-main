import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    
    // Ab hum wahi GEMINI_API_KEY use karenge jo humne set ki thi
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured in Supabase Secrets");

    // Google Gemini Direct API URL
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Last message nikalna (Simple implementation ke liye)
    const userMessage = messages[messages.length - 1].content;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }],
        systemInstruction: {
          parts: [{ text: "You are Automnus AI — a friendly financial assistant for Indian MSMEs in Surat, Gujarat. Help with Cash flow, GST, Expenses, and Loans. Keep answers concise, use ₹, and speak in Hindi/English." }]
        }
      }),
    });

    const data = await response.json();
    
    // Gemini se aaya hua text nikalna
    const aiText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ content: aiText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});