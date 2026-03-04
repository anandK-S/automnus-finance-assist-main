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
    
    if (!apiKey) return new Response(JSON.stringify({ content: "Error: API Key missing in Supabase Secrets!" }), { headers: corsHeaders });

    const userText = messages[messages.length - 1].content;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userText }] }]
      })
    });

    const data = await res.json();

    // AGAR GOOGLE ERROR DE RAHA HAI TOH WO DIKHAO
    if (data.error) {
      return new Response(JSON.stringify({ content: `Google Error: ${data.error.message}` }), { headers: corsHeaders });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI candidates.";

    return new Response(JSON.stringify({ content: reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ content: `Backend Error: ${err.message}` }), { headers: corsHeaders });
  }
});