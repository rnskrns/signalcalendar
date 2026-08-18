// api/clip.js 파일
export default async function handler(req, res) {
  const { streamer, page } = req.query;
  
  if (!streamer) {
    return res.status(400).json({ error: '스트리머 이름이 필요합니다.' });
  }

  const pageNo = page || 1;
  const keyword = encodeURIComponent(streamer);
  
  // 🔥 변경됨: 요청하신 통합 검색(unifiedSearch) API 주소 적용
  const targetUrl = `https://sch.sooplive.com/api.php?m=unifiedSearch&keyword=${keyword}&character=UTF-8&limit=20&page=${pageNo}&tab=vod`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        // SOOP 서버 방화벽 우회용 가짜 헤더
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://search.sooplive.com/',
        'Origin': 'https://search.sooplive.com'
      }
    });

    if (!response.ok) {
      throw new Error(`SOOP API Error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('API Fetch Error:', error);
    res.status(500).json({ error: '데이터를 가져오는데 실패했습니다.' });
  }
}