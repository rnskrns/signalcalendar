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

  // ✅ BJ별 VOD(다시보기) 목록 API로 복원
  // script.js의 파싱 로직(title_no, thumb, reg_date, duration)이 이 응답 구조에 맞춰져 있음
  const targetUrl = `https://bjapi.afreecatv.com/api/${bjId}/vods/all?page=${pageNo}&per_page=20&orderby=reg_date&field=title`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.sooplive.com/station/${bjId}`,
        'Origin': 'https://www.sooplive.com'
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