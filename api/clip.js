// SOOP 통합검색의 VOD 탭을 프록시한다.
// SOOP가 발급하는 sck_session_key는 짧은 시간 뒤 만료되므로 코드에 넣지 말고
// Vercel 환경변수 SOOP_SEARCH_SESSION_KEY에 설정해야 한다.

function findVodItems(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) {
    // VOD 항목 배열은 보통 제목과 재생 식별자/썸네일 중 하나를 가진다.
    if (value.some(item => item && typeof item === 'object' && (
      item.title || item.title_name || item.vod_title || item.title_no || item.vod_bno || item.bno
    ))) return value;

    for (const item of value) {
      const result = findVodItems(item, seen);
      if (result.length) return result;
    }
    return [];
  }

  // VOD 관련 키를 먼저 살펴본 뒤, 나머지 하위 객체도 탐색한다.
  const keys = Object.keys(value).sort((a, b) => {
    const aVod = /vod|video|contents|list|item/i.test(a) ? 0 : 1;
    const bVod = /vod|video|contents|list|item/i.test(b) ? 0 : 1;
    return aVod - bVod;
  });
  for (const key of keys) {
    const result = findVodItems(value[key], seen);
    if (result.length) return result;
  }
  return [];
}

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

    const data = await response.json();
    // SOOP 응답의 목록 경로가 변경돼도 프론트는 항상 items만 읽도록 정규화한다.
    return res.status(200).json({ items: findVodItems(data) });
  } catch (error) {
    console.error('SOOP VOD 검색 API 호출 실패:', error.message);
    return res.status(502).json({ error: 'SOOP VOD 검색 결과를 가져오지 못했습니다.' });
  }
}
