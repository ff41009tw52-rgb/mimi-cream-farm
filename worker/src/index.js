const ALLOWED_ORIGINS = new Set([
  "https://ff41009tw52-rgb.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite"
];
const GEMINI_MODEL = GEMINI_MODELS[0];
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
  const raw = String(value ?? "").trim();
  if (raw === "3-4" || raw === "5-6") return raw;
  const grade = Number(raw);
  return [3, 4, 5, 6].includes(grade) ? grade : "3-4";
}

function normalizeCharacter(value, grade) {
  if (value === "mimi" || value === "cream") return value;
  return grade === "3-4" || Number(grade) <= 4 ? "mimi" : "cream";
}

function compactGuardText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s，。！？!?、；;：「」『』（）()【】\[\]\\\-_.:：・,\"'~～]+/g, "");
}

function guardMessage(message) {
  const raw = String(message || "").normalize("NFKC").toLowerCase();
  const compact = compactGuardText(raw);
  const safeScienceTerms = ["幹細胞", "腦幹", "樹幹", "莖幹", "操場", "操作"];
  const protectedText = safeScienceTerms.reduce(
    (text, term) => text.replaceAll(term, ""),
    compact
  );

  const explicitTerms = [
    "幹你娘", "幹你媽", "幹拎娘", "幹林娘",
    "操你媽", "草你媽", "靠北", "靠杯", "靠邀",
    "機掰", "雞掰", "雞巴", "他媽的", "媽的",
    "白癡", "智障",
    "fuck", "fucking", "shit", "bitch", "motherfucker"
  ];

  if (
    explicitTerms.some((term) => protectedText.includes(term))
    || /^(幹|操)$/.test(protectedText)
    || /(^|[\s，。！？!?、；;])(?:幹|操)(?:[\s，。！？!?、；;]|$)/.test(raw)
  ) {
    return {
      status: 400,
      type: "profanity",
      reply: "這裡是學習小幫手，請不要使用髒話或侮辱性的文字。換成尊重、清楚的說法，我就能繼續幫你。"
    };
  }

  if (
    !compact
    || (/^[a-z]{7,}$/i.test(compact) && !/[aeiou]{2,}/i.test(compact))
    || /^(.)\1{4,}$/.test(compact)
    || !/[\u3400-\u9fffA-Za-z0-9]/.test(raw)
  ) {
    return {
      status: 400,
      type: "noise",
      reply: "我看不太懂這段文字。請重新問一次，可以問自然科學、網站操作或遊戲相關問題。"
    };
  }

  const offTopicPatterns = [
    /你(最)?喜歡(吃|喝|哪|什麼)/,
    /你有沒有(男|女)朋友/,
    /你幾歲/,
    /你住哪/,
    /你會不會談戀愛/,
    /晚餐吃什麼/,
    /早餐吃什麼/,
    /午餐吃什麼/,
    /幫我寫情書/,
    /唱歌給我聽/,
    /講八卦/,
    /股票|彩券|賭博/,
    /哪間餐廳|哪裡好吃|去哪裡玩|哪部電影|哪個明星/
  ];

  const normalized = compactGuardText(message);
  if (offTopicPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      status: 400,
      type: "off_topic",
      reply: "這個問題好像和自然科學、網站或遊戲沒有太大關係。可以換個相關問題再問我嗎？"
    };
  }

  return null;
}

function buildSystemPrompt({ grade, character }) {
  const isMimi = character === "mimi";
  const characterName = isMimi ? "橘咪咪" : "白奶油";
  const lowerBand = grade === "3-4" || Number(grade) <= 4;
  const gradeLabel = grade === "3-4"
    ? "三、四年級"
    : grade === "5-6"
      ? "五、六年級"
      : `${grade} 年級`;
  const levelRule = lowerBand
    ? "使用國小三、四年級能理解的短句、生活化例子與簡單詞彙。一次先說清楚一個核心概念。"
    : "使用國小五、六年級能理解的完整因果、比較與科學詞彙，但避免高中以上才需要的艱深推導。";

  return [
    `你是「${characterName}」，是「橘咪咪與白奶油的科學農場」網站中的學習助手。`,
    `目前回答對象是國小 ${gradeLabel}學生。`,
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

  const retryableStatuses = new Set([404, 408, 409, 429, 500, 502, 503, 504]);
  const failures = [];

  for (const model of GEMINI_MODELS) {
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
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

        failures.push({
          model,
          status: response.status,
          detail
        });

        if (retryableStatuses.has(response.status)) {
          continue;
        }

        throw new Error(detail);
      }

      const reply = extractText(data);
      if (!reply) {
        failures.push({
          model,
          status: 200,
          detail: "Gemini returned an empty response"
        });
        continue;
      }

      if (failures.length) {
        console.warn("Gemini fallback succeeded", {
          selectedModel: model,
          previousFailures: failures
        });
      }

      return {
        reply,
        model
      };
    } catch (error) {
      const detail = error?.message || String(error);
      failures.push({
        model,
        status: null,
        detail
      });

      if (model !== GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
        continue;
      }
    }
  }

  const summary = failures
    .map((item) => `${item.model}: ${item.status ?? "network"} ${item.detail}`)
    .join(" | ");

  throw new Error(summary || "All Gemini models failed");
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
          models: GEMINI_MODELS,
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

    const guard = guardMessage(message);
    if (guard) {
      return json(
        {
          ok: false,
          blocked: true,
          policy: guard.type,
          reply: guard.reply,
          error: "Input rejected by learning assistant guard"
        },
        guard.status,
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
