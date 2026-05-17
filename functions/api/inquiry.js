// Cloudflare Pages Function: 문의 폼 → 텔레그램 봇 2개 동시 발송
// POST /api/inquiry
//
// 환경변수 (Cloudflare Pages Dashboard → Settings → Environment variables):
//   TG_BOT_TOKEN_1   : 첫 번째 봇 토큰
//   TG_CHAT_ID_1     : 첫 번째 채팅 ID
//   TG_BOT_TOKEN_2   : 두 번째 봇 토큰
//   TG_CHAT_ID_2     : 두 번째 채팅 ID

export async function onRequestPost(context) {
  const { request, env } = context;

  // ---------- 1. CORS 헤더 (동일 출처에서만 사용되지만 안전상) ----------
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'https://busanmassage.xyz',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // ---------- 2. JSON 파싱 ----------
    const data = await request.json();

    // ---------- 3. 허니팟 (봇 차단) ----------
    if (data.website || data.honey) {
      // 봇으로 판단, 조용히 성공 처리
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // ---------- 4. 필수 항목 ----------
    const type = (data.type || '').toString().trim();
    const name = (data.name || '').toString().trim();
    const contact = (data.contact || '').toString().trim();

    if (!type || !name || !contact) {
      return new Response(JSON.stringify({ error: '필수 항목이 누락되었습니다.' }), {
        status: 400, headers,
      });
    }

    if (contact.length < 5 || contact.length > 50) {
      return new Response(JSON.stringify({ error: '연락처 형식이 올바르지 않습니다.' }), {
        status: 400, headers,
      });
    }

    // ---------- 5. 텔레그램 메시지 구성 ----------
    const kst = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const typeLabel = type === 'register'
      ? '📝 <b>업체 등록 문의</b>'
      : type === 'partnership'
        ? '🤝 <b>제휴 문의</b>'
        : '✉️ <b>문의</b>';

    const safe = (v) => String(v || '').replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c]));

    const lines = [typeLabel, ''];

    if (data.companyName) lines.push(`🏢 <b>업체/회사명</b>: ${safe(data.companyName)}`);
    if (data.region) lines.push(`📍 <b>지역</b>: ${safe(data.region)}`);
    if (data.partnershipType) lines.push(`🔗 <b>제휴 유형</b>: ${safe(data.partnershipType)}`);
    if (data.courses) lines.push(`💆 <b>제공 코스</b>: ${safe(data.courses)}`);
    lines.push(`👤 <b>담당자</b>: ${safe(name)}`);
    lines.push(`📞 <b>연락처</b>: ${safe(contact)}`);
    if (data.email) lines.push(`📧 <b>이메일</b>: ${safe(data.email)}`);

    lines.push('');
    lines.push('💬 <b>내용</b>:');
    lines.push(safe(data.message || '(내용 없음)'));
    lines.push('');
    lines.push(`⏰ ${kst}`);

    const text = lines.join('\n');

    // ---------- 6. 텔레그램 발송 (2 봇 병렬) ----------
    const sendToTelegram = async (token, chatId) => {
      if (!token || !chatId) return { ok: false, reason: 'no_env' };
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });
        const json = await res.json();
        return { ok: json.ok === true, reason: json.description };
      } catch (e) {
        return { ok: false, reason: e.message };
      }
    };

    const [r1, r2] = await Promise.all([
      sendToTelegram(env.TG_BOT_TOKEN_1, env.TG_CHAT_ID_1),
      sendToTelegram(env.TG_BOT_TOKEN_2, env.TG_CHAT_ID_2),
    ]);

    const successCount = (r1.ok ? 1 : 0) + (r2.ok ? 1 : 0);

    if (successCount === 0) {
      return new Response(JSON.stringify({
        error: '발송 실패',
        details: [r1.reason, r2.reason],
      }), { status: 500, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      sent: successCount,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: '요청 처리 중 오류가 발생했습니다.', message: e.message }), {
      status: 500, headers,
    });
  }
}

// ---------- OPTIONS preflight ----------
export async function onRequestOptions() {
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
