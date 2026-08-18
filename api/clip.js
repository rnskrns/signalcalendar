export default async function handler(req, res) {
  const { streamer, cursor } = req.query;

  if (!streamer) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const originalBjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  const originalBjId = originalBjIdMap[streamer];

  // SOOP VOD Finder가 제공하는 공개 검색 API를 서버에서 프록시한다.
  // 브라우저에서 직접 호출하면 CORS로 차단되므로 이 API 경유가 필요하다.
  const searchParams = new URLSearchParams({ limit: '24' });
  // '전체' 탭은 검색어 없이 최신 공개 VOD/클립 전체를 조회한다.
  if (streamer !== '전체') searchParams.set('q', streamer);
  // 해당 스트리머가 원본인 영상/클립은 제외하고, 관련 클립만 보여준다.
  if (originalBjId) {
    searchParams.set('originalBjId', originalBjId);
    searchParams.set('excludeOriginal', 'true');
  }
  if (cursor) searchParams.set('cursor', cursor);

  try {
    const response = await fetch(`https://vod.soopup.live/api/vods?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'VOD 검색 요청에 실패했습니다.',
        detail: `HTTP ${response.status}`
      });
    }

    return res.status(200).json(await response.json());
  } catch (error) {
    console.error('VOD Finder API 호출 실패:', error.message);
    return res.status(502).json({ error: 'VOD 검색 결과를 가져오지 못했습니다.' });
  }
}
