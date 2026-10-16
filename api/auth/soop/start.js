import { SOOP_OPENAPI_URL, noStore, oauthConfig } from '../../_lib/soop-auth.js';

export default function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { clientId } = oauthConfig();
    const url = new URL(`${SOOP_OPENAPI_URL}/auth/code`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', 'user_stationinfo');
    return res.redirect(302, url.toString());
  } catch (error) {
    console.error('SOOP OAuth 시작 실패:', error);
    return res.redirect(302, '/?soop_login=config_error');
  }
}
