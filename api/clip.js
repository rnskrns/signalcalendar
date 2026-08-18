// SOOP 통합검색의 VOD 탭을 프록시한다.
// SOOP가 발급하는 sck_session_key는 짧은 시간 뒤 만료되므로 코드에 넣지 말고
// Vercel 환경변수 SOOP_SEARCH_SESSION_KEY에 설정해야 한다.
export default async function handler(req, res) {
  const { streamer, page = '1' } = req.query;

  if (!streamer) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const sessionKey = process.env.SOOP_SEARCH_SESSION_KEY;
  if (!sessionKey) {
    return res.status(503).json({
      error: 'SOOP 검색 세션 키가 설정되지 않았습니다.',
      code: 'SOOP_SEARCH_SESSION_KEY_MISSING'
    });
  }

  const searchParams = new URLSearchParams({
    m: 'unifiedSearch',
    keyword: streamer,
    character: 'UTF-8',
    limit: '20',
    tab: 'vod',
    sck_session_key: sessionKey
  });
  if (String(page) !== '1') searchParams.set('page', String(page));

  try {
    const response = await fetch(`https://sch.sooplive.com/api.php?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': `https://www.sooplive.com/search?szKeyword=${encodeURIComponent(streamer)}`,
        'Origin': 'https://www.sooplive.com',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'SOOP VOD 검색 요청에 실패했습니다.',
        detail: `HTTP ${response.status}`
      });
    }

    return res.status(200).json(await response.json());
  } catch (error) {
    console.error('SOOP VOD 검색 API 호출 실패:', error.message);
    return res.status(502).json({ error: 'SOOP VOD 검색 결과를 가져오지 못했습니다.' });
  }
}
