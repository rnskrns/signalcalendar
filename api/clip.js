import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { streamer, page } = req.query;

  if (!streamer) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const originalBjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  // 프론트가 한글 별명 대신 영문 SOOP 아이디를 보낼 수도 있으므로 역방향 매핑도 함께 둔다.
  const bjIdToNameMap = Object.fromEntries(
    Object.entries(originalBjIdMap).map(([name, id]) => [id, name])
  );
  const streamerName = originalBjIdMap[streamer] ? streamer : (bjIdToNameMap[streamer] || streamer);
  const originalBjId = originalBjIdMap[streamerName];

  // /api/vods는 originalBjId/excludeOriginal을 지원하지 않아 400을 반환하지만,
  // 실제 검색 페이지(vod.soopup.live/?q=...)는 서버에서 완성된 HTML로 같은 필터를 지원한다.
  // 문서화된 JSON API가 없으므로 이 페이지 HTML을 직접 파싱한다.
  const pageParams = new URLSearchParams({ q: streamerName });
  if (originalBjId) {
    pageParams.set('originalBjId', originalBjId);
    pageParams.set('excludeOriginal', 'true');
  }
  // 이 페이지는 커서/페이지 기반 API를 노출하지 않고 "더 보기" 버튼으로 클라이언트 측에서
  // 추가 로드하는 방식으로 보인다. 서버 사이드에서는 1페이지(최초 24개)만 안정적으로 가져올 수 있다.
  const pageUrl = `https://vod.soopup.live/?${pageParams.toString()}`;

  try {
    const response = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    const html = await response.text();

    if (!response.ok) {
      console.error('VOD Finder 페이지 오류:', pageUrl, response.status, html.slice(0, 500));
      return res.status(response.status).json({
        error: 'VOD 검색 페이지를 불러오지 못했습니다.',
        detail: `HTTP ${response.status}`,
        pageUrl
      });
    }

    const $ = cheerio.load(html);

    // 각 결과 카드는 https://vod.sooplive.com/player/{번호} 링크를 갖고 있다.
    // 이 링크를 기준점으로 삼아, 가장 가까운 카드 컨테이너(li/article/div)를 찾아 그 안에서
    // 제목/썸네일/방송사/조회수 등을 뽑아낸다. 정확한 클래스명에 의존하지 않기 위한 방식이다.
    const playerLinkSelector = 'a[href*="vod.sooplive.com/player/"]';
    const seenTitleNo = new Set();
    const clips = [];

    $(playerLinkSelector).each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href') || '';
      const titleNoMatch = href.match(/\/player\/(\d+)/);
      if (!titleNoMatch) return;
      const titleNo = titleNoMatch[1];
      if (seenTitleNo.has(titleNo)) return; // 같은 카드 안에 링크가 여러 개 있을 수 있어 중복 제거

      // 카드 컨테이너 후보: li -> article -> 상위 3단계 이내의 div 중 가장 먼저 나오는 블록 요소
      let $card = $link.closest('li, article');
      if ($card.length === 0) {
        $card = $link.parent().parent().parent();
      }
      if ($card.length === 0) $card = $link.parent();

      const cardText = $card.text().replace(/\s+/g, ' ').trim();

      // 썸네일: Next.js 이미지 최적화 URL(_next/image?url=...) 안의 원본 이미지 주소를 디코딩
      let thumb = '';
      const imgSrc = $card.find('img').first().attr('src') || '';
      const urlParamMatch = imgSrc.match(/[?&]url=([^&]+)/);
      if (urlParamMatch) {
        try { thumb = decodeURIComponent(urlParamMatch[1]); } catch (_) { thumb = imgSrc; }
      } else if (imgSrc) {
        thumb = imgSrc.startsWith('http') ? imgSrc : `https://vod.soopup.live${imgSrc}`;
      }

      // 제목: h3/h2 태그 우선, 없으면 링크의 title 속성이나 카드 텍스트에서 유추
      let title = $card.find('h3, h2').first().text().trim();
      if (!title) title = $link.attr('title') || '';
      if (!title) title = cardText.slice(0, 80);

      // 유형(클립/캐치/다시보기) — 프론트(script.js)가 기대하는 영문 코드로 변환한다.
      const typeMatch = cardText.match(/(클립|캐치|다시보기)/);
      const typeLabelToCode = { '클립': 'CLIP', '캐치': 'CATCH', '다시보기': 'VOD' };
      const type = typeMatch ? (typeLabelToCode[typeMatch[1]] || 'VOD') : 'VOD';

      // 길이(0:00 또는 0:00:00 형식) — 프론트가 초 단위 숫자를 기대하므로 변환한다.
      const durationMatch = cardText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
      let durationSeconds;
      if (durationMatch) {
        const parts = durationMatch[1].split(':').map(Number);
        durationSeconds = parts.length === 3
          ? parts[0] * 3600 + parts[1] * 60 + parts[2]
          : parts[0] * 60 + parts[1];
      }

      // 방송사(원본 스트리머) 닉네임: /stations/{id} 링크의 텍스트에서 "방송국 VOD 보기" 접미사를 제거
      let stationNick = '';
      const $stationLink = $card.find('a[href*="/stations/"]').first();
      if ($stationLink.length) {
        stationNick = $stationLink.text().replace(/방송국\s*VOD\s*보기/g, '').trim();
      }

      // 조회수 + 상대적 시간(예: "9", "오늘" / "22", "1일 전")은 마크업에서 공백 없이 붙어 나올 수 있어
      // 완벽히 분리하기 어렵다. 조회수만 숫자로 최대한 추출하고, 날짜는 원문 그대로 relativeTime에 담는다.
      const viewMatch = cardText.match(/([\d,]+)\s*(오늘|\d+일\s*전)/);
      const viewCount = viewMatch ? Number(viewMatch[1].replace(/,/g, '')) : undefined;
      // script.js는 clip.regDate를 substring(0,10)+dash치환만 하고 그대로 표시하므로,
      // "오늘"/"3일 전" 같은 상대 시간 문자열을 그대로 넣어도 그대로 잘 표시된다.
      const regDate = viewMatch ? viewMatch[2] : '';

      seenTitleNo.add(titleNo);
      clips.push({
        titleNo,
        url: `https://vod.sooplive.com/player/${titleNo}`,
        title,
        thumbnailUrl: thumb,
        type,
        duration: durationSeconds,
        stationNick,
        viewCount,
        regDate
      });
    });

    if (clips.length === 0) {
      // 셀렉터가 실제 마크업과 안 맞을 때, 원인을 바로 알 수 있도록 일부 HTML을 함께 내려준다.
      console.error('클립 파싱 결과 0건:', pageUrl, html.slice(0, 1000));
      return res.status(200).json({
        items: [],
        debug: {
          message: '카드를 찾지 못했습니다. 페이지 구조가 바뀌었을 수 있습니다.',
          pageUrl,
          htmlSnippet: html.slice(0, 1000)
        }
      });
    }

    return res.status(200).json({ items: clips, page: Number(page) || 1, hasMore: false });
  } catch (error) {
    console.error('VOD Finder 페이지 파싱 실패:', pageUrl, error.message);
    return res.status(502).json({ error: 'VOD 검색 결과를 가져오지 못했습니다.', detail: error.message });
  }
}
