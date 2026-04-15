/**
 * Cloudflare Worker - Groq API Proxy
 * Secret 설정: wrangler secret put GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const ALLOWED_ORIGIN = "*";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: { message: "서버에 GROQ_API_KEY Secret이 설정되지 않았습니다." } }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    try {
      const { prompt, resumeText } = await request.json();

      const groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "user", content: `${prompt}\n\n[이력서 내용]\n${resumeText}` }
          ],
          max_tokens: 1024,
        }),
      });

      const data = await groqRes.json();

      if (!groqRes.ok) {
        throw new Error(data.error?.message || `Groq API 오류 (${groqRes.status})`);
      }

      const text = data.choices?.[0]?.message?.content || "분석 결과를 가져오지 못했습니다.";
      return new Response(JSON.stringify({ text }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: { message: e.message } }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }
  },
};
