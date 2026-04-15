// 브라우저 직접 실행 환경을 위해 React 훅을 가져옵니다.
const { useState, useEffect } = React;

// ── Cloudflare Worker URL ────────────────────────────────────────────────────
// 배포 후 실제 Worker URL로 변경하세요.
// 예: "https://hansol-recruit-api.your-subdomain.workers.dev"
const WORKER_URL = "https://hansol-recruit-api.wjddnrxo88.workers.dev";

// ── 상수 ─────────────────────────────────────────────────────────────────────
const PR  = "#1B6FDB";
const PRD = "#1251AD";
const BG  = "#F0F4FA";
const CARD   = "#FFFFFF";
const BORDER = "#E2E8F0";
const TEXT   = "#1E293B";
const MUTED  = "#64748B";

const STAGES = [
  { key: "application",    label: "지원 접수",  icon: "📋" },
  { key: "docReview",      label: "서류 검토",  icon: "🔍" },
  { key: "interview1",     label: "1차 면접",   icon: "💬" },
  { key: "interview2",     label: "임원 면접",  icon: "🎯" },
  { key: "medical",        label: "채용 검진",  icon: "🏥" },
  { key: "salary",         label: "처우 협의",  icon: "💰" },
  { key: "finalNotice",    label: "최종 통보",  icon: "📢" },
  { key: "onboardingPrep", label: "입사 준비",  icon: "🖥️" },
  { key: "education",      label: "입사 교육",  icon: "📚" },
];
const SK = STAGES.map(s => s.key);

const ROOMS = ["봄", "여름", "가을", "겨울", "중회의실", "대회의실"];
const TIMES = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30",
];
const PRIVACY_OPTS = [
  { label: "180일 (동의 미수집 · 채용절차법 기본)", months: 6  },
  { label: "1년 (인재풀 등록 동의)",               months: 12 },
  { label: "2년 (서면 동의)",                      months: 24 },
  { label: "3년 (서면 동의 · 장기보관)",           months: 36 },
];
const JOB_TYPES = [
  "개발/엔지니어링","IT기획/PM","데이터/AI","인프라/보안",
  "디자인","기획/전략","인사/총무","재무/회계","영업/마케팅","기타",
];

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowStr() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}
function addMonths(isoDate, n) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
function daysUntil(isoDate) {
  return Math.ceil((new Date(isoDate) - new Date()) / (1000 * 60 * 60 * 24));
}
function fmtPhone(raw) {
  const d = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}
function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
}
function checkFields(rules) {
  const missing = rules.filter(r => !r.val);
  if (missing.length > 0) {
    alert("필수 항목을 입력해주세요:\n" + missing.map(r => `• ${r.label}`).join("\n"));
    return false;
  }
  return true;
}

// ── 데이터 마이그레이션 (구버전 localStorage 데이터 보정) ──────────────────────
// 이전 코드: 마지막 단계 완료 시 terminated=true (버그)
// 이번 코드: fullyCompleted=true 로 분리
function migrateCand(c) {
  // 1. education 완료인데 terminated=true → fullyCompleted=true 로 전환
  if (c.terminated && !c.fullyCompleted && c.stageData?.education?.result === "완료") {
    return { ...c, terminated: false, fullyCompleted: true, terminatedAt: undefined };
  }
  // 2. currentStage 가 SK 배열 외부 or undefined → 마지막 완료 단계로 보정
  if (!c.currentStage || !SK.includes(c.currentStage)) {
    let lastDone = SK[0];
    for (const key of SK) {
      const r = c.stageData?.[key]?.result;
      if (r === "합격" || r === "완료") lastDone = key;
    }
    return { ...c, currentStage: lastDone };
  }
  return c;
}

// ── 단계별 서브 상태 (트랙 버튼 아래 작은 텍스트) ─────────────────────────────
function getSubStatus(key, stageData) {
  const d = stageData?.[key] || {};
  const GREEN  = "#10B981";
  const RED    = "#EF4444";
  const PURPLE = "#8B5CF6";
  const BLUE   = PR;
  const AMBER  = "#F59E0B";

  if (key === "application") {
    if (d.result === "완료") return { text: "접수 완료 ✓", color: GREEN };
    return null;
  }
  if (key === "docReview") {
    if (d.result === "합격")   return { text: "서류 합격 ✓",  color: GREEN };
    if (d.result === "불합격") return { text: "서류 불합격",   color: RED };
    if (d.result === "인재풀") return { text: "인재풀 보관",   color: PURPLE };
    if (d.aiAnalysis)          return { text: "AI 분석 완료", color: AMBER };
    return null;
  }
  if (key === "interview1" || key === "interview2") {
    if (d.result === "합격")   return { text: "면접 합격 ✓",  color: GREEN };
    if (d.result === "불합격") return { text: "면접 불합격",   color: RED };
    if (d.scheduled && d.scheduleDate) return { text: `${d.scheduleDate} ${d.scheduleTime || ""}`, color: BLUE };
    return null;
  }
  if (key === "medical") {
    if (d.result === "합격")   return { text: "검진 이상 없음 ✓", color: GREEN };
    if (d.result === "불합격") return { text: "검진 불합격",       color: RED };
    if (d.resultReceived)      return { text: "결과 검토 중",      color: AMBER };
    if (d.checkDate)           return { text: `검진일 ${d.checkDate}`, color: BLUE };
    return null;
  }
  if (key === "salary") {
    if (d.result === "완료") {
      const sal = d.finalSalary ? `${Number(d.finalSalary).toLocaleString()}만원` : "";
      return { text: `확정 ${sal}`, color: GREEN };
    }
    if (d.result === "불합격") return { text: "협상 결렬",   color: RED };
    if (d.currentSalary)       return { text: "협의 진행 중", color: AMBER };
    return null;
  }
  if (key === "finalNotice") {
    if (d.result === "합격")   return { text: "🎉 최종 합격!", color: GREEN };
    if (d.result === "불합격") return { text: "최종 불합격",   color: RED };
    return null;
  }
  if (key === "onboardingPrep") {
    if (d.result === "완료") return { text: "준비 완료 ✓", color: GREEN };
    if (d.pcAssetNo)         return { text: "자산 입력 중", color: AMBER };
    return null;
  }
  if (key === "education") {
    if (d.result === "완료")                                return { text: "입사 완료 🎉", color: GREEN };
    if ((d.completed || {})["공통 입사 교육"])              return { text: "교육 이수 완료", color: AMBER };
    return null;
  }
  return null;
}

// ── 지원자 상태 라벨 ──────────────────────────────────────────────────────────
function getCandStatus(c) {
  if (c.fullyCompleted || c.stageData?.education?.result === "완료") return "입사완료";
  if (c.terminated && c.talentPool) return "인재풀";
  if (c.terminated) return "불합격";
  return "진행중";
}

// ── 공통 스타일 ───────────────────────────────────────────────────────────────
const baseInput = {
  padding: "8px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  background: "#FAFCFF",
  fontFamily: "inherit",
  color: TEXT,
};

// ── 원자 UI 컴포넌트 ──────────────────────────────────────────────────────────
function Lbl({ text, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
      {text}
      {required && <span style={{ color: "#EF4444" }}> *</span>}
    </label>
  );
}

function Field({ label, required, hint, err, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <Lbl text={label} required={required} />}
      {children}
      {hint && <span style={{ fontSize: 11, color: MUTED }}>{hint}</span>}
      {err  && <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>⚠ {err}</span>}
    </div>
  );
}

function DatePicker({ label, required, value, onChange, err }) {
  return (
    <Field label={label} required={required} err={err}>
      <input
        type="date"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        onClick={e => { try { e.target.showPicker(); } catch (_) {} }}
        style={{ ...baseInput, colorScheme: "light", cursor: "pointer" }}
      />
    </Field>
  );
}

function TextInput({ label, required, value, onChange, placeholder, rows, err }) {
  return (
    <Field label={label} required={required} err={err}>
      {rows
        ? (
          <textarea
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            style={{ ...baseInput, resize: "vertical" }}
          />
        )
        : (
          <input
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={baseInput}
          />
        )
      }
    </Field>
  );
}

