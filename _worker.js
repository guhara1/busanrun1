// _worker.js — Cloudflare Workers Static Assets 라우트 (백업)
// functions/api/inquiry.js와 동일 로직.
// Pages Functions가 안 잡힐 때 대비.
//
// 환경변수: TG_TOKEN_OWNER, TG_CHAT_OWNER, TG_TOKEN_FRIEND, TG_CHAT_FRIEND

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/inquiry') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'https://busanmassage.xyz',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      if (request.method === 'POST') {
        return handleInquiry(request, env);
      }
      return jsonResponse({ ok: false, error: 'Method not allowed. POST only.' }, 405);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};

async function handleInquiry(request, env) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return jsonResponse({ ok: false, error: 'Content-Type must be application/json' }, 400);
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
  }

  if (data.website) {
    return jsonResponse({ ok: true, skipped: true });
  }

  const required = ['companyName', 'name', 'contact'];
  for (const k of required) {
    if (!data[k] || String(data[k]).trim() === '') {
      return jsonResponse({ ok: false, error: `필수 항목 누락: ${k}` }, 400);
    }
  }

  const type = (data.type || '').toString().trim();
  const title = type === 'register'
    ? '📥 부산달리기 업체 등록 문의'
    : type === 'partnership'
      ? '📥 부산달리기 제휴 문의'
      : '📥 부산달리기 문의';

  const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const sections = [];
  sections.push(title);
  sections.push('━━━━━━━━━━━━━━━━━━');

  const bizLines = [];
  if (data.companyName) bizLines.push(`• 업체/회사명: ${data.companyName}`);
  if (data.region) bizLines.push(`• 지역: ${data.region}`);
  if (data.courses) bizLines.push(`• 제공 코스: ${data.courses}`);
  if (bizLines.length) {
    sections.push('🏢 업체 정보');
    sections.push(bizLines.join('\n'));
    sections.push('');
  }

  if (type === 'partnership') {
    const ptLines = [];
    if (data.partnershipType) ptLines.push(`• 제휴 유형: ${data.partnershipType}`);
    if (ptLines.length) {
      sections.push('🔗 제휴 정보');
      sections.push(ptLines.join('\n'));
      sections.push('');
    }
  }

  const mgrLines = [];
  mgrLines.push(`• 성함: ${data.name}`);
  mgrLines.push(`• 연락처: ${data.contact}`);
  if (data.email) mgrLines.push(`• 이메일: ${data.email}`);
  sections.push('👤 담당자');
  sections.push(mgrLines.join('\n'));
  sections.push('');

  sections.push('📝 문의 내용');
  sections.push((data.message && String(data.message).trim()) || '(내용 없음)');
  sections.push('');
  sections.push('━━━━━━━━━━━━━━━━━━');
  sections.push(`🕒 접수: ${ts}`);

  const message = sections.join('\n');

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
      results.push({ label: t.label, ok: body.ok === true, body });
    } catch (e) {
      results.push({ label: t.label, ok: false, error: String(e) });
    }
  }

  const anyOk = results.some((r) => r.ok);
  return jsonResponse({ ok: anyOk, results }, anyOk ? 200 : 502);
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': 'https://busanmassage.xyz',
    },
  });
}
