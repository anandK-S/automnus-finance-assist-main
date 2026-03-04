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
    if (!apiKey) throw new Error("API Key missing");

    const userText = messages[messages.length - 1].content;

    // STEP 1: GOOGLE SE POOCHO KI KAUNSE MODELS AVAILABLE HAIN
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    const listData = await listResponse.json();

    if (listData.error) throw new Error(`Model List Error: ${listData.error.message}`);

    // STEP 2: JO MODEL 'generateContent' SUPPORT KARTA HAI USE DHUNDHO
    const validModels = listData.models.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent") && 
      m.name.includes("gemini")
    );

    if (validModels.length === 0) {
      throw new Error("Aapki API key par koi text model active nahi hai.");
    }

    // Pehle flash dhundho, warna jo mile wo use kar lo (Jaise gemini-2.0 ya gemini-3.0)
    const flashModel = validModels.find((m: any) => m.name.includes("flash"));
    const selectedModel = flashModel ? flashModel.name : validModels[0].name;

    // STEP 3: SELECTED MODEL SE CHAT KARO (404 ka sawal hi paida nahi hota)
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`;
    
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: userText }] }] }),
    });

    const data = await response.json();

    if (data.error) throw new Error(`Generation Error: ${data.error.message}`);

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No text generated.";

    return new Response(JSON.stringify({ content: aiText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ content: `Auto-Detect Error: ${e.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});