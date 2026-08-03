import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
window.openPasswordModal = openPasswordModal; window.closePasswordModal = closePasswordModal; window.closeLogoutModal = closeLogoutModal;
window.handleDayClick = handleDayClick; window.handleDayRightClick = handleDayRightClick; window.editFromMenu = editFromMenu;
window.closeEditModal = closeEditModal; window.saveEditedSchedule = saveEditedSchedule; window.deleteScheduleAction = deleteScheduleAction; window.openDetailModal = openDetailModal; window.closeDetailModal = closeDetailModal;
window.openAllSchedulesModal = openAllSchedulesModal; window.changeTab = changeTab; window.changeMonth = changeMonth; window.openMonthPicker = openMonthPicker;
window.closeMonthPicker = closeMonthPicker; window.changePickerYear = changePickerYear; window.selectMonth = selectMonth; window.addScheduleInputBlock = addScheduleInputBlock;
window.closeScheduleModal = closeScheduleModal; window.saveSchedule = saveSchedule; window.toggleFields = toggleFields; 
window.toggleProfileDropdown = toggleProfileDropdown; window.openLinkModal = openLinkModal; window.closeLinkModal = closeLinkModal;
window.openManageModal = openManageModal; window.closeManageModal = closeManageModal; window.switchManageTab = switchManageTab;
window.addMemberLink = addMemberLink; window.deleteMemberLink = deleteMemberLink; window.addUpLink = addUpLink; window.deleteUpLink = deleteUpLink;
window.toggleUpPanel = toggleUpPanel; window.toggleMemoPanel = toggleMemoPanel; window.closeSidePanel = closeSidePanel;
window.openMobileTabMenu = openMobileTabMenu; window.closeMobileTabMenu = closeMobileTabMenu;
window.executeDesktopTabChange = executeDesktopTabChange; window.executeMobileTabChange = executeMobileTabChange;
window.changeHomeDate = changeHomeDate; window.changeIndividualWeek = changeIndividualWeek;
window.openMobileDatePicker = openMobileDatePicker; window.closeMobileDatePicker = closeMobileDatePicker;
window.changeDatePickerMonth = changeDatePickerMonth; window.selectMobileDate = selectMobileDate;
window.closeUpPopup = closeUpPopup; 
window.moveLink = moveLink; window.editMemberLink = editMemberLink;
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
window.loginWithProfile = loginWithProfile; window.deleteSavedProfile = deleteSavedProfile;
window.savePopupImage = savePopupImage; window.deletePopupImage = deletePopupImage; window.switchPopupImgTab = switchPopupImgTab;
window.saveHomeYoutubeLink = saveHomeYoutubeLink; window.deleteHomeYoutubeLink = deleteHomeYoutubeLink;
window.previewPopupImgFile = previewPopupImgFile;

// 업보정리 바인딩
window.addUpboProduct = addUpboProduct; window.removeUpboProduct = removeUpboProduct; window.addUpboRow = addUpboRow; window.searchUpbo = searchUpbo; window.saveUpboData = saveUpboData; window.toggleUpboViewMode = toggleUpboViewMode;

// 그룹 관리 함수는 window.xxx = function(){} 형태로 직접 할당되어 있음

// =========================================================================
// 일정 순서 변경 함수
// =========================================================================
function moveScheduleBlock(btn, direction) {
    const currentBlock = btn.closest('.schedule-accordion-wrapper') || btn.closest('.schedule-input-block');
    const container = currentBlock.parentElement;

    if (direction === -1 && currentBlock.previousElementSibling) {
        container.insertBefore(currentBlock, currentBlock.previousElementSibling);
    } else if (direction === 1 && currentBlock.nextElementSibling) {
        container.insertBefore(currentBlock.nextElementSibling, currentBlock);
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

let scheduleList = []; 
let memoList = { '달타':[], '다룽':[], '최또':[], '카나시':[] };
let isAdmin = false;
let loggedInUser = null; 
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
    const h = window.innerHeight;
    const isLandscapeWide = w > h && w >= 640; // 가로모드 + 최소 폭 확보 시 PC 레이아웃 취급
    return !(w > 1024 || isLandscapeWide);
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

let customMembers = []; 
let memberGroups = []; // { id, name, memberIds: [] }
let popupImagesList = [];
let homeYoutubeUrl = '';
let homeBoxShouldShow = false; // 유튜브/이미지 or 공지 중 하나라도 있으면 true

const scheduleCacheStorageKey = 'signal_schedule_cache_v1';

function getDefaultMemoState() {
    return { '달타':[], '다룽':[], '최또':[], '카나시':[] };
}

function readScheduleCache() {
    try {
        const raw = sessionStorage.getItem(scheduleCacheStorageKey);
        return raw ? JSON.parse(raw) : null;
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
            upboData,
            loadedMemberPages: Array.from(loadedMemberPages),
            savedAt: Date.now()
        };
        sessionStorage.setItem(scheduleCacheStorageKey, JSON.stringify(payload));
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
    upboData = cache.upboData || {
        '달타': { products: [], records: [] },
        '다룽': { products: [], records: [] },
        '최또': { products: [], records: [] },
        '카나시': { products: [], records: [] }
    };
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
    '롤링페이퍼': 'rolling', '업보정리_달타': 'listdalta', '업보정리_다룽': 'listdarung', '업보정리_최또': 'listchoiagain', '업보정리_카나시': 'listkanashi',
    '노래책_달타': 'songbook_dalta', '노래책_다룽': 'songbook_darung', '노래책_최또': 'songbook_choitto', '노래책_카나시': 'songbook_kanashi'
};
const hashToTab = { 
    '#home': '홈', '#dalta': '달타', '#darung': '다룽', '#choiagain': '최또', '#kanashi': '카나시', 
    '#rolling': '롤링페이퍼', '#list': '업보정리_달타', '#listdalta': '업보정리_달타', '#listdarung': '업보정리_다룽', '#listchoiagain': '업보정리_최또', '#listkanashi': '업보정리_카나시',
    '#songbook_dalta': '노래책_달타', '#songbook_darung': '노래책_다룽', '#songbook_choitto': '노래책_최또', '#songbook_kanashi': '노래책_카나시'
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
    const map = { '달타': 'dalta', '다룽': 'darung', '최또': 'choitto', '카나시': 'kanasi' };
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

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'embed') {
        document.body.classList.add('embed-mode');
        document.querySelectorAll('header').forEach(el => el.style.display = 'none');
        const mobileNav = document.getElementById('mobileBottomNav');
        if (mobileNav) mobileNav.style.display = 'none';
        document.body.style.paddingTop = '0';
        document.body.style.paddingBottom = '0';
    }
});

const themeColors = { '홈': '#FF5252', '달타': '#FBC02D', '다룽': '#1E88E5', '최또': '#f745c1', '카나시': '#F57C00', '더보기': '#8B5CF6', '롤링페이퍼': '#8B5CF6', '노래책': '#FBC02D' };
const collectionMap = { '달타': 'daltaevent', '다룽': 'drungevent', '최또': 'choiagainevent', '카나시': 'kanashievent' };
const memoCollectionMap = { '달타': 'daltamemo', '다룽': 'drungmemo', '최또': 'choiagainmemo', '카나시': 'kanashimemo' };

const members = [
    { name: '달타', img: 'https://i.postimg.cc/PqcVNpvJ/Honeycam-2026-07-27-23-47-27.webp', link: '' },
    { name: '다룽', img: 'https://i.postimg.cc/MG43XMMh/Honeycam-2026-07-27-23-46-37.webp', link: '' },
    { name: '최또', img: 'https://i.postimg.cc/fTjP5RpV/jemog-eul-iblyeoghaejuseyo-1.webp', link: '' },
    { name: '카나시', img: 'https://i.postimg.cc/pTfS7VyW/Honeycam-2026-07-27-23-59-57.webp', link: '' }
];

const memberCardImages = {
    '달타': { bangon: 'https://i.postimg.cc/nL5SMj9C/Honeycam-2026-07-27-23-47-23.webp', hubang: 'https://res.cloudinary.com/dtlqzklk5/image/upload/v1781258057/xdj7vmhrw19fuhg9wec6.png' },
    '다룽': { bangon: 'https://i.postimg.cc/jj93Cwnq/Honeycam-2026-07-27-23-47-14.webp', hubang: 'https://i.postimg.cc/s28H1QGz/Honeycam-2026-07-27-23-46-50.webp' },
    '최또': { bangon: 'https://i.postimg.cc/9fSgzRwf/Honeycam-2026-07-27-23-47-18.webp', hubang: 'https://i.postimg.cc/SK51j2Yq/Honeycam-2026-07-27-23-46-59.webp' },
    '카나시': { bangon: 'https://i.postimg.cc/CKtrdBnh/Honeycam-2026-07-27-23-47-10.webp', hubang: 'https://i.postimg.cc/Ls7QhYgp/Honeycam-2026-07-27-23-46-54.webp' }
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
    '달타': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/20?viewType=L' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/dalta20' }, { title: '유튜브', url: 'https://www.youtube.com/@Dalta20' } ],
    '다룽': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/46' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/daarung22' }, { title: '유튜브', url: 'https://www.youtube.com/@daarung22' } ],
    '최또': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/88' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/choiagain' }, { title: '유튜브', url: 'https://www.youtube.com/@CHOI_AGAIN' } ],
    '카나시': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/105' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/kjhh0029' }, { title: '유튜브', url: 'https://www.youtube.com/@kanashi_0123' } ],
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

                updateLoginUI(loggedInUser);
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
                
                updateLoginUI(loggedInUser);
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

function openManageModal(tab = 'link') {
    if (!isAdmin || !loggedInUser) return;
    renderLinkManagePanel();
    renderUpLinkManagePanel();
    renderInfoManagePanel();
    renderHomeManagePanel();
    document.getElementById('manageModal').classList.replace('hidden', 'flex');
    switchManageTab(tab);

    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });
}

function closeManageModal() {
    document.getElementById('manageModal').classList.replace('flex', 'hidden');
}