function SalaryInput({ label, value, onChange, placeholder }) {
  return (
    <Field label={label} hint="단위: 만원">
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value || ""}
          onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder={placeholder}
          style={{ ...baseInput, paddingRight: 40 }}
        />
        {value && (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: MUTED, pointerEvents: "none" }}>
            만원
          </span>
        )}
      </div>
    </Field>
  );
}

function NumInput({ label, value, onChange, placeholder }) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        style={baseInput}
      />
    </Field>
  );
}

function SelectInput({ label, required, value, onChange, children, err }) {
  return (
    <Field label={label} required={required} err={err}>
      <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...baseInput, cursor: "pointer" }}>
        {children}
      </select>
    </Field>
  );
}

function PhoneInput({ label, required, value, onChange }) {
  return (
    <Field label={label} required={required}>
      <input
        value={value || ""}
        onChange={e => onChange(fmtPhone(e.target.value))}
        placeholder="010-0000-0000"
        style={baseInput}
      />
    </Field>
  );
}

function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
}
function Grid3({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>{children}</div>;
}
function Grid4({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>{children}</div>;
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 3, height: 13, background: color || PR, borderRadius: 2 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: color || PR, textTransform: "uppercase", letterSpacing: 0.7 }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    진행중:   { bg: "#EBF3FF", c: PR },
    합격:     { bg: "#D1FAE5", c: "#065F46" },
    불합격:   { bg: "#FEE2E2", c: "#991B1B" },
    완료:     { bg: "#D1FAE5", c: "#065F46" },
    인재풀:   { bg: "#EDE9FE", c: "#5B21B6" },
    입사완료: { bg: "#D1FAE5", c: "#065F46" },
  };
  const s = map[status] || { bg: "#F1F5F9", c: MUTED };
  return (
    <span style={{ background: s.bg, color: s.c, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function Button({ children, onClick, variant, sm, disabled, full }) {
  const variants = {
    primary:   { bg: PR,        c: "#fff" },
    success:   { bg: "#10B981", c: "#fff" },
    danger:    { bg: "#EF4444", c: "#fff" },
    secondary: { bg: "#475569", c: "#fff" },
    ghost:     { bg: "#fff",    c: MUTED,  border: `1px solid ${BORDER}` },
    outline:   { bg: "rgba(255,255,255,.15)", c: "#fff", border: "1px solid rgba(255,255,255,.4)" },
  };
  const v = variants[variant || "primary"] || variants.primary;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        background: v.bg,
        color: v.c,
        border: v.border || "none",
        padding: sm ? "5px 14px" : "9px 20px",
        borderRadius: 8,
        fontSize: sm ? 12 : 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        width: full ? "100%" : "auto",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD,
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,.05), 0 4px 16px rgba(27,111,219,.05)",
        border: `1px solid ${BORDER}`,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ModalWrap({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,23,42,.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: CARD, borderRadius: 16, padding: 28,
          width: 540, maxWidth: "95vw", maxHeight: "90vh",
          overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function InfoBox({ warn, children }) {
  const bg = warn ? "#FFFBEB" : "#EBF3FF";
  const border = warn ? "1px solid #FDE68A" : "1px solid #BFDBFE";
  const color = warn ? "#D97706" : PR;
  return (
    <div style={{ background: bg, border, borderRadius: 8, padding: "10px 14px", fontSize: 12, color, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

function PassFailRow({ passLabel, failLabel, onPass, onFail, onPool }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button variant="success" onClick={onPass}>{passLabel || "✓ 통과"}</Button>
      <Button variant="danger"  onClick={onFail}>{failLabel  || "✗ 불합격"}</Button>
      {onPool && <Button variant="secondary" onClick={onPool}>인재풀 보관</Button>}
    </div>
  );
}

function ResultStamp({ result, ts }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <StatusChip status={result} />
      {ts && <span style={{ fontSize: 11, color: "#94A3B8" }}>{ts}</span>}
    </div>
  );
}

// ── 개인정보 만료일 블록 ───────────────────────────────────────────────────────
function PrivacyBlock({ regDate, opt, onOpt, val }) {
  return (
    <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, padding: 14 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: 0.5 }}>
        ⚖️ 개인정보 보관 기준 (채용절차법)
      </p>
      <SelectInput label="동의 유형" value={String(opt)} onChange={v => onOpt(Number(v))}>
        {PRIVACY_OPTS.map((o, i) => (
          <option key={i} value={String(i)}>{o.label}</option>
        ))}
      </SelectInput>
      {val && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED }}>
          📅 만료 예정일: <b style={{ color: TEXT }}>{val}</b>
        </p>
      )}
    </div>
  );
}

// ── PDF 업로드 + AI 분석 ──────────────────────────────────────────────────────
function ResumeAI({ stageData, onUpdate, job }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f) {
    if (!f) return;
    if (f.type !== "application/pdf") { alert("PDF 파일만 업로드 가능합니다."); return; }
    setFile(f);
    onUpdate({ ...stageData, aiAnalysis: "", fileName: "" });
  }

  // 데모 데이터를 생성하는 함수
  function generateMockResult() {
    setLoading(true);
    setTimeout(() => {
      const mock = `■ 종합 적합도: 상
■ 요구 조건 충족 여부
  - Node.js 경험: 충족 (이력서 내 3년 경력 확인)
  - SQLD 보유: 충족 (자격증 항목 기재)
  - 문서 작성 능력: 충족 (기획서 작성 사례 다수)
■ 강점
  - 실무 중심의 기술 스택 보유
  - 대규모 트래픽 처리 경험 유
■ 부족한 점
  - 클라우드 환경(AWS/GCP) 관련 구체적 언급 부족
■ AI 작성 가능성
  - 낮음: 문장이 자연스럽고 본인만의 구체적인 성과 수치가 포함됨
■ 담당자 참고 의견
  - 기술 면접에서 클라우드 아키텍처 이해도를 중점적으로 검증할 필요가 있음. 전반적으로 직무에 매우 적합한 인재임.`;
      onUpdate({ ...stageData, aiAnalysis: mock, aiDate: todayStr(), fileName: file?.name || "demo_resume.pdf" });
      setLoading(false);
    }, 1500);
  }

  async function extractPdfText(pdfFile) {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Y좌표 기준으로 줄 묶기 (같은 줄 = Y값 차이 2 이내)
      const lines = [];
      let currentLine = [];
      let lastY = null;

      const sorted = [...content.items].sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        return Math.abs(yDiff) > 2 ? yDiff : a.transform[4] - b.transform[4];
      });

      for (const item of sorted) {
        const y = item.transform[5];
        if (lastY === null || Math.abs(y - lastY) > 2) {
          if (currentLine.length) lines.push(currentLine.map(t => t.str).join(" "));
          currentLine = [item];
          lastY = y;
        } else {
          currentLine.push(item);
        }
      }
      if (currentLine.length) lines.push(currentLine.map(t => t.str).join(" "));

      fullText += lines.join("\n") + "\n\n";
    }
    return fullText.trim();
  }

  async function analyze() {
    if (!file) { alert("PDF 파일을 먼저 선택해주세요."); return; }

    setLoading(true);
    try {
      let resumeText;
      try {
        resumeText = await extractPdfText(file);
      } catch (pdfErr) {
        throw new Error("PDF 텍스트 추출 실패: " + pdfErr.message);
      }
      if (!resumeText) throw new Error("PDF에서 텍스트를 추출하지 못했습니다. 스캔 이미지 PDF는 지원되지 않습니다.");

      const prompt = `당신은 IT 기업의 경력 10년차 채용 담당자입니다.
아래 [채용 공고]의 자격 요건과 우대 사항을 기준으로, [이력서]를 항목별로 면밀히 대조 분석하세요.
이력서에 명시된 내용만을 근거로 판단하고, 언급되지 않은 항목은 "미확인"으로 표기하세요.

[채용 공고]
직무: ${job?.title || "(미입력)"}
직군: ${job?.jobType || "(미입력)"}
자격 요건: ${job?.requirements || "(미입력)"}
우대 사항: ${job?.preferredSkills || "(없음)"}

아래 형식으로 반드시 한국어로 작성하세요:

■ 종합 적합도: 상 / 중 / 하
  - 판단 근거를 1~2문장으로 설명

■ 자격 요건 항목별 충족 여부
  (자격 요건의 각 항목을 나열하고 이력서 기반으로 충족/미충족/미확인 판정)
  - [요건 항목]: 충족/미충족/미확인 — 이력서 근거 또는 미충족 이유

■ 우대 사항 항목별 해당 여부
  (우대 사항의 각 항목을 나열하고 해당/비해당/미확인 판정)
  - [우대 항목]: 해당/비해당/미확인 — 이력서 근거

■ 합격 가능성 분석
  - 이 지원자가 서류 통과할 가능성과 그 이유를 구체적으로 서술

■ 담당자 면접 체크포인트
  - 서류상 불확실하거나 검증이 필요한 항목 2~3가지 제시

■ AI 작성 가능성
  - 문체·표현 패턴·일관성 분석 결과: 높음/보통/낮음 + 근거 1~2줄`;

      let res;
      try {
        res = await fetch(WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, resumeText }),
        });
      } catch (fetchErr) {
        throw new Error("Worker 연결 실패: " + fetchErr.message);
      }

      const resText = await res.text();
      let json;
      try { json = JSON.parse(resText); } catch { throw new Error(`응답 파싱 실패 (${res.status}): ${resText.slice(0, 200)}`); }
      if (!res.ok) throw new Error(`[${res.status}] ${json.error?.message || resText.slice(0, 200)}`);

      onUpdate({ ...stageData, aiAnalysis: json.text, aiDate: new Date().toISOString().slice(0, 10), fileName: file.name });
    } catch (e) {
      onUpdate({ ...stageData, aiAnalysis: "오류: " + e.message });
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 데모 테스트 버튼 */}
      {file && !loading && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={generateMockResult}
            style={{ background: "none", border: "none", color: "#64748B", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
          >
            🧪 데모 데이터로 분석 테스트
          </button>
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById("pdfFileInput").click()}
        style={{
          border: `2px dashed ${dragging ? PR : BORDER}`,
          borderRadius: 10, padding: 20,
          background: dragging ? "#EBF3FF" : "#FAFCFF",
          textAlign: "center", cursor: "pointer", transition: "all .15s",
        }}
      >
        <input type="file" accept=".pdf" id="pdfFileInput" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        <div style={{ fontSize: 28 }}>📄</div>
        <p style={{ margin: "6px 0 2px", fontSize: 13, fontWeight: 700, color: file ? "#10B981" : PR }}>
          {file ? `✓ ${file.name}` : "이력서 PDF 업로드"}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>클릭하거나 파일을 드래그하세요</p>
      </div>

      <Button onClick={analyze} disabled={loading || !file}>
        {loading ? "⏳ AI 분석 중..." : "🤖 Gemini AI 서류 적합도 분석"}
      </Button>

      {stageData.aiAnalysis && (
        <div style={{ background: "#EBF3FF", border: "1px solid #BFDBFE", borderRadius: 9, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: PR }}>🤖 분석 결과</span>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{stageData.aiDate}</span>
          </div>
          <pre style={{ fontSize: 12.5, whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.8, color: TEXT, fontFamily: "inherit" }}>
            {stageData.aiAnalysis}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── 면접 평가 블록 ────────────────────────────────────────────────────────────
function EvalBlock({ data, onChange, isExec }) {
  const [mode, setMode] = useState(data.evalMode || "combined");
  const [evForm, setEvForm] = useState({ name: "", comment: "", score: "" });

  function switchMode(m) {
    setMode(m);
    onChange({ evalMode: m });
  }

  function addEval() {
    if (!evForm.name.trim() || !evForm.comment.trim()) {
      alert("면접관 이름과 평가 의견을 입력해주세요.");
      return;
    }
    onChange({ evaluations: [...(data.evaluations || []), { ...evForm }] });
    setEvForm({ name: "", comment: "", score: "" });
  }

  function removeEval(i) {
    onChange({ evaluations: (data.evaluations || []).filter((_, j) => j !== i) });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["combined", "종합 의견"], ["individual", "면접관별 의견"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => switchMode(v)}
            style={{
              padding: "5px 14px", borderRadius: 7, fontFamily: "inherit",
              border: `1.5px solid ${mode === v ? PR : BORDER}`,
              background: mode === v ? "#EBF3FF" : "#fff",
              color: mode === v ? PR : MUTED,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {mode === "combined" ? (
        <TextInput
          label={`${isExec ? "임원" : "실무"} 면접 종합 의견`}
          required
          rows={4}
          value={data.combinedComment}
          onChange={v => onChange({ combinedComment: v })}
          placeholder="직무 이해도, 문제 해결력, 조직 적합성 등 종합 평가를 입력하세요"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(data.evaluations || []).map((ev, i) => (
            <div key={i} style={{ background: "#F8FAFF", borderRadius: 8, padding: "10px 14px", border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <b style={{ fontSize: 13 }}>{ev.name}</b>
                {ev.score && (
                  <span style={{ background: PR, color: "#fff", borderRadius: 4, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>
                    {ev.score}점
                  </span>
                )}
                <button
                  onClick={() => removeEval(i)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{ev.comment}</p>
            </div>
          ))}
          <div style={{ background: "#F1F5FB", borderRadius: 8, padding: 12, border: `1px dashed ${BORDER}` }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: MUTED }}>면접관 추가</p>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px auto", gap: 8, alignItems: "end" }}>
              <TextInput label="이름"    value={evForm.name}    onChange={v => setEvForm({ ...evForm, name: v })} />
              <TextInput label="평가 의견" value={evForm.comment} onChange={v => setEvForm({ ...evForm, comment: v })} placeholder="직무이해도, 커뮤니케이션 등" />
              <NumInput  label="점수"    value={evForm.score}   onChange={v => setEvForm({ ...evForm, score: v })} placeholder="100" />
              <div style={{ paddingTop: 20 }}>
                <Button sm onClick={addEval}>추가</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 단계별 패널 ───────────────────────────────────────────────────────────────
function PanelApplication({ data, onChange }) {
  const [errs, setErrs] = useState({});

  useEffect(() => {
    if (!data.receivedDate) {
      const t = todayStr();
      const exp = addMonths(t, PRIVACY_OPTS[data.privacyOption || 0].months);
      onChange({ ...data, receivedDate: t, privacyExpiry: exp });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDateChange(v) {
    const exp = addMonths(v, PRIVACY_OPTS[data.privacyOption || 0].months);
    onChange({ ...data, receivedDate: v, privacyExpiry: exp });
    setErrs({});
  }

  function handleOptChange(opt) {
    const exp = addMonths(data.receivedDate || todayStr(), PRIVACY_OPTS[opt].months);
    onChange({ ...data, privacyOption: opt, privacyExpiry: exp });
  }

  function handleComplete() {
    const newErrs = {};
    if (!data.receivedDate) newErrs.receivedDate = "접수일을 선택해주세요";
    setErrs(newErrs);
    if (Object.keys(newErrs).length > 0) return;
    onChange({ ...data, result: "완료" });
  }

  return (
    <div>
      <Section title="접수 정보">
        <Grid2>
          <DatePicker
            label="접수일"
            required
            value={data.receivedDate || todayStr()}
            onChange={handleDateChange}
            err={errs.receivedDate}
          />
          <SelectInput label="지원 경로" value={data.source} onChange={v => onChange({ ...data, source: v })}>
            <option value="">선택</option>
            {["사람인","잡코리아","원티드","링크드인","사내 추천","헤드헌팅","직접 지원","기타"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </SelectInput>
        </Grid2>
      </Section>
      <Section title="개인정보 보관 기준">
        <PrivacyBlock
          regDate={data.receivedDate || todayStr()}
          opt={data.privacyOption || 0}
          onOpt={handleOptChange}
          val={data.privacyExpiry}
        />
      </Section>
      {!data.result && <Button onClick={handleComplete}>✓ 접수 완료 처리</Button>}
      {data.result && <StatusChip status={data.result} />}
    </div>
  );
}

function PanelDocReview({ data, onChange, job }) {
  function set(p) { onChange({ ...data, ...p }); }

  return (
    <div>
      <Section title="AI 서류 적합도 자동 분석">
        <InfoBox>이력서 PDF를 업로드하면 채용 공고와 자동 비교 분석합니다. AI 작성 여부도 함께 검토합니다.</InfoBox>
        <ResumeAI stageData={data} onUpdate={onChange} job={job} />
      </Section>
      <Section title="담당자 검토 의견">
        <TextInput
          rows={3}
          value={data.hrComment}
          onChange={v => set({ hrComment: v })}
          placeholder="AI 분석 참고 및 추가 의견 — 합/불 결정 근거로 저장됩니다"
        />
      </Section>
      <InfoBox warn>
        💡 <b>인재풀 보관</b>: 이번 채용에는 부적합하나 향후 채용 시 고려할 우수 인재를 지원자 동의 하에 보관합니다.
      </InfoBox>
      <div style={{ height: 10 }} />
      {!data.result && (
        <PassFailRow
          passLabel="✓ 서류 합격"
          failLabel="✗ 서류 불합격"
          onPass={() => set({ result: "합격",  ts: nowStr() })}
          onFail={() => set({ result: "불합격", ts: nowStr() })}
          onPool={() => set({ result: "인재풀", ts: nowStr() })}
        />
      )}
      {data.result && <ResultStamp result={data.result} ts={data.ts} />}
    </div>
  );
}

function PanelInterview({ data, onChange, isExec }) {
  function set(p) { onChange({ ...data, ...p }); }
  const label = isExec ? "임원" : "1차";

  function confirmSchedule() {
    if (!checkFields([
      { val: data.scheduleDate, label: "면접 일자" },
      { val: data.scheduleTime, label: "면접 시간" },
      { val: data.location,     label: "면접 장소" },
    ])) return;
    set({ scheduled: true });
  }

  function passInterview() {
    const hasEval = data.evalMode === "combined" ? data.combinedComment : (data.evaluations || []).length > 0;
    if (!hasEval) { alert("평가 의견을 입력해주세요."); return; }
    set({ result: "합격", ts: nowStr() });
  }

  function failInterview() {
    const hasEval = data.evalMode === "combined" ? data.combinedComment : (data.evaluations || []).length > 0;
    if (!hasEval) { alert("평가 의견을 입력해주세요."); return; }
    set({ result: "불합격", ts: nowStr() });
  }

  return (
    <div>
      <Section title="면접 일정 협의">
        <Grid2>
          <DatePicker label="면접 일자" required value={data.scheduleDate} onChange={v => set({ scheduleDate: v })} />
          <SelectInput label="면접 시간" value={data.scheduleTime} onChange={v => set({ scheduleTime: v })}>
            <option value="">시간 선택</option>
            {TIMES.map(t => <option key={t}>{t}</option>)}
          </SelectInput>
        </Grid2>
        <SelectInput label="면접 장소" value={data.location} onChange={v => set({ location: v })}>
          <option value="">회의실 선택</option>
          {ROOMS.map(r => <option key={r}>{r}</option>)}
          <option value="기타">기타 (직접 입력)</option>
        </SelectInput>
        {data.location === "기타" && (
          <TextInput label="장소 직접 입력" value={data.locationCustom} onChange={v => set({ locationCustom: v })} />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button sm onClick={confirmSchedule}>📅 일정 확정</Button>
          {data.scheduled && (
            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>
              ✓ {data.scheduleDate} {data.scheduleTime} · {data.location === "기타" ? data.locationCustom : data.location}
            </span>
          )}
        </div>
      </Section>

      {data.scheduled && (
        <Section title={`${label} 면접 평가`}>
          <EvalBlock data={data} onChange={p => set(p)} isExec={isExec} />
          {!data.result && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Button variant="success" onClick={passInterview}> 면접 합격!</Button>
              <Button variant="danger"  onClick={failInterview}>✗ 불합격</Button>
            </div>
          )}
          {data.result && <ResultStamp result={data.result} ts={data.ts} />}
        </Section>
      )}
    </div>
  );
}

function PanelMedical({ data, onChange }) {
  const [hospitals, setHospitals] = useState(data.hospitalList || ["DMC의원"]);
  const [newHospital, setNewHospital] = useState("");

  function set(p) { onChange({ ...data, ...p }); }

  function addHospital() {
    if (!newHospital.trim()) return;
    const list = [...hospitals, newHospital.trim()];
    setHospitals(list);
    set({ hospitalList: list, hospital: newHospital.trim() });
    setNewHospital("");
  }

  return (
    <div>
      <Section title="검진 일정">
        <Grid2>
          <DatePicker label="검진 일자" required value={data.checkDate} onChange={v => set({ checkDate: v })} />
          <SelectInput label="검진 기관" value={data.hospital} onChange={v => set({ hospital: v })}>
            <option value="">기관 선택</option>
            {hospitals.map(h => <option key={h}>{h}</option>)}
            <option value="__add">+ 기관 추가</option>
          </SelectInput>
        </Grid2>
        {data.hospital === "__add" && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <TextInput label="기관명 입력" value={newHospital} onChange={setNewHospital} />
            </div>
            <div style={{ paddingTop: 20 }}>
              <Button sm onClick={addHospital}>추가</Button>
            </div>
          </div>
        )}
        {!data.examDone && (
          <Button sm onClick={() => {
            if (!checkFields([
              { val: data.checkDate, label: "검진 일자" },
              { val: data.hospital && data.hospital !== "__add" ? data.hospital : "", label: "검진 기관" },
            ])) return;
            set({ examDone: true, examDoneTs: nowStr() });
          }}>
            검진 완료 → 결과 대기 중
          </Button>
        )}
        {data.examDone && !data.result && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400E" }}>
            ⏳ 결과 수령 대기 중 (검진 완료: {data.examDoneTs})
          </div>
        )}
      </Section>

      {data.examDone && !data.result && (
        <Section title="결과 수령 및 처리">
          <DatePicker label="결과 수령일" value={data.resultDate} onChange={v => set({ resultDate: v })} />
          <PassFailRow
            passLabel="✓ 검진 이상 없음"
            failLabel="✗ 불합격"
            onPass={() => {
              if (!checkFields([{ val: data.resultDate, label: "결과 수령일" }])) return;
              set({ result: "합격", ts: nowStr() });
            }}
            onFail={() => {
              if (!checkFields([{ val: data.resultDate, label: "결과 수령일" }])) return;
              set({ result: "불합격", ts: nowStr() });
            }}
          />
        </Section>
      )}
      {data.result && <ResultStamp result={data.result} ts={data.ts} />}
    </div>
  );
}

function PanelSalary({ data, onChange }) {
  function set(p) { onChange({ ...data, ...p }); }

  return (
    <div>
      <InfoBox>연봉 협의 순서: 기존 연봉 → 지원자 희망 → 회사 제시 → 최종 확정</InfoBox>
      <Section title="연봉 협의">
        <Grid4>
          <SalaryInput label="기존 연봉" value={data.currentSalary} onChange={v => set({ currentSalary: v })} placeholder="4000" />
          <SalaryInput label="희망 연봉" value={data.hopeSalary}    onChange={v => set({ hopeSalary: v })}    placeholder="4800" />
          <SalaryInput label="제시 연봉" value={data.offeredSalary} onChange={v => set({ offeredSalary: v })} placeholder="4500" />
          <SalaryInput label="확정 연봉" value={data.finalSalary}   onChange={v => set({ finalSalary: v })}   placeholder="4300" />
        </Grid4>
        <DatePicker label="입사 예정일" required value={data.joinDate} onChange={v => set({ joinDate: v })} />
      </Section>
      {!data.result && (
        <PassFailRow
          passLabel="✓ 처우 협의 완료"
          failLabel="✗ 입사 포기 (협상 결렬)"
          onPass={() => {
            if (!checkFields([
              { val: data.finalSalary, label: "확정 연봉" },
              { val: data.joinDate,    label: "입사 예정일" },
            ])) return;
            set({ result: "완료", ts: nowStr() });
          }}
          onFail={() => set({ result: "불합격", ts: nowStr() })}
        />
      )}
      {data.result && <ResultStamp result={data.result} ts={data.ts} />}
    </div>
  );
}

function PanelFinalNotice({ data, onChange }) {
  function set(p) { onChange({ ...data, ...p }); }

  return (
    <div>
      <Section title="최종 통보">
        <DatePicker label="통보일" required value={data.noticeDate} onChange={v => set({ noticeDate: v })} />
        <Field label="통보 방법">
          <div style={{ display: "flex", gap: 16 }}>
            {["메일", "문자", "유선"].map(m => (
              <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={(data.methods || []).includes(m)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...(data.methods || []), m]
                      : (data.methods || []).filter(x => x !== m);
                    set({ methods: next });
                  }}
                />
                {m}
              </label>
            ))}
          </div>
        </Field>
      </Section>
      {!data.result && (
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="success" onClick={() => {
            if (!checkFields([{ val: data.noticeDate, label: "통보일" }])) return;
            set({ result: "합격", ts: nowStr() });
          }}>
            🎉 최종 합격!
          </Button>
          <Button variant="danger" onClick={() => {
            if (!checkFields([{ val: data.noticeDate, label: "통보일" }])) return;
            set({ result: "불합격", ts: nowStr() });
          }}>
            ✗ 최종 불합격
          </Button>
        </div>
      )}
      {data.result && <ResultStamp result={data.result} ts={data.ts} />}
    </div>
  );
}

function PanelOnboardingPrep({ data, onChange }) {
  function set(p) { onChange({ ...data, ...p }); }

  function handleComplete() {
    if (!data.pcAssetNo && !data.monitorAssetNo) {
      if (!window.confirm("자산번호가 입력되지 않았습니다. 계속하시겠습니까?\n(대시보드에 자산 미준비로 표시됩니다)")) return;
    }
    set({ result: "완료", ts: nowStr() });
  }

  return (
    <div>
      <InfoBox>PC·모니터 자산번호 확인 후 완료 처리하세요. 추후 사내 자산관리 시스템 연동 예정입니다.</InfoBox>
      <Section title="자산 배정">
        <Grid2>
          <TextInput label="PC 자산번호"    value={data.pcAssetNo}      onChange={v => set({ pcAssetNo: v })}      placeholder="예) HAN-2024-001" />
          <TextInput label="모니터 자산번호" value={data.monitorAssetNo} onChange={v => set({ monitorAssetNo: v })} placeholder="예) MON-2024-001" />
        </Grid2>
        <TextInput label="사내 전화 내선번호 (선택)" value={data.extPhone} onChange={v => set({ extPhone: v })} placeholder="예) 1234" />
        <div style={{ padding: "10px 14px", background: "#F8FAFF", borderRadius: 8, border: `1px dashed ${BORDER}`, fontSize: 12, color: MUTED }}>
          🔗 <b>자산관리 시스템 연동 예정</b> — 연동 후 3년 미만 PC/모니터를 목록에서 직접 선택할 수 있습니다.
        </div>
      </Section>
      <Section title="지급 체크리스트">
        {["웰컴키트"].map(item => {
          const chk = (data.checklist || []).includes(item);
          return (
            <label
              key={item}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                fontSize: 13, cursor: "pointer", padding: "8px 12px",
                borderRadius: 8,
                background: chk ? "#D1FAE5" : "#F8FAFF",
                border: `1px solid ${chk ? "#A7F3D0" : BORDER}`,
              }}
            >
              <input
                type="checkbox"
                checked={chk}
                onChange={e => {
                  const next = e.target.checked
                    ? [...(data.checklist || []), item]
                    : (data.checklist || []).filter(x => x !== item);
                  set({ checklist: next });
                }}
              />
              {item}
            </label>
          );
        })}
      </Section>
      {!data.result && <Button variant="success" onClick={handleComplete}>✓ 입사 준비 완료</Button>}
      {data.result && <ResultStamp result={data.result} ts={data.ts} />}
    </div>
  );
}

function PanelEducation({ data, onChange }) {
  function set(p) { onChange({ ...data, ...p }); }

  function toggleEdu(checked) {
    const newCompleted = { ...(data.completed || {}), "공통 입사 교육": checked };
    const newDates     = { ...(data.dates || {}),     "공통 입사 교육": checked ? nowStr() : "" };
    set({ completed: newCompleted, dates: newDates });
  }

  const done = !!(data.completed || {})["공통 입사 교육"];

  return (
    <div>
      <InfoBox>공통 입사 교육(인사·총무·시스템 안내) 이수 후 담당 팀으로 인계됩니다.</InfoBox>
      <Section title="입사 교육 이수">
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 9,
            background: done ? "#D1FAE5" : "#F8FAFF",
            border: `1px solid ${done ? "#A7F3D0" : BORDER}`,
          }}
        >
          <input type="checkbox" checked={done} onChange={e => toggleEdu(e.target.checked)} style={{ cursor: "pointer", width: 16, height: 16 }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: done ? 700 : 400, color: done ? "#065F46" : TEXT }}>공통 입사 교육</span>
          {done && <span style={{ fontSize: 12, color: "#065F46" }}>✓ {(data.dates || {})["공통 입사 교육"]}</span>}
        </div>
      </Section>
      <Section title="소속 정보" color="#10B981">
        <Grid2>
          <TextInput label="소속 부서" value={data.department} onChange={v => set({ department: v })} />
          <TextInput label="담당 업무" value={data.role}       onChange={v => set({ role: v })} />
        </Grid2>
      </Section>
      {!data.result && (
        <Button variant="success" onClick={() => set({ result: "완료", joinedDate: nowStr() })}>
          🎉 입사 완료 처리 (전 프로세스 마감)
        </Button>
      )}
      {data.result === "완료" && (
        <div style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "18px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <p style={{ fontWeight: 800, fontSize: 18, color: "#065F46", margin: "10px 0 4px" }}>입사 완료!</p>
          <p style={{ fontSize: 12, color: "#065F46", margin: 0 }}>처리 시각: {data.joinedDate}</p>
        </div>
      )}
    </div>
  );
}

// ── 단계 패널 디스패처 ─────────────────────────────────────────────────────────
function StagePanel({ stageKey, data, onChange, job }) {
  const safeData = data || {};

  if (stageKey === "application")    return <PanelApplication    data={safeData} onChange={onChange} />;
  if (stageKey === "docReview")      return <PanelDocReview      data={safeData} onChange={onChange} job={job} />;
  if (stageKey === "interview1")     return <PanelInterview      data={safeData} onChange={onChange} isExec={false} />;
  if (stageKey === "interview2")     return <PanelInterview      data={safeData} onChange={onChange} isExec={true} />;
  if (stageKey === "medical")        return <PanelMedical        data={safeData} onChange={onChange} />;
  if (stageKey === "salary")         return <PanelSalary         data={safeData} onChange={onChange} />;
  if (stageKey === "finalNotice")    return <PanelFinalNotice    data={safeData} onChange={onChange} />;
  if (stageKey === "onboardingPrep") return <PanelOnboardingPrep data={safeData} onChange={onChange} />;
  if (stageKey === "education")      return <PanelEducation      data={safeData} onChange={onChange} />;

  // fallback — 이전 버전 데이터로 currentStage 가 잘못된 경우
  return (
    <div style={{ textAlign: "center", padding: 40, color: MUTED }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ fontSize: 14, fontWeight: 700 }}>단계 데이터를 읽을 수 없습니다</p>
      <p style={{ fontSize: 12 }}>이전 버전에서 생성된 데이터입니다. 단계 버튼을 클릭해 원하는 단계로 이동해주세요.</p>
    </div>
  );
}

// ── 지원자 상세 화면 ───────────────────────────────────────────────────────────
function CandDetail({ cand, job, onUpdate, onBack }) {
  // Fix: currentStage 가 undefined/invalid 인 경우 마지막 완료 단계로 초기화
  const safeStage = (function () {
    if (cand.currentStage && SK.includes(cand.currentStage)) return cand.currentStage;
    for (let i = SK.length - 1; i >= 0; i--) {
      const r = cand.stageData?.[SK[i]]?.result;
      if (r === "합격" || r === "완료") return SK[i];
    }
    return SK[0];
  })();

  const [active, setActive] = useState(safeStage);
  const curIdx = SK.indexOf(cand.currentStage && SK.includes(cand.currentStage) ? cand.currentStage : safeStage);

  const isFullyDone = cand.fullyCompleted || cand.stageData?.education?.result === "완료";

  function handleChange(stageKey, newData) {
    const up = { ...cand, stageData: { ...cand.stageData, [stageKey]: newData } };
    const res = newData.result;

    if (!cand.terminated && !isFullyDone && stageKey === cand.currentStage) {
      if (res === "합격" || res === "완료") {
        const ni = SK.indexOf(stageKey) + 1;
        if (ni < SK.length) {
          up.currentStage = SK[ni];
          setActive(SK[ni]);
        } else {
          // 마지막 단계 완료 → fullyCompleted (terminated 아님)
          up.fullyCompleted = true;
        }
      } else if (res === "불합격") {
        up.terminated = true;
        up.terminatedAt = stageKey;
      } else if (res === "인재풀") {
        up.terminated = true;
        up.terminatedAt = stageKey;
        up.talentPool = true;
      }
    }
    onUpdate(up);
  }

  function getState(key) {
    if (isFullyDone) return "done";
    const i = SK.indexOf(key);
    if (cand.terminatedAt === key) return "fail";
    if (cand.terminated) {
      const ti = SK.indexOf(cand.terminatedAt || "");
      if (i > ti) return "locked";
    }
    if (i < curIdx) return "done";
    if (key === (cand.currentStage && SK.includes(cand.currentStage) ? cand.currentStage : safeStage)) return "active";
    return "future";
  }

  const stateColors = {
    active:  { bg: PR,        fg: "#fff" },
    done:    { bg: "#D1FAE5", fg: "#065F46" },
    fail:    { bg: "#FEE2E2", fg: "#991B1B" },
    future:  { bg: "#F1F5F9", fg: "#94A3B8" },
    locked:  { bg: "#F1F5F9", fg: "#CBD5E1" },
  };

  const activeInfo   = STAGES.find(s => s.key === active);
  const statusLabel  = getCandStatus(cand);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 지원자 헤더 */}
      <div style={{ background: `linear-gradient(135deg, ${PR} 0%, ${PRD} 100%)`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(255,255,255,.2)", border: "none", cursor: "pointer", fontSize: 17, padding: "4px 12px", borderRadius: 7, color: "#fff" }}
        >
          ← 목록
        </button>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#fff", flexShrink: 0 }}>
          {cand.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>{cand.name}</span>
            <span style={{ background: "rgba(255,255,255,.25)", color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>
            {job?.title}{job?.jobType ? ` · ${job.jobType}` : ""} · {cand.phone} · {cand.email}
          </div>
        </div>
        {cand.stageData?.salary?.finalSalary && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>확정 연봉</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>
              {Number(cand.stageData.salary.finalSalary).toLocaleString()}만원
            </div>
          </div>
        )}
      </div>

      {/* 단계 트랙 — 서브 상태 포함 */}
      <div style={{ background: "#F8FAFF", borderBottom: `1px solid ${BORDER}`, padding: "10px 22px 14px", overflowX: "auto", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, minWidth: "max-content", alignItems: "flex-start" }}>
          {STAGES.map(stg => {
            const st  = getState(stg.key);
            const cc  = stateColors[st] || stateColors.future;
            const can = st === "done" || st === "active" || st === "fail";
            const sub = getSubStatus(stg.key, cand.stageData);
            return (
              <div key={stg.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => { if (can) setActive(stg.key); }}
                  style={{
                    background: cc.bg, color: cc.fg,
                    border: active === stg.key ? `2px solid ${PR}` : "2px solid transparent",
                    borderRadius: 8, padding: "6px 13px", fontSize: 12,
                    fontWeight: active === stg.key ? 900 : 600,
                    cursor: can ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap", fontFamily: "inherit",
                  }}
                >
                  {stg.icon} {stg.label}{st === "done" && !isFullyDone ? " ✓" : ""}
                </button>
                {sub && (
                  <span style={{ fontSize: 10, color: sub.color, fontWeight: 600, maxWidth: 110, textAlign: "center", lineHeight: 1.3, padding: "0 2px" }}>
                    {sub.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 패널 */}
      <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 24 }}>{activeInfo?.icon}</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>{activeInfo?.label}</h3>
            {!isFullyDone && !cand.terminated && active === (cand.currentStage || safeStage) && (
              <span style={{ background: "#EBF3FF", color: PR, padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                현재 단계
              </span>
            )}
          </div>
          <Card>
            <StagePanel
              key={active}
              stageKey={active}
              data={cand.stageData?.[active] || {}}
              onChange={nd => handleChange(active, nd)}
              job={job}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── 대시보드 ──────────────────────────────────────────────────────────────────
function Dashboard({ jobs, cands, onCandClick }) {
  const [hovStage, setHovStage] = useState(null);
  const now = new Date();
  const d14 = new Date(now.getTime() + 14 * 86400000);

  const total    = cands.length;
  const active   = cands.filter(c => !c.terminated && getCandStatus(c) !== "입사완료").length;
  const hired    = cands.filter(c => getCandStatus(c) === "입사완료").length;
  const rejected = cands.filter(c => c.terminated && !c.talentPool && getCandStatus(c) !== "입사완료").length;
  const pool     = cands.filter(c => c.talentPool).length;

  const byStage = Object.fromEntries(
    SK.map(k => [k, cands.filter(c => c.currentStage === k && !c.terminated && getCandStatus(c) !== "입사완료")])
  );

  const upcoming = cands.filter(c => {
    const jd = c.stageData?.salary?.joinDate;
    if (!jd) return false;
    const d = new Date(jd);
    return d >= now && d <= d14;
  });

  const assetWarn = upcoming.filter(c => {
    const p = c.stageData?.onboardingPrep || {};
    return !p.result || (p.result === "완료" && !p.pcAssetNo && !p.monitorAssetNo);
  });

  const kpis = [
    { icon: "👥", label: "전체 지원",  val: total,    grad: "linear-gradient(135deg,#667EEA,#764BA2)" },
    { icon: "⚡", label: "진행 중",    val: active,   grad: `linear-gradient(135deg,${PR},#60A5FA)` },
    { icon: "🎉", label: "입사 완료",  val: hired,    grad: "linear-gradient(135deg,#10B981,#34D399)" },
    { icon: "❌", label: "불합격",     val: rejected, grad: "linear-gradient(135deg,#EF4444,#F87171)" },
    { icon: "🌟", label: "인재풀",     val: pool,     grad: "linear-gradient(135deg,#8B5CF6,#A78BFA)" },
  ];

  return (
    <div style={{ padding: 28 }}>
      <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 800, color: TEXT }}>채용 현황 대시보드</h2>

      {/* KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 26 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: k.grad, borderRadius: 16, padding: "22px 24px", boxShadow: "0 4px 20px rgba(0,0,0,.12)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginTop: 6 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* 단계별 가로 카드 */}
      <Card style={{ marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: TEXT }}>📈 단계별 진행 현황</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, paddingBottom: 4 }}>
          {STAGES.map(stg => {
            const ppl     = byStage[stg.key] || [];
            const isHov   = hovStage === stg.key;
            const hasData = ppl.length > 0;
            return (
              <div
                key={stg.key}
                style={{ position: "relative" }}
                onMouseEnter={() => setHovStage(stg.key)}
                onMouseLeave={() => setHovStage(null)}
              >
                <div style={{
                  padding: "14px 12px", borderRadius: 12, textAlign: "center",
                  background: hasData ? (isHov ? "#EBF3FF" : "#F0F4FF") : "#F8FAFF",
                  border: `1px solid ${hasData ? (isHov ? PR : BORDER) : BORDER}`,
                  cursor: hasData ? "pointer" : "default",
                  transition: "all .15s",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{stg.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: hasData ? PR : "#CBD5E1", lineHeight: 1 }}>{ppl.length}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.3 }}>{stg.label}</div>
                </div>

                {/* 호버 툴팁 */}
                {isHov && hasData && (
                  <div style={{
                    position: "absolute", bottom: "108%", left: "50%", transform: "translateX(-50%)",
                    zIndex: 50, background: CARD, border: `1px solid ${BORDER}`,
                    borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.15)",
                    padding: "10px 14px", minWidth: 180, whiteSpace: "nowrap",
                  }}>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: MUTED }}>
                      {stg.label} ({ppl.length}명)
                    </p>
                    {ppl.slice(0, 5).map(c => (
                      <div
                        key={c.id}
                        onClick={() => onCandClick(c)}
                        style={{ padding: "4px 0", fontSize: 13, cursor: "pointer", color: PR, borderBottom: `1px solid ${BORDER}` }}
                      >
                        {c.name} <span style={{ fontSize: 11, color: MUTED }}>{jobs.find(j => j.id === c.jobId)?.title || ""}</span>
                      </div>
                    ))}
                    {ppl.length > 5 && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>+{ppl.length - 5}명 더...</div>}
                    {/* 툴팁 삼각형 */}
                    <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: CARD, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 하단 2열 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: TEXT }}>📅 2주 내 입사 예정</h3>
          {upcoming.length === 0
            ? <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>해당 없음</p>
            : upcoming.map(c => {
                const j  = jobs.find(x => x.id === c.jobId);
                const dl = daysUntil(c.stageData?.salary?.joinDate);
                return (
                  <div
                    key={c.id}
                    onClick={() => onCandClick(c)}
                    style={{ padding: "10px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <div>
                        <b style={{ fontSize: 14 }}>{c.name}</b>
                        <span style={{ fontSize: 12, color: MUTED, marginLeft: 6 }}>{j?.title}</span>
                      </div>
                      <span style={{
                        background: dl <= 3 ? "#FEE2E2" : "#EBF3FF",
                        color: dl <= 3 ? "#EF4444" : PR,
                        borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700,
                      }}>
                        D-{dl}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>입사 예정일: {c.stageData?.salary?.joinDate}</div>
                  </div>
                );
              })
          }
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: TEXT, display: "flex", alignItems: "center", gap: 7 }}>
            🚨 자산 미준비
            {assetWarn.length > 0 && (
              <span style={{ background: "#EF4444", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                {assetWarn.length}
              </span>
            )}
          </h3>
          {assetWarn.length === 0
            ? <p style={{ fontSize: 13, color: "#10B981", fontWeight: 700, margin: 0 }}>✓ 입사 예정자 전원 자산 준비 완료</p>
            : assetWarn.map(c => {
                const j       = jobs.find(x => x.id === c.jobId);
                const p       = c.stageData?.onboardingPrep || {};
                const missing = [];
                if (!p.pcAssetNo)      missing.push("PC 자산번호");
                if (!p.monitorAssetNo) missing.push("모니터 자산번호");
                return (
                  <div
                    key={c.id}
                    onClick={() => onCandClick(c)}
                    style={{ padding: "10px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <div>
                        <b style={{ fontSize: 14 }}>{c.name}</b>
                        <span style={{ fontSize: 12, color: MUTED, marginLeft: 6 }}>{j?.title}</span>
                      </div>
                      <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 700 }}>⚠ 미준비</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#EF4444" }}>
                      미입력: {missing.length > 0 ? missing.join(", ") : "자산 준비 미완료"}
                    </div>
                  </div>
                );
              })
          }
        </Card>
      </div>
    </div>
  );
}

// ── 공고 등록 모달 ─────────────────────────────────────────────────────────────
function JobModal({ initial, onSave, onClose }) {
  const [f, setF] = useState(
    initial || { title: "", jobType: "", department: "", requirements: "", preferredSkills: "", periodFrom: "", periodTo: "" }
  );
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <ModalWrap onClose={onClose}>
      <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800, color: TEXT }}>
        📋 채용 공고 {initial ? "수정" : "등록"}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <TextInput label="공고명" required value={f.title} onChange={v => u("title", v)} />
        <Grid2>
          <SelectInput label="직군" required value={f.jobType} onChange={v => u("jobType", v)}>
            <option value="">직군 선택</option>
            {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
          </SelectInput>
          <TextInput label="부서" value={f.department} onChange={v => u("department", v)} />
        </Grid2>
        <Grid2>
          <DatePicker label="채용 시작일" value={f.periodFrom} onChange={v => u("periodFrom", v)} />
          <DatePicker label="채용 마감일" value={f.periodTo}   onChange={v => u("periodTo",   v)} />
        </Grid2>
        <TextInput
          label="자격 요건 (AI 서류 분석에 활용)"
          required rows={4}
          value={f.requirements}
          onChange={v => u("requirements", v)}
          placeholder="예) Node.js 2년 이상 / SQLD 보유 / 문서 작성 능력 우수 등"
        />
        <TextInput label="우대 사항" rows={2} value={f.preferredSkills} onChange={v => u("preferredSkills", v)} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button onClick={() => {
          if (!checkFields([{ val: f.title, label: "공고명" }, { val: f.jobType, label: "직군" }])) return;
          onSave(f);
        }}>저장</Button>
      </div>
    </ModalWrap>
  );
}

// ── 지원자 등록 모달 ───────────────────────────────────────────────────────────
function CandModal({ jobs, preJobId, onSave, onClose }) {
  const t = todayStr();
  const [f, setF] = useState({
    name: "", phone: "", email: "",
    jobId: preJobId || jobs[0]?.id || "",
    privacyOption: 0,
    privacyExpiry: addMonths(t, PRIVACY_OPTS[0].months),
  });

  function u(k, v) { setF(p => ({ ...p, [k]: v })); }

  function handleOpt(opt) {
    const exp = addMonths(t, PRIVACY_OPTS[opt].months);
    setF(p => ({ ...p, privacyOption: opt, privacyExpiry: exp }));
  }

  return (
    <ModalWrap onClose={onClose}>
      <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800, color: TEXT }}>👤 지원자 등록</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="지원 공고 선택" required>
          <select value={f.jobId} onChange={e => u("jobId", e.target.value)} style={{ ...baseInput, cursor: "pointer" }}>
            <option value="">-- 공고를 선택하세요 --</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}{j.jobType ? ` (${j.jobType})` : ""}</option>
            ))}
          </select>
        </Field>
        <Grid2>
          <TextInput label="이름" required value={f.name} onChange={v => u("name", v)} />
          <PhoneInput label="연락처" value={f.phone} onChange={v => u("phone", v)} />
        </Grid2>
        <TextInput label="이메일" value={f.email} onChange={v => u("email", v)} />
        <PrivacyBlock regDate={t} opt={f.privacyOption} onOpt={handleOpt} val={f.privacyExpiry} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button onClick={() => {
          if (!checkFields([{ val: f.name, label: "이름" }, { val: f.jobId, label: "지원 공고" }])) return;
          onSave(f);
        }}>등록</Button>
      </div>
    </ModalWrap>
  );
}

// ── 메인 앱 ───────────────────────────────────────────────────────────────────
function App() {
  function loadLS(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  }

  const [jobs,  setJobs]  = useState(() => loadLS("hpns_jobs"));
  const [cands, setCands] = useState(() => loadLS("hpns_cands").map(migrateCand));

  const [tab,     setTab]     = useState("dashboard");
  const [selJob,  setSelJob]  = useState(null);
  const [selCand, setSelCand] = useState(null);
  const [editJob,  setEditJob]  = useState(null);
  const [showJob,  setShowJob]  = useState(false);
  const [showCand, setShowCand] = useState(false);
  const [preJobId, setPreJobId] = useState(null);

  // Fix: 뒤로가기 시 복귀할 컨텍스트 기억
  const [backCtx, setBackCtx] = useState(null);

  useEffect(() => { try { localStorage.setItem("hpns_jobs",  JSON.stringify(jobs));  } catch {} }, [jobs]);
  useEffect(() => { try { localStorage.setItem("hpns_cands", JSON.stringify(cands)); } catch {} }, [cands]);

  function saveJob(form) {
    if (editJob) setJobs(p => p.map(j => j.id === editJob.id ? { ...j, ...form } : j));
    else setJobs(p => [...p, { ...form, id: Date.now().toString() }]);
    setShowJob(false);
    setEditJob(null);
  }

  function saveCand(form) {
    setCands(p => [...p, { ...form, id: Date.now().toString(), currentStage: "application", terminated: false, stageData: {} }]);
    setShowCand(false);
    setPreJobId(null);
  }

  function updateCand(up) {
    setCands(p => p.map(c => c.id === up.id ? up : c));
    setSelCand(up);
  }

  function openAddCand(jobId) {
    setPreJobId(jobId || null);
    setShowCand(true);
  }

  // 지원자 상세로 진입 — 뒤로가기 컨텍스트 저장
  function enterCand(c, fromTab, fromJob) {
    setBackCtx({ tab: fromTab || tab, selJob: fromJob || selJob });
    setSelCand(c);
    if (fromTab) setTab(fromTab);
    if (fromJob) setSelJob(fromJob);
  }

  // 대시보드에서 클릭 시
  function handleDashCandClick(c) {
    const j = jobs.find(x => x.id === c.jobId);
    enterCand(c, "jobs", j || null);
  }

  // 뒤로가기
  function handleBack() {
    setSelCand(null);
    if (backCtx) {
      setTab(backCtx.tab);
      setSelJob(backCtx.selJob);
      setBackCtx(null);
    }
  }

  function exportCSV() {
    const hdr = ["이름","연락처","이메일","공고명","직군","현재단계","상태","입사예정일","확정연봉(만원)","개인정보만료일"];
    const rows = cands.map(c => {
      const j = jobs.find(x => x.id === c.jobId);
      return [
        c.name, c.phone, c.email,
        j?.title || "", j?.jobType || "",
        STAGES.find(s => s.key === c.currentStage)?.label || "",
        getCandStatus(c),
        c.stageData?.salary?.joinDate || "",
        c.stageData?.salary?.finalSalary || "",
        c.privacyExpiry || "",
      ];
    });
    const csv = [hdr, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = `채용현황_${todayStr()}.csv`;
    a.click();
  }

  const fontStyle = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" };
  const jobCands = selJob ? cands.filter(c => c.jobId === selJob.id) : [];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: BG, ...fontStyle }}>

      {/* 항상 고정 네비게이션 */}
      <div style={{
        background: `linear-gradient(135deg, ${PR} 0%, ${PRD} 100%)`,
        padding: "0 22px",
        display: "flex", alignItems: "center", gap: 4,
        height: 56, flexShrink: 0,
        boxShadow: "0 2px 12px rgba(27,111,219,.3)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 14 }}>
          <div style={{ width: 30, height: 30, background: "rgba(255,255,255,.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏢</div>
          <span style={{ fontWeight: 900, fontSize: 15, color: "#fff", letterSpacing: -0.5 }}>HANSOL PNS</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>채용관리</span>
        </div>

        {[{ k: "dashboard", l: "📊 대시보드" }, { k: "jobs", l: "📋 채용" }].map(item => (
          <button
            key={item.k}
            onClick={() => { setTab(item.k); setSelJob(null); setSelCand(null); setBackCtx(null); }}
            style={{
              padding: "6px 16px", border: "none",
              background: tab === item.k && !selCand ? "rgba(255,255,255,.25)" : "transparent",
              color: "#fff", borderRadius: 8, cursor: "pointer",
              fontSize: 13, fontWeight: tab === item.k && !selCand ? 800 : 500,
              fontFamily: "inherit",
              opacity: tab === item.k && !selCand ? 1 : 0.75,
            }}
          >
            {item.l}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        {jobs.length > 0 && (
          <button
            onClick={() => openAddCand(null)}
            style={{ background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.4)", color: "#fff", padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            + 지원자 등록
          </button>
        )}
        <button
          onClick={exportCSV}
          style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: 6 }}
        >
          ⬇ CSV
        </button>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* 지원자 상세 */}
        {selCand && (
          <CandDetail
            cand={migrateCand(selCand)}
            job={jobs.find(j => j.id === selCand.jobId)}
            onUpdate={updateCand}
            onBack={handleBack}
          />
        )}

        {/* 대시보드 */}
        {!selCand && tab === "dashboard" && (
          <Dashboard jobs={jobs} cands={cands} onCandClick={handleDashCandClick} />
        )}

        {/* 채용 공고 목록 */}
        {!selCand && tab === "jobs" && !selJob && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>채용 공고</h2>
              <Button onClick={() => { setEditJob(null); setShowJob(true); }}>+ 공고 등록</Button>
            </div>

            {jobs.length === 0 ? (
              <Card>
                <p style={{ textAlign: "center", color: "#94A3B8", padding: 60, margin: 0, fontSize: 14 }}>
                  등록된 채용 공고가 없습니다.<br />공고를 먼저 등록해주세요.
                </p>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {jobs.map(job => {
                  const jc = cands.filter(c => c.jobId === job.id);
                  const ac = jc.filter(c => !c.terminated && getCandStatus(c) !== "입사완료").length;
                  return (
                    <Card key={job.id} style={{ cursor: "pointer" }} onClick={() => setSelJob(job)}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                        <div style={{ width: 48, height: 48, background: "#EBF3FF", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                          📋
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{job.title}</span>
                            {job.jobType && (
                              <span style={{ background: "#F0F9FF", color: "#0369A1", borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                                {job.jobType}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
                            {job.department}{job.periodFrom ? ` · ${job.periodFrom} ~ ${job.periodTo || ""}` : ""}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {STAGES.map(stg => {
                              const cnt = jc.filter(c => c.currentStage === stg.key && !c.terminated && getCandStatus(c) !== "입사완료").length;
                              if (!cnt) return null;
                              return (
                                <span key={stg.key} style={{ background: "#EBF3FF", color: PR, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                  {stg.label} {cnt}명
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ textAlign: "center", padding: "0 14px", borderLeft: `1px solid ${BORDER}` }}>
                            <div style={{ fontSize: 26, fontWeight: 900, color: TEXT }}>{jc.length}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>전체</div>
                          </div>
                          <div style={{ textAlign: "center", padding: "0 14px", borderLeft: `1px solid ${BORDER}` }}>
                            <div style={{ fontSize: 26, fontWeight: 900, color: PR }}>{ac}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>진행중</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginLeft: 4 }}>
                            <Button sm variant="ghost" onClick={e => { e.stopPropagation(); setEditJob(job); setShowJob(true); }}>수정</Button>
                            <Button sm variant="success" onClick={e => { e.stopPropagation(); openAddCand(job.id); }}>+ 지원자</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 지원자 목록 */}
        {!selCand && tab === "jobs" && selJob && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setSelJob(null)}
                style={{ background: CARD, border: `1px solid ${BORDER}`, cursor: "pointer", fontSize: 20, padding: "4px 14px", borderRadius: 8, color: MUTED }}
              >
                ←
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT }}>{selJob.title}</h2>
                  {selJob.jobType && (
                    <span style={{ background: "#EBF3FF", color: PR, borderRadius: 5, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
                      {selJob.jobType}
                    </span>
                  )}
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
                  {selJob.department}{selJob.periodFrom ? ` · ${selJob.periodFrom} ~ ${selJob.periodTo}` : ""}
                </p>
              </div>
              <Button onClick={() => openAddCand(selJob.id)}>+ 지원자 등록</Button>
            </div>

            {jobCands.length === 0 ? (
              <Card>
                <p style={{ textAlign: "center", color: "#94A3B8", padding: 60, margin: 0 }}>등록된 지원자가 없습니다.</p>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {jobCands.map(c => {
                  const stg    = STAGES.find(s => s.key === c.currentStage);
                  const status = getCandStatus(c);
                  return (
                    <Card
                      key={c.id}
                      style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                      onClick={() => enterCand(c, "jobs", selJob)}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${PR}, ${PRD})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17, color: "#fff", flexShrink: 0 }}>
                        {c.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {stg && (
                          <span style={{ fontSize: 12, color: MUTED, background: "#F8FAFF", padding: "3px 10px", borderRadius: 6, border: `1px solid ${BORDER}` }}>
                            {stg.icon} {stg.label}
                          </span>
                        )}
                        <StatusChip status={status} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모달 */}
      {showJob  && <JobModal initial={editJob} onSave={saveJob} onClose={() => { setShowJob(false); setEditJob(null); }} />}
      {showCand && <CandModal jobs={jobs} preJobId={preJobId} onSave={saveCand} onClose={() => { setShowCand(false); setPreJobId(null); }} />}
    </div>
  );
}

// 렌더링 코드 추가
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);