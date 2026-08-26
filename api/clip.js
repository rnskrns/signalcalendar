export default async function handler(req, res) {
  const { streamer, cursor, page } = req.query;

  if (!streamer) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const originalBjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  // 프론트가 한글 별명 대신 영문 SOOP 아이디(choiagain 등)를 보낼 수도 있으므로
  // 역방향 매핑도 함께 만들어 어느 쪽이 와도 동일하게 동작하게 한다.
  const bjIdToNameMap = Object.fromEntries(
    Object.entries(originalBjIdMap).map(([name, id]) => [id, name])
  );

  const streamerName = originalBjIdMap[streamer] ? streamer : (bjIdToNameMap[streamer] || streamer);
  const originalBjId = originalBjIdMap[streamerName];

  // SOOP VOD Finder가 제공하는 공개 검색 API를 서버에서 프록시한다.
  // 브라우저에서 직접 호출하면 CORS로 차단되므로 이 API 경유가 필요하다.
  const searchParams = new URLSearchParams({
    q: streamerName,
    limit: '24'
  });
  // 해당 스트리머가 원본인 영상/클립은 제외하고, 관련 클립만 보여준다.
  if (originalBjId) {
    searchParams.set('originalBjId', originalBjId);
    searchParams.set('excludeOriginal', 'true');
  }
  if (cursor) searchParams.set('cursor', cursor);
  // 일부 VOD Finder 배포본은 커서 대신 page 값을 사용한다.
  // 두 값을 함께 전달하면 사용하는 방식만 반영된다.
  if (page) searchParams.set('page', page);

  const upstreamUrl = `https://vod.soopup.live/api/vods?${searchParams.toString()}`;

  try {
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    // 응답 본문을 먼저 텍스트로 받아두고, JSON이면 파싱해서 그대로 반환한다.
    // (실패 시에도 본문을 버리지 않고 detail에 담아 원인을 바로 확인할 수 있게 한다.)
    const rawBody = await response.text();

    if (!response.ok) {
      // Vercel 함수 로그에서 실제 원인을 바로 확인할 수 있도록 남긴다.
      console.error('VOD Finder API 오류:', upstreamUrl, response.status, rawBody.slice(0, 500));
      return res.status(response.status).json({
        error: 'VOD 검색 요청에 실패했습니다.',
        detail: `HTTP ${response.status}`,
        upstreamUrl,
        // 상위 API가 내려준 실제 에러 메시지(있다면)를 그대로 노출한다.
        upstreamBody: rawBody.slice(0, 1000)
      });
    }

    let json;
    try {
      json = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('VOD Finder 응답 JSON 파싱 실패:', parseError.message, rawBody.slice(0, 500));
      return res.status(502).json({
        error: 'VOD 검색 결과 형식이 올바르지 않습니다.',
        upstreamUrl
      });
    }

    return res.status(200).json(json);
  } catch (error) {
    console.error('VOD Finder API 호출 실패:', upstreamUrl, error.message);
    return res.status(502).json({ error: 'VOD 검색 결과를 가져오지 못했습니다.', detail: error.message });
  }
}
