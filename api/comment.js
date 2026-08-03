// api/comment.js
// 참고: https://github.com/meildan332-lgtm/upranking/blob/main/api/comment.js
// 브라우저에서 SOOP(api-channel.sooplive.com)로 직접 요청하면 CORS/봇 차단에 막히는 경우가 있어,
// 서버(Vercel Serverless Function)가 대신 요청해서 순수 JSON만 클라이언트로 돌려준다.

export default async function handler(req, res) {
  // CORS 설정 (위젯/사이트에서 이 서버로 요청할 수 있도록 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. 클라이언트가 넘겨준 게시글 주소(및 선택 값들) 가져오기
  const { url, highlight, page } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL 파라미터가 필요합니다." });
  }

  try {
    // 2. 게시글 주소에서 '채널명'과 '게시글 번호' 추출
    // 입력 예시: https://www.sooplive.com/station/ecvhao/post/201137725
    // match[1] = ecvhao (채널명)
    // match[2] = 201137725 (게시물 번호)
    const cleanUrl = url.split('#')[0]; // # 꼬리표 제거
    const match = cleanUrl.match(/\/station\/([a-zA-Z0-9_-]+)\/post\/(\d+)/);

    const channelId = match ? match[1] : null;
    const postId = match ? match[2] : null;

    if (!channelId || !postId) {
      return res.status(400).json({ error: "게시글 주소 형식이 올바르지 않습니다. (채널명 또는 게시물 번호를 찾을 수 없음)" });
    }

    // page 파라미터가 없으면 1페이지만 요청 (참고 저장소와 동일한 기본 동작)
    const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;

    // 🎯 3. SOOP Request URL 조립
    // page : 요청할 댓글 페이지
    // orderBy=like_cnt : 추천수(인기)순 정렬
    // pHighlightNo : 하이라이트할 댓글 번호 (있으면 몇 페이지에 있든 응답에 포함되어 옴)
    const highlightParam = highlight ? `&pHighlightNo=${encodeURIComponent(highlight)}` : '';
    const targetApiUrl = `https://api-channel.sooplive.com/v1.1/channel/${channelId}/post/${postId}/comment?page=${pageNum}&orderBy=like_cnt&cCommentNo=0${highlightParam}`;

    // 4. SOOP 서버에 API 요청 (서버 대 서버 요청이라 CORS 제약이 없고, 봇 차단 우회용으로 브라우저 UA/Referer를 흉내냄)
    const response = await fetch(targetApiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': cleanUrl,
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    // SOOP 서버가 준 순수 JSON 데이터
    const data = await response.json();

    // 5. 클라이언트로 데이터 전달 및 캐싱 설정
    // 좋아요 수는 초 단위로 실시간일 필요가 없으므로, 프론트엔드 메모리 캐시(45초)와 맞춰
    // Edge 캐시를 30초로 늘려서 SOOP 서버까지 왕복하는 횟수 자체를 줄인다.
    // (s-maxage 동안은 캐시 즉시 응답, 이후 stale-while-revalidate 동안은 오래된 데이터를 먼저 주고 백그라운드에서 갱신)
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(data);

  } catch (error) {
    console.error("크롤링 에러:", error);
    res.status(500).json({ error: "서버에서 데이터를 가져오는 중 문제가 발생했습니다." });
  }
}
