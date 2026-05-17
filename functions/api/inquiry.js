// 가장 단순한 형태 — 라우팅 검증용
// Cloudflare Pages가 이 파일을 인식하면 어떤 메서드로 와도 200 응답.

export async function onRequestPost({ request, env }) {
  let data = {};
  try { data = await request.json(); } catch (_) {}

  // 허니팟
  if (data.website) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 필수
  if (!data.companyName || !data.name || !data.contact) {
    return new Response(JSON.stringify({ ok: false, error: '필수 항목 누락' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 메시지
  const title = data.type === 'register' ? '📥 부산달리기 업체 등록 문의' : '📥 부산달리기 제휴 문의';
  const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const lines = [
    title,
    '━━━━━━━━━━━━━━━━━━',
    `🏢 ${data.companyName || '-'}`,
    data.region ? `📍 ${data.region}` : null,
    data.courses ? `💆 ${data.courses}` : null,
    data.partnershipType ? `🔗 ${data.partnershipType}` : null,
    '',
    `👤 ${data.name}`,
    `📞 ${data.contact}`,
    data.email ? `📧 ${data.email}` : null,
    '',
    `📝 ${data.message || '(없음)'}`,
    '━━━━━━━━━━━━━━━━━━',
    `🕒 ${ts}`,
  ].filter(Boolean);
  const message = lines.join('\n');

  // 발송
  const send = async (token, chat, label) => {
    if (!token || !chat) return { label, ok: false, reason: 'env missing' };
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: message }),
      });
      const j = await r.json();
      return { label, ok: j.ok === true, description: j.description };
    } catch (e) {
      return { label, ok: false, reason: String(e) };
    }
  };

  const results = await Promise.all([
    send(env.TG_TOKEN_OWNER, env.TG_CHAT_OWNER, 'owner'),
    send(env.TG_TOKEN_FRIEND, env.TG_CHAT_FRIEND, 'friend'),
  ]);

  const anyOk = results.some(r => r.ok);
  return new Response(JSON.stringify({ ok: anyOk, results }), {
    status: anyOk ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet = () =>
  new Response(JSON.stringify({ ok: true, hint: 'POST만 처리. GET은 라우팅 확인용.' }), {
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
