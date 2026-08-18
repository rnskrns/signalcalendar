// api/clip.js 파일
export default async function handler(req, res) {
  const { streamer, page } = req.query;
  
  if (!streamer) {
    return res.status(400).json({ error: '스트리머 이름이 필요합니다.' });
  }

  const pageNo = page || 1;

  // streamer(닉네임) -> 실제 bjid로 매핑
  const bjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  const bjId = bjIdMap[streamer] || streamer;

  // VOD 종류: all(전체) / normal(방송) / review(리뷰) / clip(클립)
  const vodType = req.query.type || 'all';

  // 🚨 bjapi.afreecatv.com 은 아프리카TV → SOOP 리브랜딩 과정에서 폐지된 구(舊) 도메인입니다.
  // 현재 VOD 목록은 chapi.sooplive.com 에서 /api/{bjid}/vods/{type} 형태로 제공됩니다.
  // (참고: yt-dlp의 SOOP 유저 VOD 목록 추출기가 동일한 엔드포인트를 사용합니다)
  const hosts = ['https://chapi.sooplive.com', 'https://chapi.sooplive.co.kr'];

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://www.sooplive.com/station/${bjId}/vod`,
    'Origin': 'https://www.sooplive.com'
  };

  let lastError = null;

  for (const host of hosts) {
    const targetUrl = `${host}/api/${bjId}/vods/${vodType}?page=${pageNo}&per_page=20&orderby=reg_date`;
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: commonHeaders
      });

      if (!response.ok) {
        throw new Error(`SOOP API Error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);

    } catch (error) {
      console.error(`API Fetch Error (${host}):`, error.message);
      lastError = error;
      // 다음 호스트로 재시도
    }
  }

  res.status(500).json({ error: '데이터를 가져오는데 실패했습니다.', detail: lastError?.message });
}