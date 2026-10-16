function parseCafeBoardUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!/(^|\.)cafe\.naver\.com$/i.test(url.hostname)) return null;
    const pathMatch = url.pathname.match(/\/cafes\/(\d+)\/menus\/(\d+)/i);
    const legacyMatch = url.pathname.match(/\/ArticleList\.nhn/i);
    const clubId = pathMatch?.[1] || url.searchParams.get('clubid') || url.searchParams.get('clubId');
    const menuId = pathMatch?.[2] || url.searchParams.get('menuid') || url.searchParams.get('menuId');
    if (!/^\d+$/.test(clubId || '') || !/^\d+$/.test(menuId || '')) return null;
    return { clubId, menuId, legacy: Boolean(legacyMatch) };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: '허용되지 않은 요청입니다.' });
  const board = parseCafeBoardUrl(String(req.query.url || ''));
  if (!board) return res.status(400).json({ error: '올바른 네이버 카페 게시판 주소가 필요합니다.' });

  const params = new URLSearchParams({
    'search.clubid': board.clubId,
    'search.menuid': board.menuId,
    'search.queryType': 'lastArticle',
    'search.page': '1',
    'search.perPage': '8'
  });

  try {
    const response = await fetch(`https://apis.naver.com/cafe-web/cafe2/ArticleListV2.json?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SIGNAL-Schedule/1.0)',
        Referer: 'https://cafe.naver.com/'
      }
    });
    if (!response.ok) return res.status(response.status).json({ error: '카페 글을 불러오지 못했습니다.' });
    const data = await response.json();
    const result = data?.message?.result || data?.result || {};
    const items = [result.articleList, result.articles, data?.articleList].find(Array.isArray) || [];
    const posts = items
      .filter(item => item && (item.articleId || item.articleid) && (item.subject || item.title) && !item.blindArticle)
      .slice(0, 8)
      .map(item => {
        const articleId = String(item.articleId || item.articleid);
        return {
          id: articleId,
          title: String(item.subject || item.title).replace(/<[^>]*>/g, '').trim(),
          url: `https://cafe.naver.com/ca-fe/cafes/${board.clubId}/articles/${articleId}`
        };
      });

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ posts });
  } catch (error) {
    console.error('Naver cafe fetch error:', error);
    return res.status(502).json({ error: '카페 서버와 통신하지 못했습니다.' });
  }
}
