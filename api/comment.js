// api/comment.js

export default async function handler(req, res) {
  // CORS 설정 (프론트엔드에서 이 서버로 요청할 수 있도록 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. 프론트엔드에서 넘겨준 일반 게시글 주소 가져오기
  const { url, highlight } = req.query;

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

    // 3. SOOP Request URL 조립 함수
    // page=N : N번째 페이지 댓글
    // orderBy=like_cnt : 추천수(인기)순 정렬
    // pHighlightNo : 하이라이트할 댓글 번호 (있으면 몇 페이지에 있든 응답에 포함되어 옴)
    const highlightParam = highlight ? `&pHighlightNo=${encodeURIComponent(highlight)}` : '';
    const buildApiUrl = (page) =>
      `https://api-channel.sooplive.com/v1.1/channel/${channelId}/post/${postId}/comment?page=${page}&orderBy=like_cnt&cCommentNo=0${highlightParam}`;

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': url,
      'Accept': 'application/json, text/plain, */*'
    };

    // 댓글 배열이 들어있는 필드 이름(응답 형식에 따라 다를 수 있어 여러 후보를 확인)
    const COMMENT_ARRAY_KEYS = ['data', 'comment_list', 'list', 'result'];
    const findCommentArrayKey = (obj) => {
      if (!obj) return null;
      for (const key of COMMENT_ARRAY_KEYS) {
        if (Array.isArray(obj[key])) return key;
      }
      return null;
    };

    // 댓글 하나를 구분할 고유 ID를 뽑아내는 함수(필드명이 응답마다 다를 수 있어 여러 후보를 확인)
    const COMMENT_ID_KEYS = ['pCommentNo', 'commentNo', 'cCommentNo', 'comment_no', 'commentNo1', 'id', 'no'];
    const getCommentId = (comment) => {
      if (!comment) return undefined;
      for (const key of COMMENT_ID_KEYS) {
        if (comment[key] !== undefined && comment[key] !== null) return `${key}:${comment[key]}`;
      }
      return undefined; // ID를 못 찾으면 중복 체크에서 제외(그냥 추가)
    };

    // 4. SOOP 서버에서 첫 페이지를 먼저 가져옵니다.
    const firstResponse = await fetch(buildApiUrl(1), { method: 'GET', headers: fetchHeaders });
    if (!firstResponse.ok) {
      throw new Error(`API 요청 실패: ${firstResponse.status}`);
    }
    const aggregated = await firstResponse.json();

    const arrayKey = findCommentArrayKey(aggregated);

    // 댓글 배열을 찾은 경우에만 2페이지 이후를 순차적으로 이어서 가져옵니다.
    if (arrayKey && aggregated[arrayKey].length > 0) {
      // 이미 확보한 댓글들의 ID를 기록해둡니다.
      // (pHighlightNo를 넘기면 하이라이트된 댓글이 실제 페이지와 무관하게 1페이지 응답에
      //  추가로 끼워들어오기 때문에, "페이지 크기가 줄어들면 마지막 페이지"라는 방식으로는
      //  1페이지에서 바로 멈춰버리는 문제가 있었습니다. 대신 "새로 받아온 페이지에 못 보던
      //  댓글이 하나도 없으면 그때 멈춘다"는 방식으로 판별합니다.)
      const seenIds = new Set();
      aggregated[arrayKey].forEach((c) => {
        const id = getCommentId(c);
        if (id !== undefined) seenIds.add(id);
      });

      const MAX_PAGES = 200; // 무한 루프/과도한 요청 방지용 안전장치
      let page = 2;

      while (page <= MAX_PAGES) {
        const pageResponse = await fetch(buildApiUrl(page), { method: 'GET', headers: fetchHeaders });
        if (!pageResponse.ok) break; // 실패하면 지금까지 모은 데이터로 응답

        const pageData = await pageResponse.json();
        const pageComments = Array.isArray(pageData[arrayKey]) ? pageData[arrayKey] : [];

        if (pageComments.length === 0) break; // 더 이상 댓글이 없으면 종료

        // 이미 본 댓글(하이라이트 댓글이 매 페이지에 끼어드는 경우 등)은 제외하고 새 댓글만 추가
        const newComments = pageComments.filter((c) => {
          const id = getCommentId(c);
          if (id === undefined) return true; // ID를 모르면 일단 포함
          return !seenIds.has(id);
        });

        if (newComments.length === 0) break; // 새 댓글이 하나도 없으면(=같은 페이지를 반복 응답) 종료

        newComments.forEach((c) => {
          const id = getCommentId(c);
          if (id !== undefined) seenIds.add(id);
        });
        aggregated[arrayKey] = aggregated[arrayKey].concat(newComments);

        page++;
        // SOOP 서버에 너무 빠르게 연속 요청하지 않도록 약간의 텀을 둡니다.
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    // 5. 프론트엔드로 데이터 전달 및 캐싱 설정 (5초 단위 갱신으로 IP 차단 방지)
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
    res.status(200).json(aggregated);

  } catch (error) {
    console.error("크롤링 에러:", error);
    res.status(500).json({ error: "서버에서 데이터를 가져오는 중 문제가 발생했습니다." });
  }
}
