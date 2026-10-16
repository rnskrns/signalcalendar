import { SOOP_SESSION_COOKIE, noStore, readCookie, verifySignedSession } from '../../_lib/soop-auth.js';

export default function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const session = verifySignedSession(readCookie(req, SOOP_SESSION_COOKIE));
    if (!session) return res.status(401).json({ authenticated: false });
    return res.status(200).json({
      authenticated: true,
      user: {
        uid: session.uid,
        displayName: session.displayName || session.uid,
        photoURL: session.photoURL || '',
        role: session.role === 'admin' ? 'admin' : 'viewer'
      }
    });
  } catch (error) {
    console.error('SOOP 세션 확인 실패:', error);
    return res.status(401).json({ authenticated: false });
  }
}
