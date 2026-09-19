const ALLOWED_ORIGINS = new Set([
  "https://ff41009tw52-rgb.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

const GEMINI_MODEL = "gemini-3.5-flash";
const MAX_HISTORY = 8;
const MAX_MESSAGE_LENGTH = 2000;

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

function normalizeGrade(value) {
  const grade = Number(value);
  return [3, 4, 5, 6].includes(grade) ? grade : 4;
}

function normalizeCharacter(value, grade) {
  if (value === "mimi" || value === "cream") return value;
  return grade <= 4 ? "mimi" : "cream";
}

function buildSystemPrompt({ grade, character }) {
  const isMimi = character === "mimi";
  const characterName = isMimi ? "橘咪咪" : "白奶油";
  const levelRule = grade <= 4
    ? "使用國小三、四年級能理解的短句、生活化例子與簡單詞彙。一次先說清楚一個核心概念。"
    : "使用國小五、六年級能理解的完整因果、比較與科學詞彙，但避免高中以上才需要的艱深推導。";

  return [
    `你是「${characterName}」，是「橘咪咪與白奶油的科學農場」網站中的學習助手。`,
    `目前回答對象是國小 ${grade} 年級學生。`,
    levelRule,
    "主要任務：回答國小自然科學、數學基礎概念、網站學習活動與學習方法相關問題。",
    "回答原則：",
    "1. 使用繁體中文。",
    "2. 優先直接回答問題，再補充簡短原因或例子。",
    "3. 不要假裝已經看到網站中不存在的內容；若缺少網站特定資訊，要明確說明。",
    "4. 若學生的問題資訊不足，可以先給安全、一般性的解釋，再提出一個簡短追問。",
    "5. 不要求學生提供姓名、電話、地址、帳號、密碼等個人資訊。",
    "6. 遇到可能危險的實驗、藥品、火源、尖銳器材或高溫操作，要提醒由老師或成人陪同。",
    "7. 回答以精簡為主，通常控制在 3～8 句；只有學生明確要求詳細說明時才延伸。",
    isMimi
      ? "角色語氣：親切、活潑、清楚，可以偶爾用「我們來看看」這類自然口吻，但不要過度撒嬌。"
      : "角色語氣：沉穩、條理清楚、鼓勵推理，可以適度提出『為什麼』或『比較看看』的思考方向。"
  ].join("\n");
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY)
    .map((item) => {
      const role = item?.role === "model" || item?.role === "assistant" ? "model" : "user";
      const text = String(item?.text ?? item?.content ?? "").trim().slice(0, 1500);
      if (!text) return null;
      return { role, parts: [{ text }] };
    })
    .filter(Boolean);
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => typeof part?.text === "string" ? part.text : "")
    .join("")
    .trim();
}

async function askGemini(env, { message, grade, character, history }) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt({ grade, character }) }]
    },
    contents: [
      ...sanitizeHistory(history),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
    generationConfig: {
      temperature: 0.45,
      maxOutputTokens: 700
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      data?.error?.message ||
      `Gemini API returned HTTP ${response.status}`;
    throw new Error(detail);
  }

  const reply = extractText(data);
  if (!reply) {
    throw new Error("Gemini returned an empty response");
  }

  return {
    reply,
    model: GEMINI_MODEL
  };
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
          model: GEMINI_MODEL,
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
          error: "GEMINI_API_KEY is not configured"
        },
        503,
        origin
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(
        { ok: false, error: "Request body must be valid JSON" },
        400,
        origin
      );
    }

    const message = String(payload?.message || "").trim();
    if (!message) {
      return json(
        { ok: false, error: "message is required" },
        400,
        origin
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return json(
        {
          ok: false,
          error: `message is too long (max ${MAX_MESSAGE_LENGTH} characters)`
        },
        400,
        origin
      );
    }

    const grade = normalizeGrade(payload?.grade);
    const character = normalizeCharacter(payload?.character, grade);

    try {
      const result = await askGemini(env, {
        message,
        grade,
        character,
        history: payload?.history
      });

      return json(
        {
          ok: true,
          reply: result.reply,
          model: result.model,
          grade,
          character
        },
        200,
        origin
      );
    } catch (error) {
      console.error("Gemini request failed", {
        message: error?.message || String(error)
      });

      return json(
        {
          ok: false,
          error: "AI service temporarily unavailable",
          detail: error?.message || "Unknown Gemini error"
        },
        502,
        origin
      );
    }
  }
};