function switchManageTab(tab) {
    const panels = { link: document.getElementById('manageTabPanel_link'), up: document.getElementById('manageTabPanel_up'), home: document.getElementById('manageTabPanel_home'), info: document.getElementById('manageTabPanel_info') };
    const btns = { link: document.getElementById('manageTabBtn_link'), up: document.getElementById('manageTabBtn_up'), home: document.getElementById('manageTabBtn_home'), info: document.getElementById('manageTabBtn_info') };

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
let noticeFetchAttempted = false;

async function fetchAndRenderAllNotices() {
    console.log('[공지 디버그] fetchAndRenderAllNotices() 실행 시작');
    // 데스크탑(사이드 패널)과 모바일(홈탭 본문) 양쪽 컨테이너를 모두 찾는다.
    const noticeBox = document.getElementById('homeNoticeBox');
    const noticeList = document.getElementById('homeNoticeList');
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
            const posts = data?.data || data?.posts || data?.contents || [];

            // 진단용 로그: 무슨 상황이든 콘솔에서 원인을 바로 확인할 수 있도록 항상 출력
            console.log(`[공지 디버그] ${board.name} (${board.userId}) → status:${res.status}, posts수신:${Array.isArray(posts) ? posts.length : '배열아님'}`, data);
            if (Array.isArray(posts) && posts.length > 0) {
                console.log(`[공지 디버그] ${board.name} 게시글 샘플 (필드명 확인용):`, posts[0]);
                try {
                    console.log(`[공지 디버그] ${board.name} 게시글 샘플 (JSON 전체, 복사용):`, JSON.stringify(posts[0], null, 2));
                } catch (e) { /* 순환참조 등 무시 */ }
            }

            if (!res.ok) {
                console.warn(`${board.name} API 응답 오류 (status ${res.status})`, data);
            }

            // 대소문자 구분 없이 스트리머 아이디와 일치하는 글만 필터링 (필드명이 API마다 다를 수 있어 폭넓게 확인)
            const getPostUserId = (post) =>
                post.user_id || post.userId || post.writer_id || post.writerId ||
                post.writer?.id || post.writer?.user_id || post.author_id || post.authorId;

            const streamerPosts = posts.filter((post) => {
                const uid = getPostUserId(post);
                return uid && uid.toLowerCase() === board.userId.toLowerCase();
            });

            if (posts.length > 0 && streamerPosts.length === 0) {
                console.warn(`${board.name}: 게시글은 받았지만 user_id가 '${board.userId}'와 일치하지 않아 걸러짐. 실제 데이터:`, posts[0]);
            }

            // 스트리머별 최신글 2개만 추출 (전체가 한 스트리머로 도배되지 않도록)
            const latestPosts = streamerPosts.slice(0, 2);

            latestPosts.forEach(post => {
                collectedPosts.push({ board, post, date: getPostDate(post) });
            });
        } catch (error) {
            console.error(`${board.name} 게시글을 불러오는 데 실패했습니다.`, error);
        }
    }

    // 시간순(최신 먼저) 정렬 — 시간 정보가 없는 글은 뒤로 보냄
    collectedPosts.sort((a, b) => {
        if (a.date && b.date) return b.date.getTime() - a.date.getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
    });

    console.log(`[공지 디버그] 정렬 결과 (${collectedPosts.length}건):`, collectedPosts.map(c => ({ name: c.board.name, date: c.date, raw: c.post.reg_date || c.post.regDate || c.post.regdate })));

    let itemsHtml = '';
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

        console.log(`[공지 디버그] 카드 데이터 → 닉네임:${nickname}, 프사:${profileImg}, 제목:${postTitle}, 내용:${postBody}`);

        itemsHtml += `
            <div class="flex flex-col gap-2 p-3 bg-[#FFFDF5] border border-[#5D4037]/15 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.08)] cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] transition-all" onclick="window.open('https://sooplive.com/station/${board.userId}/post/${postNo}', '_blank')">
                <div class="flex items-center gap-2">
                    <img src="${profileImg}" alt="${nickname}" loading="lazy" decoding="async" class="w-6 h-6 rounded-full object-cover shrink-0" style="background-color:${board.color};" onerror="this.style.display='none'">
                    <span class="text-[12px] font-bold shrink-0" style="color: ${board.color};">${nickname}</span>
                    ${timeLabel ? `<span class="ml-auto text-[11px] text-[#9C8B85] shrink-0">${timeLabel}</span>` : ''}
                </div>
                <span class="text-[14px] font-bold text-[#3E2723] leading-snug" style="display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${postTitle}</span>
                ${postBody ? `<span class="text-[12.5px] font-semibold text-[#8D7B72] leading-snug" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${postBody}</span>` : ''}
            </div>
        `;
    });

    // 다음 렌더링(탭 전환, 날짜 이동 등)에서도 다시 쓸 수 있도록 캐시에 저장
    cachedNoticeItemsHtml = itemsHtml;
    hasCachedNotice = hasAnyPost;
    noticeFetchAttempted = true;

    console.log(`[공지 디버그] fetchAndRenderAllNotices() 완료 → hasAnyPost:${hasAnyPost}, noticeBox있음:${!!noticeBox}, mobileNoticeBox있음:${!!mobileNoticeBox}`);

    if (noticeList) noticeList.innerHTML = itemsHtml;
    if (noticeBox) noticeBox.classList.toggle('hidden', !hasAnyPost);

    if (mobileNoticeList) mobileNoticeList.innerHTML = itemsHtml;
    if (mobileNoticeBox) mobileNoticeBox.classList.toggle('hidden', !hasAnyPost);

    // 공지 박스 내용이 갱신됐으니 주간일정 박스 밑선에 맞춰 높이 재조정
    requestAnimationFrame(alignNoticeBoxHeight);
    
    // 데이터 렌더링 성공 여부 반환
    return hasAnyPost;
}

// mainContent가 새로 그려질 때(모바일 홈탭 등) 캐시된 공지 데이터를 즉시 반영
function applyCachedNoticeToMobileHome() {
    const mobileNoticeBox = document.getElementById('mobileHomeNoticeBox');
    const mobileNoticeList = document.getElementById('mobileHomeNoticeList');
    if (mobileNoticeList) mobileNoticeList.innerHTML = cachedNoticeItemsHtml;
    if (mobileNoticeBox) mobileNoticeBox.classList.toggle('hidden', !hasCachedNotice);
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
    const availableHeight = Math.round(scheduleRect.bottom - noticeListRect.top - noticeBoxPaddingBottom - 4);
    if (availableHeight > 80) {
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

    // 3. 영상이 등록되어 있거나, 최신 공지글이 하나라도 있으면 전체 박스를 보여줌
    homeBoxShouldShow = hasVideo || hasNotice;
    applyHomeYoutubeBoxVisibility();
}

// 홈탭(+데스크탑)일 때만 유튜브/이미지·공지 박스를 보여줌
function applyHomeYoutubeBoxVisibility() {
    const box = document.getElementById('homeYoutubeBox');
    if (!box) return;
    if (currentPage === '홈' && !isMobile) {
        box.style.display = homeBoxShouldShow ? '' : 'none';
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
        homeYoutubeUrl = snap.exists() ? (snap.data().youtubeUrl || '') : '';
    } catch (e) { console.error('홈 설정 로드 실패:', e); homeYoutubeUrl = ''; }
    renderHomeYoutubeBox();
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

        const linkSnap = await getDocs(collection(db, 'memberLinks'));
        let dbLinks = { '달타':[], '다룽':[], '최또':[], '카나시':[], '공지':[] };

        const seedFlagRef = doc(db, 'meta', 'linksSeeded');
        const seedFlagSnap = await getDoc(seedFlagRef);

        if (linkSnap.empty && !seedFlagSnap.exists()) {
            for (const member of Object.keys(defaultMemberLinks)) {
                for (const link of defaultMemberLinks[member]) {
                    await addDoc(collection(db, 'memberLinks'), { member, title: link.title, url: link.url, timestamp: Date.now() });
                }
            }
            await setDoc(seedFlagRef, { seededAt: Date.now() });
            const reSnap = await getDocs(collection(db, 'memberLinks'));
            reSnap.forEach(doc => { const data = doc.data(); if(dbLinks[data.member]) dbLinks[data.member].push({ id: doc.id, ...data }); });
        } else {
            linkSnap.forEach(doc => {
                const data = doc.data();
                if(dbLinks[data.member]) dbLinks[data.member].push({ id: doc.id, ...data });
            });

            for(let m in dbLinks) dbLinks[m].sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
        }
        
        dynamicLinks = dbLinks;
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
                <img src="${activeImg.url}" alt="공지 이미지" loading="lazy" decoding="async" class="w-full h-auto max-h-[55vh] md:max-h-[65vh] object-contain rounded-2xl">
            </div>
        `;
    }

    const sortedUpLinks = [...visibleUpLinks].sort(sortUpLinksComparator);

    // UP 해줘! 팝업/패널과 동일한 카드(SOOP 게시글 댓글 순위 등)를 그대로 재사용
    const upSectionHtml = visibleUpLinks.length > 0 ? `
        <div class="flex flex-col w-full">
            <div class="text-[20px] font-bold text-[#5D4037] mb-4 border-b-2 border-dashed border-gray-300 pb-2 font-paperozi flex items-center gap-2 shrink-0">
                <i class="fi fi-rr-arrow-up-right"></i> UP 해줘!
            </div>
            <div id="upPopupUpCards" class="flex flex-col">
                <div class="text-center text-gray-400 font-bold py-6 text-[13px]">불러오는 중...⏳</div>
            </div>
        </div>
    ` : '';

    const activeTopics = rollingTopics.filter(t => t.date >= today);
    let rollingHtml = activeTopics.map(topic => {
        return `
        <div class="bg-white border-[2px] rounded-xl p-4 mb-3 cursor-pointer hover:bg-purple-50 flex flex-col gap-1 shrink-0" style="border-color:#8B5CF6" onclick="openRollingTopicFromPopup('${topic.id}')">
            <div class="font-bold text-[15px] mb-2 text-gray-800 break-words leading-snug">${topic.title}</div>
            <div class="flex justify-between items-end">
                <span class="text-[12px] font-bold text-white px-2.5 py-1 rounded-md bg-[#8B5CF6]">진행중</span>
                <span class="text-[12px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">마감: ${topic.date}</span>
            </div>
        </div>
        `;
    }).join('');

    const rollingSectionHtml = activeTopics.length > 0 ? `
        <div class="flex flex-col w-full">
            <div class="text-[20px] font-bold text-[#5D4037] mb-4 border-b-2 border-dashed border-gray-300 pb-2 font-paperozi flex items-center gap-2 shrink-0">
                <i class="fi fi-rr-envelope"></i> 롤링페이퍼
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
                <div class="flex flex-col gap-6 w-full">
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
    document.getElementById('upPopupOverlay').classList.remove('hidden');

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
    document.getElementById('upPopupOverlay').classList.add('hidden');
}

function openRollingTopicFromPopup(id) {
    closeUpPopup(true); 
    if (currentPage !== '롤링페이퍼') changeTab('롤링페이퍼');
    currentRollingTopic = rollingTopics.find(t => t.id === id);
    render();
}

function renderHeaderTabs() {
    if (new URLSearchParams(window.location.search).get('mode') === 'embed') return;
    const desktopContainer = document.getElementById('headerNavTabs');
    const mobileNav = document.getElementById('mobileBottomNav');
    
    const tabs = ['달타', '다룽', '최또', '카나시', '더보기'];
    const colors = { '달타': '#FBC02D', '다룽': '#1E88E5', '최또': '#ff7fd9', '카나시': '#F57C00', '더보기': '#8B5CF6', '롤링페이퍼': '#8B5CF6', '업보정리': '#8B5CF6' };

    if (desktopContainer) {
        let html = `
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
            
            if (tab === '더보기') {
                btnContent = `<i class="fi fi-rr-menu-dots text-2xl mt-1"></i>`;
                clickAction = ''; 
                mainLinkHtml = `
                    <a href="#" onclick="executeDesktopTabChange('롤링페이퍼'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">롤링페이퍼</a>
                    <a href="#" onclick="executeDesktopTabChange('업보정리_달타'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center">업보정리</a>
                `;
            } else {
                const links = dynamicLinks[tab] || [];
                mainLinkHtml = `<a href="#" onclick="executeDesktopTabChange('${tab}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors border-b border-gray-100 text-center">일정표</a>`;
                const songbookHtml = `<a href="#" onclick="executeDesktopTabChange('노래책_${tab}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">노래책</a>`;
                dropdownHtml = songbookHtml + links.map(link => `
                    <a href="#" onclick="openSmartLink('${link.url}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">${link.title}</a>
                `).join('');
            }
            
            html += `
                <div class="relative group flex items-center">
                    <button class="font-paperozi px-4 py-2.5 text-lg bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[${hoverColor}] hover:text-[${hoverColor}] transition-all duration-200 flex items-center justify-center" ${clickAction}>${btnContent}</button>
                    <div class="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-36 hidden group-hover:block z-[2000]">
                        <div class="bg-white flex flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden py-1">
                            ${mainLinkHtml}${dropdownHtml}
                        </div>
                    </div>
                </div>
            `;
        });
        desktopContainer.innerHTML = html;
    }

    if (mobileNav) {
        let mHtml = '';
        ['홈', ...tabs].forEach(tab => {
            const isActive = (currentPage === tab) || (currentPage === '롤링페이퍼' && tab === '더보기') || (currentPage === '업보정리' && tab === '더보기') || (currentPage === '노래책' && songbookMember === tab);
            const activeColor = tab === '홈' ? '#FF5252' : colors[tab];
            let contentHtml = '';
            
            if (tab === '홈') {
                contentHtml = `<i class="fi fi-rr-home text-[24px] transition-all ${isActive ? 'scale-110' : ''}" style="color: ${isActive ? activeColor : '#9CA3AF'}"></i>`;
            } else if (tab === '더보기') {
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
    const overlay = document.getElementById('mobileTabMenuOverlay');
    const container = document.getElementById('mobileTabMenuContainer');
    const color = themeColors[tab === '더보기' ? '롤링페이퍼' : tab];

    let html = `
        <div class="flex flex-col gap-2 relative">
            <div class="text-center font-bold text-[18px] mb-2 font-paperozi" style="color: ${color}">${tab === '더보기' ? '더보기' : tab + ' 메뉴'}</div>
    `;
    
    if (tab === '더보기') {
        html += `<button onclick="executeMobileTabChange('롤링페이퍼')" class="w-full py-2.5 bg-white rounded-lg font-bold text-[14px] border-[1.5px] border-gray-200 shadow-sm active:bg-gray-50 text-gray-800 mb-2">롤링페이퍼</button>`;
        html += `<button onclick="executeMobileTabChange('업보정리_달타')" class="w-full py-2.5 bg-white rounded-lg font-bold text-[14px] border-[1.5px] border-gray-200 shadow-sm active:bg-gray-50 text-gray-800">업보정리</button>`;
    } else {
        html += `<button onclick="executeMobileTabChange('${tab}')" class="w-full py-2.5 bg-white rounded-lg font-bold text-[14px] border-[1.5px] border-gray-200 shadow-sm active:bg-gray-50 text-gray-800 mb-2">일정표 보기</button>`;
        html += `<button onclick="executeMobileTabChange('노래책_${tab}')" class="w-full py-2.5 bg-white rounded-lg font-bold text-[14px] border-[1.5px] border-gray-200 shadow-sm active:bg-gray-50 text-gray-800 mb-2" style="border-color:${color}; color:${color}">노래책</button>`;
        const links = dynamicLinks[tab] || [];
        links.forEach(l => {
            html += `<a href="#" onclick="openSmartLink('${l.url}'); event.preventDefault();" class="w-full py-2.5 text-center bg-white rounded-lg font-bold text-[14px] shadow-sm border-[1.5px] active:brightness-95 mb-2" style="border-color: ${color}; color: ${color}">${l.title}</a>`;
        });
    }
    html += `</div>`;
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

function openRollingTopicFromMenu(id) {
    closeMobileTabMenu();
    if (currentPage !== '롤링페이퍼') changeTab('롤링페이퍼');
    currentRollingTopic = rollingTopics.find(t => t.id === id);
    render();
}

function executeDesktopTabChange(tab) { changeTab(tab); }
function executeMobileTabChange(tab) { closeMobileTabMenu(); changeTab(tab); }

function updateLoginUI(user) {
    const desktopContainer = document.getElementById('desktopAuthContainer');
    if(desktopContainer) {
        desktopContainer.innerHTML = `
            <div class="relative inline-block text-left group z-[2000]">
                <div class="flex items-center gap-2 cursor-pointer bg-white border-2 border-gray-200 shadow-sm px-4 py-1.5 rounded-xl font-bold" onclick="toggleProfileDropdown('desktopProfileMenu')">
                    <img src="${user.img || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full object-cover border-2 border-[#5D4037]">
                    <span class="text-lg text-[#5D4037] font-paperozi">${user.name}</span>
                    <i class="fi fi-rr-caret-down text-[#5D4037]"></i>
                </div>
                <div id="desktopProfileMenu" class="hidden absolute right-0 top-full mt-2 w-36 bg-white flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden">
                    <button onclick="openMemberManageModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">멤버관리</button>
                    <button onclick="openManageModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">관리</button>
                    <button onclick="logoutAdmin()" class="px-4 py-3 text-left font-bold text-red-500 font-paperozi hover:bg-gray-100">로그아웃</button>
                </div>
            </div>
        `;
    }
    const mobileContainer = document.getElementById('mobileAuthContainer');
    if(mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="relative inline-block text-left z-[2000]">
                <div class="flex items-center gap-1 cursor-pointer bg-white border border-gray-200 shadow-sm px-2 py-[5px] rounded-lg font-bold" onclick="toggleProfileDropdown('mobileProfileMenu')">
                    <img src="${user.img || 'https://via.placeholder.com/40'}" class="w-[20px] h-[20px] rounded-full object-cover border border-[#5D4037]">
                </div>
                <div id="mobileProfileMenu" class="hidden absolute right-0 top-full mt-2 w-28 bg-white flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden">
                    <button onclick="openMemberManageModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">멤버관리</button>
                    <button onclick="openManageModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">관리</button>
                    <button onclick="logoutAdmin()" class="px-3 py-2 text-left font-bold text-red-500 text-sm font-paperozi hover:bg-gray-100">로그아웃</button>
                </div>
            </div>
        `;
    }
}

function toggleProfileDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if(menu) {
        if(menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); } 
        else { menu.classList.remove('flex'); menu.classList.add('hidden'); }
    }
}

