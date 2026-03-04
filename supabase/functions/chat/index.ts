import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS handle karna
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ content: "Error: Supabase mein API Key nahi mili!" }), { headers: corsHeaders });
    }

    const userText = messages[messages.length - 1].content;

    // Sabse robust URL jo 2026 mein kaam kar raha hai
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userText }] }]
      }),
    });

    const data = await response.json();

    // Agar Google ne koi error diya toh use direct dikhao
    if (data.error) {
      return new Response(JSON.stringify({ content: `Google ne bola: ${data.error.message}` }), { headers: corsHeaders });
    }

    // Response nikalna
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Google ne khali jawab bheja hai.";

    return new Response(JSON.stringify({ content: aiText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ content: `Server Error: ${e.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});