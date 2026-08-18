// api/clip.js 파일
export default async function handler(req, res) {
  const { streamer, page } = req.query;

  if (!streamer) {
    return res.status(400).json({ error: '스트리머 이름이 필요합니다.' });
  }

  const pageNo = page || 1;

  // streamer(닉네임) -> 실제 bjid로 매핑
  // (검색 결과에서 "본인이 올린 정식 VOD"와 "남이 올린 관련 클립"을 구분할 때 프론트에서 사용)
  const bjIdMap = {
    '달타': 'dalta20',
    '다룽': 'daarung22',
    '최또': 'choiagain',
    '카나시': 'kjhh0029'
  };
  const bjId = bjIdMap[streamer] || streamer;

  // 🚨 bjapi.afreecatv.com(구) → chapi.sooplive.com(신) 으로 bjid별 VOD 목록 API가 바뀐 것과 별개로,
  // "특정 bjid의 VOD 목록"이 아니라 SOOP 통합검색(www.sooplive.com/search)에서
  // 닉네임을 키워드로 검색했을 때 나오는 전체 결과(다른 유저가 올린 관련 영상 포함)를 가져오도록 변경.
  //
  // ⚠️ 참고: 이 검색 API는 SOOP(舊 아프리카TV) 쪽에 공식 문서가 없는 비공개 엔드포인트입니다.
  // 아래 구조는 리브랜딩 이전 sch.afreecatv.com/api.php?szType=vodSearch... 방식을
  // 신규 도메인 규칙에 맞춰 옮긴 "최선의 추정치"이며, 실제 응답 스키마가 다를 수 있습니다.
  // 만약 빈 값/에러가 계속되면 브라우저에서 https://www.sooplive.com/search?szKeyword=최또 접속 후
  // 개발자도구(F12) > Network 탭에서 실제 호출되는 검색 API 주소/파라미터를 확인해 이 값을 맞춰주세요.
  const hosts = ['https://sch.sooplive.com', 'https://sch.sooplive.co.kr'];

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': `https://www.sooplive.com/search?szKeyword=${encodeURIComponent(streamer)}`,
    'Origin': 'https://www.sooplive.com'
  };

  const searchParams = new URLSearchParams({
    szType: 'vodSearch',      // 통합검색 중 VOD 검색
    szKeyword: streamer,      // 검색어 (예: '최또')
    szTabType: 'VOD',
    szOrder: 'reg_date',      // 최신순
    nPageNo: String(pageNo),
    nListCnt: '20'
  });

  let lastError = null;

  for (const host of hosts) {
    const targetUrl = `${host}/api.php?${searchParams.toString()}`;
    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: commonHeaders
      });

      if (!response.ok) {
        throw new Error(`SOOP 검색 API 오류: ${response.status}`);
      }

      const data = await response.json();
      // bjId 정보를 함께 내려줘서, 필요하면 프론트에서 "본인 공식 VOD 제외" 필터링에 활용 가능
      return res.status(200).json({ ...data, __bjId: bjId });

    } catch (error) {
      console.error(`검색 API 호출 실패 (${host}):`, error.message);
      lastError = error;
      // 다음 호스트로 재시도
    }
  }

  res.status(500).json({ error: '검색 결과를 가져오는데 실패했습니다.', detail: lastError?.message });
}
