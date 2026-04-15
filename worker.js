/**
 * Cloudflare Worker - Workers AI (Llama 3.1)
 * wrangler.toml에 [ai] binding 필요
 */

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

    try {
      const { prompt, resumeText } = await request.json();

      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          {
            role: "system",
            content: "당신은 IT 기업의 경력 10년차 채용 담당자입니다. 이력서와 채용 공고를 비교 분석하여 상세하고 실용적인 피드백을 한국어로 제공합니다.",
          },
          {
            role: "user",
            content: `${prompt}\n\n[이력서 내용]\n${resumeText}`,
          },
        ],
        max_tokens: 1024,
      });

      const text = response.response || "분석 결과를 가져오지 못했습니다.";
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
