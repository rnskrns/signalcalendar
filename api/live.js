export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: '허용되지 않은 요청입니다.' });

  const streamer = String(req.query.streamer || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{2,30}$/.test(streamer)) {
    return res.status(400).json({ error: '올바른 방송국 아이디가 필요합니다.' });
  }

  try {
    const response = await fetch(`https://bjapi.afreecatv.com/api/${streamer}/station`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SIGNAL-Schedule/1.0)',
        Referer: `https://www.sooplive.com/station/${streamer}`
      }
    });
    if (!response.ok) return res.status(response.status).json({ live: false });

    const data = await response.json();
    const broad = data?.broad;
    if (!broad) {
      res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=20');
      return res.status(200).json({ live: false });
    }

    const broadNo = String(broad.broad_no || broad.broadNo || broad.bno || '');
    const info = {
      title: String(broad.broad_title || broad.broadTitle || broad.title || '라이브 방송 중'),
      thumbnail: String(broad.broad_thumb || broad.broadThumb || broad.thumbnail || broad.thumb || (broadNo ? `https://liveimg.sooplive.co.kr/m/${broadNo}` : '')),
      url: `https://play.sooplive.com/${streamer}`,
      broadNo
    };
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=20');
    return res.status(200).json({ live: true, info });
  } catch (error) {
    console.error('SOOP live fetch error:', error);
    return res.status(502).json({ error: '라이브 상태를 확인하지 못했습니다.' });
  }
}
