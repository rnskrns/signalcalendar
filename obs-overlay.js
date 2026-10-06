(() => {
  'use strict';

  const TARGET_URL = 'https://www.sooplive.com/station/gosegu2/post/208975797#comment_noti122706801';
  const STATION_ID = 'gosegu2';
  const POST_ID = '208975797';
  const COMMENT_NO = '122706801';
  const params = new URLSearchParams(location.search);
  const refreshSeconds = Math.max(20, Number(params.get('refresh')) || 60);
  const apiBase = (params.get('api') || '').replace(/\/$/, '');

  const el = {
    card: document.getElementById('rankCard'),
    rank: document.getElementById('rankValue'),
    nick: document.getElementById('userNick'),
    userId: document.getElementById('userId'),
    profile: document.getElementById('profileImage'),
    likes: document.getElementById('likeCount'),
    link: document.getElementById('postLink'),
    qr: document.getElementById('qrImage')
  };

  el.link.href = TARGET_URL;
  el.qr.src = `https://quickchart.io/qr?size=360&margin=1&ecLevel=M&text=${encodeURIComponent(TARGET_URL)}`;

  function endpoint(page) {
    const postUrl = `https://www.sooplive.com/station/${STATION_ID}/post/${POST_ID}`;
    return `${apiBase}/api/comment?url=${encodeURIComponent(postUrl)}&page=${page}&_=${Date.now()}`;
  }

  async function fetchPage(page) {
    const response = await fetch(endpoint(page), { cache: 'no-store' });
    if (!response.ok) throw new Error(`댓글 API 오류 (${response.status})`);
    const json = await response.json();
    if (json && json.error) throw new Error(json.error);
    return json;
  }

  async function fetchAllComments() {
    const first = await fetchPage(1);
    const comments = Array.isArray(first.data) ? first.data.slice() : [];
    const lastPage = Math.max(1, Number(first.meta && first.meta.lastPage) || 1);
    if (lastPage > 1) {
      const rest = await Promise.all(Array.from({ length: lastPage - 1 }, (_, i) => fetchPage(i + 2)));
      rest.forEach(page => {
        if (Array.isArray(page.data)) comments.push(...page.data);
      });
    }
    return comments;
  }

  function showComment(comments) {
    const sorted = comments.slice().sort((a, b) => Number(b.likeCnt || 0) - Number(a.likeCnt || 0));
    const index = sorted.findIndex(comment => String(comment.pCommentNo) === COMMENT_NO);
    if (index < 0) throw new Error('지정 댓글을 찾지 못했습니다.');

    const comment = sorted[index];
    el.rank.textContent = (index + 1).toLocaleString('ko-KR');
    el.nick.textContent = comment.userNick || '닉네임 없음';
    el.userId.textContent = comment.userId ? `@${comment.userId}` : '';
    el.likes.textContent = Number(comment.likeCnt || 0).toLocaleString('ko-KR');
    if (comment.profileImage) {
      el.profile.src = comment.profileImage;
      el.profile.hidden = false;
    } else {
      el.profile.hidden = true;
    }
    el.card.classList.remove('updated');
    requestAnimationFrame(() => el.card.classList.add('updated'));
  }

  async function refresh() {
    try {
      showComment(await fetchAllComments());
    } catch (error) {
      console.error(error);
      el.rank.textContent = '!';
    }
  }

  refresh();
  setInterval(refresh, refreshSeconds * 1000);
})();
