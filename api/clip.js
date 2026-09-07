export default async function handler(req, res) {
  // 클라이언트에서 넘겨주는 검색어(streamer)와 무한 스크롤용 커서(cursor)를 받습니다.
  const { streamer, cursor } = req.query;

  if (!streamer) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const originalBjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  
  // 영문 ID로 검색 요청이 들어올 경우를 대비한 역방향 매핑
  const bjIdToNameMap = Object.fromEntries(
    Object.entries(originalBjIdMap).map(([name, id]) => [id, name])
  );
  
  const streamerName = originalBjIdMap[streamer] ? streamer : (bjIdToNameMap[streamer] || streamer);
  const originalBjId = originalBjIdMap[streamerName];

  // SOOP VOD API 파라미터 조립 (limit: 24개 고정)
  const apiParams = new URLSearchParams({
    q: streamerName,
    limit: '24'
  });

  // 스트리머 본인의 원본 영상을 제외하기 위한 필터링 조건 추가
  if (originalBjId) {
    apiParams.set('originalBjId', originalBjId);
    apiParams.set('excludeOriginal', 'true');
  }

  // 더보기를 통해 넘겨받은 다음 페이지 커서가 존재하면 파라미터에 추가
  if (cursor) {
    apiParams.set('cursor', cursor);
  }

  const apiUrl = `https://vod.soopup.live/api/vods?${apiParams.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'VOD 데이터를 불러오지 못했습니다.' });
    }

    const data = await response.json();
    
    // API 응답에서 아이템 배열과 다음 페이지를 위한 커서 값 추출
    // (api 구조가 data.vods, data.items, data.data 등일 수 있으므로 방어적으로 탐색)
    const rawItems = data.vods || data.items || data.data || (Array.isArray(data) ? data : []);
    const nextCursor = data.nextCursor || data.cursor || null;

    // 프론트엔드 형식에 맞게 데이터 매핑
    const clips = rawItems.map(item => ({
      titleNo: item.titleNo || item.id,
      url: `https://vod.sooplive.com/player/${item.titleNo || item.id}`,
      title: item.title || '',
      thumbnailUrl: item.thumbnail || item.thumb || '',
      type: item.type || 'VOD',
      duration: item.duration || 0,
      stationNick: item.user_nick || item.stationNick || item.userNick || '',
      viewCount: item.view_cnt || item.views || item.viewCount || 0,
      regDate: item.reg_date || item.date || item.regDate || ''
    }));

    // 매핑된 데이터와 커서 상태 반환
    return res.status(200).json({
      items: clips,
      nextCursor: nextCursor,
      hasMore: !!nextCursor && clips.length > 0 // 커서가 있고 로드된 영상이 1개라도 있으면 true
    });

  } catch (error) {
    console.error('VOD API Fetch Error:', error);
    return res.status(502).json({ error: '서버 통신 중 오류가 발생했습니다.' });
  }
}