window.addEventListener('click', (e) => {
    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu && !pMenu.classList.contains('hidden') && !e.target.closest('#desktopAuthContainer') && !e.target.closest('#mobileAuthContainer')) {
            pMenu.classList.add('hidden'); pMenu.classList.remove('flex');
        }
    });
});

function renderLinkManagePanel() {
    if(!isAdmin || !loggedInUser) return;
    
    const member = loggedInUser.name === '관리자' ? '공지' : loggedInUser.name;

    const container = document.getElementById('memberLinksContainer');
    container.innerHTML = '';
    const links = dynamicLinks[member] || [];
    
    links.forEach((link, index) => {
        const isFirst = index === 0;
        const isLast = index === links.length - 1;
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white border-2 border-gray-200 p-3 rounded-lg shadow-sm">
                <div class="font-bold text-[15px] text-[#5D4037] w-1/4 truncate">${link.title}</div>
                <div class="flex items-center gap-1 w-3/4 justify-end">
                    <a href="#" onclick="openSmartLink('${link.url}'); event.preventDefault();" class="text-[13px] text-blue-500 underline truncate max-w-[130px] mr-2">${link.url}</a>
                    <button onclick="moveLink('${member}', '${link.id}', -1)" class="p-1 text-gray-500 hover:text-[#5D4037] ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fi fi-rr-angle-up text-lg"></i></button>
                    <button onclick="moveLink('${member}', '${link.id}', 1)" class="p-1 text-gray-500 hover:text-[#5D4037] ${isLast ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fi fi-rr-angle-down text-lg"></i></button>
                    <button onclick="editMemberLink('${member}', '${link.id}')" class="text-[#5D4037] font-bold text-[13px] border-2 border-[#5D4037] px-2 py-0.5 rounded ml-1 hover:bg-[#5D4037] hover:text-white transition shrink-0">수정</button>
                    <button onclick="deleteMemberLink('${member}', '${link.id}')" class="text-white bg-red-500 w-6 h-6 rounded flex items-center justify-center hover:bg-red-600 transition shrink-0 ml-1"><i class="fi fi-br-cross-small"></i></button>
                </div>
            </div>
        `;
    });

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

async function moveLink(member, linkId, direction) {
    const arr = dynamicLinks[member];
    const idx = arr.findIndex(l => l.id === linkId);
    if (idx < 0 || idx + direction < 0 || idx + direction >= arr.length) return;

    const tempTime = arr[idx].timestamp;
    arr[idx].timestamp = arr[idx + direction].timestamp;
    arr[idx + direction].timestamp = tempTime;

    try {
        await updateDoc(doc(db, 'memberLinks', arr[idx].id), { timestamp: arr[idx].timestamp });
        await updateDoc(doc(db, 'memberLinks', arr[idx + direction].id), { timestamp: arr[idx + direction].timestamp });
        arr.sort((a,b) => a.timestamp - b.timestamp);
        openLinkModal(); renderHeaderTabs();
    } catch(e) { console.error(e); }
}

async function editMemberLink(member, linkId) {
    const link = dynamicLinks[member].find(l => l.id === linkId);
    if(!link) return;
    const newTitle = prompt("수정할 메뉴 이름을 입력하세요.", link.title);
    if(newTitle === null) return;
    const newUrl = prompt("수정할 메뉴의 URL을 입력하세요.", link.url);
    if(newUrl === null) return;

    if(newTitle.trim() !== '' && newUrl.trim() !== '') {
        try {
            await updateDoc(doc(db, 'memberLinks', linkId), { title: newTitle.trim(), url: newUrl.trim() });
            link.title = newTitle.trim();
            link.url = newUrl.trim();
            openLinkModal(); renderHeaderTabs();
        } catch(e) { console.error(e); }
    }
}

async function addMemberLink() {
    const title = document.getElementById('newLinkTitle').value.trim();
    const url = document.getElementById('newLinkUrl').value.trim();
    if(!title || !url) return alert('제목과 링크를 입력하세요.');
    
    const member = loggedInUser.name === '관리자' ? '공지' : loggedInUser.name;
    const newLink = { member, title, url, timestamp: Date.now() };
    
    try {
        const docRef = await addDoc(collection(db, 'memberLinks'), newLink);
        newLink.id = docRef.id;
        if(!dynamicLinks[member]) dynamicLinks[member] = [];
        dynamicLinks[member].push(newLink);
        document.getElementById('newLinkTitle').value = ''; document.getElementById('newLinkUrl').value = '';
        openLinkModal(); renderHeaderTabs();
    } catch(e) { console.error(e); alert('추가 실패'); }
}

async function deleteMemberLink(member, linkId) {
    if(!confirm('삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'memberLinks', linkId));
        dynamicLinks[member] = dynamicLinks[member].filter(l => l.id !== linkId);
        openLinkModal(); renderHeaderTabs();
    } catch(e) { console.error(e); }
}

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
    } else {
        setTimeout(() => {
            if (sidePanelMode === null) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
        }, 300);
    }
}

function openSidePanel(mode) {
    sidePanelMode = mode;
    const panel = document.getElementById('sideExpansionPanel');
    const mobileOverlay = document.getElementById('mobilePanelOverlay');
    
    panel.classList.remove('hidden'); panel.classList.add('flex');
    if(isMobile && mobileOverlay) { mobileOverlay.classList.remove('hidden'); mobileOverlay.classList.add('block'); }

    if (!isMobile) panel.style.top = (mode === 'ARTIST') ? '-10px' : '';
    
    if (mode === 'MEMO') {
        const memos = memoList[currentPage] || [];
        const contentHtml = memos.map(memo => `
            <div class="bg-white p-4 rounded-xl border-[2.5px] border-[#5D4037] relative shadow-sm mb-4 transition" 
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
            <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
                <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                    <i class="fi fi-rr-edit"></i> ${currentPage} 메모장
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="toggleMemoPin()" title="고정" class="w-9 h-9 flex items-center justify-center text-xl transition ${memoPinned ? 'text-[#5D4037]' : 'text-gray-300 hover:text-gray-400'}"><i class="fi fi-rr-thumbtack"></i></button>
                    <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
                </div>
            </div>
            <div class="flex-1 p-5 pb-24 bg-[#FFFDF5] overflow-y-auto modal-scroll w-full">
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
            <div class="p-4 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
                <div class="text-[20px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                    <i class="fi fi-rr-video-camera-alt"></i> 시네티
                </div>
                <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
            </div>
            <div class="flex-1 w-full bg-white overflow-hidden">
                <iframe src="https://cineti-mu.vercel.app/" title="시네티" class="w-full h-full border-0" allow="clipboard-write; fullscreen"></iframe>
            </div>
        `;
    }

    requestAnimationFrame(() => {
        if(isMobile) {
            panel.classList.remove('translate-y-full', 'opacity-0'); panel.classList.add('translate-y-0', 'opacity-100');
        } else {
            panel.classList.remove('h-0', 'opacity-0'); panel.classList.add('h-[890px]', 'opacity-100');
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

    panel.innerHTML = `
        <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
            <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <i class="fi fi-rr-arrow-up-right"></i> UP 해줘!
            </div>
            <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
        </div>
        <div id="upLinksPanelBody" class="flex-1 p-5 bg-[#FFFDF5] overflow-y-auto modal-scroll">
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

async function fetchTextWithCorsFallback(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.text();
    } catch (e) {
        const proxied = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const res2 = await fetch(proxied);
        if (!res2.ok) throw new Error('HTTP ' + res2.status);
        return await res2.text();
    }
}

async function fetchJsonWithCorsFallback(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    } catch (e) {
        // 브라우저 CORS 차단 시 공용 프록시로 재시도
        const proxied = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const res2 = await fetch(proxied);
        if (!res2.ok) throw new Error('HTTP ' + res2.status);
        return await res2.json();
    }
}

// 게시글의 모든 댓글 페이지를 순회하며 수집
// (기존에는 페이지를 1개씩 순차로 기다려서 받아왔는데, 페이지가 많을수록 그만큼 느려졌음.
//  1페이지만 먼저 받아 전체 페이지 수를 파악한 뒤, 나머지 페이지는 한번에 병렬로 요청해서 시간을 줄임)
async function fetchAllSoopComments(stationId, postId) {
    const commentUrl = (page) => `https://api-channel.sooplive.com/v1.1/channel/${stationId}/post/${postId}/comment?page=${page}&orderBy=like_cnt&cCommentNo=0&pHighlightNo=0`;

    const firstJson = await fetchJsonWithCorsFallback(commentUrl(1));
    const firstData = (firstJson && Array.isArray(firstJson.data)) ? firstJson.data : [];
    const lastPage = (firstJson && firstJson.meta && firstJson.meta.lastPage) || 1;

    if (lastPage <= 1) return firstData;

    const restPages = [];
    for (let page = 2; page <= lastPage; page++) restPages.push(page);
    const restResults = await Promise.all(
        restPages.map(page => fetchJsonWithCorsFallback(commentUrl(page)).catch(() => null))
    );

    let allComments = firstData.slice();
    restResults.forEach(json => {
        if (json && Array.isArray(json.data)) allComments = allComments.concat(json.data);
    });
    return allComments;
}

// 게시글 페이지의 og:title(또는 <title>)을 스크래핑해 게시글 제목을 가져온다.
// 제목은 한번 등록되면 거의 안 바뀌므로, localStorage에 1시간 동안 캐시해서
// 팝업을 다시 열거나 새로고침해도 매번 전체 페이지를 다시 긁어오지 않도록 함.
let soopPostTitleCache = {};
const SOOP_TITLE_CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

function readSoopTitleCache(key) {
    try {
        const raw = localStorage.getItem('soopTitleCache_' + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.title !== 'string' || (Date.now() - parsed.t) > SOOP_TITLE_CACHE_TTL_MS) return null;
        return parsed.title;
    } catch(e) { return null; }
}

function writeSoopTitleCache(key, title) {
    try {
        localStorage.setItem('soopTitleCache_' + key, JSON.stringify({ title, t: Date.now() }));
    } catch(e) { /* 저장 실패(용량 초과 등)는 무시 - 캐시는 있으면 좋고 없어도 그만 */ }
}

async function fetchSoopPostTitle(stationId, postId) {
    const key = `${stationId}_${postId}`;
    if (soopPostTitleCache[key]) return soopPostTitleCache[key];

    const cached = readSoopTitleCache(key);
    if (cached) {
        soopPostTitleCache[key] = cached;
        return cached;
    }

    try {
        const html = await fetchTextWithCorsFallback(`https://www.sooplive.com/station/${stationId}/post/${postId}`);
        const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        const title = (ogMatch ? ogMatch[1] : (titleMatch ? titleMatch[1] : '')).trim();
        soopPostTitleCache[key] = title;
        if (title) writeSoopTitleCache(key, title);
        return title;
    } catch(e) {
        console.error('게시글 제목 로드 실패:', e);
        return '';
    }
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

    const [title, comments] = await Promise.all([
        fetchSoopPostTitle(stationId, postId),
        fetchAllSoopComments(stationId, postId)
    ]);

    // 좋아요 수(like_cnt) 기준 내림차순 정렬 -> 게시글 전체 댓글 순위
    const sortedComments = [...comments].sort((a, b) => (b.likeCnt || 0) - (a.likeCnt || 0));

    const result = { title, sortedComments, t: Date.now() };
    soopRawDataCache.set(key, result);
    return result;
}

// 그룹(게시글 하나)에 대한 제목 + 등록된 내 댓글들의 좋아요 순위 데이터를 만든다.
// 게시글 전체 댓글을 기준으로 순위를 계산한 뒤, 그 중 DB에 등록해둔 내 댓글들만 골라서 보여준다.
async function buildSoopGroupData(group) {
    const { title, sortedComments } = await fetchSoopTitleAndComments(group.stationId, group.postId);

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

    return { title, matched };
}

function buildSoopGroupCardHtml(group, data) {
    const firstUp = group.entries[0].up;
    const titleText = data.title || firstUp.title || '(게시글 제목을 불러올 수 없습니다)';
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

async function loadSchedulesFromFirebase({ forceReload = false, member = null, useCacheOnly = false } = {}) {
    const cached = !forceReload ? readScheduleCache() : null;

    if (!forceReload && member && loadedMemberPages.has(member) && cached) {
        hydrateScheduleCache(cached);
        renderHeaderTabs();
        render();
        return true;
    }

    if (!forceReload && !member && cached) {
        hydrateScheduleCache(cached);
        renderHeaderTabs();
        render();
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
        const targetMembers = member ? [member] : Object.keys(collectionMap);
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

            const grpSnap = await getDocs(collection(db, 'memberGroups'));
            memberGroups = [];
            grpSnap.forEach(doc => memberGroups.push({ id: doc.id, ...doc.data() }));

            const topicSnap = await getDocs(collection(db, 'rollingTopics'));
            rollingTopics = [];
            topicSnap.forEach(doc => rollingTopics.push({ id: doc.id, ...doc.data() }));
            sortRollingTopics();

            const entrySnap = await getDocs(collection(db, 'rollingEntries'));
            rollingEntries = [];
            entrySnap.forEach(doc => rollingEntries.push({ id: doc.id, ...doc.data() }));
            rollingEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            try {
                const upboSnap = await getDocs(collection(db, 'upboData'));
                upboSnap.forEach(docSnap => {
                    const mapToKor = {'dalta':'달타', 'darung':'다룽', 'choiagain':'최또', 'kanashi':'카나시'};
                    const k = mapToKor[docSnap.id];
                    if(k) {
                        upboData[k] = docSnap.data();
                    }
                });
                for(let m in upboData) {
                    if(!upboData[m].products) upboData[m].products = [];
                    if(!upboData[m].records) upboData[m].records = [];
                }
            } catch(e) { console.error("업보데이터 로드 에러:", e); }
        }

        saveScheduleCache();
        renderHeaderTabs(); 
        render();
        return true;
    } catch (e) {
        console.error("데이터 불러오기 실패:", e);
        return false;
    }
}

async function changeTab(tabName) {
    const _embedP = new URLSearchParams(window.location.search);
    if (_embedP.get('mode') === 'embed') return;

    if (tabName.startsWith('업보정리')) {
        currentPage = '업보정리';
        if (tabName.includes('_')) {
            upboCurrentMember = tabName.split('_')[1];
        }
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
        if(currentPage === '홈') { closeSidePanel(true); }
        else if (memoPinned && memoCollectionMap[currentPage]) { sidePanelMode = 'MEMO'; openSidePanel('MEMO'); }
        else { closeSidePanel(true); }
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

    let bgColor = sch.globalType === '휴방' ? '#F9FAFB' : (memberColors[memberName] || '#FFFFFF');
    let textColor = ''; 
    
    if (isHabBang) {
        bgColor = '#ffdddd'; 
        textColor = 'color: #ff6767 !important;'; 
    }

    const typeClass = sch.globalType === '휴방' ? 'hubang' : 'bangon';
    const displayTitle = sch.title || (sch.globalType === '휴방' ? '휴방' : '뱅온');
    const formattedTime = (typeof formatTime12 === 'function' && sch.time) ? formatTime12(sch.time) : ''; 

    if (isMobileCard) {
        return `
            <div class="schedule-card ${typeClass} w-full"
                 style="background-color: ${bgColor} !important; ${textColor} display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; padding: 6px 20px !important; min-height: 46px !important;"
                 onclick="openDetailModal(event, '${sch.id}')" 
                 oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { 
                     event.preventDefault(); event.stopPropagation(); window.contextTargetId = '${sch.id}'; window.editFromMenu(); 
                 }">
                <span style="font-family: 'Paperozi', sans-serif; font-size: 15px; font-weight: 600; text-align: left; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">${displayTitle}</span>
                ${formattedTime ? `<span style="font-family: 'Paperozi', sans-serif; font-size: 12px; font-weight: 700; color: #5D4037; flex-shrink: 0; margin-left: 6px; white-space: nowrap;">${formattedTime}</span>` : ''}
            </div>
        `;
    }

    const timeHtml = formattedTime ? `
        <div class="flex justify-end w-full pr-1 pt-0 mt-[-1px] shrink-0">
            <span class="text-[11px] font-bold" style="color: #5D4037;">${formattedTime}</span>
        </div>
    ` : '';

    const isBangon = sch.globalType !== '휴방';
    const shiftDownClass = (isBangon && !formattedTime) ? 'pt-4' : '';

    return `
        <div class="schedule-card ${typeClass} flex flex-col h-full"
             style="background-color: ${bgColor} !important; ${textColor}"
             onclick="openDetailModal(event, '${sch.id}')" 
             oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { 
                 event.preventDefault(); event.stopPropagation(); window.contextTargetId = '${sch.id}'; window.editFromMenu(); 
             }">
             ${timeHtml}
             <div class="flex-1 flex items-center justify-center w-full min-h-0 px-0.5 py-0 ${shiftDownClass}">
                 <div class="schedule-text" style="font-size: 17px !important; line-height: 1 !important; white-space: normal;">
                     ${displayTitle}
                 </div>
             </div>
        </div>
    `;
}

function render() {
    const tabBackgrounds = { '홈': '#ffdddd', '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#FCE4EC', '카나시': '#FFF3E0', '롤링페이퍼': '#F3E8FF', '업보정리': '#FFFDF5' };
    const activeThemeMember = currentPage === '업보정리' ? upboCurrentMember : currentPage === '노래책' ? songbookMember : currentPage;
    document.body.style.backgroundColor = tabBackgrounds[activeThemeMember] || '#ffdddd';
    document.documentElement.style.setProperty('--theme-color', themeColors[activeThemeMember] || '#8B5CF6');
    document.body.className = document.body.className.replace(/theme-\S+/g, '');
    const themeClass = currentPage === '업보정리' ? 'rolling' : currentPage === '노래책' ? getThemeClassForMember(songbookMember) : getThemeClassForMember(activeThemeMember);
    document.body.classList.add('theme-' + themeClass);
    
    const mBtnContainer = document.getElementById('mobileHeaderRightBtn');
    const dBtnContainer = document.getElementById('dynamicSideBtn');
    
    const mobileUpBtnHtml = `<button onclick="toggleUpPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-arrow-up-right"></i> UP</button>`;
    const mobileMemoBtnHtml = `<div class="flex items-center gap-1.5">
        <button onclick="toggleMemoPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-edit"></i> 메모</button>
        <button onclick="toggleCinetiPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-video-camera-alt"></i> 시네티</button>
    </div>`;
    const desktopUpBtnHtml = `<button onclick="toggleUpPanel()" class="w-[100px] h-[75px] bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[15px] cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 border-[#5D4037]"><i class="fi fi-rr-arrow-up-right text-xl"></i>UP</button>`;
    const desktopMemoBtnHtml = `<div class="flex flex-col gap-2">
        <button onclick="toggleMemoPanel()" class="w-[100px] h-[75px] bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[15px] cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 border-[#5D4037]"><i class="fi fi-rr-edit text-xl"></i>메모</button>
        <button onclick="toggleCinetiPanel()" class="w-[100px] h-[75px] bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[15px] cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 border-[#5D4037]"><i class="fi fi-rr-video-camera-alt text-xl"></i>시네티</button>
    </div>`;    
    const mobileRollingBtnHtml = isAdmin ? `<button onclick="openRollingTopicModal()" class="px-3 py-[6px] bg-purple-100 text-purple-700 font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-purple-300 hover:bg-purple-200"><i class="fi fi-br-plus"></i> 주제추가</button>` : '';
    const desktopRollingBtnHtml = isAdmin ? `<button onclick="openRollingTopicModal()" class="px-6 py-2.5 bg-purple-50 text-purple-700 font-bold rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-sm font-paperozi text-[18px] cursor-pointer flex items-center gap-2 border-2 border-purple-200"><i class="fi fi-br-plus"></i> 주제 추가</button>` : '';

    if (mBtnContainer) {
        if (currentPage === '홈') mBtnContainer.innerHTML = mobileUpBtnHtml;
        else if (currentPage === '롤링페이퍼') mBtnContainer.innerHTML = mobileRollingBtnHtml; 
        else if (currentPage === '업보정리') mBtnContainer.innerHTML = ''; 
        else if (currentPage === '노래책') mBtnContainer.innerHTML = ''; 
        else mBtnContainer.innerHTML = mobileMemoBtnHtml;
    }
    if (dBtnContainer) {
        if (currentPage === '홈') dBtnContainer.innerHTML = desktopUpBtnHtml;
        else if (currentPage === '롤링페이퍼') dBtnContainer.innerHTML = desktopRollingBtnHtml; 
        else if (currentPage === '업보정리') dBtnContainer.innerHTML = ''; 
        else if (currentPage === '노래책') dBtnContainer.innerHTML = ''; 
        else dBtnContainer.innerHTML = desktopMemoBtnHtml;
    }
    
    const content = document.getElementById('mainContent'); if(!content) return; content.innerHTML = '';
    
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
    } else if (currentPage === '업보정리') {
        renderUpboPage();
    } else if (currentPage === '노래책') {
        renderSongbook();
    } else {
        if (isMobile) {
            if (currentPage === '홈') renderMobileHome(grouped);
            else renderMobileIndividual(grouped);
        } else {
            if (currentPage === '홈') renderDesktopHome(grouped);
            else renderDesktopIndividual(grouped);
        }
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

function getLikedSongIds(member = songbookMember) {
    try {
        const key = `likedSongIds_${member || '달타'}`;
        return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch (e) {
        return new Set();
    }
}

function saveLikedSongIds(set, member = songbookMember) {
    const key = `likedSongIds_${member || '달타'}`;
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

function isSongLiked(id) {
    return getLikedSongIds().has(id);
}

function getFilteredSongs() {
    let list = songs.slice();
    if (songArtistFilter) list = list.filter(s => s.artist === songArtistFilter);
    if (songGenreFilter) list = list.filter(s => (s.genre || '미분류') === songGenreFilter);
    if (songLikedOnlyFilter) {
        const liked = getLikedSongIds();
        list = list.filter(s => liked.has(s.id));
    }
    const q = (document.getElementById('songSearchInput')?.value || '').trim().toLowerCase();
    if (q) {
        list = list.filter(s => {
            const title = (s.title || '').toLowerCase();
            const artist = (s.artist || '').toLowerCase();
            if (title.includes(q) || artist.includes(q)) return true;
            const alias = (s.alias || '').toLowerCase();
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
        html += `<div class="col-span-full text-center text-gray-400 font-bold py-16">등록된 노래가 없습니다.</div>`;
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
                        ${genreTags.length ? `<div class="flex flex-wrap gap-1 mt-1.5">${genreTags.map(g => `<span class="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style="color:#5D4037; background:${theme.soft};">${escapeHtml(g)}</span>`).join('')}</div>` : ''}
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
        <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex items-center shadow-sm z-10 shrink-0">
            <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <i class="fi fi-rr-microphone"></i> 가수 목록
            </div>
        </div>
        <div class="flex-1 p-5 bg-[#FFFDF5] overflow-y-auto modal-scroll w-full">
            ${listHtml}
        </div>
    `;
}

window.filterSongList = function() { renderSongList(); };

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
        .map(g => `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full" style="color:#5D4037; background:${theme.soft};">${escapeHtml(g)}</span>`)
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
// 업보정리 (구매내역/배송상태) 렌더링 함수들
// =========================================================================
function renderUpboPage() {
    const content = document.getElementById('mainContent');
    const themeColor = themeColors[upboCurrentMember] || '#8B5CF6';

    let toggleBtnHtml = '';
    if (isAdmin) {
        const isSearch = upboViewMode === 'search';
        toggleBtnHtml = `
            <div class="absolute top-4 right-4 md:top-8 md:right-8 z-10 flex items-center gap-1 bg-gray-100 p-1.5 rounded-xl border-2 border-gray-200 shadow-inner shrink-0">
                <button onclick="toggleUpboViewMode('search')" class="px-4 py-2 rounded-lg font-bold text-[14px] transition-all ${isSearch ? 'bg-white shadow-sm text-[#5D4037]' : 'text-gray-400 hover:text-gray-600'}">조회</button>
                <button onclick="toggleUpboViewMode('admin')" class="px-4 py-2 rounded-lg font-bold text-[14px] transition-all ${!isSearch ? 'bg-[#5D4037] shadow-sm text-white' : 'text-gray-400 hover:text-gray-600'}">관리</button>
            </div>
        `;
    }

    const _isEmbed = new URLSearchParams(window.location.search).get('mode') === 'embed';
    let tabsHtml = _isEmbed ? '' : `<div class="flex justify-center gap-2 mb-8 mt-2 overflow-x-auto whitespace-nowrap px-2">`;
    if (!_isEmbed) {
    ['달타', '다룽', '최또', '카나시'].forEach(m => {
        const active = m === upboCurrentMember;
        const mColor = themeColors[m];
        tabsHtml += `<button onclick="changeTab('업보정리_${m}')" class="px-6 py-2.5 font-bold font-paperozi text-[17px] rounded-full border-2 transition-all shadow-sm" style="border-color:${mColor}; ${active ? `background-color:${mColor}; color:white;` : `background-color:white; color:${mColor};`}">${m}</button>`;
    });
    tabsHtml += `</div>`;
    }

    let mainHtml = `<div class="big-white-box relative mx-auto" style="min-height: 800px; padding: ${isMobile ? '20px' : '40px'}; width: 100%; box-sizing: border-box;">`;
    mainHtml += toggleBtnHtml; 
    
    const titleText = (isAdmin && upboViewMode === 'admin') ? '업보 관리' : '업보 조회';
    mainHtml += `<h2 class="text-[28px] lg:text-3xl font-bold text-[#5D4037] font-paperozi text-center mb-6 pt-12 md:pt-0"><i class="fi fi-rr-box-open"></i> ${titleText}</h2>`;
    mainHtml += tabsHtml;

    if (upboViewMode === 'search' || !isAdmin) {
        mainHtml += `
            <div class="max-w-2xl mx-auto mb-10">
                <div class="flex gap-2">
                    <input type="text" id="upboSearchInput" class="flex-1 border-[2.5px] border-[#5D4037] rounded-xl p-4 text-[17px] font-bold outline-none focus:border-[var(--theme-color)]" placeholder="닉네임 또는 아이디를 입력하세요" onkeypress="if(event.key==='Enter') searchUpbo()">
                    <button onclick="searchUpbo()" class="px-6 py-4 text-white font-bold rounded-xl hover:brightness-110 shadow-sm whitespace-nowrap text-[17px] font-paperozi" style="background-color:${themeColor};"><i class="fi fi-rr-search"></i> 검색</button>
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
            <div class="mt-4 pt-4 border-t-[3px] border-dashed border-[#5D4037]">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h3 class="text-[22px] font-bold text-[#5D4037] font-paperozi"><i class="fi fi-rr-settings"></i> ${upboCurrentMember} 업보 관리</h3>
                    <div class="absolute top-[120px] -right-[170px] flex flex-col gap-2 shrink-0 z-50">
                        <button onclick="saveUpboData()" class="px-5 py-2.5 bg-[#967978] text-white font-bold font-Diary rounded-xl hover:brightness-110 shadow-sm whitespace-nowrap"><i class="fi fi-rr-disk"></i> 저장하기</button>
                        
                        <div id="upboFileMenuWrapper" class="relative w-full">
                            <button type="button" onclick="event.stopPropagation(); toggleUpboFileMenu()" class="px-4 py-2.5 bg-green-50 text-green-700 font-bold font-Diary rounded-xl hover:bg-green-100 border-[2px] border-green-200 shadow-sm whitespace-nowrap"><i class="fi fi-rr-file-upload"></i> 파일 업로드</button>
                            <div id="upboFileMenu" class="hidden absolute top-full right-0 mt-2 w-44 bg-white border-2 border-[#967978] rounded-xl shadow-lg z-20 overflow-hidden flex-col">
                                <button type="button" onclick="event.stopPropagation(); closeUpboFileMenu(); openUpboTextUploadModal();" class="w-full text-left px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-2"><i class="fi fi-rr-comment-alt"></i> 댓글 업로드</button>
                                <button type="button" onclick="event.stopPropagation(); closeUpboFileMenu(); document.getElementById('rouletteFileInput').click();" class="w-full text-left px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors flex items-center gap-2"><i class="fi fi-rr-dice"></i> 룰렛 업로드</button>
                            </div>
                        </div>
<input type="file" id="rouletteFileInput" accept=".xlsx,.xls,.csv" class="hidden" onchange="processRouletteFile(this)">
                            
                            <button onclick="addUpboProduct()" class="px-4 py-2.5 bg-blue-50 text-blue-700 font-bold font-Diary rounded-xl hover:bg-blue-100 border-[2px] border-blue-200 shadow-sm whitespace-nowrap">+ 상품(열) 추가</button>
                            <button onclick="copyUpboEmbedCode()" class="px-5 py-2.5 bg-white text-[#967978] font-bold font-Diary rounded-xl hover:bg-[#967978] hover:text-white border-2 border-[#967978] shadow-sm whitespace-nowrap transition-all duration-200"><i class="fi fi-rr-share"></i> 퍼가기</button>
                            <button onclick="toggleUpboGuide()" id="upboGuideBtn" class="px-5 py-2.5 bg-white text-[#967978] font-bold font-Diary rounded-xl hover:bg-[#967978] hover:text-white border-2 border-[#967978] shadow-sm whitespace-nowrap transition-all duration-200"><i class="fi fi-rr-info"></i> 사용법</button>
                        </div>
                    </div>

                    <!-- 일괄 처리 컨트롤 바 -->
                    <div class="flex items-center gap-2 mb-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                        <span class="text-[14px] font-bold text-[#5D4037] ml-1">선택 항목:</span>
                        <select id="batchStatusSelect" class="border-[2px] border-[#5D4037] rounded-lg p-1.5 text-[13px] outline-none font-bold text-[#5D4037] cursor-pointer">
                            <option value="배송중">배송중</option>
                            <option value="배송완료">배송완료</option>
                        </select>
                        <button onclick="changeStatusSelectedUpboRows()" class="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-lg border-[1.5px] border-purple-200 shadow-sm text-[13px] hover:bg-purple-100 transition">일괄 상태 변경</button>
                        <span class="text-gray-300 mx-1">|</span>
                        <button onclick="deleteSelectedUpboRows()" class="px-3 py-1.5 bg-red-50 text-red-700 font-bold rounded-lg border-[1.5px] border-red-200 shadow-sm text-[13px] hover:bg-red-100 transition">선택 삭제</button>
                    </div>

                    <div id="upboGuideBox" class="hidden mb-4 bg-[#FFFDF5] border-2 border-[#5D4037] rounded-2xl p-6 shadow-sm">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <div class="text-[17px] font-bold text-[#5D4037] font-paperozi mb-3 flex items-center gap-2"><i class="fi fi-rr-box-open"></i> 업보정리 사용법</div>
                                <ol class="flex flex-col gap-2">
                                    <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">1</span>데이터를 입력 후 저장하기를 누른다</li>
                                    <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">2</span>저장하면 상태와 방송국 바로가기 버튼이 생긴다</li>
                                    <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">3</span>시청자들이 조회창에서 본인이 구매한 것을 조회할 수 있습니다</li>
                                </ol>
                            </div>
                            <div>
                                <div class="text-[17px] font-bold text-[#5D4037] font-paperozi mb-3 flex items-center gap-2"><i class="fi fi-rr-share"></i> 퍼가기 사용법</div>
                                <ol class="flex flex-col gap-2">
                                    <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">1</span>저장하기 옆 퍼가기 버튼을 눌러 복사합니다</li>
                                    <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">2</span>SOOP 게시글 쓰기 기본모드를 HTML모드로 바꾸고 붙여넣고 게시합니다</li>
                                    <li class="flex gap-2 text-[14px] font-bold text-gray-700"><span class="shrink-0 w-[22px] h-[22px] bg-[#5D4037] text-white rounded-full flex items-center justify-center text-[11px]">3</span>게시글에서 조회창이 나와서 바로 조회가 가능합니다</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto lg:overflow-visible border-2 border-[#5D4037] rounded-xl bg-white mb-4 shadow-sm scrollbar-hide">
                        <table class="w-full text-left border-collapse min-w-max" id="upboAdminTable">
                        </table>
                    </div>
                    <button onclick="addUpboRow()" class="w-full py-4 bg-gray-50 text-gray-500 font-bold font-paperozi rounded-xl border-[2.5px] border-dashed border-gray-300 hover:bg-gray-100 hover:text-[#5D4037] transition text-lg">+ 새 사용자 행 추가</button>
                </div>
            `;
        }

        mainHtml += `</div>`;
        content.innerHTML = mainHtml;
        content.className = 'shrink-0 transition-all duration-300 w-full lg:w-max lg:min-w-[1200px] lg:mx-auto pb-6';

        if (isAdmin && upboViewMode === 'admin') renderUpboAdminTable();
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

    // 👇 룰렛 열 추가된 부분 👇
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

    // 👇 룰렛 열이 textarea 로 포함된 부분 👇
    html += `<td class="p-2 border-r align-middle">
                <textarea class="w-full outline-none bg-transparent text-center text-[13px] text-purple-600 font-bold upbo-roulette resize-none overflow-hidden block" style="min-height:24px; field-sizing: content;" rows="1" placeholder="-">${record.roulette || ''}</textarea>
             </td>
             <td class="p-2 border-r"><input type="text" class="outline-none bg-transparent upbo-memo text-[13px] text-gray-600" style="min-width: 90px; width: ${(record.memo || '요청사항').length + 2}ch; field-sizing: content;" oninput="this.style.width = (this.value.length || this.placeholder.length) + 2 + 'ch';" value="${record.memo || ''}" placeholder="요청사항"></td>
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

function searchUpbo() {
    const query = document.getElementById('upboSearchInput').value.trim().toLowerCase();
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
        (r.nickname && r.nickname.toLowerCase() === query) ||
        (r.uid && r.uid.toLowerCase() === query)
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

    let html = `<div class="space-y-6">`;
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
                        <div class="flex justify-between items-center bg-white border-[2px] border-gray-100 p-4 rounded-xl shadow-sm hover:border-[#5D4037] transition">
                            <span class="font-bold text-gray-700 text-[16px] shrink-0">${p}</span>
                            <span class="font-black text-[16px] text-[#5D4037] bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 whitespace-pre-line text-right leading-snug break-words ml-2">${displayVal}</span>
                        </div>`;
                }
            });
        }
        
        if (totalItems === 0 && !r.roulette) {
            itemsHtml = `<div class="text-gray-400 font-bold text-center py-6 bg-gray-50 rounded-xl border border-dashed">주문된 상품이 없습니다.</div>`;
        }

        // 👇 룰렛 출력 부분: span 태그를 div 태그로 바꾸고 whitespace-pre-line 클래스를 줘서 줄바꿈 완벽 적용 👇
        if(r.roulette) {
            itemsHtml += `
                <div class="flex justify-between items-center bg-purple-50 border-[2px] border-purple-200 p-4 rounded-xl shadow-sm">
                    <span class="font-bold text-purple-700 text-[16px] shrink-0">🎲 룰렛 당첨</span>
                    <div class="font-black text-[16px] text-purple-800 bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-right leading-snug break-words ml-2 whitespace-pre-line">${r.roulette}</div>
                </div>`;
        }

        const statusColorMap = {
            '결제대기': 'bg-gray-100 text-gray-600 border-gray-300',
            '결제완료': 'bg-blue-50 text-blue-600 border-blue-300',
            '배송준비': 'bg-yellow-50 text-yellow-600 border-yellow-300',
            '배송중': 'bg-purple-50 text-purple-600 border-purple-300',
            '배송완료': 'bg-green-50 text-green-600 border-green-300'
        };
        const sColor = statusColorMap[r.status] || 'bg-gray-100 text-gray-600 border-gray-300';

        html += `
            <div class="bg-white border-[3px] border-[#5D4037] rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] relative overflow-hidden">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-5 border-b-[2.5px] border-dashed border-gray-200 pb-4 gap-3">
                    <div class="flex items-center gap-3">
                        <span class="text-[24px] font-bold text-[#5D4037] font-paperozi">${r.nickname}</span>
                        <span class="text-[15px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">ID: ${r.uid || '미기입'}</span>
                    </div>
                    <span class="px-4 py-1.5 rounded-full font-bold text-[15px] border-[2px] w-max ${sColor} shadow-sm">${r.status}</span>
                </div>
                <div class="flex flex-col gap-3">
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

    if (!currentRollingTopic) {
        html += `
            <div class="flex justify-between items-center mb-8">
                <h2 class="text-[28px] lg:text-3xl font-bold text-[#5D4037] font-paperozi">롤링페이퍼 주제 목록</h2>
            </div>
            <div class="flex flex-wrap justify-start gap-6">
        `;
        rollingTopics.forEach(topic => {
            const isExpired = topic.date < todayStr;
            const badgeHtml = isExpired 
                ? `<span class="bg-gray-400 text-white text-[12px] px-2 py-1 rounded font-bold mr-2 align-middle">마감</span>` 
                : `<span class="bg-[#8B5CF6] text-white text-[12px] px-2 py-1 rounded font-bold mr-2 align-middle">진행중</span>`;
            
            html += `
                <div class="w-full md:w-[calc(50%-0.75rem)] max-w-[850px] min-h-[200px] flex flex-col justify-center bg-white border-[3px] border-[#8B5CF6] rounded-2xl p-10 cursor-pointer hover:-translate-y-1 transition group relative" onclick="openRollingTopic('${topic.id}')">
                    ${isAdmin ? `<button onclick="event.stopPropagation(); deleteRollingTopic('${topic.id}')" class="absolute top-5 right-5 text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition"><i class="fi fi-br-cross-small text-2xl"></i></button>` : ''}
                    <div class="text-[24px] font-bold text-[#5D4037] mb-4 font-paperozi line-clamp-2">${badgeHtml}${topic.title}</div>
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
            ? `<button class="px-6 py-3 bg-gray-400 text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(156,163,175,1)] cursor-not-allowed font-paperozi text-lg shrink-0" onclick="alert('이 롤링페이퍼는 마감되어 더 이상 작성할 수 없습니다.')"><i class="fi fi-rr-lock"></i> 마감됨</button>`
            : `<button onclick="openRollingEntryModal()" class="px-6 py-3 bg-[#8B5CF6] text-white font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:brightness-110 hover:-translate-y-1 transition font-paperozi text-lg shrink-0"><i class="fi fi-rr-edit"></i> 작성하기</button>`;

        html += `
            <div class="flex flex-col lg:flex-row justify-between lg:items-center mb-8 border-b-[3px] border-[#5D4037] pb-5 gap-4">
                <div class="flex items-center gap-3">
                    <button onclick="closeRollingTopic()" class="text-3xl text-[#5D4037] hover:scale-110 transition"><i class="fi fi-rr-angle-left"></i></button>
                    <h2 class="text-[24px] lg:text-3xl font-bold text-[#5D4037] font-paperozi line-clamp-1">${currentRollingTopic.title}</h2>
                </div>
                ${actionBtn}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        `;
        
        currentTopicEntries.forEach((entry, idx) => {
            const bgStyle = entry.imageUrl 
                ? `background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${entry.imageUrl}'); background-size: cover; background-position: center; border: none;` 
                : `background-color: #FFFDF5; border: 3px solid #5D4037;`;
            const textStyle = entry.imageUrl ? `color: #ffffff;` : `color: #5D4037;`;
            const nickStyle = entry.imageUrl ? `color: #e5e7eb; border-top-color: rgba(255,255,255,0.4);` : `color: #6b7280; border-top-color: #d1d5db;`;

            html += `
                <div class="rounded-xl p-5 cursor-pointer shadow-[3px_3px_0px_0px_rgba(93,64,55,1)] hover:-translate-y-1 transition relative flex flex-col h-[400px]" style="${bgStyle}" onclick="openRollingDetailModal(${idx})">
                    ${isAdmin ? `
                    <div class="absolute top-2 right-2 flex gap-1 z-10 bg-[#FFFDF5] rounded-md px-1" style="${entry.imageUrl ? 'background: rgba(255,255,255,0.8);' : ''}">
                        <button onclick="event.stopPropagation(); openEditRollingEntryModal('${entry.id}')" class="text-blue-500 hover:text-blue-700 p-1"><i class="fi fi-rr-edit"></i></button>
                        <button onclick="event.stopPropagation(); deleteRollingEntry('${entry.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fi fi-br-cross-small"></i></button>
                    </div>
                    ` : ''}
                    <div class="text-[16px] font-medium whitespace-pre-wrap flex-1 overflow-hidden pointer-events-none mt-2 break-words" style="display: -webkit-box; -webkit-line-clamp: 14; -webkit-box-orient: vertical; ${textStyle}">${entry.content}</div>
                    <div class="text-right text-[14px] font-bold mt-3 pt-2 border-t-2 border-dashed pointer-events-none shrink-0" style="${nickStyle}">- ${entry.nickname || '익명'}</div>
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
        renderHeaderTabs(); 
        render();
    } catch(e) { console.error(e); }
}

function openRollingTopic(id) { currentRollingTopic = rollingTopics.find(t => t.id === id); render(); }
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
    editRollingEntryId = id;
    document.getElementById('reModalTitle').innerText = '방명록 수정 (관리자)';
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
            const newEntry = { topicId: currentRollingTopic.id, content, nickname, imageUrl, timestamp: Date.now() };
            const docRef = await addDoc(collection(db, 'rollingEntries'), newEntry);
            rollingEntries.unshift({ id: docRef.id, ...newEntry });
        }
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
    if(!confirm("이 방명록을 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, 'rollingEntries', id));
        rollingEntries = rollingEntries.filter(e => e.id !== id);
        render();
    } catch(e) { console.error(e); }
}

function openRollingDetailModal(index) {
    currentEntryIndex = index;
    const container = document.getElementById('rdSliderContainer');
    
    container.innerHTML = currentTopicEntries.map((entry, idx) => {
        const bgStyle = entry.imageUrl 
            ? `background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${entry.imageUrl}'); background-size: cover; background-position: center; border: none;` 
            : `background-color: #FFFDF5; border: 0px;`; 
        const textStyle = entry.imageUrl ? `color: #ffffff;` : `color: #5D4037;`;
        const nickStyle = entry.imageUrl ? `color: #e5e7eb; border-top-color: rgba(255,255,255,0.4);` : `color: #6b7280; border-top-color: #5D4037;`;
        const pcBorder = entry.imageUrl ? '' : 'md:border-4 border-[#5D4037]';
        
        return `
        <div class="snap-center shrink-0 w-full h-full md:h-[1000px] flex items-center justify-center md:my-auto px-0 md:px-4">
            <div class="modal-content w-full h-full rounded-none md:rounded-3xl shadow-2xl flex flex-col p-6 pt-20 pb-8 md:p-12 relative overflow-hidden ${pcBorder}" style="${bgStyle}">
                <div class="text-[20px] md:text-[24px] font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 min-h-0 modal-scroll break-words px-4 md:px-0 drop-shadow-sm" style="${textStyle}">${entry.content}</div>
                <div class="text-right text-[18px] md:text-[20px] font-bold mt-6 pt-4 border-t-2 border-dashed px-4 md:px-0 drop-shadow-sm shrink-0" style="${nickStyle}">- ${entry.nickname || '익명'}</div>
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
// 모바일 & PC 캘린더 렌더링 함수들
// =========================================================================
function renderMobileHome(grouped) {
    const content = document.getElementById('mainContent');
    const d = homeTargetDate;
    const dateStr = `${d.getMonth()+1}.${d.getDate()}`;
    const dayStr = ['일','월','화','수','목','금','토'][d.getDay()];

    const cardBgColors = { '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#FFF0F5', '카나시': '#FFF3E0' };

    let html = `
        <div class="w-full flex justify-between items-center mb-5 px-4 mt-2">
            <button onclick="changeHomeDate(-1)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-left text-3xl"></i></button>
            <div class="text-[22px] font-bold font-paperozi text-[#5D4037] cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-2" onclick="openMobileDatePicker()">
                ${dateStr} (${dayStr}) <i class="fi fi-sr-caret-down text-sm mt-1"></i>
            </div>
            <button onclick="changeHomeDate(1)" class="p-2 flex items-center justify-center text-[#5D4037] hover:scale-110 transition-transform"><i class="fi fi-rr-angle-right text-3xl"></i></button>
        </div>
        <div class="grid grid-cols-1 gap-4 px-4 w-full">
    `;
    
    const rowBorderColors = ['#FBC02D', '#1E88E5', '#ff7fd9', '#F57C00'];
    members.forEach((member, i) => {
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${member.name}`;
        const daySchedules = grouped[key] || [];
        let schedulesHtml = '';

        if (daySchedules.length > 0) {
            const isHubang = daySchedules.some(s => s.globalType === '휴방');
            const imgSrc = isHubang ? memberCardImages[member.name].hubang : memberCardImages[member.name].bangon;
            
            const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
            const dayGlobalTime = sWithGlobal ? formatTime12(sWithGlobal.globalStartTime) : '';

            if (isHubang) {
                schedulesHtml = `<div class="schedule-card hubang h-full flex items-center justify-center w-full overflow-hidden relative" style="color:#9CA3AF; background-color:#F3F4F6; padding:0; border-radius: 12px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2);" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="휴방" loading="lazy" decoding="async"></div>`;
            } else {
                const borderColor = rowBorderColors[i];
                const bgColor = cardBgColors[member.name] || '#FFF5F5';
                schedulesHtml = `<div class="schedule-card h-full w-full flex items-center justify-center overflow-hidden relative" style="color: ${borderColor}; background-color: ${bgColor}; padding:0; border-radius: 12px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2);" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="뱅온" loading="lazy" decoding="async">${dayGlobalTime ? `<div class="absolute bottom-1 right-1.5 text-[14px] font-black tracking-tight" style="color: ${rowBorderColors[i]}; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0px 2px 3px rgba(0,0,0,0.3);">${dayGlobalTime}</div>` : ''}</div>`;
            }
        } else {
            schedulesHtml = `<div class="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"><span class="text-gray-400 text-[15px] font-bold">일정 없음</span></div>`;
        }

        const borderColor = rowBorderColors[i];
        
        html += `
            <div class="flex w-full bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-[2.5px] overflow-hidden" style="border-color: ${borderColor}">
                <div class="w-1/2 aspect-square border-r-[2.5px] relative cursor-pointer p-0 shrink-0" style="border-color: ${borderColor}" onclick="handleProfileClick(event, '${member.name}', '${member.link}')">
                    <img src="${member.img}" class="w-full h-full object-cover">
                    <div id="liveBadge-${member.name}" class="live-badge" onclick="goToLiveBroadcast(event, '${member.name}')" title="현재 방송 중이 아니에요">
                        <span class="live-badge-dot"></span>LIVE
                    </div>
                </div>
                <div class="w-1/2 aspect-square p-2 flex flex-col justify-center gap-2 bg-[#FFFDF5] overflow-y-auto" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')">
                    ${schedulesHtml}
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
            <div id="mobileHomeNoticeList" class="flex flex-col gap-2 max-h-[570px] overflow-y-auto modal-scroll pr-1"></div>
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
        <div class="w-full flex justify-between items-center mb-5 px-4 mt-2">
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
        if (daySchedules.length > 0) {
            const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
            if (sWithGlobal) dayGlobalTime = formatTime12(sWithGlobal.globalStartTime);
        }
        const timeDisplayHtml = dayGlobalTime ? `<span class="text-[12px] font-bold mt-1 px-1 rounded bg-white" style="color: ${isToday ? themeColor : '#5D4037'}">${dayGlobalTime}</span>` : '';

        if (!schedulesHtml) {
            schedulesHtml = `<div class="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"><span class="text-gray-400 text-[14px] font-bold">일정 없음</span></div>`;
        }

        html += `
            <div class="flex w-full bg-[#FFFDF5] rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-[1.5px] cursor-pointer transition-transform hover:-translate-y-1 min-h-[90px]" style="border-color: ${isToday ? themeColor : '#e5e7eb'}; color: ${isToday ? themeColor : '#3E2723'}" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${currentPage}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${currentPage}')">
                <div class="w-[75px] shrink-0 flex flex-col items-center justify-center border-r-[1.5px]" style="border-color: ${isToday ? themeColor : '#e5e7eb'}; background-color: ${isToday ? themeColor : '#ffffff'}; color: ${isToday ? 'white' : 'inherit'}; border-top-left-radius: 10px; border-bottom-left-radius: 10px;">
                    <span class="text-[14px] font-bold mb-0.5 opacity-80">${daysLabel[i]}</span>
                    <span class="text-[26px] font-bold leading-none">${d.getDate()}</span>
                    ${timeDisplayHtml}
                </div>
                <div class="flex-1 p-2 flex flex-col justify-center gap-2 overflow-y-auto bg-white" style="border-top-right-radius: 10px; border-bottom-right-radius: 10px;">
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
    const logoImgUrl = "https://i.postimg.cc/SsC1x8x9/twd-Kl0kpj-m-F6Pga-E2tp-Xs12Soo-ZQYJg-Uyp-HF1GLpbo-ADh-DGCu-THODWZ-LSQ4m-Pz0pz-Rj-XDTxaf3ife-GCn-GMx.webp";
    
    const today = new Date(); const diff = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today); monday.setDate(today.getDate() + diff);
    const weekDates = Array.from({length: 7}, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
    const daysLabel = ['월', '화', '수', '목', '금', '토', '일'];
    
    const headerHtml = weekDates.map((d, i) => {
        let c = ''; if (i === 5) c = 'text-blue-600'; if (i === 6) c = 'text-red-600';
        const isToday = d.getFullYear() === realToday.getFullYear() && d.getMonth() === realToday.getMonth() && d.getDate() === realToday.getDate();
        const dateStr = `${d.getMonth() + 1}.${d.getDate()}`;
        const displayDate = isToday ? `<span class="bg-[#5D4037] text-white px-2 py-0.5 rounded-md">${dateStr}</span>` : dateStr;
        return `<div class="header-days-cell ${c}"><div class="leading-none mb-1">${daysLabel[i]}</div><div class="text-[14px] text-gray-500 font-bold font-paperozi">${displayDate}</div></div>`;
    }).join('');

    const rowBgColors = ['#FFFDE7', '#E3F2FD', '#FFF0F5', '#FFF3E0'];
    const rowBorderColors = ['#FBC02D', '#1E88E5', '#ff7fd9', '#F57C00'];

    let homeHtml = `<div class="home-white-box"><div class="mb-8 w-full"><div class="flex gap-[22px] justify-center items-end"><div class="w-[277px] flex items-center justify-center pb-2"><img src="${logoImgUrl}" alt="SIGNAL Logo" style="height: 110px; object-fit: contain; transition: transform 0.2s;" class="cursor-pointer hover:scale-105" onclick="changeTab('홈')"></div><div class="header-days-container">${headerHtml}</div></div></div><div class="weekly-grid">`;

    members.forEach((member, i) => {
        let daysCellsHtml = '';
        weekDates.forEach(d => {
            const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${member.name}`;
            const daySchedules = grouped[key] || [];
            let schedulesHtml = '';

            if (daySchedules.length > 0) {
                const isHubang = daySchedules.some(s => s.globalType === '휴방');
                const borderColor = isHubang ? '#9CA3AF' : rowBorderColors[i]; 
                const bgColor = isHubang ? '#F3F4F6' : rowBgColors[i];
                const imgSrc = isHubang ? memberCardImages[member.name].hubang : memberCardImages[member.name].bangon;
                
                const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
                const dayGlobalTime = sWithGlobal ? formatTime12(sWithGlobal.globalStartTime) : '';
                
                schedulesHtml = `<div class="schedule-card w-full h-full flex items-center justify-center overflow-hidden relative" style="color: ${borderColor}; background-color: ${bgColor}; padding:0; border-radius: 4px;" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" style="border-radius: inherit;" alt="${isHubang ? '휴방' : '뱅온'}">${dayGlobalTime ? `<div class="absolute bottom-1 right-1.5 text-[14px] font-black tracking-tight" style="color: ${rowBorderColors[i]}; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0px 2px 3px rgba(0,0,0,0.3);">${dayGlobalTime}</div>` : ''}</div>`;
            }
            daysCellsHtml += `<div class="day-cell" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')"><div class="schedule-list w-full h-full">${schedulesHtml}</div></div>`;
        });

        homeHtml += `<div class="week-row row-${i+1}"><div class="profile-cell" onclick="handleProfileClick(event, '${member.name}', '${member.link || ''}')"><img src="${member.img}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover;"><div id="liveBadge-${member.name}" class="live-badge" onclick="goToLiveBroadcast(event, '${member.name}')" title="현재 방송 중이 아니에요"><span class="live-badge-dot"></span>LIVE</div></div><div class="days-container">${daysCellsHtml}</div></div>`;
    });
    content.innerHTML = homeHtml + `</div></div>`;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto';
}

function renderDesktopIndividual(grouped) {
    const content = document.getElementById('mainContent');
    const realToday = new Date();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); 
    const startIdx = (firstDay === 0) ? 6 : firstDay - 1; 
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const cellsHtml = Array.from({length: 35}, (_, i) => {
        const day = i - startIdx + 1;
        if (day > 0 && day <= daysInMonth) {
            const key = `${currentYear}-${currentMonth}-${day}-${currentPage}`; 
            const daySchedules = grouped[key] || [];
            const schedulesHtml = daySchedules.map(sch => buildScheduleCardHtml(sch, false)).join('');
            const isToday = currentYear === realToday.getFullYear() && currentMonth === realToday.getMonth() + 1 && day === realToday.getDate();
            
            const lunarDate = getLunarDate(currentYear, currentMonth, day);
            
            let dayGlobalTime = '';
            if (daySchedules.length > 0) {
                const sWithGlobal = daySchedules.find(s => s.globalStartTime && s.globalType === '뱅온');
                if (sWithGlobal) dayGlobalTime = formatTime12(sWithGlobal.globalStartTime);
            }
            const timeDisplayHtml = dayGlobalTime ? `<span class="text-[13px] font-bold text-[#5D4037]">${dayGlobalTime}</span>` : '';
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

    content.innerHTML = `<div class="big-white-box relative theme-${currentPage === '달타'?'dalta':currentPage === '다룽'?'darung':currentPage === '최또'?'choitto':'kanasi'}">
        <div class="nav-container"><button class="nav-btn" onclick="changeMonth(-1)"><i class="fi fi-rr-caret-left"></i></button><div class="w-[330px] flex justify-center items-center"><div class="text-[40px] font-normal cursor-pointer hover-theme-text leading-none" style="font-family: 'DnfBitbeatV2', sans-serif;" onclick="openMonthPicker()">${currentYear}년 ${currentMonth}월</div></div><button class="nav-btn" onclick="changeMonth(1)"><i class="fi fi-rr-caret-right"></i></button></div><div class="header-days-container mb-2">${['월','화','수','목','금','토','일'].map(d=>`<div class="header-days-cell" style="padding:22px 0;">${d}</div>`).join('')}</div><div class="big-box-container">${cellsHtml}</div></div>`;
    content.className = 'shrink-0 transition-all duration-300 w-full lg:w-auto';
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
    
    const desktopContainer = document.getElementById('desktopAuthContainer');
    if(desktopContainer) desktopContainer.innerHTML = `<button class="font-paperozi bg-white border-2 border-gray-200 px-4 py-2 rounded-xl font-bold text-lg text-[#5D4037] hover:bg-[#5D4037] hover:border-[#5D4037] hover:text-white transition-all duration-200 shadow-sm" onclick="handleAdminClick()">로그인</button>`;
    const mobileContainer = document.getElementById('mobileAuthContainer');
    if(mobileContainer) mobileContainer.innerHTML = `<button class="font-paperozi bg-white border border-gray-200 px-2 py-[5px] rounded-lg font-bold text-[13px] text-[#5D4037] hover:bg-[#5D4037] hover:text-white transition-all shadow-sm" onclick="handleAdminClick()">로그인</button>`;
    
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
    
    const moveBtnsHtml = isDeletable ? `
        <div class="absolute top-4 right-4 flex gap-2 z-10">
            <button type="button" class="text-gray-400 hover:text-[#5D4037] text-[20px] font-bold flex items-center justify-center hover:scale-110 transition-all" onclick="moveScheduleBlock(this, -1)" title="위로 이동"><i class="fi fi-rr-angle-up"></i></button>
            <button type="button" class="text-gray-400 hover:text-[#5D4037] text-[20px] font-bold flex items-center justify-center hover:scale-110 transition-all" onclick="moveScheduleBlock(this, 1)" title="아래로 이동"><i class="fi fi-rr-angle-down"></i></button>
        </div>
    ` : '';

    const removeBtnClass = imageUrl ? '' : 'hidden'; 

    return `
        <div class="schedule-input-block border-2 border-[#5D4037] p-6 rounded-xl bg-white relative shadow-sm pretendard mt-1">
            ${moveBtnsHtml} <input type="hidden" class="sch-id" value="${id}">
            
            <div class="mb-4 pr-20"> 
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">일정 제목</label>
                <input type="text" class="sch-title w-full border-2 border-[#5D4037] rounded-lg p-3 outline-none focus:border-[var(--theme-color)] text-[16px] font-medium" placeholder="일정 제목 입력" value="${title}">
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">시작일</label>
                    <input type="date" class="sch-start w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none text-[15px] font-medium" value="${sDate}">
                </div>
                <div>
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">종료일</label>
                    <input type="date" class="sch-end w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none text-[15px] font-medium" value="${eDate}">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">시간 (선택)</label>
                    <div class="flex items-center justify-between border-2 border-[#5D4037] rounded-lg p-2 bg-white">
                        <button type="button" class="sch-ampm ampm-btn px-3 py-1.5 font-bold text-[#5D4037] rounded-md text-[14px]" onclick="toggleAmpm(this)">${ampm}</button>
                        <input type="number" min="1" max="12" class="sch-hh w-[42px] p-1 text-center font-bold text-[#5D4037] outline-none text-[16px]" placeholder="시" value="${hh}">
                        <span class="font-bold text-[#5D4037]">:</span>
                        <input type="number" min="0" max="59" class="sch-mm w-[42px] p-1 text-center font-bold text-[#5D4037] outline-none mr-1 text-[16px]" placeholder="분" value="${mm}">
                    </div>
                </div>
                <div>
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">유형</label>
                    <select class="sch-broad w-full border-2 border-[#5D4037] rounded-lg p-3 outline-none text-[15px] bg-white font-bold text-[#5D4037] cursor-pointer">
                        <option value="개인방송" ${broad==='개인방송'?'selected':''}>개인방송</option>
                        <option value="합방" ${broad==='합방'?'selected':''}>합방</option>
                        <option value="시네티" ${broad==='시네티'?'selected':''}>시네티</option>
                        <option value="휴방" ${broad==='휴방'?'selected':''}>휴방</option>
                    </select>
                </div>
            </div>

            <div class="mb-4">
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">함께하는 멤버 / 크루 (선택)</label>
                <input type="text" class="sch-mem w-full border-2 border-[#5D4037] rounded-lg p-3 outline-none focus:border-[var(--theme-color)] text-[15px] font-medium" placeholder="멤버 혹은 크루 이름 띄어쓰기로 입력" value="${mem}">
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4 items-start">
                <div>
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">이미지 첨부 (선택)</label>
                    <div class="flex items-center gap-2">
                        <input type="file" accept="image/*" class="flex-1 min-w-0 text-[13px] cursor-pointer" onchange="window.handleScheduleImageUpload(this)">
                        <button type="button" class="sch-img-remove-btn ${removeBtnClass} px-3 py-1.5 bg-red-500 text-white rounded text-sm font-bold shadow-sm hover:bg-red-600 transition shrink-0" onclick="window.removeScheduleImage(this)">삭제</button>
                    </div>
                    <input type="hidden" class="sch-image-url" value="${imageUrl}">
                    <div class="sch-img-preview">${imageUrl ? `<img src="${imageUrl}" loading="lazy" decoding="async" class="h-20 w-auto rounded-lg object-cover border-2 border-gray-200 mt-2">` : ''}</div>
                </div>
                <div>
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">상세</label>
                    <textarea class="sch-desc w-full border-2 border-[#5D4037] rounded-lg p-3 outline-none focus:border-[var(--theme-color)] text-[15px] resize-none h-[75px] font-medium" placeholder="상세 내용을 입력하세요">${desc}</textarea>
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
            <div class="schedule-accordion-wrapper bg-white p-4 rounded-xl border-2 border-[#5D4037] shadow-sm mb-3 relative">
                <div class="flex justify-between items-center cursor-pointer pr-16" onclick="toggleScheduleItem('${contentId}', '${btnId}')">
                    <span class="font-bold text-[#5D4037] text-[16px]">${sch.title || '일정'}</span>
                    <span id="${btnId}" class="accordion-toggle-btn text-[12px] text-gray-400 font-bold">${btnText}</span>
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
        <div class="schedule-accordion-wrapper bg-white p-4 rounded-xl border-2 border-[#5D4037] shadow-sm mb-3 relative">
            <div class="flex justify-between items-center cursor-pointer pr-16" onclick="toggleScheduleItem('${contentId}', '${btnId}')">
                <span class="font-bold text-[#5D4037] text-[16px]">새 일정</span>
                <span id="${btnId}" class="accordion-toggle-btn text-[12px] text-gray-400 font-bold">접기</span>
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
    <div class="schedule-accordion-wrapper bg-white p-4 rounded-xl border-2 border-[#5D4037] shadow-sm mb-3 relative">
        <div class="flex justify-between items-center cursor-pointer pr-16" onclick="toggleScheduleItem('${contentId}', '${btnId}')">
            <span class="font-bold text-[#5D4037] text-[16px]">새 일정</span>
            <span id="${btnId}" class="accordion-toggle-btn text-[12px] text-gray-400 font-bold">접기</span>
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
    modalContent.style.backgroundColor = '#FFFDF5'; 
    modalContent.style.padding = '20px';

    const cardBgColors = { '달타': '#FFFDE7', '다룽': '#E3F2FD', '최또': '#FFF0F5', '카나시': '#FFF3E0' };

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
                broadStyle = 'background-color: #fee2e2; color: #ef4444; border-color: #ef4444;'; 
            } else if (broadText === '시네티') {
                broadStyle = 'background-color: #f3e8ff; color: #9333ea; border-color: #9333ea;'; 
            } else {
                let bgC = cardBgColors[sch.tabOrMember] || '#ffffff';
                broadStyle = `background-color: ${bgC}; color: ${themeColor}; border-color: ${themeColor};`;
            }

            const titleInner = schedules.length > 1
                ? `<div class="text-[17px] font-bold text-[#000] text-center leading-tight break-keep font-paperozi mb-1">${sch.title}</div>`
                : '';
            
            let badgeHtml = sch.globalType === '휴방' ? '' : 
                `<div class="flex gap-2 justify-center">
                    ${timeText ? `<span class="px-3 py-1 bg-white text-[11px] font-bold rounded-full shadow-sm border-2" style="color: ${themeColor}; border-color: ${themeColor};">${timeText}</span>` : ''}
                    <span class="px-3 py-1 text-[11px] font-bold rounded-full border-2 shadow-sm" style="${broadStyle}">${broadText}</span>
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
                            <div style="${isCrew ? 'width:100%; border-radius:12px; border:1px solid #f3f4f6;' : 'width:72px; height:72px; border-radius:50%; border:3px solid #fcdbc6;'} overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                <img src="${m.imageUrl}" style="width:100%; height:100%; object-fit:${isCrew ? 'contain' : 'cover'};" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/72'">
                            </div>
                            ${(m.nickname && !isCrew) ? `<span style="font-size:13px; font-weight:700; color:#5D4037; text-align:center; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing: -0.5px;">${m.nickname}</span>` : ''}
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
    const closeBtn = modal.querySelector('.modal-btn');
    if(closeBtn) { closeBtn.className = "modal-btn w-full bg-[#5D4037] text-white py-3 rounded-2xl font-bold text-[18px] mt-3 hover:brightness-110 transition-all cursor-pointer"; closeBtn.innerText = "닫기"; }
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

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('selectstart', event => event.preventDefault());
document.addEventListener('keydown', function(e) {
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
    if (!el) return;
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
                updateLoginUI(loggedInUser);
            } else {
                sessionStorage.removeItem('activeAdminSession');
                localStorage.removeItem('activeAdminSession');
            }
        } catch(e) { console.error("자동 로그인 검증 실패:", e); }
    }
    
    // === 초기 탭 설정 분리 ===
    const today = getTodayYYYYMMDD();
    const embedParams = new URLSearchParams(window.location.search);
    const isEmbedMode = embedParams.get('mode') === 'embed';
    let initialTab = '홈';

    if (isEmbedMode) {
        const upboParam = embedParams.get('upbo');
        upboCurrentMember = upboParam || '달타';
        currentPage = '업보정리';
        upboViewMode = 'search'; 
        initialTab = '업보정리';
    } else {
        const currentHash = window.location.hash;
        if (currentHash && hashToTab[currentHash]) {
            let mapped = hashToTab[currentHash];
            if (mapped.startsWith('업보정리')) {
                currentPage = '업보정리';
                if(mapped.includes('_')) upboCurrentMember = mapped.split('_')[1];
                initialTab = mapped;
            } else {
                currentPage = mapped;
                initialTab = mapped;
            }
        } else {
            currentPage = '홈';
            initialTab = '홈';
        }
    }

    // === 필수 데이터 우선 로딩 (렌더링 최우선) ===
    await loadSchedulesFromFirebase();
    if (currentPage === '홈') {
        await loadHomeSettingsFromFirebase(); // 홈 탭 입장 시 유튜브 박스 설정을 즉시 가져옴
    }
    setActiveSongs(songbookMember);

    // 필수 데이터로 초기 화면 렌더링
    if (isEmbedMode) {
        renderHeaderTabs();
        render();
    } else {
        await changeTab(initialTab);
    }

    // === 후순위 데이터 병렬 지연 로딩 ===
    Promise.all([
        loadLinksFromFirebase(),
        loadPopupImagesFromFirebase(),
        currentPage !== '홈' ? loadHomeSettingsFromFirebase() : Promise.resolve()
    ]).then(() => {
        // 백그라운드 로드가 끝나면 UI 실시간 갱신
        renderHeaderTabs();
        if (!isEmbedMode) {
            checkAndShowPopup(today);
        }
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

window.openMemberManageModal = function() {
    if(!isAdmin) return;
    renderCustomMembersList();
    renderMemberGroupsList();
    document.getElementById('memberManageModal').classList.replace('hidden', 'flex');
    
    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });
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
        renderCustomMembersList();
        render();
    } catch(e) { console.error(e); }
};

let editingGroupId = null;

window.renderCustomMembersList = function(filterText = '') {
    const container = document.getElementById('customMembersList');
    const badge = document.getElementById('memberCountBadge');
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

window.copyEmbedCode = function() {
    const currentUrl = window.location.origin + window.location.pathname;
    const embedUrl = `${currentUrl}?mode=embed#listdalta`;
    
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700px" style="border: none;" sandbox="allow-scripts allow-same-origin"></iframe>`;
    
    navigator.clipboard.writeText(iframeCode).then(() => {
        alert("게시글용 임베드 코드가 복사되었습니다!");
    }).catch(err => {
        console.error('복사 실패:', err);
    });
};

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

window.copyUpboEmbedCode = function() {
    const currentUrl = window.location.origin + window.location.pathname;
    const memberParam = typeof upboCurrentMember !== 'undefined' && upboCurrentMember
        ? `&upbo=${encodeURIComponent(upboCurrentMember)}`
        : '&upbo=달타';
    const embedUrl = `${currentUrl}?mode=embed${memberParam}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700px" style="border:none; border-radius:16px;" sandbox="allow-scripts allow-same-origin"></iframe>`;

    navigator.clipboard.writeText(iframeCode).then(() => {
        const btn = document.querySelector('button[onclick="copyUpboEmbedCode()"]');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fi fi-rr-check"></i> 복사완료!';
            btn.classList.add('bg-green-500', 'text-white', 'border-green-500');
            btn.classList.remove('bg-white', 'text-[#5D4037]');
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.remove('bg-green-500', 'text-white', 'border-green-500');
                btn.classList.add('bg-white', 'text-[#5D4037]');
            }, 2000);
        }
    }).catch(() => {
        prompt('아래 코드를 복사하세요:', iframeCode);
    });
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

initApp().finally(hidePageLoadingScreen);