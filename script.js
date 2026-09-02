import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc, increment, orderBy, limit, startAfter } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// =========================================================================
// SOOP 확장프로그램 로그인 연동
// =========================================================================
// ⭐ 신규: 전역 함수 바인딩 영역에 추가
window.loginWithSoopExtension = loginWithSoopExtension;
window.closeSoopExtInstallModal = closeSoopExtInstallModal;
window.goToSoopExtDownload = goToSoopExtDownload;

// ⭐ 신규: 구글 로그인(모바일 등 확장프로그램 없이 로그인) / SOOP 계정에 구글 계정 연동
window.loginWithGoogle = loginWithGoogle;
window.linkGoogleAccount = linkGoogleAccount;
window.openGoogleLinkModal = openGoogleLinkModal;
window.closeGoogleLinkModal = closeGoogleLinkModal;

// 연동 진행 중에는 onAuthStateChanged의 일반 처리 로직을 건너뛰기 위한 플래그
let isLinkingGoogleAccount = false;

// 모바일 등 확장프로그램을 쓸 수 없는 환경에서 구글 계정으로 바로 로그인
function loginWithGoogle() {
    signInWithPopup(auth, new GoogleAuthProvider()).catch((e) => {
        if (e.code !== 'auth/popup-closed-by-user') {
            console.error('구글 로그인 실패:', e);
            alert('구글 로그인에 실패했습니다. 다시 시도해주세요.');
        }
    });
}

// ⭐ 신규: "구글 계정 연동" 모달 열기/닫기 + 현재 연동 상태 표시
async function openGoogleLinkModal() {
    if (!isSoopSession || !currentUser || !currentUser.uid) {
        alert('SOOP 계정으로 로그인한 상태에서만 구글 계정을 연동할 수 있습니다.');
        return;
    }
    const modal = document.getElementById('googleLinkModal');
    if (modal) modal.classList.replace('hidden', 'flex');
    await refreshGoogleLinkModalStatus();
}

function closeGoogleLinkModal() {
    const modal = document.getElementById('googleLinkModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

// 현재 로그인된 SOOP 계정에 연동된 구글 이메일이 있는지 조회해서 모달에 표시
async function refreshGoogleLinkModalStatus() {
    const statusEl = document.getElementById('googleLinkStatus');
    const btnEl = document.getElementById('googleLinkActionBtn');
    if (!statusEl || !btnEl || !currentUser) return;

    // 구글 계정으로 로그인했는데 그 구글 계정이 이미 SOOP 계정에 연동되어 있어서
    // 자동으로 그 SOOP 계정 정보로 로그인된 경우: 연동 대상 SOOP 계정 정보를 그대로 보여준다.
    if (soopSessionViaGoogleLink) {
        statusEl.innerHTML = `soop <b class="text-[#5D4037]">${escapeHtml(currentUser.displayName || '')}</b>,<b class="text-[#5D4037]">${escapeHtml(currentUser.uid || '')}</b>랑 연동 중`;
        btnEl.classList.add('hidden');
        return;
    }
    btnEl.classList.remove('hidden');

    statusEl.textContent = '연동 상태를 확인하는 중...';
    btnEl.textContent = '확인 중...';
    btnEl.disabled = true;
    try {
        const soopSnap = await getDoc(doc(db, "soopUsers", currentUser.uid));
        const data = soopSnap.exists() ? soopSnap.data() : {};
        if (data.linkedGoogleEmail) {
            statusEl.innerHTML = `현재 <b class="text-[#5D4037]">${data.linkedGoogleEmail}</b> 계정과 연동되어 있어요.<br>다음부터 이 구글 계정으로 로그인하면 같은 정보로 접속됩니다.`;
            btnEl.textContent = '연동된 계정 변경';
        } else {
            statusEl.textContent = '아직 연동된 구글 계정이 없어요. 연동하면 확장프로그램 없이도 이 계정으로 로그인할 수 있어요.';
            btnEl.textContent = '구글 계정 연동하기';
        }
    } catch (e) {
        console.error('연동 상태 조회 실패:', e);
        statusEl.textContent = '연동 상태를 불러오지 못했습니다.';
        btnEl.textContent = '구글 계정 연동하기';
    } finally {
        btnEl.disabled = false;
    }
}

// SOOP 계정으로 로그인한 상태에서 구글 계정을 프로필에 연동합니다.
// 연동 이후에는 구글 로그인만 해도 이 SOOP 계정과 동일한 데이터(닉네임/프사/좋아요/롤링페이퍼 등)를 사용하게 됩니다.
// 이미 연동된 계정이 있는 상태에서 다시 실행하면, 새로 로그인한 구글 계정으로 연동을 교체합니다.
async function linkGoogleAccount() {
    if (!isSoopSession || !currentUser || !currentUser.uid) {
        alert('SOOP 계정으로 로그인한 상태에서만 구글 계정을 연동할 수 있습니다.');
        return;
    }
    const soopId = currentUser.uid;
    const statusEl = document.getElementById('googleLinkStatus');
    const btnEl = document.getElementById('googleLinkActionBtn');
    isLinkingGoogleAccount = true;
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '연동 진행 중...'; }
    if (statusEl) statusEl.textContent = '구글 로그인 창을 확인해주세요...';

    try {
        const soopSnapBefore = await getDoc(doc(db, "soopUsers", soopId));
        const prevGoogleUid = soopSnapBefore.exists() ? (soopSnapBefore.data().linkedGoogleUid || null) : null;

        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const googleUser = result.user;

        // 기존과 같은 구글 계정을 다시 선택한 경우
        if (prevGoogleUid === googleUser.uid) {
            if (statusEl) statusEl.innerHTML = `이미 <b class="text-[#5D4037]">${googleUser.email}</b> 계정과 연동되어 있어요.`;
            if (btnEl) { btnEl.textContent = '연동된 계정 변경'; btnEl.disabled = false; }
            return;
        }

        // 이미 다른 SOOP 계정에 연동되어 있는 구글 계정이면 막습니다.
        const linkRef = doc(db, "accountLinks", googleUser.uid);
        const linkSnap = await getDoc(linkRef);
        if (linkSnap.exists() && linkSnap.data().soopId && linkSnap.data().soopId !== soopId) {
            alert('이미 다른 계정에 연동되어 있는 구글 계정입니다. 다른 계정으로 다시 시도해주세요.');
            await signOut(auth);
            await refreshGoogleLinkModalStatus();
            return;
        }

        // 연동 계정을 바꾸는 경우, 예전 연동 정보는 지워서 예전 구글 계정으로는 더 이상 접속되지 않게 합니다.
        if (prevGoogleUid && prevGoogleUid !== googleUser.uid) {
            try { await deleteDoc(doc(db, "accountLinks", prevGoogleUid)); } catch (e) { console.error('이전 연동 정보 삭제 실패:', e); }
        }

        await setDoc(linkRef, { soopId }, { merge: true });
        await setDoc(doc(db, "soopUsers", soopId), {
            linkedGoogleUid: googleUser.uid,
            linkedGoogleEmail: googleUser.email || null
        }, { merge: true });

        if (statusEl) statusEl.innerHTML = `<b class="text-[#5D4037]">${googleUser.email}</b> 계정과 연동 완료됐어요!<br>다음부터 이 구글 계정으로 로그인하면 같은 정보로 접속됩니다.`;
        if (btnEl) { btnEl.textContent = '연동된 계정 변경'; btnEl.disabled = false; }
    } catch (e) {
        if (e.code !== 'auth/popup-closed-by-user') {
            console.error('구글 계정 연동 실패:', e);
            alert('구글 계정 연동에 실패했습니다. 다시 시도해주세요.');
        }
        await refreshGoogleLinkModalStatus();
    } finally {
        isLinkingGoogleAccount = false;
    }
}


// ⭐ 신규: SOOP 확장프로그램 다운로드 링크
const SOOP_EXT_DOWNLOAD_URL = 'https://chromewebstore.google.com/detail/signal/dblpllkikodcdlmfohdnljegobdbhinl?hl=ko&utm_source=ext_sidebar';

// ⭐ 신규: 확장프로그램 미설치 안내 모달 열기/닫기
function openSoopExtInstallModal() {
    const modal = document.getElementById('soopExtInstallModal');
    if (modal) modal.classList.replace('hidden', 'flex');
}

function closeSoopExtInstallModal() {
    const modal = document.getElementById('soopExtInstallModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

// ⭐ 신규: 안내 모달의 다운로드 버튼 클릭 시 새 탭으로 크롬 웹스토어 열기
function goToSoopExtDownload() {
    window.open(SOOP_EXT_DOWNLOAD_URL, '_blank');
}

// ⭐ 신규: SOOP 확장프로그램 로그인 요청 함수
let soopLoginResponded = false;
let soopLoginTimeoutId = null;

// ⭐ 신규: SOOP 로그인 새로고침 유지(세션 저장/복원)
const SOOP_SESSION_KEY = 'soopUserSession';
let isSoopSession = false; // 현재 currentUser가 SOOP 로그인으로 채워진 상태인지 여부
// 현재 SOOP 세션이 "구글 계정으로 로그인했는데 그 구글 계정이 SOOP 계정에 연동되어 있어서"
// 자동으로 채워진 것인지 여부. true면 "구글 계정 연동" 메뉴에서 연동 대상 SOOP 계정 정보를 보여준다.
let soopSessionViaGoogleLink = false;

function saveSoopSession(user, viaGoogleLink = false) {
    try {
        localStorage.setItem(SOOP_SESSION_KEY, JSON.stringify({ user, viaGoogleLink }));
    } catch (e) { console.error('SOOP 세션 저장 실패:', e); }
}

function clearSoopSession() {
    isSoopSession = false;
    soopSessionViaGoogleLink = false;
    try { localStorage.removeItem(SOOP_SESSION_KEY); } catch (e) { /* 무시 */ }
}

// 새로고침 시 저장해둔 SOOP 로그인 정보를 불러와 즉시 로그인 상태로 복원합니다.
function restoreSoopSession() {
    try {
        const saved = localStorage.getItem(SOOP_SESSION_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        // 이전 버전(사용자 객체를 그대로 저장)과의 호환도 함께 처리
        const user = parsed && parsed.user ? parsed.user : parsed;
        const viaGoogleLink = !!(parsed && parsed.viaGoogleLink);
        if (!user || !user.uid) return;

        currentUser = user;
        isSoopSession = true;
        soopSessionViaGoogleLink = viaGoogleLink;
        refreshAuthUI();
        loadAndMergeSoopLikes(user.uid); // 노래책 좋아요 계정 데이터 비동기 로드
        flushPendingLoginNotifications(); // 로그인 전 대기열에 쌓여있던 알림을 알림벨에 반영
    } catch (e) {
        console.error('SOOP 세션 복원 실패:', e);
        clearSoopSession();
    }
}

// SOOP 계정(soopUsers 컬렉션)에 저장된 좋아요 목록을 불러오고, 로그인 전 이 브라우저에서
// 눌러뒀던 좋아요(게스트 상태 localStorage)를 함께 병합해줍니다.
async function loadAndMergeSoopLikes(uid) {
    try {
        const soopUserRef = doc(db, "soopUsers", uid);
        const soopUserSnap = await getDoc(soopUserRef);
        const existingLiked = soopUserSnap.exists() ? (soopUserSnap.data().likedSongs || {}) : {};
        userLikedSongsCache = await mergeLocalLikesIntoAccount(uid, existingLiked, 'soopUsers');
    } catch (e) {
        console.error('SOOP 유저 좋아요 로드 실패:', e);
        userLikedSongsCache = userLikedSongsCache || {};
    }
    if (typeof renderSongList === 'function' && document.getElementById('songListContainer')) {
        try { renderSongList(); } catch (e) { /* 아직 렌더 준비 전이면 무시 */ }
    }
}

function loginWithSoopExtension() {
    soopLoginResponded = false;

    // 확장프로그램에 정보 요청
    window.postMessage({ type: 'REQUEST_SOOP_LOGIN' }, '*');

    // 일정 시간 내에 확장프로그램의 응답이 없으면 미설치로 간주
    if (soopLoginTimeoutId) clearTimeout(soopLoginTimeoutId);
    soopLoginTimeoutId = setTimeout(() => {
        if (!soopLoginResponded) {
            openSoopExtInstallModal();
        }
    }, 1500);
}

// ⭐ 신규: 확장프로그램 응답 수신 리스너
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'SOOP_LOGIN_SUCCESS') {
        soopLoginResponded = true;
        if (soopLoginTimeoutId) clearTimeout(soopLoginTimeoutId);
        const user = event.data.user;

        // 기존 시스템(Firebase Auth 등)이 인식하는 currentUser 형식에 맞춰 가짜 유저 객체 생성
        currentUser = {
            uid: user.uid,               // SOOP 아이디
            displayName: user.nick,      // SOOP 닉네임
            photoURL: user.imgUrl        // SOOP 프로필 이미지
        };

        // ⭐ 신규: 새로고침해도 로그인이 풀리지 않도록 세션 저장
        isSoopSession = true;
        soopSessionViaGoogleLink = false;
        saveSoopSession(currentUser, false);

        // UI 즉시 업데이트 (프사, 닉네임 적용됨)
        refreshAuthUI();
        alert(`${user.nick}님 환영합니다!`);

        // ⭐ 신규: 노래책 좋아요 목록을 계정 기준으로 불러와 기억되게 함
        loadAndMergeSoopLikes(user.uid);
        flushPendingLoginNotifications(); // 로그인 전 대기열에 쌓여있던 알림을 알림벨에 반영

        // ⭐ 신규: SOOP 닉네임/프사를 soopUsers 문서에 저장해둠 → 이후 구글 로그인(연동)으로 접속해도 이 정보를 그대로 사용
        setDoc(doc(db, "soopUsers", user.uid), { nick: user.nick || null, imgUrl: user.imgUrl || null }, { merge: true })
            .catch((e) => console.error('SOOP 프로필 저장 실패:', e));

    } else if (event.data.type === 'SOOP_LOGIN_FAIL') {
        soopLoginResponded = true;
        if (soopLoginTimeoutId) clearTimeout(soopLoginTimeoutId);
        alert("SOOP 로그인이 되어있지 않거나 확장프로그램 통신에 실패했습니다.");
    } else if (event.data.type === 'SIGNAL_EXT_NOTIFICATION') {
        // ⭐ 신규: 확장프로그램이 전달한 방송/카페 알림을 알림벨에 쌓음
        // 사이트에 로그인이 안 되어 있으면 바로 쌓지 않고 대기열에 저장해뒀다가, 로그인하면 한꺼번에 반영합니다.
        if (!currentUser) {
            queuePendingLoginNotification(event.data.payload);
        } else {
            addExtNotification(event.data.payload);
        }
    }
});

// =========================================================================
// ⭐ 신규: 확장프로그램 알림(방송 시작 / 카페 새글) → 알림벨 패널
// =========================================================================
const EXT_NOTIF_STORAGE_KEY = 'extNotifications';
const EXT_NOTIF_MAX_COUNT = 50;
const EXT_NOTIF_SCHEMA_VERSION = 2; // 알림 표시 형식이 바뀔 때마다 올려서, 예전 형식으로 저장된 알림을 정리함
let extNotifications = [];
let currentNotifTab = 'all';   // 'all' | 'live' | 'cafe'
let currentNotifSort = 'time'; // 'time' | 'unread'

// ⭐ 신규: 사이트에 로그인이 안 되어 있을 때 도착한 알림을 잠시 보관해두는 대기열
// (로그인 전에는 알림벨 패널에 바로 쌓지 않고, 로그인 완료 시점에 한꺼번에 반영)
const PENDING_LOGIN_NOTIF_KEY = 'pendingLoginNotifications';
const PENDING_LOGIN_NOTIF_MAX = 50;

function queuePendingLoginNotification(payload) {
    if (!payload) return;
    try {
        const queue = JSON.parse(localStorage.getItem(PENDING_LOGIN_NOTIF_KEY) || '[]');
        queue.push(payload);
        localStorage.setItem(PENDING_LOGIN_NOTIF_KEY, JSON.stringify(queue.slice(-PENDING_LOGIN_NOTIF_MAX)));
    } catch (e) { console.error('로그인 전 알림 대기열 저장 실패:', e); }
}

// 로그인이 완료된 시점에 호출: 대기열에 쌓여있던 알림을 오래된 순서대로 알림벨에 반영합니다.
function flushPendingLoginNotifications() {
    if (!currentUser) return; // 아직 로그인 안 된 상태면 아무 것도 하지 않음
    try {
        const queue = JSON.parse(localStorage.getItem(PENDING_LOGIN_NOTIF_KEY) || '[]');
        if (!queue.length) return;
        localStorage.removeItem(PENDING_LOGIN_NOTIF_KEY);
        // addExtNotification은 맨 앞에 추가(unshift)하므로, 오래된 것부터 순서대로 넣어야
        // 가장 최근 알림이 최종적으로 맨 위에 오게 됩니다.
        queue.forEach(payload => addExtNotification(payload));
    } catch (e) { console.error('로그인 전 알림 대기열 복원 실패:', e); }
}

function loadExtNotifications() {
    try {
        const savedVersion = Number(localStorage.getItem('extNotifSchemaVersion') || '0');
        if (savedVersion < EXT_NOTIF_SCHEMA_VERSION) {
            // ⭐ 신규: "[카페명] 새 글" 같은 예전 형식 알림을 정리하고 새 형식부터 다시 쌓음
            localStorage.removeItem(EXT_NOTIF_STORAGE_KEY);
            localStorage.setItem('extNotifSchemaVersion', String(EXT_NOTIF_SCHEMA_VERSION));
            extNotifications = [];
            return;
        }
        extNotifications = JSON.parse(localStorage.getItem(EXT_NOTIF_STORAGE_KEY) || '[]');
    } catch (e) {
        extNotifications = [];
    }
}

function saveExtNotifications() {
    try {
        localStorage.setItem(EXT_NOTIF_STORAGE_KEY, JSON.stringify(extNotifications.slice(0, EXT_NOTIF_MAX_COUNT)));
    } catch (e) { console.error('알림 저장 실패:', e); }
}

function updateNotifBadge() {
    const unread = extNotifications.filter(n => !n.read).length;
    const bellBtns = [document.getElementById('notifBellBtn'), document.getElementById('notifBellBtnMobile')];
    const badges = [document.getElementById('notifBellBadge'), document.getElementById('notifBellBadgeMobile')];

    badges.forEach(badge => {
        if (!badge) return;
        badge.classList.toggle('hidden', unread === 0);
    });
    bellBtns.forEach(btn => {
        if (!btn) return;
        btn.classList.toggle('has-new', unread > 0);
    });
}

// 확장프로그램에서 받은 알림 1건을 목록 맨 앞에 추가하고 저장/뱃지/패널을 갱신합니다.
function addExtNotification(payload) {
    if (!payload) return;
    // ⭐ 확장프로그램(background.js)은 윈도우 알림에 title(예: "[시그널|SIGNAL] OO님의 새 글")과
    // message(실제 게시글 제목 / 방송 제목)를 같이 보내는데, 사이트 알림벨에는 실제 제목인
    // message만 보여줍니다. (live 알림은 title/message가 같은 방송 제목이라 상관없음)
    const realTitle = payload.message || payload.title || '';
    const notif = {
        id: `${payload.kind || 'ext'}_${payload.time || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: payload.kind || 'ext',
        member: payload.member || '',
        title: realTitle,
        url: payload.url || '',
        // 확장 프로그램/외부 연동마다 필드 이름이 달라질 수 있어 프로필과 첨부
        // 이미지를 모두 보존한다. 기존 icon 기반 알림도 그대로 호환된다.
        icon: payload.icon || payload.avatar || payload.profileImage || payload.profile_image || payload.userThumb || payload.user_thumb || '',
        thumbnail: payload.thumbnail || payload.thumb || payload.image || payload.imageUrl || payload.image_url || '',
        time: payload.time || Date.now(),
        read: false
    };

    extNotifications.unshift(notif);
    extNotifications = extNotifications.slice(0, EXT_NOTIF_MAX_COUNT);
    saveExtNotifications();
    updateNotifBadge();

    const panel = document.getElementById('notifPanelOverlay');
    if (panel && !panel.classList.contains('hidden')) renderNotifPanelList();
}

// 알림의 작성자 이름을 멤버관리에서 등록한 사진과 연결한다. 확장프로그램이 사진 URL을
// 보내지 않아도, 예를 들어 "다룽" 알림은 멤버관리의 "다룽" 프로필을 우선 표시한다.
function getNotificationMemberProfile(memberName) {
    const normalizedName = String(memberName || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/님$/, '')
        .toLowerCase();
    if (!normalizedName) return '';

    const matchesName = (name) => String(name || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/님$/, '')
        .toLowerCase() === normalizedName;

    // 멤버관리에서 직접 등록/수정한 사진을 최우선으로 사용한다.
    const managedMember = customMembers.find(member => matchesName(member.nickname));
    if (managedMember && managedMember.imageUrl) return managedMember.imageUrl;

    // 로그인 프로필이 따로 설정된 경우에도 반영한다.
    const loginMemberName = Object.keys(memberLoginImgMap).find(matchesName);
    if (loginMemberName && memberLoginImgMap[loginMemberName]) return memberLoginImgMap[loginMemberName];

    // 기본 멤버의 사이트 프로필을 마지막 기본값으로 사용한다.
    const defaultMember = members.find(member => matchesName(member.name));
    return defaultMember ? defaultMember.img : '';
}

function renderNotifPanelList() {
    const list = document.getElementById('notifPanelList');
    if (!list) return;

    const filtered = getFilteredNotifications();

    if (filtered.length === 0) {
        const emptyLabel = currentNotifTab === 'live' ? 'SOOP 방송 알림이 없어요'
            : currentNotifTab === 'cafe' ? '카페 새 글 알림이 없어요'
            : '아직 도착한 알림이 없어요';
        list.innerHTML = `<div class="notif-empty"><i class="fi fi-rr-bell-slash" style="font-size:26px;display:block;margin-bottom:8px;"></i>${emptyLabel}</div>`;
        return;
    }

    list.innerHTML = filtered.map(n => {
        const timeLabel = formatRelativeTime(new Date(n.time));
        const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.member || 'S')}&background=random&color=fff&size=128&rounded=true&font-size=0.4`;
        const managedProfileSrc = getNotificationMemberProfile(n.member);
        const avatarSrc = managedProfileSrc || n.icon || n.avatar || n.profileImage || n.profile_image || fallbackAvatar;
        const thumbnailSrc = n.thumbnail || n.thumb || n.image || n.imageUrl || n.image_url || '';
        const title = String(n.title || '').replace(/"/g, '&quot;');
        const unreadDot = n.read ? '' : `<span class="notif-unread-dot" style="display:inline-block;width:6px;height:6px;border-radius:999px;background:#FF5252;flex-shrink:0;"></span>`;
        // 프사 오른쪽 아래에 라이브(SOOP)/카페 구분 뱃지를 붙임
        const kindBadge = n.kind === 'live'
            ? `<span class="notif-avatar-badge notif-avatar-badge-live" title="SOOP 방송"><i class="fi fi-rr-signal-stream"></i></span>`
            : n.kind === 'cafe'
                ? `<span class="notif-avatar-badge notif-avatar-badge-cafe" title="카페 새 글"><i class="fi fi-rr-comment-alt"></i></span>`
                : '';

        return `
            <div class="notif-row" onclick="openNotifItem('${n.id}')">
                <div class="notif-avatar-wrap">
                    <img src="${avatarSrc}" alt="${n.member || ''}" loading="lazy" decoding="async" class="notif-avatar" onerror="this.onerror=null;this.src='${fallbackAvatar}'">
                    ${kindBadge}
                </div>
                <div class="notif-col">
                    <div class="notif-title-row">
                        <span class="notif-title">${title}</span>
                        ${unreadDot}
                    </div>
                    ${timeLabel ? `<span class="notif-time">${timeLabel}</span>` : ''}
                </div>
                ${thumbnailSrc ? `<img src="${thumbnailSrc}" alt="" loading="lazy" decoding="async" class="notif-thumbnail" onerror="this.remove()">` : ''}
            </div>
        `;
    }).join('');
}

// 현재 선택된 탭(전체/SOOP/카페)과 정렬(시간순/읽지 않은순)을 적용한 알림 목록을 반환
function getFilteredNotifications() {
    let result = extNotifications;
    if (currentNotifTab === 'live') result = result.filter(n => n.kind === 'live');
    else if (currentNotifTab === 'cafe') result = result.filter(n => n.kind === 'cafe');

    if (currentNotifSort === 'unread') {
        // Array.prototype.sort는 안정 정렬이라, 같은 그룹(읽음/안읽음) 안에서는 기존 시간순이 그대로 유지됨
        result = [...result].sort((a, b) => (a.read === b.read) ? 0 : (a.read ? 1 : -1));
    }
    return result;
}

// ⭐ 신규: 전체 / SOOP / 카페 탭 전환
window.setNotifTab = function(tab) {
    currentNotifTab = tab;
    document.querySelectorAll('.notif-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.notifTab === tab);
    });
    renderNotifPanelList();
};

// ⭐ 신규: 시간순 / 읽지 않은순 정렬 드롭다운
window.toggleNotifSortMenu = function(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('notifSortMenu');
    if (menu) menu.classList.toggle('hidden');
};

window.setNotifSort = function(sort) {
    currentNotifSort = sort;
    const label = document.getElementById('notifSortLabel');
    if (label) label.textContent = sort === 'unread' ? '읽지 않은순' : '시간순';
    closeNotifDropdowns();
    renderNotifPanelList();
};

function closeNotifDropdowns() {
    const sortMenu = document.getElementById('notifSortMenu');
    if (sortMenu) sortMenu.classList.add('hidden');
}

// 알림 패널 내부 클릭은 오버레이(닫기)로 전파되지 않게 막고, 열려있는 드롭다운은 필요할 때 닫아줌
window.handleNotifPanelClick = function(event) {
    event.stopPropagation();
    const isDropdownRelated = event.target.closest('.notif-sort-btn, .notif-dropdown-menu');
    if (!isDropdownRelated) closeNotifDropdowns();
};

window.markAllNotifRead = function() {
    let changed = false;
    extNotifications.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
    if (changed) {
        saveExtNotifications();
        updateNotifBadge();
        renderNotifPanelList();
    }
    closeNotifDropdowns();
};

window.openNotifItem = function(id) {
    const notif = extNotifications.find(n => n.id === id);
    if (!notif) return;
    notif.read = true;
    saveExtNotifications();
    updateNotifBadge();
    if (notif.url) window.open(notif.url, '_blank');
};

// 알림 패널을 클릭한 알림벨 버튼 바로 아래에 붙여서 띄웁니다.
function positionNotifPanel(btn) {
    const panel = document.getElementById('notifPanel');
    if (!btn || !panel) return;

    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const panelWidth = Math.min(380, window.innerWidth * 0.92);

    let left = rect.right - panelWidth; // 버튼 오른쪽 끝에 패널 오른쪽 끝을 맞춤
    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    const top = rect.bottom + margin;

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.maxHeight = `${Math.max(200, window.innerHeight - top - 16)}px`;
}

let notifPanelAnchorBtn = null;

window.toggleNotifPanel = function(event) {
    if (event) event.stopPropagation();
    const overlay = document.getElementById('notifPanelOverlay');
    if (!overlay) return;

    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
        notifPanelAnchorBtn = (event && event.currentTarget) || document.getElementById('notifBellBtn') || document.getElementById('notifBellBtnMobile');
        positionNotifPanel(notifPanelAnchorBtn);
        renderNotifPanelList();
        overlay.classList.remove('hidden');
        // ⭐ 변경: 예전에는 패널을 열면 자동으로 전부 읽음 처리했지만,
        // 이제 "모두 읽음" 메뉴가 따로 생겨서 자동 처리 없이 사용자가 직접 선택하게 함
    } else {
        overlay.classList.add('hidden');
        closeNotifDropdowns();
    }
};

window.addEventListener('resize', () => {
    const overlay = document.getElementById('notifPanelOverlay');
    if (overlay && !overlay.classList.contains('hidden') && notifPanelAnchorBtn) {
        positionNotifPanel(notifPanelAnchorBtn);
    }
});

window.closeNotifPanel = function() {
    const overlay = document.getElementById('notifPanelOverlay');
    if (overlay) overlay.classList.add('hidden');
    closeNotifDropdowns();
};

window.clearAllNotifications = function() {
    extNotifications = [];
    saveExtNotifications();
    updateNotifBadge();
    renderNotifPanelList();
    closeNotifDropdowns();
};

// 페이지 로드 시 저장된 알림을 불러와 뱃지를 즉시 갱신
loadExtNotifications();
updateNotifBadge();

// =========================================================================
// Cloudinary 설정 (Unsigned Upload)
// =========================================================================
const CLOUDINARY_CLOUD_NAME = 'dtlqzklk5';
const CLOUDINARY_UPLOAD_PRESET = 'IMG_1234'; 

window.uploadImageToCloudinary = async function(file) {
    if (!file) return null;
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    
    try {
        const response = await fetch(url, { method: "POST", body: formData });
        const data = await response.json();
        return data.secure_url; 
    } catch (error) {
        console.error("Cloudinary 업로드 에러:", error);
        return null;
    }
};

window.handleScheduleImageUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const block = input.closest('.schedule-input-block');
    const previewContainer = block.querySelector('.sch-img-preview');
    const hiddenInput = block.querySelector('.sch-image-url');
    
    previewContainer.innerHTML = "<span class='text-sm text-blue-500 font-bold'>이미지 업로드 중...⏳</span>";
    
    const imageUrl = await window.uploadImageToCloudinary(file);
    if (imageUrl) {
        hiddenInput.value = imageUrl;
        previewContainer.innerHTML = `<img src="${imageUrl}" loading="lazy" decoding="async" class="h-20 w-auto rounded-lg object-cover border-2 border-gray-200 mt-2">`;
        const removeBtn = block.querySelector('.sch-img-remove-btn');
        if (removeBtn) removeBtn.classList.remove('hidden'); 
    } else {
        previewContainer.innerHTML = "<span class='text-sm text-red-500 font-bold'>업로드 실패!</span>";
    }
};

window.removeScheduleImage = function(btn) {
    const block = btn.closest('.schedule-input-block');
    const previewContainer = block.querySelector('.sch-img-preview');
    const hiddenInput = block.querySelector('.sch-image-url');
    const fileInput = block.querySelector('input[type="file"]');
    
    hiddenInput.value = ''; 
    fileInput.value = '';   
    previewContainer.innerHTML = ''; 
    btn.classList.add('hidden'); 
};

window.handleRollingImageSelect = function(input) {
    const removeBtn = document.getElementById('reImageRemoveBtn');
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert("이미지 용량이 너무 커요 🥲\n10MB 이하의 이미지만 업로드할 수 있어요!");
            input.value = '';
            removeBtn.classList.add('hidden');
            return;
        }
        removeBtn.classList.remove('hidden');
    }
};

window.removeRollingImage = function() {
    document.getElementById('reImage').value = '';
    const hiddenUrl = document.getElementById('reImageUrl');
    if(hiddenUrl) hiddenUrl.value = ''; 
    document.getElementById('reImageRemoveBtn').classList.add('hidden');
};

// =========================================================================
// PC 해상도 자동 스케일링 (2560px 기준)
// =========================================================================
function adjustDesktopScale() {
    const currentWidth = window.innerWidth;
    
    if (!computeIsMobile()) {
        const designWidth = 2560; 
        let scaleRatio = currentWidth / designWidth;
        scaleRatio = Math.min(scaleRatio, 1);
        document.body.style.zoom = scaleRatio;
    } else {
        document.body.style.zoom = 1;
    }
}

// =========================================================================
// 공통 헬퍼 함수
// =========================================================================
function getTodayYYYYMMDD() {
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kstTime.toISOString().split('T')[0];
}

function getDateAfterDaysYYYYMMDD(days) {
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000) + (days * 24 * 60 * 60 * 1000));
    return kstTime.toISOString().split('T')[0];
}

function setAppIcon() {
    const iconUrl = "https://i.postimg.cc/wjrJrQ0c/A1EAA0.png";
    let linkIcon = document.querySelector("link[rel~='icon']");
    if (!linkIcon) {
        linkIcon = document.createElement('link');
        linkIcon.rel = 'icon';
        document.head.appendChild(linkIcon);
    }
    linkIcon.href = iconUrl;
    let appleIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;
}
setAppIcon();

// =========================================================================
// 동적 스크립트 로딩 (Lazy Load)
// =========================================================================
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// =========================================================================
// 전역 함수 바인딩
// =========================================================================
window.toggleAmpm = toggleAmpm; window.handleAdminClick = handleAdminClick; window.checkPassword = checkPassword; window.logoutAdmin = logoutAdmin;
window.logoutUser = logoutUser;
window.cancelUserProfileSetup = cancelUserProfileSetup; window.submitUserProfileSetup = submitUserProfileSetup;
window.openPasswordModal = openPasswordModal; window.closePasswordModal = closePasswordModal; window.closeLogoutModal = closeLogoutModal;
window.handleDayClick = handleDayClick; window.handleDayRightClick = handleDayRightClick; window.editFromMenu = editFromMenu;
window.closeEditModal = closeEditModal; window.saveEditedSchedule = saveEditedSchedule; window.deleteScheduleAction = deleteScheduleAction; window.openDetailModal = openDetailModal; window.closeDetailModal = closeDetailModal;
window.openAllSchedulesModal = openAllSchedulesModal; window.changeTab = changeTab; window.changeMonth = changeMonth; window.openMonthPicker = openMonthPicker;
window.closeMonthPicker = closeMonthPicker; window.changePickerYear = changePickerYear; window.selectMonth = selectMonth; window.addScheduleInputBlock = addScheduleInputBlock;
window.closeScheduleModal = closeScheduleModal; window.saveSchedule = saveSchedule; window.toggleFields = toggleFields; 
window.toggleProfileDropdown = toggleProfileDropdown; window.openLinkModal = openLinkModal; window.closeLinkModal = closeLinkModal;
window.openManageModal = openManageModal; window.closeManageModal = closeManageModal; window.switchManageTab = switchManageTab;
window.addUpLink = addUpLink; window.deleteUpLink = deleteUpLink;
window.addDday = addDday; window.deleteDday = deleteDday; window.selectDdayColor = selectDdayColor;
window.startEditDday = startEditDday; window.cancelEditDday = cancelEditDday;
window.switchDdayImgTab = switchDdayImgTab; window.previewDdayImageFile = previewDdayImageFile; window.previewDdayImageUrl = previewDdayImageUrl;
window.toggleUpPanel = toggleUpPanel; window.toggleMemoPanel = toggleMemoPanel; window.closeSidePanel = closeSidePanel;
window.openMobileTabMenu = openMobileTabMenu; window.closeMobileTabMenu = closeMobileTabMenu;
window.executeDesktopTabChange = executeDesktopTabChange; window.executeMobileTabChange = executeMobileTabChange;
window.changeHomeDate = changeHomeDate; window.changeIndividualWeek = changeIndividualWeek;
window.openMobileDatePicker = openMobileDatePicker; window.closeMobileDatePicker = closeMobileDatePicker;
window.changeDatePickerMonth = changeDatePickerMonth; window.selectMobileDate = selectMobileDate;
window.closeUpPopup = closeUpPopup; 

window.openMemoAddModal = openMemoAddModal; window.openMemoEditModal = openMemoEditModal; 
window.closeMemoModal = closeMemoModal; window.saveMemoAction = saveMemoAction; window.deleteMemo = deleteMemo;
window.openSmartLink = openSmartLink;
window.handleProfileClick = handleProfileClick;

window.openRollingTopicModal = openRollingTopicModal; window.closeRollingTopicModal = closeRollingTopicModal; window.saveRollingTopic = saveRollingTopic;
window.deleteRollingTopic = deleteRollingTopic; window.openRollingTopic = openRollingTopic; window.closeRollingTopic = closeRollingTopic;
window.openRollingEntryModal = openRollingEntryModal; window.closeRollingEntryModal = closeRollingEntryModal; window.openEditRollingEntryModal = openEditRollingEntryModal;
window.saveRollingEntry = saveRollingEntry; window.deleteRollingEntry = deleteRollingEntry; window.openRollingDetailModal = openRollingDetailModal;
window.closeRollingDetailModal = closeRollingDetailModal; window.navigateRollingDetail = navigateRollingDetail; window.openRollingTopicFromMenu = openRollingTopicFromMenu;
window.openRollingTopicFromPopup = openRollingTopicFromPopup;

window.openInfoModal = openInfoModal; window.closeInfoModal = closeInfoModal; window.updateUserInfo = updateUserInfo;
window.moveScheduleBlock = moveScheduleBlock;
window.startScheduleDrag = startScheduleDrag;
window.startCalendarCardDrag = startCalendarCardDrag;
window.loginWithProfile = loginWithProfile; window.deleteSavedProfile = deleteSavedProfile;
window.savePopupImage = savePopupImage; window.deletePopupImage = deletePopupImage; window.switchPopupImgTab = switchPopupImgTab;
window.saveHomeYoutubeLink = saveHomeYoutubeLink; window.deleteHomeYoutubeLink = deleteHomeYoutubeLink;
window.previewPopupImgFile = previewPopupImgFile;

// 업보정리 바인딩
window.addUpboProduct = addUpboProduct; window.removeUpboProduct = removeUpboProduct; window.addUpboRow = addUpboRow; window.searchUpbo = searchUpbo; window.saveUpboData = saveUpboData; window.toggleUpboViewMode = toggleUpboViewMode;
window.addUpboMenuItem = addUpboMenuItem; window.removeUpboMenuItem = removeUpboMenuItem; window.updateUpboMenuField = updateUpboMenuField; window.uploadUpboMenuImage = uploadUpboMenuImage; window.renderUpboMenuAdminList = renderUpboMenuAdminList; window.setUpboMenuImageUrl = setUpboMenuImageUrl; window.toggleUpboMenuPanel = toggleUpboMenuPanel;
window.uploadUpboMenuListImage = uploadUpboMenuListImage; window.setUpboMenuListImageUrl = setUpboMenuListImageUrl;

// 시그널 바인딩
window.openSignalAddModal = openSignalAddModal; window.openSignalEditModal = openSignalEditModal; window.closeSignalAddModal = closeSignalAddModal;
window.saveSignalRecord = saveSignalRecord; window.deleteSignalRecord = deleteSignalRecord;
window.openSignalDetailModal = openSignalDetailModal; window.closeSignalDetailModal = closeSignalDetailModal;
window.previewSignalImageFile = previewSignalImageFile;
window.switchSignalImgTab = switchSignalImgTab; window.previewSignalImageUrl = previewSignalImageUrl;
window.addSignalVodRow = addSignalVodRow; window.removeSignalVodRow = removeSignalVodRow;

// 그룹 관리 함수는 window.xxx = function(){} 형태로 직접 할당되어 있음

// =========================================================================
// 일정 순서 변경 함수 (버튼 이동 + 드래그앤드롭 공용)
// =========================================================================
function moveScheduleBlock(btn, direction) {
    const currentBlock = btn.closest('.schedule-accordion-wrapper') || btn.closest('.schedule-input-block');
    const container = currentBlock.parentElement;

    if (direction === -1 && currentBlock.previousElementSibling) {
        container.insertBefore(currentBlock, currentBlock.previousElementSibling);
    } else if (direction === 1 && currentBlock.nextElementSibling) {
        container.insertBefore(currentBlock.nextElementSibling, currentBlock);
    } else {
        return; // 이동이 실제로 일어나지 않았으면 저장할 필요 없음
    }

    saveScheduleOrderImmediately();
}

// 이미 저장된(문서 id가 있는) 일정들의 순서를 화면에 보이는 DOM 순서 그대로
// Firestore의 timestamp 값에 즉시 반영해서, 모달을 닫거나 다시 열어도(일정관리에서도) 같은 순서로 보이게 함.
// 아직 저장 전인 새 일정 입력칸(id 없음)은 여기서 건드리지 않고, '저장' 버튼을 눌렀을 때 saveSchedule()이 알아서 순서대로 반영함.
async function saveScheduleOrderImmediately() {
    const wrappers = Array.from(document.querySelectorAll('#scheduleInputsContainer .schedule-accordion-wrapper'));
    if (wrappers.length === 0) return;

    const baseTs = Date.now();
    const updates = [];

    wrappers.forEach((wrapper, index) => {
        const idInput = wrapper.querySelector('.sch-id');
        const id = idInput ? idInput.value : '';
        if (!id) return;

        const sch = scheduleList.find(s => s.id === id);
        if (!sch) return;

        const newTimestamp = baseTs + index;
        if (sch.timestamp === newTimestamp) return;

        updates.push({ id, collectionName: sch.collectionName, newTimestamp, sch });
    });

    if (updates.length === 0) return;

    try {
        await Promise.all(updates.map(u => updateDoc(doc(db, u.collectionName, u.id), { timestamp: u.newTimestamp })));
        updates.forEach(u => { u.sch.timestamp = u.newTimestamp; });
        scheduleList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        saveScheduleCache();
        render();
    } catch (e) {
        console.error('일정 순서 저장 실패:', e);
    }
}

// ---- 드래그앤드롭으로 일정 순서 변경 ----
let scheduleDragState = null;

function startScheduleDrag(e, handle) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const wrapper = handle.closest('.schedule-accordion-wrapper');
    const container = wrapper ? wrapper.parentElement : null;
    if (!wrapper || !container) return;

    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}

    scheduleDragState = {
        pointerId: e.pointerId,
        wrapper,
        container,
        startY: e.clientY,
        moved: false
    };

    wrapper.classList.add('schedule-dragging');
    wrapper.style.position = 'relative';
    wrapper.style.zIndex = '50';
    wrapper.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
    wrapper.style.transition = 'none';

    document.addEventListener('pointermove', onScheduleDragMove);
    document.addEventListener('pointerup', onScheduleDragEnd);
    document.addEventListener('pointercancel', onScheduleDragEnd);
}

function onScheduleDragMove(e) {
    if (!scheduleDragState || e.pointerId !== scheduleDragState.pointerId) return;
    const state = scheduleDragState;
    const { wrapper } = state;

    const deltaY = e.clientY - state.startY;
    if (Math.abs(deltaY) > 2) state.moved = true;
    wrapper.style.transform = `translateY(${deltaY}px)`;

    const prevPointerEvents = wrapper.style.pointerEvents;
    wrapper.style.pointerEvents = 'none';
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    wrapper.style.pointerEvents = prevPointerEvents;

    const overWrapper = elUnder ? elUnder.closest('.schedule-accordion-wrapper') : null;
    if (overWrapper && overWrapper !== wrapper && overWrapper.parentElement === state.container) {
        const rect = overWrapper.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
            state.container.insertBefore(wrapper, overWrapper);
        } else {
            state.container.insertBefore(wrapper, overWrapper.nextElementSibling);
        }
        state.startY = e.clientY;
        wrapper.style.transform = 'translateY(0px)';
    }
}

async function onScheduleDragEnd(e) {
    if (!scheduleDragState || e.pointerId !== scheduleDragState.pointerId) return;
    const { wrapper, moved } = scheduleDragState;

    document.removeEventListener('pointermove', onScheduleDragMove);
    document.removeEventListener('pointerup', onScheduleDragEnd);
    document.removeEventListener('pointercancel', onScheduleDragEnd);

    wrapper.style.transform = '';
    wrapper.style.position = '';
    wrapper.style.zIndex = '';
    wrapper.style.boxShadow = '';
    wrapper.style.transition = '';
    wrapper.classList.remove('schedule-dragging');

    scheduleDragState = null;

    if (moved) await saveScheduleOrderImmediately();
}

// ---- 캘린더 화면에서 일정카드를 직접 드래그앤드롭으로 순서 변경 (같은 날짜 내에서만) ----
let calendarCardDragState = null;
let suppressCalendarCardClick = false;

// 드래그로 인해 발생한 클릭은 상세보기 모달이 열리지 않도록 캡처링 단계에서 무효화
document.addEventListener('click', function(e) {
    if (suppressCalendarCardClick) {
        suppressCalendarCardClick = false;
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
}, true);

function startCalendarCardDrag(e, card) {
    if (typeof isAdmin === 'undefined' || !isAdmin) return; // 어드민만 캘린더에서 바로 순서 변경 가능
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const container = card.parentElement;
    if (!container) return;
    // 같은 날짜에 일정이 2개 이상일 때만 순서 변경 의미가 있음
    if (container.querySelectorAll(':scope > .schedule-card').length < 2) return;

    calendarCardDragState = {
        pointerId: e.pointerId,
        card,
        container,
        startX: e.clientX,
        startY: e.clientY,
        moved: false
    };

    document.addEventListener('pointermove', onCalendarCardDragMove);
    document.addEventListener('pointerup', onCalendarCardDragEnd);
    document.addEventListener('pointercancel', onCalendarCardDragEnd);
}

function onCalendarCardDragMove(e) {
    if (!calendarCardDragState || e.pointerId !== calendarCardDragState.pointerId) return;
    const state = calendarCardDragState;
    const { card, container } = state;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.moved) {
        if (Math.hypot(dx, dy) < 6) return; // 살짝 움직인 정도는 클릭으로 취급
        state.moved = true;
        suppressCalendarCardClick = true;
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
        card.classList.add('calendar-card-dragging');
        card.style.position = 'relative';
        card.style.zIndex = '200';
        card.style.boxShadow = '0 8px 18px rgba(0,0,0,0.3)';
        card.style.transition = 'none';
        card.style.pointerEvents = 'none';
    }

    e.preventDefault();
    card.style.left = `${dx}px`;
    card.style.top = `${dy}px`;

    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    const overCard = elUnder ? elUnder.closest('.schedule-card') : null;

    if (overCard && overCard !== card && overCard.parentElement === container) {
        const rect = overCard.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
            container.insertBefore(card, overCard);
        } else {
            container.insertBefore(card, overCard.nextElementSibling);
        }
        state.startX = e.clientX;
        state.startY = e.clientY;
        card.style.left = '0px';
        card.style.top = '0px';
    }
}

async function onCalendarCardDragEnd(e) {
    if (!calendarCardDragState || e.pointerId !== calendarCardDragState.pointerId) return;
    const { card, container, moved } = calendarCardDragState;

    document.removeEventListener('pointermove', onCalendarCardDragMove);
    document.removeEventListener('pointerup', onCalendarCardDragEnd);
    document.removeEventListener('pointercancel', onCalendarCardDragEnd);

    card.style.left = '';
    card.style.top = '';
    card.style.position = '';
    card.style.zIndex = '';
    card.style.boxShadow = '';
    card.style.transition = '';
    card.style.pointerEvents = '';
    card.classList.remove('calendar-card-dragging');

    calendarCardDragState = null;

    if (moved) await saveCalendarCardOrder(container);
}

// 캘린더에서 드래그로 재배열된 카드 순서를 Firestore의 timestamp에 즉시 반영
async function saveCalendarCardOrder(container) {
    const cards = Array.from(container.querySelectorAll(':scope > .schedule-card'));
    if (cards.length === 0) return;

    const baseTs = Date.now();
    const updates = [];

    cards.forEach((card, index) => {
        const id = card.dataset.schId;
        if (!id) return;
        const sch = scheduleList.find(s => s.id === id);
        if (!sch) return;

        const newTimestamp = baseTs + index;
        if (sch.timestamp === newTimestamp) return;
        updates.push({ id, collectionName: sch.collectionName, newTimestamp, sch });
    });

    if (updates.length === 0) return;

    try {
        await Promise.all(updates.map(u => updateDoc(doc(db, u.collectionName, u.id), { timestamp: u.newTimestamp })));
        updates.forEach(u => { u.sch.timestamp = u.newTimestamp; });
        scheduleList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        saveScheduleCache();
        render();
    } catch (e) {
        console.error('캘린더 일정 순서 저장 실패:', e);
        render();
    }
}

// =========================================================================
// Firebase 초기화 및 변수 선언
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBKHLfymzRWRqUEsX9MF_SlZoph1WM_4Ck",
    authDomain: "signalplanner-95f78.firebaseapp.com",
    projectId: "signalplanner-95f78",
    storageBucket: "signalplanner-95f78.firebasestorage.app",
    messagingSenderId: "859229037333",
    appId: "1:859229037333:web:30eb50897b017c33b13f1c",
    measurementId: "G-D1RQRFH1KF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 멤버관리(스케줄 멤버) 전용 데이터베이스 - 별도 Firebase 프로젝트 연결
// 어드민 계정(admins)과 멤버 그룹(memberGroups)은 기존 데이터베이스(db)를 그대로 사용합니다.
const memberFirebaseConfig = {
    apiKey: "AIzaSyDVBD4FnLGFcUXqLWJyVOuZELCP-8jFO2E",
    authDomain: "memberlist-2e19f.firebaseapp.com",
    databaseURL: "https://memberlist-2e19f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "memberlist-2e19f",
    storageBucket: "memberlist-2e19f.firebasestorage.app",
    messagingSenderId: "1080011445408",
    appId: "1:1080011445408:web:9f776d3f4091a3f33425c5",
    measurementId: "G-HRPL7HSNCZ"
};

const memberApp = initializeApp(memberFirebaseConfig, "memberApp");
const memberDb = getFirestore(memberApp);

// 파트분배기(싱크룸) 전용 실시간 데이터베이스 - memberApp에 이미 설정된 databaseURL을 재사용
const partDividerDb = getDatabase(memberApp);

let scheduleList = []; 
let memoList = { '달타':[], '다룽':[], '최또':[], '카나시':[] };
let isAdmin = false;
let loggedInUser = null; 
let currentUser = null;           // 일반 유저(구글 로그인) - Firebase Auth 유저 객체
let userLikedSongsCache = null;   // { [member]: [songId, ...] } - 로그인한 유저의 좋아요 캐시

// ⭐ 신규: 새로고침 시 SOOP 로그인 상태 복원 (Firebase onAuthStateChanged보다 먼저 currentUser를 채워둠)
restoreSoopSession();
let currentPage = '홈';
let songbookMember = '달타';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let pickerYear = currentYear;
let contextTargetId = null;
let currentEditingIds = [];
let targetModalContext = { year: currentYear, month: currentMonth, day: 1, member: '홈' };
let currentEditingMemoId = null;
let memoPinned = localStorage.getItem('memoBoardPinned') === 'true';

// 모바일 기기라도 화면을 가로로 돌리면(가로가 세로보다 길고, 폭이 충분히 넓으면) PC 레이아웃으로 보이게 함
function computeIsMobile() {
    const w = window.innerWidth;
    // 가로 폭 기준 1050px 이하는 가로모드(landscape)여도 모바일 레이아웃으로 취급
    return w <= 1050;
}

let isMobile = computeIsMobile();
let sidePanelMode = null; 
let homeTargetDate = new Date(); 
let individualTargetDate = new Date(); 
let datePickerCurrentDate = new Date();

let rollingTopics = [];
let rollingEntries = [];
let currentRollingTopic = null; 
let currentTopicEntries = [];
let currentEntryIndex = 0;
let editRollingEntryId = null;
let loadedMemberPages = new Set();
// 롤링페이퍼는 주제(rollingTopics)는 항상 가볍게 전체 로드하되, 항목(rollingEntries)은
// 컬렉션 전체를 긁지 않고 실제로 열어본 주제의 항목만 그때그때 불러온다.
let loadedRollingTopicIds = new Set();

// =========================================================================
// 시그널 (지난 방송 아카이브) 상태
// =========================================================================
let signalRecords = [];
let editSignalRecordId = null;
let currentSignalDetailId = null;
// 시그널 기록도 컬렉션 전체를 한 번에 긁지 않고 최근 N개만 먼저 불러온 뒤 "더 보기"로 이어서 불러온다.
const SIGNAL_RECORDS_PAGE_SIZE = 30;
let signalRecordsCursorDate = null;
let signalRecordsHasMore = true;
let signalRecordsLoadingMore = false;

let customMembers = []; 
let memberGroups = []; // { id, name, memberIds: [] }
let popupImagesList = [];
let homeYoutubeUrl = '';
let homeBoxShouldShow = false; // 유튜브/이미지 or 공지 중 하나라도 있으면 true
let ddaysList = []; // 관리자가 등록한 기념일 목록 { id, title, date, timestamp, color, message }
let ddayBgImageUrl = ''; // 홈탭 디데이 카드 배경 이미지
let selectedDdayColor = 'pink'; // 디데이 등록 폼에서 현재 선택된 카드 색상
let editingDdayId = null; // 현재 수정 중인 디데이 id (null이면 신규 등록 모드)

// 디데이 카드 색상 테마 (핑크/노랑/블루/오렌지 중 선택)
const DDAY_COLOR_THEMES = {
    pink:   { swatch: '#f472b6', c1: '236,72,153', c2: '99,102,241',  badgeBg: 'rgba(244,114,182,0.12)', badgeBorder: 'rgba(244,114,182,0.45)', badgeText: '#f9a8d4', statG1: '244,63,94',  statG2: '219,39,119', statBorder: 'rgba(244,63,94,0.55)',  statShadow: 'rgba(244,63,94,0.6)',  statLabel: '#fecdd3' },
    yellow: { swatch: '#facc15', c1: '250,204,21', c2: '234,88,12',   badgeBg: 'rgba(250,204,21,0.14)',  badgeBorder: 'rgba(250,204,21,0.45)',  badgeText: '#fde68a', statG1: '250,204,21', statG2: '217,119,6', statBorder: 'rgba(250,204,21,0.55)', statShadow: 'rgba(250,204,21,0.5)', statLabel: '#fef3c7' },
    blue:   { swatch: '#3b82f6', c1: '59,130,246', c2: '14,165,233',  badgeBg: 'rgba(96,165,250,0.14)',  badgeBorder: 'rgba(96,165,250,0.45)',  badgeText: '#bfdbfe', statG1: '59,130,246', statG2: '37,99,235', statBorder: 'rgba(59,130,246,0.55)', statShadow: 'rgba(59,130,246,0.55)', statLabel: '#dbeafe' },
    orange: { swatch: '#fb923c', c1: '251,146,60', c2: '234,88,12',   badgeBg: 'rgba(251,146,60,0.14)',  badgeBorder: 'rgba(251,146,60,0.45)',  badgeText: '#fed7aa', statG1: '251,146,60', statG2: '234,88,12', statBorder: 'rgba(251,146,60,0.55)', statShadow: 'rgba(251,146,60,0.55)', statLabel: '#ffedd5' }
};

function selectDdayColor(color) {
    if (!DDAY_COLOR_THEMES[color]) return;
    selectedDdayColor = color;
    document.querySelectorAll('.dday-color-swatch').forEach(btn => {
        btn.classList.toggle('dday-color-swatch-selected', btn.dataset.color === color);
    });
}

const scheduleCacheStorageKey = 'signal_schedule_cache_v2';
// sessionStorage는 새 탭/임베드(iframe)마다 매번 비어있어 캐시가 사실상 무력화되므로
// 탭 간에도 유지되는 localStorage를 쓰고, 대신 TTL을 두어 데이터가 너무 오래 묵지 않게 한다.
const SCHEDULE_CACHE_TTL_MS = 7 * 60 * 1000; // 7분

function getDefaultMemoState() {
    return { '달타':[], '다룽':[], '최또':[], '카나시':[] };
}

function readScheduleCache() {
    try {
        const raw = localStorage.getItem(scheduleCacheStorageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.savedAt !== 'number' || (Date.now() - parsed.savedAt) > SCHEDULE_CACHE_TTL_MS) {
            // 유효기간이 지난 캐시는 버리고 새로 로드하게 한다.
            localStorage.removeItem(scheduleCacheStorageKey);
            return null;
        }
        return parsed;
    } catch (e) {
        console.warn('스케줄 캐시 읽기 실패:', e);
        return null;
    }
}

function saveScheduleCache() {
    try {
        const payload = {
            scheduleList,
            memoList,
            customMembers,
            memberGroups,
            rollingTopics,
            rollingEntries,
            loadedRollingTopicIds: Array.from(loadedRollingTopicIds),
            signalRecords,
            signalRecordsCursorDate,
            signalRecordsHasMore,
            loadedMemberPages: Array.from(loadedMemberPages),
            savedAt: Date.now()
        };
        localStorage.setItem(scheduleCacheStorageKey, JSON.stringify(payload));
    } catch (e) {
        console.warn('스케줄 캐시 저장 실패:', e);
    }
}

function hydrateScheduleCache(cache) {
    if (!cache) return false;
    if (Array.isArray(cache.scheduleList)) scheduleList = cache.scheduleList;
    memoList = cache.memoList || getDefaultMemoState();
    customMembers = Array.isArray(cache.customMembers) ? cache.customMembers : [];
    memberGroups = Array.isArray(cache.memberGroups) ? cache.memberGroups : [];
    rollingTopics = Array.isArray(cache.rollingTopics) ? cache.rollingTopics : [];
    rollingEntries = Array.isArray(cache.rollingEntries) ? cache.rollingEntries : [];
    loadedRollingTopicIds = new Set(Array.isArray(cache.loadedRollingTopicIds) ? cache.loadedRollingTopicIds : []);
    signalRecords = Array.isArray(cache.signalRecords) ? cache.signalRecords : [];
    signalRecordsCursorDate = typeof cache.signalRecordsCursorDate === 'string' ? cache.signalRecordsCursorDate : null;
    signalRecordsHasMore = cache.signalRecordsHasMore !== false;
    // 업보관리 데이터는 로컬 캐시에 저장/복원하지 않는다. 항상 loadUpboDataFromFirebase()로 즉시 최신 데이터를 받아온다.
    loadedMemberPages = new Set(Array.isArray(cache.loadedMemberPages) ? cache.loadedMemberPages : []);
    return true;
}

// 업보정리 데이터 상태
let upboData = {
    '달타': { products: [], records: [] },
    '다룽': { products: [], records: [] },
    '최또': { products: [], records: [] },
    '카나시': { products: [], records: [] }
};
let upboCurrentMember = '달타';
let upboViewMode = 'search'; // 'search' or 'admin'

const tabToHash = { 
    '홈': 'home', '달타': 'dalta', '다룽': 'darung', '최또': 'choiagain', '카나시': 'kanashi', 
    '롤링페이퍼': 'rolling', '업보정리': 'upbolist', '업보정리_달타': 'listdalta', '업보정리_다룽': 'listdarung', '업보정리_최또': 'listchoiagain', '업보정리_카나시': 'listkanashi',
    '노래책_달타': 'songbook_dalta', '노래책_다룽': 'songbook_darung', '노래책_최또': 'songbook_choitto', '노래책_카나시': 'songbook_kanashi',
    '시그널': 'signal',
    '클립': 'clip',
    '사다리타기': 'ladder',
    '파트분배기': 'partdivider'
};
const hashToTab = { 
    '#home': '홈', '#dalta': '달타', '#darung': '다룽', '#choiagain': '최또', '#kanashi': '카나시', 
    '#rolling': '롤링페이퍼', '#upbolist': '업보정리', '#list': '업보정리_달타', '#listdalta': '업보정리_달타', '#listdarung': '업보정리_다룽', '#listchoiagain': '업보정리_최또', '#listkanashi': '업보정리_카나시',
    '#songbook_dalta': '노래책_달타', '#songbook_darung': '노래책_다룽', '#songbook_choitto': '노래책_최또', '#songbook_kanashi': '노래책_카나시',
    '#signal': '시그널',
    '#clip': '클립',
    '#ladder': '사다리타기',
    '#partdivider': '파트분배기'
};

// =========================================================================
// 노래책 (달타탭 전용) 상태
// =========================================================================
let songs = [];
let songsByMember = { '달타': [], '다룽': [], '최또': [], '카나시': [] };
let songArtistFilter = null;
let currentEditingSongId = null;
let songArtistsCache = [];
let songGenreFilter = null;
let songGenresCache = [];
let songLikedOnlyFilter = false;
let likeInProgress = new Set();

function getThemeClassForMember(member) {
    const map = { '달타': 'dalta', '다룽': 'darung', '최또': 'choitto', '카나시': 'kanasi', '시그널': 'rolling' };
    return map[member] || 'dalta';
}

function hexToRgba(hex, alpha) {
    const clean = (hex || '#FBC02D').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g}, ${b},${alpha})`;
}

function getSongbookTheme(member = songbookMember) {
    const color = themeColors[member] || '#FBC02D';
    return {
        color,
        soft: hexToRgba(color, 0.16),
        border: color
    };
}

function getSongCollectionName(member = songbookMember) {
    const map = {
        '달타': 'songs_dalta',
        '다룽': 'songs_darung',
        '최또': 'songs_choitto',
        '카나시': 'songs_kanashi'
    };
    return map[member] || 'songs_dalta';
}

function setActiveSongs(member = songbookMember) {
    songs = songsByMember[member] || [];
}

function handleViewportChange() {
    adjustDesktopScale(); 
    
    const wasMobile = isMobile;
    isMobile = computeIsMobile();
    if (wasMobile !== isMobile) {
        sidePanelMode = null; closeSidePanel(true); renderHeaderTabs(); render();
    }
}
window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', handleViewportChange);


const themeColors = { '홈': '#FF5252', '달타': '#FBC02D', '다룽': '#1E88E5', '최또': '#f745c1', '카나시': '#F57C00', '추가기능': '#8B5CF6', '롤링페이퍼': '#8B5CF6', '노래책': '#FBC02D', '시그널': '#FF5252', '클립': '#8B5CF6', '사다리타기': '#8B5CF6', '파트분배기': '#8B5CF6' };
const collectionMap = { '달타': 'daltaevent', '다룽': 'drungevent', '최또': 'choiagainevent', '카나시': 'kanashievent' };
const memoCollectionMap = { '달타': 'daltamemo', '다룽': 'drungmemo', '최또': 'choiagainmemo', '카나시': 'kanashimemo' };

const members = [
    { name: '달타', img: './images/profile1.png', link: '' },
    { name: '다룽', img: './images/profile2.webp', link: '' },
    { name: '최또', img: './images/profile3.webp', link: '' },
    { name: '카나시', img: './images/profile4.png', link: '' }
];

const memberCardImages = {
    '달타': { bangon: './images/on1.webp', hubang: './images/off1.png' },
    '다룽': { bangon: './images/on2.webp', hubang: './images/off2.webp' },
    '최또': { bangon: './images/on3.webp', hubang: './images/off3.webp' },
    '카나시': { bangon: './images/on4.webp', hubang: './images/off4.webp' }
};

// 멤버별 SOOP(아프리카TV) 아이디 매핑 - 라이브 여부 확인 및 방송 바로가기에 사용
const memberSoopIdMap = { '달타': 'dalta20', '다룽': 'daarung22', '최또': 'choiagain', '카나시': 'kjhh0029' };
// 멤버별 최근 확인된 라이브 여부 캐시 { 멤버이름: true/false }
const liveStatusCache = {};
let liveStatusIntervalId = null;

// SOOP 라이브 상태 API로 해당 아이디가 현재 생방송 중인지 확인
// (background.js 확장 프로그램에서 실제로 잘 동작하는 bjapi.afreecatv.com station API를 그대로 사용)
// (주의: 이 API도 브라우저에서 직접 호출하면 CORS로 막히는 경우가 있어, 실패하면 공용 프록시로 재시도합니다)
async function checkSoopLiveStatus(soopId) {
    const apiUrl = `https://bjapi.afreecatv.com/api/${soopId}/station`;
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return !!(data && data.broad);
    } catch (e) {
        // 직접 호출이 CORS 등으로 실패하면 프록시를 통해 재시도
        try {
            const proxied = 'https://corsproxy.io/?url=' + encodeURIComponent(apiUrl);
            const res2 = await fetch(proxied);
            if (!res2.ok) throw new Error('HTTP ' + res2.status);
            const data2 = await res2.json();
            return !!(data2 && data2.broad);
        } catch (e2) {
            return false;
        }
    }
}

// 등록된 모든 멤버의 라이브 상태를 동시에 확인하고 화면에 반영
async function refreshAllLiveStatuses() {
    const entries = Object.entries(memberSoopIdMap);
    const results = await Promise.allSettled(entries.map(([, soopId]) => checkSoopLiveStatus(soopId)));
    entries.forEach(([name], i) => {
        liveStatusCache[name] = results[i].status === 'fulfilled' ? results[i].value : false;
    });
    applyLiveBadges();
}

// 현재 그려진 홈 화면의 라이브 표시 배지를 캐시된 상태에 맞게 갱신
// (배지 자체는 항상 보이고, 방송 중이면 빨간색+깜빡임, 꺼져있으면 회색으로 표시)
function applyLiveBadges() {
    members.forEach(member => {
        const badge = document.getElementById(`liveBadge-${member.name}`);
        if (!badge) return;
        const isLive = !!liveStatusCache[member.name];
        badge.classList.toggle('is-live', isLive);
        badge.title = isLive ? '생방송 중 · 클릭하면 방송으로 이동' : '현재 방송 중이 아니에요';
    });
}

// 라이브 배지 클릭 시, 방송 중이면 실제 생방송 화면으로 이동 (꺼져있으면 아무 동작 안 함)
function goToLiveBroadcast(event, memberName) {
    if (event) event.stopPropagation();
    if (!liveStatusCache[memberName]) return;
    const soopId = memberSoopIdMap[memberName];
    if (!soopId) return;
    openSmartLink(`https://play.sooplive.com/${soopId}`);
}

// 프로필 사진 클릭 시, 방송 중이면 바로 생방송으로, 방송 중이 아니면 기존 멤버 링크로 이동
function handleProfileClick(event, memberName, fallbackLink) {
    if (event) event.stopPropagation();
    const soopId = memberSoopIdMap[memberName];
    if (liveStatusCache[memberName] && soopId) {
        openSmartLink(`https://play.sooplive.com/${soopId}`);
        return;
    }
    if (fallbackLink) openSmartLink(fallbackLink);
}

// 홈탭에 머무는 동안 주기적으로 라이브 상태를 갱신
function startLiveStatusPolling() {
    refreshAllLiveStatuses();
    if (liveStatusIntervalId) clearInterval(liveStatusIntervalId);
    liveStatusIntervalId = setInterval(refreshAllLiveStatuses, 60000);
}

function stopLiveStatusPolling() {
    if (liveStatusIntervalId) { clearInterval(liveStatusIntervalId); liveStatusIntervalId = null; }
}

const defaultMemberLinks = {
    '달타': [ { title: '👑', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/20?viewType=L' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/dalta20' }, { title: '유튜브', url: 'https://www.youtube.com/@Dalta20' } ],
    '다룽': [ { title: '🫧', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/46' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/daarung22' }, { title: '유튜브', url: 'https://www.youtube.com/@daarung22' } ],
    '최또': [ { title: '🎀', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/88' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/choiagain' }, { title: '유튜브', url: 'https://www.youtube.com/@CHOI_AGAIN' } ],
    '카나시': [ { title: '🐣', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/105' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/kjhh0029' }, { title: '유튜브', url: 'https://www.youtube.com/@kanashi_0123' } ],
    '공지': [ { title: '260601 패치노트 보러가기', url: 'https://app.notion.com/p/schedule-calender/260601-3725f6fcabcd809b8d89fe83f7d48c83?source=copy_link' } ]
};

let dynamicLinks = JSON.parse(JSON.stringify(defaultMemberLinks));
let upLinksList = [];
// 마감일이 지난 UP 링크는 사이트에서 보이지 않도록 필터링
function getVisibleUpLinks() {
    const today = getTodayYYYYMMDD();
    return upLinksList.filter(up => !up.deadline || up.deadline >= today);
}

function openSmartLink(url) {
    if (!url) return;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) { window.location.href = url; } else { window.open(url, '_blank'); }
}

function generateAuthToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getSavedProfiles() {
    return JSON.parse(localStorage.getItem('savedAdminProfiles') || '[]');
}

function saveProfileLocally(profile) {
    let profiles = getSavedProfiles();
    profiles = profiles.filter(p => p.docId !== profile.docId); 
    profiles.push(profile);
    localStorage.setItem('savedAdminProfiles', JSON.stringify(profiles));
}

function deleteSavedProfile(docId) {
    let profiles = getSavedProfiles();
    profiles = profiles.filter(p => p.docId !== docId);
    localStorage.setItem('savedAdminProfiles', JSON.stringify(profiles));
    renderSavedProfiles();
}

function renderSavedProfiles() {
    const profiles = getSavedProfiles();
    const section = document.getElementById('savedProfilesSection');
    const list = document.getElementById('savedProfilesList');
    const divider = document.getElementById('loginDivider');

    if (profiles.length > 0) {
        section.classList.remove('hidden');
        divider.classList.remove('hidden'); divider.classList.add('flex');
        
        list.innerHTML = profiles.map(p => `
            <div class="relative flex flex-col items-center gap-1 cursor-pointer group shrink-0" onclick="loginWithProfile('${p.docId}', '${p.token}')">
                <button onclick="event.stopPropagation(); deleteSavedProfile('${p.docId}')" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition z-10 hover:scale-110 shadow-sm"><i class="fi fi-br-cross-small"></i></button>
                <img src="${p.img || 'https://via.placeholder.com/40'}" loading="lazy" decoding="async" class="w-[48px] h-[48px] rounded-full object-cover border-[2.5px] border-gray-200 group-hover:border-[#5D4037] transition">
                <span class="text-[12px] font-bold text-[#5D4037] truncate w-[54px] text-center">${p.name}</span>
            </div>
        `).join('');
    } else {
        section.classList.add('hidden');
        divider.classList.add('hidden'); divider.classList.remove('flex');
        list.innerHTML = '';
    }
}

async function loginWithProfile(docId, token) {
    try {
        const docRef = doc(db, "admins", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const adminData = docSnap.data();
            const savedProfiles = JSON.parse(localStorage.getItem('savedAdminProfiles') || '[]');
            const matchedProfile = savedProfiles.find(p => p.docId === docId);

            if (matchedProfile && matchedProfile.token === token) {
                isAdmin = true;
                loggedInUser = { docId, ...adminData };
                
                const isAutoLogin = document.getElementById('autoLoginCheck')?.checked;
                if (isAutoLogin) {
                    localStorage.setItem('activeAdminSession', JSON.stringify({ docId, token }));
                } else {
                    sessionStorage.setItem('activeAdminSession', JSON.stringify({ docId, token }));
                }

                refreshAuthUI();
                alert(`${adminData.name}님 환영합니다!`);
                closePasswordModal();
            } else {
                alert("인증이 만료되었습니다. 보안을 위해 아이디와 비밀번호로 다시 로그인해 주세요.");
                deleteSavedProfile(docId); 
            }
        } else {
            alert("존재하지 않거나 삭제된 관리자입니다.");
            deleteSavedProfile(docId);
        }
    } catch(e) {
        console.error("프로필 로그인 에러:", e);
        alert("로그인 중 오류가 발생했습니다.");
    }
}

async function checkPassword() {
    const inputId = document.getElementById('idInput').value.trim();
    const inputPw = document.getElementById('pwInput').value;
    const isAutoLogin = document.getElementById('autoLoginCheck')?.checked;

    if(!inputId || !inputPw) return alert("아이디와 비밀번호를 모두 입력해주세요.");

    try {
        const q = query(collection(db, "admins"), where("id", "==", inputId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const adminDoc = querySnapshot.docs[0];
            const adminData = adminDoc.data();
            
            if (adminData.pw === inputPw) {
                const docId = adminDoc.id;
                const token = generateAuthToken();

                isAdmin = true;
                loggedInUser = { docId, ...adminData };
                
                if (isAutoLogin) {
                    localStorage.setItem('activeAdminSession', JSON.stringify({ docId, token }));
                } else {
                    sessionStorage.setItem('activeAdminSession', JSON.stringify({ docId, token }));
                }

                saveProfileLocally({ docId, id: inputId, name: adminData.name, img: adminData.img, token });
                
                refreshAuthUI();
                alert(`${adminData.name}님 환영합니다!`); 
                document.getElementById('idInput').value = '';
                document.getElementById('pwInput').value = ''; 
                closePasswordModal();
            } else {
                alert('비밀번호가 일치하지 않습니다.');
                document.getElementById('pwInput').value = '';
            }
        } else {
            alert('존재하지 않는 아이디입니다.');
        }
    } catch (e) { 
        console.error("로그인 에러:", e); 
        alert("시스템 에러로 로그인에 실패했습니다."); 
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
    } catch (e) {
        console.error("유저 로그아웃 에러:", e);
    } finally {
        // ⭐ 신규: SOOP으로 로그인한 정보 수동 초기화(저장된 세션도 함께 삭제)
        clearSoopSession();
        currentUser = null;
        userLikedSongsCache = null;
        refreshAuthUI();
        if (typeof renderSongList === 'function' && document.getElementById('songListContainer')) {
            try { renderSongList(); } catch (e) { /* 아직 렌더 준비 전이면 무시 */ }
        }
    }
}

// =========================================================================
// 최초 로그인 시 닉네임 / SOOP 아이디 입력 강제
// =========================================================================
function openUserProfileSetupModal() {
    const nicknameEl = document.getElementById('nicknameInput');
    const soopIdEl = document.getElementById('soopIdInput');
    if (nicknameEl) nicknameEl.value = '';
    if (soopIdEl) soopIdEl.value = '';
    const modal = document.getElementById('userProfileSetupModal');
    if (modal) modal.classList.replace('hidden', 'flex');
}

function closeUserProfileSetupModal() {
    const modal = document.getElementById('userProfileSetupModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

async function cancelUserProfileSetup() {
    closeUserProfileSetupModal();
    alert('닉네임과 SOOP 아이디를 입력하지 않아 로그인이 취소되었습니다.');
    await logoutUser();
}

async function submitUserProfileSetup() {
    const nickname = document.getElementById('nicknameInput').value.trim();
    const soopId = document.getElementById('soopIdInput').value.trim();

    if (!nickname || !soopId) {
        closeUserProfileSetupModal();
        alert('닉네임과 SOOP 아이디를 모두 입력해야 합니다. 입력하지 않아 로그인이 취소됩니다.');
        await logoutUser();
        return;
    }

    if (!currentUser) {
        closeUserProfileSetupModal();
        return;
    }

    try {
        // SOOP 아이디 중복 확인
        const dupQuery = query(collection(db, "users"), where("soopId", "==", soopId));
        const dupSnap = await getDocs(dupQuery);
        const isDuplicate = dupSnap.docs.some(d => d.id !== currentUser.uid);
        if (isDuplicate) {
            alert('이미 사용 중인 SOOP 아이디입니다. 다른 아이디를 입력해주세요.');
            return;
        }

        // 최초 가입 시점: 구글계정 정보 + 닉네임/SOOP 아이디 + 승인상태(기본 승인)를 함께 저장합니다.
        await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email || null,
            name: currentUser.displayName || null,
            photo: currentUser.photoURL || null,
            nickname,
            soopId,
            status: '승인'
        }, { merge: true });
        closeUserProfileSetupModal();
        await finalizeUserLogin(currentUser, { status: '승인' });
        alert(`${nickname}님 환영합니다!`);
    } catch (e) {
        console.error('프로필 저장 실패:', e);
        alert('프로필 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// 로그인 직후, 로그인 전 이 브라우저(비로그인 상태)에서 눌러뒀던 좋아요를 계정으로 병합합니다.
async function mergeLocalLikesIntoAccount(uid, accountLikedSongs, collectionName = 'users') {
    const merged = { ...(accountLikedSongs || {}) };
    let changed = false;

    for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith('likedSongIds_')) continue;
        const member = storageKey.replace('likedSongIds_', '');
        try {
            const localIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!localIds.length) continue;
            const set = new Set(merged[member] || []);
            localIds.forEach(id => set.add(id));
            if (set.size !== (merged[member] || []).length) changed = true;
            merged[member] = Array.from(set);
        } catch (e) { /* 무시 */ }
    }

    if (changed) {
        try {
            await setDoc(doc(db, collectionName, uid), { likedSongs: merged }, { merge: true });
        } catch (e) {
            console.error('좋아요 병합 저장 실패:', e);
        }
    }
    return merged;
}

function renderLoggedOutAuthHtml(scope) {
    const isDesktop = scope === 'desktop';
    const btnClass = isDesktop
        ? 'font-paperozi bg-white border-2 border-gray-200 px-4 py-2 rounded-xl font-bold text-lg text-[#5D4037] hover:bg-[#5D4037] hover:border-[#5D4037] hover:text-white transition-all duration-200 shadow-sm'
        : 'font-paperozi bg-white border border-gray-200 px-2 py-[5px] rounded-lg font-bold text-[13px] text-[#5D4037] hover:bg-[#5D4037] hover:text-white transition-all shadow-sm';

    return `<button class="${btnClass}" onclick="handleAdminClick()">로그인</button>`;
}

window.openRecapFromSite = function() {
    // 확장프로그램(content.js)에게 리캡 페이지를 열어달라고 신호 전송
    window.postMessage({ type: 'REQUEST_OPEN_RECAP' }, '*');
};

function renderAdminAuthHtml(scope, user) {
    const isDesktop = scope === 'desktop';
    if (isDesktop) {
        return `
            <div class="relative inline-block text-left group z-[2000]">
                <div class="flex items-center gap-2 cursor-pointer bg-white border-2 border-gray-200 shadow-sm px-4 py-1.5 rounded-xl font-bold" onclick="toggleProfileDropdown('desktopProfileMenu')">
                    <img src="${user.img || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full object-cover border-2 border-[#5D4037]">
                    <span class="text-lg text-[#5D4037] font-paperozi">${user.name}</span>
                    <i class="fi fi-rr-caret-down text-[#5D4037]"></i>
                </div>
                <div id="desktopProfileMenu" class="hidden absolute right-0 top-full mt-2 w-36 bg-white flex-col shadow-xl rounded-xl overflow-hidden">
                    <button onclick="openMemberManageModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">멤버관리</button>
                    <button onclick="openManageModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">관리</button>
                    <button onclick="logoutAdmin()" class="px-4 py-3 text-left font-bold text-red-500 font-paperozi hover:bg-gray-100">로그아웃</button>
                </div>
            </div>
        `;
    }
    return `
        <div class="relative inline-block text-left z-[2000]">
            <div class="flex items-center gap-1 cursor-pointer bg-white border border-gray-200 shadow-sm px-2 py-[5px] rounded-lg font-bold" onclick="toggleProfileDropdown('mobileProfileMenu')">
                <img src="${user.img || 'https://via.placeholder.com/40'}" class="w-[20px] h-[20px] rounded-full object-cover border border-[#5D4037]">
            </div>
            <div id="mobileProfileMenu" class="hidden absolute right-0 top-full mt-2 w-28 bg-white flex-col shadow-xl rounded-xl overflow-hidden">
                <button onclick="openMemberManageModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">멤버관리</button>
                <button onclick="openManageModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">관리</button>
                <button onclick="logoutAdmin()" class="px-3 py-2 text-left font-bold text-red-500 text-sm font-paperozi hover:bg-gray-100">로그아웃</button>
            </div>
        </div>
    `;
}

function renderUserAuthHtml(scope, user) {
    const isDesktop = scope === 'desktop';
    const name = user.displayName || '유저';
    const photo = user.photoURL || '';
    const menuId = isDesktop ? 'userAuthMenu_desktop' : 'userAuthMenu_mobile';

    // ⭐ 신규: SOOP 계정으로 로그인한 상태일 때만 "구글 계정 연동" 메뉴를 보여줍니다.
    // (구글 로그인으로 연동된 SOOP 계정에 접속한 경우도 isSoopSession이 true라 함께 노출됩니다.)
    const linkMenuItem = isSoopSession
        ? `<button onclick="openGoogleLinkModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">구글 계정 연동</button>`
        : '';
    const linkMenuItemMobile = isSoopSession
        ? `<button onclick="openGoogleLinkModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">구글 연동</button>`
        : '';

    if (isDesktop) {
        return `
            <div class="relative inline-block text-left z-[2000]">
                <div class="flex items-center gap-2 cursor-pointer bg-white border-2 border-gray-200 shadow-sm px-4 py-1.5 rounded-xl font-bold" onclick="toggleProfileDropdown('${menuId}')">
                    <img src="${photo}" class="w-8 h-8 rounded-full object-cover border-2 border-gray-200">
                    <span class="text-lg text-[#5D4037] font-paperozi max-w-[100px] truncate">${name}</span>
                </div>
                <div id="${menuId}" class="hidden absolute right-0 top-full mt-2 w-36 bg-white flex-col shadow-xl rounded-xl overflow-hidden">
                    ${linkMenuItem}
                    <button onclick="logoutUser()" class="px-4 py-3 text-left font-bold text-red-500 font-paperozi hover:bg-gray-100">로그아웃</button>
                </div>
            </div>
        `;
    }
    return `
        <div class="relative inline-block text-left z-[2000]">
            <div class="flex items-center gap-1 cursor-pointer bg-white border border-gray-200 shadow-sm px-2 py-[5px] rounded-lg font-bold" onclick="toggleProfileDropdown('${menuId}')">
                <img src="${photo}" class="w-[20px] h-[20px] rounded-full object-cover border border-gray-200">
            </div>
            <div id="${menuId}" class="hidden absolute right-0 top-full mt-2 w-28 bg-white flex-col shadow-xl rounded-xl overflow-hidden">
                ${linkMenuItemMobile}
                <button onclick="logoutUser()" class="px-3 py-2 text-left font-bold text-red-500 text-sm font-paperozi hover:bg-gray-100">로그아웃</button>
            </div>
        </div>
    `;
}

function refreshAuthUI() {
    const desktopContainer = document.getElementById('desktopAuthContainer');
    const mobileContainer = document.getElementById('mobileAuthContainer');

    document.body.classList.toggle('admin-mode', !!(isAdmin && loggedInUser));

    if (isAdmin && loggedInUser) {
        if (desktopContainer) desktopContainer.innerHTML = renderAdminAuthHtml('desktop', loggedInUser);
        if (mobileContainer) mobileContainer.innerHTML = renderAdminAuthHtml('mobile', loggedInUser);
    } else if (currentUser) {
        if (desktopContainer) desktopContainer.innerHTML = renderUserAuthHtml('desktop', currentUser);
        if (mobileContainer) mobileContainer.innerHTML = renderUserAuthHtml('mobile', currentUser);
    } else {
        if (desktopContainer) desktopContainer.innerHTML = renderLoggedOutAuthHtml('desktop');
        if (mobileContainer) mobileContainer.innerHTML = renderLoggedOutAuthHtml('mobile');
    }
}

onAuthStateChanged(auth, async (user) => {
    // 구글 계정 연동 처리 중에는 linkGoogleAccount() 쪽에서 모든 로직을 전담하므로 여기서는 무시합니다.
    if (isLinkingGoogleAccount) return;

    if (!user) {
        // ⭐ 신규: SOOP 로그인 세션이 복원되어 있는 상태라면, Firebase의 '로그아웃 상태'로 덮어쓰지 않음
        if (isSoopSession) return;

        currentUser = null;
        userLikedSongsCache = null;
        refreshAuthUI();
        if (typeof renderSongList === 'function' && document.getElementById('songListContainer')) {
            try { renderSongList(); } catch (e) { /* 아직 렌더 준비 전이면 무시 */ }
        }
        return;
    }

    // ⭐ 신규: 이 구글 계정이 SOOP 계정에 연동되어 있는지 먼저 확인합니다.
    // 연동되어 있으면 SOOP 계정과 완전히 동일한 정보(닉네임/프사/좋아요/롤링페이퍼 등)로 로그인 처리합니다.
    try {
        const linkSnap = await getDoc(doc(db, "accountLinks", user.uid));
        if (linkSnap.exists() && linkSnap.data().soopId) {
            const soopId = linkSnap.data().soopId;
            const soopSnap = await getDoc(doc(db, "soopUsers", soopId));
            if (soopSnap.exists()) {
                const soopData = soopSnap.data();
                currentUser = {
                    uid: soopId,
                    displayName: soopData.nick || soopData.displayName || user.displayName,
                    photoURL: soopData.imgUrl || soopData.photoURL || user.photoURL
                };
                isSoopSession = true;
                soopSessionViaGoogleLink = true; // 구글 로그인이 SOOP 계정에 연동되어 자동으로 채워진 세션
                saveSoopSession(currentUser, true); // 새로고침해도 로그인 유지
                refreshAuthUI();
                loadAndMergeSoopLikes(soopId);
                flushPendingLoginNotifications();
                return;
            }
        }
    } catch (e) {
        console.error('연동 계정 확인 실패:', e);
    }

    // 연동된 SOOP 계정이 없는, 순수 구글 계정으로 실제 로그인한 경우: 기존 SOOP 세션은 정리합니다.
    clearSoopSession();
    currentUser = user;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const existingData = userSnap.exists() ? userSnap.data() : {};

        // 처음 로그인(닉네임/SOOP 아이디 미등록)이면 추가 정보 입력을 먼저 요구합니다.
        if (!existingData.nickname || !existingData.soopId) {
            openUserProfileSetupModal();
            return;
        }

        // 차단된 계정이면 로그인을 막습니다.
        if (existingData.status === '차단') {
            alert('차단된 계정입니다. 관리자에게 문의해주세요.');
            await logoutUser();
            return;
        }

        await finalizeUserLogin(user, existingData);
    } catch (e) {
        console.error('유저 정보 동기화 실패:', e);
    }
});

// 닉네임/SOOP 아이디 입력까지 끝난 뒤 실제 로그인을 마무리합니다.
async function finalizeUserLogin(user, existingData) {
    try {
        const userRef = doc(db, "users", user.uid);
        const existingLiked = (existingData && existingData.likedSongs) || {};

        await setDoc(userRef, {
            email: user.email || null,
            name: user.displayName || null,
            photo: user.photoURL || null,
            lastLogin: Date.now(),
            // status 필드가 아직 없는 기존 유저는 기본값 '승인'으로 채워줍니다.
            ...(existingData && existingData.status ? {} : { status: '승인' })
        }, { merge: true });

        userLikedSongsCache = await mergeLocalLikesIntoAccount(user.uid, existingLiked);
    } catch (e) {
        console.error('유저 정보 동기화 실패:', e);
        userLikedSongsCache = userLikedSongsCache || {};
    }

    refreshAuthUI();
    flushPendingLoginNotifications(); // 로그인 전 대기열에 쌓여있던 알림을 알림벨에 반영
    if (typeof renderSongList === 'function' && document.getElementById('songListContainer')) {
        try { renderSongList(); } catch (e) { /* 아직 렌더 준비 전이면 무시 */ }
    }
}

function openManageModal(tab = 'link') {
    if (!isAdmin || !loggedInUser) return;
    renderLinkManagePanel();
    renderUpLinkManagePanel();
    renderDdayManagePanel();
    cancelEditDday();
    renderInfoManagePanel();
    renderHomeManagePanel();
    if (typeof renderUpdateManagePanel === 'function') renderUpdateManagePanel();
    if (typeof resetUpdateImageForm === 'function') resetUpdateImageForm();
    document.getElementById('manageModal').classList.replace('hidden', 'flex');
    switchManageTab(tab);

    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });
}

function closeManageModal() {
    document.getElementById('manageModal').classList.replace('flex', 'hidden');
    if (editingUpdateLogId && typeof cancelEditUpdateLog === 'function') cancelEditUpdateLog();
}

function switchManageTab(tab) {
    const panels = { link: document.getElementById('manageTabPanel_link'), up: document.getElementById('manageTabPanel_up'), dday: document.getElementById('manageTabPanel_dday'), home: document.getElementById('manageTabPanel_home'), info: document.getElementById('manageTabPanel_info'), update: document.getElementById('manageTabPanel_update') };
    const btns = { link: document.getElementById('manageTabBtn_link'), up: document.getElementById('manageTabBtn_up'), dday: document.getElementById('manageTabBtn_dday'), home: document.getElementById('manageTabBtn_home'), info: document.getElementById('manageTabBtn_info'), update: document.getElementById('manageTabBtn_update') };
    
    Object.keys(panels).forEach(key => {
        if (!panels[key] || !btns[key]) return;
        const active = key === tab;
        panels[key].classList.toggle('hidden', !active);
        btns[key].classList.toggle('bg-[#5D4037]', active);
        btns[key].classList.toggle('text-white', active);
        btns[key].classList.toggle('text-[#5D4037]', !active);
        btns[key].classList.toggle('hover:bg-gray-100', !active);
    });
}

function renderInfoManagePanel() {
    if (!loggedInUser) return;
    document.getElementById('infoEmail').value = loggedInUser.email || '';
    document.getElementById('infoPw').value = '';
}

function openInfoModal() { openManageModal('info'); }
function closeInfoModal() { closeManageModal(); }

async function updateUserInfo() {
    const newEmail = document.getElementById('infoEmail').value.trim();
    const newPw = document.getElementById('infoPw').value;
    
    if (!loggedInUser || !loggedInUser.docId) return;

    try {
        const updateData = { email: newEmail };
        if (newPw) { 
            updateData.pw = newPw; 
            
            let profiles = JSON.parse(localStorage.getItem('savedAdminProfiles') || '[]');
            profiles = profiles.filter(p => p.docId !== loggedInUser.docId);
            localStorage.setItem('savedAdminProfiles', JSON.stringify(profiles));
        }
        
        await updateDoc(doc(db, "admins", loggedInUser.docId), updateData);
        alert("정보가 성공적으로 변경되었습니다. 보안을 위해 다시 로그인해주세요.");
        closeInfoModal();
        logoutAdmin(); 
    } catch (e) {
        console.error("정보 업데이트 실패:", e);
        alert("수정에 실패했습니다.");
    }
}

function switchPopupImgTab(tab) {
    const urlSection = document.getElementById('popupImgUrlSection');
    const fileSection = document.getElementById('popupImgFileSection');
    const tabUrl = document.getElementById('popupImgTabUrl');
    const tabFile = document.getElementById('popupImgTabFile');
    if (!urlSection || !fileSection) return;
    if (tab === 'url') {
        urlSection.classList.remove('hidden');
        fileSection.classList.add('hidden');
        tabUrl.classList.add('bg-[#5D4037]', 'text-white');
        tabUrl.classList.remove('bg-white', 'text-[#5D4037]');
        tabFile.classList.add('bg-white', 'text-[#5D4037]');
        tabFile.classList.remove('bg-[#5D4037]', 'text-white');
    } else {
        urlSection.classList.add('hidden');
        fileSection.classList.remove('hidden');
        tabFile.classList.add('bg-[#5D4037]', 'text-white');
        tabFile.classList.remove('bg-white', 'text-[#5D4037]');
        tabUrl.classList.add('bg-white', 'text-[#5D4037]');
        tabUrl.classList.remove('bg-[#5D4037]', 'text-white');
    }
}

function previewPopupImgFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('popupImgPreview');
        const previewImg = document.getElementById('popupImgPreviewImg');
        if (preview && previewImg) { previewImg.src = e.target.result; preview.classList.remove('hidden'); }
    };
    reader.readAsDataURL(file);
}

async function savePopupImage() {
    const urlInput = document.getElementById('popupImgUrl');
    const fileInput = document.getElementById('popupImgFile');
    const startDateInput = document.getElementById('popupImgStartDate');
    const deadlineInput = document.getElementById('popupImgDeadline');
    const urlSection = document.getElementById('popupImgUrlSection');
    const statusEl = document.getElementById('popupImgUploadStatus');

    let imageUrl = '';
    const isUrlMode = !urlSection.classList.contains('hidden');

    if (isUrlMode) {
        imageUrl = urlInput ? urlInput.value.trim() : '';
        if (!imageUrl) return alert('이미지 URL을 입력하세요.');
    } else {
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) return alert('업로드할 파일을 선택하세요.');
        if (statusEl) { statusEl.classList.remove('hidden'); statusEl.textContent = '업로드 중...⏳'; }
        imageUrl = await window.uploadImageToCloudinary(file);
        if (statusEl) statusEl.classList.add('hidden');
        if (!imageUrl) return alert('이미지 업로드에 실패했습니다.');
    }

    const startDate = startDateInput ? startDateInput.value : '';
    const deadline = deadlineInput ? deadlineInput.value : '';
    if (!startDate || !deadline) return alert('시작일자와 마감일자를 모두 입력하세요.');

    try {
        const newPopup = { url: imageUrl, startDate, deadline, timestamp: Date.now() };
        
        const docRef = await addDoc(collection(db, 'popupImages'), newPopup);
        newPopup.id = docRef.id;
        
        popupImagesList.unshift(newPopup);
        alert('팝업 이미지 예약이 등록되었습니다.');
        
        if(urlInput) urlInput.value = '';
        if(fileInput) fileInput.value = '';
        if(startDateInput) startDateInput.value = '';
        if(deadlineInput) deadlineInput.value = '';
        document.getElementById('popupImgPreview').classList.add('hidden');
        
        renderPopupImgCurrentInfo();
    } catch(e) { console.error(e); alert('저장 실패: ' + e.message); }
}

function renderPopupImgCurrentInfo() {
    const el = document.getElementById('popupImgCurrentInfo');
    if (!el) return;
    
    if (popupImagesList.length > 0) {
        let html = `<div class="text-[13px] font-bold text-gray-500 mb-2">예약된 팝업 목록 (최신순):</div>`;
        html += popupImagesList.map(img => `
            <div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200 mb-2 text-xs">
                <div class="truncate flex-1 mr-2">
                    <a href="${img.url}" target="_blank" class="text-blue-500 underline font-bold">이미지 링크 확인</a>
                    <span class="text-gray-500 block mt-1 font-semibold">기간: ${img.startDate} ~${img.deadline}</span>
                </div>
                <button onclick="deletePopupImage('${img.id}')" class="text-white bg-red-500 text-[11px] font-bold px-2 py-1 rounded hover:bg-red-600 transition shrink-0">삭제</button>
            </div>
        `).join('');
        el.innerHTML = html;
    } else {
        el.textContent = '현재 등록된 팝업 이미지가 없습니다.';
    }
}

async function deletePopupImage(id) {
    if (!confirm('이 팝업 이미지 예약을 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'popupImages', id));
        popupImagesList = popupImagesList.filter(img => img.id !== id);
        alert('팝업 이미지 예약이 삭제되었습니다.');
        renderPopupImgCurrentInfo();
    } catch(e) { console.error(e); alert('삭제 실패: ' + e.message); }
}

async function loadPopupImagesFromFirebase() {
    try {
        const snap = await getDocs(collection(db, 'popupImages'));
        popupImagesList = [];
        snap.forEach(doc => {
            popupImagesList.push({ id: doc.id, ...doc.data() });
        });
        popupImagesList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch(e) { console.error('팝업 이미지 목록 로드 실패:', e); popupImagesList = []; }
}

// =========================================================================
// 홈 화면 유튜브 임베드 & 숲 공지사항 연동
// =========================================================================
function getYoutubeVideoId(url) {
    if (!url) return null;
    try {
        const u = new URL(url.trim());
        const host = u.hostname.replace('www.', '');

        if (host === 'youtu.be') {
            const id = u.pathname.split('/').filter(Boolean)[0];
            return id || null;
        }

        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
            if (u.pathname === '/watch') return u.searchParams.get('v');
            const parts = u.pathname.split('/').filter(Boolean);
            if ((parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'embed') && parts[1]) {
                return parts[1];
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

// 홈 화면 영상/이미지 링크로 등록된 URL이 이미지 파일 링크인지 판별
// (확장자가 있으면 확장자로 판별하고, 확장자가 없는 CDN 링크 등은 유튜브 링크가 아니면 이미지로 간주)
function isImageUrl(url) {
    if (!url) return false;
    const trimmed = url.trim();
    if (/\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?.*)?(#.*)?$/i.test(trimmed)) return true;
    try {
        const u = new URL(trimmed);
        // 유튜브가 아니면서 http(s) 프로토콜의 유효한 URL이면 이미지 링크로 취급
        return (u.protocol === 'http:' || u.protocol === 'https:') && !getYoutubeVideoId(trimmed);
    } catch (e) {
        return false;
    }
}

// 게시글 제목/본문에 HTML 태그가 섞여 오는 경우를 대비한 태그 제거 유틸
function stripHtmlTags(str) {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// title/contents 필드가 문자열이 아니라 { text, rawText, ... } 같은 객체로 오는 API도 있어
// 객체인 경우 그 안에서 실제 텍스트로 보이는 값을 찾아 꺼낸다. ([object Object] 방지)
function extractText(field) {
    if (field == null) return '';
    if (typeof field === 'string') return stripHtmlTags(field);
    if (typeof field === 'number') return String(field);
    if (typeof field === 'object') {
        const candidateKeys = ['text', 'rawText', 'plainText', 'plain_text', 'value', 'content', 'html', 'raw'];
        for (const key of candidateKeys) {
            if (typeof field[key] === 'string' && field[key].trim()) {
                return stripHtmlTags(field[key]);
            }
        }
        return '';
    }
    return '';
}

// 게시글의 등록 시각을 다양한 필드명/포맷에서 최대한 찾아내 Date로 변환
function getPostDate(post) {
    const raw = post.reg_date || post.regDate || post.regdate || post.reg_time || post.regTime ||
                post.createdAt || post.created_at || post.writeDate || post.write_date ||
                post.wdate || post.date || post.timestamp || post.regDt;
    if (!raw) return null;

    // 숫자(초/밀리초 단위 유닉스 타임스탬프)
    if (typeof raw === 'number') {
        const ms = raw < 10_000_000_000 ? raw * 1000 : raw; // 10자리면 초 단위로 판단
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }

    // 문자열: "2024-06-01 12:34:56" 같은 형식은 그대로, 순수 숫자 문자열이면 타임스탬프로 처리
    if (typeof raw === 'string') {
        if (/^\d+$/.test(raw)) {
            const num = Number(raw);
            const ms = raw.length <= 10 ? num * 1000 : num;
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }
        const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

// "35분 전" 같은 상대 시간 텍스트 생성
function formatRelativeTime(date) {
    if (!date) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

// 4명의 스트리머 API 정보 배열
const soopBoards = [
    { name: '달타', userId: 'dalta20', color: '#FBC02D', apiUrl: 'https://api-channel.sooplive.com/v1.1/channel/dalta20/board?perPage=20&startDate=&endDate=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&orderBy=reg_date&page=1&bbsNo=89892972' },
    { name: '다룽', userId: 'daarung22', color: '#1E88E5', apiUrl: 'https://api-channel.sooplive.com/v1.1/channel/daarung22/board?perPage=20&startDate=&endDate=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&orderBy=reg_date&page=1&bbsNo=90309005' },
    { name: '최또', userId: 'choiagain', color: '#f745c1', apiUrl: 'https://api-channel.sooplive.com/v1.1/channel/choiagain/board?perPage=20&startDate=&endDate=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&orderBy=reg_date&page=1&bbsNo=98735869' },
    { name: '카나시', userId: 'kjhh0029', color: '#F57C00', apiUrl: 'https://api-channel.sooplive.com/v1.1/channel/kjhh0029/board?perPage=20&startDate=&endDate=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&orderBy=reg_date&page=1&bbsNo=80727213' }
];

// 모바일/데스크탑 어디서 홈 화면이 다시 그려지더라도(날짜 이동 등) 공지 데이터를
// 다시 fetch하지 않고 재사용할 수 있도록 캐시해 둔다.
let cachedNoticeItemsHtml = '';
let hasCachedNotice = false;
let cachedPerMemberNoticeHtml = {};
let noticeFetchAttempted = false;

async function fetchAndRenderAllNotices() {
    // 모바일(홈탭 본문) 컨테이너
    const mobileNoticeBox = document.getElementById('mobileHomeNoticeBox');
    const mobileNoticeList = document.getElementById('mobileHomeNoticeList');

    let hasAnyPost = false;
    const collectedPosts = []; // { board, post, date } — 모든 스트리머 게시글을 모아뒀다가 시간순 정렬

    for (const board of soopBoards) {
        try {
            const res = await fetch(board.apiUrl, {
                headers: { 
                    Accept: "application/json", 
                },
            });
            
            const data = await res.json();
            const posts = data?.data?.list || data?.data?.posts || data?.data || data?.posts || data?.contents || data?.list || (Array.isArray(data) ? data : []) || [];

            if (!res.ok) {
                console.warn(`${board.name} API 응답 오류 (status ${res.status})`, data);
            }

            // 대소문자 구분 없이 스트리머 아이디와 일치하는 글만 필터링 (필드명이 API마다 다를 수 있어 폭넓게 확인)
            const getPostUserId = (post) =>
                post.user_id || post.userId || post.writer_id || post.writerId ||
                post.writer?.id || post.writer?.user_id || post.author_id || post.authorId;

            // 공지 전용 게시판(noticeBoard)이라도, relatedposts류 API는 다른 사람 글이 섞여 올 수 있으므로
            // user_id가 kjhh0029(등록된 board.userId)와 일치하는 글만 남긴다.
            // 단, 응답 스키마에 user_id 관련 필드가 아예 없는 경우(값 자체가 undefined)까지 걸러버리면
            // 전부 사라질 수 있으니, 그런 글은 일단 남겨두고 콘솔에 경고만 남긴다.
            const streamerPosts = posts.filter((post) => {
                const uid = getPostUserId(post);
                if (!uid) return true; // uid 필드를 못 찾은 경우는 판단 불가 -> 일단 유지
                return uid.toLowerCase() === board.userId.toLowerCase();
            });

            if (posts.length > 0 && streamerPosts.length === 0) {
                console.warn(`${board.name}: 게시글은 받았지만 user_id가 '${board.userId}'와 일치하지 않아 걸러짐. 실제 데이터:`, posts[0]);
            }

            // 스트리머별 최신글 2개만 추출 (전체가 한 스트리머로 도배되지 않도록)
            // 단, 상단 고정된 공지글은 작성일이 오래돼도 최신 2개 안에 못 들 수 있으므로
            // 별도로 챙겨서 항상 포함시킨다. (API마다 필드명이 다를 수 있어 폭넓게 확인)
            const isPinnedPost = (post) => {
                // 불리언(true/'Y') 형태와, 실제 API처럼 숫자 코드(예: noticeYn:2)로 내려오는 형태를 모두 인정.
                // 0/'0'/'N'/null/undefined 등만 "고정 아님"으로 취급하고, 그 외 값이 있으면 고정으로 판단한다.
                const truthy = (v) => {
                    if (v === undefined || v === null) return false;
                    if (v === true) return true;
                    if (v === false) return false;
                    if (typeof v === 'string') {
                        const s = v.trim().toUpperCase();
                        if (s === '' || s === '0' || s === 'N') return false;
                        if (s === 'Y') return true;
                        const n = Number(s);
                        return !isNaN(n) && n > 0;
                    }
                    if (typeof v === 'number') return v > 0;
                    return false;
                };
                return truthy(post.isNotice) || truthy(post.isPin) || truthy(post.is_notice) || truthy(post.is_pin) ||
                       truthy(post.notice_yn) || truthy(post.noticeYn) || truthy(post.fix_yn) || truthy(post.fixYn) ||
                       truthy(post.top_fix_yn) || truthy(post.topFixYn) || truthy(post.pin_yn) || truthy(post.pinYn);
            };

            let latestPosts;
            if (board.noticeBoard) {
                // 이 게시판(bbsNo) 자체가 "공지 전용 게시판"인 경우: 글마다 별도의 고정 플래그가
                // 없을 수 있으므로 플래그로 거르지 않고, 날짜(regDate 등) 기준 최신순으로 정렬해
                // 가져온 1페이지(perPage) 분량을 그대로 공지로 취급한다.
                const sortedByDate = [...streamerPosts].sort((a, b) => {
                    const da = getPostDate(a);
                    const db = getPostDate(b);
                    if (da && db) return db.getTime() - da.getTime();
                    if (da) return -1;
                    if (db) return 1;
                    return 0;
                });
                latestPosts = sortedByDate;
            } else {
                const pinnedPosts = streamerPosts.filter(isPinnedPost);
                const normalPosts = streamerPosts.filter((post) => !isPinnedPost(post));
                latestPosts = [...pinnedPosts, ...normalPosts];
            }

            // 게시판 목록 API에는 고정 공지글이 아예 안 잡히는 경우가 있어(오래된 글이라 페이지 밖으로 밀림 등),
            // 해당 스트리머에 등록해둔 고정글 ID가 있으면 게시글 단건 조회 API로 직접 가져와 합쳐준다.
            if (Array.isArray(board.pinnedPostIds) && board.pinnedPostIds.length > 0) {
                const getPostNo = (post) => post.title_no || post.titleNo || post.no || post.id || post.post_id || post.postId;
                for (const pinnedId of board.pinnedPostIds) {
                    const alreadyIncluded = latestPosts.some((p) => String(getPostNo(p)) === String(pinnedId));
                    if (alreadyIncluded) continue;

                    try {
                        const pinRes = await fetch(`https://api-channel.sooplive.com/v1.1/channel/${board.userId}/post/${pinnedId}`, {
                            headers: { Accept: "application/json" },
                        });
                        const pinData = await pinRes.json();
                        const pinnedPost = pinData?.data || pinData;

                        if (pinnedPost && typeof pinnedPost === 'object' && !Array.isArray(pinnedPost)) {
                            latestPosts = [pinnedPost, ...latestPosts];
                        } else {
                            console.warn(`${board.name} 고정글(#${pinnedId}) 단건 조회 응답 형식이 예상과 달라 건너뜀`, pinData);
                        }
                    } catch (pinError) {
                        console.error(`${board.name} 고정글(#${pinnedId}) 단건 조회 실패`, pinError);
                    }
                }
            }

            latestPosts.forEach(post => {
                collectedPosts.push({ board, post, date: getPostDate(post) });
            });
        } catch (error) {
            console.error(`${board.name} 게시글을 불러오는 데 실패했습니다.`, error);
        }
    }

    // 시간순(오래된 글 → 최신 글) 정렬 — 메신저처럼 최신 글이 가장 아래에 오도록 함
    // 시간 정보가 없는 글은 가장 오래된 취급으로 위쪽에 배치
    collectedPosts.sort((a, b) => {
        if (a.date && b.date) return a.date.getTime() - b.date.getTime();
        if (a.date) return 1;
        if (b.date) return -1;
        return 0;
    });

    // 게시판 목록 API는 제목만 내려주고 본문 내용은 비어있는 경우가 많아,
    // 내용이 없는 글은 게시글 단건 조회 API로 본문을 추가로 가져와 채워준다.
    await Promise.all(collectedPosts.map(async (item) => {
        const existingBody = extractText(item.post.content?.textContent || item.post.content?.summary || item.post.contents || item.post.content || item.post.body);
        if (existingBody) return; // 이미 내용이 있으면 그대로 사용

        const postNo = item.post.title_no || item.post.titleNo || item.post.no || item.post.id || item.post.post_id || item.post.postId;
        if (!postNo) return;

        try {
            const detailRes = await fetch(`https://api-channel.sooplive.com/v1.1/channel/${item.board.userId}/post/${postNo}`, {
                headers: { Accept: "application/json" },
            });
            const detailData = await detailRes.json();
            const detailPost = detailData?.data || detailData;

            if (detailPost && typeof detailPost === 'object' && !Array.isArray(detailPost)) {
                item.post = {
                    ...item.post,
                    content: detailPost.content ?? item.post.content,
                    contents: detailPost.contents ?? item.post.contents,
                    body: detailPost.body ?? item.post.body,
                };
            }
        } catch (e) {
            console.error(`${item.board.name} 게시글(#${postNo}) 본문 단건 조회 실패`, e);
        }
    }));

    let itemsHtml = '';
    const perMemberNoticeHtml = {};
    collectedPosts.forEach(({ board, post, date }) => {
        hasAnyPost = true;
        const postNo = post.title_no || post.titleNo || post.no || post.id || post.post_id || post.postId;

        // 제목: 실제 API 필드명은 titleName
        const rawTitle = extractText(post.titleName || post.title);
        let postTitle = rawTitle || '제목 없음';
        if (postTitle.length > 40) postTitle = postTitle.slice(0, 40) + '…';
        postTitle = postTitle.replace(/"/g, '&quot;');

        // 내용: content.textContent(순수 텍스트) 우선, 없으면 content.summary로 대체
        const rawBody = extractText(post.content?.textContent || post.content?.summary || post.contents || post.content || post.body);
        let postBody = rawBody;
        if (postBody.length > 60) postBody = postBody.slice(0, 60) + '…';
        postBody = postBody.replace(/"/g, '&quot;');

        // 닉네임: user_nick 계열 필드 우선, 없으면 스트리머 이름으로 대체
        const nickname = extractText(post.user_nick || post.userNick || post.nick || post.nickname || post.writer?.nick) || board.name;

        // 프로필 이미지: API가 직접 내려주면 그 값을 쓰고, 없으면 SOOP CDN 규칙(LOGO/{앞2글자}/{아이디}/m/{아이디}.webp)으로 유추
        const profileImg = extractText(post.profile_image || post.profileImage || post.thumb || post.thumbnail || post.user_thumb || post.userThumb)
            || `https://stimg.sooplive.com/LOGO/${board.userId.slice(0, 2)}/${board.userId}/m/${board.userId}.webp`;

        const timeLabel = formatRelativeTime(date);

        const rowHtml = `
            <div class="kakao-msg-row" onclick="window.open('https://sooplive.com/station/${board.userId}/post/${postNo}', '_blank')">
                <img src="${profileImg}" alt="${nickname}" loading="lazy" decoding="async" class="kakao-avatar" style="background-color:${board.color};" onerror="this.style.display='none'">
                <div class="kakao-msg-col">
                    <span class="kakao-nick" style="color:#000000;">${nickname}</span>
                    <div class="kakao-bubble-row">
                        <div class="kakao-bubble">
                            <div class="kakao-bubble-title">${postTitle}</div>
                            ${postBody ? `<div class="kakao-bubble-body">${postBody}</div>` : ''}
                        </div>
                        ${timeLabel ? `<span class="kakao-time">${timeLabel}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        itemsHtml += rowHtml;
        // 멤버별 여러 건을 순서대로(오래된 글 → 최신 글) 누적해서 보여준다.
        if (!perMemberNoticeHtml[board.name]) perMemberNoticeHtml[board.name] = [];
        perMemberNoticeHtml[board.name].push(rowHtml);
    });

    // 다음 렌더링(탭 전환, 날짜 이동 등)에서도 다시 쓸 수 있도록 캐시에 저장
    cachedNoticeItemsHtml = itemsHtml;
    hasCachedNotice = hasAnyPost;
    cachedPerMemberNoticeHtml = perMemberNoticeHtml;
    noticeFetchAttempted = true;

    if (mobileNoticeList) mobileNoticeList.innerHTML = itemsHtml;
    if (mobileNoticeBox) mobileNoticeBox.classList.toggle('hidden', !hasAnyPost);

    // 데스크탑 홈탭: 유튜브 영상 박스 아래에 전체 멤버 공지를 한 곳에 모아 표시
    const noticeBox = document.getElementById('homeNoticeBox');
    const noticeList = document.getElementById('homeNoticeList');
    if (noticeList) noticeList.innerHTML = itemsHtml;
    if (noticeBox) noticeBox.classList.toggle('hidden', !hasAnyPost);
    requestAnimationFrame(alignNoticeBoxHeight);

    // 메신저처럼 최신 글(맨 아래)이 보이도록 스크롤을 맨 밑으로 이동
    scrollNoticeListsToBottomRobust();
    
    // 데이터 렌더링 성공 여부 반환
    return hasAnyPost;
}

// 공지 리스트(데스크탑/모바일)를 메신저처럼 맨 아래(최신 글)로 스크롤
function scrollNoticeListsToBottom() {
    const noticeList = document.getElementById('homeNoticeList');
    const mobileNoticeList = document.getElementById('mobileHomeNoticeList');
    if (noticeList) noticeList.scrollTop = noticeList.scrollHeight;
    if (mobileNoticeList) mobileNoticeList.scrollTop = mobileNoticeList.scrollHeight;
}

// 사이트 최초 진입 시에는 폰트/이미지 로딩이 늦게 끝나 리스트 높이가 뒤늦게 늘어나면서
// 한 번의 스크롤만으로는 맨 밑에 정확히 붙지 않는 경우가 있어, 여러 시점에 걸쳐 재시도한다
function scrollNoticeListsToBottomRobust() {
    scrollNoticeListsToBottom();
    requestAnimationFrame(() => {
        scrollNoticeListsToBottom();
        requestAnimationFrame(scrollNoticeListsToBottom);
    });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scrollNoticeListsToBottom).catch(() => {});
    }
    setTimeout(scrollNoticeListsToBottom, 150);
    setTimeout(scrollNoticeListsToBottom, 500);
    setTimeout(scrollNoticeListsToBottom, 1000);
}

// mainContent가 새로 그려질 때(모바일 홈탭 등) 캐시된 공지 데이터를 즉시 반영
function applyCachedNoticeToMobileHome() {
    const mobileNoticeBox = document.getElementById('mobileHomeNoticeBox');
    const mobileNoticeList = document.getElementById('mobileHomeNoticeList');
    if (mobileNoticeList) mobileNoticeList.innerHTML = cachedNoticeItemsHtml;
    if (mobileNoticeBox) mobileNoticeBox.classList.toggle('hidden', !hasCachedNotice);
    scrollNoticeListsToBottomRobust();
}

// 데스크탑 홈탭: 유튜브 영상 박스 아래 공지 박스에 캐시된 전체 공지를 즉시 반영
function applyCachedNoticeToDesktopHome() {
    const noticeBox = document.getElementById('homeNoticeBox');
    const noticeList = document.getElementById('homeNoticeList');
    if (noticeList) noticeList.innerHTML = cachedNoticeItemsHtml;
    if (noticeBox) noticeBox.classList.toggle('hidden', !hasCachedNotice);
    scrollNoticeListsToBottomRobust();
    requestAnimationFrame(alignNoticeBoxHeight);
}

// 데스크탑 홈 화면(주간일정 박스)과 옆의 공지 박스 밑선을 맞춰서 공지 리스트 높이를 자동 조절
function alignNoticeBoxHeight() {
    if (isMobile) return; // 데스크탑(lg) 레이아웃에서만 의미가 있음
    if (currentPage !== '홈') return; // 주간일정 박스는 홈탭에만 존재

    const scheduleBox = document.querySelector('.home-white-box');
    const noticeBox = document.getElementById('homeNoticeBox');
    const noticeList = document.getElementById('homeNoticeList');
    if (!scheduleBox || !noticeBox || !noticeList) return;
    if (noticeBox.classList.contains('hidden')) return;

    const scheduleRect = scheduleBox.getBoundingClientRect();
    const noticeListRect = noticeList.getBoundingClientRect();
    // 공지 박스 자체의 아래쪽 padding(p-4)만큼은 리스트 밑에 추가로 붙는 여백이라
    // 밑선을 맞출 때 이 여백을 미리 빼줘야 박스 전체의 밑선이 주간일정 박스와 정확히 일치함
    const noticeBoxPaddingBottom = parseFloat(getComputedStyle(noticeBox).paddingBottom) || 0;

    // 공지 리스트가 시작되는 위치부터 주간일정 박스 밑선까지 남는 높이를 계산해서 그대로 적용
    // max-height만 쓰면 공지 개수가 적을 때 리스트가 짧아져서 밑선이 안 맞으므로,
    // height를 직접 고정해 내용이 적어도(빈 공간은 스크롤 영역으로) 항상 밑선이 맞도록 함
    const availableHeight = Math.round((scheduleRect.bottom - noticeListRect.top - noticeBoxPaddingBottom - 4) * 0.75);
    if (availableHeight > 80) {
        noticeList.style.height = `${availableHeight}px`;
        noticeList.style.maxHeight = `${availableHeight}px`;
    }
}
window.addEventListener('resize', () => {
    requestAnimationFrame(alignNoticeBoxHeight);
});

async function renderHomeYoutubeBox() {
    const box = document.getElementById('homeYoutubeBox');
    const embed = document.getElementById('homeYoutubeEmbed');
    if (!box || !embed) return;

    let hasVideo = false;
    const videoId = getYoutubeVideoId(homeYoutubeUrl);

    // 1. 유튜브 링크면 영상 임베드(16:9 고정), 이미지 링크면 이미지 비율 그대로(폭 고정, 높이 자동), 둘 다 아니면 영역 숨김
    if (videoId) {
        embed.classList.add('aspect-video');
        embed.classList.remove('h-auto');
        embed.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        embed.style.display = 'block'; 
        hasVideo = true;
    } else if (homeYoutubeUrl && isImageUrl(homeYoutubeUrl)) {
        // 폭은 고정, 높이는 이미지 원본 비율대로 자동 조절 (잘리지 않음) — 대신 아래 공지 박스가 늘어난 만큼 줄어들도록 로드 후 높이 재계산
        embed.classList.remove('aspect-video');
        embed.classList.add('h-auto');
        embed.innerHTML = `<img src="${homeYoutubeUrl}" alt="홈 이미지" class="w-full h-auto block" onload="requestAnimationFrame(alignNoticeBoxHeight)" onerror="this.parentElement.style.display='none'; this.parentElement.innerHTML=''; requestAnimationFrame(alignNoticeBoxHeight);">`;
        embed.style.display = 'block';
        hasVideo = true;
    } else {
        embed.classList.remove('h-auto');
        embed.innerHTML = '';
        embed.style.display = 'none'; 
    }
    
    // 2. 공지사항 데이터를 불러오고, 표시할 글이 있는지 확인
    const hasNotice = await fetchAndRenderAllNotices();

    // 2-1. UP 해줘! 버튼을 유튜브 영상 박스 위에 표시(등록된 UP 링크가 있을 때만)
    const hasUpLinks = await updateHomeUpButtonVisibility();

    // 2-2. 디데이 박스를 UP 해줘! 버튼 위에 표시(D-30 이내인 기념일이 있을 때만)
    const hasDday = renderHomeDdayBox();

    // 3. 영상이 등록되어 있거나, 최신 공지글이 하나라도 있거나, UP 링크나 디데이가 있으면 전체 박스를 보여줌
    homeBoxShouldShow = hasVideo || hasNotice || hasUpLinks || hasDday;
    applyHomeYoutubeBoxVisibility();
}

// 홈탭(+데스크탑)일 때만 유튜브/이미지·공지 박스를 보여줌
function applyHomeYoutubeBoxVisibility() {
    const box = document.getElementById('homeYoutubeBox');
    if (!box) return;
    if (currentPage === '홈' && !isMobile) {
        const wasHidden = box.style.display === 'none';
        box.style.display = homeBoxShouldShow ? '' : 'none';
        // 박스가 숨김→표시로 바뀌는 순간에는 그 전에 시도된 스크롤이 무시됐을 수 있어 다시 시도
        if (homeBoxShouldShow && wasHidden) scrollNoticeListsToBottomRobust();
    } else {
        box.style.display = 'none';
    }
}

function renderHomeManagePanel() {
    const input = document.getElementById('homeYoutubeUrlInput');
    if (input) input.value = homeYoutubeUrl || '';

    const info = document.getElementById('homeYoutubeCurrentInfo');
    if (!info) return;
    info.innerHTML = homeYoutubeUrl
        ? `현재 등록된 링크: <a href="${homeYoutubeUrl}" target="_blank" class="text-blue-500 underline">${homeYoutubeUrl}</a>`
        : '현재 등록된 유튜브 링크가 없습니다.';
}

async function saveHomeYoutubeLink() {
    const input = document.getElementById('homeYoutubeUrlInput');
    const url = input ? input.value.trim() : '';
    if (!url) return alert('유튜브 링크 또는 이미지 링크를 입력하세요.');
    if (!getYoutubeVideoId(url) && !isImageUrl(url)) return alert('유효한 유튜브 링크 또는 이미지 링크가 아닙니다. 다시 확인해주세요.');

    try {
        await setDoc(doc(db, 'meta', 'homeSettings'), { youtubeUrl: url }, { merge: true });
        homeYoutubeUrl = url;
        alert('링크가 저장되었습니다.');
        renderHomeManagePanel();
        renderHomeYoutubeBox();
    } catch (e) { console.error(e); alert('저장 실패: ' + e.message); }
}

async function deleteHomeYoutubeLink() {
    if (!confirm('등록된 링크를 삭제하시겠습니까?')) return;
    try {
        await setDoc(doc(db, 'meta', 'homeSettings'), { youtubeUrl: '' }, { merge: true });
        homeYoutubeUrl = '';
        const input = document.getElementById('homeYoutubeUrlInput');
        if (input) input.value = '';
        renderHomeManagePanel();
        renderHomeYoutubeBox();
    } catch (e) { console.error(e); alert('삭제 실패: ' + e.message); }
}

async function loadHomeSettingsFromFirebase() {
    try {
        const snap = await getDoc(doc(db, 'meta', 'homeSettings'));
        const data = snap.exists() ? snap.data() : {};
        homeYoutubeUrl = data.youtubeUrl || '';
        ddayBgImageUrl = data.ddayBgImage || '';
    } catch (e) { console.error('홈 설정 로드 실패:', e); homeYoutubeUrl = ''; ddayBgImageUrl = ''; }
    renderHomeYoutubeBox();
    renderHomeDdayBox();
}

async function loadLinksFromFirebase() {
    try {
        const todayYYYYMMDD = getTodayYYYYMMDD();
        upLinksList = [];
        
        const soopSnap = await getDocs(collection(db, 'soop_posts'));
        for (const d of soopSnap.docs) {
            const data = d.data();
            if (data.deadline && data.deadline < todayYYYYMMDD) {
                deleteDoc(doc(db, 'soop_posts', d.id)).catch(e => console.error('마감된 UP 링크 삭제 실패(soop_posts):', e));
                continue;
            }
            
            upLinksList.push({ 
                id: d.id, 
                source: 'soop',
                member: data.member,
                title: data.title,
                url: data.link,
                deadline: data.deadline,
                timestamp: data.updated_at && data.updated_at.toMillis ? data.updated_at.toMillis() : Date.now()
            });
        }

        const upSnap = await getDocs(collection(db, 'uplinks'));
        for (const d of upSnap.docs) {
            const data = d.data();
            if (data.deadline && data.deadline < todayYYYYMMDD) {
                deleteDoc(doc(db, 'uplinks', d.id)).catch(e => console.error('마감된 UP 링크 삭제 실패(uplinks):', e));
                continue;
            }
            upLinksList.push({ id: d.id, source: 'uplinks', ...data });
        }

        // 메뉴 링크는 더 이상 Firebase에서 불러오거나 관리자 화면에서 추가/수정하지 않고,
        // 코드에 하드코딩된 defaultMemberLinks 값을 그대로 사용한다.
        dynamicLinks = JSON.parse(JSON.stringify(defaultMemberLinks));
        renderHeaderTabs();
    } catch(e) { console.error("링크 로드 실패:", e); }
}

async function checkAndShowPopup(today) {
    const closedUntil = localStorage.getItem('upPopupClosedUntil');
    const activeTopics = rollingTopics.filter(t => t.date >= today);
    const visibleUpLinks = getVisibleUpLinks();
    
    const hasValidImage = popupImagesList.some(img => 
        (!img.startDate || img.startDate <= today) && 
        (!img.deadline || img.deadline >= today)
    );
    
    if ((!closedUntil || closedUntil < today) && (visibleUpLinks.length > 0 || activeTopics.length > 0 || hasValidImage)) {
        if (visibleUpLinks.length > 0) await ensureMemberLoginImgMap();
        await showUpPopup(today);
    }
}

async function showUpPopup(today) {
    const list = document.getElementById('upPopupList');
    if(!list) return;

    const visibleUpLinks = getVisibleUpLinks();
    const hasTextContent = (visibleUpLinks.length > 0 || rollingTopics.filter(t => t.date >= today).length > 0);

    let popupImgHtml = '';
    const activeImg = popupImagesList.find(img => (!img.startDate || img.startDate <= today) && (!img.deadline || img.deadline >= today));
    const hasImg = !!(activeImg && activeImg.url);
    
    const leftWidthClass = (hasImg && hasTextContent) ? 'md:w-1/2' : 'w-full';

    const box = document.getElementById('upPopupBox');
    if (box) {
        if (hasImg && hasTextContent) {
            box.classList.remove('max-w-[560px]');
            box.classList.add('max-w-[1000px]');
        } else {
            box.classList.remove('max-w-[1000px]');
            box.classList.add('max-w-[560px]');
        }
    }

    if (activeImg && activeImg.url) {
        popupImgHtml = `
            <div class="${leftWidthClass} shrink-0 flex items-center justify-center">
                <img src="${activeImg.url}" alt="공지 이미지" loading="lazy" decoding="async" class="w-full h-auto max-h-[55vh] md:max-h-[65vh] object-contain rounded-2xl shadow-sm border border-gray-100">
            </div>
        `;
    }

    const sortedUpLinks = [...visibleUpLinks].sort(sortUpLinksComparator);

    // 심플하고 세련된 UP 해줘! 섹션 (앞부분 아이콘 제거)
    const upSectionHtml = visibleUpLinks.length > 0 ? `
        <div class="flex flex-col w-full mb-4">
            <div class="text-[17px] font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center shrink-0">
                UP 해줘!
            </div>
            <div id="upPopupUpCards" class="flex flex-col gap-3">
                <div class="text-center text-gray-400 font-bold py-8 text-[13px] bg-gray-50 rounded-2xl">불러오는 중...⏳</div>
            </div>
        </div>
    ` : '';

    const activeTopics = rollingTopics.filter(t => t.date >= today);
    let rollingHtml = activeTopics.map(topic => {
        return `
        <div class="bg-white border border-gray-100 rounded-2xl p-5 mb-3 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all flex flex-col gap-2 shrink-0 group" onclick="openRollingTopicFromPopup('${topic.id}')">
            <div class="font-bold text-[16px] text-gray-800 break-words leading-snug group-hover:text-purple-600 transition-colors">${escapeHtml(topic.title)}</div>
            <div class="flex justify-between items-center mt-2">
                <span class="text-[11px] font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">진행중</span>
                <span class="text-[12px] font-bold text-gray-400">마감: ${topic.date}</span>
            </div>
        </div>
        `;
    }).join('');

    // 심플하고 세련된 롤링페이퍼 섹션 (앞부분 아이콘 제거)
    const rollingSectionHtml = activeTopics.length > 0 ? `
        <div class="flex flex-col w-full">
            <div class="text-[17px] font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center shrink-0 mt-2">
                롤링페이퍼
            </div>
            <div class="flex flex-col">
                ${rollingHtml}
            </div>
        </div>
    ` : '';

    let rightColumnHtml = '';
    if (hasTextContent) {
        rightColumnHtml = `
            <div class="flex-1 flex flex-col overflow-y-auto max-h-[65vh] w-full md:w-1/2 pr-2 modal-scroll">
                <div class="flex flex-col w-full">
                    ${upSectionHtml}${rollingSectionHtml}
                </div>
            </div>
        `;
    }

    list.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6 w-full">
            ${popupImgHtml}${rightColumnHtml}
        </div>
    `;
    document.getElementById('upPopupOverlay').classList.replace('hidden', 'flex');

    if (visibleUpLinks.length > 0) {
        const cardsContainer = document.getElementById('upPopupUpCards');
        // 카드가 다 준비될 때까지 기다리지 않고, 준비되는 대로 순서대로 바로 표시
        renderUpLinkCardsProgressive(cardsContainer, sortedUpLinks, () => {
            const overlay = document.getElementById('upPopupOverlay');
            return !!overlay && !overlay.classList.contains('hidden');
        });
    }
}

function closeUpPopup(dismissMode = null) {
    if (dismissMode === 'today') {
        localStorage.setItem('upPopupClosedUntil', getTodayYYYYMMDD());
    } else if (dismissMode === 'week') {
        localStorage.setItem('upPopupClosedUntil', getDateAfterDaysYYYYMMDD(7));
    }
    document.getElementById('upPopupOverlay').classList.replace('flex', 'hidden');
}

async function openRollingTopicFromPopup(id) {
    closeUpPopup(true); 
    if (currentPage !== '롤링페이퍼') changeTab('롤링페이퍼');
    currentRollingTopic = rollingTopics.find(t => t.id === id);
    render();
    await ensureRollingEntriesLoaded(id);
    if (currentRollingTopic && currentRollingTopic.id === id) render();
}

function renderHeaderTabs() {
    const desktopContainer = document.getElementById('headerNavTabs');
    const mobileNav = document.getElementById('mobileBottomNav');
    
    const tabs = ['달타', '다룽', '최또', '카나시', '시그널', '추가기능'];
    const colors = { '달타': '#FBC02D', '다룽': '#1E88E5', '최또': '#ff7fd9', '카나시': '#F57C00', '시그널': '#FF5252', '추가기능': '#8B5CF6', '롤링페이퍼': '#8B5CF6', '업보정리': '#8B5CF6' };

    if (desktopContainer) {
        let html = `
            <div class="relative cursor-pointer hover:scale-105 mr-1" onclick="openUpdateModal()">
                <img src="./images/logo.webp" alt="SIGNAL Logo" style="height: 36px; object-fit: contain; transition: transform 0.2s;">
                <span id="desktopLogoNewBadge" class="hidden absolute -top-1 -right-2.5 bg-[#FF5252] text-white text-[9px] font-black px-1.5 py-[1px] rounded-full shadow-md font-paperozi tracking-wider z-10">NEW</span>
            </div>
            <button class="font-paperozi px-5 py-2.5 bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[#FF5252] hover:text-[#FF5252] transition-all duration-200 flex items-center justify-center" onclick="executeDesktopTabChange('홈')">
                <i class="fi fi-rr-home text-2xl"></i>
            </button>
        `;
        
        tabs.forEach(tab => {
            const hoverColor = colors[tab];
            let dropdownHtml = '';
            let mainLinkHtml = '';
            let btnContent = tab;
            let clickAction = `onclick="executeDesktopTabChange('${tab}')"`;
            
            if (tab === '추가기능') {
                btnContent = `<i class="fi fi-rr-menu-dots text-2xl mt-1"></i>`;
                clickAction = ''; 
                mainLinkHtml = `
                    <a href="#" onclick="executeDesktopTabChange('클립'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">클립 모아보기</a>
                    <a href="#" onclick="executeDesktopTabChange('롤링페이퍼'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">롤링페이퍼</a>
                    <a href="#" onclick="executeDesktopTabChange('업보정리'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">업보정리</a>
                    <a href="#" onclick="executeDesktopTabChange('사다리타기'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">사다리타기</a>
                    <a href="#" onclick="executeDesktopTabChange('파트분배기'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center">파트분배기</a>
                `;
            } else if (tab === '시그널') {
                clickAction = `onclick="executeDesktopTabChange('시그널')"`;
            } else {
                const links = dynamicLinks[tab] || [];
                mainLinkHtml = `<a href="#" onclick="executeDesktopTabChange('${tab}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors border-b border-gray-100 text-center">일정표</a>`;
                const songbookHtml = `<a href="#" onclick="executeDesktopTabChange('노래책_${tab}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">노래책</a>`;
                dropdownHtml = songbookHtml + links.map(link => `
                    <a href="#" onclick="openSmartLink('${link.url}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">${link.title}</a>
                `).join('');
            }
            
            if (tab === '시그널') {
                html += `
                    <div class="relative flex items-center">
                        <button class="font-paperozi px-4 py-2.5 text-lg bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[${hoverColor}] hover:text-[${hoverColor}] transition-all duration-200 flex items-center justify-center" ${clickAction}>${btnContent}</button>
                    </div>
                `;
            } else {
                html += `
                    <div class="relative group flex items-center">
                        <button class="font-paperozi px-4 py-2.5 text-lg bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[${hoverColor}] hover:text-[${hoverColor}] transition-all duration-200 flex items-center justify-center" ${clickAction}>${btnContent}</button>
                        <div class="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-36 hidden group-hover:block z-[2000]">
                            <div class="bg-white flex flex-col shadow-xl rounded-2xl border border-[#ECEDFA] overflow-hidden py-1" style="box-shadow: 0 20px 45px -20px rgba(70,60,160,0.22);">
                                ${mainLinkHtml}${dropdownHtml}
                            </div>
                        </div>
                    </div>
                `;
            }
       });
        desktopContainer.innerHTML = html;
        if (typeof checkUpdateBadge === 'function') checkUpdateBadge();
    }

    if (mobileNav) {
        let mHtml = '';
        ['홈', ...tabs].forEach(tab => {
            const isActive = (currentPage === tab) || (currentPage === '롤링페이퍼' && tab === '추가기능') || (currentPage === '업보정리' && tab === '추가기능') || (currentPage === '업보선택' && tab === '추가기능') || (currentPage === '사다리타기' && tab === '추가기능') || (currentPage === '파트분배기' && tab === '추가기능') || (currentPage === '노래책' && songbookMember === tab);
            const activeColor = tab === '홈' ? '#FF5252' : colors[tab];
            let contentHtml = '';
            
            if (tab === '홈') {
                contentHtml = `<i class="fi fi-rr-home text-[24px] transition-all ${isActive ? 'scale-110' : ''}" style="color: ${isActive ? activeColor : '#9CA3AF'}"></i>`;
            } else if (tab === '추가기능') {
                contentHtml = `<i class="fi fi-rr-menu-dots text-[24px] mt-1 transition-all ${isActive ? 'scale-110' : ''}" style="color: ${isActive ? activeColor : '#9CA3AF'}"></i>`;
            } else {
                contentHtml = `<span class="text-[16px] font-bold font-paperozi transition-all ${isActive ? 'scale-110' : ''}" style="color: ${isActive ? activeColor : '#9CA3AF'}">${tab}</span>`;
            }
            
            mHtml += `
                <button class="flex flex-col items-center justify-center w-full h-full gap-1 transition-all" onclick="openMobileTabMenu('${tab}')">
                    ${contentHtml}
                </button>
            `;
        });
        mobileNav.innerHTML = mHtml;
    }
}

function openMobileTabMenu(tab) {
    if (tab === '홈') { executeDesktopTabChange('홈'); return; }
    if (tab === '시그널') { executeMobileTabChange('시그널'); return; }
    const overlay = document.getElementById('mobileTabMenuOverlay');
    const container = document.getElementById('mobileTabMenuContainer');
    const color = themeColors[tab === '추가기능' ? '롤링페이퍼' : tab];

    // 링크 타이틀/URL에 맞는 아이콘을 대략적으로 매칭 (SOOP/유튜브/카페 등)
    const iconForLink = (title, url) => {
        const t = (title || '').toLowerCase();
        const u = (url || '').toLowerCase();
        if (t.includes('soop') || t.includes('afreeca') || t.includes('숲')) return 'fi-rr-video-camera';
        if (t.includes('유튜브') || t.includes('youtube') || u.includes('youtube')) return 'fi-brands-youtube';
        if (t.includes('트위터') || t.includes('twitter') || u.includes('twitter') || u.includes('x.com')) return 'fi-brands-twitter-alt';
        if (t.includes('인스타') || u.includes('instagram')) return 'fi-brands-instagram';
        if (u.includes('cafe.naver.com')) return 'fi-rr-comment-heart';
        return 'fi-rr-link';
    };

    let html = `
        <div class="flex flex-col gap-3 relative">
            <div class="text-center font-bold text-[18px] font-paperozi" style="color: ${color}">${tab === '추가기능' ? '추가기능' : tab + ' 메뉴'}</div>
            <div class="grid grid-cols-3 gap-3 justify-items-center">
    `;

    // 앱 아이콘처럼 1:1 비율 정사각 버튼(.app-icon-btn)을 그리드로 배치
    const iconBtn = (onclick, icon, label, btnColor) => `
        <button onclick="${onclick}" class="app-icon-btn" style="color: ${btnColor};">
            <i class="fi ${icon}"></i>
            <span>${label}</span>
        </button>`;

    if (tab === '추가기능') {
        html += iconBtn("executeMobileTabChange('클립')", 'fi-rr-video-camera-alt', '클립', color);
        html += iconBtn("executeMobileTabChange('롤링페이퍼')", 'fi-rr-envelope', '롤링페이퍼', color);
        html += iconBtn("executeMobileTabChange('업보정리')", 'fi-rr-box-open', '업보정리', color);
        html += iconBtn("executeMobileTabChange('사다리타기')", 'fi-rr-ladder', '사다리타기', color);
        html += iconBtn("executeMobileTabChange('파트분배기')", 'fi-rr-microphone-alt', '파트분배기', color);
    } else {
        html += iconBtn(`executeMobileTabChange('${tab}')`, 'fi-rr-calendar', '일정표', color);
        html += iconBtn(`executeMobileTabChange('노래책_${tab}')`, 'fi-rr-music-alt', '노래책', color);
        const links = dynamicLinks[tab] || [];
        links.forEach(l => {
            const isCafe = (l.url || '').toLowerCase().includes('cafe.naver.com');
            const label = isCafe ? '카페' : l.title;
            html += iconBtn(`openSmartLink('${l.url}')`, iconForLink(l.title, l.url), label, color);
        });
    }
    html += `</div></div>`;
    container.innerHTML = html;
    
    overlay.classList.remove('hidden'); overlay.classList.add('block');
    requestAnimationFrame(() => {
        container.classList.remove('opacity-0', 'translate-y-4');
        container.classList.add('opacity-100', 'translate-y-0');
    });
}

function closeMobileTabMenu() {
    const overlay = document.getElementById('mobileTabMenuOverlay');
    const container = document.getElementById('mobileTabMenuContainer');
    if(!container) return;
    container.classList.remove('opacity-100', 'translate-y-0');
    container.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => { overlay.classList.add('hidden'); overlay.classList.remove('block'); }, 200);
}

/* =========================================================
   추가기능 - 사다리타기
   ========================================================= */
let ladderCount = 4;
let ladderNames = [];
let ladderResults = [];
let ladderRungsData = [];
let ladderRowCount = 9;
let ladderUsedStart = new Set();
let ladderUsedEnd = new Set();
let ladderRungsRevealed = false;

const LADDER_HEADER_H = 110;
const LADDER_TOP_Y = LADDER_HEADER_H + 21;
const LADDER_ROW_HEIGHT = 44;
const LADDER_COL_SPACING = 110;
const LADDER_COLW = 96;
const LADDER_BOX_W = 88;
const LADDER_BOX_H = 44;
const LADDER_AVATAR_BG = ['#F1E7FB', '#E3EEFB', '#FDE9D9', '#E4F1E4', '#FBE7EE', '#FFF3D6', '#E7F5F0', '#E7F0FB'];
const LADDER_AVATAR_FG = ['#8e5fc9', '#4d84c9', '#e08a3c', '#4c9a63', '#c95f8b', '#c99a2f', '#3f9e88', '#4f75c9'];

function ladderEscapeXml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 사다리타기에서 사용할 전체 멤버 목록: 기본 멤버(members) + 멤버관리(Firebase)에서 등록한 멤버(customMembers)
function ladderAllMembersList() {
    return [
        ...members.map(m => ({ name: m.name, img: m.img })),
        ...customMembers.map(m => ({ name: m.nickname, img: m.imageUrl }))
    ];
}

// 입력된 이름이 멤버 DB(기본 멤버 + 멤버관리 등록 멤버)에 있는 이름과 일치하면 해당 멤버 정보를 반환
function ladderMatchedMember(name) {
    if (!name) return null;
    const trimmed = String(name).trim();
    if (!trimmed) return null;
    return ladderAllMembersList().find(m => m.name === trimmed) || null;
}

// 사다리타기 아바타(원형) 안쪽 내용을 멤버 매칭 여부에 따라 채워 넣음
function ladderAvatarInnerHTML(i) {
    const matched = ladderMatchedMember(ladderNames[i]);
    if (matched && matched.img) {
        return `<img src="${ladderEscapeXml(matched.img)}" alt="${ladderEscapeXml(matched.name)}" class="ladder-avatar-img" loading="lazy" decoding="async" onerror="this.style.display='none'">`;
    }
    return ladderNames[i] ? ladderEscapeXml(ladderNames[i][0]) : (i + 1);
}

// 이름 입력창에 입력이 있을 때마다 아바타를 즉시(리렌더 없이) 갱신
function updateLadderAvatarDisplay(i) {
    const avatarEl = document.getElementById(`ladderAvatar_${i}`);
    if (!avatarEl) return;
    const matched = ladderMatchedMember(ladderNames[i]);
    if (matched && matched.img) {
        avatarEl.classList.add('has-photo');
        avatarEl.style.background = 'transparent';
        avatarEl.style.color = '';
        avatarEl.innerHTML = ladderAvatarInnerHTML(i);
    } else {
        avatarEl.classList.remove('has-photo');
        const bg = LADDER_AVATAR_BG[i % LADDER_AVATAR_BG.length];
        const fg = LADDER_AVATAR_FG[i % LADDER_AVATAR_FG.length];
        avatarEl.style.background = bg;
        avatarEl.style.color = fg;
        avatarEl.innerHTML = ladderAvatarInnerHTML(i);
    }
}

function renderLadderPage() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    if (!ladderNames.length) resizeLadderArrays();
    if (!ladderRungsData.length) ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);

    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-[1795px] max-w-full lg:mx-auto pb-6';

    const html = `<div class="big-white-box relative theme-rolling" style="min-height: 900px; padding: ${isMobile ? '20px' : '40px'}; width: 100%; display: block; box-sizing: border-box;">
        <div class="mb-6 flex items-center gap-2">
            <i class="fi fi-rr-ladder text-[24px]" style="color:#8B5CF6;"></i>
            <h2 class="text-[24px] lg:text-3xl font-bold text-[#5D4037] font-paperozi">사다리타기</h2>
        </div>
        <div id="ladderGameBoard" class="ladder-board">
            <div class="ladder-board-top">
                <div class="ladder-count-nav" title="참여 인원">
                    <button type="button" onclick="changeLadderCount(-1)" aria-label="인원 줄이기">‹</button>
                    <span class="ladder-count-text">참가자 <b id="ladderCountDisplay">${ladderCount}</b>명</span>
                    <button type="button" onclick="changeLadderCount(1)" aria-label="인원 늘리기">›</button>
                </div>
                <div class="ladder-actions">
                    <button type="button" id="ladderStartBtn" class="ladder-start-btn">▷ START</button>
                    <button type="button" class="ladder-secondary-btn ladder-shuffle-btn ladder-icon-btn" onclick="shuffleLadderRungs()" aria-label="셔플" title="셔플">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                    </button>
                    <button type="button" class="ladder-secondary-btn ladder-reset-btn ladder-icon-btn" onclick="confirmResetLadderGame()" aria-label="리셋" title="리셋">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"></path><polyline points="3 4 3 9 8 9"></polyline></svg>
                    </button>
                </div>
            </div>
            <div id="ladderSvgWrap" class="ladder-svg-wrap"></div>
        </div>
        <div id="ladderResultText" class="ladder-result-text"></div>
    </div>`;

    content.innerHTML = html;
    renderLadderSVG();
    updateLadderStartBtnState();
}

function updateLadderStartBtnState() {
    const btn = document.getElementById('ladderStartBtn');
    if (!btn) return;
    if (ladderRungsRevealed) {
        btn.textContent = '전체 결과';
        btn.onclick = () => playAllLadderPaths();
    } else {
        btn.textContent = '▷ START';
        btn.onclick = () => startLadderGame();
    }
}

function ladderX(i) { return 60 + i * LADDER_COL_SPACING; }

function resizeLadderArrays() {
    const newNames = [], newResults = [];
    for (let i = 0; i < ladderCount; i++) {
        newNames.push(ladderNames[i] || '');
        newResults.push(ladderResults[i] || '');
    }
    ladderNames = newNames;
    ladderResults = newResults;
}

window.updateLadderName = function(i, val) { ladderNames[i] = val; updateLadderAvatarDisplay(i); };
window.updateLadderResult = function(i, val) { ladderResults[i] = val; };

window.changeLadderCount = function(delta) {
    const next = ladderCount + delta;
    if (next < 2 || next > 10) return;
    ladderCount = next;
    resizeLadderArrays();
    ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);
    ladderUsedStart = new Set();
    ladderUsedEnd = new Set();
    ladderRungsRevealed = false;
    const resultTextEl = document.getElementById('ladderResultText');
    if (resultTextEl) resultTextEl.innerHTML = '';
    renderLadderSVG();
    updateLadderStartBtnState();
    const countDisplay = document.getElementById('ladderCountDisplay');
    if (countDisplay) countDisplay.textContent = ladderCount;
};

function generateLadderRungs(n, rowCount) {
    const rungs = [];
    for (let r = 0; r < rowCount; r++) {
        const row = new Array(n - 1).fill(false);
        let i = 0;
        while (i < n - 1) {
            if (Math.random() < 0.45) { row[i] = true; i += 2; }
            else { i += 1; }
        }
        rungs.push(row);
    }
    return rungs;
}

function ladderBottomY() { return LADDER_TOP_Y + ladderRowCount * LADDER_ROW_HEIGHT; }

function renderLadderSVG() {
    const n = ladderCount;
    const svgWrap = document.getElementById('ladderSvgWrap');
    if (!svgWrap) return;

    const width = LADDER_COL_SPACING * (n - 1) + 120;
    const bottom = ladderBottomY();
    const height = bottom + 60;

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" style="max-width:${width}px;" xmlns="http://www.w3.org/2000/svg">`;

    for (let i = 0; i < n; i++) {
        const x = ladderX(i);
        svg += `<line class="ladder-vline" x1="${x}" y1="${LADDER_TOP_Y}" x2="${x}" y2="${bottom}"></line>`;
    }

    if (ladderRungsRevealed) {
        for (let r = 0; r < ladderRowCount; r++) {
            const y = LADDER_TOP_Y + (r + 0.5) * LADDER_ROW_HEIGHT;
            ladderRungsData[r].forEach((has, i) => {
                if (has) svg += `<line class="ladder-rung" x1="${ladderX(i)}" y1="${y}" x2="${ladderX(i + 1)}" y2="${y}"></line>`;
            });
        }
    }

    svg += `<g id="ladderPathsLayer"></g>`;

    for (let i = 0; i < n; i++) {
        const x = ladderX(i);
        const bg = LADDER_AVATAR_BG[i % LADDER_AVATAR_BG.length];
        const fg = LADDER_AVATAR_FG[i % LADDER_AVATAR_FG.length];
        const matched = ladderMatchedMember(ladderNames[i]);
        const avatarStyle = matched && matched.img ? 'background:transparent;' : `background:${bg}; color:${fg};`;
        const avatarCls = matched && matched.img ? ' has-photo' : '';
        const isUsed = ladderUsedStart.has(i);
        const usedCls = isUsed ? ' used' : '';
        const clickable = ladderRungsRevealed && !isUsed;
        const clickCls = clickable ? ' clickable' : '';
        const headerClickAttr = clickable ? ` onclick="playLadderFromStart(${i})"` : '';

        svg += `<foreignObject x="${x - LADDER_COLW / 2}" y="0" width="${LADDER_COLW}" height="${LADDER_HEADER_H}">
            <div xmlns="http://www.w3.org/1999/xhtml" class="ladder-col-header${usedCls}${clickCls}" id="ladderColHeader_${i}"${headerClickAttr}>
                <div class="ladder-avatar${avatarCls}" id="ladderAvatar_${i}" style="${avatarStyle}">${ladderAvatarInnerHTML(i)}</div>
                <input class="ladder-name-pill" id="ladderNameInput_${i}" value="${ladderEscapeXml(ladderNames[i] || '')}" placeholder="이름${i + 1}" maxlength="8" oninput="updateLadderName(${i}, this.value)" ${isUsed ? 'disabled' : ''} ${clickable ? 'readonly style="pointer-events:none;"' : ''}>
            </div>
        </foreignObject>`;
    }

    for (let i = 0; i < n; i++) {
        const x = ladderX(i);
        const y = bottom + 12;
        if (!ladderRungsRevealed) {
            svg += `<g class="ladder-result-box" id="ladderBottomBox_${i}">
                <rect x="${x - LADDER_BOX_W / 2}" y="${y}" width="${LADDER_BOX_W}" height="${LADDER_BOX_H}" rx="12"></rect>
            </g>
            <foreignObject x="${x - LADDER_BOX_W / 2}" y="${y + 3}" width="${LADDER_BOX_W}" height="${LADDER_BOX_H - 6}">
                <input xmlns="http://www.w3.org/1999/xhtml" type="text" class="ladder-result-input" id="ladderResultInput_${i}" value="${ladderEscapeXml(ladderResults[i] || '')}" placeholder="결과${i + 1}" maxlength="8" oninput="updateLadderResult(${i}, this.value)">
            </foreignObject>`;
        } else {
            const isEndUsed = ladderUsedEnd.has(i);
            const resultLabel = ladderResults[i] ? ladderEscapeXml(ladderResults[i]) : `결과${i + 1}`;
            const labelClickAttr = isEndUsed ? '' : `onclick="playLadderFromResult(${i})"`;
            const labelUsedCls = isEndUsed ? ' is-used' : '';
            const hitCls = isEndUsed ? ' hit' : '';
            svg += `<g class="ladder-result-box${hitCls}" id="ladderBottomBox_${i}">
                <rect x="${x - LADDER_BOX_W / 2}" y="${y}" width="${LADDER_BOX_W}" height="${LADDER_BOX_H}" rx="12"></rect>
            </g>
            <foreignObject x="${x - LADDER_BOX_W / 2}" y="${y + 3}" width="${LADDER_BOX_W}" height="${LADDER_BOX_H - 6}">
                <div xmlns="http://www.w3.org/1999/xhtml" class="ladder-result-label${labelUsedCls}" id="ladderResultLabel_${i}" ${labelClickAttr}>${resultLabel}</div>
            </foreignObject>`;
        }
    }

    svg += `</svg>`;
    svgWrap.innerHTML = svg;
}

function ladderAnimatePath(d) {
    const pathsLayer = document.getElementById('ladderPathsLayer');
    if (!pathsLayer) return;
    const ns = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'ladder-path');
    pathsLayer.appendChild(path);
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 0.9s ease';
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
}

function markLadderUsed(start, end) {
    const colHeader = document.getElementById(`ladderColHeader_${start}`);
    if (colHeader) { colHeader.classList.add('used'); colHeader.style.pointerEvents = 'none'; }
    const nameInput = document.getElementById(`ladderNameInput_${start}`);
    if (nameInput) nameInput.disabled = true;
    const bottomBox = document.getElementById(`ladderBottomBox_${end}`);
    if (bottomBox) bottomBox.classList.add('hit');
    const resultLabel = document.getElementById(`ladderResultLabel_${end}`);
    if (resultLabel) { resultLabel.classList.add('is-used'); resultLabel.removeAttribute('onclick'); }
    ladderUsedStart.add(start);
    ladderUsedEnd.add(end);
}

function addLadderResultSummaryItem(i, end) {
    const resultTextEl = document.getElementById('ladderResultText');
    if (!resultTextEl) return;
    const bg = LADDER_AVATAR_BG[i % LADDER_AVATAR_BG.length];
    const fg = LADDER_AVATAR_FG[i % LADDER_AVATAR_FG.length];
    const matched = ladderMatchedMember(ladderNames[i]);
    const name = ladderNames[i] || `참가자${i + 1}`;
    const result = ladderResults[end] || `결과${end + 1}`;
    const avatarInner = matched && matched.img
        ? `<img src="${ladderEscapeXml(matched.img)}" alt="${ladderEscapeXml(matched.name)}" class="ladder-result-summary-avatar-img" loading="lazy" decoding="async" onerror="this.style.display='none'">`
        : (ladderNames[i] ? ladderEscapeXml(ladderNames[i][0]) : (i + 1));
    const avatarStyle = matched && matched.img ? 'background:transparent;' : `background:${bg}; color:${fg};`;

    const item = document.createElement('div');
    item.className = 'ladder-result-summary-item';
    item.innerHTML = `
        <span class="ladder-result-summary-avatar" style="display:flex;align-items:center;justify-content:center;font-weight:900;${avatarStyle}">${avatarInner}</span>
        <span class="ladder-result-summary-name">${ladderEscapeXml(name)}</span>
        <span class="ladder-result-summary-arrow">→</span>
        <span class="ladder-result-summary-result">${ladderEscapeXml(result)}</span>
    `;
    resultTextEl.appendChild(item);
}

window.playLadderFromResult = function(end) {
    if (ladderUsedEnd.has(end)) return;
    const n = ladderCount;
    let curCol = end;
    let d = `M ${ladderX(curCol)} ${ladderBottomY()}`;
    for (let r = ladderRowCount - 1; r >= 0; r--) {
        const midY = LADDER_TOP_Y + (r + 0.5) * LADDER_ROW_HEIGHT;
        const rowTopY = LADDER_TOP_Y + r * LADDER_ROW_HEIGHT;
        d += ` L ${ladderX(curCol)} ${midY}`;
        let newCol = curCol;
        if (curCol > 0 && ladderRungsData[r][curCol - 1]) newCol = curCol - 1;
        else if (curCol < n - 1 && ladderRungsData[r][curCol]) newCol = curCol + 1;
        if (newCol !== curCol) { d += ` L ${ladderX(newCol)} ${midY}`; curCol = newCol; }
        d += ` L ${ladderX(curCol)} ${rowTopY}`;
    }
    const start = curCol;
    ladderAnimatePath(d);
    markLadderUsed(start, end);
    addLadderResultSummaryItem(start, end);
    checkLadderAllDone();
};

window.playLadderFromStart = function(start) {
    if (ladderUsedStart.has(start)) return;
    const n = ladderCount;
    let curCol = start;
    let d = `M ${ladderX(curCol)} ${LADDER_TOP_Y}`;
    for (let r = 0; r < ladderRowCount; r++) {
        const midY = LADDER_TOP_Y + (r + 0.5) * LADDER_ROW_HEIGHT;
        const rowBottomY = LADDER_TOP_Y + (r + 1) * LADDER_ROW_HEIGHT;
        d += ` L ${ladderX(curCol)} ${midY}`;
        let newCol = curCol;
        if (curCol > 0 && ladderRungsData[r][curCol - 1]) newCol = curCol - 1;
        else if (curCol < n - 1 && ladderRungsData[r][curCol]) newCol = curCol + 1;
        if (newCol !== curCol) { d += ` L ${ladderX(newCol)} ${midY}`; curCol = newCol; }
        d += ` L ${ladderX(curCol)} ${rowBottomY}`;
    }
    const end = curCol;
    ladderAnimatePath(d);
    markLadderUsed(start, end);
    addLadderResultSummaryItem(start, end);
    checkLadderAllDone();
};

window.playAllLadderPaths = function() {
    for (let i = 0; i < ladderCount; i++) {
        if (!ladderUsedStart.has(i)) playLadderFromStart(i);
    }
};

// 참가자 전원이 사다리를 다 탔는지 확인하고, 다 탔다면 결과창 맨 위에 "다시하기" 버튼을 보여준다.
function checkLadderAllDone() {
    if (ladderCount > 0 && ladderUsedStart.size === ladderCount) {
        showLadderReplayButton();
    }
}

function showLadderReplayButton() {
    const resultTextEl = document.getElementById('ladderResultText');
    if (!resultTextEl || document.getElementById('ladderReplayBtn')) return;
    const row = document.createElement('div');
    row.className = 'ladder-replay-btn-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ladderReplayBtn';
    btn.className = 'ladder-replay-btn-sm';
    btn.textContent = '↻ 다시하기';
    btn.onclick = replayLadderSameSetup;
    row.appendChild(btn);
    resultTextEl.appendChild(row);
}

// 참가자 이름/결과 항목은 그대로 유지한 채, 선(사다리 경로)는 새로 섞고 시작 전 준비 단계(줄 안 보임)로 되돌림
window.replayLadderSameSetup = function() {
    ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);
    ladderUsedStart = new Set();
    ladderUsedEnd = new Set();
    ladderRungsRevealed = false;
    const resultTextEl = document.getElementById('ladderResultText');
    if (resultTextEl) resultTextEl.innerHTML = '';
    renderLadderSVG();
    updateLadderStartBtnState();
};

window.startLadderGame = function() {
    if (!ladderRungsData.length) ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);
    ladderRungsRevealed = true;
    renderLadderSVG();
    updateLadderStartBtnState();
};

function resetLadderGame() {
    ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);
    ladderUsedStart = new Set();
    ladderUsedEnd = new Set();
    ladderRungsRevealed = false;
    const resultTextEl = document.getElementById('ladderResultText');
    if (resultTextEl) resultTextEl.innerHTML = '';
    renderLadderSVG();
    updateLadderStartBtnState();
}
window.resetLadderGame = resetLadderGame;

function fullResetLadderGame() {
    ladderCount = 4; ladderNames = []; ladderResults = [];
    resizeLadderArrays();
    ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);
    ladderUsedStart = new Set(); ladderUsedEnd = new Set(); ladderRungsRevealed = false;
    const resultTextEl = document.getElementById('ladderResultText');
    if (resultTextEl) resultTextEl.innerHTML = '';
    renderLadderSVG();
    updateLadderStartBtnState();
    const countDisplay = document.getElementById('ladderCountDisplay');
    if (countDisplay) countDisplay.textContent = ladderCount;
}

window.confirmResetLadderGame = function() {
    if (!confirm('사다리 세팅을 초기화 할까요?')) return;
    fullResetLadderGame();
    showToast('사다리 세팅을 초기화했습니다.');
};

// 진행 중(누군가 이미 사다리를 탄 상태)이 아니면 사다리 선 배치를 즉시 새로 섞음
window.shuffleLadderRungs = function() {
    if (ladderUsedStart.size > 0) {
        showToast('이미 진행된 사다리는 섞을 수 없어요.');
        return;
    }
    ladderRungsData = generateLadderRungs(ladderCount, ladderRowCount);
    renderLadderSVG();
};

async function openRollingTopicFromMenu(id) {
    closeMobileTabMenu();
    if (currentPage !== '롤링페이퍼') changeTab('롤링페이퍼');
    currentRollingTopic = rollingTopics.find(t => t.id === id);
    render();
    await ensureRollingEntriesLoaded(id);
    if (currentRollingTopic && currentRollingTopic.id === id) render();
}

/* =========================================================
   추가기능 - 파트분배기
   ========================================================= */
let partDividerView = 'lobby';           // 'lobby' | 'room'
let partDividerIsAdmin = false;          // 관리자 모드 여부
let partDividerRoomCode = '';            // 로비에서 입력한 방 코드
let partDividerPendingAutoJoin = null;
if (window.location.hash.startsWith('#partdivider?room=')) {
    partDividerPendingAutoJoin = window.location.hash.split('?room=')[1];
    // 탭 이동 시스템이 꼬이지 않도록 해시를 원래대로 덮어씌움
    window.history.replaceState(null, '', '#partdivider'); 
}
let partDividerJoinedRoomCode = '';      // 실제로 입장한 방 코드(방 화면 헤더 표시용)
let partDividerSearching = false;        // 가사 검색 중 여부
let partDividerSyncing = false;          // 파이어베이스 전송 중 여부
let partDividerJoining = false;          // 입장(코드 확인) 처리 중 여부
let partDividerLastResultHtml = '';      // 마지막으로 화면에 표시된 결과 HTML(관리자/참가자 공용)
let partDividerCurrentSongTitle = '';    // 현재(로컬에서) 분배된 곡 제목
let partDividerCurrentSongArtist = '';   // 현재(로컬에서) 분배된 가수명 (크루 자체 가사 DB 키의 일부로 사용)
let partDividerMemberProfiles = null;    // 크루 멤버 프로필 캐시: { 멤버이름: 'URL' | { profilePic: 'URL' } }
let partDividerMemberProfilesLoading = null; // 프로필 로딩 중복 방지용 진행 중 Promise
const PARTDIVIDER_DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23E4D9FA'/%3E%3Ccircle cx='12' cy='9.5' r='4' fill='%23ffffff'/%3E%3Cpath d='M4 20c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5' fill='%23ffffff'/%3E%3C/svg%3E";
// 보라색 계열을 제외하고, 예쁜 색상을 랜덤으로 추출하는 함수 (기존 멤버들의 색상과 겹치지 않게 유도)
function partDividerGetRandomColor() {
    // 보라색(#8b5cf6, #a78bfa 등) 영역을 피해, 핑크/블루/그린/오렌지/옐로우/민트 계열 톤에서 랜덤 추출
    const safeHues = [12, 35, 48, 145, 185, 205, 330, 350]; // 보라색 영역(250~300)을 제외한 Hue 값들
    const randomHue = safeHues[Math.floor(Math.random() * safeHues.length)];
    const randomSaturation = Math.floor(Math.random() * 25) + 75; // 75% ~ 99% (선명한 색감)
    const randomLightness = Math.floor(Math.random() * 15) + 62;  // 62% ~ 76% (너무 어둡거나 밝지 않게)

    // HSL을 HEX 코드로 변환하는 간단한 헬퍼
    const h = randomHue;
    const s = randomSaturation / 100;
    const l = randomLightness / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const toHex = (val) => {
        const hex = Math.round((val + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
const PARTDIVIDER_DEFAULT_PARAGRAPH_COLOR = '#8b5cf6';
// color 값이 브라우저 <input type="color">가 내놓는 '#rrggbb' 형식인지 검증하고, 아니면 기본색으로 대체 (인라인 스타일/색상 선택기 값에 그대로 꽂아 넣기 전 안전장치)
// (주의) <input type="color">의 value는 스펙상 소문자 hex만 유효한 값으로 인정되어, 대문자 hex를 넣으면 브라우저가 값을 무시하고 검정(#000000)으로 되돌려버린다 - 그래서 항상 소문자로 통일해서 반환한다.
function partDividerSafeColor(color) {
    return (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) ? color.toLowerCase() : PARTDIVIDER_DEFAULT_PARAGRAPH_COLOR;
}
let partDividerCurrentLines = null;      // 현재(로컬에서) 분배된 가사 라인 배열 - 전송 버튼으로 저장할 데이터
let partDividerUnsubscribe = null;       // 사용자(뷰어) 모드 onValue 리스너 해제 함수
let partDividerOnDisconnectHandle = null; // 방장(관리자) onDisconnect 핸들 - 창을 닫으면 방 데이터를 자동 삭제
let partDividerCreatingRoom = false;      // 방 생성(개수 체크 + 코드 발급) 처리 중 여부
const PARTDIVIDER_MAX_ROOMS = 4;          // 동시에 열 수 있는 최대 방 개수 (스트리머 다중 방 남용 방지)
let partDividerMemberChipList = [];       // 멤버 칩 상태(State) - [{ name, picUrl }, ...] 순서가 파트 분배 기준이 됨
let partDividerChipDragSrcIndex = null;   // 드래그 앤 드롭 중인 칩의 원래 인덱스(드롭 시점에 사용)
let partDividerSongLibrary = null;        // 크루 가사 DB(syncroom/lyrics) 전체 목록 캐시 - [{ key, artist, title, lyrics }, ...], 검색/선택 리스트용
let partDividerSongLibraryLoading = null; // 노래 목록 로딩 중복 방지용 진행 중 Promise

function partDividerRoomRef(code) {
    return ref(partDividerDb, `syncroom/rooms/${code}`);
}

function partDividerRoomsListRef() {
    return ref(partDividerDb, 'syncroom/rooms');
}

function partDividerBeforeUnloadHandler(e) {
    // 기능 제거 (새로고침 시 아무 경고 없이 정상 작동)
}
window.addEventListener('beforeunload', partDividerBeforeUnloadHandler);

async function partDividerArmOnDisconnect(code) {
    // 기능 제거
}

async function partDividerDisarmOnDisconnect() {
    // 기능 제거
}

// URL의 ?room= 파라미터만 제거 (해시/다른 쿼리는 유지)
// ⭐ URL에 방 코드 추가 (#partdivider?room=123456)
function partDividerSetRoomUrlParam(code) {
    try {
        window.history.replaceState(null, '', `#partdivider?room=${code}`);
    } catch (err) {
        console.error(err);
    }
}

// ⭐ URL의 방 코드 파라미터 제거
function partDividerRemoveRoomUrlParam() {
    try {
        if (window.location.hash.startsWith('#partdivider')) {
            window.history.replaceState(null, '', '#partdivider');
        }
    } catch (err) {
        console.error(err);
    }
}

function partDividerDetachListener() {
    if (typeof partDividerUnsubscribe === 'function') {
        partDividerUnsubscribe();
    }
    partDividerUnsubscribe = null;
}

function renderPartDividerPage() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    if (partDividerView === 'lobby' && partDividerPendingAutoJoin) {
        const code = partDividerPendingAutoJoin.toUpperCase();
        partDividerPendingAutoJoin = null; 
        partDividerRoomCode = code;
        setTimeout(() => {
            const input = document.getElementById('partDividerRoomCodeInput');
            if (input) input.value = code;
            partDividerEnterRoom(isAdmin);
        }, 50);
    }
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-[1795px] max-w-full lg:mx-auto pb-6';

    const bodyHtml = partDividerView === 'room' ? getPartDividerRoomHtml() : getPartDividerLobbyHtml();

    content.innerHTML = `<div class="big-white-box relative theme-rolling" style="min-height: 900px; padding: ${isMobile ? '20px' : '40px'}; width: 100%; display: block; box-sizing: border-box;">
        <div class="mb-6 flex items-center gap-2">
            <i class="fi fi-rr-microphone-alt text-[24px]" style="color:#8B5CF6;"></i>
            <h2 class="text-[24px] lg:text-3xl font-bold text-[#5D4037] font-paperozi">파트분배기</h2>
        </div>
        <div id="partDividerRoot">${bodyHtml}</div>
    </div>`;

    if (partDividerView === 'room') {
        if (partDividerIsAdmin) {
            partDividerInitSongLibrary();
        } else {
            partDividerRenderViewerMemberChips(); 
        }
    } else if (partDividerView === 'lobby') {
        // ⭐ 이 부분이 추가되었습니다. 로비일 때 방 목록을 불러옵니다.
        partDividerRenderRoomList();
    }
}

// 1. 로비 화면 HTML 구성 (방 목록 영역 추가됨)
function getPartDividerLobbyHtml() {
    const descText = isAdmin 
        ? "방 코드를 입력해 입장하거나, 새 방을 만들어보세요." 
        : "개설된 방 목록에서 선택하거나 코드를 입력해 입장해주세요.";

    const createBtnHtml = isAdmin ? `
        <button type="button" class="partdiv-btn partdiv-btn-create" onclick="partDividerCreateNewRoom()">
            <i class="fi fi-rr-add"></i> 새로운 방 생성
        </button>
    ` : '';

    return `
    <div class="lobby-section partdiv-lobby-card" style="max-width: 500px;">
        <div class="partdiv-lobby-icon"><i class="fi fi-rr-microphone-alt"></i></div>
        <div class="partdiv-lobby-title">싱크룸 노래 파트 분배기</div>
        <div class="partdiv-lobby-desc">${descText}</div>
        
        <div class="flex gap-2 w-full mt-2">
            <input type="text" id="partDividerRoomCodeInput" class="partdiv-input" placeholder="방 코드 입력" value="${escapeHtml(partDividerRoomCode)}" onkeydown="if(event.key==='Enter') partDividerEnterRoom(false);">
            <button type="button" id="partDividerJoinBtn" class="partdiv-btn partdiv-btn-primary shrink-0" onclick="partDividerEnterRoom(false)" style="white-space: nowrap;">
                <i class="fi fi-rr-door-open"></i> 입장
            </button>
        </div>
        ${createBtnHtml}

        <!-- ⭐ 새로 추가된 방 목록 영역 -->
        <div class="w-full mt-8 border-t border-[#E4D9FA] pt-6 text-left">
            <div class="text-[15px] font-bold text-[#5D4037] font-paperozi mb-3 flex items-center justify-between">
                <span><i class="fi fi-rr-list"></i> 현재 개설된 방 목록</span>
                <button onclick="partDividerRenderRoomList()" class="text-gray-400 hover:text-[#5D4037] transition cursor-pointer text-lg" title="새로고침"><i class="fi fi-rr-refresh"></i></button>
            </div>
            <div id="partDividerRoomListContainer" class="flex flex-col gap-2 max-h-[300px] overflow-y-auto modal-scroll pr-1">
                <div class="text-center text-[13px] text-gray-400 font-bold py-4">목록을 불러오는 중...</div>
            </div>
        </div>
    </div>`;
}

// 2. 방 목록을 서버에서 불러와 화면에 그려주는 기능
window.partDividerRenderRoomList = async function() {
    const container = document.getElementById('partDividerRoomListContainer');
    if (!container) return;
    
    // 프로필 사진 매핑 정보를 확실하게 먼저 불러옵니다.
    await ensureMemberLoginImgMap();
    
    try {
        const snapshot = await get(partDividerRoomsListRef());
        if (!snapshot.exists()) {
            container.innerHTML = `<div class="text-center text-[13px] text-gray-400 font-bold py-8 bg-white border border-[#E4D9FA] rounded-xl shadow-sm">개설된 방이 없습니다.</div>`;
            return;
        }
        
        const rooms = [];
        snapshot.forEach(child => {
            rooms.push({ code: child.key, ...child.val() });
        });
        
        // 최신순으로 정렬
        rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        container.innerHTML = rooms.map(room => {
            // ⭐ 방 제목을 "만든 멤버 이름 + 님의 싱크룸"으로 설정
            const hostName = room.hostName || '관리자';
            const roomTitle = `${hostName}님의 싱크룸`;
            
            // 프사 찾는 로직 (방 저장 데이터 -> 관리자 DB -> 기본 멤버 이미지 순)
            const memberInfo = members.find(m => m.name === hostName);
            let hostImgSrc = room.hostImg;
            if (!hostImgSrc || hostImgSrc === PARTDIVIDER_DEFAULT_AVATAR) {
                hostImgSrc = memberLoginImgMap[hostName] || (memberInfo ? memberInfo.img : PARTDIVIDER_DEFAULT_AVATAR);
            }
            
            // 관리자일 경우 방 삭제 버튼 생성
            const deleteBtn = isAdmin ? `
                <button onclick="event.stopPropagation(); partDividerDeleteRoom('${room.code}')" class="text-red-400 hover:text-white bg-white hover:bg-red-500 border border-red-100 rounded-lg w-8 h-8 flex items-center justify-center shrink-0 transition shadow-sm ml-2" title="방 삭제">
                    <i class="fi fi-br-cross-small text-lg"></i>
                </button>
            ` : '';
            
            return `
            <div class="flex items-center bg-white border border-[#E4D9FA] rounded-xl p-3 cursor-pointer hover:border-[#8B5CF6] hover:shadow-md transition group" onclick="partDividerPromptRoomCode('${room.code}')">
                
                <!-- 방장 프사 영역 -->
                <img src="${hostImgSrc}" class="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0 mr-3" onerror="this.src='${PARTDIVIDER_DEFAULT_AVATAR}'">

                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <div class="flex items-center gap-2">
                        <!-- ⭐ 제목만 깔끔하게 표시 (시간 영역 삭제됨) -->
                        <span class="text-[14px] font-bold text-[#5D4037] truncate">${escapeHtml(roomTitle)}</span>
                    </div>
                </div>
                <div class="text-[#8B5CF6] bg-[#F4EEFF] rounded-lg px-3 py-1.5 text-[12px] font-bold shrink-0 transition">
                    입장
                </div>
                ${deleteBtn}
            </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('방 목록 로드 에러:', err);
        container.innerHTML = `<div class="text-center text-[13px] text-red-400 font-bold py-4">목록을 불러오지 못했습니다.</div>`;
    }
};

// 3. 방 목록 클릭 시 자동으로 코드를 넣고 입장
window.partDividerEnterRoomCode = function(code) {
    const input = document.getElementById('partDividerRoomCodeInput');
    if (input) input.value = code;
    // ⭐ 새로고침해도 방에 남아있도록 저장
    try { localStorage.setItem('partDividerActiveRoom', code); } catch (e) {}
    partDividerEnterRoom(isAdmin); 
};

// ⭐ 새로 추가된 함수: 목록에서 방 클릭 시 코드 입력 요구
window.partDividerPromptRoomCode = function(actualCode) {
    // 관리자는 매번 코드 치기 번거로우므로 프리패스 입장
    if (isAdmin) {
        partDividerEnterRoomCode(actualCode);
        return;
    }

    // 시청자(일반 유저)일 경우 방 코드를 묻는 창 띄우기
    const inputCode = prompt("이 방에 입장하려면 6자리 방 코드를 입력해주세요.");
    
    // 취소를 누른 경우 그냥 종료
    if (inputCode === null) return; 

    // 입력한 코드가 방의 실제 코드와 일치하는지 확인
    if (inputCode.trim() === actualCode) {
        partDividerEnterRoomCode(actualCode);
    } else {
        alert("방 코드가 일치하지 않습니다. 코드를 다시 확인해주세요.");
    }
};

// 4. 관리자 전용: 방 목록에서 즉시 방 삭제 (폭파)
window.partDividerDeleteRoom = async function(code) {
    if (!confirm('정말 이 방을 삭제하시겠습니까?\n방 안의 모든 데이터가 사라지며 복구할 수 없습니다.')) return;
    try {
        await remove(partDividerRoomRef(code));
        showToast('방이 삭제되었습니다.');
        partDividerRenderRoomList(); // 삭제 후 목록 새로고침
    } catch (err) {
        console.error(err);
        alert('방 삭제에 실패했습니다.');
    }
};

// 6자리 랜덤 숫자 방 코드 생성
function generatePartDividerRoomCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

// 관리자: 새로운 방 생성 - 랜덤 코드를 만들어 즉시 관리자 모드로 입장
// (중요) 시청자 난입 방지를 위해 화면에 방 코드를 노출하지 않고, 대신 초대 링크 복사 버튼을 제공한다.
async function partDividerCreateNewRoom() {
    // ⭐ 추가: 관리자가 아니면 방 생성 기능 차단
    if (!isAdmin) {
        alert('관리자만 방을 생성할 수 있습니다.');
        return;
    }

    if (partDividerCreatingRoom) return;
    partDividerCreatingRoom = true;
    try {
        // 방 4개 제한 체크 - 생성 전에 현재 활성화된 방 개수를 먼저 확인
        const roomsSnapshot = await get(partDividerRoomsListRef());
        const activeRoomCount = roomsSnapshot.exists() ? Object.keys(roomsSnapshot.val()).length : 0;
        if (activeRoomCount >= PARTDIVIDER_MAX_ROOMS) {
            alert(`동시에 열 수 있는 방은 최대 ${PARTDIVIDER_MAX_ROOMS}개예요. 다른 방이 종료된 후 다시 시도해주세요.`);
            return;
        }

        partDividerDetachListener();
        await partDividerDisarmOnDisconnect();

        const code = generatePartDividerRoomCode();
        partDividerRoomCode = code;
        partDividerJoinedRoomCode = code;
        partDividerIsAdmin = true;
        partDividerView = 'room';
        partDividerSetRoomUrlParam(code);
        partDividerLastResultHtml = '';
        partDividerCurrentSongTitle = '';
        partDividerCurrentLines = null;
        partDividerMemberChipList = [];

        // ⭐ 방 생성 즉시 초기 상태를 저장하여 시청자들이 에러 없이 바로 입장할 수 있게 함
        // 개설한 관리자의 이름과 프사 정보도 함께 저장합니다.
        // 개설한 관리자의 이름과 프사 정보 셋팅 (로그인 정보나 기본 멤버 데이터에서 끌어옴)
        const hostName = (loggedInUser && loggedInUser.name) ? loggedInUser.name : '관리자';
        const memberInfo = members.find(m => m.name === hostName);
        const hostImg = (loggedInUser && loggedInUser.img) || memberLoginImgMap[hostName] || (memberInfo ? memberInfo.img : PARTDIVIDER_DEFAULT_AVATAR);

        await set(partDividerRoomRef(code), {
            songTitle: '',
            songArtist: '',
            lines: [],
            members: [],
            hostName: hostName,
            hostImg: hostImg,
            createdAt: Date.now()
        });

        renderPartDividerPage();
        showToast('새 방이 생성되었어요! [초대 링크 복사]로 시청자를 자동 입장시켜보세요.');

        // 방장(관리자)이 창을 닫거나 새로고침하면 방 데이터가 자동으로 삭제되도록 예약 (화면 렌더링을 막지 않도록 뒤에서 처리)
        await partDividerArmOnDisconnect(code);
    } catch (err) {
        console.error(err);
        alert('방 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
        partDividerCreatingRoom = false;
    }
}

// 관리자: 기존 코드를 직접 입력해 관리자 모드로 입장(쓰기 전용, 파이어베이스 읽기 없이 바로 진입)
async function partDividerEnterAsAdmin(code) {
    partDividerDetachListener();
    await partDividerDisarmOnDisconnect();

    partDividerRoomCode = code;
    partDividerJoinedRoomCode = code;
    partDividerIsAdmin = true;
    partDividerView = 'room';
    partDividerSetRoomUrlParam(code);
    partDividerLastResultHtml = '';
    partDividerCurrentSongTitle = '';
    partDividerCurrentLines = null;
    partDividerMemberChipList = [];

    renderPartDividerPage();

    // 기존 방으로 재입장한 경우에도 방장 접속 종료 시 자동 폭파되도록 동일하게 예약 (화면 렌더링을 막지 않도록 뒤에서 처리)
    await partDividerArmOnDisconnect(code);
}

// 초대 링크 복사 - "현재주소?room=방코드" 형태로 클립보드에 복사 (방 코드는 화면에 텍스트로 노출하지 않음)
function partDividerCopyInviteLink() {
    if (!partDividerJoinedRoomCode) {
        showToast('방 코드가 없어요.');
        return;
    }
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}#partdivider?room=${partDividerJoinedRoomCode}`;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        alert('이 브라우저에서는 클립보드 복사를 지원하지 않아요.');
        return;
    }
    navigator.clipboard.writeText(inviteUrl)
        .then(() => showToast('초대 링크를 복사했어요.'))
        .catch(err => {
            console.error(err);
            alert('링크 복사에 실패했어요. 브라우저 권한을 확인해주세요.');
        });
}

function partDividerCopyRoomCode() {
    if (!partDividerJoinedRoomCode) {
        showToast('방 코드가 없어요.');
        return;
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        alert('이 브라우저에서는 클립보드 복사를 지원하지 않아요.');
        return;
    }
    navigator.clipboard.writeText(partDividerJoinedRoomCode)
        .then(() => showToast('방 코드를 복사했어요'))
        .catch(err => {
            console.error(err);
            alert('코드 복사에 실패했어요. 브라우저 권한을 확인해주세요.');
        });
}

// 사용자(뷰어): 코드를 입력해 입장 - 해당 방 데이터가 실제로 존재하는지 먼저 확인 후, 있으면 실시간 리스너를 붙임
async function partDividerEnterRoom(isAdmin) {
    const input = document.getElementById('partDividerRoomCodeInput');
    const code = (input ? input.value : partDividerRoomCode || '').trim().toUpperCase();
    if (!code) {
        showToast('방 코드를 입력해주세요.');
        return;
    }
    partDividerRoomCode = code;

    if (isAdmin) {
        partDividerEnterAsAdmin(code);
        return;
    }

    if (partDividerJoining) return;
    partDividerJoining = true;
    const joinBtn = document.getElementById('partDividerJoinBtn');
    if (joinBtn) { joinBtn.disabled = true; joinBtn.innerHTML = '<i class="fi fi-rr-spinner"></i> 확인중...'; }

    try {
        const snapshot = await get(partDividerRoomRef(code));
        if (!snapshot.exists()) {
            alert('존재하지 않는 방 코드예요. 코드를 다시 확인해주세요.');
            return;
        }

        partDividerDetachListener();
        partDividerJoinedRoomCode = code;
        partDividerIsAdmin = false;
        partDividerView = 'room';
        partDividerSetRoomUrlParam(code);
        partDividerApplyRoomData(snapshot.val());
        renderPartDividerPage();
        partDividerAttachListener(code);
    } catch (err) {
        console.error(err);
        alert('방 정보를 불러오는 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
        partDividerJoining = false;
        if (joinBtn) { joinBtn.disabled = false; joinBtn.innerHTML = '<i class="fi fi-rr-door-open"></i> 입장하기'; }
    }
}

// 사용자(뷰어): 실시간 리스너 부착 - 관리자가 새로 전송할 때마다 가사창을 자동 갱신
// snapshot이 null(방 데이터 없음)이 되면 방장이 나가서 방이 폭파된 것 -> 강제로 로비로 복귀시킴
function partDividerAttachListener(code) {
    partDividerUnsubscribe = onValue(partDividerRoomRef(code), (snapshot) => {
        if (!snapshot.exists() || snapshot.val() === null) {
            partDividerHandleRoomClosedByHost();
            return;
        }
        partDividerApplyRoomData(snapshot.val());
        const resultBox = document.getElementById('partDividerResult');
        if (resultBox) resultBox.innerHTML = partDividerLastResultHtml;
        const titleEl = document.getElementById('partDividerSongTitleLabel');
        if (titleEl) titleEl.textContent = partDividerCurrentSongTitle ? `· ${partDividerCurrentSongTitle}` : '';
    });
}

// 뷰어(참가자) 전용: 방장이 퇴장(연결 종료/새로고침 등)하여 방이 폭파되었을 때 처리
function partDividerHandleRoomClosedByHost() {
    partDividerDetachListener();
    partDividerView = 'lobby';
    partDividerIsAdmin = false;
    partDividerJoinedRoomCode = '';
    partDividerRoomCode = '';
    partDividerLastResultHtml = '';
    partDividerCurrentSongTitle = '';
    partDividerCurrentLines = null;
    partDividerRemoveRoomUrlParam();
    renderPartDividerPage();
    alert('관리자가 방을 삭제하여 로비로 이동합니다.'); // 문구 변경됨
}

// 파이어베이스에서 받아온 방 데이터를 화면 상태(HTML)로 변환해 저장
function partDividerApplyRoomData(data) {
    const lines = Array.isArray(data && data.lines) ? data.lines : [];
    partDividerCurrentSongTitle = (data && data.songTitle) || '';
    partDividerCurrentLines = lines;
    partDividerLastResultHtml = partDividerLinesToHtml(lines) || `<div class="partdiv-result-empty">아직 분배된 파트가 없어요.</div>`;

    // ⭐ 뷰어 모드일 때 실시간으로 멤버 목록 반영
    if (!partDividerIsAdmin) {
        partDividerMemberChipList = Array.isArray(data && data.members) ? data.members : [];
        partDividerRenderViewerMemberChips(); // 화면 즉시 갱신
    }
}

function partDividerRenderViewerMemberChips() {
    const chipsBox = document.getElementById('partDividerViewerMemberChips');
    if (!chipsBox) return;

    if (!partDividerMemberChipList || partDividerMemberChipList.length === 0) {
        chipsBox.innerHTML = `<div class="text-[13px] font-bold text-gray-400 py-4">방장이 멤버를 추가하면 여기에 표시됩니다.</div>`;
        return;
    }

    chipsBox.innerHTML = partDividerMemberChipList.map((chip, i) => {
        const isRegistered = !!chip.picUrl;
        const imgSrc = chip.picUrl || PARTDIVIDER_DEFAULT_AVATAR;
        const chipColor = partDividerSafeColor(chip.color);
        return `<div class="partdiv-member-chip ${isRegistered ? '' : 'partdiv-member-chip-unregistered'}" style="cursor: default;">
            <div class="partdiv-member-chip-avatar-wrap">
                <img src="${imgSrc}" class="partdiv-member-chip-avatar" alt="${escapeHtml(chip.name)}" onerror="this.src='${PARTDIVIDER_DEFAULT_AVATAR}'">
                <div class="partdiv-member-chip-color" style="background-color: ${chipColor}; pointer-events: none; border-color: #ffffff;"></div>
            </div>
            <span class="partdiv-member-chip-name">${escapeHtml(chip.name)}</span>
        </div>`;
    }).join('');
}

async function partDividerExitRoom() {
    // ⭐ 관리자라면 [나가기]를 누를 때 방을 완전히 삭제(폭파)합니다.
    if (partDividerIsAdmin && partDividerJoinedRoomCode) {
        if (!confirm("정말 나가시겠습니까?\n방장이 나가면 방이 닫히고 목록에서 사라집니다.")) {
            return; // 취소를 누르면 나가지 않음
        }
        const code = partDividerJoinedRoomCode;
        try {
            await remove(partDividerRoomRef(code));
        } catch (err) {
            console.error('방 삭제 실패:', err);
        }
    }

    partDividerDetachListener();
    // 저장된 활성 방 정보 삭제
    try { localStorage.removeItem('partDividerActiveRoom'); } catch (e) {}
    
    partDividerView = 'lobby';
    partDividerIsAdmin = false;
    partDividerJoinedRoomCode = '';
    partDividerRoomCode = '';
    partDividerMemberChipList = [];
    partDividerRemoveRoomUrlParam();
    renderPartDividerPage();
}

// -------------------- 2. 메인 가사방 --------------------
function getPartDividerRoomHtml() {
    return `
    <div class="room-section">
        <div class="partdiv-room-header">
            <div class="partdiv-room-header-actions">
                ${partDividerIsAdmin ? `
                <button type="button" class="partdiv-btn partdiv-btn-ghost" onclick="partDividerCopyRoomCode()"><i class="fi fi-rr-copy"></i> 코드 복사</button>
                <button type="button" class="partdiv-btn partdiv-btn-invite" onclick="partDividerCopyInviteLink()"><i class="fi fi-rr-link"></i> 초대 링크 복사</button>
                ` : ''}
                <button type="button" class="partdiv-btn partdiv-btn-ghost" onclick="partDividerExitRoom()">
                    <i class="fi fi-rr-arrow-left"></i> 나가기
                </button>
            </div>
        </div>

        ${partDividerIsAdmin ? `
        <div class="partdiv-room-body">
            ${getPartDividerAdminPanelHtml()}
            <div class="partdiv-result-wrap">
                <div class="partdiv-result-title"><i class="fi fi-rr-list-music"></i> 파트 분배 결과<span id="partDividerSongTitleLabel">${partDividerCurrentSongTitle ? ` · ${escapeHtml(partDividerCurrentSongTitle)}` : ''}</span></div>
                <div id="partDividerResult" class="partdiv-result-box">${partDividerLastResultHtml || `<div class="partdiv-result-empty">가사와 멤버를 입력하고 [파트 분배 및 전송]을 눌러주세요.</div>`}</div>
            </div>
        </div>
        ` : `
        <div class="partdiv-room-body" style="flex-direction: column; gap: 24px;">
            <div class="partdiv-admin-panel" style="width: 100%; margin-bottom: 0;">
                <div class="partdiv-panel-block partdiv-panel-col">
                    <label class="partdiv-label">현재 참여 멤버 <span class="partdiv-label-sub">(위 순서대로 파트가 분배돼요)</span></label>
                    <div id="partDividerViewerMemberChips" class="partdiv-member-chips"></div>
                </div>
            </div>
            <div class="partdiv-result-wrap" style="width: 100%;">
                <div class="partdiv-result-title"><i class="fi fi-rr-list-music"></i> 파트 분배 결과<span id="partDividerSongTitleLabel">${partDividerCurrentSongTitle ? ` · ${escapeHtml(partDividerCurrentSongTitle)}` : ''}</span></div>
                <div id="partDividerResult" class="partdiv-result-box">${partDividerLastResultHtml || `<div class="partdiv-result-empty">아직 분배된 파트가 없어요. 관리자가 분배를 완료하면 여기에 표시됩니다.</div>`}</div>
            </div>
        </div>
        `}
    </div>`;
}

function getPartDividerAdminPanelHtml() {
    return `
    <div class="admin-panel partdiv-admin-panel">
        <div class="partdiv-panel-row">
            <div class="partdiv-panel-block partdiv-panel-col">
                <label class="partdiv-label">참여 멤버</label>
                <div class="partdiv-add-member-row">
                    <input type="text" id="partDividerMemberNameInput" class="partdiv-input" placeholder="멤버 이름 입력" onkeydown="if(event.key==='Enter'){ event.preventDefault(); partDividerAddMember(); }">
                    <button type="button" class="partdiv-btn partdiv-btn-primary partdiv-add-member-btn" onclick="partDividerAddMember()">
                        <i class="fi fi-rr-plus"></i> 추가
                    </button>
                </div>
                <div id="partDividerMemberChips" class="partdiv-member-chips"></div>
                <button type="button" class="partdiv-btn partdiv-btn-ghost partdiv-btn-shuffle" onclick="partDividerShuffleMembers()">
                    <i class="fi fi-rr-shuffle"></i> 순서 섞기
                </button>
            </div>

            <div class="partdiv-panel-block partdiv-panel-col">
                <label class="partdiv-label">가사가 등록된 노래 <span class="partdiv-label-sub">(검색해서 바로 불러올 수 있어요)</span></label>
                <input type="text" id="partDividerSongLibrarySearchInput" class="partdiv-input" placeholder="가수명 또는 노래 제목 검색" oninput="partDividerFilterSongLibrary()">
                <div id="partDividerSongLibraryList" class="partdiv-song-library-list">
                    <div class="partdiv-song-library-empty">불러오는 중...</div>
                </div>
            </div>
        </div>

        <div class="partdiv-panel-block">
            <label class="partdiv-label">곡 정보 <span class="partdiv-label-sub">(가수와 제목 입력 후 Genius에서 가사를 자동으로 불러올 수 있어요)</span></label>
            <div class="partdiv-search-row">
                <input type="text" id="partDividerSongArtistInput" class="partdiv-input" placeholder="가수명" value="${escapeHtml(partDividerCurrentSongArtist)}">
                <input type="text" id="partDividerSongTitleInput" class="partdiv-input" placeholder="노래 제목" value="${escapeHtml(partDividerCurrentSongTitle)}">
                <!-- Genius 검색 버튼 추가 -->
                <button type="button" id="partDividerGeniusBtn" class="partdiv-btn partdiv-btn-primary partdiv-search-btn" onclick="fetchLyricsFromGenius()">
                    <i class="fi fi-rr-search"></i> Genius 검색
                </button>
            </div>
        </div>

        <div class="partdiv-panel-block">
            <label class="partdiv-label">원본 가사</label>
            <textarea id="partDividerLyricsTextarea" class="partdiv-textarea" rows="10" placeholder="가사를 직접 입력하거나 붙여넣으세요. 노래를 검색해 저장된 가사를 불러올 수도 있어요."></textarea>
        </div>

        <div class="partdiv-lobby-btn-row">
            <button type="button" id="partDividerDistributeSyncBtn" class="partdiv-btn partdiv-btn-distribute" onclick="partDividerDistributeAndSync()">
                <i class="fi fi-rr-paper-plane"></i> 파트 분배 및 전송
            </button>
        </div>
    </div>`;
}

// Firebase 경로에 안전하게 쓸 수 있도록 특수문자를 치환 ('.', '#', '$', '[', ']', '/' 는 RTDB 키에 사용 불가)
function partDividerSanitizeKeyPart(str) {
    return String(str || '').trim().replace(/[.#$\[\]\/]/g, '_');
}

function partDividerLyricsKey(artist, title) {
    return `${partDividerSanitizeKeyPart(artist)}_${partDividerSanitizeKeyPart(title)}`;
}

// 크루 가사 DB(syncroom/lyrics)에 저장된 모든 곡 목록을 최초 1회만 불러와 캐싱 - 노래 검색/선택 리스트용
function partDividerLoadSongLibrary() {
    if (partDividerSongLibrary) return Promise.resolve(partDividerSongLibrary);
    if (partDividerSongLibraryLoading) return partDividerSongLibraryLoading;

    partDividerSongLibraryLoading = get(ref(partDividerDb, 'syncroom/lyrics'))
        .then(snapshot => {
            const list = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnap => {
                    const data = childSnap.val() || {};
                    list.push({
                        key: childSnap.key,
                        artist: data.artist || '',
                        title: data.title || '',
                        lyrics: data.lyrics || ''
                    });
                });
            }
            list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
            partDividerSongLibrary = list;
            return list;
        })
        .catch(err => {
            console.error('크루 가사 DB 목록 로드 실패:', err);
            partDividerSongLibrary = [];
            return partDividerSongLibrary;
        })
        .finally(() => { partDividerSongLibraryLoading = null; });

    return partDividerSongLibraryLoading;
}

// 방(관리자) 화면이 열릴 때 노래 목록을 불러와 리스트를 채워준다.
function partDividerInitSongLibrary() {
    // 데이터를 캐싱만 해두고, 화면에는 빈 목록을 보냄
    partDividerLoadSongLibrary().then(() => partDividerRenderSongLibraryList([]));
}

// 노래 목록(검색 결과 포함)을 리스트 UI로 그린다.
function partDividerRenderSongLibraryList(list) {
    const box = document.getElementById('partDividerSongLibraryList');
    if (!box) return;

    if (!list || list.length === 0) {
        const input = document.getElementById('partDividerSongLibrarySearchInput');
        const keyword = (input ? input.value : '').trim();
        
        if (!keyword) {
            box.innerHTML = `<div class="partdiv-song-library-empty">검색어를 입력해 주세요.</div>`;
        } else {
            box.innerHTML = `<div class="partdiv-song-library-empty">일치하는 가사가 없어요.</div>`;
        }
        return;
    }

    box.innerHTML = list.map(song => `
        <button type="button" class="partdiv-song-library-item" data-song-key="${escapeHtml(song.key)}">
            <span class="partdiv-song-library-item-title">${escapeHtml(song.title)}</span>
            <span class="partdiv-song-library-item-artist">${escapeHtml(song.artist)}</span>
        </button>
    `).join('');

    box.querySelectorAll('.partdiv-song-library-item').forEach(btn => {
        btn.addEventListener('click', () => partDividerSelectSongFromLibrary(btn.getAttribute('data-song-key')));
    });
}

// 검색창 입력(oninput) 핸들러 - 가수명/제목에 검색어가 포함된 곡만 필터링해서 다시 그린다.
async function partDividerFilterSongLibrary() {
    const input = document.getElementById('partDividerSongLibrarySearchInput');
    const keyword = (input ? input.value : '').trim().toLowerCase().replace(/\s+/g, '');
    
    // 검색어가 없으면 무조건 빈 배열을 넘겨 목록을 비움
    if (!keyword) {
        partDividerRenderSongLibraryList([]);
        return;
    }

    const list = await partDividerLoadSongLibrary();

    const filtered = list.filter(song => 
        (song.title || '').toLowerCase().replace(/\s+/g, '').includes(keyword) || 
        (song.artist || '').toLowerCase().replace(/\s+/g, '').includes(keyword)
    );

    partDividerRenderSongLibraryList(filtered);
}

// 목록에서 곡 하나를 클릭했을 때 - 가수명/제목 입력칸과 원본 가사 textarea에 바로 채워준다.
function partDividerSelectSongFromLibrary(key) {
    const song = (partDividerSongLibrary || []).find(s => s.key === key);
    if (!song) return;

    const artistInput = document.getElementById('partDividerSongArtistInput');
    const titleInput = document.getElementById('partDividerSongTitleInput');
    const lyricsArea = document.getElementById('partDividerLyricsTextarea');

    if (artistInput) artistInput.value = song.artist;
    if (titleInput) titleInput.value = song.title;
    if (lyricsArea) lyricsArea.value = song.lyrics;

    showToast(`"${song.artist} - ${song.title}" 가사를 불러왔어요.`);
}

// 크루 자체 가사 DB(syncroom/lyrics/{가수명}_{노래제목})에서 가사를 조회해 원본 가사 textarea에 채워줌
async function partDividerLoadLyricsFromDb() {
    if (partDividerSearching) return;

    const artistInput = document.getElementById('partDividerSongArtistInput');
    const titleInput = document.getElementById('partDividerSongTitleInput');
    const lyricsArea = document.getElementById('partDividerLyricsTextarea');

    const artist = (artistInput ? artistInput.value : '').trim();
    const title = (titleInput ? titleInput.value : '').trim();

    if (!artist || !title) {
        showToast('가수명과 노래 제목을 모두 입력해주세요.');
        return;
    }

    const btn = document.getElementById('partDividerLoadLyricsBtn');
    partDividerSearching = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fi fi-rr-spinner"></i> 불러오는 중...'; }

    try {
        const key = partDividerLyricsKey(artist, title);
        const snapshot = await get(ref(partDividerDb, `syncroom/lyrics/${key}`));

        if (!snapshot.exists()) {
            alert('저장된 가사가 없습니다. 직접 입력해주세요.');
            if (lyricsArea) lyricsArea.value = '';
            return;
        }

        const data = snapshot.val();
        if (lyricsArea) lyricsArea.value = (data && data.lyrics) || '';
        showToast(`"${artist} - ${title}" 가사를 불러왔어요.`);
    } catch (err) {
        console.error(err);
        showToast('가사를 불러오는 중 오류가 발생했어요.');
    } finally {
        partDividerSearching = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fi fi-rr-cloud-download"></i> 가사 불러오기'; }
    }
}

// =========================================================================
// Genius API 가사 불러오기 (토큰 발급 필요)
// =========================================================================
const GENIUS_ACCESS_TOKEN = '여기에_Genius_클라이언트_액세스_토큰을_입력하세요';

async function fetchLyricsFromGenius() {
    const artistInput = document.getElementById('partDividerSongArtistInput');
    const titleInput = document.getElementById('partDividerSongTitleInput');
    const lyricsArea = document.getElementById('partDividerLyricsTextarea');
    const btn = document.getElementById('partDividerGeniusBtn');

    const artist = (artistInput ? artistInput.value : '').trim();
    const title = (titleInput ? titleInput.value : '').trim();

    if (!title) {
        showToast('노래 제목을 입력해주세요.');
        return;
    }

    const query = artist ? `${artist} ${title}` : title;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fi fi-rr-spinner"></i> 검색 중...';
    }

    try {
        const searchApiUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
        const proxiedSearchUrl = `https://corsproxy.io/?url=${encodeURIComponent(searchApiUrl)}`;

        const searchRes = await fetch(proxiedSearchUrl, {
            headers: {
                'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
            }
        });

        if (!searchRes.ok) throw new Error('Genius API 검색 실패');
        const searchData = await searchRes.json();
        const hits = searchData?.response?.hits || [];

        if (hits.length === 0) {
            alert('Genius에서 일치하는 노래를 찾지 못했습니다.');
            return;
        }

        const songUrl = hits[0]?.result?.url;
        if (!songUrl) throw new Error('가사 페이지 주소를 찾을 수 없습니다.');

        const proxiedPageUrl = `https://corsproxy.io/?url=${encodeURIComponent(songUrl)}`;
        const pageRes = await fetch(proxiedPageUrl);
        if (!pageRes.ok) throw new Error('가사 페이지 로드 실패');

        const htmlText = await pageRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const lyricsContainers = doc.querySelectorAll('div[class*="Lyrics__Container"], .lyrics');
        if (!lyricsContainers || lyricsContainers.length === 0) {
            alert('가사 텍스트를 추출할 수 없는 페이지 형태입니다. 직접 붙여넣어 주세요.');
            return;
        }

        let parsedLyrics = '';
        lyricsContainers.forEach(container => {
            container.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
            parsedLyrics += container.textContent.trim() + '\n\n';
        });

        parsedLyrics = parsedLyrics.replace(/\n{3,}/g, '\n\n').trim();
        if (lyricsArea) lyricsArea.value = parsedLyrics;

        if (artistInput && !artistInput.value) artistInput.value = hits[0].result.primary_artist?.name || '';
        if (titleInput && !titleInput.value) titleInput.value = hits[0].result.title || '';

        showToast('Genius에서 가사를 성공적으로 불러왔어요!');
    } catch (err) {
        console.error('Genius 가사 불러오기 실패:', err);
        showToast('가사를 가져오는 중 오류가 발생했습니다.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fi fi-rr-search"></i> Genius 검색';
        }
    }
}

// 실제 크루 멤버 프로필은 ① 기본 크루(하드코딩된 members 배열) + ② 멤버관리 화면에서 등록한 멤버(Firestore memberDb - 'members' 컬렉션) 두 곳에 있으므로 둘 다 합쳐서 조회한다.
function partDividerLoadMemberProfiles() {
    if (partDividerMemberProfiles) return Promise.resolve(partDividerMemberProfiles);
    if (partDividerMemberProfilesLoading) return partDividerMemberProfilesLoading;

    partDividerMemberProfilesLoading = getDocs(collection(memberDb, 'members'))
        .then(snap => {
            const profiles = {};

            // 1) 기본 크루 멤버(달타/다룽/최또/카나시 등)를 먼저 채워둔다
            members.forEach(m => { profiles[m.name] = m.img; });

            // 2) 멤버관리(Firestore memberDb - 'members' 컬렉션)에서 등록한 멤버로 덮어쓰거나 추가한다
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const name = data && data.name;
                if (!name) return;
                profiles[name] = (data.img && data.img.trim()) ? data.img : (profiles[name] || null);
            });

            partDividerMemberProfiles = profiles;
            return profiles;
        })
        .catch(err => {
            console.error('크루 멤버 프로필 로드 실패 (memberDb - members 컬렉션):', err);
            // Firestore 조회가 실패해도 최소한 기본 크루 멤버 프로필은 보여준다
            const fallback = {};
            members.forEach(m => { fallback[m.name] = m.img; });
            partDividerMemberProfiles = fallback;
            return fallback;
        })
        .finally(() => { partDividerMemberProfilesLoading = null; });

    return partDividerMemberProfilesLoading;
}

// 특정 멤버 이름에 매칭되는 프로필 사진 URL을 찾아 반환 (등록 안 되어 있으면 null)
function partDividerGetMemberProfilePic(profiles, name) {
    const raw = profiles ? profiles[name] : undefined;
    if (!raw) return null;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && raw.profilePic) return raw.profilePic;
    return null;
}

// [추가] 버튼(또는 입력칸 Enter)에 연동 - 이름 한 명을 크루 멤버 DB와 대조해 멤버 칩 '상태(State)'에 push하고, 입력칸은 비워준다.
async function partDividerAddMember() {
    const nameInput = document.getElementById('partDividerMemberNameInput');
    if (!nameInput) return;

    const name = nameInput.value.trim();
    if (!name) {
        showToast('멤버 이름을 입력해주세요.');
        return;
    }

    // 0. 다시 그리기 전에, 화면에 떠 있는 색상 선택기들의 값을 먼저 State에 반영 (직전에 고른 색이 날아가지 않도록)
    partDividerSyncMemberColorsFromDom();

    // 1. 파이어베이스 멤버 DB(프로필 사진 등)를 대조
    const profiles = await partDividerLoadMemberProfiles();
    const picUrl = partDividerGetMemberProfilePic(profiles, name);

    // 2. 멤버 리스트(State)에 push - 노랑, 파랑, 분홍, 주황, 빨강, 연보라 순서대로 고정 배정하여 겹침 방지
    const color = partDividerGetNextColor(partDividerMemberChipList.length);
    partDividerMemberChipList.push({ name, picUrl, color });

    // 3. 칩 UI 즉시 렌더링
    partDividerRenderMemberChips();

    // 4. 입력칸 비우기 + 다음 입력을 바로 이어갈 수 있도록 포커스 유지
    nameInput.value = '';
    nameInput.focus();
}

    // 2. 멤버 리스트(State)에 push - 보라색이 제외된 랜덤 색상을 배정하여 겹침 방지
// 노랑, 파랑, 분홍, 주황, 빨강, 연보라 순서대로 고정 배정하기 위한 팔레트
const PARTDIVIDER_FIXED_PALETTE = ['#facc15', '#3b82f6', '#f472b6', '#fb923c', '#ef4444', '#a855f7'];

function partDividerGetNextColor(currentIndex) {
    return PARTDIVIDER_FIXED_PALETTE[currentIndex % PARTDIVIDER_FIXED_PALETTE.length];
}

// [X] 버튼에 연동 - 해당 인덱스의 멤버를 State와 화면에서 즉시 제거
function partDividerRemoveMember(index) {
    if (!partDividerMemberChipList || index < 0 || index >= partDividerMemberChipList.length) return;
    partDividerSyncMemberColorsFromDom(); // 다른 칩들이 직전에 고른 색을 유지한 채로 제거되도록 먼저 동기화
    partDividerMemberChipList.splice(index, 1);
    partDividerRenderMemberChips();
}

// 칩의 색상 선택기(input type=color)에 연동 - 해당 멤버의 가사 박스 배경색으로 쓰일 색상을 State에 저장
function partDividerSetMemberColor(index, color) {
    if (!partDividerMemberChipList || index < 0 || index >= partDividerMemberChipList.length) return;
    partDividerMemberChipList[index].color = partDividerSafeColor(color);
    partDividerRefreshDistributedColors();
}

// 색상 선택기에서 색이 바뀌면, 이미 화면에 분배되어 있는 결과에도 해당 멤버의 색을 즉시 반영한다.
// (방을 개설해 이미 참가자들에게 전송까지 마친 상태라면, 색상 변경도 조용히 파이어베이스에 함께 반영해 뷰어 화면도 같이 갱신되게 한다.)
function partDividerRefreshDistributedColors() {
    if (!Array.isArray(partDividerCurrentLines) || partDividerCurrentLines.length === 0) return;

    const colorByName = {};
    partDividerMemberChipList.forEach(chip => { colorByName[chip.name] = partDividerSafeColor(chip.color); });

    let changed = false;
    partDividerCurrentLines.forEach(line => {
        const newColor = colorByName[line.member];
        if (newColor && line.color !== newColor) {
            line.color = newColor;
            changed = true;
        }
    });
    if (!changed) return;

    partDividerLastResultHtml = partDividerLinesToHtml(partDividerCurrentLines);
    const resultBox = document.getElementById('partDividerResult');
    if (resultBox) resultBox.innerHTML = partDividerLastResultHtml;

    if (partDividerIsAdmin && partDividerJoinedRoomCode) {
        set(ref(partDividerDb, `syncroom/rooms/${partDividerJoinedRoomCode}/lines`), partDividerCurrentLines)
            .catch(err => console.error('색상 변경 실시간 반영 실패:', err));
    }
}

// 화면에 이미 그려진 칩들의 색상 선택기(input type=color) 값을 State(partDividerMemberChipList)로 다시 읽어들인다.
// (주의) 색상 선택기의 change 이벤트가 늦게 붙거나 놓치는 경우에 대비한 안전장치 - 칩 목록을 다시 그리기(re-render) 직전에 항상 먼저 호출해,
// 사용자가 방금 고른 색이 재렌더링으로 날아가지 않도록 보장한다.
function partDividerSyncMemberColorsFromDom() {
    const chipsBox = document.getElementById('partDividerMemberChips');
    if (!chipsBox || !partDividerMemberChipList) return;
    chipsBox.querySelectorAll('.partdiv-member-chip').forEach(chipEl => {
        const idx = parseInt(chipEl.getAttribute('data-index'), 10);
        const colorInput = chipEl.querySelector('.partdiv-member-chip-color');
        if (Number.isNaN(idx) || !colorInput || !partDividerMemberChipList[idx]) return;
        partDividerMemberChipList[idx].color = partDividerSafeColor(colorInput.value);
    });
    partDividerRefreshDistributedColors();
}



// 멤버 칩 상태(partDividerMemberChipList)를 기준으로 칩 UI를 다시 그린다.
// 각 칩에는 draggable 속성과 HTML5 Drag & Drop 이벤트 핸들러, 그리고 개별 삭제([X]) 버튼이 붙는다.
function partDividerRenderMemberChips() {
    const chipsBox = document.getElementById('partDividerMemberChips');
    if (!chipsBox) return;

    if (!partDividerMemberChipList || partDividerMemberChipList.length === 0) {
        chipsBox.innerHTML = '';
        return;
    }

    chipsBox.innerHTML = partDividerMemberChipList.map((chip, i) => {
        const isRegistered = !!chip.picUrl;
        const imgSrc = chip.picUrl || PARTDIVIDER_DEFAULT_AVATAR;
        const chipColor = partDividerSafeColor(chip.color);
        return `<div class="partdiv-member-chip ${isRegistered ? '' : 'partdiv-member-chip-unregistered'}"
            draggable="true" data-index="${i}"
            ondragstart="partDividerChipDragStart(event, ${i})"
            ondragover="partDividerChipDragOver(event, ${i})"
            ondragleave="partDividerChipDragLeave(event)"
            ondrop="partDividerChipDrop(event, ${i})"
            ondragend="partDividerChipDragEnd(event)">
            <div class="partdiv-member-chip-avatar-wrap">
                <img src="${imgSrc}" class="partdiv-member-chip-avatar" alt="${escapeHtml(chip.name)}" onerror="this.src='${PARTDIVIDER_DEFAULT_AVATAR}'">
                <button type="button" class="partdiv-member-chip-remove" title="삭제" draggable="false" onclick="event.stopPropagation(); partDividerRemoveMember(${i})">
                    <i class="fi fi-rr-cross-small"></i>
                </button>
                <input type="color" class="partdiv-member-chip-color" draggable="false" value="${chipColor}" title="가사 박스 색상 선택" onclick="event.stopPropagation()" onchange="partDividerSetMemberColor(${i}, this.value)">
            </div>
            <span class="partdiv-member-chip-name">${escapeHtml(chip.name)}</span>
        </div>`;
    }).join('');

    // HTML 속성만으로는 브라우저가 색상 선택기 초기값을 제대로 반영하지 못하는 경우가 있어, 렌더링 직후 값을 한 번 더 명시적으로 지정해준다.
    chipsBox.querySelectorAll('.partdiv-member-chip-color').forEach((input, i) => {
        const chip = partDividerMemberChipList[i];
        if (chip) input.value = partDividerSafeColor(chip.color);
    });
}

// 드래그 시작: 어떤 칩(인덱스)을 옮기는 중인지 기억해두고, 살짝 반투명 처리로 드래그 중임을 표시
function partDividerChipDragStart(event, index) {
    partDividerChipDragSrcIndex = index;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try { event.dataTransfer.setData('text/plain', String(index)); } catch (e) { /* 일부 브라우저 무시 */ }
    }
    if (event.currentTarget) event.currentTarget.classList.add('partdiv-member-chip-dragging');
}

// 다른 칩 위로 드래그해오면: 기본 동작(drop 막기)을 취소하고, 여기 놓일 수 있다는 걸 살짝 여백/스타일로 표시
function partDividerChipDragOver(event, index) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (partDividerChipDragSrcIndex === null || partDividerChipDragSrcIndex === index) return;
    if (event.currentTarget) event.currentTarget.classList.add('partdiv-member-chip-dragover');
}

// 드래그가 벗어나면 드롭 위치 표시를 원상 복구
function partDividerChipDragLeave(event) {
    if (event.currentTarget) event.currentTarget.classList.remove('partdiv-member-chip-dragover');
}

// 실제로 놓였을 때: 내부 배열(State)에서 순서를 바꾸고, 칩 UI를 다시 렌더링(파트 분배 기준도 함께 갱신됨)
function partDividerChipDrop(event, index) {
    event.preventDefault();
    if (event.currentTarget) event.currentTarget.classList.remove('partdiv-member-chip-dragover');

    const srcIndex = partDividerChipDragSrcIndex;
    partDividerChipDragSrcIndex = null;
    if (srcIndex === null || srcIndex === undefined || srcIndex === index) return;

    partDividerSyncMemberColorsFromDom(); // 순서를 바꾸기 전에 각 칩이 직전에 고른 색을 먼저 State에 반영

    const list = partDividerMemberChipList.slice();
    const [moved] = list.splice(srcIndex, 1);
    let targetIndex = index;
    if (srcIndex < targetIndex) targetIndex -= 1; // 원본을 제거하면서 뒤 인덱스들이 하나씩 당겨지는 것을 보정
    list.splice(targetIndex, 0, moved);

    partDividerMemberChipList = list;
    partDividerRenderMemberChips();
}

// 드래그 종료(취소 포함): 남아있을 수 있는 드래그 관련 스타일을 모두 정리
function partDividerChipDragEnd() {
    partDividerChipDragSrcIndex = null;
    document.querySelectorAll('.partdiv-member-chip-dragging, .partdiv-member-chip-dragover').forEach(el => {
        el.classList.remove('partdiv-member-chip-dragging', 'partdiv-member-chip-dragover');
    });
}

// [순서 섞기] 버튼: 멤버 칩 순서를 피셔-예이츠 셔플로 무작위로 섞고 다시 렌더링
function partDividerShuffleMembers() {
    if (!partDividerMemberChipList || partDividerMemberChipList.length < 2) {
        showToast('섞을 멤버가 2명 이상 필요해요.');
        return;
    }

    partDividerSyncMemberColorsFromDom(); // 순서를 섞기 전에 직전에 고른 색을 먼저 State에 반영

    const arr = partDividerMemberChipList.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    partDividerMemberChipList = arr;
    partDividerRenderMemberChips();
    showToast('멤버 순서를 섞었어요!');
}

// 분배된 문단 배열([{member, text, picUrl, color}, ...]) → 결과창 HTML로 변환 (관리자 로컬 분배 / 뷰어 실시간 수신 공용)
function partDividerLinesToHtml(paragraphs) {
    if (!Array.isArray(paragraphs)) return '';
    return paragraphs.map((item, idx) => {
        const textHtml = escapeHtml(item.text || '').replace(/\n/g, '<br>');
        const imgSrc = item.picUrl || PARTDIVIDER_DEFAULT_AVATAR;
        const color = partDividerSafeColor(item.color);
        
        // 관리자일 때만 클릭해서 멤버를 바꿀 수 있도록 이벤트와 스타일 추가
        const clickAttr = partDividerIsAdmin 
            ? `onclick="partDividerOpenMemberSelect(event, ${idx})" style="cursor:pointer;" title="클릭해서 다른 멤버로 변경" class="partdiv-paragraph-person hover:opacity-60 transition-opacity"` 
            : `class="partdiv-paragraph-person"`;

        return `<div class="partdiv-paragraph" style="background:${color}26; border-left: 4px solid ${color}; transition: all 0.2s;">
            <div ${clickAttr}>
                <img src="${imgSrc}" class="partdiv-paragraph-avatar" alt="${escapeHtml(item.member)}" onerror="this.src='${PARTDIVIDER_DEFAULT_AVATAR}'">
                <span class="partdiv-paragraph-name">${escapeHtml(item.member)}</span>
            </div>
            <div class="partdiv-paragraph-text">${textHtml}</div>
        </div>`;
    }).join('');
}

// 클릭한 가사 줄의 멤버를 다음 멤버로 순차 변경
let partDividerMemberSelectDropdown = null;

// 클릭 시 멤버 선택 드롭다운 메뉴 열기 (ALL 항목 포함)
window.partDividerOpenMemberSelect = function(event, lineIdx) {
    if (!partDividerIsAdmin || !partDividerCurrentLines || !partDividerMemberChipList || partDividerMemberChipList.length === 0) return;
    event.stopPropagation(); // 클릭 이벤트 전파 방지

    window.partDividerCloseMemberSelect(); // 기존에 열린 메뉴 닫기

    partDividerMemberSelectDropdown = document.createElement('div');
    partDividerMemberSelectDropdown.className = 'fixed bg-white border border-[#ECEDFA] rounded-xl shadow-lg flex flex-col z-[6000] overflow-hidden p-1';
    partDividerMemberSelectDropdown.style.minWidth = '120px';
    
    // 마우스 클릭 위치 근처에 메뉴 띄우기
    partDividerMemberSelectDropdown.style.left = `${event.clientX}px`;
    partDividerMemberSelectDropdown.style.top = `${event.clientY + 15}px`;

    let html = '';
    
    // 1. 'ALL' (합창) 선택 버튼 추가
    html += `
        <button type="button" class="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-[#5D4037] hover:bg-[#F4EEFF] rounded-lg transition-colors cursor-pointer text-left w-full border-b border-gray-100 mb-1" onclick="partDividerChangeLineToAll(${lineIdx})">
            <div class="w-6 h-6 rounded-full bg-[#22c55e] text-white flex items-center justify-center text-[10px] font-black shrink-0">ALL</div>
            <span class="truncate">전체 (합창)</span>
        </button>
    `;

    // 2. 기존 멤버 목록 나열
    partDividerMemberChipList.forEach((member, mIdx) => {
        const imgSrc = member.picUrl || PARTDIVIDER_DEFAULT_AVATAR;
        html += `
            <button type="button" class="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-[#5D4037] hover:bg-[#F4EEFF] rounded-lg transition-colors cursor-pointer text-left w-full" onclick="partDividerChangeLineMember(${lineIdx}, ${mIdx})">
                <img src="${imgSrc}" class="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-200" onerror="this.src='${PARTDIVIDER_DEFAULT_AVATAR}'">
                <span class="truncate">${escapeHtml(member.name)}</span>
            </button>
        `;
    });

    partDividerMemberSelectDropdown.innerHTML = html;
    document.body.appendChild(partDividerMemberSelectDropdown);

    // 외부 화면을 클릭하면 메뉴가 닫히도록 리스너 추가
    document.addEventListener('click', window.partDividerCloseMemberSelect, { once: true });
};

// 드롭다운 메뉴 닫기
window.partDividerCloseMemberSelect = function() {
    if (partDividerMemberSelectDropdown) {
        partDividerMemberSelectDropdown.remove();
        partDividerMemberSelectDropdown = null;
    }
};

// 'ALL'을 선택했을 때 해당 줄의 파트를 합창으로 변경 (연두색 고정)
window.partDividerChangeLineToAll = function(lineIdx) {
    if (!partDividerIsAdmin || !partDividerCurrentLines) return;

    const currentLine = partDividerCurrentLines[lineIdx];
    
    // ALL 파트 전용 정보 설정 (이름은 ALL, 프사는 기본 아바타, 색상은 연두색 고정)
    currentLine.member = 'ALL';
    currentLine.picUrl = null;
    currentLine.color = '#22c55e'; // 연두색 고정

    // 관리자 화면 즉시 다시 그리기
    partDividerLastResultHtml = partDividerLinesToHtml(partDividerCurrentLines);
    const resultBox = document.getElementById('partDividerResult');
    if (resultBox) resultBox.innerHTML = partDividerLastResultHtml;

    // 참가자(시청자) 화면에도 변경된 사항을 실시간으로 전송
    if (partDividerJoinedRoomCode) {
        set(ref(partDividerDb, `syncroom/rooms/${partDividerJoinedRoomCode}/lines`), partDividerCurrentLines)
            .catch(err => console.error('ALL 파트 수정 실시간 반영 실패:', err));
    }
};

// 개별 멤버로 변경할 때의 함수 (기존에 누락되었을 수 있어 함께 포함)
window.partDividerChangeLineMember = function(lineIdx, memberIdx) {
    if (!partDividerIsAdmin || !partDividerCurrentLines) return;

    const currentLine = partDividerCurrentLines[lineIdx];
    const nextMember = partDividerMemberChipList[memberIdx];
    if (!nextMember) return;

    currentLine.member = nextMember.name;
    currentLine.picUrl = nextMember.picUrl || null;
    currentLine.color = partDividerSafeColor(nextMember.color);

    partDividerLastResultHtml = partDividerLinesToHtml(partDividerCurrentLines);
    const resultBox = document.getElementById('partDividerResult');
    if (resultBox) resultBox.innerHTML = partDividerLastResultHtml;

    if (partDividerJoinedRoomCode) {
        set(ref(partDividerDb, `syncroom/rooms/${partDividerJoinedRoomCode}/lines`), partDividerCurrentLines)
            .catch(err => console.error('개별 파트 수정 실시간 반영 실패:', err));
    }
};

// 드롭다운 메뉴 닫기
window.partDividerCloseMemberSelect = function() {
    if (partDividerMemberSelectDropdown) {
        partDividerMemberSelectDropdown.remove();
        partDividerMemberSelectDropdown = null;
    }
};

// ⭐ 새로 추가된 함수: 'ALL'을 선택했을 때 해당 줄의 파트를 합창으로 변경
window.partDividerChangeLineToAll = function(lineIdx) {
    if (!partDividerIsAdmin || !partDividerCurrentLines) return;

    const currentLine = partDividerCurrentLines[lineIdx];
    
    // ALL 파트 전용 정보 설정 (이름은 ALL, 프사는 기본 아바타, 색상은 연두색 고정)
    currentLine.member = 'ALL';
    currentLine.picUrl = null;
    currentLine.color = '#22c55e'; // 연두색

    // 관리자 화면 즉시 다시 그리기
    partDividerLastResultHtml = partDividerLinesToHtml(partDividerCurrentLines);
    const resultBox = document.getElementById('partDividerResult');
    if (resultBox) resultBox.innerHTML = partDividerLastResultHtml;

    // 참가자(시청자) 화면에도 변경된 사항을 실시간으로 쏘아줌
    if (partDividerJoinedRoomCode) {
        set(ref(partDividerDb, `syncroom/rooms/${partDividerJoinedRoomCode}/lines`), partDividerCurrentLines)
            .catch(err => console.error('ALL 파트 수정 실시간 반영 실패:', err));
    }
};

function partDividerDistribute() {
    // ⭐ 추가: 색상 선택기를 열어둔 채로 바로 분배 버튼을 눌렀을 때, 
    // 변경된 색상이 누락되는 것을 방지하기 위해 분배 직전에 강제 동기화
    partDividerSyncMemberColorsFromDom();

    const lyricsArea = document.getElementById('partDividerLyricsTextarea');
    const resultBox = document.getElementById('partDividerResult');

    const lyrics = lyricsArea ? lyricsArea.value : '';

    if (!lyrics.trim()) {
        showToast('원본 가사를 입력하거나 검색해주세요.');
        return false;
    }
    if (partDividerMemberChipList.length === 0) {
        showToast('멤버를 한 명 이상 입력해주세요.');
        return false;
    }

    // 연속된 빈 줄을 기준으로 가사를 문단 단위로 분리
    const paragraphs = lyrics.split(/\n\s*\n/);
    const resultParagraphs = [];
    let memberIdx = 0;
    paragraphs.forEach(paragraph => {
        const text = paragraph.trim();
        if (!text) return; // 빈 문단은 건너뜀
        const chip = partDividerMemberChipList[memberIdx % partDividerMemberChipList.length];
        memberIdx++;
        resultParagraphs.push({ member: chip.name, text, picUrl: chip.picUrl || null, color: partDividerSafeColor(chip.color) });
    });

    partDividerCurrentLines = resultParagraphs;
    partDividerLastResultHtml = partDividerLinesToHtml(resultParagraphs) || `<div class="partdiv-result-empty">분배할 가사가 없어요.</div>`;
    if (resultBox) resultBox.innerHTML = partDividerLastResultHtml;

    return true;
}

// [파트 분배 및 전송] 버튼: 먼저 문단 단위로 파트를 분배하고, 성공하면 곧바로 참가자들에게 실시간 전송한다.
async function partDividerDistributeAndSync() {
    const ok = partDividerDistribute();
    if (!ok) return; // partDividerDistribute 내부에서 이미 사유를 토스트로 안내함
    await partDividerSyncToFirebase();
}

// 관리자: 분배된 곡 제목/가사 + 가사 데이터를 syncroom/rooms/{방코드} 경로에 저장(set) → 뷰어의 onValue 리스너가 실시간으로 받음
// 동시에 원본 가사를 syncroom/lyrics/{가수명}_{노래제목} 경로에 덮어써서 크루 자체 가사 DB에 영구 저장한다.
async function partDividerSyncToFirebase() {
    if (partDividerSyncing) return;
    if (!partDividerCurrentLines) {
        showToast('먼저 [파트 분배 및 전송]을 눌러 결과를 만들어주세요.');
        return;
    }
    if (!partDividerJoinedRoomCode) {
        showToast('방 코드가 없어요. 방을 다시 생성해주세요.');
        return;
    }

    const artistInput = document.getElementById('partDividerSongArtistInput');
    const titleInput = document.getElementById('partDividerSongTitleInput');
    const lyricsArea = document.getElementById('partDividerLyricsTextarea');
    const songArtist = (artistInput ? artistInput.value : partDividerCurrentSongArtist || '').trim();
    const songTitle = (titleInput ? titleInput.value : partDividerCurrentSongTitle || '').trim();
    partDividerCurrentSongArtist = songArtist;
    partDividerCurrentSongTitle = songTitle;

    const syncBtn = document.getElementById('partDividerDistributeSyncBtn');
    partDividerSyncing = true;
    if (syncBtn) { syncBtn.disabled = true; syncBtn.innerHTML = '<i class="fi fi-rr-spinner"></i> 전송중...'; }

    try {
        await set(partDividerRoomRef(partDividerJoinedRoomCode), {
            songTitle: songTitle,
            songArtist: songArtist,
            lines: partDividerCurrentLines,
            members: partDividerMemberChipList, // ⭐ 멤버도 함께 유지
            updatedAt: Date.now()
        });

        // 크루 자체 가사 DB에 원본 가사를 덮어쓰기 저장 - 다음에 같은 곡을 [가사 불러오기]로 재사용 가능
        if (songArtist && songTitle && lyricsArea) {
            try {
                const key = partDividerLyricsKey(songArtist, songTitle);
                await set(ref(partDividerDb, `syncroom/lyrics/${key}`), {
                    artist: songArtist,
                    title: songTitle,
                    lyrics: lyricsArea.value,
                    updatedAt: Date.now()
                });

                // 방금 저장한 곡을 캐싱된 노래 목록에도 반영해, 새로고침 없이 바로 검색 리스트에 나오게 한다.
                if (partDividerSongLibrary) {
                    const existing = partDividerSongLibrary.find(s => s.key === key);
                    if (existing) {
                        existing.artist = songArtist;
                        existing.title = songTitle;
                        existing.lyrics = lyricsArea.value;
                    } else {
                        partDividerSongLibrary.push({ key, artist: songArtist, title: songTitle, lyrics: lyricsArea.value });
                        partDividerSongLibrary.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
                    }
                    partDividerFilterSongLibrary();
                }
            } catch (saveErr) {
                console.error('크루 가사 DB 저장 실패:', saveErr);
            }
        }

        // (중요) 시청자 난입 방지를 위해 토스트에 방 코드를 노출하지 않는다.
        showToast('참가자들에게 실시간으로 전송하고, 크루 가사 DB에도 저장했어요!');
    } catch (err) {
        console.error(err);
        showToast('전송 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
        partDividerSyncing = false;
        if (syncBtn) { syncBtn.disabled = false; syncBtn.innerHTML = '<i class="fi fi-rr-paper-plane"></i> 파트 분배 및 전송'; }
    }
}

// 페이지 최초 로드 시 ?room=코드 파라미터가 있으면 로비를 건너뛰고 바로 해당 방에 참가자로 자동 입장시킨다.
// (시청자 난입 방지용 초대 링크로 접속했을 때 사용)
async function partDividerHandleUrlAutoJoin() {
    const params = new URLSearchParams(window.location.search);
    let code = (params.get('room') || '').trim().toUpperCase();
    
    // ⭐ URL에 room 파라미터가 없더라도, 최근에 들어가 있던 방이 있다면 가져옴
    if (!code) {
        try { code = (localStorage.getItem('partDividerActiveRoom') || '').trim().toUpperCase(); } catch (e) {}
    }
    if (!code) return false;

    try {
        const snapshot = await get(partDividerRoomRef(code));
        if (!snapshot.exists()) {
            // 방이 그사이에 삭제되었거나 없으면 저장된 기록도 삭제하고 로비에 머뭄
            try { localStorage.removeItem('partDividerActiveRoom'); } catch (e) {}
            partDividerRemoveRoomUrlParam();
            return false;
        }

        partDividerDetachListener();
        partDividerRoomCode = code;
        partDividerJoinedRoomCode = code;
        // 새로고침 시 관리자 여부를 판별 (관리자 세션이 유지중이거나 권한이 있으면 관리자 모드 복원)
        partDividerIsAdmin = !!(isAdmin); 
        partDividerView = 'room';
        partDividerSetRoomUrlParam(code);
        partDividerApplyRoomData(snapshot.val());
        partDividerAttachListener(code);
        return true;
    } catch (err) {
        console.error(err);
        try { localStorage.removeItem('partDividerActiveRoom'); } catch (e) {}
        partDividerRemoveRoomUrlParam();
        return false;
    }
}

// 파트분배기 관련 함수들은 HTML onclick="..." 인라인 속성으로 호출된다.
// script.js가 <script type="module">로 로드되면 모듈 최상위 선언은 window에 자동으로 노출되지 않으므로,
// 인라인 이벤트 핸들러에서 안전하게 호출될 수 있도록 명시적으로 전역(window)에 노출한다.
window.partDividerEnterRoom = partDividerEnterRoom;
window.partDividerCreateNewRoom = partDividerCreateNewRoom;
window.partDividerExitRoom = partDividerExitRoom;
window.partDividerCopyInviteLink = partDividerCopyInviteLink;
window.partDividerCopyRoomCode = partDividerCopyRoomCode;
window.partDividerLoadLyricsFromDb = partDividerLoadLyricsFromDb;
window.partDividerAddMember = partDividerAddMember;
window.partDividerRemoveMember = partDividerRemoveMember;
window.partDividerShuffleMembers = partDividerShuffleMembers;
window.partDividerChipDragStart = partDividerChipDragStart;
window.partDividerChipDragOver = partDividerChipDragOver;
window.partDividerChipDragLeave = partDividerChipDragLeave;
window.partDividerChipDrop = partDividerChipDrop;
window.partDividerChipDragEnd = partDividerChipDragEnd;
window.partDividerDistribute = partDividerDistribute;
window.partDividerDistributeAndSync = partDividerDistributeAndSync;
window.partDividerSyncToFirebase = partDividerSyncToFirebase;
window.partDividerFilterSongLibrary = partDividerFilterSongLibrary;
window.fetchLyricsFromGenius = fetchLyricsFromGenius; // ⭐ 이 줄 추가

function executeDesktopTabChange(tab) { changeTab(tab); }
function executeMobileTabChange(tab) { closeMobileTabMenu(); changeTab(tab); }

function toggleProfileDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if(menu) {
        if(menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); } 
        else { menu.classList.remove('flex'); menu.classList.add('hidden'); }
    }
}

window.addEventListener('click', (e) => {
    ['desktopProfileMenu', 'mobileProfileMenu', 'userAuthMenu_desktop', 'userAuthMenu_mobile'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu && !pMenu.classList.contains('hidden') && !e.target.closest('#desktopAuthContainer') && !e.target.closest('#mobileAuthContainer')) {
            pMenu.classList.add('hidden'); pMenu.classList.remove('flex');
        }
    });
});

// (기존 메뉴 링크는 하드코딩으로 고정되어 관리자 화면에서 추가/수정하지 않으므로,
// 이 탭은 팝업 이미지 등록 정보만 갱신해준다.
function renderLinkManagePanel() {
    if(!isAdmin || !loggedInUser) return;
    renderPopupImgCurrentInfo();
}

// 업링크 관리 탭 - 내가(현재 로그인한 관리자가) 등록해둔 업링크 목록을 보여준다.
// 같은 게시글(링크)에 달린 댓글들은 하나로 묶어서 컨텐츠 제목/마감일자를 한 번에 수정할 수 있도록 한다.
function renderUpLinkManagePanel() {
    if (!isAdmin || !loggedInUser) return;
    const container = document.getElementById('upLinksManageContainer');
    if (!container) return;

    const myUpLinks = [...upLinksList]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (myUpLinks.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 font-bold py-6 text-[13px]">등록된 업링크가 없습니다.</div>`;
        return;
    }

    const items = buildUpLinkRenderItems(myUpLinks);
    container.innerHTML = items.map(item => item.type === 'soopGroup'
        ? buildUpLinkManageGroupHtml(item)
        : buildUpLinkManageNormalHtml(item.up)
    ).join('');
}

// 게시글 하나에 여러 댓글 링크가 묶인 경우 - 제목/마감일자/커트라인을 함께 수정하는 카드
function buildUpLinkManageGroupHtml(item) {
    const key = `${item.stationId}_${item.postId}`;
    const firstUp = item.entries[0].up;
    const title = firstUp.title || '';
    const deadline = firstUp.deadline || '';
    const cutLine = (firstUp.cutLine !== undefined && firstUp.cutLine !== null) ? firstUp.cutLine : '';

    const entriesHtml = item.entries.map(({ up }) => `
        <div class="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-2 gap-2">
            <span class="text-[11px] font-bold shrink-0" style="color:${themeColors[up.member] || '#5D4037'}">${up.member}</span>
            <a href="#" onclick="openSmartLink('${up.url}'); event.preventDefault();" class="text-[12px] text-blue-500 underline truncate flex-1">${up.url}</a>
            <button onclick="deleteUpLink('${up.id}', '${up.source || 'uplinks'}')" class="text-white bg-red-500 w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 transition shrink-0"><i class="fi fi-br-cross-small"></i></button>
        </div>
    `).join('');

    return `
        <div class="bg-white border-2 border-gray-200 rounded-lg p-3 mb-2 flex flex-col gap-2">
            <div class="text-[11px] text-gray-400 font-bold">같은 게시글에 달린 댓글 ${item.entries.length}개 · 제목/마감일자/커트라인 공유</div>
            <div class="flex flex-col sm:flex-row gap-2">
                <input type="text" id="upGroupTitle_${key}" value="${title}" placeholder="컨텐츠 제목" class="flex-1 border-2 border-[#5D4037] rounded-lg p-2 text-sm outline-none focus:border-blue-400">
                <input type="date" id="upGroupDeadline_${key}" value="${deadline}" class="border-2 border-[#5D4037] rounded-lg p-2 text-sm outline-none">
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-600 shrink-0">커트라인:</span>
                <input type="number" id="upGroupCutline_${key}" min="1" step="1" value="${cutLine}" placeholder="선택사항 (예: 10)" class="flex-1 border-2 border-[#5D4037] rounded-lg p-2 text-sm outline-none focus:border-blue-400">
                <button onclick="saveUpLinkGroupInfo('${item.stationId}', '${item.postId}')" class="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition shrink-0">저장</button>
            </div>
            <div class="text-[11px] text-gray-400 font-bold -mt-1">커트라인을 등록하면, 순위표에서 커트라인 밖(순위가 커트라인보다 낮음)인 댓글에 "위기"가 빨간색으로 표시됩니다. 등록하지 않아도 됩니다.</div>
            <div class="flex flex-col gap-1 mt-1">${entriesHtml}</div>
        </div>
    `;
}

// 게시글 댓글 링크가 아닌 일반 업링크 - 기존과 동일하게 개별 수정
function buildUpLinkManageNormalHtml(up) {
    const theme = themeColors[up.member] || '#5D4037';
    return `
        <div class="flex justify-between items-center bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm gap-2">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-bold shrink-0" style="color:${theme}">${up.member}</span>
                    <div class="font-bold text-[14px] text-[#5D4037] truncate">${up.title}</div>
                </div>
                <a href="#" onclick="openSmartLink('${up.url}'); event.preventDefault();" class="text-[12px] text-blue-500 underline truncate block max-w-full">${up.url}</a>
                ${up.deadline ? `<div class="text-[11.5px] text-gray-400 font-bold mt-0.5">마감: ${up.deadline}</div>` : ''}
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="window.openEditUpLink('${up.id}', '${up.source || 'uplinks'}')" class="text-[#5D4037] font-bold text-[13px] border-2 border-[#5D4037] px-2 py-0.5 rounded hover:bg-[#5D4037] hover:text-white transition">수정</button>
                <button onclick="deleteUpLink('${up.id}', '${up.source || 'uplinks'}')" class="text-white bg-red-500 w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 transition"><i class="fi fi-br-cross-small"></i></button>
            </div>
        </div>
    `;
}

// 같은 게시글을 가리키는 모든 업링크(댓글)들의 컨텐츠 제목/마감일자/커트라인을 한 번에 저장한다.
window.saveUpLinkGroupInfo = async function(stationId, postId) {
    const key = `${stationId}_${postId}`;
    const titleInput = document.getElementById(`upGroupTitle_${key}`);
    const deadlineInput = document.getElementById(`upGroupDeadline_${key}`);
    const cutLineInput = document.getElementById(`upGroupCutline_${key}`);
    if (!titleInput) return;

    const title = titleInput.value.trim();
    const deadline = deadlineInput ? deadlineInput.value : '';
    const cutLineRaw = cutLineInput ? cutLineInput.value.trim() : '';
    // 커트라인은 선택사항: 입력하지 않으면 null로 저장(위기 표시 안함)
    const cutLine = cutLineRaw === '' ? null : Number(cutLineRaw);
    if (!title) return alert('컨텐츠 제목을 입력하세요.');
    if (cutLineRaw !== '' && (isNaN(cutLine) || cutLine < 1)) return alert('커트라인은 1 이상의 숫자로 입력하세요.');

    const targets = upLinksList.filter(up => {
        const parsed = parseSoopPostUrl(up.url);
        return parsed && parsed.stationId === stationId && parsed.postId === postId;
    });
    if (targets.length === 0) return;

    try {
        await Promise.all(targets.map(up => {
            const colName = up.source === 'soop' ? 'soop_posts' : 'uplinks';
            return updateDoc(doc(db, colName, up.id), { title, deadline, cutLine });
        }));
        targets.forEach(up => { up.title = title; up.deadline = deadline; up.cutLine = cutLine; });

        renderUpLinksPanel();
        if (isUpModeModalOpen()) renderUpModeModalContent();
        renderUpLinkManagePanel();
        alert('저장되었습니다.');
    } catch (e) {
        console.error('업링크 그룹 정보 저장 실패:', e);
        alert('저장에 실패했습니다.');
    }
};

function openLinkModal() { openManageModal('link'); }
function closeLinkModal() { closeManageModal(); }

async function addUpLink() {
    const title = document.getElementById('upTitle').value.trim();
    const url = document.getElementById('upUrl').value.trim();
    const deadline = document.getElementById('upDeadline').value;
    
    const memberSelect = document.getElementById('upMember');
    const member = memberSelect ? memberSelect.value : loggedInUser.name;

    if(!url) return alert('링크를 입력하세요.');
    
    const newUp = { member, title, url, deadline, timestamp: Date.now() };
    try {
        const docRef = await addDoc(collection(db, 'uplinks'), newUp);
        upLinksList.push({ id: docRef.id, source: 'uplinks', ...newUp });
        alert('업링크가 추가되었습니다.');
        document.getElementById('upTitle').value = ''; 
        document.getElementById('upUrl').value = ''; 
        document.getElementById('upDeadline').value = '';
        if (isUpModeModalOpen()) renderUpModeModalContent();
        renderUpLinkManagePanel();
    } catch(e) { console.error(e); }
}

async function deleteUpLink(upId, source = 'uplinks') {
    if(!confirm('이 업링크를 삭제하시겠습니까?')) return;
    try {
        const colName = source === 'soop' ? 'soop_posts' : 'uplinks';
        await deleteDoc(doc(db, colName, upId));
        
        upLinksList = upLinksList.filter(u => u.id !== upId);
        renderUpLinksPanel();
        if (isUpModeModalOpen()) renderUpModeModalContent();
        renderUpLinkManagePanel();
    } catch(e) { console.error(e); }
}

// =========================================================================
// 디데이(기념일 카운트다운) — 홈탭 UP 해줘! 버튼 위에 D-30부터 표시
// =========================================================================

// 기준일 대비 남은 일수 계산 (KST 자정 기준, 지난 날짜는 음수)
function getDdayDaysLeft(dateStr, todayStr = getTodayYYYYMMDD()) {
    if (!dateStr) return NaN;
    const target = new Date(`${dateStr}T00:00:00+09:00`);
    const today = new Date(`${todayStr}T00:00:00+09:00`);
    return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

async function loadDdaysFromFirebase() {
    try {
        const snap = await getDocs(collection(db, 'ddays'));
        ddaysList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error('디데이 로드 실패:', e);
        ddaysList = [];
    }
    renderHomeDdayBox();
}

// 디데이 카드용 반짝이 파티클 span들을 랜덤 속성으로 생성 (위치/크기/속도/좌우 흔들림)
function generateDdayParticles(count = 14, isToday = false) {
    let html = '';
    for (let i = 0; i < count; i++) {
        if (isToday) {
            const size = (Math.random() * 14 + 8).toFixed(1);
            const left = (Math.random() * 96 + 2).toFixed(1);
            const top = (Math.random() * 90 + 5).toFixed(1);
            const duration = (Math.random() * 2.5 + 1.5).toFixed(2);
            const delay = (Math.random() * -8).toFixed(2);
            const colorPick = Math.random();
            const starColor = colorPick > 0.6 ? '#FFFFFF' : (colorPick > 0.3 ? 'rgb(var(--dday-c1))' : 'rgb(var(--dday-c2))');
            
            html += `<span class="dday-star-particle" style="left:${left}%; top:${top}%; width:${size}px; height:${size}px; --star-duration:${duration}s; --star-delay:${delay}s; background:${starColor};"></span>`;
        } else {
            const size = (Math.random() * 4 + 3).toFixed(1);
            const left = (Math.random() * 96 + 2).toFixed(1);
            const duration = (Math.random() * 4 + 4).toFixed(2);
            const delay = (Math.random() * -8).toFixed(2);
            const drift = (Math.random() * 40 - 20).toFixed(1);
            html += `<span class="dday-particle" style="left:${left}%; bottom:-14px; width:${size}px; height:${size}px; animation-duration:${duration}s; animation-delay:${delay}s; --dday-drift:${drift}px;"></span>`;
        }
    }
    return html;
}

// 홈탭 UP 해줘! 버튼 바로 위 박스 - D-30 이내(당일 포함)로 남은 기념일만 가까운 순으로 표시
function renderHomeDdayBox() {
    const box = document.getElementById('homeDdayBox');
    if (!box) return false;

    const todayStr = getTodayYYYYMMDD();
    const items = ddaysList
        .map(d => ({ ...d, daysLeft: getDdayDaysLeft(d.date, todayStr) }))
        .filter(d => d.date && !isNaN(d.daysLeft) && d.daysLeft >= 0 && d.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft);

    if (items.length === 0) {
        box.classList.add('hidden');
        box.innerHTML = '';
        box.style.backgroundImage = '';
        box.classList.remove('home-dday-box-bg');
        return false;
    }

    const rowsHtml = items.map(d => {
        const dateLabel = (d.date || '').replaceAll('-', '.');
        const isToday = d.daysLeft === 0;
        const theme = DDAY_COLOR_THEMES[d.color] || DDAY_COLOR_THEMES.pink;
        // 물 빠지는 정도: D-30이면 100%(가득 참), D-day면 0%(완전히 빠짐)
        const waterPct = Math.max(0, Math.min(100, (d.daysLeft / 30) * 100));
        const progress = 1 - (waterPct / 100);
        const imgOverlayOpacity = isToday ? '0' : (0.45 - progress * 0.3).toFixed(2);
        const particleOpacity = isToday ? '1' : (0.3 + progress * 0.5).toFixed(2);
        const particleCount = isToday ? 40 : Math.round(5 + progress * 15);
        const waterOpacity = isToday ? '0' : '1';
        const themeVars = `--dday-c1:${theme.c1};--dday-c2:${theme.c2};--dday-badge-bg:${theme.badgeBg};--dday-badge-border:${theme.badgeBorder};--dday-badge-text:${theme.badgeText};--dday-stat-g1:${theme.statG1};--dday-stat-g2:${theme.statG2};--dday-stat-border:${theme.statBorder};--dday-stat-shadow:${theme.statShadow};--dday-stat-label:${theme.statLabel};--dday-water-pct:${waterPct}%;--dday-img-overlay-opacity:${imgOverlayOpacity};--dday-particle-opacity:${particleOpacity};--dday-water-opacity:${waterOpacity};`;
        const cardImage = d.image || ddayBgImageUrl;
        
        const bgImageStyle = cardImage
                ? `--dday-img: url('${cardImage}');--dday-img-pos: ${d.image ? (d.imagePos || '50% 50%') : '50% 50%'};`
                : '';            
        const message = (d.message || '').trim() || '함께 손꼽아 기다려요!';
        return `
        <div class="dday-hero-card${cardImage ? ' dday-hero-card-img' : ''}" style="${themeVars}${bgImageStyle}">
            ${(cardImage && !isToday) ? '<div class="dday-hero-img-overlay"></div>' : ''}
            ${!isToday ? '<div class="dday-hero-water"></div>' : ''}
            <div class="dday-hero-particles">${generateDdayParticles(particleCount, isToday)}</div>
            <div class="dday-hero-text">
                <span class="dday-hero-badge">${escapeHtml(dateLabel)} COUNTDOWN</span>
                <div class="dday-hero-title font-paperozi">${escapeHtml(d.title || '기념일')}까지</div>
                <div class="dday-hero-sub">${escapeHtml(message)}</div>
                <div class="dday-hero-stat-row">
                    <div class="dday-hero-stat">
                        <div class="dday-hero-stat-num">${isToday ? 'D-DAY' : d.daysLeft}</div>
                        ${isToday ? '' : '<div class="dday-hero-stat-label">DAYS</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
    }).join('');

    box.classList.remove('home-dday-box-bg');
    box.style.backgroundImage = '';
    box.innerHTML = rowsHtml;
    box.classList.remove('hidden');
    return true;
}

// 디데이 등록 폼: 디데이별 배경 이미지 (링크 입력 또는 파일 업로드)
// 디데이 등록 폼: 이미지 미리보기에 표시되는 포커스 위치 (드래그로 조절, % 단위)
let ddayImagePosX = 50;
let ddayImagePosY = 50;
let ddayImageDragActive = false;

function setDdayImagePosition(x, y) {
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    ddayImagePosX = x;
    ddayImagePosY = y;
    const preview = document.getElementById('ddayImagePreview');
    const dot = document.getElementById('ddayImagePreviewDot');
    if (preview) preview.style.backgroundPosition = `${x}% ${y}%`;
    if (dot) { dot.style.left = `${x}%`; dot.style.top = `${y}%`; }
}

function ddayImageEventToPercent(e, rect) {
    const point = e.touches && e.touches.length > 0 ? e.touches[0] : e;
    const x = ((point.clientX - rect.left) / rect.width) * 100;
    const y = ((point.clientY - rect.top) / rect.height) * 100;
    return { x, y };
}

// 미리보기 영역을 드래그(마우스/터치)하면 이미지의 포커스 위치가 실시간으로 바뀐다
function initDdayImageDrag() {
    const preview = document.getElementById('ddayImagePreview');
    if (!preview || preview.dataset.dragBound) return;
    preview.dataset.dragBound = '1';

    const moveDrag = (e) => {
        if (!ddayImageDragActive) return;
        const rect = preview.getBoundingClientRect();
        const { x, y } = ddayImageEventToPercent(e, rect);
        setDdayImagePosition(x, y);
        e.preventDefault();
    };
    const startDrag = (e) => {
        ddayImageDragActive = true;
        moveDrag(e);
    };
    const endDrag = () => { ddayImageDragActive = false; };

    preview.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    preview.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);
}

// 미리보기에 이미지를 표시한다 (posX/posY 미지정 시 중앙(50,50)으로 초기화)
function setDdayPreviewImage(url, posX = 50, posY = 50) {
    const wrap = document.getElementById('ddayImagePreviewWrap');
    const preview = document.getElementById('ddayImagePreview');
    if (!preview) return;
    if (url) {
        preview.style.backgroundImage = `url('${url}')`;
        if (wrap) wrap.classList.remove('hidden');
        initDdayImageDrag();
        setDdayImagePosition(posX, posY);
    } else {
        preview.style.backgroundImage = '';
        if (wrap) wrap.classList.add('hidden');
        setDdayImagePosition(50, 50);
    }
}

function switchDdayImgTab(tab) {
    const urlSection = document.getElementById('ddayImageUrlSection');
    const fileSection = document.getElementById('ddayImageFileSection');
    const tabUrl = document.getElementById('ddayImgTabUrl');
    const tabFile = document.getElementById('ddayImgTabFile');
    if (!urlSection || !fileSection) return;
    if (tab === 'url') {
        urlSection.classList.remove('hidden');
        fileSection.classList.add('hidden');
        tabUrl.classList.add('bg-[#5D4037]', 'text-white');
        tabUrl.classList.remove('bg-white', 'text-[#5D4037]');
        tabFile.classList.add('bg-white', 'text-[#5D4037]');
        tabFile.classList.remove('bg-[#5D4037]', 'text-white');
    } else {
        urlSection.classList.add('hidden');
        fileSection.classList.remove('hidden');
        tabFile.classList.add('bg-[#5D4037]', 'text-white');
        tabFile.classList.remove('bg-white', 'text-[#5D4037]');
        tabUrl.classList.add('bg-white', 'text-[#5D4037]');
        tabUrl.classList.remove('bg-[#5D4037]', 'text-white');
    }
}

function previewDdayImageFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        setDdayPreviewImage(e.target.result, 50, 50);
    };
    reader.readAsDataURL(file);
}

function previewDdayImageUrl(input) {
    const url = input.value.trim();
    setDdayPreviewImage(url, 50, 50);
}

// 디데이 등록 폼의 이미지 입력 영역을 초기 상태로 되돌린다 (등록 완료 후 / 모달 오픈 시 호출)
function resetDdayImageForm() {
    const urlInput = document.getElementById('ddayImageUrlText');
    const fileInput = document.getElementById('ddayImageFile');
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    setDdayPreviewImage('');
    switchDdayImgTab('url');
}

// 관리자 > 관리 > 디데이 관리 탭: 등록된 기념일 전체를 날짜 가까운 순으로 보여준다 (D-30 밖이어도 관리 목록에는 항상 표시)
function renderDdayManagePanel() {
    if (!isAdmin || !loggedInUser) return;
    const container = document.getElementById('ddayManageContainer');
    if (!container) return;

    if (ddaysList.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 font-bold py-6 text-[13px]">등록된 디데이가 없습니다.</div>`;
        return;
    }

    const todayStr = getTodayYYYYMMDD();
    const sorted = [...ddaysList].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    container.innerHTML = sorted.map(d => {
        const daysLeft = getDdayDaysLeft(d.date, todayStr);
        const label = daysLeft === 0 ? 'D-DAY' : (daysLeft > 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`);
        const theme = DDAY_COLOR_THEMES[d.color] || DDAY_COLOR_THEMES.pink;
        const thumb = d.image
            ? `<img src="${d.image}" class="w-10 h-10 rounded-lg object-cover border-2 border-gray-200 shrink-0">`
            : `<span class="w-10 h-10 rounded-lg shrink-0" style="background:${theme.swatch};"></span>`;
        return `
        <div class="flex justify-between items-center bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm gap-2">
            ${thumb}
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${theme.swatch};"></span>
                    <span class="text-[11px] font-bold shrink-0 text-blue-600">${label}</span>
                    <div class="font-bold text-[14px] text-[#5D4037] truncate">${escapeHtml(d.title || '기념일')}</div>
                </div>
                <div class="text-[11.5px] text-gray-400 font-bold mt-0.5">${d.date}${d.message ? ' · ' + escapeHtml(d.message) : ''}</div>
            </div>
            <button onclick="startEditDday('${d.id}')" class="text-white bg-blue-500 w-6 h-6 rounded flex items-center justify-center hover:bg-blue-600 transition shrink-0"><i class="fi fi-rr-edit"></i></button>
            <button onclick="deleteDday('${d.id}')" class="text-white bg-red-500 w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 transition shrink-0"><i class="fi fi-br-cross-small"></i></button>
        </div>`;
    }).join('');
}

async function addDday() {
    const titleInput = document.getElementById('ddayTitle');
    const dateInput = document.getElementById('ddayDate');
    const messageInput = document.getElementById('ddayMessage');
    const title = titleInput.value.trim();
    const date = dateInput.value;
    const message = messageInput ? messageInput.value.trim() : '';
    const color = DDAY_COLOR_THEMES[selectedDdayColor] ? selectedDdayColor : 'pink';

    if (!date) return alert('날짜를 선택하세요.');
    if (!title) return alert('기념일 제목을 입력하세요.');

    let imageUrl = document.getElementById('ddayImageUrlText') ? document.getElementById('ddayImageUrlText').value.trim() : '';
    const imagePos = imageUrl ? `${Math.round(ddayImagePosX)}% ${Math.round(ddayImagePosY)}%` : '';
    const imageFileInput = document.getElementById('ddayImageFile');
    let toast = null;

    try {
        if (imageFileInput && imageFileInput.files.length > 0) {
            toast = document.createElement('div');
            toast.innerText = '이미지를 업로드 중 입니다..⏳';
            toast.className = 'fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-[#5D4037] text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold font-paperozi transition-opacity duration-300 opacity-0';
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.remove('opacity-0'));

            const url = await window.uploadImageToCloudinary(imageFileInput.files[0]);
            if (url) imageUrl = url;

            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
            toast = null;
        }

        if (editingDdayId) {
            // 수정 모드: 기존 문서를 갱신
            const updatedDday = { title, date, color, message, image: imageUrl, imagePos };
            await updateDoc(doc(db, 'ddays', editingDdayId), updatedDday);
            const idx = ddaysList.findIndex(d => d.id === editingDdayId);
            if (idx !== -1) ddaysList[idx] = { ...ddaysList[idx], ...updatedDday };
            alert('디데이가 수정되었습니다.');
        } else {
            // 신규 등록 모드
            const newDday = { title, date, color, message, image: imageUrl, imagePos, timestamp: Date.now() };
            const docRef = await addDoc(collection(db, 'ddays'), newDday);
            ddaysList.push({ id: docRef.id, ...newDday });
            alert('디데이가 추가되었습니다.');
        }

        cancelEditDday();
        renderDdayManagePanel();
        renderHomeDdayBox();
    } catch (e) {
        console.error('디데이 저장 실패:', e);
        alert(editingDdayId ? '수정에 실패했습니다.' : '추가에 실패했습니다.');
        if (toast) toast.remove();
    }
}

// 디데이 관리 목록에서 수정 버튼 클릭 시: 등록 폼에 기존 값을 채워넣고 수정 모드로 전환
function startEditDday(ddayId) {
    const d = ddaysList.find(x => x.id === ddayId);
    if (!d) return;

    editingDdayId = ddayId;

    const titleInput = document.getElementById('ddayTitle');
    const dateInput = document.getElementById('ddayDate');
    const messageInput = document.getElementById('ddayMessage');
    if (titleInput) titleInput.value = d.title || '';
    if (dateInput) dateInput.value = d.date || '';
    if (messageInput) messageInput.value = d.message || '';

    resetDdayImageForm();
    if (d.image) {
        const urlInput = document.getElementById('ddayImageUrlText');
        if (urlInput) urlInput.value = d.image;
        let px = 50, py = 50;
        if (d.imagePos) {
            const parts = d.imagePos.replace(/%/g, '').trim().split(/\s+/).map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { px = parts[0]; py = parts[1]; }
        }
        setDdayPreviewImage(d.image, px, py);
    }

    selectDdayColor(DDAY_COLOR_THEMES[d.color] ? d.color : 'pink');

    const submitBtn = document.getElementById('ddaySubmitBtn');
    if (submitBtn) submitBtn.innerText = '수정 완료';
    const cancelBtn = document.getElementById('ddayCancelEditBtn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    const formSection = document.getElementById('manageTabPanel_dday');
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 수정 모드를 취소하고 등록 폼을 신규 등록 상태로 되돌린다
function cancelEditDday() {
    editingDdayId = null;
    const titleInput = document.getElementById('ddayTitle');
    const dateInput = document.getElementById('ddayDate');
    const messageInput = document.getElementById('ddayMessage');
    if (titleInput) titleInput.value = '';
    if (dateInput) dateInput.value = '';
    if (messageInput) messageInput.value = '';
    resetDdayImageForm();
    selectDdayColor('pink');

    const submitBtn = document.getElementById('ddaySubmitBtn');
    if (submitBtn) submitBtn.innerText = '디데이 추가';
    const cancelBtn = document.getElementById('ddayCancelEditBtn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function deleteDday(ddayId) {
    if (!confirm('이 디데이를 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'ddays', ddayId));
        ddaysList = ddaysList.filter(d => d.id !== ddayId);
        if (editingDdayId === ddayId) cancelEditDday();
        renderDdayManagePanel();
        renderHomeDdayBox();
    } catch (e) {
        console.error('디데이 삭제 실패:', e);
        alert('삭제에 실패했습니다.');
    }
}

function toggleUpPanel() {
    if (isUpModeModalOpen()) closeUpModeModal();
    else openUpModeModal();
}
function toggleMemoPanel() {
    if (sidePanelMode === 'MEMO') closeSidePanel();
    else openSidePanel('MEMO');
}
function toggleCinetiPanel() {
    if (sidePanelMode === 'CINETI') closeSidePanel();
    else openSidePanel('CINETI');
}
window.toggleCinetiPanel = toggleCinetiPanel;
function toggleArtistPanel() {
    if (sidePanelMode === 'ARTIST') closeSidePanel();
    else openSidePanel('ARTIST');
}
window.toggleArtistPanel = toggleArtistPanel;
function closeSidePanelUser() {
    if (sidePanelMode === 'ARTIST') return; 
    closeSidePanel();
}
window.closeSidePanelUser = closeSidePanelUser;

function closeSidePanel(instant = false) {
    sidePanelMode = null;
    const panel = document.getElementById('sideExpansionPanel');
    const mobileOverlay = document.getElementById('mobilePanelOverlay');
    
    if(isMobile) {
        panel.classList.remove('translate-y-0', 'opacity-100');
        panel.classList.add('translate-y-full', 'opacity-0');
        if(mobileOverlay) { mobileOverlay.classList.remove('block'); mobileOverlay.classList.add('hidden'); }
    } else {
        panel.classList.remove('h-[890px]', 'opacity-100');
        panel.classList.add('h-0', 'opacity-0');
    }
    
    if (instant) {
        panel.classList.add('hidden'); panel.classList.remove('flex');
        // 이미 안 보이는 상태이므로 지금 초기화해도 움직임이 화면에 보이지 않음
        resetPanelPositionStyles(panel);
    } else {
        setTimeout(() => {
            if (sidePanelMode === null) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
            // 완전히 사라진 뒤에 위치·크기를 초기화해서, 드래그로 옮겨둔 자리에서 그대로 페이드아웃되고
            // "제자리로 돌아왔다가 꺼지는" 모션 없이 바로 닫히게 함
            resetPanelPositionStyles(panel);
        }, 300);
    }
}

function resetPanelPositionStyles(panel) {
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.margin = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.zIndex = '';
    panel.style.transition = '';
}

// ===== 사이드 패널(메모/시네티 등) PC 전용 드래그 이동 & 크기 조절 =====
let panelDragState = null;
let panelResizeState = null;

function startPanelDrag(e) {
    if (isMobile) return;
    if (e.target.closest('button')) return; // 헤더 안의 버튼(고정/닫기) 클릭 시엔 드래그 방지
    e.preventDefault();

    const panel = document.getElementById('sideExpansionPanel');
    const rect = panel.getBoundingClientRect();

    // 드래그 중 시네티(iframe)가 마우스 이벤트를 가로채지 못하도록 차단
    const iframe = panel.querySelector('iframe');
    if (iframe) iframe.style.pointerEvents = 'none';

    panel.style.position = 'fixed';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.margin = '0';
    panel.style.width = rect.width + 'px';
    panel.style.height = rect.height + 'px';
    panel.style.zIndex = '4500';
    panel.style.transition = 'none'; 

    panelDragState = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: rect.left,
        startTop: rect.top
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onPanelDragMove);
    document.addEventListener('mouseup', onPanelDragEnd);
}
window.startPanelDrag = startPanelDrag;

function onPanelDragMove(e) {
    if (!panelDragState) return;
    const panel = document.getElementById('sideExpansionPanel');

    let newLeft = panelDragState.startLeft + (e.clientX - panelDragState.startX);
    let newTop = panelDragState.startTop + (e.clientY - panelDragState.startY);

    // 화면 밖으로 완전히 벗어나지 않도록 제한
    const maxLeft = window.innerWidth - Math.min(panel.offsetWidth, window.innerWidth);
    const maxTop = window.innerHeight - Math.min(panel.offsetHeight, window.innerHeight);
    newLeft = Math.max(0, Math.min(newLeft, Math.max(0, maxLeft)));
    newTop = Math.max(0, Math.min(newTop, Math.max(0, maxTop)));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
}

function onPanelDragEnd() {
    panelDragState = null;
    document.body.style.userSelect = '';
    const panel = document.getElementById('sideExpansionPanel');
    
    if (panel) {
        if (sidePanelMode !== 'CINETI') panel.style.transition = ''; 
        
        // 드래그가 끝나면 iframe 마우스 이벤트 다시 복구
        const iframe = panel.querySelector('iframe');
        if (iframe) iframe.style.pointerEvents = '';
    }
    
    document.removeEventListener('mousemove', onPanelDragMove);
    document.removeEventListener('mouseup', onPanelDragEnd);
}

function startPanelResize(e, dir) {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();

    const panel = document.getElementById('sideExpansionPanel');
    const rect = panel.getBoundingClientRect();

    // 크기 조절 중 시네티(iframe)가 마우스 이벤트를 가로채지 못하도록 차단
    const iframe = panel.querySelector('iframe');
    if (iframe) iframe.style.pointerEvents = 'none';

    panel.style.position = 'fixed';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.margin = '0';
    panel.style.zIndex = '4500';
    panel.style.transition = 'none';

    panelResizeState = {
        dir: dir || 'se',
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        startTop: rect.top,
        startLeft: rect.left
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onPanelResizeMove);
    document.addEventListener('mouseup', onPanelResizeEnd);
}
window.startPanelResize = startPanelResize;

function onPanelResizeMove(e) {
    if (!panelResizeState) return;
    const panel = document.getElementById('sideExpansionPanel');
    const state = panelResizeState;

    const MIN_W = 320, MIN_H = 200;

    let newWidth = state.startWidth;
    let newHeight = state.startHeight;
    let newLeft = state.startLeft;
    let newTop = state.startTop;

    // 가로 크기 조절
    if (state.dir.includes('e')) {
        newWidth = state.startWidth + (e.clientX - state.startX);
    } else if (state.dir.includes('w')) {
        const diff = e.clientX - state.startX;
        newWidth = state.startWidth - diff;
        newLeft = state.startLeft + diff;
    }

    // 세로 크기 조절
    if (state.dir.includes('s')) {
        newHeight = state.startHeight + (e.clientY - state.startY);
    } else if (state.dir.includes('n')) {
        const diff = e.clientY - state.startY;
        newHeight = state.startHeight - diff;
        newTop = state.startTop + diff;
    }

    // 최소 크기 방어선
    if (newWidth < MIN_W) {
        if (state.dir.includes('w')) newLeft -= (MIN_W - newWidth);
        newWidth = MIN_W;
    }
    if (newHeight < MIN_H) {
        if (state.dir.includes('n')) newTop -= (MIN_H - newHeight);
        newHeight = MIN_H;
    }

    // 변경된 값 적용 (비율 고정 없이 자유롭게 크기 조절)
    panel.style.width = newWidth + 'px';
    panel.style.height = newHeight + 'px';
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
}

function onPanelResizeEnd() {
    panelResizeState = null;
    document.body.style.userSelect = '';
    const panel = document.getElementById('sideExpansionPanel');
    
    if (panel) {
        if (sidePanelMode !== 'CINETI') panel.style.transition = '';
        
        // 크기 조절이 끝나면 iframe 마우스 이벤트 다시 복구
        const iframe = panel.querySelector('iframe');
        if (iframe) iframe.style.pointerEvents = '';
    }

    document.removeEventListener('mousemove', onPanelResizeMove);
    document.removeEventListener('mouseup', onPanelResizeEnd);
}

function openSidePanel(mode) {
    sidePanelMode = mode;
    const panel = document.getElementById('sideExpansionPanel');
    const mobileOverlay = document.getElementById('mobilePanelOverlay');
    
    panel.classList.remove('hidden'); panel.classList.add('flex');
    if(isMobile && mobileOverlay) { mobileOverlay.classList.remove('hidden'); mobileOverlay.classList.add('block'); }

    if (!isMobile) {
        if (panel.style.position !== 'fixed') {
            if (mode === 'ARTIST') {
                panel.style.top = '-10px';
            } else if (mode === 'CINETI') {
                // 시네티 초기 팝업: 이미지처럼 우측에 세로로 긴(모바일 뷰) 형태로 배치
                panel.style.position = 'fixed';
                panel.style.width = '420px';  // 가로폭 
                panel.style.height = '860px'; // 세로로 길게
                panel.style.top = '90px';     // 캘린더 윗선과 비슷한 위치
                panel.style.right = '40px';   // 우측 여백
                panel.style.left = 'auto';
                panel.style.bottom = 'auto';
                panel.style.zIndex = '4500';
                panel.style.borderRadius = '16px';
                panel.style.transition = 'none'; // 애니메이션 끄기
            } else {
                panel.style.top = '';
            }
        } else if (mode === 'CINETI') {
            panel.style.transition = 'none'; 
        }
    }
    
    if (mode === 'MEMO') {
        const memos = memoList[currentPage] || [];
        const contentHtml = memos.map(memo => `
            <div class="bg-white p-4 rounded-xl relative shadow-md mb-4 transition" 
                 oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { event.preventDefault(); event.stopPropagation(); window.openMemoEditModal('${memo.id}'); }">
                ${isAdmin ? `
                <div class="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <button onclick="openMemoEditModal('${memo.id}')" class="text-[#5D4037] hover:text-[#8D6E63] font-bold p-1"><i class="fi fi-rr-edit"></i></button>
                    <button onclick="deleteMemo('${memo.id}')" class="text-[#5D4037] hover:text-red-500 font-bold p-1"><i class="fi fi-br-cross-small"></i></button>
                </div>` : ''}
                <div class="text-[13px] font-bold text-gray-500 mb-2 pointer-events-none pr-14">${memo.date || ''}</div>
                <div class="text-[16px] font-medium text-[#5D4037] whitespace-pre-wrap leading-relaxed pointer-events-none pr-14">${memo.content}</div>
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="p-6 bg-white/15 backdrop-blur-lg flex justify-between items-center shadow-sm z-10 shrink-0" ${isMobile ? 'onmousedown="startPanelDrag(event)"' : ''}>
                <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                    <i class="fi fi-rr-edit"></i> ${currentPage} 메모장
                </div>
                ${isMobile ? `
                <div class="flex items-center gap-3">
                    <button onclick="toggleMemoPin()" title="고정" class="w-9 h-9 flex items-center justify-center text-xl transition ${memoPinned ? 'text-[#5D4037]' : 'text-gray-300 hover:text-gray-400'}"><i class="fi fi-rr-thumbtack"></i></button>
                    <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
                </div>` : ''}
            </div>
            <div class="flex-1 p-5 pb-24 bg-white overflow-y-auto modal-scroll w-full">
                ${contentHtml || '<div class="text-center text-gray-400 font-bold mt-16 text-lg">저장된 메모가 없습니다.</div>'}
            </div>
            ${isAdmin ? `<button onclick="openMemoAddModal()" class="absolute bottom-5 right-5 w-14 h-14 flex items-center justify-center bg-[#5D4037] text-white rounded-full font-bold hover:brightness-110 shadow-lg transition z-20 text-xl"><i class="fi fi-br-plus"></i></button>` : ''}
        `;
    } else if (mode === 'UP') {
        renderUpLinksPanel();
    } else if (mode === 'ARTIST') {
        renderArtistSidePanel();
    } else if (mode === 'CINETI') {
        panel.innerHTML = `
            <!-- 상하좌우, 대각선 크기 조절 핸들 (투명) -->
            <div class="hidden lg:block absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-30" onmousedown="startPanelResize(event, 'n')"></div>
            <div class="hidden lg:block absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-30" onmousedown="startPanelResize(event, 's')"></div>
            <div class="hidden lg:block absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize z-30" onmousedown="startPanelResize(event, 'w')"></div>
            <div class="hidden lg:block absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize z-30" onmousedown="startPanelResize(event, 'e')"></div>
            <div class="hidden lg:block absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-40" onmousedown="startPanelResize(event, 'nw')"></div>
            <div class="hidden lg:block absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-40" onmousedown="startPanelResize(event, 'ne')"></div>
            <div class="hidden lg:block absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-40" onmousedown="startPanelResize(event, 'sw')"></div>
            <div class="hidden lg:block absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-40 flex items-center justify-center text-[#5D4037]/50 hover:text-[#5D4037] transition" onmousedown="startPanelResize(event, 'se')">
                <i class="fi fi-rr-arrow-small-down text-[14px]" style="transform: rotate(-45deg);"></i>
            </div>

            <!-- 세로로 긴 팝업에 어울리도록 폰트 사이즈 조정 -->
            <div class="p-3 bg-white/15 backdrop-blur-lg flex justify-between items-center shadow-sm z-10 shrink-0 lg:cursor-move" onmousedown="startPanelDrag(event)">
                <div class="text-[18px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2 pointer-events-none ml-2">
                    <i class="fi fi-rr-video-camera-alt"></i> 시네티
                </div>
                <button onclick="closeSidePanel()" class="text-2xl text-[#5D4037] hover:text-red-500 cursor-pointer z-50 mr-1"><i class="fi fi-rr-cross-small"></i></button>
            </div>
            <div class="flex-1 w-full bg-white overflow-hidden relative">
                <iframe src="https://cineti-mu.vercel.app/" title="시네티" class="w-full h-full border-0" allow="clipboard-write; fullscreen"></iframe>
            </div>
        `;
    }

    requestAnimationFrame(() => {
        if(isMobile) {
            panel.classList.remove('translate-y-full', 'opacity-0'); panel.classList.add('translate-y-0', 'opacity-100');
        } else {
            panel.classList.remove('h-0', 'opacity-0');
            if (mode === 'CINETI') {
                panel.classList.add('opacity-100');
                panel.classList.remove('h-[890px]'); 
            } else {
                panel.classList.add('h-[890px]', 'opacity-100');
            }
        }
    });
}

function toggleMemoPin() {
    memoPinned = !memoPinned;
    localStorage.setItem('memoBoardPinned', memoPinned ? 'true' : 'false');
    if (sidePanelMode === 'MEMO') openSidePanel('MEMO');
}
window.toggleMemoPin = toggleMemoPin;

function openMemoAddModal() {
    currentEditingMemoId = null;
    document.getElementById('memoModalTitle').innerText = '메모 추가';
    
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    document.getElementById('memoDate').value = kstTime.toISOString().split('T')[0];
    
    document.getElementById('memoContent').value = '';

    setupMemoButtons();
    document.getElementById('memoModal').classList.replace('hidden', 'flex');
}

function openMemoEditModal(memoId) {
    if (!isAdmin) return;
    const memo = memoList[currentPage].find(m => m.id === memoId);
    if (!memo) return;
    currentEditingMemoId = memoId;
    document.getElementById('memoModalTitle').innerText = '메모 수정';
    document.getElementById('memoDate').value = memo.date || '';
    document.getElementById('memoContent').value = memo.content || '';

    setupMemoButtons();
    document.getElementById('memoModal').classList.replace('hidden', 'flex');
}

function setupMemoButtons() {
    const memoModal = document.getElementById('memoModal');
    if (!memoModal) return;

    const btnContainer = memoModal.querySelector('.flex.gap-2') || 
                         memoModal.querySelector('.flex.justify-end') || 
                         memoModal.querySelector('.flex.gap-3') || 
                         memoModal.querySelector('.modal-content > div:last-child');
    
    if (btnContainer) {
        btnContainer.className = "flex gap-3 w-full mt-6"; 
        btnContainer.innerHTML = `
            <button type="button" onclick="closeMemoModal()" class="flex-1 bg-gray-400 text-white font-bold text-[24px] py-5 rounded-xl hover:bg-gray-500 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] font-paperozi cursor-pointer">
                취소
            </button>
            <button type="button" onclick="saveMemoAction()" class="flex-1 bg-[#5D4037] text-white font-bold text-[24px] py-5 rounded-xl hover:brightness-110 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] font-paperozi cursor-pointer">
                저장
            </button>
        `;
    }
}

function closeMemoModal() {
    document.getElementById('memoModal').classList.replace('flex', 'hidden');
}

async function saveMemoAction() {
    const date = document.getElementById('memoDate').value;
    const content = document.getElementById('memoContent').value.trim();
    if(!content) return alert('내용을 입력하세요.');

    const colName = memoCollectionMap[currentPage];
    if (!colName) return;

    try {
        if (currentEditingMemoId) {
            await updateDoc(doc(db, colName, currentEditingMemoId), { date, content });
            const m = memoList[currentPage].find(x => x.id === currentEditingMemoId);
            if(m) { m.date = date; m.content = content; }
        } else {
            const docRef = await addDoc(collection(db, colName), { date, content, timestamp: Date.now() });
            if(!memoList[currentPage]) memoList[currentPage] = [];
            memoList[currentPage].unshift({ id: docRef.id, collectionName: colName, date, content, timestamp: Date.now() });
        }
        saveScheduleCache();
        closeMemoModal();
        if (sidePanelMode === 'MEMO') openSidePanel('MEMO');
    } catch(e) { console.error('메모 저장 실패:', e); }
}

async function deleteMemo(memoId) {
    if(!confirm('해당 메모를 삭제하시겠습니까?')) return;
    const colName = memoCollectionMap[currentPage];
    try {
        await deleteDoc(doc(db, colName, memoId));
        memoList[currentPage] = memoList[currentPage].filter(m => m.id !== memoId);
        saveScheduleCache();
        if (sidePanelMode === 'MEMO') openSidePanel('MEMO');
    } catch(e) { console.error('메모 삭제 실패:', e); }
}

async function renderUpLinksPanel() {
    const panel = document.getElementById('sideExpansionPanel');
    const sorted = [...getVisibleUpLinks()].sort(sortUpLinksComparator);
    updateHomeUpButtonVisibility();

    panel.innerHTML = `
        <div class="p-6 bg-white/15 backdrop-blur-lg flex justify-between items-center shadow-sm z-10 shrink-0">
            <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <i class="fi fi-rr-arrow-up-right"></i> UP 해줘!
            </div>
            <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
        </div>
        <div id="upLinksPanelBody" class="flex-1 p-5 bg-white overflow-y-auto modal-scroll">
            ${sorted.length === 0 ? `<div class="h-full min-h-[240px] flex items-center justify-center text-center text-gray-400 font-bold text-lg">등록된 UP 링크가 없습니다.</div>` : `<div class="h-full min-h-[240px] flex items-center justify-center text-center text-gray-400 font-bold text-lg">불러오는 중...⏳</div>`}
        </div>
    `;

    if (sorted.length === 0) return;

    const bodyEl = document.getElementById('upLinksPanelBody');
    if (bodyEl) {
        // 카드가 다 준비될 때까지 기다리지 않고, 준비되는 대로 순서대로 바로 표시
        renderUpLinkCardsProgressive(bodyEl, sorted, () => sidePanelMode === 'UP');
    }
}

function sortUpLinksComparator(a, b) {
    if (a.deadline && b.deadline) {
        if (a.deadline === b.deadline) return (a.timestamp || 0) - (b.timestamp || 0);
        return a.deadline < b.deadline ? -1 : 1;
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return (a.timestamp || 0) - (b.timestamp || 0);
}

let memberLoginImgMap = {};
async function ensureMemberLoginImgMap() {
    if (Object.keys(memberLoginImgMap).length > 0) return memberLoginImgMap;
    try {
        const snap = await getDocs(collection(db, 'admins'));
        snap.forEach(d => {
            const data = d.data();
            if (data && data.name) memberLoginImgMap[data.name] = data.img;
        });
    } catch(e) { console.error('로그인 프사 로드 실패:', e); }
    return memberLoginImgMap;
}

// =========================================================================
// UP 카드 - SOOP 게시글 댓글 순위
// DB에 저장된 URL(.../post/{postId}#comment_noti{commentNo})에서
// 베이스 게시글 주소와 특정 댓글 ID를 분리 -> 같은 게시글을 가리키는 UP 링크들은 하나로 묶어
// 상단에 게시글 제목 1개, 하단에 등록된 댓글들을 좋아요 수 기준으로 순위 매겨 보여준다.
// =========================================================================

// https://www.sooplive.com/station/{stationId}/post/{postId}#comment_noti{commentNo} 형태의 링크를 파싱
function parseSoopPostUrl(url) {
    if (!url) return null;
    const m = url.match(/station\/([^\/?#]+)\/post\/(\d+)/);
    if (!m) return null;
    const hashMatch = url.match(/comment_noti(\d+)/);
    return {
        stationId: m[1],
        postId: m[2],
        commentNo: hashMatch ? hashMatch[1] : null
    };
}

function isSoopPostUrl(url) {
    return !!parseSoopPostUrl(url);
}

// 게시글의 모든 댓글 페이지를 순회하며 수집
// (기존에는 브라우저에서 SOOP API를 직접 호출하고, CORS로 막히면 공용 프록시(allorigins)로
//  재시도하는 방식이었음. 이제는 참고 저장소(upranking)와 동일하게, 우리 서버의 /api/comment
//  엔드포인트가 SOOP 서버에 대신 요청해서 순수 JSON을 돌려주는 방식으로 통일함.
//  -> 공용 프록시에 의존하지 않아 더 안정적이고, 우리 서버가 브라우저 UA/Referer를 흉내내어
//     SOOP의 봇 차단도 우회함.
//  1페이지만 먼저 받아 전체 페이지 수를 파악한 뒤, 나머지 페이지는 한번에 병렬로 요청해서 시간을 줄임)
async function fetchAllSoopComments(stationId, postId) {
    const postPageUrl = `https://www.sooplive.com/station/${stationId}/post/${postId}`;
    const commentUrl = (page) => `/api/comment?url=${encodeURIComponent(postPageUrl)}&page=${page}`;

    const fetchCommentPage = async (page) => {
        const res = await fetch(commentUrl(page));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    };

    const firstJson = await fetchCommentPage(1);
    const firstData = (firstJson && Array.isArray(firstJson.data)) ? firstJson.data : [];
    const lastPage = (firstJson && firstJson.meta && firstJson.meta.lastPage) || 1;

    if (lastPage <= 1) return firstData;

    const restPages = [];
    for (let page = 2; page <= lastPage; page++) restPages.push(page);
    const restResults = await Promise.all(
        restPages.map(page => fetchCommentPage(page).catch(() => null))
    );

    let allComments = firstData.slice();
    restResults.forEach(json => {
        if (json && Array.isArray(json.data)) allComments = allComments.concat(json.data);
    });
    return allComments;
}

// 같은 게시글(스테이션+게시글번호)을 가리키는 UP 링크들을 하나의 그룹으로 묶는다.
// 정렬 순서상 그 게시글이 처음 등장한 위치를 그룹의 위치로 유지한다.
function buildUpLinkRenderItems(sortedUpLinks) {
    const items = [];
    const groupIndexByKey = new Map();
    sortedUpLinks.forEach(up => {
        const parsed = parseSoopPostUrl(up.url);
        if (!parsed) { items.push({ type: 'normal', up }); return; }
        const key = `${parsed.stationId}_${parsed.postId}`;
        if (groupIndexByKey.has(key)) {
            items[groupIndexByKey.get(key)].entries.push({ up, commentNo: parsed.commentNo });
        } else {
            groupIndexByKey.set(key, items.length);
            items.push({ type: 'soopGroup', stationId: parsed.stationId, postId: parsed.postId, entries: [{ up, commentNo: parsed.commentNo }] });
        }
    });
    return items;
}

function rankBadgeColor(rank) {
    return rank === 1 ? '#FFD700' : rank === 2 ? '#B0BEC5' : rank === 3 ? '#CD7F32' : '#5D4037';
}

// 같은 게시글의 댓글/제목을 짧게(45초) 메모리에 캐시해둔다.
// UP 팝업 -> UP 모달 -> 사이드 패널처럼 짧은 시간 안에 같은 게시글을 여러 번 그릴 때
// 매번 다시 API를 호출하지 않도록 하기 위함(등록 직후 최신 데이터를 보고 싶을 때는
// 새로 UP 링크를 등록/수정하면 해당 목록이 즉시 다시 그려지므로 큰 문제 없음).
const soopRawDataCache = new Map(); // key: `${stationId}_${postId}` -> { title, sortedComments, t }
const SOOP_RAW_CACHE_TTL_MS = 45 * 1000;

async function fetchSoopTitleAndComments(stationId, postId) {
    const key = `${stationId}_${postId}`;
    const cached = soopRawDataCache.get(key);
    if (cached && (Date.now() - cached.t) < SOOP_RAW_CACHE_TTL_MS) return cached;

    // 게시글 제목은 더 이상 SOOP에서 긁어오지 않고, DB에 등록된 제목(up.title)을 그대로 사용한다.
    // (직접 fetch -> CORS 실패 -> 공용 프록시 재시도로 이어지는 부분이 로딩을 크게 느리게 했음)
    const comments = await fetchAllSoopComments(stationId, postId);

    // 좋아요 수(like_cnt) 기준 내림차순 정렬 -> 게시글 전체 댓글 순위
    const sortedComments = [...comments].sort((a, b) => (b.likeCnt || 0) - (a.likeCnt || 0));

    const result = { sortedComments, t: Date.now() };
    soopRawDataCache.set(key, result);
    return result;
}

// 그룹(게시글 하나)에 대한 등록된 내 댓글들의 좋아요 순위 데이터를 만든다.
// 게시글 전체 댓글을 기준으로 순위를 계산한 뒤, 그 중 DB에 등록해둔 내 댓글들만 골라서 보여준다.
async function buildSoopGroupData(group) {
    const { sortedComments } = await fetchSoopTitleAndComments(group.stationId, group.postId);

    const commentMap = new Map();
    const rankMap = new Map();
    sortedComments.forEach((c, idx) => {
        commentMap.set(String(c.pCommentNo), c);
        rankMap.set(String(c.pCommentNo), idx + 1);
    });

    // 등록된(DB에 저장된) 댓글들만 추려서, 전체 순위 중 몇 등인지를 붙인다.
    const matched = group.entries.map(({ up, commentNo }) => {
        const c = commentNo ? commentMap.get(String(commentNo)) : null;
        return {
            up,
            userNick: c ? c.userNick : (up.member || ''),
            userId: c ? c.userId : '',
            profileImage: c ? c.profileImage : '',
            likeCnt: c ? (c.likeCnt || 0) : 0,
            found: !!c,
            rank: c ? rankMap.get(String(commentNo)) : null
        };
    });

    // 전체 순위 기준으로 정렬 (댓글을 찾지 못한 경우는 맨 뒤로)
    matched.sort((a, b) => {
        if (a.rank == null && b.rank == null) return 0;
        if (a.rank == null) return 1;
        if (b.rank == null) return -1;
        return a.rank - b.rank;
    });

    return { matched };
}

function buildSoopGroupCardHtml(group, data) {
    const firstUp = group.entries[0].up;
    const titleText = firstUp.title || '(게시글 제목을 불러올 수 없습니다)';
    const postUrl = `https://www.sooplive.com/station/${group.stationId}/post/${group.postId}`;
    const cutLine = firstUp.cutLine !== undefined && firstUp.cutLine !== null && firstUp.cutLine !== '' ? Number(firstUp.cutLine) : null;

    const listHtml = data.matched.length === 0
        ? `<div class="text-center text-gray-400 font-bold py-6 text-[13px]">등록된 댓글 데이터가 없습니다.</div>`
        : data.matched.map(m => {
            const deleteBtn = (m.up && isAdmin && loggedInUser.name === m.up.member) ?
                `<button onclick="event.stopPropagation(); deleteUpLink('${m.up.id}', '${m.up.source || 'uplinks'}')" class="text-red-400 hover:text-red-600 font-bold ml-1 shrink-0"><i class="fi fi-br-cross-small"></i></button>` : '';
            const contextAttr = (m.up && isAdmin) ? `oncontextmenu="event.preventDefault(); event.stopPropagation(); window.openEditUpLink('${m.up.id}', '${m.up.source || 'uplinks'}');"` : '';
            const notFoundBadge = !m.found ? `<span class="text-[10px] text-red-400 font-bold ml-1">(댓글 확인 불가)</span>` : '';
            const rankLabel = m.rank ?? '-';
            const isDanger = cutLine !== null && m.rank != null && m.rank > cutLine;
            const clickAttr = m.up ? `onclick="openSmartLink('${m.up.url}')"` : '';
            return `
                <div class="flex items-center gap-2 bg-white border-2 ${isDanger ? 'border-red-500' : 'border-gray-200'} rounded-lg p-2.5 mb-2 shadow-sm ${m.up ? 'cursor-pointer hover:shadow-md transition' : ''}" ${clickAttr} ${contextAttr}>
                    <div class="w-9 flex flex-col items-center justify-center shrink-0">
                        <div class="font-bold text-[15px] leading-none" style="color:${rankBadgeColor(m.rank)}">${rankLabel}</div>
                        ${isDanger ? `<div class="text-[11px] font-bold text-red-500 leading-none mt-1">위기</div>` : ''}
                    </div>
                    <img src="${m.profileImage || ''}" onerror="this.style.visibility='hidden'" loading="lazy" decoding="async" class="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shrink-0 bg-gray-100">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-[#5D4037] text-[14px] truncate">${m.userNick || (m.up ? m.up.member : '') || ''}${notFoundBadge}</div>
                        <div class="text-[11.5px] text-gray-400 font-bold truncate">@${m.userId || '-'}</div>
                    </div>
                    <div class="flex items-center gap-1 text-[#5D4037] font-bold text-[13px] shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                        ${m.likeCnt ?? 0}
                    </div>
                    ${deleteBtn}
                </div>
            `;
        }).join('');

    return `
        <div class="relative w-full border-2 border-gray-200 rounded-xl p-5 mb-4 shadow-sm bg-white shrink-0">
            <div class="flex justify-between items-start gap-3 mb-3">
                <div class="text-[17px] font-bold font-paperozi text-gray-800 break-words leading-snug cursor-pointer hover:underline flex-1" onclick="openSmartLink('${postUrl}')">${titleText}</div>
                ${firstUp.deadline ? `<span class="text-[13px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">마감: ${firstUp.deadline}</span>` : ''}
            </div>
            <div class="max-h-[420px] overflow-y-auto pr-1">${listHtml}</div>
        </div>
    `;
}

function buildSoopGroupErrorCardHtml(group) {
    const firstUp = group.entries[0].up;
    return `
        <div class="relative w-full border-2 border-gray-200 rounded-xl p-5 mb-4 shadow-sm bg-white shrink-0">
            <div class="text-[17px] font-bold font-paperozi mb-3 text-gray-800 break-words leading-snug">${firstUp.title}</div>
            <div class="text-center text-red-400 font-bold py-6 text-[13px]">댓글 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>
        </div>
    `;
}

// 일반(SOOP 게시글이 아닌) UP 링크는 기존 카드 형태 그대로 렌더링
function buildNormalUpCardHtml(up) {
    const theme = themeColors[up.member] || '#5D4037';
    const memberInfo = members.find(m => m.name === up.member);
    const profileImg = memberLoginImgMap[up.member] || (memberInfo ? memberInfo.img : '');
    const deleteBtn = (isAdmin && loggedInUser.name === up.member) ?
        `<button onclick="event.stopPropagation(); deleteUpLink('${up.id}', '${up.source || 'uplinks'}')" class="text-red-500 hover:text-red-700 ml-2 font-bold z-20 absolute top-2 right-2"><i class="fi fi-br-cross-small"></i></button>` : '';
    const contextAttr = isAdmin ? `oncontextmenu="event.preventDefault(); window.openEditUpLink('${up.id}', '${up.source || 'uplinks'}');"` : '';

    return `
        <div class="relative w-full border-2 border-gray-200 rounded-xl p-5 mb-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-[2px] cursor-pointer bg-white shrink-0"
             onclick="openSmartLink('${up.url}')"
             ${contextAttr}>
            ${deleteBtn}
            <div class="flex items-center gap-2 mb-3 pr-6">
                ${profileImg ? `<img src="${profileImg}" loading="lazy" decoding="async" class="w-8 h-8 rounded-full object-cover shrink-0">` : ''}
                <span class="text-[13px] font-bold shrink-0" style="color: ${theme}">${up.member}</span>
            </div>
            <div class="text-[17px] font-bold font-paperozi mb-3 text-gray-800 break-words pr-6 leading-snug">${up.title}</div>
            <div class="flex justify-end items-end">
                ${up.deadline ? `<span class="text-[13px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">마감: ${up.deadline}</span>` : ''}
            </div>
        </div>
    `;
}

// (남겨둠: 혹시 다른 곳에서 "완성된 HTML 문자열 통째로" 필요할 때를 위한 기존 방식)
async function buildUpLinksCardsHtml(preSorted = null) {
    const sorted = preSorted || [...getVisibleUpLinks()].sort(sortUpLinksComparator);
    if (sorted.length === 0) return `<div class="h-full min-h-[240px] flex items-center justify-center text-center text-gray-400 font-bold text-lg">등록된 UP 링크가 없습니다.</div>`;

    const items = buildUpLinkRenderItems(sorted);
    const cards = await Promise.all(items.map(async item => {
        if (item.type === 'normal') return buildNormalUpCardHtml(item.up);
        try {
            const data = await buildSoopGroupData(item);
            return buildSoopGroupCardHtml(item, data);
        } catch(e) {
            console.error('게시글 댓글 순위 로드 실패:', e);
            return buildSoopGroupErrorCardHtml(item);
        }
    }));
    return cards.join('');
}

// 카드를 전부 다 불러올 때까지 기다렸다가 한번에 뿌리는 대신,
// 준비된 카드부터(=일반 UP 링크는 즉시, SOOP 게시글 댓글 순위는 로드되는 대로) 순서대로 바로 표시한다.
// 게시글이 여러 개 등록돼 있을 때, 가장 느린 게시글 하나 때문에 전체 목록이 늦게 뜨는 것을 막아 체감 속도를 크게 줄여준다.
function renderUpLinkCardsProgressive(containerEl, sortedUpLinks, isStillValid) {
    if (!containerEl) return;
    if (sortedUpLinks.length === 0) {
        containerEl.innerHTML = `<div class="h-full min-h-[240px] flex items-center justify-center text-center text-gray-400 font-bold text-lg">등록된 UP 링크가 없습니다.</div>`;
        return;
    }

    const items = buildUpLinkRenderItems(sortedUpLinks);
    const slotIdFor = (idx) => `${containerEl.id || 'upCards'}_slot_${idx}`;

    // 1) 일반 UP 링크는 데이터가 이미 있으므로 즉시 그리고,
    //    SOOP 게시글 그룹은 로딩 placeholder를 먼저 그려둔다.
    containerEl.innerHTML = items.map((item, idx) => {
        if (item.type === 'normal') return buildNormalUpCardHtml(item.up);
        return `
            <div id="${slotIdFor(idx)}" class="relative w-full border-2 border-gray-200 rounded-xl p-5 mb-4 shadow-sm bg-white shrink-0">
                <div class="text-center text-gray-400 font-bold py-6 text-[13px]">불러오는 중...⏳</div>
            </div>
        `;
    }).join('');

    // 2) SOOP 게시글 그룹들은 각자 준비되는 대로 해당 placeholder만 교체한다.
    items.forEach((item, idx) => {
        if (item.type !== 'soopGroup') return;
        buildSoopGroupData(item).then(data => {
            if (isStillValid && !isStillValid()) return;
            const slot = document.getElementById(slotIdFor(idx));
            if (slot) slot.outerHTML = buildSoopGroupCardHtml(item, data);
        }).catch(e => {
            console.error('게시글 댓글 순위 로드 실패:', e);
            if (isStillValid && !isStillValid()) return;
            const slot = document.getElementById(slotIdFor(idx));
            if (slot) slot.outerHTML = buildSoopGroupErrorCardHtml(item);
        });
    });
}

async function renderUpModeModalContent() {
    const body = document.getElementById('upModeModalBody');
    if (!body) return;
    body.innerHTML = `<div class="h-full min-h-[240px] flex items-center justify-center text-center text-gray-400 font-bold text-lg">불러오는 중...⏳</div>`;
    await ensureMemberLoginImgMap();
    if (!isUpModeModalOpen()) return; // 로그인 이미지 불러오는 사이 모달이 닫혔으면 그리지 않음
    const sorted = [...getVisibleUpLinks()].sort(sortUpLinksComparator);
    renderUpLinkCardsProgressive(body, sorted, isUpModeModalOpen);
}

function isUpModeModalOpen() {
    const overlay = document.getElementById('upModeModalOverlay');
    return !!overlay && !overlay.classList.contains('hidden');
}

function openUpModeModal() {
    const overlay = document.getElementById('upModeModalOverlay');
    if (!overlay) return;
    renderUpModeModalContent();
    overlay.classList.replace('hidden', 'flex');
}

function closeUpModeModal() {
    const overlay = document.getElementById('upModeModalOverlay');
    if (!overlay) return;
    overlay.classList.replace('flex', 'hidden');
}
window.openUpModeModal = openUpModeModal;
window.closeUpModeModal = closeUpModeModal;

// 홈탭 유튜브 영상 위 'UP 해줘!' 버튼: 등록된 UP 링크가 있을 때만 노출하고,
// 클릭 시 openUpModeModal()이 팝업으로 UP 보드를 띄워줌
async function updateHomeUpButtonVisibility() {
    const btn = document.getElementById('homeUpPanelBtn');
    if (!btn) return false;
    const sorted = getVisibleUpLinks();
    const has = sorted.length > 0;
    btn.classList.toggle('hidden', !has);
    return has;
}

function sortRollingTopics() {
    const todayStr = getTodayYYYYMMDD();
    const todayDate = new Date(todayStr).getTime();
    rollingTopics.sort((a, b) => {
        const isExpiredA = a.date < todayStr;
        const isExpiredB = b.date < todayStr;
        
        if (isExpiredA && !isExpiredB) return 1;
        if (!isExpiredA && isExpiredB) return -1;

        const diffA = Math.abs(new Date(a.date).getTime() - todayDate);
        const diffB = Math.abs(new Date(b.date).getTime() - todayDate);
        if (diffA === diffB) return (b.timestamp || 0) - (a.timestamp || 0);
        return diffA - diffB;
    });
}

// 업보관리 데이터는 로컬(세션 캐시)에 저장하지 않고, 호출될 때마다 Firebase에서 즉시 최신 데이터를 가져온다.
async function loadUpboDataFromFirebase() {
    try {
        const upboSnap = await getDocs(collection(db, 'upboData'));
        const mapToKor = {'dalta':'달타', 'darung':'다룽', 'choiagain':'최또', 'kanashi':'카나시'};
        const freshUpboData = {
            '달타': { products: [], records: [] },
            '다룽': { products: [], records: [] },
            '최또': { products: [], records: [] },
            '카나시': { products: [], records: [] }
        };
        upboSnap.forEach(docSnap => {
            const k = mapToKor[docSnap.id];
            if (k) freshUpboData[k] = docSnap.data();
        });
        for (let m in freshUpboData) {
            if (!freshUpboData[m].products) freshUpboData[m].products = [];
            if (!freshUpboData[m].records) freshUpboData[m].records = [];
        }
        upboData = freshUpboData;
        return true;
    } catch (e) {
        console.error("업보데이터 로드 에러:", e);
        return false;
    }
}
window.loadUpboDataFromFirebase = loadUpboDataFromFirebase;

async function loadSchedulesFromFirebase({ forceReload = false, member = null, members = null, useCacheOnly = false } = {}) {
    const cached = !forceReload ? readScheduleCache() : null;
    const allMemberKeys = Object.keys(collectionMap);
    // member/members를 둘 다 지정하지 않은 "전체 멤버" 요청인지 여부 (예: 홈 탭)
    const wantsAllMembers = !member && members === null;
    const cachedHasAllMembers = !!(cached && Array.isArray(cached.loadedMemberPages) && allMemberKeys.every(m => cached.loadedMemberPages.includes(m)));

    if (!forceReload && member && loadedMemberPages.has(member) && cached) {
        hydrateScheduleCache(cached);
        renderHeaderTabs();
        render();
        resetAutoRetry();
        return true;
    }

    // 전체 멤버 요청은 캐시가 실제로 모든 멤버의 일정을 담고 있을 때만 캐시를 그대로 쓴다.
    // (예: 다른 탭으로 처음 들어와 일부 멤버 데이터만 캐싱된 상태에서 홈으로 이동한 경우 재요청 필요)
    if (!forceReload && wantsAllMembers && cached && cachedHasAllMembers) {
        hydrateScheduleCache(cached);
        renderHeaderTabs();
        render();
        resetAutoRetry();
        return true;
    }

    // 특정 멤버 목록(빈 배열 포함)만 요청한 경우: 공통 데이터(멤버 목록/그룹/롤링 주제 등)는
    // 캐시가 존재하는 한 항상 채워져 있으므로, 캐시가 있으면 그대로 사용해도 된다.
    if (!forceReload && members !== null && cached) {
        hydrateScheduleCache(cached);
        renderHeaderTabs();
        render();
        resetAutoRetry();
        return true;
    }

    if (useCacheOnly) {
        if (cached) {
            hydrateScheduleCache(cached);
        } else {
            scheduleList = [];
            memoList = getDefaultMemoState();
        }
        renderHeaderTabs();
        render();
        return Boolean(cached);
    }

    try {
        const targetMembers = members !== null ? members : (member ? [member] : allMemberKeys);
        const eventPromises = targetMembers.map((targetMember) => {
            const colName = collectionMap[targetMember];
            return getDocs(collection(db, colName)).then(snapshot => ({ type: 'event', member: targetMember, colName, snapshot }));
        });
        const memoPromises = targetMembers.map((targetMember) => {
            const colName = memoCollectionMap[targetMember];
            return getDocs(collection(db, colName)).then(snapshot => ({ type: 'memo', member: targetMember, colName, snapshot }));
        });

        const results = await Promise.all([...eventPromises, ...memoPromises]);

        if (!member) {
            scheduleList = [];
            memoList = getDefaultMemoState();
        }
        targetMembers.forEach((targetMember) => loadedMemberPages.add(targetMember));

        const upsertSchedule = (list, item) => {
            const idx = list.findIndex(existing => existing.id === item.id);
            if (idx === -1) {
                list.push(item);
            } else {
                list[idx] = item;
            }
        };

        results.forEach(({ type, member: targetMember, colName, snapshot }) => {
            snapshot.forEach((doc) => {
                const data = doc.data();
                const item = { id: doc.id, collectionName: colName, ...data };
                if (type === 'memo') {
                    if(!memoList[targetMember]) memoList[targetMember] = [];
                    const memoListForMember = memoList[targetMember];
                    const memoIndex = memoListForMember.findIndex(existing => existing.id === item.id);
                    if (memoIndex === -1) {
                        memoListForMember.push(item);
                    } else {
                        memoListForMember[memoIndex] = item;
                    }
                } else {
                    upsertSchedule(scheduleList, item);
                }
            });
        });

        scheduleList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        for (let m in memoList) {
            memoList[m].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        if (!cached) {
            try {
                const smSnap = await getDocs(collection(memberDb, 'members'));
                customMembers = [];
                smSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    customMembers.push({
                        id: docSnap.id,
                        nickname: data.name || '',
                        soopId: data.soopId || '',
                        imageUrl: data.img || 'https://via.placeholder.com/60',
                        isCrew: data.type === 'crew',
                        timestamp: data.timestamp || 0
                    });
                });
            } catch (memberErr) {
                // 멤버관리 DB(memberDb)만 실패해도 스케줄 등 나머지 데이터 로드/렌더는 계속 진행되도록 별도로 처리
                console.error('멤버관리 데이터 로드 실패 (memberDb - members 컬렉션):', memberErr);
                if (isAdmin && typeof showToast === 'function') {
                    showToast('멤버 목록을 불러오지 못했습니다. Firestore 권한(규칙)을 확인해주세요.');
                }
            }

            const grpSnap = await getDocs(collection(db, 'memberGroups'));
            memberGroups = [];
            grpSnap.forEach(doc => memberGroups.push({ id: doc.id, ...doc.data() }));

            const topicSnap = await getDocs(collection(db, 'rollingTopics'));
            rollingTopics = [];
            topicSnap.forEach(doc => rollingTopics.push({ id: doc.id, ...doc.data() }));
            sortRollingTopics();

            // rollingEntries는 여기서 전체를 긁지 않는다. 주제 개수가 쌓일수록 항목도 함께 계속
            // 쌓이는 컬렉션이라, 방문자가 실제로 열어본 주제의 항목만 openRollingTopic 시점에 불러온다.
            rollingEntries = [];
            loadedRollingTopicIds = new Set();

            try {
                await loadSignalRecordsFirstPage();
            } catch (e) { console.error("시그널 데이터 로드 에러:", e); }

        }

        saveScheduleCache();
        renderHeaderTabs(); 
        render();
        resetAutoRetry();
        return true;
    } catch (e) {
        console.error("데이터 불러오기 실패:", e);
        scheduleAutoRetry(() => loadSchedulesFromFirebase({ forceReload: true, member, members, useCacheOnly }));
        return false;
    }
}

async function changeTab(tabName) {
    if (tabName === '업보정리') {
        currentPage = '업보선택';
        window.location.hash = '#upbolist';
    } else if (tabName.startsWith('업보정리_')) {
        currentPage = '업보정리';
        upboCurrentMember = tabName.split('_')[1];
        const m2e = {'달타':'dalta', '다룽':'darung', '최또':'choiagain', '카나시':'kanashi'};
        window.location.hash = '#list' + m2e[upboCurrentMember];
    } else if (tabName.startsWith('노래책')) {
        currentPage = '노래책';
        songbookMember = tabName.split('_')[1] || '달타';
        songArtistFilter = null;
        songGenreFilter = null;
        songLikedOnlyFilter = false;
        setActiveSongs(songbookMember);
        if (tabToHash[tabName]) { window.location.hash = tabToHash[tabName]; }
        loadSongsFromFirebase(songbookMember);
    } else {
        currentPage = tabName; 
        if (tabToHash[tabName]) { window.location.hash = tabToHash[tabName]; }
    }

    if (currentPage === '노래책') {
        if (!isMobile) {
            sidePanelMode = 'ARTIST'; openSidePanel('ARTIST');
        } else {
            sidePanelMode = null; closeSidePanel(true);
        }
    } else if (!isMobile) {
        // 데스크톱에서는 메모보드가 캘린더 컨테이너 안에 상시 내장되어 렌더링되므로 사이드 패널은 항상 닫아둔다.
        closeSidePanel(true);
    } else {
        if (memoPinned && memoCollectionMap[currentPage]) { sidePanelMode = 'MEMO'; openSidePanel('MEMO'); }
        else { closeSidePanel(true); }
    }
    
    homeTargetDate = new Date();
    individualTargetDate = new Date();
    
    currentRollingTopic = null;

    if (['달타', '다룽', '최또', '카나시'].includes(currentPage)) {
        await loadSchedulesFromFirebase({ member: currentPage });

        // PC 화면 개인 캘린더에서 음력 날짜를 그릴 때만 스크립트 동적 호출
        if (!isMobile) {
            await loadScript('https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.min.js');
        }
    } else if (currentPage === '업보정리') {
        await loadSchedulesFromFirebase({ useCacheOnly: true });
        // 업보관리 데이터는 로컬에 기억해두지 않고 탭에 들어올 때마다 항상 최신 데이터를 즉시 불러온다.
        await loadUpboDataFromFirebase();
    } else if (currentPage === '홈') {
        // 홈은 모든 멤버의 일정을 합쳐서 보여주므로, 캐시에 전체 멤버 데이터가 없다면 새로 불러온다.
        await loadSchedulesFromFirebase();
    } else {
        await loadSchedulesFromFirebase({ useCacheOnly: true });
    }
    
    renderHeaderTabs();
    render(); 
}

function changeMonth(delta) { currentMonth += delta; if (currentMonth > 12) { currentMonth = 1; currentYear++; } else if (currentMonth < 1) { currentMonth = 12; currentYear--; } render(); }
function changeHomeDate(delta) { homeTargetDate.setDate(homeTargetDate.getDate() + delta); render(); }
function changeIndividualWeek(deltaDays) { individualTargetDate.setDate(individualTargetDate.getDate() + deltaDays); render(); }

function openMonthPicker() { pickerYear = currentYear; renderPicker(); document.getElementById('monthPickerModal').classList.replace('hidden', 'flex'); }
function closeMonthPicker() { document.getElementById('monthPickerModal').classList.replace('flex', 'hidden'); }
function changePickerYear(delta) { pickerYear += delta; renderPicker(); }
function selectMonth(m) { 
    currentYear = pickerYear; currentMonth = m; 
    if (isMobile && currentPage !== '홈') individualTargetDate = new Date(currentYear, currentMonth - 1, 1);
    closeMonthPicker(); render(); 
}
function renderPicker() {
    document.getElementById('pickerYearText').innerText = `${pickerYear}년`;
    const grid = document.getElementById('pickerMonthGrid'); grid.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button'); btn.innerText = `${i}월`;
        btn.className = (pickerYear === currentYear && i === currentMonth) ? 'month-btn active py-3.5 rounded-lg font-bold text-[20px]' : 'month-btn py-3.5 rounded-lg font-bold text-[20px]';
        btn.onclick = () => selectMonth(i); grid.appendChild(btn);
    }
}

function openMobileDatePicker() {
    datePickerCurrentDate = new Date(homeTargetDate.getTime());
    renderMobileDatePicker();
    document.getElementById('mobileDatePickerModal').classList.replace('hidden', 'flex');
}

function closeMobileDatePicker() {
    document.getElementById('mobileDatePickerModal').classList.replace('flex', 'hidden');
}

function changeDatePickerMonth(delta) {
    datePickerCurrentDate.setMonth(datePickerCurrentDate.getMonth() + delta);
    renderMobileDatePicker();
}

function selectMobileDate(y, m, d) {
    homeTargetDate = new Date(y, m, d);
    closeMobileDatePicker();
    render();
}

function renderMobileDatePicker() {
    const y = datePickerCurrentDate.getFullYear();
    const m = datePickerCurrentDate.getMonth();
    document.getElementById('datePickerTitle').innerText = `${y}년 ${m + 1}월`;

    const firstDay = new Date(y, m, 1).getDay();
    const startIdx = (firstDay === 0) ? 6 : firstDay - 1; 
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const grid = document.getElementById('datePickerGrid');
    let html = '';

    for (let i = 0; i < 42; i++) {
        const day = i - startIdx + 1;
        if (day > 0 && day <= daysInMonth) {
            const isSelected = (y === homeTargetDate.getFullYear() && m === homeTargetDate.getMonth() && day === homeTargetDate.getDate());
            const isRealToday = (y === new Date().getFullYear() && m === new Date().getMonth() && day === new Date().getDate());
            
            let classes = "py-2 rounded-lg cursor-pointer transition-colors text-[15px] ";
            if (isSelected) {
                classes += "bg-[#FF5252] text-white shadow-md";
            } else if (isRealToday) {
                classes += "today-highlight";
            } else {
                classes += "hover:bg-gray-100 text-[#5D4037]";
            }
            html += `<div class="${classes}" onclick="selectMobileDate(${y}, ${m}, ${day})">${day}</div>`;
        } else {
            html += `<div></div>`;
        }
    }
    grid.innerHTML = html;
}

function buildScheduleCardHtml(sch, isMobileCard = false) {
    const memberColors = { '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#fdecf9', '카나시': '#FFF3E0' };
    const memberName = sch.tabOrMember ? sch.tabOrMember.trim() : '';
    const isHabBang = sch.broadType === '합방';
    const isSignalHabBang = sch.broadType === '시그널합방';
    const isCheonTaBus = sch.broadType === '천타버스';
    const isBibangSchedule = sch.broadType === '비방일정';

    let bgColor = sch.globalType === '휴방' ? '#E5E7EB' : (memberColors[memberName] || '#FFFFFF');
    let textColor = ''; 
    // 다크모드에서 배경색/텍스트색을 서로 스왑하기 위해 실제 텍스트 색상을 별도로 계산해둠
    let finalTextColor = (sch.globalType === '휴방') ? '#6B7280' : 'var(--theme-color)';
    
    if (isHabBang) {
        bgColor = '#f6cefc'; 
        finalTextColor = '#a21caf';
        textColor = 'border-color: #e29fee !important;'; 
    } else if (isSignalHabBang) {
        bgColor = '#ffdddd'; 
        finalTextColor = '#ff6767';
    } else if (isCheonTaBus) {
        bgColor = '#c8f0f5'; 
        finalTextColor = '#0891b2';
    } else if (isBibangSchedule) {
        bgColor = '#E5E7EB'; 
        finalTextColor = '#6B7280';
    }

    const typeClass = sch.globalType === '휴방' ? 'hubang' : 'bangon';
    const displayTitle = sch.title || (sch.globalType === '휴방' ? '휴방' : '뱅온');
    // 모바일 카드/한 줄 표시용: 줄바꿈을 공백으로 합쳐서 한 줄로 보여줌
    const displayTitleOneLine = displayTitle.replace(/\n+/g, ' ').trim();
    // 데스크탑 카드용: 사용자가 입력한 줄바꿈을 그대로 <br>로 반영
    const displayTitleHtml = displayTitle.replace(/\n/g, '<br>');
    const formattedTime = (typeof formatTime12 === 'function' && sch.time) ? formatTime12(sch.time) : ''; 
    const isAdminUser = (typeof isAdmin !== 'undefined' && isAdmin);
    const dragCursorStyle = isAdminUser ? 'cursor:grab; touch-action:none;' : '';
    const dragPointerAttr = isAdminUser ? `onpointerdown="startCalendarCardDrag(event, this)"` : '';

    if (isMobileCard) {
        return `
            <div class="schedule-card ${typeClass} w-full" data-sch-id="${sch.id}"
                 style="--sch-bg: ${bgColor}; --sch-text: ${finalTextColor}; ${textColor} display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; padding: 6px 20px !important; min-height: 46px !important; ${dragCursorStyle}"
                 ${dragPointerAttr}
                 onclick="event.stopPropagation(); openDetailModal(event, '${sch.id}')" 
                 oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { 
                     event.preventDefault(); event.stopPropagation(); window.contextTargetId = '${sch.id}'; window.editFromMenu(); 
                 }">
                <span style="font-family: 'Paperozi', sans-serif; font-size: 15px; font-weight: 600; text-align: left; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">${displayTitleOneLine}</span>
                ${formattedTime ? `<span class="dm-text-brown" style="font-family: 'Paperozi', sans-serif; font-size: 12px; font-weight: 700; color: #5D4037; flex-shrink: 0; margin-left: 6px; white-space: nowrap;">${formattedTime}</span>` : ''}
            </div>
        `;
    }

    const timeHtml = formattedTime ? `
        <div class="absolute -top-0.5 right-1.5 z-10">
            <span class="text-[11px] font-bold dm-text-brown" style="color: #5D4037;">${formattedTime}</span>
        </div>
    ` : '';

    return `
        <div class="schedule-card ${typeClass} relative h-full" data-sch-id="${sch.id}"
             style="--sch-bg: ${bgColor}; --sch-text: ${finalTextColor}; ${textColor} ${dragCursorStyle}"
             ${dragPointerAttr}
             onclick="openDetailModal(event, '${sch.id}')" 
             oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { 
                 event.preventDefault(); event.stopPropagation(); window.contextTargetId = '${sch.id}'; window.editFromMenu(); 
             }">
             ${timeHtml}
             <div class="absolute inset-0 flex items-center justify-center w-full px-0.5 py-0">
                 <div class="schedule-text" style="font-size: 17px !important; line-height: 1.2 !important; white-space: normal;">
                     ${displayTitleHtml}
                 </div>
             </div>
        </div>
    `;
}

function render() {
    const tabBackgrounds = { '홈': '#ffdddd', '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#FCE4EC', '카나시': '#FFF3E0', '롤링페이퍼': '#F3E8FF', '업보정리': '#FFFDF5', '업보선택': '#FFFDF5', '시그널': '#ffdddd', '클립': '#F3E8FF', '사다리타기': '#F3E8FF', '파트분배기': '#F3E8FF' };
    const activeThemeMember = currentPage === '업보정리' ? upboCurrentMember : currentPage === '노래책' ? songbookMember : currentPage;
    document.body.style.backgroundColor = tabBackgrounds[activeThemeMember] || '#ffdddd';
    document.documentElement.style.setProperty('--theme-color', currentPage === '업보선택' ? '#8B5CF6' : (themeColors[activeThemeMember] || '#8B5CF6'));
    document.body.className = document.body.className.replace(/theme-\S+/g, '');
    const themeClass = (currentPage === '업보정리' || currentPage === '업보선택') ? 'rolling' : currentPage === '노래책' ? getThemeClassForMember(songbookMember) : getThemeClassForMember(activeThemeMember);
    document.body.classList.add('theme-' + themeClass);
    
    const mBtnContainer = document.getElementById('mobileHeaderRightBtn');
    const dBtnContainer = document.getElementById('dynamicSideBtn');

    // 메모/시네티 버튼: 개인 캘린더(달타/다룽/최또/카나시) 탭일 때만 노출.
    // 모바일에서는 상단바 우측 영역에, 데스크톱은 각 캘린더 컨테이너 내부에서 렌더링.
    const isMemberPage = ['달타', '다룽', '최또', '카나시'].includes(currentPage);
    if (mBtnContainer) mBtnContainer.innerHTML = (isMobile && isMemberPage) ? buildMemoCinetiButtonsHtml('mobileHeader') : '';
    if (dBtnContainer) dBtnContainer.innerHTML = '';
    
    const content = document.getElementById('mainContent'); if(!content) return; content.innerHTML = '';

    try {
        const grouped = {};
        scheduleList.forEach(sch => {
            if(!sch.startDate || !sch.endDate) return;
            let start = new Date(sch.startDate); let end = new Date(sch.endDate); start.setHours(0,0,0,0); end.setHours(0,0,0,0);
            for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${sch.tabOrMember}`;
                if(!grouped[key]) grouped[key] = []; grouped[key].push(sch);
            }
        });

        if (currentPage === '롤링페이퍼') {
            renderRollingPaper();
        } else if (currentPage === '클립') {
            window.renderClipPage();
        } else if (currentPage === '업보정리') {
            renderUpboPage();
        } else if (currentPage === '업보선택') {
            renderUpboSelectPage();
        } else if (currentPage === '노래책') {
            renderSongbook();
        } else if (currentPage === '시그널') {
            renderSignalPage();
        } else if (currentPage === '사다리타기') {
            renderLadderPage();
        } else if (currentPage === '파트분배기') {
            renderPartDividerPage();
        } else {
            if (isMobile) {
                if (currentPage === '홈') renderMobileHome(grouped);
                else renderMobileIndividual(grouped);
            } else {
                if (currentPage === '홈') renderDesktopHome(grouped);
                else renderDesktopIndividual(grouped);
            }
        }
        resetAutoRetry();
    } catch (renderErr) {
        console.error('화면 렌더링 실패:', renderErr);
        content.innerHTML = `<div class="w-full flex flex-col items-center justify-center py-24 gap-2 text-[#5D4037]">
            <div class="text-[16px] font-bold">화면을 불러오지 못했습니다.</div>
            <div class="text-[13px] text-gray-400">잠시 후 자동으로 다시 시도합니다...</div>
        </div>`;
        scheduleAutoRetry(() => render());
        return;
    }

    // 홈탭일 때만 라이브 방송 상태를 주기적으로 확인 (다른 탭에서는 불필요한 요청 중지)
    if (currentPage === '홈') {
        startLiveStatusPolling();
    } else {
        stopLiveStatusPolling();
    }

    // 주간일정 박스가 새로 그려진 뒤 공지 박스 높이를 밑선에 맞춰 재조정
    requestAnimationFrame(alignNoticeBoxHeight);

    // 홈탭이 아니면(또는 모바일이면) 유튜브/이미지·공지 박스를 숨김
    applyHomeYoutubeBoxVisibility();
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function buildMemoCinetiButtonsHtml(variant) {
    if (variant === 'mobileHeader') {
        return `<div class="flex items-center gap-1 shrink-0">
            <button onclick="toggleMemoPanel()" title="메모" class="w-[32px] h-[32px] bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm text-[#5D4037] text-[15px] hover:bg-gray-50 transition-all cursor-pointer"><i class="fi fi-rr-edit"></i></button>
            <button onclick="toggleCinetiPanel()" title="시네티" class="w-[32px] h-[32px] bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm text-[#5D4037] text-[15px] hover:bg-gray-50 transition-all cursor-pointer"><i class="fi fi-rr-video-camera-alt"></i></button>
        </div>`;
    }
    if (variant === 'mobile') {
        return `<div class="flex items-center justify-center gap-3">
            <button onclick="toggleMemoPanel()" class="w-14 h-14 bg-white hover:bg-gray-50 text-[#5D4037] font-bold rounded-2xl transition-all font-paperozi text-[11px] cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm hover:-translate-y-0.5"><i class="fi fi-rr-edit text-[18px]"></i><span>메모</span></button>
            <button onclick="toggleCinetiPanel()" class="w-14 h-14 bg-white hover:bg-gray-50 text-[#5D4037] font-bold rounded-2xl transition-all font-paperozi text-[11px] cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm hover:-translate-y-0.5"><i class="fi fi-rr-video-camera-alt text-[18px]"></i><span>시네티</span></button>
        </div>`;
    }
    if (variant === 'desktop') {
        // 크기를 w-[62px] h-[62px] 1:1 비율로 맞추고 그림자(shadow) 속성 제거
        return `<div class="flex items-center shrink-0">
            <button onclick="toggleCinetiPanel()" class="w-[62px] h-[62px] bg-white hover:bg-gray-50 text-[#5D4037] font-bold rounded-[18px] transition-all flex flex-col items-center justify-center border border-[#ECEDFA] hover:-translate-y-0.5" title="시네티 열기">
                <i class="fi fi-rr-video-camera-alt text-[20px] mb-0.5"></i>
                <span class="text-[12px] font-paperozi">시네티</span>
            </button>
        </div>`;
    }
    return `<div class="flex flex-col items-center gap-3">
        <button onclick="toggleMemoPanel()" class="w-[72px] h-[72px] bg-white hover:bg-gray-50 text-[#5D4037] font-bold rounded-[22px] transition-all font-paperozi text-[13px] cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm border border-gray-100 hover:-translate-y-1"><i class="fi fi-rr-edit text-[24px]"></i><span>메모</span></button>
        <button onclick="toggleCinetiPanel()" class="w-[72px] h-[72px] bg-white hover:bg-gray-50 text-[#5D4037] font-bold rounded-[22px] transition-all font-paperozi text-[13px] cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm border border-gray-100 hover:-translate-y-1"><i class="fi fi-rr-video-camera-alt text-[24px]"></i><span>시네티</span></button>
    </div>`;
}

function getLikedSongIds(member = songbookMember) {
    const key = member || '달타';
    if (currentUser && userLikedSongsCache) {
        return new Set(userLikedSongsCache[key] || []);
    }
    try {
        const localKey = `likedSongIds_${key}`;
        return new Set(JSON.parse(localStorage.getItem(localKey) || '[]'));
    } catch (e) {
        return new Set();
    }
}

function saveLikedSongIds(set, member = songbookMember) {
    const key = member || '달타';
    if (currentUser && userLikedSongsCache) {
        userLikedSongsCache[key] = Array.from(set);
        // 계정에 비동기로 저장 (렌더링을 막지 않기 위해 await 하지 않음)
        const collectionName = isSoopSession ? 'soopUsers' : 'users';
        setDoc(doc(db, collectionName, currentUser.uid), { likedSongs: userLikedSongsCache }, { merge: true })
            .catch(e => console.error('좋아요 계정 저장 실패:', e));
        return;
    }
    const localKey = `likedSongIds_${key}`;
    localStorage.setItem(localKey, JSON.stringify(Array.from(set)));
}

function isSongLiked(id) {
    return getLikedSongIds().has(id);
}

function getFilteredSongs() {
    const q = (document.getElementById('songSearchInput')?.value || '').trim().toLowerCase().replace(/\s+/g, '');
    
    // 검색어도 없고 장르/가수 등 필터도 선택하지 않은 기본 상태라면 목록을 비움
    if (!q && !songArtistFilter && !songGenreFilter && !songLikedOnlyFilter) {
        return [];
    }

    let list = songs.slice();
    if (songArtistFilter) list = list.filter(s => s.artist === songArtistFilter);
    if (songGenreFilter) list = list.filter(s => (s.genre || '미분류') === songGenreFilter);
    if (songLikedOnlyFilter) {
        const liked = getLikedSongIds();
        list = list.filter(s => liked.has(s.id));
    }
    // 검색어의 띄어쓰기를 모두 제거
    if (q) {
        list = list.filter(s => {
            // 원본 제목과 가수의 띄어쓰기도 모두 제거한 후 비교
            const title = (s.title || '').toLowerCase().replace(/\s+/g, '');
            const artist = (s.artist || '').toLowerCase().replace(/\s+/g, '');
            if (title.includes(q) || artist.includes(q)) return true;
            const alias = (s.alias || '').toLowerCase().replace(/\s+/g, '');
            return alias.includes(q);
        });
    }
    return list.sort((a, b) => {
        const diff = (b.likes || 0) - (a.likes || 0);
        if (diff !== 0) return diff;
        return (a.title || '').localeCompare(b.title || '', 'ko');
    });
}

function getArtistCounts() {
    const map = {};
    songs.forEach(s => {
        const a = s.artist || '미분류';
        map[a] = (map[a] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
}

function getGenreCounts() {
    const map = {};
    songs.forEach(s => {
        const g = s.genre || '미분류';
        map[g] = (map[g] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
}

function renderSongbook() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-[1795px] max-w-full lg:mx-auto pb-6';
    const theme = getSongbookTheme(songbookMember);

    let html = `<div class="big-white-box relative theme-${getThemeClassForMember(songbookMember)}" style="min-height:900px; padding:${isMobile ? '20px' : '40px'}; width:100%; box-sizing:border-box; align-items:stretch; display:block; --songbook-accent:${theme.color}; --songbook-soft:${theme.soft}; --songbook-border:${theme.border};">
        <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h2 class="text-[24px] lg:text-3xl font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0" style="display:inline-block;">
                    <path d="M9 18.5V5.5L21 3.5V16.5" stroke="#5D4037" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="6" cy="18.5" r="3" fill="var(--songbook-accent)" stroke="#5D4037" stroke-width="1.8"/>
                    <circle cx="18" cy="16.5" r="3" fill="var(--songbook-accent)" stroke="#5D4037" stroke-width="1.8"/>
                </svg>
                ${songbookMember} 노래책
            </h2>
            ${isAdmin ? `<button onclick="openSongAddModal()" class="px-5 py-2.5 text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:brightness-105 hover:-translate-y-0.5 transition font-paperozi text-[15px] flex items-center gap-2 cursor-pointer" style="background-color:${theme.color}; border-color:${theme.color};"><i class="fi fi-br-plus"></i> 노래 추가</button>` : ''}
        </div>
        <div class="w-full mb-4 relative">
            <i class="fi fi-rr-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" id="songSearchInput" oninput="filterSongList()" placeholder="노래 제목 또는 가수 검색" class="w-full pl-11 pr-4 py-3 border-2 border-[#5D4037] rounded-xl outline-none text-[15px] font-bold transition" style="focus-border-color:${theme.color};">
        </div>
        <div class="w-full flex flex-wrap gap-2 mb-6" id="genreFilterContainer"></div>
        <div class="w-full grid gap-x-4 gap-y-7" style="grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));" id="songListContainer"></div>
    </div>`;

    content.innerHTML = html;
    renderSongList();
    renderGenreFilters();
    renderArtistSidePanel();
}

function renderSongList() {
    const container = document.getElementById('songListContainer');
    if (!container) return;
    const list = getFilteredSongs();
    const theme = getSongbookTheme(songbookMember);
    let html = '';

    if (songArtistFilter) {
        html += `
            <div class="col-span-full flex items-center gap-2 mb-1 rounded-lg px-3 py-2" style="background:${theme.soft}; border:2px solid ${theme.color};">
                <span class="font-bold text-[#5D4037] text-[14px]">🎤 ${escapeHtml(songArtistFilter)}</span>
                <button onclick="clearArtistFilter()" class="ml-auto text-[12px] font-bold text-gray-500 hover:text-red-500 transition cursor-pointer">전체보기 ✕</button>
            </div>
        `;
    }

    if (list.length === 0) {
        const q = (document.getElementById('songSearchInput')?.value || '').trim();
        if (!q && !songArtistFilter && !songGenreFilter && !songLikedOnlyFilter) {
            html += `<div class="col-span-full text-center text-gray-400 font-bold py-16">검색어를 입력해 주세요.</div>`;
        } else {
            html += `<div class="col-span-full text-center text-gray-400 font-bold py-16">일치하는 노래가 없습니다.</div>`;
        }
    } else {
        const liked = getLikedSongIds();
        list.forEach(song => {
            const artHtml = song.albumArt
                ? `<img src="${escapeHtml(song.albumArt)}" loading="lazy" decoding="async" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.classList.add('bg-[#FFF9C4]');this.replaceWith(Object.assign(document.createElement('div'),{className:'w-full h-full flex items-center justify-center text-4xl',innerHTML:'🎵'}));">`
                : `<div class="w-full h-full bg-[#FFF9C4] flex items-center justify-center text-4xl">🎵</div>`;
            const isLiked = liked.has(song.id);
            const likeCount = Number(song.likes || 0);
            const genreTags = song.genre
                ? song.genre.split(/[,\/·]/).map(g => g.trim()).filter(Boolean)
                : [];

            html += `
                <div class="song-card group relative flex flex-col cursor-pointer" onclick="openSongInfoModal('${song.id}')" title="클릭하면 노래 정보와 가사를 볼 수 있어요">
                    <div class="song-art relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 shrink-0">
                        ${artHtml}
                        <button onclick="event.stopPropagation(); toggleLikeSong('${song.id}')" class="absolute top-2 right-2 min-h-8 px-2 rounded-full bg-white/90 backdrop-blur flex items-center gap-1 shadow-md transition cursor-pointer ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}">
                            <i class="fi ${isLiked ? 'fi-sr-heart' : 'fi-rr-heart'} text-[15px] leading-none flex items-center justify-center"></i>
                            <span class="text-[11px] font-bold">${likeCount}</span>
                        </button>
                        ${isAdmin ? `
                        <div class="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                            <button onclick="event.stopPropagation(); openSongEditModal('${song.id}')" class="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md text-gray-400 hover:text-blue-500 transition cursor-pointer text-[12px]"><i class="fi fi-rr-edit"></i></button>
                            <button onclick="event.stopPropagation(); deleteSong('${song.id}')" class="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md text-gray-400 hover:text-red-500 transition cursor-pointer text-[13px]"><i class="fi fi-br-cross-small"></i></button>
                        </div>` : ''}
                    </div>
                    <div class="mt-2.5 px-0.5">
                        <div class="font-bold text-[#5D4037] text-[15px] truncate leading-snug">${escapeHtml(song.title)}</div>
                        <div class="text-gray-500 text-[13px] font-bold truncate mt-0.5">${escapeHtml(song.artist)}</div>
                        ${genreTags.length ? `<div class="flex flex-wrap gap-1 mt-1.5">${genreTags.map(g => `<span class="text-[10.5px] font-bold px-2 py-0.5 rounded-full dm-text-brown" style="color:#5D4037; background:${theme.soft};">${escapeHtml(g)}</span>`).join('')}</div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html;
}

function renderGenreFilters() {
    const container = document.getElementById('genreFilterContainer');
    if (!container) return;
    const genres = getGenreCounts();
    const theme = getSongbookTheme(songbookMember);
    songGenresCache = genres.map(g => g[0]);

    const likedCount = getLikedSongIds().size;

    let html = `<button onclick="clearGenreFilter()" class="px-4 py-2 rounded-full font-bold text-[13px] transition cursor-pointer border-2 ${!songGenreFilter ? 'bg-[#5D4037] text-white border-[#5D4037]' : 'bg-white text-[#5D4037] hover:bg-gray-50 border-gray-200'}">전체</button>`;
    genres.forEach(([genre, count], idx) => {
        const active = songGenreFilter === genre;
        html += `<button onclick="selectGenreFilterIdx(${idx})" class="px-4 py-2 rounded-full font-bold text-[13px] transition cursor-pointer border-2 ${active ? 'text-white' : 'bg-white text-[#5D4037] hover:bg-gray-50 border-gray-200'}" style="${active ? `background:${theme.color}; border-color:${theme.color};` : ''}">${escapeHtml(genre)} (${count})</button>`;
    });
    html += `<button onclick="toggleLikedOnlyFilter()" class="px-4 py-2 rounded-full font-bold text-[13px] transition cursor-pointer border-2 flex items-center gap-1 ${songLikedOnlyFilter ? 'bg-red-500 text-white border-red-500' : 'bg-white text-[#5D4037] hover:bg-gray-50 border-gray-200'}"><i class="fi ${songLikedOnlyFilter ? 'fi-sr-heart' : 'fi-rr-heart'}"></i>(${likedCount})</button>`;
    container.innerHTML = html;
}

window.selectGenreFilterIdx = function(idx) {
    const genre = songGenresCache[idx];
    if (genre === undefined) return;
    songGenreFilter = (songGenreFilter === genre) ? null : genre;
    renderSongList();
    renderGenreFilters();
};

window.clearGenreFilter = function() {
    songGenreFilter = null;
    renderSongList();
    renderGenreFilters();
};

window.toggleLikedOnlyFilter = function() {
    songLikedOnlyFilter = !songLikedOnlyFilter;
    renderSongList();
    renderGenreFilters();
};

window.toggleLikeSong = async function(id) {
    if (likeInProgress.has(id)) return;
    likeInProgress.add(id);

    const member = songbookMember || '달타';
    const song = songs.find(s => s.id === id);
    if (!song) { likeInProgress.delete(id); return; }

    const liked = getLikedSongIds(member);
    const alreadyLiked = liked.has(id);
    const delta = alreadyLiked ? -1 : 1;

    const nextLikes = Math.max(0, Number(song.likes || 0) + delta);
    song.likes = nextLikes;
    if (alreadyLiked) liked.delete(id); else liked.add(id);
    saveLikedSongIds(liked, member);
    renderSongList();
    renderGenreFilters();

    try {
        await updateDoc(doc(db, getSongCollectionName(member), id), { likes: increment(delta) });
    } catch (e) {
        console.error('좋아요 처리 실패:', e);
        song.likes = Math.max(0, nextLikes - delta);
        if (alreadyLiked) liked.add(id); else liked.delete(id);
        saveLikedSongIds(liked, member);
        renderSongList();
        renderGenreFilters();
    } finally {
        likeInProgress.delete(id);
    }
};

function renderArtistSidePanel() {
    const panel = document.getElementById('sideExpansionPanel');
    if (!panel || sidePanelMode !== 'ARTIST') return;

    const artists = getArtistCounts();
    const theme = getSongbookTheme(songbookMember);
    songArtistsCache = artists.map(a => a[0]);

    let listHtml = `<button onclick="clearArtistFilter()" class="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] transition cursor-pointer border-2 mb-2 ${!songArtistFilter ? 'bg-[#5D4037] text-white border-[#5D4037]' : 'bg-white text-[#5D4037] hover:bg-gray-50 border-gray-200'}">전체 (${songs.length})</button>`;
    artists.forEach(([artist, count], idx) => {
        const active = songArtistFilter === artist;
        listHtml += `
            <button onclick="selectArtistFilterIdx(${idx})" class="w-full text-left px-4 py-3 rounded-xl font-bold text-[15px] transition cursor-pointer border-2 flex justify-between items-center gap-2 mb-2 ${active ? 'text-white' : 'bg-white text-[#5D4037] hover:bg-gray-50 border-gray-200'}" style="${active ? `background:${theme.color}; border-color:${theme.color};` : ''}">
                <span class="truncate">${escapeHtml(artist)}</span><span class="text-[13px] opacity-80 shrink-0">${count}</span>
            </button>
        `;
    });
    if (artists.length === 0) listHtml += `<div class="text-center text-gray-400 font-bold py-16 text-[14px]">등록된 가수가 없습니다.</div>`;

    panel.innerHTML = `
        <div class="p-6 bg-white/15 backdrop-blur-lg flex items-center shadow-sm z-10 shrink-0">
            <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <i class="fi fi-rr-microphone"></i> 가수 목록
            </div>
        </div>
        <div class="flex-1 p-5 bg-white overflow-y-auto modal-scroll w-full">
            ${listHtml}
        </div>
    `;
}

window.filterSongList = function() { 
    const q = (document.getElementById('songSearchInput')?.value || '').trim();
    
    // 검색어 입력 시, 기존에 선택된 가수/장르/좋아요 필터를 초기화하여 무조건 검색되도록 처리
    if (q && (songArtistFilter || songGenreFilter || songLikedOnlyFilter)) {
        songArtistFilter = null;
        songGenreFilter = null;
        songLikedOnlyFilter = false;
        renderGenreFilters();
        renderArtistSidePanel();
    }
    renderSongList(); 
};

window.selectArtistFilterIdx = function(idx) {
    const artist = songArtistsCache[idx];
    if (artist === undefined) return;
    songArtistFilter = (songArtistFilter === artist) ? null : artist;
    renderSongList();
    renderArtistSidePanel();
};

window.clearArtistFilter = function() {
    songArtistFilter = null;
    renderSongList();
    renderArtistSidePanel();
};

let songGenreOptionsCache = [];

function populateSongGenreDatalist() {
    songGenreOptionsCache = Array.from(new Set(songs.map(s => (s.genre || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'));
}

function renderSongGenreDropdown(filterText) {
    const listEl = document.getElementById('songGenreDropdownList');
    if (!listEl) return;
    const q = (filterText || '').trim().toLowerCase();
    const options = q ? songGenreOptionsCache.filter(g => g.toLowerCase().includes(q)) : songGenreOptionsCache;
    if (!options.length) {
        listEl.innerHTML = `<div class="px-3.5 py-3 text-[13px] font-bold text-gray-400 text-center">일치하는 장르가 없습니다</div>`;
        return;
    }
    listEl.innerHTML = options.map(g => `<button type="button" class="song-genre-option w-full text-left px-3.5 py-2.5 text-[14px] font-bold text-[#5D4037] transition cursor-pointer" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('');
}

function openSongGenreDropdown() {
    renderSongGenreDropdown(document.getElementById('songGenreInput').value);
    const listEl = document.getElementById('songGenreDropdownList');
    if (listEl) listEl.classList.remove('hidden');
    const icon = document.querySelector('#songGenreDropdownToggle i');
    if (icon) icon.style.transform = 'rotate(180deg)';
}

function closeSongGenreDropdown() {
    const listEl = document.getElementById('songGenreDropdownList');
    if (listEl) listEl.classList.add('hidden');
    const icon = document.querySelector('#songGenreDropdownToggle i');
    if (icon) icon.style.transform = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const genreInput = document.getElementById('songGenreInput');
    const genreToggle = document.getElementById('songGenreDropdownToggle');
    const genreList = document.getElementById('songGenreDropdownList');
    if (!genreInput || !genreToggle || !genreList) return;

    genreInput.addEventListener('focus', openSongGenreDropdown);
    genreInput.addEventListener('input', () => {
        renderSongGenreDropdown(genreInput.value);
        const listEl = document.getElementById('songGenreDropdownList');
        if (listEl) listEl.classList.remove('hidden');
        const icon = document.querySelector('#songGenreDropdownToggle i');
        if (icon) icon.style.transform = 'rotate(180deg)';
    });
    genreToggle.addEventListener('click', () => {
        if (genreList.classList.contains('hidden')) openSongGenreDropdown();
        else closeSongGenreDropdown();
        genreInput.focus();
    });
    genreList.addEventListener('mousedown', (e) => {
        const btn = e.target.closest('.song-genre-option');
        if (!btn) return;
        e.preventDefault();
        genreInput.value = btn.dataset.genre;
        closeSongGenreDropdown();
        autoFetchAlbumArt();
    });
    document.addEventListener('click', (e) => {
        if (!genreInput.contains(e.target) && !genreToggle.contains(e.target) && !genreList.contains(e.target)) {
            closeSongGenreDropdown();
        }
    });
});

let songAlbumArtManuallyEdited = false;
let songAlbumArtFetchToken = 0;

window.openSongAddModal = function() {
    if (!isAdmin) return;
    currentEditingSongId = null; 
    document.querySelector('#songAddModal h2').innerText = '노래 추가'; 
    
    document.getElementById('songTitleInput').value = '';
    document.getElementById('songArtistInput').value = '';
    document.getElementById('songAliasInput').value = '';
    document.getElementById('songGenreInput').value = '';
    document.getElementById('songAlbumArtInput').value = '';
    songAlbumArtManuallyEdited = false;
    setSongAlbumArtStatus('');
    window.previewSongAlbumArt('');
    populateSongGenreDatalist();
    
    const modal = document.getElementById('songAddModal');
    const theme = getSongbookTheme(songbookMember);
    modal.style.setProperty('--song-modal-accent', theme.color);
    modal.style.setProperty('--song-modal-soft', theme.soft);
    modal.classList.replace('hidden', 'flex');
};

window.openSongEditModal = function(id) {
    if (!isAdmin) return;
    const song = songs.find(s => s.id === id);
    if (!song) return;
    
    currentEditingSongId = id; 
    document.querySelector('#songAddModal h2').innerText = '노래 수정'; 
    
    document.getElementById('songTitleInput').value = song.title || '';
    document.getElementById('songArtistInput').value = song.artist || '';
    document.getElementById('songAliasInput').value = song.alias || '';
    document.getElementById('songGenreInput').value = song.genre || '';
    document.getElementById('songAlbumArtInput').value = song.albumArt || '';
    
    songAlbumArtManuallyEdited = true; 
    setSongAlbumArtStatus('');
    window.previewSongAlbumArt(song.albumArt || '');
    populateSongGenreDatalist();
    
    const modal = document.getElementById('songAddModal');
    const theme = getSongbookTheme(songbookMember);
    modal.style.setProperty('--song-modal-accent', theme.color);
    modal.style.setProperty('--song-modal-soft', theme.soft);
    modal.classList.replace('hidden', 'flex');
};

window.closeSongAddModal = function() {
    document.getElementById('songAddModal').classList.replace('flex', 'hidden');
};

window.previewSongAlbumArt = function(url) {
    songAlbumArtManuallyEdited = true;
    const wrap = document.getElementById('songAlbumArtPreview');
    const img = document.getElementById('songAlbumArtPreviewImg');
    if (!wrap || !img) return;
    const trimmed = (url || '').trim();
    if (trimmed) { img.src = trimmed; wrap.classList.remove('hidden'); }
    else { wrap.classList.add('hidden'); img.src = ''; }
};

function setSongAlbumArtStatus(text, isError) {
    const el = document.getElementById('songAlbumArtStatus');
    if (!el) return;
    el.textContent = text || '';
    el.className = `text-[12px] font-bold mt-1 h-4 ${isError ? 'text-red-400' : 'text-gray-400'}`;
}

async function fetchAlbumArtFromItunes(title, artist) {
    const term = encodeURIComponent(`${artist} ${title}`.trim());
    if (!term) return null;
    const tryFetch = async (url) => {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return (data.results && data.results[0]) || null;
    };
    let result = await tryFetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1&country=KR`);
    if (!result) {
        result = await tryFetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`);
    }
    if (!result || !result.artworkUrl100) return null;
    return result.artworkUrl100.replace('100x100bb', '600x600bb');
}

window.autoFetchAlbumArt = async function() {
    const title = document.getElementById('songTitleInput').value.trim();
    const artist = document.getElementById('songArtistInput').value.trim();
    if (!title && !artist) return;
    const currentUrl = document.getElementById('songAlbumArtInput').value.trim();
    if (currentUrl && songAlbumArtManuallyEdited) return; 

    const myToken = ++songAlbumArtFetchToken;
    setSongAlbumArtStatus('앨범아트 검색 중...');
    const btn = document.getElementById('songAlbumArtAutoBtn');
    if (btn) btn.disabled = true;

    try {
        const artUrl = await fetchAlbumArtFromItunes(title, artist);
        if (myToken !== songAlbumArtFetchToken) return; 
        if (artUrl) {
            document.getElementById('songAlbumArtInput').value = artUrl;
            window.previewSongAlbumArt(artUrl);
            songAlbumArtManuallyEdited = false; 
            setSongAlbumArtStatus('앨범아트를 찾았습니다 ✓');
        } else {
            setSongAlbumArtStatus('일치하는 앨범아트를 찾지 못했습니다. 직접 입력해주세요.', true);
        }
    } catch (e) {
        console.error('앨범아트 자동 검색 실패:', e);
        if (myToken === songAlbumArtFetchToken) {
            setSongAlbumArtStatus('검색에 실패했습니다. 직접 입력해주세요.', true);
        }
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.saveSong = async function() {
    if (!isAdmin) return;
    const title = document.getElementById('songTitleInput').value.trim();
    const artist = document.getElementById('songArtistInput').value.trim();
    const alias = document.getElementById('songAliasInput').value.trim();
    const genre = document.getElementById('songGenreInput').value.trim();
    let albumArt = document.getElementById('songAlbumArtInput').value.trim();
    if (!title || !artist) { alert('노래 제목과 가수를 입력해주세요.'); return; }

    if (!albumArt) {
        try {
            const found = await fetchAlbumArtFromItunes(title, artist);
            if (found) albumArt = found;
        } catch (e) {
            console.error('저장 전 앨범아트 검색 실패:', e);
        }
    }

    try {
        const member = songbookMember || '달타';
        
        if (currentEditingSongId) {
            await updateDoc(doc(db, getSongCollectionName(member), currentEditingSongId), {
                title, artist, alias, genre, albumArt
            });
            
            const songIndex = songsByMember[member].findIndex(s => s.id === currentEditingSongId);
            if (songIndex > -1) {
                songsByMember[member][songIndex].title = title;
                songsByMember[member][songIndex].artist = artist;
                songsByMember[member][songIndex].alias = alias;
                songsByMember[member][songIndex].genre = genre;
                songsByMember[member][songIndex].albumArt = albumArt;
            }
        } else {
            const newSong = { title, artist, alias, genre, albumArt, likes: 0, timestamp: Date.now(), member };
            const docRef = await addDoc(collection(db, getSongCollectionName(member)), newSong);
            songsByMember[member] = songsByMember[member] || [];
            songsByMember[member].push({ id: docRef.id, ...newSong });
        }
        
        setActiveSongs(member);
        closeSongAddModal();
        renderSongList();
        renderGenreFilters();
        renderArtistSidePanel();
        populateSongGenreDatalist();
    } catch (e) {
        console.error('노래 저장/수정 실패:', e);
        alert('저장에 실패했습니다.');
    }
};

// =========================================================================
// 데이터 로딩/렌더링 실패 시 안내 배너 + 자동 재시도
// =========================================================================
const autoRetryState = { count: 0, timer: null, maxRetries: 5, lastRetryFn: null };

function showLoadErrorBanner(message, showManualRetry = false) {
    let banner = document.getElementById('loadErrorBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'loadErrorBanner';
        banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#5D4037] text-white text-[13px] font-bold px-5 py-3 rounded-full shadow-lg flex items-center gap-3 max-w-[90vw]';
        banner.innerHTML = `<span id="loadErrorBannerText" class="whitespace-nowrap overflow-hidden text-ellipsis"></span><button id="loadErrorBannerRetryBtn" onclick="manualRetryLoad()" class="hidden shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition">지금 다시 시도</button>`;
        document.body.appendChild(banner);
    }
    document.getElementById('loadErrorBannerText').textContent = message;
    document.getElementById('loadErrorBannerRetryBtn').classList.toggle('hidden', !showManualRetry);
    banner.classList.remove('hidden');
}

function hideLoadErrorBanner() {
    const banner = document.getElementById('loadErrorBanner');
    if (banner) banner.classList.add('hidden');
}

function resetAutoRetry() {
    autoRetryState.count = 0;
    if (autoRetryState.timer) { clearTimeout(autoRetryState.timer); autoRetryState.timer = null; }
    autoRetryState.lastRetryFn = null;
    hideLoadErrorBanner();
}

// 실패 시 호출: 배너를 띄우고, 잠시 후 retryFn을 자동으로 재실행한다 (최대 maxRetries회, 대기시간 점점 증가)
function scheduleAutoRetry(retryFn) {
    if (autoRetryState.timer) clearTimeout(autoRetryState.timer);
    autoRetryState.lastRetryFn = retryFn;
    autoRetryState.count++;

    if (autoRetryState.count > autoRetryState.maxRetries) {
        showLoadErrorBanner('일정을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.', true);
        return;
    }

    const delaySec = Math.min(3 * autoRetryState.count, 15);
    showLoadErrorBanner(`일정을 불러오지 못했습니다. ${delaySec}초 후 자동으로 다시 시도합니다... (${autoRetryState.count}/${autoRetryState.maxRetries})`);
    autoRetryState.timer = setTimeout(() => {
        retryFn();
    }, delaySec * 1000);
}

window.manualRetryLoad = function() {
    autoRetryState.count = 0;
    if (autoRetryState.lastRetryFn) {
        showLoadErrorBanner('다시 시도하는 중...');
        autoRetryState.lastRetryFn();
    }
};

function showToast(msg) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#5D4037] text-white font-bold text-[14px] px-5 py-3 rounded-full shadow-lg z-[9999] transition-opacity duration-300 opacity-0 pointer-events-none';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
    }, 1800);
}

window.copySongToClipboard = function(id, event) {
    if (event) event.stopPropagation();
    const song = songs.find(s => s.id === id);
    if (!song) return;
    const text = `${song.artist} - ${song.title}`;
    const onCopied = () => showToast(`복사되었습니다: ${text}`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onCopied).catch(() => {
            prompt('아래 텍스트를 복사하세요:', text);
        });
    } else {
        prompt('아래 텍스트를 복사하세요:', text);
    }
};

window.openSongInfoModal = function(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    const theme = getSongbookTheme(songbookMember);
    const modal = document.getElementById('songInfoModal');
    modal.style.setProperty('--song-modal-accent', theme.color);
    modal.style.setProperty('--song-modal-soft', theme.soft);

    document.getElementById('songInfoTitle').textContent = song.title || '';
    document.getElementById('songInfoArtist').textContent = song.artist || '';

    const artWrap = document.getElementById('songInfoArt');
    artWrap.innerHTML = song.albumArt
        ? `<img src="${escapeHtml(song.albumArt)}" loading="lazy" decoding="async" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.classList.add('bg-[#FFF9C4]');this.remove();">`
        : `<div class="w-full h-full bg-[#FFF9C4] flex items-center justify-center text-5xl">🎵</div>`;

    const genreTags = song.genre
        ? song.genre.split(/[,\/·]/).map(g => g.trim()).filter(Boolean)
        : [];
    document.getElementById('songInfoGenres').innerHTML = genreTags
        .map(g => `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full dm-text-brown" style="color:#5D4037; background:${theme.soft};">${escapeHtml(g)}</span>`)
        .join('');

    const liked = getLikedSongIds();
    const isLiked = liked.has(song.id);
    const likeBtn = document.getElementById('songInfoLikeBtn');
    likeBtn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 shadow-sm transition cursor-pointer font-bold text-[13px] ${isLiked ? 'text-red-500 border-red-200' : 'text-gray-400 border-gray-200 hover:text-red-400'}`;
    likeBtn.innerHTML = `<i class="fi ${isLiked ? 'fi-sr-heart' : 'fi-rr-heart'}"></i><span>${Number(song.likes || 0)}</span>`;
    likeBtn.onclick = async () => { await toggleLikeSong(song.id); window.openSongInfoModal(song.id); };

    document.getElementById('songInfoCopyBtn').onclick = () => copySongToClipboard(song.id);

    const lyricsQuery = encodeURIComponent(`${song.artist} ${song.title} 가사`);
    document.getElementById('songInfoLyricsBtn').href = `https://www.google.com/search?q=${lyricsQuery}`;

    modal.classList.replace('hidden', 'flex');
};

window.closeSongInfoModal = function() {
    document.getElementById('songInfoModal').classList.replace('flex', 'hidden');
};

window.deleteSong = async function(id) {
    if (!isAdmin) return;
    if (!confirm('이 노래를 삭제하시겠습니까?')) return;
    try {
        const member = songbookMember || '달타';
        await deleteDoc(doc(db, getSongCollectionName(member), id));
        songsByMember[member] = (songsByMember[member] || []).filter(s => s.id !== id);
        setActiveSongs(member);
        const liked = getLikedSongIds(member);
        if (liked.has(id)) { liked.delete(id); saveLikedSongIds(liked, member); }
        if (songArtistFilter && !songs.some(s => s.artist === songArtistFilter)) songArtistFilter = null;
        if (songGenreFilter && !songs.some(s => (s.genre || '미분류') === songGenreFilter)) songGenreFilter = null;
        if (songLikedOnlyFilter && getFilteredSongs().length === 0) songLikedOnlyFilter = false;
        renderSongList();
        renderGenreFilters();
        renderArtistSidePanel();
    } catch (e) {
        console.error('노래 삭제 실패:', e);
    }
};

async function loadSongsFromFirebase(member = songbookMember) {
    try {
        const collectionName = getSongCollectionName(member);
        const snap = await getDocs(collection(db, collectionName));
        songsByMember[member] = snap.docs.map(d => {
            const data = d.data() || {};
            return { id: d.id, ...data, likes: Number(data.likes || 0) };
        });
        if (songbookMember === member) {
            setActiveSongs(member);
            if (currentPage === '노래책') {
                renderSongList();
                renderGenreFilters();
                renderArtistSidePanel();
                populateSongGenreDatalist();
            }
        }
    } catch (e) {
        console.error('노래 목록 로드 실패:', e);
    }
}


function toggleUpboViewMode(mode) {
    if (!isAdmin) return;
    upboViewMode = mode;
    renderUpboPage();
}

// =========================================================================
// 업보정리 멤버 선택 화면 (#upbolist)
// =========================================================================
function renderUpboSelectPage() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    let cardsHtml = '';
    members.forEach(m => {
        const mColor = themeColors[m.name] || '#8B5CF6';
        cardsHtml += `
            <button onclick="changeTab('업보정리_${m.name}')" class="upbo-select-card group relative overflow-hidden rounded-[22px] shrink-0 hover:-translate-y-1.5 transition-all duration-200 flex flex-col" style="width: ${isMobile ? '150px' : '210px'}; height: ${isMobile ? '350px' : '520px'}; background: #fff; border: none; box-shadow: 0 4px 10px ${hexToRgba(mColor, 0.16)}, 0 1px 3px rgba(0,0,0,0.05);" onmouseover="this.style.boxShadow='0 7px 16px ${hexToRgba(mColor, 0.24)}, 0 2px 6px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='0 4px 10px ${hexToRgba(mColor, 0.16)}, 0 1px 3px rgba(0,0,0,0.05)'">
                <div class="relative z-10 flex flex-col items-center ${isMobile ? 'pt-6 pb-4' : 'pt-9 pb-5'} shrink-0" style="background:#fff;">
                    <div class="font-paperozi font-bold ${isMobile ? 'text-[16px]' : 'text-[20px]'} tracking-tight" style="color:${mColor};">${m.name}</div>
                    <div class="mt-1.5 px-2.5 py-0.5 rounded-full font-bold ${isMobile ? 'text-[9px]' : 'text-[11px]'}" style="background: ${hexToRgba(mColor, 0.12)}; color: ${mColor};">업보 조회</div>
                </div>
                <div class="relative flex-1 w-full overflow-hidden" style="background: ${hexToRgba(mColor, 0.18)};">
                    <img src="${m.img}" alt="${m.name}" class="absolute left-0 right-0 w-full object-cover object-top group-hover:scale-125 transition-transform duration-300" style="top: 14%; height: 86%; transform: scale(1.15); transform-origin: bottom;">
                    <div class="absolute inset-x-0 top-0 h-8" style="background: linear-gradient(180deg, #fff 0%, transparent 100%);"></div>
                </div>
                <div class="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/85 flex items-center justify-center shadow-sm">
                    <i class="fi fi-rr-angle-small-right" style="color:${mColor};"></i>
                </div>
            </button>
        `;
    });

    const mainHtml = `
        <div class="big-white-box upbo-box relative mx-auto" style="min-height: ${isMobile ? '420px' : '520px'}; padding: ${isMobile ? '28px 16px 48px' : '48px 48px 150px'}; width: 100%; max-width: 980px; box-sizing: border-box;">
            <div class="text-center mb-8">
                <h2 class="text-[26px] lg:text-3xl font-bold text-[#5D4037] font-paperozi"><i class="fi fi-rr-box-open"></i> 업보정리</h2>
                <p class="text-[14px] font-bold text-gray-400 mt-2">확인할 멤버를 선택해주세요</p>
            </div>
            <div class="flex flex-row flex-wrap justify-center items-start gap-3 sm:gap-4 md:gap-6">
                ${cardsHtml}
            </div>
        </div>
    `;

    content.innerHTML = mainHtml;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto lg:mx-auto pb-6 upbo-content-wrap';
}

// =========================================================================
// 업보정리 (구매내역/배송상태) 렌더링 함수들
// =========================================================================
function renderUpboPage() {
    const content = document.getElementById('mainContent');
    const themeColor = themeColors[upboCurrentMember] || '#8B5CF6';

    let toggleBtnHtml = '';
    if (isAdmin) {
        const isSearch = upboViewMode === 'search';
        toggleBtnHtml = `
            <div class="flex items-center gap-1 bg-[#F7F7FC] p-1.5 rounded-xl border border-[#ECEDFA] shadow-sm shrink-0">
                <button onclick="toggleUpboViewMode('search')" class="px-4 py-2 rounded-lg font-bold text-[14px] transition-all ${isSearch ? 'bg-white shadow-sm text-[#5D4037]' : 'text-gray-400 hover:text-gray-600'}">조회</button>
                <button onclick="toggleUpboViewMode('admin')" class="px-4 py-2 rounded-lg font-bold text-[14px] transition-all ${!isSearch ? 'bg-[#5D4037] shadow-sm text-white' : 'text-gray-400 hover:text-gray-600'}">관리</button>
            </div>
        `;
    }

    let mainHtml = `<div class="big-white-box upbo-box relative mx-auto" style="min-height: 850px; padding: ${isMobile ? '20px' : '40px'}; width: 100%; ${isMobile ? 'min-width: 0;' : ''} box-sizing: border-box;">`;
    mainHtml += `
        <div class="flex flex-col md:flex-row md:items-center justify-between w-full gap-4 mb-6 pb-5 border-b border-[#ECEDFA]">
            <div class="flex justify-start">
                <button onclick="changeTab('업보정리')" class="text-[20px] font-bold text-gray-400 hover:text-[#5D4037] transition-colors mb-1 inline-flex items-center gap-1"><i class="fi fi-rr-angle-small-left"></i> 멤버 목록으로</button>
            </div>
            <div class="flex justify-end md:ml-auto">
                ${toggleBtnHtml}
            </div>
        </div>`;

    if (upboViewMode === 'search' || !isAdmin) {
        const menuData = upboData[upboCurrentMember] || {};
        const menuItems = menuData.menu || [];
        const menuImage = menuData.menuImage || '';
        const menuListImage = menuData.menuListImage || '';
        let menuHtml = '';
        if (menuItems.length > 0 || menuListImage) {
            menuHtml = `
            <div class="w-full mx-auto mb-4">
                <button type="button" onclick="toggleUpboMenuPanel()" class="flex items-center gap-1.5 px-1 py-1.5 mb-2 group">
                    <div class="text-[18px] font-bold text-gray-400 flex items-center gap-1.5 group-hover:text-[#5D4037] transition-colors"><i class="fi fi-rr-shop"></i> 메뉴판</div>
                    <i id="upboMenuPanelChevron" class="fi fi-rr-angle-small-down text-gray-400 group-hover:text-[#5D4037] transition-all duration-200"></i>
                </button>
                <div id="upboMenuPanelBody" class="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-4">
                    ${menuListImage ? `
                    <div class="h-[30rem] sm:h-[42rem] md:h-[48rem] w-auto max-w-full rounded-3xl bg-white shadow-[0_10px_28px_rgba(70,60,160,0.12)] p-2 shrink-0 flex items-center justify-center">
                        <img src="${menuListImage}" class="h-full w-auto max-w-full object-contain rounded-2xl">
                    </div>` : `
                    <div class="w-full lg:w-1/2 max-w-[600px] lg:max-w-none min-w-0 flex flex-col gap-2.5">
                        ${menuItems.map(item => `
                            <div class="flex items-center gap-3 bg-white rounded-2xl border border-[#ECEDFA] shadow-[0_4px_14px_rgba(70,60,160,0.06)] pl-4 pr-4 py-3">
                                <div class="w-[5px] self-stretch rounded-full shrink-0" style="background-color:${themeColor};"></div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-[15px] font-bold text-[#3d2f2c] font-paperozi whitespace-pre-wrap break-words leading-snug">${item.name || '(이름 없음)'}</div>
                                    <div class="text-[11px] font-bold text-gray-300 mt-0.5">메뉴</div>
                                </div>
                                ${item.price ? `<div class="text-[16px] font-extrabold shrink-0" style="color:${themeColor};">${item.price}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>`}
                    ${menuImage ? `
                    <div class="h-[30rem] sm:h-[42rem] md:h-[48rem] w-auto max-w-full rounded-3xl bg-white shadow-[0_10px_28px_rgba(70,60,160,0.12)] p-2 shrink-0 flex items-center justify-center">
                        <img src="${menuImage}" class="h-full w-auto max-w-full object-contain rounded-2xl">
                    </div>` : ''}
                </div>
            </div>`;
        }
        mainHtml += menuHtml;
        mainHtml += `
            <div class="w-full mx-auto mb-10 bg-white rounded-2xl border border-[#ECEDFA] shadow-[0_10px_28px_rgba(70,60,160,0.08)] p-4 md:p-5">
                <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input type="text" id="upboSearchInput" class="min-w-0 border-[1.5px] border-[#ECEDFA] bg-[#FAFAFD] rounded-xl p-4 text-[17px] font-bold outline-none focus:border-[var(--theme-color)]" placeholder="닉네임 또는 아이디를 입력하세요" onkeypress="if(event.key==='Enter') searchUpbo()">
                    <button onclick="searchUpbo()" class="px-5 md:px-6 py-4 text-white font-bold rounded-xl hover:brightness-110 shadow-sm whitespace-nowrap text-[17px] font-paperozi" style="background-color:${themeColor};"><i class="fi fi-rr-search"></i><span class="hidden sm:inline"> 검색</span></button>
                </div>
                <div id="upboSearchResult" class="mt-8">
                    <div class="flex flex-col items-center justify-center text-center py-14 gap-3">
                        <div class="text-[48px]">🔍</div>
                        <div class="text-[20px] font-bold text-[#5D4037] font-paperozi">검색어를 입력해 주세요</div>
                        <div class="text-[14px] font-bold text-gray-400 leading-relaxed">검색창에 아이디나 닉네임을 입력하면<br>구매내역이 표시됩니다.</div>
                    </div>
                </div>
            </div>
        `;
    } else if (isAdmin && upboViewMode === 'admin') {
        mainHtml += `
            <div class="mt-4">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h3 class="text-[22px] font-bold text-[#5D4037] font-paperozi"><i class="fi fi-rr-settings"></i> ${upboCurrentMember} 업보 관리</h3>
                    <div class="flex flex-wrap items-center justify-start sm:justify-end gap-2 shrink-0 upbo-admin-toolbar">
                        <button onclick="saveUpboData()" class="px-5 py-2.5 bg-[#967978] text-white font-bold font-Diary rounded-xl hover:brightness-110 shadow-sm whitespace-nowrap"><i class="fi fi-rr-disk"></i> 저장하기</button>
                        
                        <div id="upboFileMenuWrapper" class="relative">
                            <button type="button" onclick="event.stopPropagation(); toggleUpboFileMenu()" class="px-4 py-2.5 bg-green-50 text-green-700 font-bold font-Diary rounded-xl hover:bg-green-100 border-[2px] border-green-200 shadow-sm whitespace-nowrap"><i class="fi fi-rr-file-upload"></i> 파일 업로드</button>
                            <div id="upboFileMenu" class="hidden absolute top-full right-0 mt-2 w-44 bg-white border-2 border-[#967978] rounded-xl shadow-lg z-20 overflow-hidden flex-col">
                                <button type="button" onclick="event.stopPropagation(); closeUpboFileMenu(); openUpboTextUploadModal();" class="w-full text-left px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-2"><i class="fi fi-rr-comment-alt"></i> 댓글 업로드</button>
                                <button type="button" onclick="event.stopPropagation(); closeUpboFileMenu(); document.getElementById('rouletteFileInput').click();" class="w-full text-left px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors flex items-center gap-2"><i class="fi fi-rr-dice"></i> 룰렛 업로드</button>
                            </div>
                        </div>
                        <input type="file" id="rouletteFileInput" accept=".xlsx,.xls,.csv" class="hidden" onchange="processRouletteFile(this)">
                            
                        <button onclick="addUpboProduct()" class="px-4 py-2.5 bg-blue-50 text-blue-700 font-bold font-Diary rounded-xl hover:bg-blue-100 border-[2px] border-blue-200 shadow-sm whitespace-nowrap">+ 상품(열) 추가</button>
                        <button onclick="toggleUpboGuide()" id="upboGuideBtn" class="px-5 py-2.5 bg-white text-[#967978] font-bold font-Diary rounded-xl hover:bg-[#967978] hover:text-white border-2 border-[#967978] shadow-sm whitespace-nowrap transition-all duration-200"><i class="fi fi-rr-info"></i> 사용법</button>
                    </div>
                </div>

                <!-- 메뉴 관리 -->
                <div class="mb-4 bg-white border border-[#ECEDFA] rounded-2xl p-4 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-[16px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2"><i class="fi fi-rr-shop"></i> 메뉴 관리</h3>
                        <button onclick="addUpboMenuItem()" class="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border-[1.5px] border-blue-200 shadow-sm text-[13px] hover:bg-blue-100 transition">+ 메뉴 추가</button>
                    </div>
                    <div class="flex items-center gap-3 mb-4 pb-4 border-b border-[#ECEDFA]">
                        <label class="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 cursor-pointer shrink-0 border border-gray-200 hover:brightness-95 transition">
                            <img id="upboMenuImagePreview" src="${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuImage) || ''}" class="w-full h-full object-cover ${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuImage) ? '' : 'hidden'}">
                            <div id="upboMenuImagePlaceholder" class="w-full h-full flex items-center justify-center text-gray-300 text-[18px] ${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuImage) ? 'hidden' : ''}"><i class="fi fi-rr-picture"></i></div>
                            <input type="file" accept="image/*" class="hidden" onchange="uploadUpboMenuImage(this)">
                        </label>
                        <div class="flex-1 min-w-0">
                            <div class="text-[13px] font-bold text-gray-400 mb-1.5">메뉴 전체에 사용할 대표 이미지를 등록해주세요.</div>
                            <input type="text" id="upboMenuImageUrlInput" value="${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuImage) || ''}" placeholder="이미지 URL을 붙여넣거나, 왼쪽 썸네일을 눌러 업로드하세요" class="w-full text-[13px] font-bold text-[#5D4037] outline-none bg-[#FAFAFD] border border-[#ECEDFA] rounded-lg px-3 py-2 focus:border-[var(--theme-color)]" oninput="setUpboMenuImageUrl(this.value)">
                        </div>
                    </div>
                    <div class="flex items-center gap-3 mb-4 pb-4 border-b border-[#ECEDFA]">
                        <label class="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 cursor-pointer shrink-0 border border-gray-200 hover:brightness-95 transition">
                            <img id="upboMenuListImagePreview" src="${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuListImage) || ''}" class="w-full h-full object-cover ${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuListImage) ? '' : 'hidden'}">
                            <div id="upboMenuListImagePlaceholder" class="w-full h-full flex items-center justify-center text-gray-300 text-[18px] ${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuListImage) ? 'hidden' : ''}"><i class="fi fi-rr-picture"></i></div>
                            <input type="file" accept="image/*" class="hidden" onchange="uploadUpboMenuListImage(this)">
                        </label>
                        <div class="flex-1 min-w-0">
                            <div class="text-[13px] font-bold text-gray-400 mb-1.5">메뉴판 이미지를 등록하면, 조회 화면 왼쪽에 아래 목록 대신 이 이미지 1장이 표시됩니다.</div>
                            <input type="text" id="upboMenuListImageUrlInput" value="${(upboData[upboCurrentMember] && upboData[upboCurrentMember].menuListImage) || ''}" placeholder="이미지 URL을 붙여넣거나, 왼쪽 썸네일을 눌러 업로드하세요" class="w-full text-[13px] font-bold text-[#5D4037] outline-none bg-[#FAFAFD] border border-[#ECEDFA] rounded-lg px-3 py-2 focus:border-[var(--theme-color)]" oninput="setUpboMenuListImageUrl(this.value)">
                        </div>
                    </div>
                    <div id="upboMenuAdminList" class="flex flex-col gap-2"></div>
                </div>

                <!-- 일괄 처리 컨트롤 바 -->
                <div class="flex flex-wrap items-center gap-2 mb-4 bg-[#F7F7FC] p-3 rounded-xl border border-[#ECEDFA] shadow-sm">
                    <span class="text-[14px] font-bold text-[#5D4037] ml-1">선택 항목:</span>
                    <select id="batchStatusSelect" class="border-[2px] border-[#5D4037] rounded-lg p-1.5 text-[13px] outline-none font-bold text-[#5D4037] cursor-pointer">
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                    </select>
                    <button onclick="changeStatusSelectedUpboRows()" class="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-lg border-[1.5px] border-purple-200 shadow-sm text-[13px] hover:bg-purple-100 transition">일괄 상태 변경</button>
                    <span class="text-gray-300 mx-1">|</span>
                    <button onclick="deleteSelectedUpboRows()" class="px-3 py-1.5 bg-red-50 text-red-700 font-bold rounded-lg border-[1.5px] border-red-200 shadow-sm text-[13px] hover:bg-red-100 transition">선택 삭제</button>
                </div>

                <div id="upboGuideBox" class="hidden mb-4 bg-[#FFFDF5] border border-[#ECEDFA] rounded-2xl p-6 shadow-[0_8px_20px_rgba(70,60,160,0.08)]">
                    <div>
                        <div class="text-[17px] font-bold text-[#5D4037] font-paperozi mb-3 flex items-center gap-2"><i class="fi fi-rr-box-open"></i> 업보정리 사용법</div>
                        <ol class="flex flex-col gap-2">
                            <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">1</span>데이터를 입력 후 저장하기를 누른다</li>
                            <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">2</span>저장하면 상태와 방송국 바로가기 버튼이 생긴다</li>
                            <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">3</span>시청자들이 조회창에서 본인이 구매한 것을 조회할 수 있습니다</li>
                        </ol>
                    </div>
                </div>
                <div class="overflow-x-auto lg:overflow-visible border border-[#ECEDFA] rounded-2xl bg-white mb-4 shadow-[0_10px_28px_rgba(70,60,160,0.08)] scrollbar-hide">
                    <table class="w-full text-left border-collapse min-w-max" id="upboAdminTable">
                    </table>
                </div>
                <button onclick="addUpboRow()" class="w-full py-4 bg-gray-50 text-gray-500 font-bold font-paperozi rounded-xl border-[2.5px] border-dashed border-gray-300 hover:bg-gray-100 hover:text-[#5D4037] transition text-lg">+ 새 사용자 행 추가</button>
            </div>
        `;
    }

    mainHtml += `</div>`;
    content.innerHTML = mainHtml;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-max lg:min-w-[1200px] lg:mx-auto pb-6 upbo-content-wrap';

    if (isAdmin && upboViewMode === 'admin') { renderUpboAdminTable(); renderUpboMenuAdminList(); }
}

function renderUpboAdminTable() {
    const table = document.getElementById('upboAdminTable');
    if(!table) return;
    const data = upboData[upboCurrentMember] || { products: [], records: [] };
    const products = data.products || [];
    const records = data.records || [];

    let thead = `<thead class="bg-[#FFFDF5] border-b-2 border-[#5D4037]"><tr>
        <th class="p-3 border-r border-gray-200 w-[40px] text-center"><input type="checkbox" id="upboCheckAll" class="accent-[#5D4037] w-4 h-4 cursor-pointer" onclick="toggleAllUpboCheckboxes(this.checked)"></th>
        <th class="p-3 border-r border-gray-200 min-w-[60px] text-[#5D4037] font-bold">닉네임</th>
        <th class="p-3 border-r border-gray-200 min-w-[60px] text-[#5D4037] font-bold">아이디</th>
        <th class="p-3 border-r border-gray-200 w-[90px] text-[#5D4037] font-bold text-center">구분</th>`;

    products.forEach((p, idx) => {
        thead += `<th class="px-1 py-2 border-r border-gray-200 w-[80px] max-w-[80px] relative group bg-[#f3f4f6]">
            <input type="text" class="w-full bg-transparent font-bold text-[#5D4037] outline-none upbo-product-header text-center text-[14px]" value="${p}" data-idx="${idx}" placeholder="상품명" onfocus="if(this.value==='새 상품') this.value='';">
            <button onclick="removeUpboProduct(${idx})" class="absolute top-1/2 -translate-y-1/2 right-0.5 text-red-500 opacity-0 group-hover:opacity-100 bg-white rounded-full shadow-sm p-0.5"><i class="fi fi-br-cross-small"></i></button>
        </th>`;
    });

    thead += `<th class="p-3 border-r border-gray-200 w-[120px] text-[#5D4037] font-bold text-center">룰렛</th>
              <th class="p-3 border-r border-gray-200 min-w-[110px] text-[#5D4037] font-bold text-center">요청사항</th>
              <th class="p-3 border-r border-gray-200 w-[80px] text-[#5D4037] font-bold text-center">상태</th>
              <th class="p-3 border-r border-gray-200 w-[70px] text-[#5D4037] font-bold text-center">방송국</th>
              <th class="p-3 w-[40px] text-center text-[#5D4037] font-bold">삭제</th>
              </tr></thead>`;

    let tbody = `<tbody id="upboTbody">`;
    records.forEach((r, rIdx) => {
        tbody += createUpboRowHtml(r, products);
    });
    tbody += `</tbody>`;

    table.innerHTML = thead + tbody;
}

function createUpboRowHtml(record, products) {
    let html = `<tr class="border-b border-gray-200 hover:bg-gray-50 transition upbo-data-row">
        <td class="p-2 border-r text-center"><input type="checkbox" class="upbo-row-checkbox accent-[#5D4037] w-4 h-4 cursor-pointer"></td>
        <td class="p-2 border-r"><input type="text" class="outline-none bg-transparent upbo-nick font-bold text-[#5D4037]" style="min-width: 60px; width: ${(record.nickname || '닉네임').length + 2}ch; field-sizing: content;" oninput="this.style.width = (this.value.length || this.placeholder.length) + 2 + 'ch';" value="${record.nickname || ''}" placeholder="닉네임"></td>
        <td class="p-2 border-r"><input type="text" class="outline-none bg-transparent upbo-uid font-bold text-gray-500" style="min-width: 60px; width: ${(record.uid || '아이디').length + 2}ch; field-sizing: content;" oninput="this.style.width = (this.value.length || this.placeholder.length) + 2 + 'ch';" value="${record.uid || ''}" placeholder="아이디"></td>
        <td class="p-2 border-r text-center"><input type="text" class="w-full outline-none bg-transparent upbo-category text-[13px] font-bold text-[#5D4037] text-center" style="min-width: 50px; width: ${(record.category || '구분').length + 2}ch; field-sizing: content;" oninput="this.style.width = (this.value.length || this.placeholder.length) + 2 + 'ch';" value="${record.category || ''}" placeholder="-"></td>`;

    products.forEach((p, pIdx) => {
        const qty = record.items && record.items[p] ? record.items[p] : '';
        html += `<td class="px-1 py-2 border-r bg-[#f9fafb] w-[80px] max-w-[80px] align-middle">
            <textarea class="w-full outline-none bg-transparent text-center font-bold text-[#5D4037] upbo-qty resize-none overflow-hidden block" style="min-height:24px; field-sizing: content;" rows="1" data-product-idx="${pIdx}" placeholder="-">${qty}</textarea>
        </td>`;
    });

    const currentStatus = (record.status === '배송완료') ? '배송완료' : '배송중';
    const sColor = currentStatus === '배송완료' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';
    
    let sel = `<input type="button" class="w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status ${sColor}" value="${currentStatus}" onclick="this.value = this.value === '배송중' ? '배송완료' : '배송중'; this.className = this.value === '배송완료' ? 'w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status bg-green-100 text-green-700' : 'w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status bg-purple-100 text-purple-700';">`;

    const linkBtn = `<button type="button" class="bg-blue-50 border border-blue-200 text-blue-600 font-bold w-full py-1 rounded text-[12px] hover:bg-blue-100 transition whitespace-nowrap shadow-sm" onclick="const uid = this.closest('tr').querySelector('.upbo-uid').value.trim(); if(uid) { window.open('https://www.sooplive.com/station/' + uid, '_blank'); } else { alert('아이디를 먼저 입력해주세요.'); }">바로가기</button>`;

    html += `<td class="p-2 border-r align-middle">
                <textarea class="w-full outline-none bg-transparent text-center text-[13px] text-purple-600 font-bold upbo-roulette resize-none overflow-hidden block" style="min-height:24px; field-sizing: content;" rows="1" placeholder="-">${record.roulette || ''}</textarea>
             </td>
             <td class="p-2 border-r"><textarea class="w-full outline-none bg-transparent upbo-memo text-[13px] text-gray-600 resize-none overflow-hidden block" style="min-width: 90px; min-height:24px; field-sizing: content;" rows="1" placeholder="요청사항">${record.memo || ''}</textarea></td>
             <td class="p-2 border-r align-middle">${sel}</td>
             <td class="p-2 border-r text-center align-middle">${linkBtn}</td>
             <td class="p-2 text-center align-middle"><button onclick="this.closest('tr').remove()" class="text-gray-400 hover:text-red-500 transition text-lg"><i class="fi fi-br-cross-small"></i></button></td>
             </tr>`;
    return html;
}
function syncUpboDomToState() {
    const table = document.getElementById('upboAdminTable');
    if(!table) return;

    const productInputs = table.querySelectorAll('.upbo-product-header');
    let newProducts = [];
    productInputs.forEach(inp => newProducts.push(inp.value.trim()));

    let newRecords = [];
    const rows = table.querySelectorAll('.upbo-data-row');
    rows.forEach(tr => {
        const nick = tr.querySelector('.upbo-nick').value.trim();
        const uid = tr.querySelector('.upbo-uid').value.trim();
        const status = tr.querySelector('.upbo-status').value;
        const categoryEl = tr.querySelector('.upbo-category');
        const category = categoryEl ? categoryEl.value.trim() : '';
        const memoEl = tr.querySelector('.upbo-memo');
        const memo = memoEl ? memoEl.value.trim() : '';
        
        // 👇 누락되었던 룰렛 저장 로직 추가 👇
        const rouletteEl = tr.querySelector('.upbo-roulette');
        const roulette = rouletteEl ? rouletteEl.value.trim() : '';

        let items = {};
        tr.querySelectorAll('.upbo-qty').forEach((inp) => {
            const pIdx = inp.getAttribute('data-product-idx');
            const pName = newProducts[pIdx];
            const raw = inp.value.trim();
            if(!pName || !raw) return;
            const val = parseInt(raw, 10);
            if(!isNaN(val) && String(val) === raw && val > 0) {
                items[pName] = val;
            } else {
                items[pName] = raw;
            }
        });
        if (nick || uid) {
            newRecords.push({ nickname: nick, uid: uid, category: category, items: items, status: status, memo: memo, roulette: roulette });
        }
    });

    if(!upboData[upboCurrentMember]) upboData[upboCurrentMember] = {products:[], records:[]};
    upboData[upboCurrentMember].products = newProducts;
    upboData[upboCurrentMember].records = newRecords;
}

// 수동으로 행 추가 시 roulette 초기화
function addUpboRow() {
    syncUpboDomToState();
    upboData[upboCurrentMember].records.push({ nickname:'', uid:'', category:'', items:{}, roulette:'', status:'배송중', memo:'' });
    renderUpboAdminTable();
}

function addUpboProduct() {
    syncUpboDomToState();
    upboData[upboCurrentMember].products.push('새 상품');
    renderUpboAdminTable();
}

function removeUpboProduct(idx) {
    if(!confirm("이 상품 열을 삭제하시겠습니까? 데이터도 함께 지워집니다.")) return;
    syncUpboDomToState();
    const pName = upboData[upboCurrentMember].products[idx];
    upboData[upboCurrentMember].products.splice(idx, 1);
    upboData[upboCurrentMember].records.forEach(r => {
        if(r.items && r.items[pName] !== undefined) delete r.items[pName];
    });
    renderUpboAdminTable();
}

// ===== 업보 메뉴 관리 (대표 이미지 1개 + 품목명/가격 목록) =====
function ensureUpboMenuArray() {
    if (!upboData[upboCurrentMember]) upboData[upboCurrentMember] = { products: [], records: [], menu: [], menuImage: '', menuListImage: '' };
    if (!upboData[upboCurrentMember].menu) upboData[upboCurrentMember].menu = [];
    if (upboData[upboCurrentMember].menuImage === undefined) upboData[upboCurrentMember].menuImage = '';
    if (upboData[upboCurrentMember].menuListImage === undefined) upboData[upboCurrentMember].menuListImage = '';
    return upboData[upboCurrentMember].menu;
}

function addUpboMenuItem() {
    const menu = ensureUpboMenuArray();
    menu.push({ name: '', price: '' });
    renderUpboMenuAdminList();
}

function removeUpboMenuItem(idx) {
    const menu = ensureUpboMenuArray();
    menu.splice(idx, 1);
    renderUpboMenuAdminList();
}

function updateUpboMenuField(idx, field, value) {
    const menu = ensureUpboMenuArray();
    if (!menu[idx]) return;
    menu[idx][field] = value;
}

async function uploadUpboMenuImage(inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    ensureUpboMenuArray();
    try {
        const url = await window.uploadImageToCloudinary(inputEl.files[0]);
        if (url) {
            upboData[upboCurrentMember].menuImage = url;
            const previewImg = document.getElementById('upboMenuImagePreview');
            const placeholder = document.getElementById('upboMenuImagePlaceholder');
            const urlInput = document.getElementById('upboMenuImageUrlInput');
            if (previewImg) { previewImg.src = url; previewImg.classList.remove('hidden'); }
            if (placeholder) placeholder.classList.add('hidden');
            if (urlInput) urlInput.value = url;
        }
    } catch (e) {
        console.error(e);
        alert('이미지 업로드에 실패했습니다.');
    }
}

function setUpboMenuImageUrl(url) {
    ensureUpboMenuArray();
    upboData[upboCurrentMember].menuImage = url.trim();
    const previewImg = document.getElementById('upboMenuImagePreview');
    const placeholder = document.getElementById('upboMenuImagePlaceholder');
    if (previewImg && placeholder) {
        if (url.trim()) {
            previewImg.src = url.trim();
            previewImg.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            previewImg.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }
}

async function uploadUpboMenuListImage(inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    ensureUpboMenuArray();
    try {
        const url = await window.uploadImageToCloudinary(inputEl.files[0]);
        if (url) {
            upboData[upboCurrentMember].menuListImage = url;
            const previewImg = document.getElementById('upboMenuListImagePreview');
            const placeholder = document.getElementById('upboMenuListImagePlaceholder');
            const urlInput = document.getElementById('upboMenuListImageUrlInput');
            if (previewImg) { previewImg.src = url; previewImg.classList.remove('hidden'); }
            if (placeholder) placeholder.classList.add('hidden');
            if (urlInput) urlInput.value = url;
        }
    } catch (e) {
        console.error(e);
        alert('이미지 업로드에 실패했습니다.');
    }
}

function setUpboMenuListImageUrl(url) {
    ensureUpboMenuArray();
    upboData[upboCurrentMember].menuListImage = url.trim();
    const previewImg = document.getElementById('upboMenuListImagePreview');
    const placeholder = document.getElementById('upboMenuListImagePlaceholder');
    if (previewImg && placeholder) {
        if (url.trim()) {
            previewImg.src = url.trim();
            previewImg.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            previewImg.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }
}

function toggleUpboMenuPanel() {
    const body = document.getElementById('upboMenuPanelBody');
    const chevron = document.getElementById('upboMenuPanelChevron');
    if (!body) return;
    const isCollapsed = body.style.display === 'none';
    body.style.display = isCollapsed ? 'flex' : 'none';
    if (chevron) chevron.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
}

function renderUpboMenuAdminList() {
    const container = document.getElementById('upboMenuAdminList');
    if (!container) return;
    const menu = ensureUpboMenuArray();

    if (menu.length === 0) {
        container.innerHTML = `<div class="text-center text-[13px] font-bold text-gray-300 py-4">등록된 메뉴가 없습니다. "+ 메뉴 추가"를 눌러 등록해보세요.</div>`;
        return;
    }

    container.innerHTML = menu.map((item, idx) => `
        <div class="relative flex items-center gap-2 bg-[#FAFAFD] border border-[#ECEDFA] rounded-xl p-2.5 group">
            <textarea placeholder="품목명" class="flex-1 min-w-0 text-[14px] font-bold text-[#5D4037] outline-none bg-transparent border-b border-transparent focus:border-[#ECEDFA] px-1 resize-none overflow-hidden block" style="min-height:24px; field-sizing: content;" rows="1" oninput="updateUpboMenuField(${idx}, 'name', this.value)">${item.name || ''}</textarea>
            <input type="text" value="${item.price || ''}" placeholder="가격" class="w-28 text-[13px] text-gray-500 outline-none bg-transparent border-b border-transparent focus:border-[#ECEDFA] px-1" oninput="updateUpboMenuField(${idx}, 'price', this.value)">
            <button onclick="removeUpboMenuItem(${idx})" class="text-red-400 hover:text-red-600 bg-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] shadow-sm shrink-0 transition"><i class="fi fi-br-cross-small"></i></button>
        </div>
    `).join('');
}


async function saveUpboData() {
    syncUpboDomToState();
    const dataToSave = upboData[upboCurrentMember];

    try {
        const memberToEng = {'달타':'dalta', '다룽':'darung', '최또':'choiagain', '카나시':'kanashi'};
        const docId = memberToEng[upboCurrentMember];
        await setDoc(doc(db, 'upboData', docId), dataToSave);
        saveScheduleCache();
        alert("데이터가 성공적으로 저장되었습니다!");
    } catch(e) {
        console.error(e);
        alert("저장 실패: " + e.message);
    }
}

// 검색어/저장된 닉네임·아이디에서 영어, 숫자, 한글만 남기고 나머지(특수문자, 공백, 언더바 등)는 전부 제거한다.
// 예) "김철수_", "_김철수", "김-철수" 는 모두 "김철수"로 정규화되어 서로 같은 값으로 취급된다.
function normalizeUpboSearchText(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9가-힣]/gi, '');
}

function searchUpbo() {
    const rawQuery = document.getElementById('upboSearchInput').value.trim();
    const query = normalizeUpboSearchText(rawQuery);
    const resultContainer = document.getElementById('upboSearchResult');
    
    if(!query) {
        resultContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center text-center py-14 gap-3">
                <div class="text-[48px]">🔍</div>
                <div class="text-[20px] font-bold text-[#5D4037] font-paperozi">검색어를 입력해 주세요</div>
                <div class="text-[14px] font-bold text-gray-400 leading-relaxed">검색창에 아이디나 닉네임을 입력하면<br>구매내역이 표시됩니다.</div>
            </div>`;
        return;
    }

    const data = upboData[upboCurrentMember] || { records: [] };
    const records = data.records || [];

    const matches = records.filter(r =>
        (r.nickname && normalizeUpboSearchText(r.nickname) === query) ||
        (r.uid && normalizeUpboSearchText(r.uid) === query)
    );

    if(matches.length === 0) {
        resultContainer.innerHTML = `
            <div class="bg-[#FFFDF5] border-[2.5px] border-[#5D4037] rounded-2xl p-10 text-center shadow-sm mt-4">
                <div class="text-[50px] mb-4 drop-shadow-md">🧐</div>
                <div class="text-[20px] font-bold text-[#5D4037] font-paperozi">검색된 구매 내역이 없습니다.</div>
                <div class="text-[15px] font-bold text-gray-400 mt-2">닉네임이나 아이디를 정확히 입력했는지 확인해주세요.</div>
            </div>`;
        return;
    }

    let html = `<div class="space-y-4">`;
    matches.forEach(r => {
        let itemsHtml = '';
        const pKeys = Object.keys(r.items || {});
        let totalItems = 0;

        if(pKeys.length > 0) {
            pKeys.forEach(p => {
                const v = r.items[p];
                const isNum = typeof v === 'number';
                const hasValue = isNum ? v > 0 : String(v ?? '').trim() !== '';
                if(hasValue) {
                    totalItems++;
                    const displayVal = isNum ? `${v} 개` : `${v}`;
                    itemsHtml += `
                        <div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                            <span class="font-bold text-gray-500 text-[20px] shrink-0">${p}</span>
                            <span class="font-bold text-[20px] text-[#5D4037] text-right whitespace-pre-line leading-snug break-words ml-2">${displayVal}</span>
                        </div>`;
                }
            });
        }

        if (totalItems === 0 && !r.roulette && !r.memo) {
            itemsHtml = `<div class="text-gray-400 font-bold text-center py-6">주문된 상품이 없습니다.</div>`;
        }

        if(r.roulette) {
            itemsHtml += `
                <div class="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                    <span class="font-bold text-gray-500 text-[20px] shrink-0">🎲 룰렛 당첨</span>
                    <div class="font-bold text-[20px] text-[#5D4037] text-right whitespace-pre-line leading-snug break-words ml-2">${r.roulette}</div>
                </div>`;
        }

        if(r.memo) {
            itemsHtml += `
                <div class="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                    <span class="font-bold text-gray-500 text-[20px] shrink-0">📝 요청사항</span>
                    <div class="font-bold text-[20px] text-[#5D4037] text-right whitespace-pre-line leading-snug break-words ml-2">${r.memo}</div>
                </div>`;
        }

        const statusColorMap = {
            '결제대기': 'bg-gray-50 text-gray-500 border-gray-200',
            '결제완료': 'bg-blue-50 text-blue-600 border-blue-200',
            '배송준비': 'bg-yellow-50 text-yellow-600 border-yellow-200',
            '배송중': 'bg-purple-50 text-purple-600 border-purple-200',
            '배송완료': 'bg-green-50 text-green-600 border-green-200'
        };
        const sColor = statusColorMap[r.status] || 'bg-gray-50 text-gray-500 border-gray-200';

        html += `
            <div class="bg-white border border-[#ECEDFA] rounded-2xl p-5 shadow-[0_4px_14px_rgba(70,60,160,0.06)]">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-3 pb-3 border-b border-gray-100 gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-[23px] font-bold text-[#5D4037] font-paperozi">${r.nickname}</span>
                        <span class="text-[18px] font-bold text-gray-400">ID: ${r.uid || '미기입'}</span>
                    </div>
                    <span class="px-3 py-1 rounded-full font-bold text-[17px] border w-max ${sColor}">${r.status}</span>
                </div>
                <div class="flex flex-col">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    resultContainer.innerHTML = html;
}

// =========================================================================
// 롤링페이퍼 렌더링 함수
// =========================================================================
function renderRollingPaper() {
    const content = document.getElementById('mainContent');
    const bgClass = isMobile ? 'p-4' : 'p-10';
    let html = `<div class="big-white-box relative theme-rolling" style="min-height: 1200px; padding: ${isMobile ? '20px' : '40px'}; width: 100%; display: block; box-sizing: border-box;">`;
    const todayStr = getTodayYYYYMMDD();

    const addTopicBtnHtml = isAdmin ? `
        <button onclick="openRollingTopicModal()" class="px-4 py-2.5 md:px-6 md:py-3 bg-[#8B5CF6] text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:brightness-110 hover:-translate-y-1 transition font-paperozi text-[15px] md:text-lg shrink-0 flex items-center gap-1.5">
            <i class="fi fi-br-plus"></i> 주제 추가
        </button>
    ` : '';

    if (!currentRollingTopic) {
        html += `
            <div class="flex justify-between items-center mb-8">
                <h2 class="text-[28px] lg:text-3xl font-bold text-[#5D4037] font-paperozi">롤링페이퍼 주제 목록</h2>
                ${addTopicBtnHtml}
            </div>
            <div class="flex flex-wrap justify-start gap-6">
        `;
        rollingTopics.forEach(topic => {
            const isExpired = topic.date < todayStr;
            const badgeHtml = isExpired 
                ? `<span class="bg-gray-400 text-white text-[12px] px-2 py-1 rounded font-bold mr-2 align-middle">마감</span>` 
                : `<span class="bg-[#8B5CF6] text-white text-[12px] px-2 py-1 rounded font-bold mr-2 align-middle">진행중</span>`;
            
            html += `
                <div class="rolling-topic-card w-full md:w-[calc(50%-0.75rem)] max-w-[850px] min-h-[200px] flex flex-col justify-center p-10 cursor-pointer relative bg-white rounded-2xl shadow-[0_8px_22px_rgba(93,64,55,0.10)] hover:shadow-[0_14px_30px_rgba(93,64,55,0.16)] hover:-translate-y-1 transition" onclick="openRollingTopic('${topic.id}')">
                    ${isAdmin ? `
                    <div class="absolute top-2 right-2 flex gap-1 z-10 bg-[#FFFDF5]/90 rounded-md px-1">
                        <button onclick="event.stopPropagation(); deleteRollingTopic('${topic.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fi fi-br-cross-small"></i></button>
                    </div>
                    ` : ''}
                    <div class="text-[24px] font-bold text-[#5D4037] mb-4 font-paperozi line-clamp-2">${badgeHtml}${escapeHtml(topic.title)}</div>
                    <div class="text-gray-500 font-bold text-[17px]">${topic.date}</div>
                </div>
            `;
        });
        if(rollingTopics.length === 0) html += `<div class="w-full text-center text-gray-400 font-bold py-16 text-lg">생성된 롤링페이퍼 주제가 없습니다.</div>`;
        html += `</div>`;
    } else {
        currentTopicEntries = rollingEntries.filter(e => e.topicId === currentRollingTopic.id);
        const isExpired = currentRollingTopic.date < todayStr;
        const actionBtn = isExpired 
            ? `<button class="px-6 py-3 bg-gray-400 text-white font-bold rounded-xl cursor-not-allowed font-paperozi text-lg shrink-0 shadow-[2px_2px_0px_0px_rgba(93,64,55,1)]" onclick="alert('이 롤링페이퍼는 마감되어 더 이상 작성할 수 없습니다.')"><i class="fi fi-rr-lock"></i> 마감됨</button>`
            : `<button onclick="openRollingEntryModal()" class="px-6 py-3 bg-[#8B5CF6] text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:brightness-110 hover:-translate-y-1 transition font-paperozi text-lg shrink-0"><i class="fi fi-rr-edit"></i> 작성하기</button>`;

        html += `
            <div class="flex flex-col lg:flex-row justify-between lg:items-center mb-8 border-b border-[#ECEDFA] pb-5 gap-4">
                <div class="flex items-center gap-3">
                    <button onclick="closeRollingTopic()" class="text-3xl text-[#5D4037] hover:scale-110 transition"><i class="fi fi-rr-angle-left"></i></button>
                    <h2 class="text-[24px] lg:text-3xl font-bold text-[#5D4037] font-paperozi line-clamp-1">${escapeHtml(currentRollingTopic.title)}</h2>
                </div>
                ${actionBtn}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        `;
        
        currentTopicEntries.forEach((entry, idx) => {
            const bgStyle = entry.imageUrl 
                ? `background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${entry.imageUrl}'); background-size: cover; background-position: center;` 
                : `background-color: #ffffff;`;
            const textStyle = entry.imageUrl ? `color: #ffffff;` : `color: #5D4037;`;
            const nickStyle = entry.imageUrl ? `color: #e5e7eb; border-top-color: rgba(255,255,255,0.4);` : `color: #6b7280; border-top-color: #d1d5db;`;

            html += `
                <div class="rolling-entry-card rounded-2xl p-5 cursor-pointer relative flex flex-col h-[400px] shadow-[0_8px_22px_rgba(93,64,55,0.10)] hover:shadow-[0_14px_30px_rgba(93,64,55,0.16)] hover:-translate-y-1 transition" style="${bgStyle}" onclick="openRollingDetailModal(${idx})">
                    ${(isAdmin || (currentUser && entry.authorUid && entry.authorUid === currentUser.uid)) ? `
                    <div class="absolute top-2 right-2 flex gap-1 z-10 bg-[#FFFDF5]/90 rounded-md px-1">
                        <button onclick="event.stopPropagation(); openEditRollingEntryModal('${entry.id}')" class="text-blue-500 hover:text-blue-700 p-1"><i class="fi fi-rr-edit"></i></button>
                        <button onclick="event.stopPropagation(); deleteRollingEntry('${entry.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fi fi-br-cross-small"></i></button>
                    </div>
                    ` : ''}
                    <div class="text-[16px] font-medium whitespace-pre-wrap flex-1 overflow-hidden pointer-events-none mt-2 break-words ${entry.imageUrl ? '' : 'dm-text-brown'}" style="display: -webkit-box; -webkit-line-clamp: 14; -webkit-box-orient: vertical; ${textStyle}">${escapeHtml(entry.content)}</div>
                    <div class="text-right text-[14px] font-bold mt-3 pt-2 border-t-2 border-dashed pointer-events-none shrink-0" style="${nickStyle}">- ${escapeHtml(entry.nickname) || '익명'}</div>
                </div>
            `;
        });
        if(currentTopicEntries.length === 0) html += `<div class="col-span-full text-center text-gray-400 font-bold py-16 text-lg">첫 번째 롤링페이퍼를 작성해 보세요!</div>`;
        html += `</div>`;
    }
    html += `</div>`;
    content.innerHTML = html;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-[1795px] max-w-full lg:mx-auto pb-6';
}

function openRollingTopicModal() {
    document.getElementById('rtTitle').value = '';
    document.getElementById('rtDate').value = getTodayYYYYMMDD();
    document.getElementById('rollingTopicModal').classList.replace('hidden', 'flex');
}
function closeRollingTopicModal() { document.getElementById('rollingTopicModal').classList.replace('flex', 'hidden'); }

async function saveRollingTopic() {
    const title = document.getElementById('rtTitle').value.trim();
    const date = document.getElementById('rtDate').value;
    if(!title) return alert("주제를 입력해주세요.");
    
    try {
        const newTopic = { title, date, timestamp: Date.now() };
        const docRef = await addDoc(collection(db, 'rollingTopics'), newTopic);
        rollingTopics.push({ id: docRef.id, ...newTopic });
        sortRollingTopics();
        saveScheduleCache();
        closeRollingTopicModal();
        renderHeaderTabs(); 
        render();
    } catch(e) { console.error(e); }
}

async function deleteRollingTopic(id) {
    if(!confirm("주제를 삭제하면 안에 있는 방명록도 모두 지워집니다. 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, 'rollingTopics', id));
        rollingTopics = rollingTopics.filter(t => t.id !== id);
        rollingEntries = rollingEntries.filter(e => e.topicId !== id);
        saveScheduleCache();
        renderHeaderTabs(); 
        render();
    } catch(e) { console.error(e); }
}

// rollingEntries 컬렉션 전체를 긁는 대신, 실제로 열어본 주제(topicId)의 항목만 그때그때 불러와 캐싱한다.
async function ensureRollingEntriesLoaded(topicId) {
    if (!topicId || loadedRollingTopicIds.has(topicId)) return;
    try {
        const q = query(collection(db, 'rollingEntries'), where('topicId', '==', topicId));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
            if (!rollingEntries.some(e => e.id === docSnap.id)) {
                rollingEntries.push({ id: docSnap.id, ...docSnap.data() });
            }
        });
        loadedRollingTopicIds.add(topicId);
        saveScheduleCache();
    } catch (e) {
        console.error('롤링페이퍼 항목 로드 에러:', e);
    }
}

async function openRollingTopic(id) {
    currentRollingTopic = rollingTopics.find(t => t.id === id);
    render();
    await ensureRollingEntriesLoaded(id);
    if (currentRollingTopic && currentRollingTopic.id === id) render();
}
function closeRollingTopic() { currentRollingTopic = null; render(); }

function openRollingEntryModal() {
    if (currentRollingTopic && currentRollingTopic.date < getTodayYYYYMMDD()) {
        alert('이 롤링페이퍼는 마감되어 더 이상 작성할 수 없습니다.');
        return;
    }
    editRollingEntryId = null;
    document.getElementById('reModalTitle').innerText = '작성하기';
    document.getElementById('reContent').value = '';
    document.getElementById('reNickname').value = '';
    
    if(document.getElementById('reImage')) document.getElementById('reImage').value = '';
    if(document.getElementById('reImageUrl')) document.getElementById('reImageUrl').value = '';
    if(document.getElementById('reImageRemoveBtn')) document.getElementById('reImageRemoveBtn').classList.add('hidden');
    
    document.getElementById('rollingEntryModal').classList.replace('hidden', 'flex');
}

function closeRollingEntryModal() { document.getElementById('rollingEntryModal').classList.replace('flex', 'hidden'); }

function openEditRollingEntryModal(id) {
    const entry = rollingEntries.find(e => e.id === id);
    if(!entry) return;

    const isOwner = currentUser && entry.authorUid && entry.authorUid === currentUser.uid;
    if (!isAdmin && !isOwner) {
        alert('본인이 작성한 글만 수정할 수 있습니다.');
        return;
    }

    editRollingEntryId = id;
    document.getElementById('reModalTitle').innerText = isAdmin ? '방명록 수정 (관리자)' : '방명록 수정';
    document.getElementById('reContent').value = entry.content;
    document.getElementById('reNickname').value = entry.nickname;
    
    if(document.getElementById('reImage')) document.getElementById('reImage').value = '';
    
    if(document.getElementById('reImageUrl')) {
        if (entry.imageUrl) {
            document.getElementById('reImageUrl').value = entry.imageUrl;
            document.getElementById('reImageRemoveBtn').classList.remove('hidden');
        } else {
            document.getElementById('reImageUrl').value = '';
            document.getElementById('reImageRemoveBtn').classList.add('hidden');
        }
    }
    
    document.getElementById('rollingEntryModal').classList.replace('hidden', 'flex');
}

async function saveRollingEntry() {
    const content = document.getElementById('reContent').value.trim();
    const nickname = document.getElementById('reNickname').value.trim();
    if(!content) return alert("내용을 입력해주세요.");
    
    const saveBtn = document.querySelector('#rollingEntryModal button[onclick="saveRollingEntry()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = '저장 중⏳';
        saveBtn.classList.add('cursor-not-allowed', 'opacity-50'); 
    }

    let imageUrl = document.getElementById('reImageUrl') ? document.getElementById('reImageUrl').value : '';
    const fileInput = document.getElementById('reImage');
    
    let toast = null;

    if (fileInput && fileInput.files.length > 0) {
        toast = document.createElement('div');
        toast.innerText = '이미지를 업로드 중 입니다..⏳';
        toast.className = 'fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-[#5D4037] text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold font-paperozi transition-opacity duration-300 opacity-0';
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.remove('opacity-0'));

        const url = await window.uploadImageToCloudinary(fileInput.files[0]);
        if (url) imageUrl = url;
        
        if (toast) {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300); 
        }
    }
    
    try {
        if(editRollingEntryId) {
            await updateDoc(doc(db, 'rollingEntries', editRollingEntryId), { content, nickname, imageUrl });
            const idx = rollingEntries.findIndex(e => e.id === editRollingEntryId);
            if(idx > -1) { 
                rollingEntries[idx].content = content; 
                rollingEntries[idx].nickname = nickname; 
                rollingEntries[idx].imageUrl = imageUrl; 
            }
        } else {
            const newEntry = { topicId: currentRollingTopic.id, content, nickname, imageUrl, timestamp: Date.now(), authorUid: currentUser ? currentUser.uid : null };
            const docRef = await addDoc(collection(db, 'rollingEntries'), newEntry);
            rollingEntries.unshift({ id: docRef.id, ...newEntry });
        }
        saveScheduleCache();
        closeRollingEntryModal();
        render();
    } catch(e) { 
        console.error(e); 
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = '저장';
            saveBtn.classList.remove('cursor-not-allowed', 'opacity-50');
        }
    }
}

async function deleteRollingEntry(id) {
    const entry = rollingEntries.find(e => e.id === id);
    if(!entry) return;

    const isOwner = currentUser && entry.authorUid && entry.authorUid === currentUser.uid;
    if (!isAdmin && !isOwner) {
        alert('본인이 작성한 글만 삭제할 수 있습니다.');
        return;
    }

    if(!confirm("이 방명록을 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, 'rollingEntries', id));
        rollingEntries = rollingEntries.filter(e => e.id !== id);
        saveScheduleCache();
        render();
    } catch(e) { console.error(e); }
}

function openRollingDetailModal(index) {
    currentEntryIndex = index;
    const container = document.getElementById('rdSliderContainer');
    
    container.innerHTML = currentTopicEntries.map((entry, idx) => {
        const bgStyle = entry.imageUrl 
            ? `background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${entry.imageUrl}'); background-size: cover; background-position: center; border: none;` 
            : `background-color: var(--card-bg-cream); border: 0px;`; 
        const textStyle = entry.imageUrl ? `color: #ffffff;` : `color: #5D4037;`;
        const nickStyle = entry.imageUrl ? `color: #e5e7eb; border-top-color: rgba(255,255,255,0.4);` : `color: #6b7280; border-top-color: #5D4037;`;
        const pcBorder = entry.imageUrl ? '' : 'md:border-4 border-[#5D4037]';
        
        return `
        <div class="snap-center shrink-0 w-full h-full md:h-[1000px] flex items-center justify-center md:my-auto px-0 md:px-4">
            <div class="modal-content w-full h-full rounded-none md:rounded-3xl shadow-2xl flex flex-col p-6 pt-20 pb-8 md:p-12 relative overflow-hidden ${pcBorder}" style="${bgStyle}">
                <div class="text-[20px] md:text-[24px] font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 min-h-0 modal-scroll break-words px-4 md:px-0 drop-shadow-sm ${entry.imageUrl ? '' : 'dm-text-brown'}" style="${textStyle}">${escapeHtml(entry.content)}</div>
                <div class="text-right text-[18px] md:text-[20px] font-bold mt-6 pt-4 border-t-2 border-dashed px-4 md:px-0 drop-shadow-sm shrink-0" style="${nickStyle}">- ${escapeHtml(entry.nickname) || '익명'}</div>
            </div>
        </div>`;
    }).join('');

    document.getElementById('rollingDetailModal').classList.replace('hidden', 'flex');
    
    setTimeout(() => {
        container.scrollLeft = index * container.clientWidth;
    }, 10);
}
function navigateRollingDetail(direction) {
    const container = document.getElementById('rdSliderContainer');
    let newIndex = currentEntryIndex + direction;
    
    if(newIndex < 0) newIndex = currentTopicEntries.length - 1;
    if(newIndex >= currentTopicEntries.length) newIndex = 0;
    
    currentEntryIndex = newIndex;
    container.scrollTo({ left: currentEntryIndex * container.clientWidth, behavior: 'smooth' });
}

function updateCurrentEntryIndex(container) {
    if (container.clientWidth > 0) {
        currentEntryIndex = Math.round(container.scrollLeft / container.clientWidth);
    }
}
window.updateCurrentEntryIndex = updateCurrentEntryIndex;

function closeRollingDetailModal() { document.getElementById('rollingDetailModal').classList.replace('flex', 'hidden'); }

// =========================================================================
// 시그널 (지난 방송 아카이브) 렌더링 & 로직
// =========================================================================
function sortSignalRecords() {
    signalRecords.sort((a, b) => {
        const dateDiff = (b.date || '').localeCompare(a.date || '');
        if (dateDiff !== 0) return dateDiff;
        return (b.timestamp || 0) - (a.timestamp || 0);
    });
}

// 시그널 기록 컬렉션은 계속 쌓이는 구조라 매번 전체를 긁지 않고,
// date 기준 최근 SIGNAL_RECORDS_PAGE_SIZE개만 먼저 불러온다.
async function loadSignalRecordsFirstPage() {
    const q = query(collection(db, 'signal_records'), orderBy('date', 'desc'), limit(SIGNAL_RECORDS_PAGE_SIZE));
    const snap = await getDocs(q);
    signalRecords = [];
    snap.forEach(docSnap => signalRecords.push({ id: docSnap.id, ...docSnap.data() }));
    signalRecordsCursorDate = signalRecords.length > 0 ? signalRecords[signalRecords.length - 1].date : null;
    signalRecordsHasMore = snap.docs.length === SIGNAL_RECORDS_PAGE_SIZE;
    sortSignalRecords();
}

// "더 보기" - 이전에 불러온 마지막 date 이후(더 과거) 기록을 이어서 불러온다.
async function loadMoreSignalRecords() {
    if (signalRecordsLoadingMore || !signalRecordsHasMore) return;
    signalRecordsLoadingMore = true;
    render();
    try {
        let q = query(collection(db, 'signal_records'), orderBy('date', 'desc'), limit(SIGNAL_RECORDS_PAGE_SIZE));
        if (signalRecordsCursorDate) {
            q = query(collection(db, 'signal_records'), orderBy('date', 'desc'), startAfter(signalRecordsCursorDate), limit(SIGNAL_RECORDS_PAGE_SIZE));
        }
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
            if (!signalRecords.some(r => r.id === docSnap.id)) {
                signalRecords.push({ id: docSnap.id, ...docSnap.data() });
            }
        });
        if (snap.docs.length > 0) {
            signalRecordsCursorDate = snap.docs[snap.docs.length - 1].data().date || signalRecordsCursorDate;
        }
        signalRecordsHasMore = snap.docs.length === SIGNAL_RECORDS_PAGE_SIZE;
        sortSignalRecords();
        saveScheduleCache();
    } catch (e) {
        console.error('시그널 추가 로드 에러:', e);
    } finally {
        signalRecordsLoadingMore = false;
        render();
    }
}
window.loadMoreSignalRecords = loadMoreSignalRecords;

function renderSignalPage() {
    const content = document.getElementById('mainContent');
    const bgClass = isMobile ? 'p-4' : 'p-10';

    const addBtnHtml = isAdmin ? `
        <button onclick="openSignalAddModal()" class="px-4 py-2.5 md:px-6 md:py-3 bg-[#FF5252] text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:brightness-110 hover:-translate-y-1 transition font-paperozi text-[15px] md:text-lg shrink-0 flex items-center gap-1.5">
            <i class="fi fi-br-plus"></i> 추가
        </button>
    ` : '';

    let html = `<div class="big-white-box relative theme-signal" style="min-height: 1200px; padding: ${isMobile ? '20px' : '40px'}; width: 100%; display: block; box-sizing: border-box;">`;
    html += `
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-[28px] lg:text-3xl font-bold text-[#5D4037] font-paperozi">시그널</h2>
            ${addBtnHtml}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    `;

    signalRecords.forEach(record => {
        const thumb = record.imageUrl || 'https://via.placeholder.com/400x300/ffdddd/FF5252?text=SIGNAL';
        
        // 쉼표나 공백으로 구분된 멤버들을 각각 분리하여 뱃지 생성
        const memberNames = (record.member || '').split(/[, ]+/).filter(Boolean);
        const memberBadgesHtml = memberNames.map(m => {
            const mColor = themeColors[m] || '#FF5252';
            return `<span class="text-[11px] md:text-[12px] font-bold px-2 py-0.5 rounded-full" style="color:${mColor}; background-color:${hexToRgba(mColor, 0.14)};">${escapeHtml(m)}</span>`;
        }).join(' ');

        html += `
            <div class="rounded-2xl overflow-hidden bg-white shadow-md cursor-pointer hover:-translate-y-1 transition relative group flex flex-col" onclick="openSignalDetailModal('${record.id}')">
                ${isAdmin ? `
                <div class="absolute top-2 right-2 flex gap-1 z-10 bg-[#FFFDF5]/90 rounded-md px-1">
                    <button onclick="event.stopPropagation(); openSignalEditModal('${record.id}')" class="text-blue-500 hover:text-blue-700 p-1"><i class="fi fi-rr-edit"></i></button>
                    <button onclick="event.stopPropagation(); deleteSignalRecord('${record.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fi fi-br-cross-small"></i></button>
                </div>
                ` : ''}
                <div class="w-full aspect-video overflow-hidden bg-gray-100">
                    <img src="${thumb}" class="w-full h-full object-cover" alt="${escapeHtml(record.title || '')}" loading="lazy" decoding="async">
                </div>
                <div class="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                    <div class="text-[14px] md:text-[16px] font-bold text-[#5D4037] font-paperozi line-clamp-1">${escapeHtml(record.title || '')}</div>
                    <div class="flex items-center justify-between mt-auto pt-1 gap-1 flex-wrap">
                        <span class="text-[12px] md:text-[13px] font-bold text-gray-400">${escapeHtml(record.date || '')}</span>
                        <div class="flex items-center gap-1 flex-wrap">${memberBadgesHtml}</div>
                    </div>
                </div>
            </div>
        `;
    });
    if (signalRecords.length === 0) {
        html += `<div class="col-span-full text-center text-gray-400 font-bold py-16 text-lg">등록된 시그널 기록이 없습니다.</div>`;
    }
    html += `</div>`;
    if (signalRecordsHasMore) {
        html += `
        <div class="flex justify-center mt-8">
            <button onclick="loadMoreSignalRecords()" ${signalRecordsLoadingMore ? 'disabled' : ''} class="px-6 py-2.5 bg-white border-2 border-[#5D4037] text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition font-paperozi text-[14px] disabled:opacity-50">
                ${signalRecordsLoadingMore ? '불러오는 중...' : '더 보기'}
            </button>
        </div>`;
    }
    html += `</div>`;
    content.innerHTML = html;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-[1795px] max-w-full lg:mx-auto pb-6';
}

function previewSignalImageFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('sgImagePreview');
        if (preview) { preview.src = e.target.result; preview.classList.remove('hidden'); }
    };
    reader.readAsDataURL(file);
}

function previewSignalImageUrl(input) {
    const url = input.value.trim();
    const preview = document.getElementById('sgImagePreview');
    if (!preview) return;
    if (url) { preview.src = url; preview.classList.remove('hidden'); }
    else { preview.classList.add('hidden'); }
}

function switchSignalImgTab(tab) {
    const urlSection = document.getElementById('sgImageUrlSection');
    const fileSection = document.getElementById('sgImageFileSection');
    const tabUrl = document.getElementById('sgImgTabUrl');
    const tabFile = document.getElementById('sgImgTabFile');
    if (!urlSection || !fileSection) return;
    if (tab === 'url') {
        urlSection.classList.remove('hidden');
        fileSection.classList.add('hidden');
        tabUrl.classList.add('bg-[#5D4037]', 'text-white');
        tabUrl.classList.remove('bg-white', 'text-[#5D4037]');
        tabFile.classList.add('bg-white', 'text-[#5D4037]');
        tabFile.classList.remove('bg-[#5D4037]', 'text-white');
    } else {
        urlSection.classList.add('hidden');
        fileSection.classList.remove('hidden');
        tabFile.classList.add('bg-[#5D4037]', 'text-white');
        tabFile.classList.remove('bg-white', 'text-[#5D4037]');
        tabUrl.classList.add('bg-white', 'text-[#5D4037]');
        tabUrl.classList.remove('bg-[#5D4037]', 'text-white');
    }
}

function addSignalVodRow(vodData = '') {
    const container = document.getElementById('sgVodUrlsContainer');
    if (!container) return;
    
    let url = '';
    let member = '시그널'; // 기본값

    // 구버전 데이터(단일 문자열)와 신규 데이터(객체) 모두 대응
    if (typeof vodData === 'string') {
        url = vodData;
    } else if (typeof vodData === 'object' && vodData !== null) {
        url = vodData.url || '';
        member = vodData.member || '시그널';
    }

    const row = document.createElement('div');
    row.className = 'sg-vod-row flex gap-2';
    
    const memberSelectHtml = `
        <select class="sg-vod-member border-2 border-[#5D4037] rounded-lg p-2.5 text-[14px] outline-none font-bold bg-white text-[#5D4037] w-[95px] shrink-0 cursor-pointer">
            <option value="시그널" ${member === '시그널' ? 'selected' : ''}>시그널</option>
            <option value="달타" ${member === '달타' ? 'selected' : ''}>달타</option>
            <option value="다룽" ${member === '다룽' ? 'selected' : ''}>다룽</option>
            <option value="최또" ${member === '최또' ? 'selected' : ''}>최또</option>
            <option value="카나시" ${member === '카나시' ? 'selected' : ''}>카나시</option>
        </select>
    `;

    row.innerHTML = `
        ${memberSelectHtml}
        <input type="text" class="sg-vod-input flex-1 border-2 border-[#5D4037] rounded-lg p-2.5 text-[14px] outline-none focus:border-[#FF5252] font-bold" placeholder="VOD 링크를 입력하세요" value="${escapeHtml(url)}">
        <button type="button" onclick="removeSignalVodRow(this)" class="px-3 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition shrink-0">삭제</button>
    `;
    container.appendChild(row);
}

function removeSignalVodRow(btn) {
    const container = document.getElementById('sgVodUrlsContainer');
    const row = btn.closest('.sg-vod-row');
    if (row) row.remove();
    if (container && container.children.length === 0) addSignalVodRow();
}

function getSignalVodUrls(record) {
    if (Array.isArray(record.vodUrls) && record.vodUrls.length > 0) {
        return record.vodUrls.map(u => {
            if (typeof u === 'string' && u.trim()) return { member: '시그널', url: u.trim() };
            if (typeof u === 'object' && u !== null && u.url && u.url.trim()) return { member: u.member || '시그널', url: u.url.trim() };
            return null;
        }).filter(u => u !== null);
    }
    // 구버전 호환 필드
    if (record.vodUrl && record.vodUrl.trim()) return [{ member: '시그널', url: record.vodUrl.trim() }];
    return [];
}

function openSignalAddModal() {
    if (!isAdmin) return;
    editSignalRecordId = null;
    document.getElementById('sgModalTitle').innerText = '시그널 추가';
    document.getElementById('sgTitle').value = '';
    document.getElementById('sgDate').value = getTodayYYYYMMDD();
    document.getElementById('sgMember').value = '';
    if (document.getElementById('sgImage')) document.getElementById('sgImage').value = '';
    if (document.getElementById('sgImageUrlText')) document.getElementById('sgImageUrlText').value = '';
    if (document.getElementById('sgImagePreview')) document.getElementById('sgImagePreview').classList.add('hidden');
    switchSignalImgTab('url');
    const vodContainer = document.getElementById('sgVodUrlsContainer');
    if (vodContainer) vodContainer.innerHTML = '';
    addSignalVodRow();
    document.getElementById('signalAddModal').classList.replace('hidden', 'flex');
}

function openSignalEditModal(id) {
    if (!isAdmin) return;
    const record = signalRecords.find(r => r.id === id);
    if (!record) return;
    editSignalRecordId = id;
    document.getElementById('sgModalTitle').innerText = '시그널 수정';
    document.getElementById('sgTitle').value = record.title || '';
    document.getElementById('sgDate').value = record.date || getTodayYYYYMMDD();
    document.getElementById('sgMember').value = record.member || '';
    if (document.getElementById('sgImage')) document.getElementById('sgImage').value = '';
    if (document.getElementById('sgImageUrlText')) document.getElementById('sgImageUrlText').value = record.imageUrl || '';
    switchSignalImgTab('url');
    const preview = document.getElementById('sgImagePreview');
    if (preview) {
        if (record.imageUrl) { preview.src = record.imageUrl; preview.classList.remove('hidden'); }
        else { preview.classList.add('hidden'); }
    }
    const vodContainer = document.getElementById('sgVodUrlsContainer');
    if (vodContainer) vodContainer.innerHTML = '';
    const vodUrls = getSignalVodUrls(record);
    if (vodUrls.length > 0) vodUrls.forEach(u => addSignalVodRow(u));
    else addSignalVodRow();
    document.getElementById('signalAddModal').classList.replace('hidden', 'flex');
}

function closeSignalAddModal() {
    document.getElementById('signalAddModal').classList.replace('flex', 'hidden');
}

async function saveSignalRecord() {
    if (!isAdmin) return;
    const title = document.getElementById('sgTitle').value.trim();
    const date = document.getElementById('sgDate').value;
    const member = document.getElementById('sgMember').value.trim();
    const vodUrls = Array.from(document.querySelectorAll('#sgVodUrlsContainer .sg-vod-row'))
        .map(row => {
            const mem = row.querySelector('.sg-vod-member').value;
            const url = row.querySelector('.sg-vod-input').value.trim();
            return { member: mem, url };
        })
        .filter(v => v.url);
    if (!title) return alert('제목을 입력해주세요.');
    if (!date) return alert('날짜를 선택해주세요.');
    if (!member) return alert('멤버를 입력해주세요.');

    const saveBtn = document.getElementById('sgSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = '저장 중⏳';
        saveBtn.classList.add('cursor-not-allowed', 'opacity-50');
    }

    let imageUrl = document.getElementById('sgImageUrlText') ? document.getElementById('sgImageUrlText').value.trim() : '';
    const fileInput = document.getElementById('sgImage');
    let toast = null;

    try {
        if (fileInput && fileInput.files.length > 0) {
            toast = document.createElement('div');
            toast.innerText = '이미지를 업로드 중 입니다..⏳';
            toast.className = 'fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-[#5D4037] text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold font-paperozi transition-opacity duration-300 opacity-0';
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.remove('opacity-0'));

            const url = await window.uploadImageToCloudinary(fileInput.files[0]);
            if (url) imageUrl = url;

            if (toast) {
                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 300);
            }
        }

        const vodUrl = vodUrls.length > 0 ? vodUrls[0].url : '';

        if (editSignalRecordId) {
            await updateDoc(doc(db, 'signal_records', editSignalRecordId), { title, date, member, vodUrl, vodUrls, imageUrl });
            const idx = signalRecords.findIndex(r => r.id === editSignalRecordId);
            if (idx > -1) {
                signalRecords[idx] = { ...signalRecords[idx], title, date, member, vodUrl, vodUrls, imageUrl };
            }
        } else {
            const newRecord = { title, date, member, vodUrl, vodUrls, imageUrl, timestamp: Date.now() };
            const docRef = await addDoc(collection(db, 'signal_records'), newRecord);
            signalRecords.push({ id: docRef.id, ...newRecord });
        }
        sortSignalRecords();
        saveScheduleCache();
        closeSignalAddModal();
        render();
    } catch (e) {
        console.error(e);
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = '저장';
            saveBtn.classList.remove('cursor-not-allowed', 'opacity-50');
        }
    }
}

async function deleteSignalRecord(id) {
    if (!isAdmin) return;
    if (!confirm('이 시그널 기록을 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'signal_records', id));
        signalRecords = signalRecords.filter(r => r.id !== id);
        saveScheduleCache();
        closeSignalDetailModal();
        render();
    } catch (e) { console.error(e); }
}

function openSignalDetailModal(id) {
    const record = signalRecords.find(r => r.id === id);
    if (!record) return;
    currentSignalDetailId = id;

    let memGroupHtml = '';
    if (record.member) {
        const parsed = parseMembers(record.member);
        memGroupHtml = `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 12px 8px; margin: 0 auto 16px; width: 100%; max-width: 420px;">
            ${parsed.map(m => {
                const isCrew = m.isCrew;
                return `
                <div style="${isCrew ? 'width:100%;' : 'width: 74px;'} display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <div style="${isCrew ? 'width:100%; border-radius:12px; border:1px solid #f3f4f6;' : 'width:72px; height:72px; border-radius:50%; border:3px solid #fcdbc6;'} overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                        <img src="${m.imageUrl}" style="width:100%; height:100%; object-fit:${isCrew ? 'contain' : 'cover'};" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/72'">
                    </div>
                    ${(m.nickname && !isCrew) ? `<span class="dm-text-brown" style="font-size:13px; font-weight:700; color:#5D4037; text-align:center; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing: -0.5px;">${m.nickname}</span>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    const adminBtnsHtml = isAdmin ? `
        <div class="absolute top-4 left-4 flex gap-2 z-10">
            <button onclick="closeSignalDetailModal(); openSignalEditModal('${record.id}')" class="w-9 h-9 flex items-center justify-center bg-white/90 text-blue-500 hover:text-blue-700 rounded-full shadow"><i class="fi fi-rr-edit"></i></button>
            <button onclick="deleteSignalRecord('${record.id}')" class="w-9 h-9 flex items-center justify-center bg-white/90 text-red-500 hover:text-red-700 rounded-full shadow"><i class="fi fi-br-cross-small"></i></button>
        </div>
    ` : '';

    const signalVodUrls = getSignalVodUrls(record);
    const vodBtnHtml = signalVodUrls.length > 0 ? `
        <div class="flex flex-col gap-2 mt-6">
            ${signalVodUrls.map((vod, i) => {
                // 선택된 멤버에 따라 테마 컬러 할당 (없으면 시그널 컬러)
                const btnColor = themeColors[vod.member] || '#FF5252';
                const labelText = vod.member === '시그널' ? '다시보기' : `${vod.member} 다시보기`;
                
                return `
                <button onclick="openSmartLink('${vod.url}')" class="w-full py-4 text-white font-bold text-lg rounded-xl shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:brightness-110 hover:-translate-y-0.5 transition font-paperozi flex items-center justify-center gap-2" style="background-color: ${btnColor};">
                    <i class="fi fi-rr-play"></i> ${labelText}
                </button>`;
            }).join('')}
        </div>
    ` : `
        <button disabled class="w-full mt-6 py-4 bg-gray-300 text-white font-bold text-lg rounded-xl cursor-not-allowed font-paperozi flex items-center justify-center gap-2">
            <i class="fi fi-rr-play"></i> 다시보기 링크 없음
        </button>
    `;

    const html = `
        <div class="modal-content bg-white rounded-2xl w-[95%] max-w-[520px] shadow-xl border border-[#ECEDFA] relative flex flex-col max-h-[90vh] overflow-hidden">
            ${adminBtnsHtml}
            <button class="absolute top-4 right-4 text-2xl text-[#5D4037] hover:scale-110 transition cursor-pointer z-10 bg-white/90 w-9 h-9 rounded-full flex items-center justify-center shadow" onclick="closeSignalDetailModal()"><i class="fi fi-br-cross"></i></button>
            <div class="w-full aspect-video bg-gray-100 shrink-0">
                <img src="${record.imageUrl || 'https://via.placeholder.com/600x450/ffdddd/FF5252?text=SIGNAL'}" class="w-full h-full object-cover" alt="${escapeHtml(record.title || '')}">
            </div>
            <div class="p-6 md:p-8 overflow-y-auto modal-scroll">
                <div class="text-[22px] md:text-[24px] font-bold text-[#5D4037] text-center font-paperozi mb-4 break-words">${escapeHtml(record.title || '')}</div>
                ${memGroupHtml}
                ${vodBtnHtml}
            </div>
        </div>
    `;
    document.getElementById('signalDetailModal').innerHTML = html;
    document.getElementById('signalDetailModal').classList.replace('hidden', 'flex');
}

function closeSignalDetailModal() {
    const modal = document.getElementById('signalDetailModal');
    if (modal) modal.classList.replace('flex', 'hidden');
    currentSignalDetailId = null;
}

// =========================================================================
// 모바일 & PC 캘린더 렌더링 함수들
// =========================================================================
function renderMobileHome(grouped) {
    const content = document.getElementById('mainContent');
    const d = homeTargetDate;
    const dateStr = `${d.getMonth()+1}.${d.getDate()}`;
    const dayStr = ['일','월','화','수','목','금','토'][d.getDay()];

    const memberColors = { '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#fdecf9', '카나시': '#FFF3E0' };
    let html = `
        <div class="w-[calc(100%-2rem)] flex justify-between items-center mb-5 mx-4 mt-2 px-2 py-1.5 bg-white rounded-2xl border border-[#ECEDFA] shadow-[0_8px_20px_rgba(70,60,160,0.08)]">
            <button onclick="changeHomeDate(-1)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-left text-3xl"></i></button>
            <div class="text-[22px] font-bold font-paperozi text-[#5D4037] cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2" onclick="openMobileDatePicker()">
                ${dateStr} (${dayStr}) <i class="fi fi-sr-caret-down text-sm mt-1"></i>
            </div>
            <button onclick="changeHomeDate(1)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-right text-3xl"></i></button>
        </div>
        <div class="grid grid-cols-1 gap-4 px-4 w-full">
    `;
    
    members.forEach((member, i) => {
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${member.name}`;
        const daySchedules = grouped[key] || [];
        let schedulesHtml = '';

        if (daySchedules.length > 0) {
            const isHubang = daySchedules.some(s => s.globalType === '휴방');
            const imgSrc = isHubang ? memberCardImages[member.name].hubang : memberCardImages[member.name].bangon;
            const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
            const dayGlobalTime = sWithGlobal ? formatTime12(sWithGlobal.globalStartTime) : '';

            const bgColor = isHubang ? '#E5E7EB' : (memberColors[member.name] || '#FFFFFF');
            const finalTextColor = isHubang ? '#6B7280' : (themeColors[member.name] || '#5D4037');

            schedulesHtml = `<div class="schedule-card ${isHubang ? 'hubang' : ''} aspect-square w-full flex items-center justify-center overflow-hidden relative shadow-sm" style="--sch-bg: ${bgColor}; --sch-text: ${finalTextColor}; color: ${finalTextColor}; background-color: ${bgColor}; padding:0; border-radius: 16px;" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="${isHubang ? '휴방' : '뱅온'}" loading="lazy" decoding="async">${dayGlobalTime ? `<div class="absolute bottom-4 right-2.5 text-[14px] font-black tracking-tight" style="color: ${finalTextColor}; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 0px 2px 3px rgba(0,0,0,0.3);">${dayGlobalTime}</div>` : ''}</div>`;
        } else {
            schedulesHtml = `<div class="w-full aspect-square flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50"><span class="text-gray-400 text-[15px] font-bold">일정 없음</span></div>`;
        }

        html += `
            <div class="flex flex-col w-full bg-white rounded-[26px] shadow-[0_10px_26px_rgba(70,60,160,0.10)] border-[1.5px] border-[#ECEDFA] overflow-hidden">
                <div class="flex w-full px-4 pt-4 pb-4 gap-3">
                    <div class="w-1/2 aspect-square rounded-[18px] overflow-hidden relative cursor-pointer p-0 shrink-0" onclick="handleProfileClick(event, '${member.name}', '${member.link}')">
                        <img src="${member.img}" class="w-full h-full object-cover">
                        <div id="liveBadge-${member.name}" class="live-badge" onclick="goToLiveBroadcast(event, '${member.name}')" title="현재 방송 중이 아니에요">
                            <span class="live-badge-dot"></span>LIVE
                        </div>
                    </div>
                    <div class="w-1/2 aspect-square p-2 flex flex-col justify-center gap-2 bg-[#FAFAFD] rounded-[18px] overflow-y-auto" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')">
                        ${schedulesHtml}
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    html += `
        <div id="mobileHomeNoticeBox" class="hidden mx-4 mt-4 bg-white border-2 border-[#5D4037] rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] p-4">
            <div class="text-[15px] font-bold text-[#5D4037] mb-2 font-paperozi flex items-center gap-2">
                공지
            </div>
            <div id="mobileHomeNoticeList" class="kakao-chat-bg flex flex-col gap-3 p-3 max-h-[570px] overflow-y-auto modal-scroll pr-1"></div>
        </div>
    `;
    content.innerHTML = html;
    content.className = 'shrink-0 transition-all duration-300 w-full max-w-[600px] mx-auto pb-6';

    // 캐시된 공지 데이터를 새로 그려진 홈 화면에 즉시 반영
    applyCachedNoticeToMobileHome();
    // 아직 한 번도 불러온 적이 없다면 최초 1회 데이터 요청 (날짜 이동 등 재렌더링 시 중복 fetch 방지)
    if (!noticeFetchAttempted) {
        fetchAndRenderAllNotices();
    }
}

function renderMobileIndividual(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();
    
    const current = new Date(individualTargetDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    let weekDates = [];
    for(let i=0; i<7; i++) {
        weekDates.push(new Date(monday.getTime() + i*24*60*60*1000));
    }

    const monthStr = `${weekDates[0].getMonth()+1}월`;
    const themeColor = themeColors[currentPage];

    let html = `
        <div class="w-[calc(100%-2rem)] flex justify-between items-center mb-3 mx-4 mt-2 px-2 py-1.5 bg-white rounded-2xl border border-[#ECEDFA] shadow-[0_8px_20px_rgba(70,60,160,0.08)]">
            <button onclick="changeIndividualWeek(-7)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-left text-3xl"></i></button>
            <div class="text-[20px] font-bold font-paperozi text-[#5D4037] cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2" onclick="openMonthPicker()">
                ${weekDates[0].getFullYear()}년 ${monthStr} 주간 <i class="fi fi-sr-caret-down text-sm mt-1"></i>
            </div>
            <button onclick="changeIndividualWeek(7)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-right text-3xl"></i></button>
        </div>
        <div class="grid grid-cols-1 gap-4 px-4 w-full">
    `;

    const daysLabel = ['월','화','수','목','금','토','일'];
    weekDates.forEach((d, i) => {
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${currentPage}`;
        const daySchedules = grouped[key] || [];
        let schedulesHtml = daySchedules.map(sch => buildScheduleCardHtml(sch, true)).join('');

        const isToday = d.getFullYear() === realToday.getFullYear() && d.getMonth() === realToday.getMonth() && d.getDate() === realToday.getDate();
        
        let dayGlobalTime = '';
        let isDayHubang = false;
        if (daySchedules.length > 0) {
            const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
            if (sWithGlobal) {
                dayGlobalTime = formatTime12(sWithGlobal.globalStartTime);
            } else if (daySchedules.some(s => s.globalType === '휴방')) {
                isDayHubang = true;
            }
        }
        const timeDisplayHtml = dayGlobalTime
            ? `<span class="text-[12px] font-bold mt-1 px-1 rounded bg-white" style="color: ${isToday ? themeColor : '#5D4037'}">${dayGlobalTime}</span>`
            : (isDayHubang ? `<span class="text-[12px] font-bold mt-1 px-1 rounded bg-white text-gray-400">휴방</span>` : '');

        if (!schedulesHtml) {
            schedulesHtml = `<div class="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"><span class="text-gray-400 text-[14px] font-bold">일정 없음</span></div>`;
        }

        html += `
            <div class="flex w-full bg-white rounded-2xl shadow-[0_8px_20px_rgba(70,60,160,0.08)] border-[1.5px] border-[#ECEDFA] cursor-pointer transition-transform hover:-translate-y-1 min-h-[96px] overflow-hidden ${isToday ? '' : 'dm-text-brown'}" style="color: ${isToday ? themeColor : '#3E2723'}" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${currentPage}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${currentPage}')">
                <div class="w-[78px] shrink-0 flex flex-col items-center justify-center" style="background-color: ${isToday ? themeColor : '#FAFAFD'}; color: ${isToday ? 'white' : themeColor};">
                    <span class="text-[14px] font-bold mb-0.5 opacity-80">${daysLabel[i]}</span>
                    <span class="text-[26px] font-bold leading-none">${d.getDate()}</span>
                    ${timeDisplayHtml}
                </div>
                <div class="flex-1 p-2.5 flex flex-col justify-center gap-2 overflow-y-auto bg-white">
                    ${schedulesHtml}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    content.innerHTML = html;
    content.className = `shrink-0 transition-all duration-300 w-full max-w-[600px] mx-auto pb-6 theme-${currentPage === '달타'?'dalta':currentPage === '다룽'?'darung':currentPage === '최또'?'choitto':'kanasi'}`;
}

function renderDesktopHome(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();

    const memberColors = { '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#fdecf9', '카나시': '#FFF3E0' };

    let homeHtml = `<div class="home-white-box">
        <div class="home-member-grid">`;

    // 이번 주 월요일 ~ 일요일 날짜 목록 계산 (주간일정 미리보기용)
    const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
    const todayDow = realToday.getDay(); // 0(일)~6(토)
    const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
    const weekStart = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate() + mondayOffset);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
        return d;
    });

    members.forEach((member) => {
        const borderColor = themeColors[member.name] || '#5D4037';
        const softBg = memberColors[member.name] || '#F5F5F5';

        // 사진과 공지 사이에 표시할 이번 주(월~일) 요약 일정 - 뱅온/휴방 이미지 카드가 1:1 비율로 가로 나열됨
        const weekRowsHtml = weekDates.map((wd) => {
            const wKey = `${wd.getFullYear()}-${wd.getMonth() + 1}-${wd.getDate()}-${member.name}`;
            const wSchedules = grouped[wKey] || [];
            const isToday = wd.toDateString() === realToday.toDateString();

            let cardInnerHtml;
            let cardBg = '#FAFAFD';
            if (wSchedules.length > 0) {
                const isHubang = wSchedules.some(s => s.globalType === '휴방');
                const imgSrc = isHubang ? memberCardImages[member.name].hubang : memberCardImages[member.name].bangon;
                const sWithGlobal = wSchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
                const dayGlobalTime = sWithGlobal ? formatTime12(sWithGlobal.globalStartTime) : '';
                if (!isHubang) cardBg = softBg;
                cardInnerHtml = `<img src="${imgSrc}" class="w-full h-full object-cover" alt="${isHubang ? '휴방' : '뱅온'}" loading="lazy" decoding="async">${dayGlobalTime ? `<div class="absolute bottom-1 right-1.5 text-[13px] font-black tracking-tight" style="color:#3E2723; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;">${dayGlobalTime}</div>` : ''}`;
            } else {
                cardInnerHtml = `<div class="w-full h-full flex items-center justify-center"><span class="text-[13px] font-bold" style="color:#C8C9DC;">-</span></div>`;
            }

            return `
                <div class="flex flex-col items-center gap-1.5 shrink-0 relative">
                    <div class="flex flex-col items-center gap-0">
                        <span class="text-[22px] font-black font-paperozi leading-none" style="color: ${isToday ? borderColor : '#A6A3B8'};">${dayLabels[(wd.getDay() + 6) % 7]}</span>
                        <span class="text-[20px] font-black font-paperozi leading-none mt-1" style="color: ${isToday ? borderColor : '#A6A3B8'};">${wd.getDate()}</span>
                    </div>
                    <div class="home-week-card ${isToday ? 'is-today' : ''} aspect-square"
                        style="width: 240px; background: ${cardBg}; --member-accent: ${borderColor};"
                        onclick="event.stopPropagation(); openAllSchedulesModal(event, '${wd.getFullYear()}-${wd.getMonth()+1}-${wd.getDate()}', '${member.name}')">
                        ${cardInnerHtml}
                    </div>
                </div>`;
        }).join('');

        const weeklyScheduleHtml = `
            <div class="flex flex-col gap-2 cursor-default">
                <div class="flex items-start gap-3">${weekRowsHtml}</div>
            </div>`;

        const memberLinks = dynamicLinks[member.name] || [];
        const soopUrl = (memberLinks.find(l => l.title === 'SOOP') || {}).url || '';
        const youtubeUrl = (memberLinks.find(l => l.title === '유튜브') || {}).url || '';

        const memberButtonsHtml = `
            <div class="flex flex-col items-center gap-2 shrink-0 my-5 mr-6">
                <button onclick="changeTab('${member.name}')" class="app-icon-btn-sm" style="--member-accent: ${borderColor}; color: ${borderColor};" title="일정표">
                    <i class="fi fi-rr-calendar"></i>
                </button>
                <button onclick="changeTab('노래책_${member.name}')" class="app-icon-btn-sm" style="--member-accent: ${borderColor}; color: ${borderColor};" title="노래책">
                    <i class="fi fi-rr-music-alt"></i>
                </button>
                <a href="${soopUrl}" target="_blank" rel="noopener" class="app-icon-btn-sm" style="--member-accent: ${borderColor}; color: ${borderColor};" title="SOOP">
                    <i class="fi fi-rr-video-camera"></i>
                </a>
                <a href="${youtubeUrl}" target="_blank" rel="noopener" class="app-icon-btn-sm" style="--member-accent: ${borderColor}; color: ${borderColor};" title="유튜브">
                    <i class="fi fi-brands-youtube"></i>
                </a>
            </div>`;

        homeHtml += `
            <div class="home-member-card" style="--member-accent: ${borderColor};">
                <div class="shrink-0 my-5 ml-6 w-[340px] h-[340px] rounded-[26px] overflow-hidden relative cursor-pointer home-profile-frame" style="--member-accent: ${borderColor}" onclick="handleProfileClick(event, '${member.name}', '${member.link || ''}')">
                    <img src="${member.img}" alt="${member.name}" class="w-full h-full object-cover">
                    <div id="liveBadge-${member.name}" class="live-badge" onclick="goToLiveBroadcast(event, '${member.name}')" title="현재 방송 중이 아니에요"><span class="live-badge-dot"></span>LIVE</div>
                </div>
                <div class="flex-1 flex flex-col justify-center gap-2.5 py-6 pl-8 pr-4 min-w-0">
                    ${weeklyScheduleHtml}
                </div>
                ${memberButtonsHtml}
            </div>
        `;
    });

    content.innerHTML = homeHtml + `</div></div>`;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto';
    applyCachedNoticeToDesktopHome();
}

function renderDesktopIndividual(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); 
    const startIdx = (firstDay === 0) ? 6 : firstDay - 1; 
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const weeksNeeded = Math.ceil((startIdx + daysInMonth) / 7);
    const totalCells = weeksNeeded * 7;
    
    const cellsHtml = Array.from({length: totalCells}, (_, i) => {
        const day = i - startIdx + 1;
        if (day > 0 && day <= daysInMonth) {
            const key = `${currentYear}-${currentMonth}-${day}-${currentPage}`; 
            const daySchedules = grouped[key] || [];
            const schedulesHtml = daySchedules.map(sch => buildScheduleCardHtml(sch, false)).join('');
            const isToday = currentYear === realToday.getFullYear() && currentMonth === realToday.getMonth() + 1 && day === realToday.getDate();
            
            const lunarDate = getLunarDate(currentYear, currentMonth, day);
            
            let dayGlobalTime = '';
            let isDayHubang = false;
            if (daySchedules.length > 0) {
                const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
                if (sWithGlobal) {
                    dayGlobalTime = formatTime12(sWithGlobal.globalStartTime);
                } else if (daySchedules.some(s => s.globalType === '휴방')) {
                    isDayHubang = true;
                }
            }
            const timeDisplayHtml = dayGlobalTime
                ? `<span class="text-[13px] font-bold text-[#5D4037]">${dayGlobalTime}</span>`
                : (isDayHubang ? `<span class="text-[13px] font-bold text-gray-400">휴방</span>` : '');
            const dateClass = isToday ? "today-highlight text-white w-7 h-7 inline-flex items-center justify-center rounded-md" : "";
            const displayDay = `<span class="${dateClass}">${day}</span>`;            

            return `<div class="big-cell" onclick="handleDayClick(${currentYear}, ${currentMonth}, ${day}, '${currentPage}')" oncontextmenu="handleDayRightClick(event, ${currentYear}, ${currentMonth}, ${day}, '${currentPage}')">
                <div class="w-full flex justify-between items-center mb-1 px-1">
                    <div class="flex items-center gap-1">
                        ${displayDay}
                        <span class="lunar-text text-[10px] text-gray-400 font-normal">${lunarDate}</span>
                    </div>
                    ${timeDisplayHtml}
                </div>
                <div class="w-full flex-1 overflow-y-auto schedule-list flex flex-col gap-1">${schedulesHtml}</div>
            </div>`;
        }
        return `<div class="big-cell cursor-default hover:bg-transparent hover:transform-none hover:shadow-none hover:border-dashed"></div>`;
    }).join('');

    const memos = memoList[currentPage] || [];
    const memoContentHtml = memos.map(memo => `
        <div class="bg-white p-4 rounded-xl relative shadow-sm mb-4 transition hover:-translate-y-0.5 border border-[#ECEDFA]" 
             oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { event.preventDefault(); event.stopPropagation(); window.openMemoEditModal('${memo.id}'); }">
            ${isAdmin ? `
            <div class="absolute top-2 right-2 flex items-center gap-1 z-10 bg-[#FFFDF5]/90 rounded-md px-1">
                <button onclick="openMemoEditModal('${memo.id}')" class="text-blue-500 hover:text-blue-700 font-bold p-1"><i class="fi fi-rr-edit text-[12px]"></i></button>
                <button onclick="deleteMemo('${memo.id}')" class="text-red-500 hover:text-red-700 font-bold p-1"><i class="fi fi-br-cross-small text-[12px]"></i></button>
            </div>` : ''}
            <div class="text-[12px] font-bold text-gray-400 mb-1 pointer-events-none pr-14">${memo.date || ''}</div>
            <div class="text-[15px] font-medium text-[#5D4037] whitespace-pre-wrap leading-relaxed pointer-events-none pr-4">${memo.content}</div>
        </div>
    `).join('');

    const memoSectionHtml = `
        <div class="w-[360px] shrink-0 flex flex-col pl-8 border-l-[2px] border-dashed border-gray-200 ml-8 relative pt-0">
            <!-- 캘린더 타이틀 높이와 완벽하게 동기화하기 위한 투명 더미 요소 -->
            <div class="nav-container" style="visibility: hidden; pointer-events: none;" aria-hidden="true">
                <button class="nav-btn"><i class="fi fi-rr-caret-left"></i></button>
                <div class="w-[330px] flex justify-center items-center"><div class="text-[40px] font-normal leading-none" style="font-family: 'Paperozi', sans-serif;">더미</div></div>
                <button class="nav-btn"><i class="fi fi-rr-caret-right"></i></button>
            </div>
            
            <!-- 높이를 요일 박스(약 86px)와 정확히 일치시킴 -->
            <div class="flex justify-between items-center w-full pl-6 pr-4 bg-[var(--card-bg-cream)] border-[1.5px] border-[#ECEDFA] rounded-[25px] shadow-[0_10px_24px_-16px_rgba(70,60,160,0.15)] mb-2 box-border" style="transform: translateY(-14px); height: 86px;">
                <div class="flex items-center gap-2">
                    <div class="text-[26px] font-normal text-[#5D4037] font-paperozi flex items-center gap-2" style="letter-spacing: 1px;">
                        ${currentPage} 메모장
                    </div>
                    ${isAdmin ? `<button onclick="openMemoAddModal()" class="w-7 h-7 flex items-center justify-center bg-[#5D4037] text-white rounded-full font-bold hover:brightness-110 shadow-sm transition text-[12px] ml-1"><i class="fi fi-br-plus"></i></button>` : ''}
                </div>
                ${buildMemoCinetiButtonsHtml('desktop')}
            </div>
            
            <!-- 캘린더 그리드(mt-15px)와 완벽히 윗선을 맞추기 위해 mt-[15px] 추가 -->
            <div class="flex-1 overflow-y-auto modal-scroll pr-2 mt-[15px]" style="max-height: 800px;">
                ${memos.length > 0 ? memoContentHtml : '<div class="text-center text-gray-400 font-bold mt-16 text-lg">저장된 메모가 없습니다.</div>'}
            </div>
        </div>
    `;

    const calendarSectionHtml = `
        <div class="flex flex-col items-center flex-1 relative ml-6">
            <div class="nav-container"><button class="nav-btn" onclick="changeMonth(-1)"><i class="fi fi-rr-caret-left"></i></button><div class="w-[330px] flex justify-center items-center"><div class="text-[40px] font-normal cursor-pointer hover-theme-text leading-none" style="font-family: 'Paperozi', sans-serif;" onclick="openMonthPicker()">${currentYear}년 ${currentMonth}월</div></div><button class="nav-btn" onclick="changeMonth(1)"><i class="fi fi-rr-caret-right"></i></button></div>
            <div class="header-days-container mb-2">${['월','화','수','목','금','토','일'].map(d=>`<div class="header-days-cell" style="padding:22px 0;">${d}</div>`).join('')}</div>
            <div class="big-box-container" style="grid-template-rows: repeat(${weeksNeeded}, 198px);">${cellsHtml}</div>
        </div>
    `;

    content.innerHTML = `<div class="big-white-box relative theme-${currentPage === '달타'?'dalta':currentPage === '다룽'?'darung':currentPage === '최또'?'choitto':'kanasi'}" style="flex-direction: row; align-items: stretch; width: max-content; padding: 55px 65px 55px 75px; --member-accent: ${themeColors[currentPage] || '#5D4037'}">
        ${calendarSectionHtml}
        ${memoSectionHtml}
    </div>`;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto mx-auto';
}

async function deleteScheduleAction() {
    if(!contextTargetId) return;
    if (confirm('해당 일정을 삭제하시겠습니까?')) {
        const sch = scheduleList.find(s => s.id === contextTargetId);
        if(!sch) return;
        try {
            await deleteDoc(doc(db, sch.collectionName, contextTargetId));
            scheduleList = scheduleList.filter(s => s.id !== contextTargetId); 
            saveScheduleCache();
            closeEditModal();
            render();
        } catch(e) { console.error("삭제 실패:", e); }
    }
}

async function saveSchedule() {
    const blocks = document.querySelectorAll('#scheduleInputsContainer .schedule-input-block');
    const globalTypeEl = document.querySelector('input[name="globalSchType"]:checked');
    const globalType = globalTypeEl ? globalTypeEl.value : '뱅온'; 

    const memberTab = targetModalContext.member;
    const colName = collectionMap[memberTab];
    
    let globalStartTime = '';
    if (globalType === '뱅온') {
        const ampm = document.getElementById('globalAmpmBtn') ? document.getElementById('globalAmpmBtn').innerText : '오후';
        const hh = document.getElementById('globalHh') ? document.getElementById('globalHh').value : '';
        const mm = document.getElementById('globalMm') ? document.getElementById('globalMm').value : '';
        globalStartTime = buildTimeStr(ampm, hh, mm);
    }

    for (let oldId of currentEditingIds) {
        const oldSch = scheduleList.find(s => s.id === oldId);
        if (oldSch) {
            try { await deleteDoc(doc(db, oldSch.collectionName, oldId)); } catch(e) {}
        }
    }
    scheduleList = scheduleList.filter(s => !currentEditingIds.includes(s.id));

    let timestampOffset = 0;

    for (const block of blocks) {
        let title = block.querySelector('.sch-title').value.trim();
        if (!title) title = '일정';

        const sDate = block.querySelector('.sch-start').value;
        const eDate = block.querySelector('.sch-end').value;
        
        const ampm = block.querySelector('.sch-ampm') ? block.querySelector('.sch-ampm').innerText : '오후';
        const hh = block.querySelector('.sch-hh') ? block.querySelector('.sch-hh').value : '';
        const mm = block.querySelector('.sch-mm') ? block.querySelector('.sch-mm').value : '';
        const timeStr = buildTimeStr(ampm, hh, mm); 
        
        const broad = block.querySelector('.sch-broad') ? block.querySelector('.sch-broad').value : '개인방송'; 
        const mem = block.querySelector('.sch-mem') ? block.querySelector('.sch-mem').value.trim() : ''; 
        
        const desc = block.querySelector('.sch-desc').value.trim();
        const imageUrl = block.querySelector('.sch-image-url') ? block.querySelector('.sch-image-url').value : '';

        const newSchedule = { 
            tabOrMember: memberTab,
            globalType,
            globalStartTime,
            title, 
            startDate: sDate, 
            endDate: eDate, 
            time: timeStr, 
            broadType: broad, 
            memberTag: mem, 
            detail: desc,
            imageUrl: imageUrl, 
            timestamp: Date.now() + timestampOffset
        };

        timestampOffset++;

        const docRef = await addDoc(collection(db, colName), newSchedule);
        newSchedule.id = docRef.id;
        newSchedule.collectionName = colName;
        scheduleList.push(newSchedule);
    }

    saveScheduleCache();
    closeScheduleModal(); 
    render();
}

async function saveEditedSchedule() {
    if(!contextTargetId) return;
    const block = document.getElementById('editContainer').querySelector('.schedule-input-block');
    const title = block.querySelector('.sch-title').value.trim();
    if(!title) { alert("일정 제목을 입력해주세요."); return; }
    
    const globalTypeEl = document.querySelector('input[name="editGlobalSchType"]:checked');
    const globalType = globalTypeEl ? globalTypeEl.value : '';
    const isHubang = globalType === '휴방';
    
    const sDate = block.querySelector('.sch-start').value; 
    const eDate = block.querySelector('.sch-end').value;
    const ampm = block.querySelector('.sch-ampm').innerText; 
    const hh = block.querySelector('.sch-hh').value; 
    const mm = block.querySelector('.sch-mm').value;
    const broad = isHubang ? '' : block.querySelector('.sch-broad').value; 
    const mem = isHubang ? '' : block.querySelector('.sch-mem').value.trim();
    const timeStr = isHubang ? '' : buildTimeStr(ampm, hh, mm); 
    const desc = block.querySelector('.sch-desc').value.trim();
    const imageUrl = block.querySelector('.sch-image-url') ? block.querySelector('.sch-image-url').value : '';
    
    const updatedData = { 
        globalType, title, startDate: sDate, endDate: eDate, 
        time: timeStr, broadType: broad, memberTag: mem, detail: desc, imageUrl 
    };
    
    const sch = scheduleList.find(s => s.id === contextTargetId);
    if(!sch) return;

    try {
        await updateDoc(doc(db, sch.collectionName, contextTargetId), updatedData);
        const idx = scheduleList.findIndex(s => s.id === contextTargetId);
        if(idx !== -1) scheduleList[idx] = { ...scheduleList[idx], ...updatedData };
        saveScheduleCache();
        closeEditModal(); 
        render();
    } catch(e) { 
        console.error("수정 오류:", e); 
        alert("저장에 실패했습니다.");
    }
}

function formatTime12(timeStr) {
    if (!timeStr) return ''; const [hourStr, minute] = timeStr.split(':');
    let hour = parseInt(hourStr, 10); const ampm = hour >= 12 ? '오후' : '오전';
    hour = hour % 12; if (hour === 0) hour = 12; return `${ampm} ${hour}:${minute}`;
}

function buildTimeStr(ampm, hh, mm) {
    if (!hh) return ''; let h = parseInt(hh, 10); let m = mm ? parseInt(mm, 10) : 0;
    if (ampm === '오후' && h < 12) h += 12; if (ampm === '오전' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function toggleAmpm(btn) { btn.innerText = btn.innerText === '오후' ? '오전' : '오후'; }
function isDateStrInRange(targetDateStr, startStr, endStr) {
    const t = new Date(targetDateStr).setHours(0,0,0,0); const s = new Date(startStr).setHours(0,0,0,0); const e = new Date(endStr).setHours(0,0,0,0);
    return t >= s && t <= e;
}

function toggleFields(modalId, radioName) {
    const modal = document.getElementById(modalId); if(!modal) return;
    const radio = modal.querySelector(`input[name="${radioName}"]:checked`);
    
    const isHubang = radio && radio.value === '휴방';
    modal.querySelectorAll('.optional-field').forEach(el => { el.style.display = isHubang ? 'none' : ''; });

    if (modalId === 'scheduleModal') {
        const globalTimeBlock = document.getElementById('globalTimeBlock');
        if (globalTimeBlock) {
            globalTimeBlock.style.display = isHubang ? 'none' : 'block';
        }
    }
}

function handleAdminClick() { 
    if (!isAdmin) openPasswordModal(); 
}

function logoutAdmin() {
    isAdmin = false; loggedInUser = null;
    sessionStorage.removeItem('activeAdminSession'); 
    localStorage.removeItem('activeAdminSession');
    
    refreshAuthUI();
    
    closeSidePanel();
    alert('로그아웃 되었습니다.'); window.location.reload(); 
}

function openPasswordModal() { 
    renderSavedProfiles();
    document.getElementById('passwordModal').classList.replace('hidden', 'flex'); 
}

function closePasswordModal() { document.getElementById('passwordModal').classList.replace('flex', 'hidden'); }
function closeLogoutModal() { document.getElementById('logoutModal').classList.replace('flex', 'hidden'); }

function handleDayClick(year, month, day, member) { 
    const dateStr = `${year}-${month}-${day}`;
    openAllSchedulesModal(null, dateStr, member); 
}

// 홈탭 멤버 카드의 '오늘일정' 버튼: 홈 화면이 다른 날짜로 이동해 있어도 항상 실제 오늘 날짜의 일정을 보여줌
function openTodayScheduleFromHome(event, member) {
    if (event) event.stopPropagation();
    const t = new Date();
    const dateStr = `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`;
    openAllSchedulesModal(null, dateStr, member);
}

function handleDayRightClick(event, year, month, day, member) {
    event.preventDefault();
    if (!isAdmin) return;
    openScheduleModal(year, month, day, member);
}

function getScheduleFormHTML(data, isDeletable = true) {
    const id = data.id || ''; 
    const title = data.title || ''; 
    const sDate = data.startDate || ''; 
    const eDate = data.endDate || '';
    const broad = data.broadType || '개인방송'; 
    const mem = data.memberTag || '';
    const desc = data.detail || '';
    const imageUrl = data.imageUrl || ''; 
    const ownerMember = data.tabOrMember || (typeof targetModalContext !== 'undefined' && targetModalContext ? targetModalContext.member : '') || '';
    const cheonTaBusOptionHtml = ownerMember === '달타' 
        ? `<option value="천타버스" ${broad==='천타버스'?'selected':''}>천타버스</option>` 
        : '';
    
    let hh = '', mm = '', ampm = '오후';
    if (data.time) { 
        let [h, m] = data.time.split(':'); 
        h = parseInt(h, 10); 
        ampm = h >= 12 ? '오후' : '오전'; 
        h = h % 12; 
        if (h === 0) h = 12; 
        hh = h; 
        mm = m; 
    }
    
    // 이동 버튼 모던 스타일 적용
    const moveBtnsHtml = isDeletable ? `
        <div class="absolute top-5 right-5 flex gap-1.5 z-10">
            <button type="button" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#5D4037] bg-gray-50 rounded-lg hover:bg-gray-100 transition-all" onclick="moveScheduleBlock(this, -1)" title="위로 이동"><i class="fi fi-rr-angle-up text-sm mt-0.5"></i></button>
            <button type="button" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#5D4037] bg-gray-50 rounded-lg hover:bg-gray-100 transition-all" onclick="moveScheduleBlock(this, 1)" title="아래로 이동"><i class="fi fi-rr-angle-down text-sm mt-0.5"></i></button>
        </div>
    ` : '';

    const removeBtnClass = imageUrl ? '' : 'hidden'; 
    // 공통 폼 스타일 클래스 (재사용)
    const inputBase = "w-full border border-gray-200 bg-[#FAFAFD] rounded-xl p-3.5 outline-none focus:bg-white focus:border-[#5D4037] focus:ring-2 focus:ring-[#5D4037]/10 text-[15px] font-medium transition-all text-[#5D4037]";
    const labelBase = "block text-[13px] text-gray-500 font-bold mb-2 ml-1";

    return `
        <div class="schedule-input-block border border-gray-200 p-6 rounded-[24px] bg-white relative shadow-sm pretendard mt-3 transition-all hover:shadow-md">
            ${moveBtnsHtml} <input type="hidden" class="sch-id" value="${id}">
            
            <div class="mb-5 pr-20"> 
                <label class="${labelBase}">일정 제목</label>
                <textarea class="sch-title ${inputBase} resize-none font-bold text-[16px]" style="field-sizing: content; min-height: 54px;" rows="1" placeholder="일정 제목 입력">${escapeHtml(title)}</textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-5">
                <div>
                    <label class="${labelBase}">시작일</label>
                    <input type="date" class="sch-start ${inputBase} text-[#5D4037]" value="${sDate}">
                </div>
                <div>
                    <label class="${labelBase}">종료일</label>
                    <input type="date" class="sch-end ${inputBase} text-[#5D4037]" value="${eDate}">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-5">
                <div class="optional-field">
                    <label class="${labelBase}">시간 (선택)</label>
                    <div class="flex items-center justify-between border border-gray-200 rounded-xl p-2 bg-[#FAFAFD] focus-within:bg-white focus-within:border-[var(--theme-color)] focus-within:ring-2 focus-within:ring-[var(--theme-color)]/10 transition-all">
                        <button type="button" class="sch-ampm ampm-btn px-3 py-1.5 font-bold text-gray-500 hover:text-[#5D4037] bg-white rounded-lg shadow-sm border border-gray-100 text-[13px] transition-all" onclick="toggleAmpm(this)">${ampm}</button>
                        <input type="number" min="1" max="12" class="sch-hh w-[42px] p-1 text-center font-bold text-[#5D4037] bg-transparent outline-none text-[16px]" placeholder="시" value="${hh}">
                        <span class="font-bold text-gray-300">:</span>
                        <input type="number" min="0" max="59" class="sch-mm w-[42px] p-1 text-center font-bold text-[#5D4037] bg-transparent outline-none mr-1 text-[16px]" placeholder="분" value="${mm}">
                    </div>
                </div>
                <div class="optional-field">
                    <label class="${labelBase}">유형</label>
                    <div class="relative">
                        <select class="sch-broad ${inputBase} text-[#5D4037] appearance-none cursor-pointer pr-10">
                            <option value="개인방송" ${broad==='개인방송'?'selected':''}>개인방송</option>
                            <option value="합방" ${broad==='합방'?'selected':''}>합방</option>
                            <option value="시그널합방" ${broad==='시그널합방'?'selected':''}>시그널합방</option>
                            <option value="시네티" ${broad==='시네티'?'selected':''}>시네티</option>
                            ${cheonTaBusOptionHtml}
                            <option value="비방일정" ${broad==='비방일정'?'selected':''}>비방일정</option>
                        </select>
                        <i class="fi fi-br-angle-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
                    </div>
                </div>
            </div>

            <div class="mb-5 optional-field">
                <label class="${labelBase}">함께하는 멤버 / 크루 (선택)</label>
                <input type="text" class="sch-mem ${inputBase}" placeholder="멤버 혹은 크루 이름 띄어쓰기로 입력" value="${escapeHtml(mem)}">
            </div>

            <div class="grid grid-cols-2 gap-4 mb-2 items-start">
                <div>
                    <label class="${labelBase}">이미지 첨부 (선택)</label>
                    <div class="flex items-center gap-2">
                        <input type="file" accept="image/*" class="flex-1 min-w-0 text-[13px] text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-[#5D4037] hover:file:bg-gray-200 cursor-pointer transition-all" onchange="window.handleScheduleImageUpload(this)">
                        <button type="button" class="sch-img-remove-btn ${removeBtnClass} px-3 py-2.5 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[13px] font-bold shadow-sm hover:bg-red-500 hover:text-white transition-all shrink-0" onclick="window.removeScheduleImage(this)">삭제</button>
                    </div>
                    <input type="hidden" class="sch-image-url" value="${imageUrl}">
                    <div class="sch-img-preview">${imageUrl ? `<img src="${imageUrl}" loading="lazy" decoding="async" class="h-24 w-auto rounded-xl object-cover border border-gray-200 mt-3 shadow-sm">` : ''}</div>
                </div>
                <div>
                    <label class="${labelBase}">상세 내용</label>
                    <textarea class="sch-desc ${inputBase} resize-none" style="min-height: 104px;" placeholder="상세 내용을 입력하세요">${escapeHtml(desc)}</textarea>
                </div>
            </div>
        </div>
    `;
}

function openScheduleModal(year, month, day, member) {
    targetModalContext = { year, month, day, member }; 
    document.getElementById('scheduleModalDate').innerText = `${year}년 ${month}월 ${day}일`;
    const targetDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const targets = scheduleList.filter(s => s.tabOrMember === member && isDateStrInRange(targetDateStr, s.startDate, s.endDate));
    currentEditingIds = targets.map(t => t.id); 

    const globalHh = document.getElementById('globalHh');
    const globalMm = document.getElementById('globalMm');
    const globalAmpm = document.getElementById('globalAmpmBtn');

    const typeBangon = document.getElementById('typeBangon');
    const typeHubang = document.getElementById('typeHubang');
    
    if (targets.length > 0 && targets.some(s => s.globalType === '휴방')) {
        if (typeHubang) {
            typeHubang.checked = true;
            typeHubang.dataset.wasChecked = 'true';
        }
        if (typeBangon) typeBangon.dataset.wasChecked = 'false';
    } else {
        if (typeBangon) {
            typeBangon.checked = true;
            typeBangon.dataset.wasChecked = 'true';
        }
        if (typeHubang) typeHubang.dataset.wasChecked = 'false';
    }

    if (globalHh && globalMm && globalAmpm) {
        globalHh.value = '';
        globalMm.value = '';
        globalAmpm.innerText = '오후';

        const sWithGlobal = targets.find(s => s.globalStartTime && s.globalType === '뱅온');
        if (sWithGlobal && sWithGlobal.globalStartTime) {
            let [h, m] = sWithGlobal.globalStartTime.split(':');
            h = parseInt(h, 10);
            globalAmpm.innerText = h >= 12 ? '오후' : '오전';
            h = h % 12;
            if (h === 0) h = 12;
            
            globalHh.value = h;
            globalMm.value = m; 
        }
    }

    const container = document.getElementById('scheduleInputsContainer'); 
    container.innerHTML = '';

    if (targets.length > 0) {
        const listHtml = targets.map((sch, index) => {
            const contentId = `sch-content-${index}`;
            const btnId = `btn-${index}`;
            const isHidden = index !== 0 ? 'hidden' : '';
            const btnText = index !== 0 ? '펼치기' : '접기';
            
            return `
            <div class="schedule-accordion-wrapper border border-gray-200 shadow-sm bg-white p-4 rounded-xl mb-3 relative">
                <div class="flex justify-between items-center cursor-pointer pr-16" onclick="toggleScheduleItem('${contentId}', '${btnId}')">
                    <div class="flex items-center gap-1 min-w-0">
                        <span class="schedule-drag-handle" onpointerdown="event.stopPropagation(); startScheduleDrag(event, this)" onclick="event.stopPropagation()" title="드래그하여 순서 변경">⠿</span>
                        <span class="font-bold text-[#5D4037] text-[16px] truncate">${(sch.title || '일정').split('\n')[0]}</span>
                    </div>
                    <span id="${btnId}" class="accordion-toggle-btn text-[12px] text-gray-400 font-bold shrink-0">${btnText}</span>
                </div>
                <button type="button" class="absolute top-2 right-2 text-[#5D4037] text-[35px] font-bold flex items-center justify-center hover:scale-110 transition-all z-10" onclick="event.stopPropagation(); this.closest('.schedule-accordion-wrapper').remove()" title="일정 삭제"><i class="fi fi-sr-minus-small"></i></button>
                
                <div id="${contentId}" class="schedule-accordion-content ${isHidden} mt-3 pt-3 border-t-2 border-gray-100 text-[14px] text-[#5D4037]">
                    ${getScheduleFormHTML(sch, true)} 
                </div>
            </div>`;
        }).join('');
        container.insertAdjacentHTML('beforeend', listHtml);
    } else {
        const contentId = `sch-content-0`;
        const btnId = `btn-0`;
        const wrapperHtml = `
        <div class="schedule-accordion-wrapper border border-gray-200 shadow-sm bg-white p-4 rounded-xl mb-3 relative">
            <div class="flex justify-between items-center cursor-pointer pr-16" onclick="toggleScheduleItem('${contentId}', '${btnId}')">
                <div class="flex items-center gap-1 min-w-0">
                    <span class="schedule-drag-handle" onpointerdown="event.stopPropagation(); startScheduleDrag(event, this)" onclick="event.stopPropagation()" title="드래그하여 순서 변경">⠿</span>
                    <span class="font-bold text-[#5D4037] text-[16px] truncate">새 일정</span>
                </div>
                <span id="${btnId}" class="accordion-toggle-btn text-[12px] text-gray-400 font-bold shrink-0">접기</span>
            </div>
            <button type="button" class="absolute top-2 right-2 text-[#5D4037] text-[35px] font-bold flex items-center justify-center hover:scale-110 transition-all z-10" onclick="event.stopPropagation(); this.closest('.schedule-accordion-wrapper').remove()" title="일정 삭제"><i class="fi fi-sr-minus-small"></i></button>
            
            <div id="${contentId}" class="schedule-accordion-content mt-3 pt-3 border-t-2 border-gray-100 text-[14px] text-[#5D4037]">
                ${getScheduleFormHTML({ startDate: targetDateStr, endDate: targetDateStr }, true)}
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', wrapperHtml);
    }
    
    document.getElementById('scheduleModal').classList.replace('hidden', 'flex'); 
    toggleFields('scheduleModal', 'globalSchType');
}

function addScheduleInputBlock() {
    const { year, month, day } = targetModalContext; 
    const targetDateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const container = document.getElementById('scheduleInputsContainer');
    
    closeAllSchedules(); 
    
    const newIndex = document.querySelectorAll('.schedule-accordion-wrapper').length;
    const contentId = `sch-content-${newIndex}`;
    const btnId = `btn-${newIndex}`;
    
    const wrapperHtml = `
    <div class="schedule-accordion-wrapper border border-gray-200 shadow-sm bg-white p-4 rounded-xl mb-3 relative">
        <div class="flex justify-between items-center cursor-pointer pr-16" onclick="toggleScheduleItem('${contentId}', '${btnId}')">
            <div class="flex items-center gap-1 min-w-0">
                <span class="schedule-drag-handle" onpointerdown="event.stopPropagation(); startScheduleDrag(event, this)" onclick="event.stopPropagation()" title="드래그하여 순서 변경">⠿</span>
                <span class="font-bold text-[#5D4037] text-[16px] truncate">새 일정</span>
            </div>
            <span id="${btnId}" class="accordion-toggle-btn text-[12px] text-gray-400 font-bold shrink-0">접기</span>
        </div>
        <button type="button" class="absolute top-2 right-2 text-[#5D4037] text-[35px] font-bold flex items-center justify-center hover:scale-110 transition-all z-10" onclick="event.stopPropagation(); this.closest('.schedule-accordion-wrapper').remove()" title="일정 삭제"><i class="fi fi-sr-minus-small"></i></button>
        
        <div id="${contentId}" class="schedule-accordion-content mt-3 pt-3 border-t-2 border-gray-100 text-[14px] text-[#5D4037]">
            ${getScheduleFormHTML({ startDate: targetDateStr, endDate: targetDateStr }, true)}
        </div>
    </div>`;
    
    container.insertAdjacentHTML('beforeend', wrapperHtml);
    container.scrollTop = container.scrollHeight; 
    toggleFields('scheduleModal', 'globalSchType');
}

function closeScheduleModal() { document.getElementById('scheduleModal').classList.replace('flex', 'hidden'); }

function editFromMenu() {
    if(!contextTargetId) return; 
    const sch = scheduleList.find(s => s.id === contextTargetId); 
    if(!sch) return;
    
    const radios = document.querySelectorAll('input[name="editGlobalSchType"]');
    radios.forEach(radio => radio.dataset.wasChecked = 'false');
    
    const activeRadio = document.querySelector(`input[name="editGlobalSchType"][value="${sch.globalType}"]`);
    if (activeRadio) {
        activeRadio.checked = true;
        activeRadio.dataset.wasChecked = 'true';
    }

    document.getElementById('editContainer').innerHTML = getScheduleFormHTML(sch, false);
    document.getElementById('editScheduleModal').classList.replace('hidden', 'flex'); 
    toggleFields('editScheduleModal', 'editGlobalSchType');

    const editModal = document.getElementById('editScheduleModal');
    const btnContainer = editModal.querySelector('.flex.gap-2') || editModal.querySelector('.flex.gap-3');
    
    if (btnContainer) {
        btnContainer.className = "flex gap-3 w-full mt-2";
        btnContainer.innerHTML = `
            <button type="button" onclick="deleteScheduleAction()" class="flex-1 bg-red-500 text-white font-bold text-[18px] py-4 rounded-xl hover:bg-red-600 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] font-paperozi cursor-pointer">
                삭제
            </button>
            <button type="button" onclick="saveEditedSchedule()" class="flex-1 bg-[#5D4037] text-white font-bold text-[18px] py-4 rounded-xl hover:brightness-110 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] font-paperozi cursor-pointer">
                저장
            </button>
        `;
    }
}

function closeEditModal() { document.getElementById('editScheduleModal').classList.replace('flex', 'hidden'); contextTargetId = null; }

function renderSchedulesInModal(schedules, y, m, d, member) {
    const modal = document.getElementById('scheduleDetailModal'); 
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.backgroundColor = 'var(--card-bg-white)'; 
    modalContent.style.padding = '20px';

    const titleEl = document.getElementById('detailModalTitle');
    if (titleEl) {
        if (schedules.length === 1) {
            titleEl.textContent = schedules[0].title || '';
        } else if (schedules.length > 1) {
            titleEl.textContent = (schedules[0].tabOrMember || '') + ' 일정';
        } else {
            titleEl.textContent = '';
        }
    }

    let htmlContent = '<div class="flex flex-col w-full max-h-[65vh] overflow-y-auto px-2 pt-1 pb-2 modal-scroll">';
    if (schedules.length === 0) {
        htmlContent += `<div class="text-center text-gray-500 font-bold mt-4 mb-2 text-base">일정이 없습니다.</div>`;
    } else {
        schedules.forEach((sch, index) => {
            let timeText = sch.time ? formatTime12(sch.time) : ''; 
            let broadText = sch.broadType || '개인방송'; 
            let detailText = sch.detail || '';
            let themeColor = themeColors[sch.tabOrMember] || '#5D4037';
            
            let broadStyle = '';
            if (broadText === '합방') {
                broadStyle = 'background-color: #c026d3; color: #ffffff;'; 
            } else if (broadText === '시그널합방') {
                broadStyle = 'background-color: #ef4444; color: #ffffff;'; 
            } else if (broadText === '천타버스') {
                broadStyle = 'background-color: #0891b2; color: #ffffff;'; 
            } else if (broadText === '시네티') {
                broadStyle = 'background-color: #9333ea; color: #ffffff;'; 
            } else if (broadText === '비방일정') {
                broadStyle = 'background-color: #6B7280; color: #ffffff;'; 
            } else {
                broadStyle = `background-color: ${themeColor}; color: #ffffff;`;
            }

            const titleInner = schedules.length > 1
                ? `<div class="text-[17px] font-bold text-[#000] text-center leading-tight break-keep font-paperozi mb-1 whitespace-pre-line">${sch.title}</div>`
                : '';
            
            let badgeHtml = sch.globalType === '휴방'
                ? `<div class="flex gap-2 justify-center">
                    <span class="px-3 py-1 text-[11px] font-bold rounded-full shadow-sm" style="background-color: #9CA3AF; color: #ffffff;">휴방</span>
                </div>`
                : `<div class="flex gap-2 justify-center">
                    ${timeText ? `<span class="px-3 py-1 text-[11px] font-bold rounded-full shadow-sm" style="background-color: ${themeColor}; color: #ffffff;">${timeText}</span>` : ''}
                    <span class="px-3 py-1 text-[11px] font-bold rounded-full shadow-sm" style="${broadStyle}">${broadText}</span>
                </div>`;
            
            let imgHtml = sch.imageUrl ? `<img src="${sch.imageUrl}" loading="lazy" decoding="async" class="w-full max-h-[260px] object-contain rounded-xl my-3 shadow-sm border border-gray-200">` : '';

            let memGroupHtml = '';
            if (sch.memberTag) {
                const parsed = parseMembers(sch.memberTag);
                memGroupHtml = `
                <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 12px 8px; margin: 12px auto 4px; width: 100%; max-width: 420px;">
                    ${parsed.map(m => {
                        const isCrew = m.isCrew;
                        return `
                        <div style="${isCrew ? 'width:100%;' : 'width: 74px;'} display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <div style="${isCrew ? 'width:100%; border-radius:12px;' : 'width:72px; height:72px; border-radius:50%;'} overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                                <img src="${m.imageUrl}" style="width:100%; height:100%; object-fit:${isCrew ? 'contain' : 'cover'};" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/72'">
                            </div>
                            ${(m.nickname && !isCrew) ? `<span class="dm-text-brown" style="font-size:13px; font-weight:700; color:#5D4037; text-align:center; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing: -0.5px;">${m.nickname}</span>` : ''}
                        </div>`;
                    }).join('')}
                </div>`;
            }

            let detailHtml = '';
            if (detailText) {
                const lines = detailText.split('\n');
                const lineItems = lines.map(line => 
                    `<div class="detail-notebook-line">${line || '&nbsp;'}</div>`
                ).join('');
                detailHtml = `
                <div class="detail-notebook-box">
                    ${lineItems}
                </div>`;
            }

            htmlContent += `<div class="flex flex-col w-full items-center">
                ${titleInner}
                <div class="flex flex-col items-center gap-1.5 mb-1.5 w-full">
                    ${badgeHtml}
                </div>
                ${memGroupHtml}
                <div class="flex flex-col gap-2 w-full pretendard px-1">
                    ${detailHtml}
                </div>
                ${imgHtml}
            </div>`;
            if (index < schedules.length - 1) htmlContent += `<div class="w-full border-b-2 border-dashed border-[#5D4037] opacity-20 my-4"></div>`;
        });
    }
    htmlContent += '</div>';

    document.getElementById('detailDesc').innerHTML = htmlContent;
    modal.classList.replace('hidden', 'flex'); 
}

function openDetailModal(event, schId) { 
    event.stopPropagation(); 
    const sch = scheduleList.find(s => s.id === schId); 
    if(!sch) return; 
    renderSchedulesInModal([sch], null, null, null, null); 
}

function openAllSchedulesModal(event, dateStr, member) {
    if (event) event.stopPropagation(); 
    const [y, m, d] = dateStr.split('-'); 
    const targetDateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    const allSchedules = scheduleList.filter(s => s.tabOrMember === member && isDateStrInRange(targetDateStr, s.startDate, s.endDate));
    renderSchedulesInModal(allSchedules, y, m, d, member);
}

function closeDetailModal() { const modal = document.getElementById('scheduleDetailModal'); modal.classList.replace('flex', 'hidden'); modal.style.display = ''; }

document.addEventListener('contextmenu', event => {
    if (typeof isAdmin !== 'undefined' && isAdmin) return;
    event.preventDefault();
});
document.addEventListener('selectstart', event => {
    if (typeof isAdmin !== 'undefined' && isAdmin) return;
    event.preventDefault();
});
document.addEventListener('keydown', function(e) {
    if (typeof isAdmin !== 'undefined' && isAdmin) return;
    if (e.ctrlKey && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'u')) {
        e.preventDefault();
    }
});

document.addEventListener('click', function(e) {
    if (e.target.name === 'globalSchType' || e.target.name === 'editGlobalSchType') {
        const modalId = e.target.name === 'globalSchType' ? 'scheduleModal' : 'editScheduleModal';
        
        if (e.target.dataset.wasChecked === 'true') {
            e.target.checked = false;
            e.target.dataset.wasChecked = 'false';
        } else {
            document.querySelectorAll(`input[name="${e.target.name}"]`).forEach(radio => radio.dataset.wasChecked = 'false');
            e.target.dataset.wasChecked = 'true';
        }
        
        toggleFields(modalId, e.target.name);
    }
});

function hidePageLoadingScreen() {
    const el = document.getElementById('pageLoadingScreen');
    if (!el) return; // 임베드 모드는 index.html에서 이미 제거되어 여기서 바로 종료됨
    const MIN_DISPLAY_MS = 1500;
    const startTime = window.__pageLoadingStartTime || Date.now();
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => { el.remove(); }, remaining);
}

async function initApp() {
    adjustDesktopScale(); 

    const sessionActive = sessionStorage.getItem('activeAdminSession') || localStorage.getItem('activeAdminSession');
    if (sessionActive) {
        const { docId, token } = JSON.parse(sessionActive);
        try {
            const docRef = doc(db, "admins", docId);
            const docSnap = await getDoc(docRef);
            
            const savedProfiles = JSON.parse(localStorage.getItem('savedAdminProfiles') || '[]');
            const matchedProfile = savedProfiles.find(p => p.docId === docId);
            
            if (docSnap.exists() && matchedProfile && matchedProfile.token === token) {
                isAdmin = true;
                loggedInUser = { docId, ...docSnap.data() };
                refreshAuthUI();
            } else {
                sessionStorage.removeItem('activeAdminSession');
                localStorage.removeItem('activeAdminSession');
            }
        } catch(e) { console.error("자동 로그인 검증 실패:", e); }
    }
    
    // === 초기 탭 설정 분리 ===
    const today = getTodayYYYYMMDD();
    let initialTab = '홈';

    // ?room=코드 초대 링크로 접속한 경우, 해시 라우팅보다 우선하여 파트분배기 방으로 바로 진입시킨다.
    const partDividerInviteCode = new URLSearchParams(window.location.search).get('room');

    const currentHash = window.location.hash;
    if (partDividerInviteCode) {
        currentPage = '파트분배기';
        initialTab = '파트분배기';
    } else if (currentHash && hashToTab[currentHash]) {
        let mapped = hashToTab[currentHash];
        if (mapped === '업보정리') {
            currentPage = '업보선택';
            initialTab = mapped;
        } else if (mapped.startsWith('업보정리_')) {
            currentPage = '업보정리';
            upboCurrentMember = mapped.split('_')[1];
            initialTab = mapped;
        } else {
            currentPage = mapped;
            initialTab = mapped;
        }
    } else {
        currentPage = '홈';
        initialTab = '홈';
    }

    // === 필수 데이터 우선 로딩 (렌더링 최우선) ===
    if (currentPage === '홈') {
        // 홈은 모든 멤버의 일정이 필요하므로 전체를 불러온다.
        await loadSchedulesFromFirebase();
        await loadHomeSettingsFromFirebase(); // 홈 탭 입장 시 유튜브 박스 설정을 즉시 가져옴
        await loadDdaysFromFirebase(); // 홈 탭 입장 시 디데이 목록도 함께 가져옴
    } else if (['달타', '다룽', '최또', '카나시'].includes(currentPage)) {
        // 개인 캘린더 탭은 해당 멤버의 일정/메모 컬렉션만 불러온다.
        await loadSchedulesFromFirebase({ member: currentPage });
    } else {
        // 그 외 탭(업보정리/롤링페이퍼/노래책/시그널/클립 등)은 멤버별 일정 컬렉션이 필요 없으므로,
        // 멤버 목록·그룹·롤링 주제 등 공통 데이터만 가볍게 불러온다.
        await loadSchedulesFromFirebase({ members: [] });
    }
    setActiveSongs(songbookMember);

    // 필수 데이터로 초기 화면 렌더링
    await changeTab(initialTab);

    // 파트분배기 초대 링크(?room=코드)로 접속한 경우 - 로비를 건너뛰고 방에 자동 입장시킨 뒤 다시 렌더링
    if (partDividerInviteCode) {
        await partDividerHandleUrlAutoJoin();
        renderPartDividerPage();
    }

    // === 후순위 데이터 병렬 지연 로딩 ===
    Promise.all([
        loadLinksFromFirebase(),
        loadPopupImagesFromFirebase(),
        currentPage !== '홈' ? loadHomeSettingsFromFirebase() : Promise.resolve(),
        currentPage !== '홈' ? loadDdaysFromFirebase() : Promise.resolve()
    ]).then(() => {
        // 백그라운드 로드가 끝나면 UI 실시간 갱신
        renderHeaderTabs();
        checkAndShowPopup(today);
        if (currentPage === '홈') {
            renderHomeYoutubeBox();
        }
        }).catch(e => console.error("지연 로딩 에러:", e));
}

let editingUpLinkId = null;
let editingUpLinkSource = null;

window.openEditUpLink = function(id, source) {
    const upItem = upLinksList.find(u => u.id === id);
    if (!upItem) {
        alert("데이터를 찾을 수 없습니다.");
        return;
    }
    editingUpLinkId = id;
    editingUpLinkSource = source || upItem.source || 'uplinks';

    document.getElementById('editUpMember').value = upItem.member || '';
    document.getElementById('editUpTitle').value = upItem.title || '';
    document.getElementById('editUpUrl').value = upItem.url || '';
    document.getElementById('editUpDeadline').value = upItem.deadline || '';

    document.getElementById('editUpLinkModalOverlay').classList.replace('hidden', 'flex');
};

window.closeEditUpLinkModal = function() {
    document.getElementById('editUpLinkModalOverlay').classList.replace('flex', 'hidden');
    editingUpLinkId = null;
    editingUpLinkSource = null;
};

window.saveEditUpLink = async function() {
    if (!editingUpLinkId) return;

    const newMember = document.getElementById('editUpMember').value.trim();
    const newTitle = document.getElementById('editUpTitle').value.trim();
    const newUrl = document.getElementById('editUpUrl').value.trim();
    const newDeadline = document.getElementById('editUpDeadline').value;

    if (!newTitle || !newUrl) return alert('제목과 URL을 입력하세요.');

    try {
        const colName = editingUpLinkSource === 'soop' ? 'soop_posts' : 'uplinks';
        const docRef = doc(db, colName, editingUpLinkId);

        const updatePayload = editingUpLinkSource === 'soop'
            ? { member: newMember, title: newTitle, link: newUrl, deadline: newDeadline }
            : { member: newMember, title: newTitle, url: newUrl, deadline: newDeadline };

        await updateDoc(docRef, updatePayload);

        const upItem = upLinksList.find(u => u.id === editingUpLinkId);
        if (upItem) {
            upItem.member = newMember;
            upItem.title = newTitle;
            upItem.url = newUrl;
            upItem.deadline = newDeadline;
        }

        renderUpLinksPanel();
        if (isUpModeModalOpen()) renderUpModeModalContent();
        renderUpLinkManagePanel();

        closeEditUpLinkModal();
        alert("수정되었습니다.");
    } catch (e) {
        console.error("수정 실패:", e);
        alert("수정에 실패했습니다.");
    }
};

window.deleteUpLinkFromEditModal = async function() {
    if (!editingUpLinkId) return;
    await deleteUpLink(editingUpLinkId, editingUpLinkSource);
    closeEditUpLinkModal();
};

window.openMemberManageModal = async function() {
    if(!isAdmin) return;
    // 캐시된 값이 있다면 우선 그대로 먼저 보여주고, 동시에 최신 데이터로 다시 불러온다.
    const memberListContainer = document.getElementById('customMembersList') || document.getElementById('memberManageContainer');
    if (memberListContainer) renderCustomMembersList();
    renderGroupMemberCheckboxes([]);
    renderMemberGroupsList();
    const modal = document.getElementById('memberManageModal');
    if (!modal) return;
    modal.classList.replace('hidden', 'flex');

    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });

    // 모달을 열 때마다 멤버관리 DB(memberDb)에서 최신 멤버 목록을 다시 불러온다.
    // (스케줄 캐시 로직 때문에 customMembers가 갱신되지 않고 비어 보이는 문제를 방지하기 위함)
    try {
        const smSnap = await getDocs(collection(memberDb, 'members'));
        customMembers = [];
        smSnap.forEach(docSnap => {
            const data = docSnap.data();
            customMembers.push({
                id: docSnap.id,
                nickname: data.name || '',
                soopId: data.soopId || '',
                imageUrl: data.img || 'https://via.placeholder.com/60',
                isCrew: data.type === 'crew',
                timestamp: data.timestamp || 0
            });
        });
        saveScheduleCache();
        if (memberListContainer) renderCustomMembersList();

        // 멤버 그룹은 멤버관리 전용 DB가 아닌 시그널 DB의 memberGroups 컬렉션에서 불러옵니다.
        const groupSnap = await getDocs(collection(db, 'memberGroups'));
        memberGroups = [];
        groupSnap.forEach(docSnap => memberGroups.push({ id: docSnap.id, ...docSnap.data() }));
        saveScheduleCache();
        renderMemberGroupsList();
    } catch (e) {
        console.error('멤버 목록 새로고침 실패 (memberDb - members 컬렉션):', e);
        showToast('멤버 목록을 불러오지 못했습니다. Firestore 권한(규칙)을 확인해주세요.');
    }
};

window.closeMemberManageModal = function() {
    document.getElementById('memberManageModal').classList.replace('flex', 'hidden');
};

window.addCustomMember = async function() {
    const nickname = document.getElementById('newMemberNickname').value.trim();
    const soopId = document.getElementById('newMemberSoopId').value.trim();
    const imageUrlInput = document.getElementById('newMemberImageUrl').value.trim();
    const isCrew = document.getElementById('isCrewCheckbox').checked;
    
    if(!nickname) return alert("이름을 입력해주세요.");
    
    let imageUrl = imageUrlInput;
    if(!imageUrl && soopId) {
        const prefix = soopId.substring(0, 2);
        imageUrl = `https://stimg.sooplive.com/LOGO/${prefix}/${soopId}/${soopId}.jpg`;
    } else if(!imageUrl) {
        imageUrl = 'https://via.placeholder.com/60';
    }
    
    try {
        const newMem = { nickname, soopId, imageUrl, isCrew, timestamp: Date.now() };
        const docId = `member_${nickname}`;
        await setDoc(doc(memberDb, 'members', docId), {
            name: nickname,
            soopId,
            img: imageUrl,
            type: isCrew ? 'crew' : 'member',
            timestamp: newMem.timestamp
        });
        customMembers.push({ id: docId, ...newMem });
        saveScheduleCache();
        
        document.getElementById('newMemberNickname').value = '';
        document.getElementById('newMemberSoopId').value = '';
        document.getElementById('newMemberImageUrl').value = '';
        renderCustomMembersList();
    } catch(e) { console.error(e); alert('추가 실패'); }
};

window.parseMembers = function(tagString) {
    if (!tagString) return [];
    const names = tagString.split(/[, ]+/).filter(n => n.trim() !== '');
    const result = [];
    names.forEach(name => {
        const group = memberGroups.find(g => g.name === name);
        if (group && group.memberIds && group.memberIds.length > 0) {
            group.memberIds.forEach(mid => {
                const found = customMembers.find(m => m.id === mid);
                if (found) {
                    result.push({ ...found, nickname: found.isCrew ? '' : found.nickname });
                }
            });
            return;
        }
        const found = customMembers.find(m => m.nickname === name);
        if (found) {
            result.push({ ...found, nickname: found.isCrew ? '' : found.nickname });
            return;
        }
        const def = members.find(m => m.name === name);
        result.push(def ? { nickname: def.name, imageUrl: def.img, isCrew: false } : { nickname: name, imageUrl: 'https://via.placeholder.com/60', isCrew: false });
    });
    return result;
};

window.deleteCustomMember = async function(id) {
    if(!confirm("이 멤버를 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(memberDb, 'members', id));
        customMembers = customMembers.filter(m => m.id !== id);
        saveScheduleCache();
        renderCustomMembersList();
        render();
    } catch(e) { console.error(e); }
};

let editingGroupId = null;

window.renderCustomMembersList = function(filterText = '') {
    const container = document.getElementById('customMembersList') || document.getElementById('memberManageContainer');
    const badge = document.getElementById('memberCountBadge');
    if (!container) return;
    const query = filterText.toLowerCase();
    const filtered = query
        ? customMembers.filter(m => m.nickname.toLowerCase().includes(query) || (m.soopId || '').toLowerCase().includes(query))
        : customMembers;

    if (badge) badge.textContent = query ? `${filtered.length} / ${customMembers.length}명` : `총 ${customMembers.length}명`;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 font-bold text-[14px] py-6">${query ? '검색 결과가 없습니다.' : '등록된 멤버가 없습니다.'}</div>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
            ${filtered.map(m => `
                <div class="flex flex-col items-center bg-white border-2 border-gray-200 p-2 rounded-xl shadow-sm relative w-full box-border">
                    <button onclick="deleteCustomMember('${m.id}')" class="absolute top-1 right-1 text-red-400 hover:text-red-600 transition p-1">
                        <i class="fi fi-br-cross-small text-[10px]"></i>
                    </button>
                    <img src="${m.imageUrl}" loading="lazy" decoding="async" class="w-12 h-12 rounded-full object-cover border border-[#5D4037] mb-1.5" onerror="this.src='https://via.placeholder.com/40'">
                    <div class="text-center w-full overflow-hidden">
                        <div class="font-bold text-[11px] text-[#5D4037] truncate px-1">${m.nickname}</div>
                        ${m.soopId ? `<div class="text-[10px] text-gray-400 truncate px-1">${m.soopId}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

window.filterMembersList = function() {
    const q = document.getElementById('memberSearchInput') ? document.getElementById('memberSearchInput').value : '';
    renderCustomMembersList(q);
};

window.filterGroupsList = function() {
    const q = document.getElementById('groupSearchInput') ? document.getElementById('groupSearchInput').value : '';
    renderMemberGroupsList(q);
};

window.exportMembersList = function() {
    if (!customMembers.length) {
        alert('내보낼 멤버가 없습니다.');
        return;
    }
    const lines = customMembers.map(m => `${m.nickname},${m.soopId || ''}`);
    const text = lines.join('\r\n');
    const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `멤버목록_${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.importMembersListFile = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l !== '');

        if (!lines.length) {
            alert('파일에서 읽을 수 있는 멤버가 없습니다.');
            event.target.value = '';
            return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        for (const line of lines) {
            const parts = line.split(/[,\t]/).map(p => p.trim());
            const nickname = parts[0];
            const soopId = parts[1] || '';

            if (!nickname) { skippedCount++; continue; }

            const exists = customMembers.some(m => m.nickname === nickname && (m.soopId || '') === soopId);
            if (exists) { skippedCount++; continue; }

            let imageUrl = '';
            if (soopId) {
                const prefix = soopId.substring(0, 2);
                imageUrl = `https://stimg.sooplive.com/LOGO/${prefix}/${soopId}/${soopId}.jpg`;
            } else {
                imageUrl = 'https://via.placeholder.com/60';
            }

            try {
                const newMem = { nickname, soopId, imageUrl, isCrew: false, timestamp: Date.now() };
                const docId = `member_${nickname}`;
                await setDoc(doc(memberDb, 'members', docId), {
                    name: nickname,
                    soopId,
                    img: imageUrl,
                    type: 'member',
                    timestamp: newMem.timestamp
                });
                customMembers.push({ id: docId, ...newMem });
                addedCount++;
            } catch (err) {
                console.error('멤버 불러오기 실패:', nickname, err);
                skippedCount++;
            }
        }

        renderCustomMembersList();
        saveScheduleCache();
        alert(`${addedCount}명 추가되었습니다.${skippedCount > 0 ? ` (${skippedCount}명은 중복/오류로 제외)` : ''}`);
        event.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
};

window.switchMemberManageTab = function(tab) {
    const memberContent = document.getElementById('memberTabContent');
    const groupContent = document.getElementById('groupTabContent');
    const memberBtn = document.getElementById('memberTabBtn');
    const groupBtn = document.getElementById('groupTabBtn');

    if (tab === 'member') {
        memberContent.classList.remove('hidden'); memberContent.classList.add('flex');
        groupContent.classList.remove('flex'); groupContent.classList.add('hidden');
        memberBtn.classList.add('bg-[#5D4037]', 'text-white'); memberBtn.classList.remove('bg-white', 'text-[#5D4037]');
        groupBtn.classList.remove('bg-[#5D4037]', 'text-white'); groupBtn.classList.add('bg-white', 'text-[#5D4037]');
    } else {
        groupContent.classList.remove('hidden'); groupContent.classList.add('flex');
        memberContent.classList.remove('flex'); memberContent.classList.add('hidden');
        groupBtn.classList.add('bg-[#5D4037]', 'text-white'); groupBtn.classList.remove('bg-white', 'text-[#5D4037]');
        memberBtn.classList.remove('bg-[#5D4037]', 'text-white'); memberBtn.classList.add('bg-white', 'text-[#5D4037]');
        editingGroupId = null;
        renderGroupMemberCheckboxes([]);
        renderMemberGroupsList();
    }
};

function getGroupAllMembers() {
    return [
        ...members.map(m => ({ id: '__builtin__' + m.name, nickname: m.name, imageUrl: m.img })),
        ...customMembers.filter(m => !m.isCrew)
    ];
}

function resolveGroupMembers(memberIds) {
    return (memberIds || []).map(mid => {
        if (mid.startsWith('__builtin__')) {
            const bname = mid.replace('__builtin__', '');
            const bm = members.find(m => m.name === bname);
            return bm ? { nickname: bm.name, imageUrl: bm.img } : null;
        }
        return customMembers.find(m => m.id === mid) || null;
    }).filter(Boolean);
}

let groupCheckboxSelectedIds = new Set();

window.toggleGroupMemberCheckbox = function(cb) {
    if (cb.checked) {
        groupCheckboxSelectedIds.add(cb.value);
    } else {
        groupCheckboxSelectedIds.delete(cb.value);
    }
    renderSelectedGroupMembersChips();
};

window.renderSelectedGroupMembersChips = function() {
    const container = document.getElementById('groupSelectedMembersChips');
    if (!container) return;

    if (groupCheckboxSelectedIds.size === 0) {
        container.innerHTML = `<span class="text-[11px] text-gray-400 font-bold">선택된 멤버가 없습니다.</span>`;
        return;
    }

    const allMembers = getGroupAllMembers();
    const selectedMembers = Array.from(groupCheckboxSelectedIds).map(id => {
        const m = allMembers.find(am => am.id === id);
        return m ? m : { id, nickname: '(알 수 없음)', imageUrl: '' };
    });

    container.innerHTML = `<span class="text-[11px] text-gray-500 font-bold mr-0.5">선택됨 (${selectedMembers.length}명)</span>` +
        selectedMembers.map(m => `
            <span class="inline-flex items-center gap-1 bg-[#5D4037] text-white rounded-full pl-2 pr-1 py-0.5 text-[11.5px] font-bold">
                ${m.nickname}
                <button type="button" onclick="removeGroupSelectedMember('${m.id}')" class="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center shrink-0"><i class="fi fi-br-cross-small text-[8px]"></i></button>
            </span>
        `).join('');
};

window.removeGroupSelectedMember = function(id) {
    groupCheckboxSelectedIds.delete(id);
    const cb = document.querySelector(`.group-member-cb[value="${CSS.escape(id)}"]`);
    if (cb) cb.checked = false;
    renderSelectedGroupMembersChips();
};

window.renderGroupMemberCheckboxes = function(preCheckedIds = null, filterText = '') {
    const container = document.getElementById('groupMemberCheckboxes');
    if (!container) return;

    if (preCheckedIds !== null) {
        groupCheckboxSelectedIds = new Set(preCheckedIds);
    }

    const query = filterText.toLowerCase();
    const allMembers = getGroupAllMembers();
    const filtered = query ? allMembers.filter(m => m.nickname.toLowerCase().includes(query)) : allMembers;

    renderSelectedGroupMembersChips();

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 font-bold text-[12px] py-3 w-full">검색 결과가 없습니다.</div>`;
        return;
    }

    container.innerHTML = filtered.map(m => `
        <label class="flex items-center gap-1.5 bg-white border-2 border-gray-200 rounded-xl px-2 py-1.5 cursor-pointer hover:border-[#5D4037] transition text-[12px] font-bold text-[#5D4037]">
            <input type="checkbox" class="group-member-cb accent-[#5D4037]" value="${m.id}" data-nickname="${m.nickname}" onchange="toggleGroupMemberCheckbox(this)" ${groupCheckboxSelectedIds.has(m.id) ? 'checked' : ''}>
            <img src="${m.imageUrl}" loading="lazy" decoding="async" class="w-6 h-6 rounded-full object-cover border border-gray-200" onerror="this.src='https://via.placeholder.com/24'">
            ${m.nickname}
        </label>
    `).join('');
};

window.filterGroupMemberCheckboxes = function() {
    const q = document.getElementById('groupMemberSearchInput') ? document.getElementById('groupMemberSearchInput').value : '';
    renderGroupMemberCheckboxes(null, q);
};

window.renderMemberGroupsList = function(filterText = '') {
    const container = document.getElementById('memberGroupsList');
    const badge = document.getElementById('groupCountBadge');
    if (!container) return;

    const query = filterText.toLowerCase();
    const filtered = query
        ? memberGroups.filter(g => {
            if (g.name.toLowerCase().includes(query)) return true;
            const groupMems = resolveGroupMembers(g.memberIds);
            return groupMems.some(m => (m.nickname || '').toLowerCase().includes(query));
        })
        : memberGroups;

    if (badge) badge.textContent = query ? `${filtered.length} / ${memberGroups.length}개` : `총 ${memberGroups.length}개`;

    if (memberGroups.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 font-bold text-[14px] py-6">등록된 그룹이 없습니다.</div>`;
        return;
    }
    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 font-bold text-[14px] py-6">검색 결과가 없습니다.</div>`;
        return;
    }
    container.innerHTML = filtered.map(g => {
        const groupMems = resolveGroupMembers(g.memberIds);
        return `
        <div class="bg-white border-2 border-[#5D4037] rounded-xl p-3 relative">
            <div class="flex items-center justify-between mb-2 pr-1">
                <div class="font-bold text-[#5D4037] text-[15px] font-paperozi flex items-center gap-1.5">
                    <i class="fi fi-rr-users-alt text-[13px]"></i> ${g.name}
                    <span class="text-[11px] text-gray-400 font-bold ml-1">(${groupMems.length}명)</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="startEditGroup('${g.id}')" class="text-[#5D4037] hover:text-blue-500 transition p-1" title="수정"><i class="fi fi-rr-edit text-[13px]"></i></button>
                    <button onclick="deleteMemberGroup('${g.id}')" class="text-red-400 hover:text-red-600 transition p-1" title="삭제"><i class="fi fi-br-cross-small text-[11px]"></i></button>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mb-2">
                ${groupMems.map(m => `
                    <div class="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2 py-1">
                        <img src="${m.imageUrl}" loading="lazy" decoding="async" class="w-5 h-5 rounded-full object-cover" onerror="this.src='https://via.placeholder.com/20'">
                        <span class="text-[11px] font-bold text-[#5D4037]">${m.nickname || '크루'}</span>
                    </div>
                `).join('')}
            </div>
            <div class="text-[11px] text-gray-400 font-bold">멤버 태그에 <span class="text-[#5D4037] font-bold">"${g.name}"</span> 입력하면 적용됩니다</div>
        </div>`;
    }).join('');
};

window.startEditGroup = function(id) {
    const group = memberGroups.find(g => g.id === id);
    if (!group) return;
    editingGroupId = id;

    document.getElementById('newGroupName').value = group.name;

    const groupMemberSearchInput = document.getElementById('groupMemberSearchInput');
    if (groupMemberSearchInput) groupMemberSearchInput.value = '';
    renderGroupMemberCheckboxes(group.memberIds || []);

    const addBtn = document.getElementById('groupAddBtn');
    if (addBtn) {
        addBtn.textContent = '수정 저장';
        addBtn.classList.replace('bg-[#5D4037]', 'bg-blue-600');
    }
    const cancelBtn = document.getElementById('groupEditCancelBtn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    document.getElementById('newGroupName').focus();
    document.getElementById('newGroupName').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelEditGroup = function() {
    editingGroupId = null;
    document.getElementById('newGroupName').value = '';
    const groupMemberSearchInput = document.getElementById('groupMemberSearchInput');
    if (groupMemberSearchInput) groupMemberSearchInput.value = '';
    renderGroupMemberCheckboxes([]);
    const addBtn = document.getElementById('groupAddBtn');
    if (addBtn) {
        addBtn.textContent = '그룹 추가';
        addBtn.classList.replace('bg-blue-600', 'bg-[#5D4037]');
    }
    const cancelBtn = document.getElementById('groupEditCancelBtn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
};

window.addMemberGroup = async function() {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) return alert('그룹 이름을 입력해주세요.');
    if (groupCheckboxSelectedIds.size === 0) return alert('멤버를 1명 이상 선택해주세요.');
    const memberIds = Array.from(groupCheckboxSelectedIds);

    try {
        if (editingGroupId) {
            await updateDoc(doc(db, 'memberGroups', editingGroupId), { name, memberIds });
            const idx = memberGroups.findIndex(g => g.id === editingGroupId);
            if (idx !== -1) { memberGroups[idx].name = name; memberGroups[idx].memberIds = memberIds; }
            cancelEditGroup();
        } else {
            const newGroup = { name, memberIds, timestamp: Date.now() };
            const docRef = await addDoc(collection(db, 'memberGroups'), newGroup);
            memberGroups.push({ id: docRef.id, ...newGroup });
            document.getElementById('newGroupName').value = '';
            const groupMemberSearchInput = document.getElementById('groupMemberSearchInput');
            if (groupMemberSearchInput) groupMemberSearchInput.value = '';
            renderGroupMemberCheckboxes([]);
        }
        renderMemberGroupsList();
    } catch(e) { console.error(e); alert(editingGroupId ? '수정 실패' : '그룹 추가 실패'); }
};

window.deleteMemberGroup = async function(id) {
    if (!confirm('이 그룹을 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'memberGroups', id));
        memberGroups = memberGroups.filter(g => g.id !== id);
        if (editingGroupId === id) cancelEditGroup();
        renderMemberGroupsList();
    } catch(e) { console.error(e); }
};

window.toggleScheduleItem = function(targetContentId, targetBtnId) {
    closeAllSchedules();

    const content = document.getElementById(targetContentId);
    const btn = document.getElementById(targetBtnId);
    if (content && content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.innerText = '접기';
    }
};

function closeAllSchedules() {
    const contents = document.querySelectorAll('[id^="sch-content-"]');
    const btns = document.querySelectorAll('[id^="btn-"]');
    
    contents.forEach(el => el.classList.add('hidden'));
    btns.forEach(el => el.innerText = '펼치기');
}

window.closeAllSchedules = function() {
    const contents = document.querySelectorAll('.schedule-accordion-content');
    const btns = document.querySelectorAll('.accordion-toggle-btn');
    
    contents.forEach(el => el.classList.add('hidden'));
    btns.forEach(el => el.innerText = '펼치기');
};

function getLunarDate(y, m, d) {
    try {
        const solar = Solar.fromYmd(y, m, d);
        const lunar = solar.getLunar();
        return `${lunar.getMonth()}.${lunar.getDay()}`;
    } catch (e) {
        return "";
    }
}

window.toggleUpboGuide = function() {
    const box = document.getElementById('upboGuideBox');
    const btn = document.getElementById('upboGuideBtn');
    if (!box) return;
    const isHidden = box.classList.contains('hidden');
    box.classList.toggle('hidden');
    if (isHidden) {
        btn.classList.add('bg-[#5D4037]', 'text-white');
        btn.classList.remove('bg-white', 'text-[#5D4037]');
    } else {
        btn.classList.remove('bg-[#5D4037]', 'text-white');
        btn.classList.add('bg-white', 'text-[#5D4037]');
    }
};

// =========================================================================
// 업보정리 텍스트 파일 일괄 업로드 기능
// =========================================================================
window.toggleUpboFileMenu = function() {
    const menu = document.getElementById('upboFileMenu');
    if(!menu) return;
    if(menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); }
    else { menu.classList.remove('flex'); menu.classList.add('hidden'); }
};

window.closeUpboFileMenu = function() {
    const menu = document.getElementById('upboFileMenu');
    if(menu) { menu.classList.add('hidden'); menu.classList.remove('flex'); }
};

window.addEventListener('click', (e) => {
    const menu = document.getElementById('upboFileMenu');
    if(menu && !menu.classList.contains('hidden') && !e.target.closest('#upboFileMenuWrapper')) {
        closeUpboFileMenu();
    }
});

window.upboUploadMode = 'mapping';

window.setUpboUploadMode = function(mode) {
    window.upboUploadMode = mode;
    const mappingBtn = document.getElementById('upboModeMappingBtn');
    const fixedBtn = document.getElementById('upboModeFixedBtn');
    const mappingSection = document.getElementById('upboMappingRuleSection');
    const fixedSection = document.getElementById('upboFixedFormatSection');
    const activeCls = 'flex-1 py-2 rounded-lg font-bold text-[12.5px] transition-all bg-[#5D4037] text-white shadow-sm';
    const inactiveCls = 'flex-1 py-2 rounded-lg font-bold text-[12.5px] transition-all text-gray-500 hover:text-[#5D4037]';

    if (mappingBtn) mappingBtn.className = mode === 'mapping' ? activeCls : inactiveCls;
    if (fixedBtn) fixedBtn.className = mode === 'fixed' ? activeCls : inactiveCls;
    if (mappingSection) mappingSection.classList.toggle('hidden', mode !== 'mapping');
    if (fixedSection) fixedSection.classList.toggle('hidden', mode !== 'fixed');
};

window.openUpboTextUploadModal = function() {
    if(!isAdmin) return;
    syncUpboDomToState(); 

    if(!upboData[upboCurrentMember]) upboData[upboCurrentMember] = {products:[], records:[]};
    const products = upboData[upboCurrentMember].products || [];

    document.getElementById('upboTextFile').value = '';
    const rulesContainer = document.getElementById('upboMappingRules');
    rulesContainer.innerHTML = '';
    
    addUpboMappingRule();

    setUpboUploadMode(products.length === 0 ? 'fixed' : 'mapping');

    document.getElementById('upboTextUploadModal').classList.replace('hidden', 'flex');
};

window.closeUpboTextUploadModal = function() {
    document.getElementById('upboTextUploadModal').classList.replace('flex', 'hidden');
};

window.addUpboMappingRule = function() {
    const products = upboData[upboCurrentMember]?.products || [];
    const rulesContainer = document.getElementById('upboMappingRules');
    
    const row = document.createElement('div');
    row.className = "flex gap-2 items-center mapping-rule-row mb-1";
    
    let selectHtml = `<select class="flex-1 border-2 border-[#5D4037] rounded p-1.5 text-sm outline-none font-bold mapping-product">`;
    products.forEach(p => {
        selectHtml += `<option value="${p}">${p}</option>`;
    });
    selectHtml += `</select>`;

    row.innerHTML = `
        <select class="w-[76px] shrink-0 border-2 border-[#5D4037] rounded p-1.5 text-xs outline-none font-bold mapping-type" onchange="window.handleUpboMappingTypeChange(this)">
            <option value="amount">수량</option>
            <option value="word">단어</option>
        </select>
        <input type="text" class="w-1/3 border-2 border-[#5D4037] rounded p-1.5 text-sm outline-none font-bold mapping-value" placeholder="수량(예:562)">
        <span class="font-bold text-gray-500 shrink-0">→</span>
        ${selectHtml}
        <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 p-1 font-bold shrink-0"><i class="fi fi-br-cross-small"></i></button>
    `;
    rulesContainer.appendChild(row);
};

window.handleUpboMappingTypeChange = function(selectEl) {
    const row = selectEl.closest('.mapping-rule-row');
    const valueInput = row.querySelector('.mapping-value');
    if (selectEl.value === 'word') {
        valueInput.type = 'text';
        valueInput.placeholder = '단어(예:셀카)';
    } else {
        valueInput.type = 'text'; 
        valueInput.placeholder = '수량(예:562)';
    }
};

function applyUpboMappingToRecords(records, rules) {
    let addedCount = 0;

    records.forEach(rec => {
        const donationVal = rec.donation; 
        const chatContent = rec.chat ?? rec.content ?? ''; 
        const contentLower = chatContent.toLowerCase();

        const matchedRules = rules.filter(rule => {
            if (rule.type === 'word') {
                return chatContent && contentLower.includes(rule.value.toLowerCase());
            }
            return donationVal === rule.value.replace(/,/g, '').trim();
        });

        if (matchedRules.length > 0) {
            const nickname = String(rec.nickname ?? '').trim() || String(rec.uid ?? '').trim();
            const uid = String(rec.uid ?? '').trim() || nickname;

            let record = upboData[upboCurrentMember].records.find(r => r.uid === uid);
            if (!record) {
                record = { nickname, uid, items: {}, status: '배송중', memo: '' };
                upboData[upboCurrentMember].records.push(record);
            }

            matchedRules.forEach(matchedRule => {
                const mappedProduct = matchedRule.product;
                
                if (matchedRule.type === 'word') {
                    const safeValue = matchedRule.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(safeValue + '\\s*[-:=]?\\s*([^,\\n]+)', 'i');
                    const match = chatContent.match(regex);
                    
                    let extractedText = match && match[1] ? match[1].trim() : chatContent;
                    
                    if (!extractedText) extractedText = chatContent;

                    if (!record.items[mappedProduct] || isNaN(record.items[mappedProduct])) {
                        if (record.items[mappedProduct] && !String(record.items[mappedProduct]).includes(extractedText)) {
                            record.items[mappedProduct] += `\n${extractedText}`;
                        } else {
                            record.items[mappedProduct] = extractedText;
                        }
                    } else {
                        record.items[mappedProduct] = extractedText;
                    }
                    addedCount++;
                } 
                else if (matchedRule.type === 'amount' && chatContent) {
                    if (!record.items[mappedProduct] || isNaN(record.items[mappedProduct])) {
                        if (record.items[mappedProduct] && !String(record.items[mappedProduct]).includes(chatContent)) {
                            record.items[mappedProduct] += `\n${chatContent}`;
                        } else {
                            record.items[mappedProduct] = chatContent;
                        }
                    } else {
                        record.items[mappedProduct] = chatContent;
                    }
                    addedCount++;
                } 
                else {
                    if (!record.items[mappedProduct] || isNaN(record.items[mappedProduct])) {
                        record.items[mappedProduct] = 0;
                    }
                    record.items[mappedProduct] += 1;
                    addedCount++;
                }
            });
        }
    });

    return addedCount;
}

function applyUpboFixedFormatToRecords(records) {
    if(!upboData[upboCurrentMember]) upboData[upboCurrentMember] = {products:[], records:[]};
    const products = upboData[upboCurrentMember].products;

    if (!products.includes('의상')) products.push('의상');
    if (!products.includes('헤어')) products.push('헤어');

    let addedCount = 0;

    records.forEach(rec => {
        const raw = String(rec.chat ?? rec.content ?? '').trim();
        if (!raw) return;

        const lines = raw.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) return;

        let category = '';
        let itemLines = [];

        if (!lines[0].includes('/')) {
            category = lines[0];
            itemLines = lines.slice(1);
        } else {
            const firstParts = lines[0].split('/').map(p => p.trim());
            category = firstParts[0] || '';
            if (firstParts.length > 1) itemLines.push(firstParts.slice(1).join('/'));
            itemLines = itemLines.concat(lines.slice(1));
        }

        if (!category && itemLines.length === 0) return;

        const costumeList = [];
        const hairList = [];
        const requestList = [];

        itemLines.forEach(line => {
            const p = line.split('/').map(v => v.trim());
            const costumeNo = p[0] || '';
            const hairNo = p[1] || '';
            const request = p.slice(2).join('/').trim();
            if (costumeNo) costumeList.push(costumeNo);
            if (hairNo) hairList.push(hairNo);
            if (request) requestList.push(request);
        });

        const nickname = String(rec.nickname ?? '').trim() || String(rec.uid ?? '').trim();
        const uid = String(rec.uid ?? '').trim() || nickname;
        if (!nickname && !uid) return;

        let record = upboData[upboCurrentMember].records.find(r => r.uid === uid);
        if (!record) {
            record = { nickname, uid, category: '', items: {}, roulette: '', status: '배송중', memo: '' };
            upboData[upboCurrentMember].records.push(record);
        }

        if (category) record.category = category;

        if (costumeList.length > 0) {
            const existing = record.items['의상'] ? String(record.items['의상']).split('\n').filter(Boolean) : [];
            record.items['의상'] = existing.concat(costumeList).join('\n');
        }
        if (hairList.length > 0) {
            const existing = record.items['헤어'] ? String(record.items['헤어']).split('\n').filter(Boolean) : [];
            record.items['헤어'] = existing.concat(hairList).join('\n');
        }
        if (requestList.length > 0) {
            const newMemo = requestList.join('\n');
            record.memo = record.memo ? `${record.memo}\n${newMemo}` : newMemo;
        }

        addedCount++;
    });

    return addedCount;
}

function parseLinesToRecords(lines) {
    const regex = /\[.*?\]\s+(.*?)\(([a-zA-Z0-9_-]+)\):\s*(.+)/;
    const records = [];

    lines.forEach(rawLine => {
        const line = rawLine.replace(/\r$/, ''); 
        const match = line.match(regex);
        if (!match) return;
        records.push({ nickname: match[1].trim(), uid: match[2].trim(), content: match[3].trim() });
    });

    return records;
}

function applyUpboMappingToLines(lines, rules) {
    return applyUpboMappingToRecords(parseLinesToRecords(lines), rules);
}

function finishUpboFileProcessing(addedCount) {
    if (addedCount > 0) {
        alert(`총 ${addedCount}건의 항목이 매핑되어 추가/반영되었습니다.`);
        renderUpboAdminTable(); 
        closeUpboTextUploadModal(); 
    } else {
        alert("입력하신 규칙에 맞는 데이터가 파일에 없거나 형식이 다릅니다.");
    }
}

function findUpboColumnIndex(headerRow, candidates) {
    for (let i = 0; i < headerRow.length; i++) {
        const h = String(headerRow[i] ?? '').toLowerCase().replace(/\s/g, '');
        if (!h) continue;
        if (candidates.some(c => h.includes(c.toLowerCase().replace(/\s/g, '')))) {
            return i;
        }
    }
    return -1;
}

function excelWorkbookToRecords(workbook) {
    const nicknameCandidates = ['닉네임', '별명', '이름', '작성자', '유저명', '회원명', 'nickname', 'name'];
    const uidCandidates = ['아이디', '유저아이디', '회원아이디', 'userid', 'uid', 'id'];
    const donationCandidates = ['후원', '구독', '후원,구독', '금액'];
    const contentCandidates = ['채팅', '댓글내용', '댓글', '내용', '메시지'];

    let records = [];

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        if (!rows || rows.length < 2) return;

        const headerRow = rows[0];
        const nicknameIdx = findUpboColumnIndex(headerRow, nicknameCandidates);
        const uidIdx = findUpboColumnIndex(headerRow, uidCandidates);
        const donationIdx = findUpboColumnIndex(headerRow, donationCandidates);

        const contentIndices = [];
        for (let i = 0; i < headerRow.length; i++) {
            const h = String(headerRow[i] ?? '').toLowerCase().replace(/\s/g, '');
            if (contentCandidates.some(c => h.includes(c.toLowerCase()))) {
                contentIndices.push(i);
            }
        }

        if (donationIdx === -1 && contentIndices.length === 0) return;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            const donation = donationIdx !== -1 ? String(row[donationIdx] ?? '').trim().replace(/,/g, '') : '';
            
            const contents = contentIndices.map(idx => String(row[idx] ?? '').trim()).filter(val => val !== '');
            const chat = contents.join('\n');

            if (!donation && !chat) continue;

            const nickname = nicknameIdx !== -1 ? String(row[nicknameIdx] ?? '').trim() : '';
            const uid = uidIdx !== -1 ? String(row[uidIdx] ?? '').trim() : '';

            records.push({
                nickname: nickname || uid || `${i}번째 줄`,
                uid: uid || nickname || `row_${sheetName}_${i}`,
                donation: donation,
                chat: chat,
                content: chat 
            });
        }
    });

    return records;
}

window.processUpboTextFile = async function() {
    const fileInput = document.getElementById('upboTextFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("파일을 선택해주세요.");
        return;
    }

    const mode = window.upboUploadMode || 'mapping';
    let rules = [];

    if (mode === 'mapping') {
        const ruleRows = document.querySelectorAll('.mapping-rule-row');
        let hasValidRule = false;
        ruleRows.forEach(row => {
            const type = row.querySelector('.mapping-type')?.value || 'amount';
            const value = row.querySelector('.mapping-value').value.trim();
            const product = row.querySelector('.mapping-product').value;
            if (value && product) {
                rules.push({ type, value, product });
                hasValidRule = true;
            }
        });

        if (!hasValidRule) {
            alert("최소 하나 이상의 매핑 규칙을 완성해주세요.");
            return;
        }
    }

    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv');

    const applyRecords = (records) => {
        return mode === 'fixed'
            ? applyUpboFixedFormatToRecords(records)
            : applyUpboMappingToRecords(records, rules);
    };

    if (isExcel || isCsv) {
        if (typeof XLSX === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        }
        if (typeof XLSX === 'undefined') {
            alert("엑셀/CSV 파일을 처리할 라이브러리를 불러오지 못했습니다.\n인터넷 연결을 확인 후 다시 시도해주세요.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const workbook = isCsv
                    ? XLSX.read(e.target.result, { type: 'string' })
                    : XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const records = excelWorkbookToRecords(workbook);
                if (records.length === 0) {
                    alert("파일에서 '닉네임/아이디/댓글내용'에 해당하는 열을 찾지 못했습니다.\n첫 번째 행에 열 제목(예: 닉네임, 아이디, 댓글내용)이 있는지 확인해주세요.");
                    return;
                }
                const addedCount = applyRecords(records);
                finishUpboFileProcessing(addedCount);
            } catch (err) {
                console.error(err);
                alert("파일을 읽는 중 오류가 발생했습니다.\n파일 형식을 확인해주세요.");
            }
        };
        if (isCsv) reader.readAsText(file, 'utf-8');
        else reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const lines = text.split('\n');
            const records = parseLinesToRecords(lines);
            const addedCount = applyRecords(records);
            finishUpboFileProcessing(addedCount);
        };
        reader.readAsText(file);
    }
};

window.toggleAllUpboCheckboxes = function(isChecked) {
    const checkboxes = document.querySelectorAll('.upbo-row-checkbox');
    checkboxes.forEach(cb => cb.checked = isChecked);
};

window.deleteSelectedUpboRows = function() {
    const checkboxes = document.querySelectorAll('.upbo-row-checkbox:checked');
    if(checkboxes.length === 0) return alert('삭제할 항목을 먼저 선택해주세요.');
    if(!confirm(`선택한 ${checkboxes.length}개 항목을 삭제하시겠습니까?`)) return;
    
    checkboxes.forEach(cb => {
        cb.closest('tr').remove();
    });
    
    syncUpboDomToState();
    renderUpboAdminTable();
};

window.changeStatusSelectedUpboRows = function() {
    const checkboxes = document.querySelectorAll('.upbo-row-checkbox:checked');
    if(checkboxes.length === 0) return alert('상태를 변경할 항목을 먼저 선택해주세요.');
    
    const newStatus = document.getElementById('batchStatusSelect').value;
    if(!confirm(`선택한 ${checkboxes.length}개 항목을 '${newStatus}' 상태로 일괄 변경하시겠습니까?`)) return;
    
    checkboxes.forEach(cb => {
        const tr = cb.closest('tr');
        const statusBtn = tr.querySelector('.upbo-status');
        if(statusBtn) {
            statusBtn.value = newStatus;
            statusBtn.className = newStatus === '배송완료' 
                ? 'w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status bg-green-100 text-green-700' 
                : 'w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status bg-purple-100 text-purple-700';
        }
    });
    
    syncUpboDomToState();
};

window.processRouletteFile = async function(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');

    // 엑셀 모듈 로드 대기
    if (typeof XLSX === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    }
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const workbook = isCsv
                ? XLSX.read(e.target.result, { type: 'string' })
                : XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
            
            if (rows.length < 2) {
                alert("데이터가 없습니다.");
                return;
            }

            const headerRow = rows[0];
            let addedCount = 0;
            
            syncUpboDomToState(); 
            
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const nameCell = String(row[0] || '').trim();
                if (!nameCell) continue;
                
                let nickname = nameCell;
                let uid = '';
                
                if (nameCell.includes('\n')) {
                    const parts = nameCell.split('\n');
                    nickname = parts[0].trim();
                    uid = parts[1].replace(/[()]/g, '').trim(); 
                } 
                else if (nameCell.includes('(') && nameCell.includes(')')) {
                    const match = nameCell.match(/^(.*?)\((.*?)\)$/);
                    if (match) {
                        nickname = match[1].trim();
                        uid = match[2].trim();
                    }
                }
                if(!uid) uid = nickname;
                
                let wonItems = [];
                for (let col = 1; col < headerRow.length; col++) {
                    const val = String(row[col] || '').trim();
                    if (val && val !== '0') {
                        wonItems.push({
                            name: String(headerRow[col] || '').trim(),
                            val: val
                        });
                    }
                }
                
                if (wonItems.length > 0) {
                    let record = upboData[upboCurrentMember].records.find(r => r.uid === uid || r.nickname === nickname);
                    if (!record) {
                        record = { nickname, uid, items: {}, roulette: '', status: '배송중', memo: '' };
                        upboData[upboCurrentMember].records.push(record);
                    }
                    
                    let tally = {};
                    if (record.roulette) {
                        const lines = record.roulette.replace(/<br>/g, '\n').split('\n');
                        lines.forEach(line => {
                            line = line.trim();
                            if (!line) return;
                            const match = line.match(/^(.*?)(?:\*(\d+))?$/);
                            if (match) {
                                const itemName = match[1].trim();
                                const count = match[2] ? parseInt(match[2], 10) : 1;
                                tally[itemName] = (tally[itemName] || 0) + count;
                            }
                        });
                    }

                    wonItems.forEach(item => {
                        const itemName = item.name;
                        const cellValue = parseInt(item.val, 10);
                        const addCount = (!isNaN(cellValue) && cellValue > 0) ? cellValue : 1; 
                        
                        tally[itemName] = (tally[itemName] || 0) + addCount;
                    });

                    let newRouletteArr = [];
                    for (const [itemName, count] of Object.entries(tally)) {
                        if (count > 1) {
                            newRouletteArr.push(`${itemName}*${count}`);
                        } else {
                            newRouletteArr.push(itemName);
                        }
                    }
                    
                    record.roulette = newRouletteArr.join('\n');
                    addedCount++;
                }
            }
            
            if (addedCount > 0) {
                alert(`총 ${addedCount}명의 룰렛 결과가 추가되었습니다.`);
                renderUpboAdminTable();
            } else {
                alert("반영할 룰렛 데이터가 없거나 형식이 맞지 않습니다.");
            }
            
        } catch (err) {
            console.error(err);
            alert("파일을 읽는 중 오류가 발생했습니다. (엑셀/CSV 파일인지 확인해 주세요)");
        }
        
        input.value = '';
    };
    
    if (isCsv) reader.readAsText(file, 'utf-8');
    else reader.readAsArrayBuffer(file);
};

// =========================================================================
// 클립 탐색기 (SOOP 통합 검색 API 연동)
// =========================================================================
let currentClipStreamer = '최또';
let currentClipPage = 1;          
let currentClipCursor = null;
let currentClipLoadedCount = 0;
let isClipLoading = false;        
let currentClipRequestId = 0;
let clipAbortController = null;
let clipInfiniteObserver = null;
const watchedClipStorageKey = 'signal_watched_clip_urls';
let watchedClipUrls = null;

function getWatchedClipUrls() {
    if (watchedClipUrls) return watchedClipUrls;
    try {
        watchedClipUrls = new Set(JSON.parse(localStorage.getItem(watchedClipStorageKey) || '[]'));
    } catch (e) {
        watchedClipUrls = new Set();
    }
    return watchedClipUrls;
}

function isClipWatched(clipUrl) {
    return getWatchedClipUrls().has(clipUrl);
}

window.markClipWatched = function(card) {
    const clipUrl = card?.dataset?.clipUrl;
    if (!clipUrl) return;

    const watched = getWatchedClipUrls();
    watched.add(clipUrl);
    // 저장 용량이 불필요하게 커지지 않도록 최근 시청 기록 500개만 유지한다.
    const recentWatched = Array.from(watched).slice(-500);
    watchedClipUrls = new Set(recentWatched);
    try {
        localStorage.setItem(watchedClipStorageKey, JSON.stringify(recentWatched));
    } catch (e) {
        // 저장 공간을 사용할 수 없는 환경에서도 현재 화면의 표시 상태는 유지한다.
    }
    card.classList.add('is-watched');
};

window.setupClipInfiniteScroll = function() {
    if (clipInfiniteObserver) clipInfiniteObserver.disconnect();

    const sentinel = document.getElementById('clipInfiniteSentinel');
    const loadingStatus = document.getElementById('clipInfiniteLoading');
    if (!sentinel || !currentClipCursor) {
        if (loadingStatus) loadingStatus.classList.add('hidden');
        return;
    }

    clipInfiniteObserver = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting || isClipLoading) return;
        clipInfiniteObserver.unobserve(sentinel);
        if (loadingStatus) loadingStatus.classList.remove('hidden');
        window.fetchStreamerClips(currentClipStreamer, true);
    }, { rootMargin: '500px 0px' });
    clipInfiniteObserver.observe(sentinel);
};

window.closeClipPreview = function() {
    const modal = document.getElementById('clipPreviewModal');
    if (!modal) return;
    document.removeEventListener('keydown', modal.closeOnEscape);
    modal.remove();
};

window.openClipPreview = function(event, clipUrl, clipTitle) {
    event.preventDefault();
    event.stopPropagation();
    window.closeClipPreview();

    const modal = document.createElement('div');
    modal.id = 'clipPreviewModal';
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 md:p-8 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl" role="dialog" aria-modal="true" aria-label="클립 미리보기">
            <button type="button" class="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-2xl font-bold text-white transition hover:bg-black/90" aria-label="미리보기 닫기">×</button>
            <div class="aspect-video w-full bg-black">
                <iframe class="h-full w-full border-0" title="클립 미리보기" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="flex items-center justify-between gap-3 bg-white px-4 py-3 md:px-5">
                <p class="min-w-0 truncate text-sm font-bold text-gray-800"></p>
                <a class="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700" target="_blank" rel="noopener">새 창으로 열기</a>
            </div>
        </div>`;

    const iframe = modal.querySelector('iframe');
    const title = modal.querySelector('p');
    const openLink = modal.querySelector('a');
    iframe.src = clipUrl;
    title.textContent = clipTitle || '클립 미리보기';
    openLink.href = clipUrl;
    modal.querySelector('button').onclick = window.closeClipPreview;
    modal.onclick = e => { if (e.target === modal) window.closeClipPreview(); };
    modal.closeOnEscape = e => { if (e.key === 'Escape') window.closeClipPreview(); };
    document.addEventListener('keydown', modal.closeOnEscape);
    document.body.appendChild(modal);
};

window.changeClipStreamerNative = function(streamerName) {
    if (clipInfiniteObserver) clipInfiniteObserver.disconnect();
    currentClipStreamer = streamerName;
    currentClipPage = 1; 
    currentClipCursor = null;
    currentClipLoadedCount = 0;
    
    document.querySelectorAll('.clip-streamer-btn').forEach(btn => {
        if (btn.dataset.id === streamerName) {
            btn.className = 'clip-streamer-btn bg-violet-600 text-white border-violet-600 px-5 py-2 rounded-lg font-bold text-[14px] border shadow-sm transition whitespace-nowrap shrink-0';
        } else {
            btn.className = 'clip-streamer-btn bg-white text-gray-700 border-gray-200 px-5 py-2 rounded-lg font-bold text-[14px] border hover:bg-gray-50 transition whitespace-nowrap shrink-0';
        }
    });

    window.fetchStreamerClips(streamerName, false);
};

window.fetchStreamerClips = async function(streamerName, isLoadMore = false) {
    const container = document.getElementById('clipGridContainer');
    const loadMoreBtn = document.getElementById('clipLoadMoreBtn');
    
    if (!container || (isLoadMore && isClipLoading)) return;

    // 탐색기 재진입·탭 전환 시 진행 중이던 이전 요청을 취소하고, 새 목록을 즉시 요청한다.
    const requestId = isLoadMore ? currentClipRequestId : ++currentClipRequestId;
    if (!isLoadMore) {
        if (clipAbortController) clipAbortController.abort();
        clipAbortController = new AbortController();
    }
    const requestSignal = clipAbortController?.signal;
    
    isClipLoading = true;

    if (isLoadMore) {
        currentClipPage++;
        if (loadMoreBtn) loadMoreBtn.innerText = '불러오는 중...⏳';
    } else {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 font-bold py-16 text-[16px]">영상을 불러오는 중입니다...⏳</div>`;
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    }
    
    try {
        // Vercel Serverless Function을 통해 VOD Finder 검색 API를 호출한다.
        // 커서 기반 API와 페이지 기반 API 모두에서 다음 목록을 정확히 요청한다.
        let targetUrl = `/api/clip?streamer=${encodeURIComponent(streamerName)}&page=${currentClipPage}`;
        if (isLoadMore && currentClipCursor) {
            targetUrl += `&cursor=${encodeURIComponent(currentClipCursor)}`;
        }

        const res = await fetch(targetUrl, { signal: requestSignal });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const json = await res.json();
        if (requestId !== currentClipRequestId) return;
        
        let rawClips = [];
        if (Array.isArray(json)) rawClips = json;
        else if (Array.isArray(json.items)) rawClips = json.items;
        else if (json.data && Array.isArray(json.data)) rawClips = json.data;
        else if (json.data && json.data.vod && Array.isArray(json.data.vod)) rawClips = json.data.vod;
        else if (json.data && json.data.vod && Array.isArray(json.data.vod.list)) rawClips = json.data.vod.list;
        else if (json.data && json.data.vod && Array.isArray(json.data.vod.items)) rawClips = json.data.vod.items;
        else if (json.DATA && Array.isArray(json.DATA)) rawClips = json.DATA;
        else if (json.list && Array.isArray(json.list)) rawClips = json.list;
        else if (json.vod && Array.isArray(json.vod)) rawClips = json.vod;
        else if (json.vod && Array.isArray(json.vod.list)) rawClips = json.vod.list;
        else if (json.vod && Array.isArray(json.vod.items)) rawClips = json.vod.items;

        currentClipCursor = json.nextCursor
            || json.next_cursor
            || json.cursor?.next
            || json.pagination?.nextCursor
            || json.pagination?.next_cursor
            || json.data?.nextCursor
            || json.data?.next_cursor
            || null;

        // 통합검색에 표시되는 VOD를 그대로 보여준다. 기존의 "본인 VOD 제외" 필터를
        // 적용하면 검색 결과가 전부 사라질 수 있다.
        const clips = rawClips;
        currentClipLoadedCount = isLoadMore ? currentClipLoadedCount + clips.length : clips.length;
        const resultCount = document.getElementById('clipResultCount');
        if (resultCount) resultCount.textContent = `${currentClipLoadedCount.toLocaleString('ko-KR')}개 표시 중`;

        if (!isLoadMore && clips.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center text-gray-400 font-bold py-16 text-[16px]">검색된 VOD가 없습니다.</div>`;
            isClipLoading = false;
            return;
        }
        // 빈 다음 페이지는 더 이상 자동 요청하지 않는다.
        if (isLoadMore && clips.length === 0) currentClipCursor = null;

        let html = '';
        clips.forEach(clip => {
            const title = clip.title || clip.title_name || clip.vod_title || clip.title_nm || '제목 없음';
            
            let thumb = clip.thumbnailUrl || clip.thumb || clip.thumbnail || clip.szThumb || clip.ucThumb || clip.file_path || clip.thumb_url || clip.thumbnail_url || 'https://via.placeholder.com/320x180';
            if (thumb.startsWith('//')) {
                thumb = 'https:' + thumb;
            }
            // VOD Finder 응답의 일부 썸네일은 http로 내려와 HTTPS 사이트에서 차단될 수 있다.
            if (thumb.startsWith('http://videoimg.sooplive.com/')) {
                thumb = thumb.replace('http://', 'https://');
            }
            
            const titleNo = clip.titleNo || clip.title_no || clip.vod_bno || clip.nTitleNo || clip.bno || clip.id;
            const link = clip.url || clip.link_url || clip.vod_url || (titleNo ? `https://vod.sooplive.com/player/${titleNo}` : '#');
            
            let dateStr = clip.regDate || clip.reg_date || clip.szRegDate || clip.createdAt || clip.regdate || '';
            if (dateStr) {
                dateStr = dateStr.substring(0, 10).replace(/-/g, '.');
            }
            
            let durationHtml = '';
            const durationValue = parseInt(clip.durationMs || clip.duration || clip.nTotalTime || clip.total_time || clip.play_time, 10);
            const totalSeconds = clip.durationMs ? Math.floor(durationValue / 1000) : durationValue;
            if (!isNaN(totalSeconds) && totalSeconds > 0) {
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;
                const timeText = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
                durationHtml = `<div class="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm">${timeText}</div>`;
            }

            const type = String(clip.type || 'VOD').toUpperCase();
            const typeLabel = type === 'CLIP' ? '클립' : type === 'CATCH' ? '캐치' : '다시보기';
            const typeClass = type === 'CLIP' ? 'bg-violet-100 text-violet-700' : type === 'CATCH' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700';
            const stationName = escapeHtml(clip.stationNick || clip.originalStationNick || clip.bjId || 'SOOP');
            const viewCount = Number(clip.viewCount);
            const viewText = Number.isFinite(viewCount) ? `조회 ${viewCount.toLocaleString('ko-KR')}` : '';

            html += `
                <div class="clip-card ${isClipWatched(link) ? 'is-watched' : ''} rounded-xl overflow-hidden bg-white border border-gray-200 cursor-pointer hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg transition-all relative group flex flex-col shadow-sm" data-clip-url="${escapeHtml(link)}" data-clip-title="${escapeHtml(title)}" onclick="window.markClipWatched(this); openSmartLink('${link}')" oncontextmenu="window.markClipWatched(this); window.openClipPreview(event, this.dataset.clipUrl, this.dataset.clipTitle)">
                    <div class="w-full aspect-video overflow-hidden bg-gray-100 relative">
                        <img src="${thumb}" class="clip-thumbnail w-full h-full object-cover" alt="클립 썸네일" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/320x180'">
                        ${durationHtml}
                        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <i class="fi fi-rr-play text-white text-4xl drop-shadow-md"></i>
                        </div>
                    </div>
                    <div class="p-3.5 flex flex-col gap-2 flex-1">
                        <div class="flex items-center gap-1.5 text-[11px] font-bold">
                            <span class="px-1.5 py-0.5 rounded ${typeClass}">${typeLabel}</span>
                            <span class="text-gray-500 truncate">${stationName}</span>
                        </div>
                        <div class="text-[14px] font-bold text-gray-900 line-clamp-2 leading-snug">${escapeHtml(title)}</div>
                        <div class="text-[11px] text-gray-400 mt-auto pt-1 flex items-center gap-2">${dateStr ? `<span>${dateStr}</span>` : ''}${viewText ? `<span>${viewText}</span>` : ''}</div>
                    </div>
                </div>
            `;
        });

        if (isLoadMore) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }

    } catch (e) {
        if (e.name === 'AbortError') return;
        if (!isLoadMore) {
            container.innerHTML = `<div class="col-span-full text-center text-red-400 font-bold py-16 text-[15px]">데이터를 불러오지 못했습니다.<br>잠시 후 다시 시도해주세요.</div>`;
        } else {
            currentClipPage--; 
            currentClipCursor = null;
        }
    } finally {
        if (requestId === currentClipRequestId) {
            isClipLoading = false;
            clipAbortController = null;
            const loadingStatus = document.getElementById('clipInfiniteLoading');
            if (loadingStatus) loadingStatus.classList.add('hidden');
            window.setupClipInfiniteScroll();
        }
    }
};

window.renderClipPage = function() {
    const content = document.getElementById('mainContent');
    const isMobile = window.innerWidth <= 1050;
    // 탭에 들어올 때는 최또 검색 결과부터 바로 보여준다.
    if (clipInfiniteObserver) clipInfiniteObserver.disconnect();
    currentClipStreamer = '최또';
    currentClipPage = 1;
    currentClipCursor = null;
    currentClipLoadedCount = 0;
    
    let html = `
    <div class="big-white-box relative flex flex-col bg-[#fafafa]" style="min-height: 85vh; padding: ${isMobile ? '20px' : '40px'}; width: 100%; box-sizing: border-box;">
        <div class="mb-6 shrink-0 border-b border-gray-200 pb-5">
            <h2 class="text-[24px] lg:text-[27px] font-bold text-gray-900">클립 모아보기</h2>
        </div>
        
        <div class="flex gap-2 overflow-x-auto pb-5 hide-scrollbar shrink-0">
            <button class="clip-streamer-btn bg-violet-600 text-white border-violet-600 px-5 py-2 rounded-lg font-bold text-[14px] border shadow-sm transition whitespace-nowrap shrink-0" data-id="최또" onclick="window.changeClipStreamerNative('최또')">최또</button>
            <button class="clip-streamer-btn bg-white text-gray-700 border-gray-200 px-5 py-2 rounded-lg font-bold text-[14px] border hover:bg-gray-50 transition whitespace-nowrap shrink-0" data-id="달타" onclick="window.changeClipStreamerNative('달타')">달타</button>
            <button class="clip-streamer-btn bg-white text-gray-700 border-gray-200 px-5 py-2 rounded-lg font-bold text-[14px] border hover:bg-gray-50 transition whitespace-nowrap shrink-0" data-id="다룽" onclick="window.changeClipStreamerNative('다룽')">다룽</button>
            <button class="clip-streamer-btn bg-white text-gray-700 border-gray-200 px-5 py-2 rounded-lg font-bold text-[14px] border hover:bg-gray-50 transition whitespace-nowrap shrink-0" data-id="카나시" onclick="window.changeClipStreamerNative('카나시')">카나시</button>
        </div>

        <div class="flex items-center justify-between mb-3">
            <h3 class="text-[15px] font-bold text-gray-900">탐색 결과</h3>
            <span id="clipResultCount" class="text-[12px] font-medium text-gray-500">검색 중…</span>
        </div>
        
        <div id="clipGridContainer" class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        </div>
        
        <div class="w-full py-8 text-center">
            <span id="clipInfiniteLoading" class="hidden text-[13px] font-bold text-gray-400">클립을 더 불러오는 중…</span>
            <div id="clipInfiniteSentinel" class="h-px w-full"></div>
        </div>
    </div>`;
    
    content.innerHTML = html;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-[1795px] max-w-full lg:mx-auto pb-6';

    window.fetchStreamerClips(currentClipStreamer, false);
};

// 전역 함수 바인딩 추가
window.openUpdateModal = openUpdateModal;
window.closeUpdateModal = closeUpdateModal;
window.addUpdateLog = addUpdateLog;
window.deleteUpdateLog = deleteUpdateLog;
window.startEditUpdateLog = startEditUpdateLog;
window.cancelEditUpdateLog = cancelEditUpdateLog;
window.captureUpdateLogScreenshot = captureUpdateLogScreenshot;
window.switchUpdateImgTab = switchUpdateImgTab;
window.previewUpdateImageFile = previewUpdateImageFile;
window.addUpdateImageUrl = addUpdateImageUrl;
window.addUpdateTextBlock = addUpdateTextBlock;
window.updateUpdateBlockText = updateUpdateBlockText;
window.moveUpdateBlock = moveUpdateBlock;
window.removeUpdateBlock = removeUpdateBlock;
window.renderUpdateComposerPreview = renderUpdateComposerPreview;

let updateLogsList = [];
let editingUpdateLogId = null; // 수정 중인 업데이트 내역의 id (null이면 신규 등록 모드)

async function loadUpdateLogsFromFirebase() {
    try {
        const snap = await getDocs(query(collection(db, 'updates'), orderBy('timestamp', 'desc')));
        updateLogsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        checkUpdateBadge();
    } catch(e) { console.error('업데이트 로드 에러:', e); }
}

function checkUpdateBadge() {
    const desktopBadge = document.getElementById('desktopLogoNewBadge');
    const mobileBadge = document.getElementById('mobileLogoNewBadge');

    if (updateLogsList.length === 0) {
        if (desktopBadge) desktopBadge.classList.add('hidden');
        if (mobileBadge) mobileBadge.classList.add('hidden');
        return;
    }

    const newestLog = updateLogsList[0];
    const lastSeenTs = Number(localStorage.getItem('lastSeenUpdateTs') || '0');
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    // 작성 후 48시간 이내 && 클릭(확인) 전일 때만 NEW 뱃지 표시
    if (newestLog.timestamp > lastSeenTs && (now - newestLog.timestamp) < twoDaysMs) {
        if (desktopBadge) desktopBadge.classList.remove('hidden');
        if (mobileBadge) mobileBadge.classList.remove('hidden');
    } else {
        if (desktopBadge) desktopBadge.classList.add('hidden');
        if (mobileBadge) mobileBadge.classList.add('hidden');
    }
}

function openUpdateModal() {
        if (updateLogsList.length > 0) {
            localStorage.setItem('lastSeenUpdateTs', Date.now().toString());
            checkUpdateBadge();
        }
        
        const container = document.getElementById('updateListContainer');
        if (updateLogsList.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-400 font-bold py-16 text-[15px]">업데이트 내역이 없습니다.</div>`;
        } else {
            container.innerHTML = updateLogsList.map(log => {
                // 버튼 이름이 비어있으면 '자세히 보기'로 설정
                const displayBtnText = log.btnText ? escapeHtml(log.btnText) : '자세히 보기';
                return `
                <div id="updateLogCard_${log.id}" class="bg-white border-2 border-[#ECEDFA] p-5 rounded-xl shadow-sm mb-1 relative">
                    ${isAdmin ? `<button onclick="captureUpdateLogScreenshot('${log.id}')" class="update-screenshot-btn absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg text-gray-400 hover:text-[#5D4037] hover:border-[#5D4037] shadow-sm transition z-10" title="스크린샷으로 저장"><i class="fi fi-rr-camera"></i></button>` : ''}
                    <div class="text-[12.5px] text-[#FF5252] font-bold mb-1.5 ${isAdmin ? 'pr-10' : ''}">${log.date}</div>
                    <div class="font-bold text-[18px] text-[#5D4037] mb-2 leading-snug ${isAdmin ? 'pr-10' : ''}">${escapeHtml(log.title)}</div>
                    ${(() => {
                        // 글/이미지를 등록한 순서 그대로 보여줌 (blocks가 있는 신규 데이터)
                        if (log.blocks && log.blocks.length > 0) {
                            return `<div class="flex flex-col gap-3 mb-3">${log.blocks.map(b => {
                                if (b.type === 'image') return `<img src="${b.content}" loading="lazy" decoding="async" class="w-full rounded-xl border-2 border-gray-100">`;
                                return `<div class="text-[15px] font-medium text-gray-600 whitespace-pre-wrap leading-relaxed">${escapeHtml(b.content)}</div>`;
                            }).join('')}</div>`;
                        }
                        // 하위 호환: blocks가 없는 옛날 데이터는 기존처럼 이미지 → 텍스트 순으로 표시
                        const imgs = (log.images && log.images.length > 0) ? log.images : (log.image ? [log.image] : []);
                        const imgsHtml = imgs.length > 0 ? `<div class="flex flex-col gap-2 mb-3">${imgs.map(src => `<img src="${src}" loading="lazy" decoding="async" class="w-full rounded-xl border-2 border-gray-100">`).join('')}</div>` : '';
                        const contentHtml = log.content ? `<div class="text-[15px] font-medium text-gray-600 mb-4 whitespace-pre-wrap leading-relaxed">${escapeHtml(log.content)}</div>` : '';
                        return imgsHtml + contentHtml;
                    })()}
                    ${log.url ? `<button onclick="window.open('${log.url}', '_blank')" class="text-[14px] bg-[#FFF5F5] border border-[#FFE0E0] text-[#FF5252] font-bold px-4 py-2.5 rounded-xl hover:bg-[#FFE0E0] transition shadow-sm w-full text-center block mt-2">${displayBtnText}</button>` : ''}
                </div>
       `}).join('');
    }
        document.getElementById('updateModal').classList.replace('hidden', 'flex');
}

function closeUpdateModal() {
    document.getElementById('updateModal').classList.replace('flex', 'hidden');
}

// 관리자가 업데이트 내역 게시글을 이미지(스크린샷)로 저장
async function captureUpdateLogScreenshot(id) {
    if (!isAdmin) return;
    const card = document.getElementById(`updateLogCard_${id}`);
    if (!card) return;
    if (typeof html2canvas === 'undefined') {
        alert('스크린샷 기능을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    const btn = card.querySelector('.update-screenshot-btn');
    if (btn) btn.style.visibility = 'hidden'; // 캡처 이미지에는 버튼 자체가 안 보이도록 숨김

    try {
        const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        const log = updateLogsList.find(l => l.id === id);
        const safeTitle = (log && log.title ? log.title : '업데이트내역').replace(/[\\/:*?"<>|]/g, '_');

        const link = document.createElement('a');
        link.download = `${safeTitle}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch(e) {
        console.error('스크린샷 저장 에러:', e);
        alert('스크린샷 저장에 실패했습니다.');
    } finally {
        if (btn) btn.style.visibility = 'visible';
    }
}

// 업데이트 등록 폼: 업데이트별 이미지 (링크 입력 또는 파일 업로드)
function switchUpdateImgTab(tab) {
    const urlSection = document.getElementById('updateImageUrlSection');
    const fileSection = document.getElementById('updateImageFileSection');
    const tabUrl = document.getElementById('updateImgTabUrl');
    const tabFile = document.getElementById('updateImgTabFile');
    if (!urlSection || !fileSection) return;
    if (tab === 'url') {
        urlSection.classList.remove('hidden');
        fileSection.classList.add('hidden');
        tabUrl.classList.add('bg-[#5D4037]', 'text-white');
        tabUrl.classList.remove('bg-white', 'text-[#5D4037]');
        tabFile.classList.add('bg-white', 'text-[#5D4037]');
        tabFile.classList.remove('bg-[#5D4037]', 'text-white');
    } else {
        urlSection.classList.add('hidden');
        fileSection.classList.remove('hidden');
        tabFile.classList.add('bg-[#5D4037]', 'text-white');
        tabFile.classList.remove('bg-white', 'text-[#5D4037]');
        tabUrl.classList.add('bg-white', 'text-[#5D4037]');
        tabUrl.classList.remove('bg-[#5D4037]', 'text-white');
    }
}

// 등록 폼에 임시로 담긴 "블록" 목록 (텍스트/이미지를 원하는 순서로 섞어서 등록 가능)
// 텍스트 블록: { type: 'text', content: string }
// 이미지 블록: { type: 'image', source: 'url'|'file', url?: string, file?: File, previewSrc: string }
let updateBlocksStaged = [];

function renderUpdateBlocksList() {
    const listEl = document.getElementById('updateBlocksList');
    if (!listEl) return;
    if (updateBlocksStaged.length === 0) {
        listEl.innerHTML = '';
        listEl.classList.add('hidden');
    } else {
        listEl.classList.remove('hidden');
        listEl.innerHTML = updateBlocksStaged.map((block, idx) => {
            const orderBadge = `<div class="w-6 h-6 rounded-full bg-[#5D4037] text-white text-[11px] font-bold flex items-center justify-center shrink-0">${idx + 1}</div>`;
            const moveBtns = `
                <div class="flex flex-col gap-1 shrink-0">
                    <button type="button" onclick="moveUpdateBlock(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="w-6 h-6 rounded bg-gray-100 text-gray-600 text-[11px] flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"><i class="fi fi-rr-angle-small-up"></i></button>
                    <button type="button" onclick="moveUpdateBlock(${idx}, 1)" ${idx === updateBlocksStaged.length - 1 ? 'disabled' : ''} class="w-6 h-6 rounded bg-gray-100 text-gray-600 text-[11px] flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"><i class="fi fi-rr-angle-small-down"></i></button>
                </div>`;
            if (block.type === 'text') {
                return `
                <div class="flex gap-2 items-start bg-white border-2 border-gray-200 rounded-lg p-2">
                    ${orderBadge}
                    ${moveBtns}
                    <div class="flex-1 min-w-0">
                        <div class="text-[10px] font-bold text-gray-400 mb-1">${idx + 1}번째 · 글</div>
                        <textarea oninput="updateUpdateBlockText(${idx}, this.value)" placeholder="내용을 입력하세요" class="w-full border-2 border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#5D4037] resize-y h-28 font-medium">${escapeHtml(block.content || '')}</textarea>
                    </div>
                    <button type="button" onclick="removeUpdateBlock(${idx})" class="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[11px] shrink-0 hover:bg-red-600 transition"><i class="fi fi-br-cross-small"></i></button>
                </div>`;
            }
            return `
                <div class="flex gap-2 items-center bg-white border-2 border-gray-200 rounded-lg p-2">
                    ${orderBadge}
                    ${moveBtns}
                    <div class="flex-1 min-w-0 flex items-center gap-2">
                        <div class="text-[10px] font-bold text-gray-400 shrink-0">${idx + 1}번째<br>이미지</div>
                        <img src="${block.previewSrc}" class="w-14 h-14 object-cover rounded-lg border-2 border-gray-200 shrink-0">
                    </div>
                    <button type="button" onclick="removeUpdateBlock(${idx})" class="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[11px] shrink-0 hover:bg-red-600 transition"><i class="fi fi-br-cross-small"></i></button>
                </div>`;
        }).join('');
    }
    renderUpdateComposerPreview();
}

// 등록 폼에 입력 중인 내용이 실제 게시글에서 어떻게 보일지 실시간으로 보여주는 미리보기
function renderUpdateComposerPreview() {
    const previewEl = document.getElementById('updateComposerPreview');
    if (!previewEl) return;

    const titleEl = document.getElementById('updateTitle');
    const urlEl = document.getElementById('updateUrl');
    const btnTextEl = document.getElementById('updateBtnText');
    const title = titleEl ? titleEl.value.trim() : '';
    const url = urlEl ? urlEl.value.trim() : '';
    const btnText = btnTextEl ? btnTextEl.value.trim() : '';
    const displayBtnText = btnText ? escapeHtml(btnText) : '자세히 보기';

    if (!title && updateBlocksStaged.length === 0) {
        previewEl.innerHTML = `<div class="text-center text-gray-400 font-bold py-10 text-[13px]">제목이나 내용을 입력하면<br>여기에 미리보기가 보여요</div>`;
        return;
    }

    const blocksHtml = updateBlocksStaged.map((b, idx) => {
        if (b.type === 'image') {
            return `<div class="relative"><img src="${b.previewSrc}" class="w-full rounded-xl border-2 border-gray-100"><div class="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">${idx + 1}</div></div>`;
        }
        if (!b.content || !b.content.trim()) return '';
        return `<div class="text-[14px] font-medium text-gray-600 whitespace-pre-wrap leading-relaxed">${escapeHtml(b.content)}</div>`;
    }).join('');

    previewEl.innerHTML = `
        <div class="bg-white border-2 border-[#ECEDFA] p-4 rounded-xl shadow-sm">
            <div class="text-[11px] text-[#FF5252] font-bold mb-1">${getTodayYYYYMMDD()}</div>
            <div class="font-bold text-[16px] text-[#5D4037] mb-2 leading-snug">${title ? escapeHtml(title) : '<span class="text-gray-300">(제목 없음)</span>'}</div>
            <div class="flex flex-col gap-3 mb-2">${blocksHtml}</div>
            ${url ? `<div class="text-[13px] bg-[#FFF5F5] border border-[#FFE0E0] text-[#FF5252] font-bold px-3 py-2 rounded-xl w-full text-center mt-2">${displayBtnText}</div>` : ''}
        </div>`;
}

function addUpdateTextBlock() {
    updateBlocksStaged.push({ type: 'text', content: '' });
    renderUpdateBlocksList();
}

function updateUpdateBlockText(idx, value) {
    if (!updateBlocksStaged[idx]) return;
    updateBlocksStaged[idx].content = value;
    renderUpdateComposerPreview();
}

function moveUpdateBlock(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= updateBlocksStaged.length) return;
    [updateBlocksStaged[idx], updateBlocksStaged[newIdx]] = [updateBlocksStaged[newIdx], updateBlocksStaged[idx]];
    renderUpdateBlocksList();
}

function removeUpdateBlock(idx) {
    updateBlocksStaged.splice(idx, 1);
    renderUpdateBlocksList();
}

function addUpdateImageUrl() {
    const input = document.getElementById('updateImageUrlText');
    if (!input) return;
    const url = input.value.trim();
    if (!url) return;
    updateBlocksStaged.push({ type: 'image', source: 'url', url, previewSrc: url });
    input.value = '';
    renderUpdateBlocksList();
}

function previewUpdateImageFile(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            updateBlocksStaged.push({ type: 'image', source: 'file', file, previewSrc: e.target.result });
            renderUpdateBlocksList();
        };
        reader.readAsDataURL(file);
    });
    input.value = ''; // 같은 파일을 다시 선택할 수 있도록 초기화
}

// 업데이트 등록 폼을 초기 상태로 되돌린다 (등록 완료 후 호출)
function resetUpdateImageForm() {
    const urlInput = document.getElementById('updateImageUrlText');
    const fileInput = document.getElementById('updateImageFile');
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    updateBlocksStaged = [];
    renderUpdateBlocksList();
    switchUpdateImgTab('url');
}
// 등록된 업데이트 내역을 수정 모드로 불러와 등록 폼에 채워넣는다
function startEditUpdateLog(id) {
    if (!isAdmin) return;
    const log = updateLogsList.find(l => l.id === id);
    if (!log) return;

    editingUpdateLogId = id;

    document.getElementById('updateTitle').value = log.title || '';
    document.getElementById('updateUrl').value = log.url || '';
    document.getElementById('updateBtnText').value = log.btnText || '';

    // blocks가 있으면 그대로, 없는 옛날 데이터는 이미지 → 글 순서로 변환해서 불러옴
    const sourceBlocks = (log.blocks && log.blocks.length > 0)
        ? log.blocks
        : (() => {
            const imgs = (log.images && log.images.length > 0) ? log.images : (log.image ? [log.image] : []);
            const arr = imgs.map(src => ({ type: 'image', content: src }));
            if (log.content) arr.push({ type: 'text', content: log.content });
            return arr;
        })();

    updateBlocksStaged = sourceBlocks.map(b => b.type === 'image'
        ? { type: 'image', source: 'url', url: b.content, previewSrc: b.content }
        : { type: 'text', content: b.content });

    switchUpdateImgTab('url');
    renderUpdateBlocksList();
    renderUpdateComposerPreview();

    const submitBtn = document.getElementById('updateSubmitBtn');
    if (submitBtn) submitBtn.innerText = '수정 완료';
    const cancelBtn = document.getElementById('updateEditCancelBtn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    const formTitle = document.getElementById('updateFormSectionTitle');
    if (formTitle) formTitle.innerText = '업데이트 내역 수정';

    const titleInput = document.getElementById('updateTitle');
    if (titleInput) titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 수정 모드를 취소하고 등록 폼을 초기 상태로 되돌린다
function cancelEditUpdateLog() {
    editingUpdateLogId = null;
    document.getElementById('updateTitle').value = '';
    document.getElementById('updateUrl').value = '';
    document.getElementById('updateBtnText').value = '';
    resetUpdateImageForm();

    const submitBtn = document.getElementById('updateSubmitBtn');
    if (submitBtn) submitBtn.innerText = '등록하기';
    const cancelBtn = document.getElementById('updateEditCancelBtn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    const formTitle = document.getElementById('updateFormSectionTitle');
    if (formTitle) formTitle.innerText = '업데이트 내역 등록';
}

async function addUpdateLog() {
        const title = document.getElementById('updateTitle').value.trim();
        const url = document.getElementById('updateUrl').value.trim();
        const btnText = document.getElementById('updateBtnText').value.trim(); // 버튼명 추가
        const isEditing = !!editingUpdateLogId;
        const existingLog = isEditing ? updateLogsList.find(l => l.id === editingUpdateLogId) : null;
        // 수정일 때는 원래 등록일을 유지, 신규 등록일 때만 오늘 날짜 사용
        const date = (isEditing && existingLog) ? existingLog.date : getTodayYYYYMMDD();
        
        if (!title) return alert('업데이트 제목을 입력하세요.');

        // 빈 텍스트 블록은 제외하고 등록
        const rawBlocks = updateBlocksStaged.filter(b => b.type !== 'text' || (b.content && b.content.trim()));
        let toast = null;
        
        try {
            const fileImages = rawBlocks.filter(b => b.type === 'image' && b.source === 'file');
            let uploadedUrls = [];

            if (fileImages.length > 0) {
                toast = document.createElement('div');
                toast.innerText = '이미지를 업로드 중 입니다..⏳';
                toast.className = 'fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-[#5D4037] text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] font-bold font-paperozi transition-opacity duration-300 opacity-0';
                document.body.appendChild(toast);
                requestAnimationFrame(() => toast.classList.remove('opacity-0'));

                uploadedUrls = await Promise.all(fileImages.map(img => window.uploadImageToCloudinary(img.file)));

                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 300);
                toast = null;
            }

            // 등록 순서(글/이미지 배치 순서)를 그대로 보존해서 blocks 배열로 저장
            let fi = 0;
            const blocks = rawBlocks.map(b => {
                if (b.type === 'text') return { type: 'text', content: b.content.trim() };
                const imgUrl = b.source === 'file' ? uploadedUrls[fi++] : b.url;
                return { type: 'image', content: imgUrl };
            }).filter(b => b.type !== 'image' || b.content);

            const images = blocks.filter(b => b.type === 'image').map(b => b.content);
            const content = blocks.filter(b => b.type === 'text').map(b => b.content).join('\n\n');

            if (isEditing) {
                // content/images/image 필드는 하위 호환용 (기존 데이터나 코드가 참조할 수 있어 함께 채워둠)
                const updatedFields = { title, blocks, content, url, btnText, images, image: images[0] || '' };
                await updateDoc(doc(db, 'updates', editingUpdateLogId), updatedFields);
                const idx = updateLogsList.findIndex(l => l.id === editingUpdateLogId);
                if (idx !== -1) updateLogsList[idx] = { ...updateLogsList[idx], ...updatedFields };
            } else {
                const newLog = { title, blocks, content, url, btnText, images, image: images[0] || '', date, timestamp: Date.now() };
                const docRef = await addDoc(collection(db, 'updates'), newLog);
                updateLogsList.unshift({ id: docRef.id, ...newLog });
            }

            const wasEditing = isEditing;
            editingUpdateLogId = null;

            document.getElementById('updateTitle').value = '';
            document.getElementById('updateUrl').value = '';
            document.getElementById('updateBtnText').value = ''; // 초기화
            resetUpdateImageForm();

            const submitBtn = document.getElementById('updateSubmitBtn');
            if (submitBtn) submitBtn.innerText = '등록하기';
            const cancelBtn = document.getElementById('updateEditCancelBtn');
            if (cancelBtn) cancelBtn.classList.add('hidden');
            const formTitle = document.getElementById('updateFormSectionTitle');
            if (formTitle) formTitle.innerText = '업데이트 내역 등록';
            
            alert(wasEditing ? '업데이트 내역이 수정되었습니다.' : '업데이트 내역이 등록되었습니다.');
            renderUpdateManagePanel();
            checkUpdateBadge();
        } catch(e) {
            console.error(e);
            if (toast) toast.remove();
        }
    }

async function deleteUpdateLog(id) {
    if(!confirm('이 업데이트 내역을 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'updates', id));
        updateLogsList = updateLogsList.filter(log => log.id !== id);
        renderUpdateManagePanel();
        checkUpdateBadge();
    } catch(e) { console.error(e); }
}

function renderUpdateManagePanel() {
        if (!isAdmin || !loggedInUser) return;
        const container = document.getElementById('updateManageContainer');
        if (!container) return;
        
        if (updateLogsList.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-400 font-bold py-6 text-[13px]">등록된 업데이트 내역이 없습니다.</div>`;
            return;
        }
        
        container.innerHTML = updateLogsList.map(log => {
            const displayBtnText = log.btnText ? escapeHtml(log.btnText) : '자세히 보기';
            return `
            <div class="bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm flex gap-3">
                ${(() => {
                    const imgs = (log.blocks && log.blocks.length > 0)
                        ? log.blocks.filter(b => b.type === 'image').map(b => b.content)
                        : ((log.images && log.images.length > 0) ? log.images : (log.image ? [log.image] : []));
                    if (imgs.length === 0) return '';
                    const shown = imgs.slice(0, 3);
                    const extra = imgs.length - shown.length;
                    return `<div class="flex gap-1 shrink-0">${shown.map(src => `<img src="${src}" class="w-14 h-14 rounded-lg object-cover border-2 border-gray-200">`).join('')}${extra > 0 ? `<div class="w-14 h-14 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">+${extra}</div>` : ''}</div>`;
                })()}
                <div class="min-w-0 flex-1 flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                        <span class="text-[12px] font-bold text-[#FF5252]">${log.date}</span>
                        <div class="flex gap-1.5 shrink-0">
                            <button onclick="startEditUpdateLog('${log.id}')" class="text-white bg-blue-500 w-6 h-6 rounded flex items-center justify-center hover:bg-blue-600 transition" title="수정"><i class="fi fi-rr-pencil"></i></button>
                            <button onclick="deleteUpdateLog('${log.id}')" class="text-white bg-red-500 w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 transition" title="삭제"><i class="fi fi-br-cross-small"></i></button>
                        </div>
                    </div>
                    <div class="font-bold text-[14px] text-[#5D4037]">${escapeHtml(log.title)}</div>
                    ${log.blocks && log.blocks.length > 0 ? `<div class="text-[11px] text-gray-400 font-bold">순서: ${log.blocks.map(b => b.type === 'image' ? '이미지' : '글').join(' → ')}</div>` : ''}
                    ${log.content ? `<div class="text-[12px] text-gray-500 whitespace-pre-wrap font-medium">${escapeHtml(log.content)}</div>` : ''}
                    ${log.url ? `<a href="${log.url}" target="_blank" class="text-[12px] text-blue-500 underline truncate block max-w-full">${log.url} (버튼명: ${displayBtnText})</a>` : ''}
                </div>
            </div>
        `}).join('');
    }

// DOMContentLoaded 이벤트에 업데이트 내역 불러오기 추가
document.addEventListener('DOMContentLoaded', () => {
    loadUpdateLogsFromFirebase();
});

function partDividerSyncMembersToFirebase() {
    if (partDividerIsAdmin && partDividerJoinedRoomCode) {
        set(ref(partDividerDb, `syncroom/rooms/${partDividerJoinedRoomCode}/members`), partDividerMemberChipList)
            .catch(err => console.error('멤버 동기화 실패:', err));
    }
}

// 🚨 주의: 아래 코드가 반드시 위의 클립 코드들보다 "더 밑에(맨 끝에)" 있어야 합니다! 🚨
initApp().finally(hidePageLoadingScreen);
