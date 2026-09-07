export default async function handler(req, res) {
  const { streamer, cursor } = req.query;

  if (!streamer) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const originalBjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  
  const bjIdToNameMap = Object.fromEntries(
    Object.entries(originalBjIdMap).map(([name, id]) => [id, name])
  );
  
  const streamerName = originalBjIdMap[streamer] ? streamer : (bjIdToNameMap[streamer] || streamer);
  const originalBjId = originalBjIdMap[streamerName];

  const apiParams = new URLSearchParams({
    q: streamerName,
    limit: '24'
  });

  if (originalBjId) {
    apiParams.set('originalBjId', originalBjId);
    apiParams.set('excludeOriginal', 'true');
  }

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
    
    // API 응답 데이터 추출
    const rawItems = data.vods || data.items || data.data || (Array.isArray(data) ? data : []);
    const nextCursor = data.nextCursor || data.cursor || null;

    // 실제 원본 데이터 구조에 맞게 매핑
    const clips = rawItems.map(item => {
      // 1. 썸네일 URL 'http' -> 'https' 강제 변환 (Mixed Content 차단 방지)
      let thumb = item.thumbnailUrl || '';
      if (thumb.startsWith('http://')) {
        thumb = thumb.replace('http://', 'https://');
      } else if (thumb.startsWith('//')) {
        thumb = 'https:' + thumb;
      }

      // 2. durationMs (밀리초) -> 초 단위로 변환
      const durationSeconds = item.durationMs ? Math.floor(item.durationMs / 1000) : 0;

      return {
        titleNo: item.titleNo,
        url: item.url || `https://vod.sooplive.com/player/${item.titleNo}`,
        title: item.title || '',
        thumbnailUrl: thumb,
        type: item.type || 'VOD',
        duration: durationSeconds,
        stationNick: item.stationNick || '',
        viewCount: item.viewCount || 0,
        regDate: item.regDate || ''
      };
    });

    return res.status(200).json({
      items: clips,
      nextCursor: nextCursor,
      hasMore: !!nextCursor && clips.length > 0
    });

  } catch (error) {
    console.error('VOD API Fetch Error:', error);
    return res.status(502).json({ error: '서버 통신 중 오류가 발생했습니다.' });
  }
}