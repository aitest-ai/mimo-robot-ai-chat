// Mimo voice gateway — no student audio or transcript is logged or persisted.
// Deployment requires MODAL_ENDPOINT, BACKEND_TOKEN, CLASS_CODE (all secrets).
const MAX_BYTES = 2_500_000;
const ALLOWED_MIME = new Set(["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mpeg"]);
const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

function respond(data, status = 200, origin = "") {
  const h = { ...HEADERS, "Content-Type": "application/json; charset=utf-8" };
  if (origin) { h["Access-Control-Allow-Origin"] = origin; h["Vary"] = "Origin"; }
  return new Response(JSON.stringify(data), { status, headers: h });
}
async function boundedRead(request) {
  // Count bytes while consuming the stream: Content-Length alone is not trustworthy.
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0; const parts = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw Error("too-large"); }
    parts.push(value);
  }
  const all = new Uint8Array(size); let offset = 0;
  for (const part of parts) { all.set(part, offset); offset += part.byteLength; }
  return all;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const approved = origin && origin === env.ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") {
      if (!approved) return respond({ error: "Origin not permitted" }, 403);
      return new Response(null, { status: 204, headers: {
        ...HEADERS, "Access-Control-Allow-Origin": origin, "Vary": "Origin",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Mimo-Class-Code",
        "Access-Control-Max-Age": "600",
      } });
    }
    // Health requests carry no child data and do not need a class code.
    if (url.pathname === "/api/health" && request.method === "GET") {
      if (!approved) return respond({ error: "Origin not permitted" }, 403);
      return respond({
        service: "mimo-voice-gateway",
        configured: Boolean(env.MODAL_ENDPOINT && env.BACKEND_TOKEN && env.CLASS_CODE),
        maxSeconds: 12, retainsAudio: false,
      }, 200, origin);
    }
    if (url.pathname !== "/api/transcribe" || request.method !== "POST")
      return respond({ error: "Not found" }, 404, approved ? origin : "");
    if (!approved) return respond({ error: "Origin not permitted" }, 403);
    if (!env.MODAL_ENDPOINT || !env.BACKEND_TOKEN || !env.CLASS_CODE)
      return respond({ error: "Voice service is not configured" }, 503, origin);
    const code = request.headers.get("X-Mimo-Class-Code") || "";
    if (code !== env.CLASS_CODE) {
      // Only unsuccessful authorization attempts count here.
      if (env.AUTH_RATE_LIMIT) {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const limited = await env.AUTH_RATE_LIMIT.limit({ key: "bad-code:" + ip });
        if (!limited.success) return respond({ error: "Too many attempts" }, 429, origin);
      }
      return respond({ error: "Invalid class code" }, 401, origin);
    }
    // Classroom-wide cap, not per school IP (many tablets can share an IP).
    if (env.VOICE_RATE_LIMIT) {
      const limited = await env.VOICE_RATE_LIMIT.limit({ key: "voice-classroom" });
      if (!limited.success) return respond({ error: "Classroom voice quota reached. Try again shortly." }, 429, origin);
    }
    const mime = (request.headers.get("Content-Type") || "").split(";")[0].toLowerCase().trim();
    if (!ALLOWED_MIME.has(mime)) return respond({ error: "Unsupported audio type" }, 415, origin);
    const declared = Number(request.headers.get("Content-Length") || "0");
    if (declared > MAX_BYTES) return respond({ error: "Audio too large" }, 413, origin);
    let audio;
    try { audio = await boundedRead(request); }
    catch { return respond({ error: "Audio too large" }, 413, origin); }
    if (audio.byteLength < 100) return respond({ error: "Audio too short" }, 400, origin);
    let target;
    try {
      const endpoint = new URL(env.MODAL_ENDPOINT);
      if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw Error();
      // Modal ASGI app's transcribe endpoint is exactly /transcribe.
      target = new URL("transcribe", endpoint.href.replace(/\/?$/, "/")).href;
    } catch { return respond({ error: "Backend configuration error" }, 503, origin); }
    let upstream;
    try {
      upstream = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": mime, "Authorization": "Bearer " + env.BACKEND_TOKEN },
        body: audio,
        signal: AbortSignal.timeout(90000),
      });
    } catch {
      return respond({ error: "Voice model is currently unavailable" }, 502, origin);
    }
    if (!upstream.ok) return respond({ error: upstream.status === 422 ? "Please record a shorter, clearer sentence" : "Voice model failed", code: upstream.status }, 502, origin);
    try {
      const answer = await upstream.json();
      return respond({
        text: typeof answer.text === "string" ? answer.text.slice(0, 400) : "",
        emotion: typeof answer.emotion === "string" ? answer.emotion.slice(0, 30) : "UNKNOWN",
        language: typeof answer.language === "string" ? answer.language.slice(0, 12) : "unknown",
        event: typeof answer.event === "string" ? answer.event.slice(0, 30) : "",
        note: "Voice tags are model estimates, not a measurement of a student's feelings.",
      }, 200, origin);
    } catch { return respond({ error: "Invalid model response" }, 502, origin); }
  }
};
