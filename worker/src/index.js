const ALLOWED_ORIGINS = new Set([
  "https://ff41009tw52-rgb.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://ff41009tw52-rgb.github.io";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (request.method === "GET") {
      return json(
        {
          ok: true,
          service: "mimi-cream-ai",
          status: "ready",
          deploymentSource: "github",
          geminiConfigured: Boolean(env.GEMINI_API_KEY),
          path: url.pathname
        },
        200,
        origin
      );
    }

    if (request.method !== "POST") {
      return json(
        { ok: false, error: "Method not allowed" },
        405,
        origin
      );
    }

    if (!env.GEMINI_API_KEY) {
      return json(
        {
          ok: false,
          error: "GEMINI_API_KEY is not configured yet"
        },
        503,
        origin
      );
    }

    return json(
      {
        ok: true,
        service: "mimi-cream-ai",
        message: "Worker is connected and ready for Gemini integration."
      },
      200,
      origin
    );
  }
};
