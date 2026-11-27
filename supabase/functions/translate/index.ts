// Supabase Edge Function: translate one finished Hindi sentence to English.
//
// Called by the teacher's device (src/services/translationService.ts). The
// Google Cloud Translation API key lives here as a secret, never in the app.
// Only the teacher of a live class may call it, so the key can't be used by
// anyone who just has the app's public Supabase key.
//
// Deploy:   supabase functions deploy translate --no-verify-jwt
// Secret:   supabase secrets set GOOGLE_TRANSLATE_API_KEY=...
// (--no-verify-jwt because this function checks the caller itself below.)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TEXT_LENGTH = 5000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let classroomId: unknown;
  let text: unknown;
  try {
    ({ classroomId, text } = await req.json());
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (
    typeof classroomId !== "string" ||
    typeof text !== "string" ||
    !text.trim() ||
    text.length > MAX_TEXT_LENGTH
  ) {
    return json({ error: "invalid_request" }, 400);
  }

  // Check the caller is this live class's teacher. The query runs with the
  // caller's own token, so row level security only returns classrooms they own.
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "unauthorized" }, 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } }
  );
  const { data: classroom, error: lookupError } = await supabase
    .from("classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("active", true)
    .maybeSingle();
  if (lookupError || !classroom) return json({ error: "forbidden" }, 403);

  const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
  if (!apiKey) return json({ error: "not_configured" }, 503);

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "hi", target: "en", format: "text" }),
    }
  );
  if (!response.ok) {
    console.error("Translation API error", response.status, await response.text());
    return json({ error: "translation_failed" }, 502);
  }
  const result = await response.json();
  const translatedText = result?.data?.translations?.[0]?.translatedText;
  if (typeof translatedText !== "string") return json({ error: "translation_failed" }, 502);

  return json({ translatedText });
});
