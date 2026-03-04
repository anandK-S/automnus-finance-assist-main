import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const userText = messages[messages.length - 1].content;

    // --- STRATEGY: Try Stable v1 Endpoint First ---
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: userText }] }] }),
    });

    let data = await response.json();

    // --- FALLBACK: If 404 (Not Found), Try Gemini Pro ---
    if (data.error && data.error.code === 404) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
      response = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: userText }] }] }),
      });
      data = await response.json();
    }

    if (data.error) {
      return new Response(JSON.stringify({ content: `Google error: ${data.error.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No text generated.";
    
    return new Response(JSON.stringify({ content: aiText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ content: `Backend Error: ${e.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});