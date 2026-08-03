export default async function handler(req, res) {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: '검색어를 입력해주세요.' });

    try {
        // 1. 스팀 웹사이트의 실제 검색창(자동완성) 엔진을 직접 호출합니다. (한국어 검색 100% 동일 적용)
        const suggestUrl = `https://store.steampowered.com/search/suggest?term=${encodeURIComponent(query)}&f=games&cc=KR&l=korean`;
        const suggestRes = await fetch(suggestUrl);
        const htmlText = await suggestRes.text();

        // 2. HTML 텍스트 데이터에서 게임의 고유 번호(AppID)만 정규식으로 뽑아냅니다.
        const appIds = [];
        const regex = /data-ds-appid="(\d+)"/g;
        let match;
        while ((match = regex.exec(htmlText)) !== null) {
            if (!appIds.includes(match[1])) {
                appIds.push(match[1]);
            }
        }

        // 검색 결과가 없으면 빈 배열 반환
        if (appIds.length === 0) {
            return res.status(200).json({ items: [] });
        }

        // 3. 상위 5개 결과 추출 및 상세 정보 병렬 조회
        const topAppIds = appIds.slice(0, 5);
        const detailedItems = await Promise.all(topAppIds.map(async (appId) => {
            let genres = '';
            let reviews = '';
            let gameName = ''; 
            let gameImage = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`; 
            
            try {
                // 뽑아낸 AppID를 통해 스팀 공식 DB에서 한국어 이름, 장르, 고화질 이미지를 가져옵니다.
                const detailRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=korean`);
                const detailData = await detailRes.json();
                
                if (detailData[appId]?.success) {
                    const d = detailData[appId].data;
                    if (d.name) gameName = d.name; 
                    if (d.genres) genres = d.genres.map(g => g.description).join(', ');
                    if (d.header_image) gameImage = d.header_image; 
                }

                // 스팀 유저 평가(리뷰) 가져오기
                const reviewRes = await fetch(`https://store.steampowered.com/appreviews/${appId}?json=1&language=all`);
                const reviewData = await reviewRes.json();
                reviews = reviewData.query_summary?.review_score_desc || '';
            } catch (e) {
                console.error(`상세 정보 조회 실패 (AppID: ${appId}):`, e);
            }

            // 이름이 없는 예외 상황 방지
            if (!gameName) gameName = `App ${appId}`;

            return {
                appid: appId,
                name: gameName, 
                image: gameImage, 
                genres: genres,
                reviews: reviews
            };
        }));

        res.status(200).json({ items: detailedItems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '스팀 데이터 조회에 실패했습니다.' });
    }
}