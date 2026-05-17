// Cloudflare Pages Function — /api/inquiry
// 부산달리기 문의 폼 → 텔레그램 이중 발송
//
// 환경변수: TG_TOKEN_OWNER, TG_CHAT_OWNER, TG_TOKEN_FRIEND, TG_CHAT_FRIEND

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS,
    },
  });
}

// 모든 메서드를 명시적으로 처리
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (method !== 'POST') {
    return json({ ok: false, error: `Method ${method} not allowed. POST only.` }, 405);
  }

  // Content-Type 검증
  const ct = request.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'Content-Type must be application/json' }, 400);
  }

  // JSON 파싱
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  // 허니팟
  if (data.website) {
    return json({ ok: true, skipped: true });
  }

  // 필수 항목
  const required = ['companyName', 'name', 'contact'];
  for (const k of required) {
    if (!data[k] || String(data[k]).trim() === '') {
      return json({ ok: false, error: `필수 항목 누락: ${k}` }, 400);
    }
  }

  // 메시지 구성
  const type = (data.type || '').toString().trim();
  const title = type === 'register'
    ? '📥 부산달리기 업체 등록 문의'
    : type === 'partnership'
      ? '📥 부산달리기 제휴 문의'
      : '📥 부산달리기 문의';

  const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const lines = [
    title,
    '━━━━━━━━━━━━━━━━━━',
  ];

  // 업체 정보
  if (data.companyName) lines.push(`🏢 업체/회사명: ${data.companyName}`);
  if (data.region) lines.push(`📍 지역: ${data.region}`);
  if (data.courses) lines.push(`💆 제공 코스: ${data.courses}`);
  if (data.partnershipType) lines.push(`🔗 제휴 유형: ${data.partnershipType}`);

  lines.push('');
  lines.push(`👤 담당자: ${data.name}`);
  lines.push(`📞 연락처: ${data.contact}`);
  if (data.email) lines.push(`📧 이메일: ${data.email}`);

  lines.push('');
  lines.push('📝 내용:');
  lines.push((data.message && String(data.message).trim()) || '(내용 없음)');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push(`🕒 접수: ${ts}`);

  const message = lines.join('\n');

  // 이중 발송
  const targets = [
    { token: env.TG_TOKEN_OWNER,  chat: env.TG_CHAT_OWNER,  label: '대표' },
    { token: env.TG_TOKEN_FRIEND, chat: env.TG_CHAT_FRIEND, label: '보조' },
  ];

  const results = [];
  for (const t of targets) {
    if (!t.token || !t.chat) {
      results.push({ label: t.label, ok: false, error: 'env not set' });
      continue;
    }
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${t.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: t.chat,
          text: message,
          disable_web_page_preview: true,
        }),
      });
      const body = await tgRes.json();
      results.push({ label: t.label, ok: body.ok === true, description: body.description });
    } catch (e) {
      results.push({ label: t.label, ok: false, error: String(e) });
    }
  }

  const anyOk = results.some((r) => r.ok);
  return json({ ok: anyOk, results }, anyOk ? 200 : 502);
}
