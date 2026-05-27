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
      let { prompt, resumeText, mode } = await request.json();

      // URL이 입력된 경우 직접 페치 시도
      if (mode === "parse_job" && prompt.startsWith("http")) {
        try {
          // 구글 시트 URL 감지 → CSV export로 변환
          const gSheetsMatch = prompt.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
          if (gSheetsMatch) {
            const sheetId = gSheetsMatch[1];
            const gidMatch = prompt.match(/gid=(\d+)/);
            const gid = gidMatch ? gidMatch[1] : "0";
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            const csvRes = await fetch(csvUrl);
            if (csvRes.ok) {
              prompt = await csvRes.text();
            }
          } else {
            // 일반 웹페이지 HTML 파싱
            const pageRes = await fetch(prompt, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            if (pageRes.ok) {
              let html = await pageRes.text();
              html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
                         .replace(/<style[\s\S]*?<\/style>/gi, "")
                         .replace(/<[^>]+>/g, " ")
                         .replace(/\s+/g, " ")
                         .substring(0, 10000);
              prompt = html;
            }
          }
        } catch (fetchErr) {
          console.error("URL Fetch Failed:", fetchErr);
        }
      }

      let systemPrompt = "당신은 경력직 채용 심사관입니다. 반드시 JSON 형식으로만 응답하세요. 이력서에 없는 내용은 절대 추측하지 말고 met:false로 처리하세요. requirements 중 met:false가 하나라도 있으면 grade는 반드시 '하'입니다. JSON 외 다른 텍스트는 출력하지 마세요.";
      
      if (mode === "parse_applicant") {
        systemPrompt = "당신은 이력서에서 핵심 정보를 추출하는 데이터 전문가입니다. 제공된 텍스트에서 이름, 전화번호, 이메일, 주요 기술 3가지를 찾아 JSON 형식으로만 응답하세요. {name, phone, email, skills: []}";
      } else if (mode === "parse_job") {
        systemPrompt = `당신은 채용 공고 데이터를 분석하는 전문가입니다.
입력 데이터는 채용 공고 웹페이지, CSV, 또는 표 형식일 수 있습니다.
CSV/표 형식인 경우 열 이름(직무, 주요업무, 자격요건, 우대요건, 팀, 부문 등)을 기준으로 각 행을 하나의 포지션으로 파싱하세요.
TO(채용 인원)가 0이거나 비어있는 행은 제외하세요.
모든 포지션을 빠짐없이 추출하고 JSON 형식으로만 응답하세요.
형식: { "announcementTitle": "...", "positions": [{ "title": "직무명", "department": "팀명", "jobType": "직군(개발/엔지니어링|데이터/AI|인프라/보안|IT기획/PM 중 적절한 것)", "requirements": "자격요건 전체 내용", "preferredSkills": "우대요건 전체 내용" }, ...] }`;
      } else {
        systemPrompt = `당신은 IT 기업의 경력 15년차 시니어 채용 전문가이자 매우 엄격한 면접관입니다. 
지원자의 이력서를 보고 어떤 직무에 지원한 것인지 스스로 판단한 뒤, 해당 직무의 기준에 맞춰 냉정하게 평가하세요.`;
      }

      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mode === "parse_applicant" || mode === "parse_job" 
              ? `다음 내용에서 정보를 추출하세요:\n\n${resumeText || prompt}`
              : `${prompt}\n\n[이력서 내용]\n${resumeText}` 
          },
        ],
        max_tokens: 2048, // 멀티 포지션 대응을 위해 토큰 대폭 상향
      });

      const text = response.response || "결과를 가져오지 못했습니다.";
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
