export async function sendKakaoMemo(supabaseAdmin, text) {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey || !supabaseAdmin) return;

  const { data: tokenRow, error } = await supabaseAdmin
    .from('kakao_tokens')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !tokenRow) {
    console.error('카카오 토큰 조회 실패:', error);
    return;
  }

  let accessToken = tokenRow.access_token;
  const expiresAt = new Date(tokenRow.expires_at).getTime();

  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: restApiKey,
      refresh_token: tokenRow.refresh_token,
    });
    if (process.env.KAKAO_CLIENT_SECRET) {
      params.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
    }
    const r = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await r.json();
    if (!data.access_token) {
      console.error('카카오 토큰 갱신 실패:', data);
      return;
    }
    accessToken = data.access_token;
    const updates = {
      access_token: accessToken,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (data.refresh_token) updates.refresh_token = data.refresh_token;
    await supabaseAdmin.from('kakao_tokens').update(updates).eq('id', 1);
  }

  const templateObject = {
    object_type: 'text',
    text,
    link: { web_url: 'https://jnspacestudio.vercel.app', mobile_web_url: 'https://jnspacestudio.vercel.app' },
    button_title: '홈페이지 바로가기',
  };

  const sendRes = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'template_object=' + encodeURIComponent(JSON.stringify(templateObject)),
  });
  const sendData = await sendRes.json();
  if (sendData.result_code !== 0) {
    console.error('카카오 나에게 보내기 실패:', sendData);
  }
}
