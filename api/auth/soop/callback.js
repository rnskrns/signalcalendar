import {
  SOOP_OPENAPI_URL,
  createSignedSession,
  extractSoopId,
  isAdminSoopId,
  noStore,
  oauthConfig,
  publicBaseUrl,
  sessionCookie
} from '../../_lib/soop-auth.js';

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const finish = (status) => res.redirect(302, `${publicBaseUrl(req)}/?soop_login=${encodeURIComponent(status)}`);
  const code = String(req.query.code || '').trim();
  if (!code) return finish('cancelled');

  try {
    const { clientId, clientSecret } = oauthConfig();
    const tokenForm = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code
    });
    const tokenResponse = await fetch(`${SOOP_OPENAPI_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: tokenForm.toString()
    });
    if (!tokenResponse.ok) throw new Error(`token exchange failed: ${tokenResponse.status}`);
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('SOOP access token missing');

    const form = new URLSearchParams({ access_token: tokenData.access_token });
    const profileResponse = await fetch(`${SOOP_OPENAPI_URL}/user/stationinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString()
    });
    if (!profileResponse.ok) throw new Error(`profile request failed: ${profileResponse.status}`);
    const profileJson = await profileResponse.json();
    const profile = profileJson?.data || profileJson;
    const soopId = extractSoopId(profile?.profile_image);
    if (!soopId) throw new Error('SOOP 아이디를 프로필에서 확인할 수 없습니다.');

    // 로그인 화면 표시에 필요한 공개 프로필 정보만 보관합니다.
    // 이메일/전화번호/실명/액세스 토큰은 저장하지 않습니다.
    const session = createSignedSession({
      uid: soopId,
      displayName: String(profile?.user_nick || soopId),
      photoURL: String(profile?.profile_image || ''),
      role: isAdminSoopId(soopId) ? 'admin' : 'viewer'
    });
    res.setHeader('Set-Cookie', sessionCookie(session));
    return finish('success');
  } catch (error) {
    console.error('SOOP OAuth 콜백 실패:', error);
    return finish('failed');
  }
}
