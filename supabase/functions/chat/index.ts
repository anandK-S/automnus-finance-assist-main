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
    
    // Last message nikalna
    const userText = messages[messages.length - 1].content;

    // Google API ko call karna (Thoda aur simple format)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userText }] }]
        }),
      }
    );

    const data = await response.json();

    // Check agar Google ne error diya
    if (data.error) {
      return new Response(JSON.stringify({ content: `Google Error: ${data.error.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text (Added more safety checks)
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Google ne koi text nahi bheja. Check API Key status.";

    return new Response(JSON.stringify({ content: aiText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ content: `Backend Crash: ${e.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});