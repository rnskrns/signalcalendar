// api/clip.js 파일
export default async function handler(req, res) {
  const { streamer, page } = req.query;
  
  if (!streamer) {
    return res.status(400).json({ error: '스트리머 이름이 필요합니다.' });
  }

  const pageNo = page || 1;
  const keyword = encodeURIComponent(streamer);
  
  // SOOP 공식 검색 API 주소
  const targetUrl = `https://sch.sooplive.com/api.php?m=vodSearch&w=webk&szKeyword=${keyword}&nPageNo=${pageNo}&nListCnt=24&szOrder=reg_date&szFileType=ALL&tab=vod`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        // 🔥 핵심: SOOP 공식 웹사이트에서 요청하는 것처럼 헤더 위조
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