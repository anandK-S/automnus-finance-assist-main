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

    // NAYA URL: v1beta ki jagah v1 use kar rahe hain
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userText }] }]
      }),
    });

    const data = await response.json();

    if (data.error) {
      return new Response(JSON.stringify({ content: `Google Error: ${data.error.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI ne jawab nahi diya.";

    return new Response(JSON.stringify({ content: aiText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ content: `Error: ${e.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});