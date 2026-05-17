// 라우팅 동작 테스트용 엔드포인트
// 어느 메서드든 200 응답 + 메서드명·환경변수 존재 여부 반환
export async function onRequest(context) {
  const { request, env } = context;
  const body = {
    ok: true,
    method: request.method,
    url: request.url,
    env_check: {
      TG_TOKEN_OWNER: !!env.TG_TOKEN_OWNER,
      TG_CHAT_OWNER: !!env.TG_CHAT_OWNER,
      TG_TOKEN_FRIEND: !!env.TG_TOKEN_FRIEND,
      TG_CHAT_FRIEND: !!env.TG_CHAT_FRIEND,
    },
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
