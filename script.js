import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
        previewContainer.innerHTML = `<img src="${imageUrl}" class="h-20 w-auto rounded-lg object-cover border-2 border-gray-200 mt-2">`;
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
    
    if (currentWidth > 1024) {
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
window.previewPopupImgFile = previewPopupImgFile;

// 업보정리 바인딩
window.addUpboProduct = addUpboProduct; window.removeUpboProduct = removeUpboProduct; window.addUpboRow = addUpboRow; window.searchUpbo = searchUpbo; window.saveUpboData = saveUpboData; window.toggleUpboViewMode = toggleUpboViewMode;

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

let scheduleList = []; 
let memoList = { '달타':[], '다룽':[], '최또':[], '카나시':[] };
let isAdmin = false;
let loggedInUser = null; 
let currentPage = '홈';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let pickerYear = currentYear;
let contextTargetId = null;
let currentEditingIds = [];
let targetModalContext = { year: currentYear, month: currentMonth, day: 1, member: '홈' };
let currentEditingMemoId = null;

let isMobile = window.innerWidth <= 1024;
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

let customMembers = []; 
let popupImagesList = [];

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
    '롤링페이퍼': 'rolling', '업보정리_달타': 'listdalta', '업보정리_다룽': 'listdarung', '업보정리_최또': 'listchoiagain', '업보정리_카나시': 'listkanashi' 
};
const hashToTab = { 
    '#home': '홈', '#dalta': '달타', '#darung': '다룽', '#choiagain': '최또', '#kanashi': '카나시', 
    '#rolling': '롤링페이퍼', '#list': '업보정리_달타', '#listdalta': '업보정리_달타', '#listdarung': '업보정리_다룽', '#listchoiagain': '업보정리_최또', '#listkanashi': '업보정리_카나시' 
};

window.addEventListener('resize', () => {
    adjustDesktopScale(); 
    
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 1024;
    if (wasMobile !== isMobile) {
        sidePanelMode = null; closeSidePanel(true); renderHeaderTabs(); render();
    }
});

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

const themeColors = { '홈': '#FF5252', '달타': '#FBC02D', '다룽': '#1E88E5', '최또': '#f745c1', '카나시': '#F57C00', '더보기': '#8B5CF6', '롤링페이퍼': '#8B5CF6' };
const collectionMap = { '달타': 'daltaevent', '다룽': 'drungevent', '최또': 'choiagainevent', '카나시': 'kanashievent' };
const memoCollectionMap = { '달타': 'daltamemo', '다룽': 'drungmemo', '최또': 'choiagainmemo', '카나시': 'kanashimemo' };

const members = [
    { name: '달타', img: 'https://i.postimg.cc/y8VYYyZM/dalta-peusa.png', link: '' },
    { name: '다룽', img: 'https://i.postimg.cc/bNfB7zDm/jemog-eul-iblyeoghaejuseyo-(2).png', link: '' },
    { name: '최또', img: 'https://i.postimg.cc/fTQrGwtB/jemog-eul-iblyeoghaejuseyo.png', link: '' },
    { name: '카나시', img: 'https://i.postimg.cc/fTjzMdQv/jemog-eul-iblyeoghaejuseyo.png', link: '' }
];

const memberCardImages = {
    '달타': { bangon: 'https://i.postimg.cc/P5N94Lsc/jemog-eul-iblyeoghaejuseyo.png', hubang: 'https://res.cloudinary.com/dtlqzklk5/image/upload/v1781258057/xdj7vmhrw19fuhg9wec6.png' },
    '다룽': { bangon: 'https://i.postimg.cc/zG36jLZc/jemog-eul-iblyeoghaejuseyo-(3).png', hubang: 'https://i.postimg.cc/MHCMFM3M/jemog-eul-iblyeoghaejuseyo-(8).png' },
    '최또': { bangon: 'https://i.postimg.cc/FH18Zf56/jemog-eul-iblyeoghaejuseyo-(1).png', hubang: 'https://i.postimg.cc/SRB2v21z/jemog-eul-iblyeoghaejuseyo-(6).png' },
    '카나시': { bangon: 'https://i.postimg.cc/8z33n1Nt/jemog-eul-iblyeoghaejuseyo-(4).png', hubang: 'https://i.postimg.cc/vTJgNg29/jemog-eul-iblyeoghaejuseyo-(7).png' }
};

const defaultMemberLinks = {
    '달타': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/20?viewType=L' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/dalta20' }, { title: '유튜브', url: 'https://www.youtube.com/@Dalta20' } ],
    '다룽': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/46' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/daarung22' }, { title: '유튜브', url: 'https://www.youtube.com/@daarung22' } ],
    '최또': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/88' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/choiagain' }, { title: '유튜브', url: 'https://www.youtube.com/@CHOI_AGAIN' } ],
    '카나시': [ { title: '공지', url: 'https://cafe.naver.com/f-e/cafes/30973382/menus/105' }, { title: 'SOOP', url: 'https://www.sooplive.com/station/kjhh0029' }, { title: '유튜브', url: 'https://www.youtube.com/@kanashi_0123' } ],
    '공지': [ { title: '260601 패치노트 보러가기', url: 'https://app.notion.com/p/schedule-calender/260601-3725f6fcabcd809b8d89fe83f7d48c83?source=copy_link' } ]
};

let dynamicLinks = JSON.parse(JSON.stringify(defaultMemberLinks));
let upLinksList = [];

function openSmartLink(url) {
    if (!url) return;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) { window.location.href = url; } else { window.open(url, '_blank'); }
}

async function seedAdmins() {
    try {
        const snap = await getDocs(collection(db, 'admins'));
        if (snap.empty) {
            const defaultAdmins = [
                { id: 'dalta', pw: '08201007', email: 'dalta0127@naver.com', name: '달타', img: 'https://stimg.sooplive.com/LOGO/da/dalta20/dalta20.jpg' },
                { id: 'darung', pw: '11281106', email: 'daarung22@naver.com', name: '다룽', img: 'https://stimg.sooplive.com/LOGO/da/daarung22/daarung22.jpg' },
                { id: 'choiagain', pw: '10300628', email: 'choiagain333@naver.com', name: '최또', img: 'https://stimg.sooplive.com/LOGO/ch/choiagain/choiagain.jpg' },
                { id: 'kanashu', pw: '01230607', email: 'jhh0029@naver.com', name: '카나시', img: 'https://stimg.sooplive.com/LOGO/kj/kjhh0029/kjhh0029.jpg' },
                { id: 'admin1', pw: 'admin123!', email: 'rnskrns@naver.com', name: '관리자', img: 'https://i.postimg.cc/cHc39MV6/11.jpg' },
                { id: 'admin2', pw: 'admin123!', email: 'jkolpc@naver.com', name: '관리자', img: 'https://i.postimg.cc/cHc39MV6/11.jpg' }
            ];
            for (const admin of defaultAdmins) {
                if (admin.id) await addDoc(collection(db, 'admins'), admin);
            }
        }
    } catch(e) { console.error("관리자 시드 생성 실패:", e); }
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
                <img src="${p.img || 'https://via.placeholder.com/40'}" class="w-[48px] h-[48px] rounded-full object-cover border-[2.5px] border-gray-200 group-hover:border-[#5D4037] transition">
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

function openInfoModal() {
    if (!loggedInUser) return;
    document.getElementById('infoEmail').value = loggedInUser.email || '';
    document.getElementById('infoPw').value = ''; 
    document.getElementById('infoModal').classList.replace('hidden', 'flex');
    
    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });
}

function closeInfoModal() {
    document.getElementById('infoModal').classList.replace('flex', 'hidden');
}

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
                    <span class="text-gray-500 block mt-1 font-semibold">기간: ${img.startDate} ~ ${img.deadline}</span>
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

async function loadLinksFromFirebase() {
    try {
        const todayYYYYMMDD = getTodayYYYYMMDD();
        upLinksList = [];
        
        const soopSnap = await getDocs(collection(db, 'soop_posts'));
        for (const d of soopSnap.docs) {
            const data = d.data();
            if (data.deadline && data.deadline < todayYYYYMMDD) continue;
            
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
            if (data.deadline && data.deadline < todayYYYYMMDD) continue;
            upLinksList.push({ id: d.id, source: 'uplinks', ...data });
        }

        const linkSnap = await getDocs(collection(db, 'memberLinks'));
        let dbLinks = { '달타':[], '다룽':[], '최또':[], '카나시':[], '공지':[] };

        if (linkSnap.empty) {
            for (const member of Object.keys(defaultMemberLinks)) {
                for (const link of defaultMemberLinks[member]) {
                    await addDoc(collection(db, 'memberLinks'), { member, title: link.title, url: link.url, timestamp: Date.now() });
                }
            }
            const reSnap = await getDocs(collection(db, 'memberLinks'));
            reSnap.forEach(doc => { const data = doc.data(); if(dbLinks[data.member]) dbLinks[data.member].push({ id: doc.id, ...data }); });
        } else {
            linkSnap.forEach(doc => {
                const data = doc.data();
                if(dbLinks[data.member]) dbLinks[data.member].push({ id: doc.id, ...data });
            });
            
            if (dbLinks['공지'].length === 0) {
                const defaultNotice = defaultMemberLinks['공지'][0];
                const docRef = await addDoc(collection(db, 'memberLinks'), { member: '공지', title: defaultNotice.title, url: defaultNotice.url, timestamp: Date.now() });
                dbLinks['공지'].push({ id: docRef.id, member: '공지', title: defaultNotice.title, url: defaultNotice.url, timestamp: Date.now() });
            }

            for(let m in dbLinks) dbLinks[m].sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
        }
        
        dynamicLinks = dbLinks;
        renderHeaderTabs();
    } catch(e) { console.error("링크 로드 실패:", e); }
}

function checkAndShowPopup(today) {
    const lastClosed = localStorage.getItem('upPopupClosedDate');
    const activeTopics = rollingTopics.filter(t => t.date >= today);
    
    const hasValidImage = popupImagesList.some(img => 
        (!img.startDate || img.startDate <= today) && 
        (!img.deadline || img.deadline >= today)
    );
    
    if (lastClosed !== today && (upLinksList.length > 0 || activeTopics.length > 0 || (dynamicLinks['공지'] && dynamicLinks['공지'].length > 0) || hasValidImage)) {
        showUpPopup(today);
    }
}

function showUpPopup(today) {
    const list = document.getElementById('upPopupList');
    if(!list) return;

    let popupImgHtml = '';
    const activeImg = popupImagesList.find(img => (!img.startDate || img.startDate <= today) && (!img.deadline || img.deadline >= today));
    const leftWidthClass = (activeImg && activeImg.url) ? 'md:w-1/2' : 'w-full';

    if (activeImg && activeImg.url) {
        popupImgHtml = `
            <div class="w-full md:w-1/2 shrink-0">
                <img src="${activeImg.url}" alt="공지 이미지" class="w-full h-auto max-h-[40vh] md:max-h-[65vh] object-cover rounded-2xl">
            </div>
        `;
    }

    let upHtml = upLinksList.map(up => {
        const theme = themeColors[up.member] || '#5D4037';
        return `
        <div class="bg-white border-[2px] rounded-xl p-4 mb-3 cursor-pointer hover:bg-gray-50 flex flex-col gap-1 shrink-0" style="border-color:${theme}" onclick="openSmartLink('${up.url}')">
            <div class="font-bold text-[15px] mb-2 text-gray-800 break-words leading-snug">${up.title}</div>
            <div class="flex justify-between items-end">
                <span class="text-[12px] font-bold text-white px-2.5 py-1 rounded-md" style="background-color: ${theme}">${up.member}</span>
                <span class="text-[12px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">${up.deadline ? '마감: ' + up.deadline : '마감일 없음'}</span>
            </div>
        </div>
        `;
    }).join('');

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

    if(!upHtml) upHtml = `<div class="text-center text-gray-400 font-bold mt-10 text-[15px]">등록된 UP 링크가 없습니다.</div>`;
    if(!rollingHtml) rollingHtml = `<div class="text-center text-gray-400 font-bold mt-10 text-[15px]">진행중인 롤링페이퍼가 없습니다.</div>`;

    const noticeLinks = dynamicLinks['공지'] || [];
    let noticeHtml = '';
    if (noticeLinks.length > 0) {
        noticeHtml = `<div class="w-full flex justify-end mt-4 pt-4 border-t-2 border-dashed border-gray-300 shrink-0">`;
        noticeLinks.forEach(link => {
            noticeHtml += `<button onclick="openSmartLink('${link.url}')" class="border-[2.5px] border-red-500 text-red-500 bg-white font-bold px-5 py-2.5 rounded-xl hover:bg-red-50 hover:-translate-y-0.5 transition-all ml-2 font-paperozi shadow-sm flex items-center gap-2"><i class="fi fi-rr-bullhorn"></i> ${link.title}</button>`;
        });
        noticeHtml += `</div>`;
    }

    list.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6 w-full">
            ${popupImgHtml}
            <div class="flex-1 flex flex-col overflow-y-auto max-h-[65vh] w-full ${leftWidthClass} pr-2 modal-scroll">
                <div class="flex flex-col gap-6 w-full">
                    <div class="flex flex-col w-full">
                        <div class="text-[20px] font-bold text-[#5D4037] mb-4 border-b-2 border-dashed border-gray-300 pb-2 font-paperozi flex items-center gap-2 shrink-0">
                            <i class="fi fi-rr-arrow-up-right"></i> UP 해줘!
                        </div>
                        <div class="flex flex-col">
                            ${upHtml}
                        </div>
                    </div>
                    <div class="flex flex-col w-full">
                        <div class="text-[20px] font-bold text-[#5D4037] mb-4 border-b-2 border-dashed border-gray-300 pb-2 font-paperozi flex items-center gap-2 shrink-0">
                            <i class="fi fi-rr-envelope"></i> 롤링페이퍼
                        </div>
                        <div class="flex flex-col">
                            ${rollingHtml}
                        </div>
                    </div>
                </div>
                ${noticeHtml}
            </div>
        </div>
    `;
    document.getElementById('upPopupOverlay').classList.remove('hidden');
}

function closeUpPopup(forceClose = false) {
    if (!forceClose && document.getElementById('noMorePopup').checked) {
        localStorage.setItem('upPopupClosedDate', getTodayYYYYMMDD());
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
    // embed 모드: 탭 렌더 생략
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
                dropdownHtml = links.map(link => `
                    <a href="#" onclick="openSmartLink('${link.url}'); event.preventDefault();" class="block px-4 py-2 text-[14.5px] font-bold text-gray-700 hover:bg-gray-100 hover:text-[${hoverColor}] transition-colors text-center border-b border-gray-100">${link.title}</a>
                `).join('');
            }
            
            html += `
                <div class="relative group flex items-center">
                    <button class="font-paperozi px-4 py-2.5 text-lg bg-transparent border-2 border-transparent text-[#5D4037] font-bold rounded-lg hover:border-[${hoverColor}] hover:text-[${hoverColor}] transition-all duration-200 flex items-center justify-center" ${clickAction}>${btnContent}</button>
                    <div class="absolute left-1/2 -translate-x-1/2 top-full pt-1 w-36 hidden group-hover:block z-[2000]">
                        <div class="bg-white flex flex-col shadow-xl rounded-xl border-2 border-[#5D4037] overflow-hidden py-1">
                            ${mainLinkHtml}
                            ${dropdownHtml}
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
            const isActive = (currentPage === tab) || (currentPage === '롤링페이퍼' && tab === '더보기') || (currentPage === '업보정리' && tab === '더보기');
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
                    <button onclick="openLinkModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">링크관리</button>
                    <button onclick="openInfoModal()" class="px-4 py-3 text-left font-bold text-[#5D4037] font-paperozi hover:bg-gray-100 border-b border-gray-100">정보관리</button>
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
                    <button onclick="openLinkModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">링크관리</button>
                    <button onclick="openInfoModal()" class="px-3 py-2 text-left font-bold text-[#5D4037] text-sm font-paperozi hover:bg-gray-100 border-b border-gray-100">정보관리</button>
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

async function openLinkModal() {
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
    
    document.getElementById('linkModal').classList.replace('hidden', 'flex');
    ['desktopProfileMenu', 'mobileProfileMenu'].forEach(id => {
        const pMenu = document.getElementById(id);
        if(pMenu) { pMenu.classList.remove('flex'); pMenu.classList.add('hidden'); }
    });
    renderPopupImgCurrentInfo();
}
function closeLinkModal() { document.getElementById('linkModal').classList.replace('flex', 'hidden'); }

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

    if(!title || !url) return alert('제목과 링크를 입력하세요.');
    
    const newUp = { member, title, url, deadline, timestamp: Date.now() };
    try {
        const docRef = await addDoc(collection(db, 'uplinks'), newUp);
        upLinksList.push({ id: docRef.id, source: 'uplinks', ...newUp });
        alert('업링크가 추가되었습니다.');
        document.getElementById('upTitle').value = ''; 
        document.getElementById('upUrl').value = ''; 
        document.getElementById('upDeadline').value = '';
        if(sidePanelMode === 'UP') renderUpLinksPanel(); 
    } catch(e) { console.error(e); }
}

async function deleteUpLink(upId, source = 'uplinks') {
    if(!confirm('이 업링크를 삭제하시겠습니까?')) return;
    try {
        const colName = source === 'soop' ? 'soop_posts' : 'uplinks';
        await deleteDoc(doc(db, colName, upId));
        
        upLinksList = upLinksList.filter(u => u.id !== upId);
        if(sidePanelMode === 'UP') renderUpLinksPanel();
    } catch(e) { console.error(e); }
}

function toggleUpPanel() {
    if (sidePanelMode === 'UP') closeSidePanel();
    else openSidePanel('UP');
}
function toggleMemoPanel() {
    if (sidePanelMode === 'MEMO') closeSidePanel();
    else openSidePanel('MEMO');
}

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
    
    if (mode === 'MEMO') {
        const memos = memoList[currentPage] || [];
        const contentHtml = memos.map(memo => `
            <div class="bg-white p-4 rounded-xl border-[2.5px] border-[#5D4037] relative shadow-sm mb-4 cursor-pointer hover:bg-gray-50 transition" 
                 oncontextmenu="if(typeof isAdmin !== 'undefined' && isAdmin) { event.preventDefault(); event.stopPropagation(); window.openMemoEditModal('${memo.id}'); }">
                ${isAdmin ? `<button onclick="deleteMemo('${memo.id}')" class="absolute top-2 right-2 text-[#5D4037] hover:text-red-500 font-bold p-1 z-10"><i class="fi fi-br-cross-small"></i></button>` : ''}
                <div class="text-[13px] font-bold text-gray-500 mb-2 pointer-events-none">${memo.date || ''}</div>
                <div class="text-[16px] font-medium text-[#5D4037] whitespace-pre-wrap leading-relaxed pointer-events-none">${memo.content}</div>
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
                <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                    <i class="fi fi-rr-edit"></i> ${currentPage} 메모장
                </div>
                <div class="flex items-center gap-3">
                    ${isAdmin ? `<button onclick="openMemoAddModal()" class="w-9 h-9 flex items-center justify-center bg-[#5D4037] text-white rounded-full font-bold hover:brightness-110 shadow-sm transition"><i class="fi fi-br-plus"></i></button>` : ''}
                    <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
                </div>
            </div>
            <div class="flex-1 p-5 bg-[#FFFDF5] overflow-y-auto modal-scroll w-full">
                ${contentHtml || '<div class="text-center text-gray-400 font-bold mt-16 text-lg">저장된 메모가 없습니다.</div>'}
            </div>
        `;
    } else if (mode === 'UP') {
        renderUpLinksPanel();
    }

    requestAnimationFrame(() => {
        if(isMobile) {
            panel.classList.remove('translate-y-full', 'opacity-0'); panel.classList.add('translate-y-0', 'opacity-100');
        } else {
            panel.classList.remove('h-0', 'opacity-0'); panel.classList.add('h-[890px]', 'opacity-100');
        }
    });
}

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
        btnContainer.className = "flex gap-3 w-full mt-4"; 
        btnContainer.innerHTML = `
            <button type="button" onclick="closeMemoModal()" class="flex-1 bg-gray-400 text-white font-bold text-[18px] py-4 rounded-xl hover:bg-gray-500 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] font-paperozi cursor-pointer">
                취소
            </button>
            <button type="button" onclick="saveMemoAction()" class="flex-1 bg-[#5D4037] text-white font-bold text-[18px] py-4 rounded-xl hover:brightness-110 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] font-paperozi cursor-pointer">
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
        if (sidePanelMode === 'MEMO') openSidePanel('MEMO');
    } catch(e) { console.error('메모 삭제 실패:', e); }
}

function renderUpLinksPanel() {
    const panel = document.getElementById('sideExpansionPanel');
    const sorted = [...upLinksList].sort((a, b) => {
        if (a.deadline && b.deadline) {
            if (a.deadline === b.deadline) return (a.timestamp || 0) - (b.timestamp || 0);
            return a.deadline < b.deadline ? -1 : 1;
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        return (a.timestamp || 0) - (b.timestamp || 0);
    });

    let upCardsHtml = sorted.map(up => {
        const theme = themeColors[up.member] || '#5D4037';
        
        const deleteBtn = (isAdmin && loggedInUser.name === up.member) ? 
            `<button onclick="event.stopPropagation(); deleteUpLink('${up.id}', '${up.source || 'uplinks'}')" class="text-red-500 hover:text-red-700 ml-2 font-bold z-20 absolute top-2 right-2"><i class="fi fi-br-cross-small"></i></button>` : '';
            
        const contextAttr = isAdmin ? `oncontextmenu="event.preventDefault(); window.openEditUpLink('${up.id}', '${up.source || 'uplinks'}');"` : '';
            
        return `
            <div class="relative w-full border-[3px] rounded-xl p-5 mb-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-[2px] cursor-pointer bg-white shrink-0" 
                 style="border-color: ${theme}; border-left-width: 8px;"
                 onclick="openSmartLink('${up.url}')"
                 ${contextAttr}>
                ${deleteBtn}
                <div class="text-[17px] font-bold font-paperozi mb-4 text-gray-800 break-words pr-6 leading-snug">${up.title}</div>
                <div class="flex justify-between items-end">
                    <span class="text-[12px] font-bold text-white px-2.5 py-1 rounded-md" style="background-color: ${theme}">${up.member}</span>
                    ${up.deadline ? `<span class="text-[13px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">마감: ${up.deadline}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    if(upLinksList.length === 0) { upCardsHtml = `<div class="text-center text-gray-400 font-bold mt-16 text-lg">등록된 UP 링크가 없습니다.</div>`; }

    panel.innerHTML = `
        <div class="p-6 border-b-[4px] border-[#5D4037] bg-white flex justify-between items-center shadow-sm z-10 shrink-0">
            <div class="text-[22px] font-bold text-[#5D4037] font-paperozi flex items-center gap-2">
                <i class="fi fi-rr-arrow-up-right"></i> UP 해줘!
            </div>
            <button onclick="closeSidePanel()" class="text-3xl text-[#5D4037] hover:text-red-500 cursor-pointer"><i class="fi fi-rr-cross-small"></i></button>
        </div>
        <div class="flex-1 p-5 bg-[#FFFDF5] overflow-y-auto modal-scroll">
            ${upCardsHtml}
        </div>
    `;
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

async function loadSchedulesFromFirebase() {
    try {
        const eventPromises = Object.entries(collectionMap).map(([member, colName]) => getDocs(collection(db, colName)).then(snapshot => ({ type: 'event', member, colName, snapshot })));
        const memoPromises = Object.entries(memoCollectionMap).map(([member, colName]) => getDocs(collection(db, colName)).then(snapshot => ({ type: 'memo', member, colName, snapshot })));
        
        const results = await Promise.all([...eventPromises, ...memoPromises]);
        scheduleList = [];
        memoList = { '달타':[], '다룽':[], '최또':[], '카나시':[] };
        
        results.forEach(({ type, member, colName, snapshot }) => {
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (type === 'memo') {
                    if(!memoList[member]) memoList[member] = [];
                    memoList[member].push({ id: doc.id, collectionName: colName, ...data });
                } else {
                    scheduleList.push({ id: doc.id, collectionName: colName, ...data });
                }
            });
        });

        scheduleList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        for(let m in memoList) {
            memoList[m].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        const smSnap = await getDocs(collection(db, 'scheduleMembers'));
        customMembers = [];
        smSnap.forEach(doc => customMembers.push({ id: doc.id, ...doc.data() }));

        const topicSnap = await getDocs(collection(db, 'rollingTopics'));
        rollingTopics = [];
        topicSnap.forEach(doc => rollingTopics.push({ id: doc.id, ...doc.data() }));
        sortRollingTopics();

        const entrySnap = await getDocs(collection(db, 'rollingEntries'));
        rollingEntries = [];
        entrySnap.forEach(doc => rollingEntries.push({ id: doc.id, ...doc.data() }));
        rollingEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // 업보데이터 로드
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

        renderHeaderTabs(); 
        render();
    } catch (e) { console.error("데이터 불러오기 실패:", e); }
}

function changeTab(tabName) {
    // embed 모드: 탭 전환 차단
    const _embedP = new URLSearchParams(window.location.search);
    if (_embedP.get('mode') === 'embed') return;

    if (tabName.startsWith('업보정리')) {
        currentPage = '업보정리';
        if (tabName.includes('_')) {
            upboCurrentMember = tabName.split('_')[1];
        }
        const m2e = {'달타':'dalta', '다룽':'darung', '최또':'choiagain', '카나시':'kanashi'};
        window.location.hash = '#list' + m2e[upboCurrentMember];
    } else {
        currentPage = tabName; 
        if (tabToHash[tabName]) { window.location.hash = tabToHash[tabName]; }
    }
    
    if (!isMobile) {
        if(currentPage === '홈') { sidePanelMode = 'UP'; openSidePanel('UP'); } 
        else { closeSidePanel(true); }
    } else {
        closeSidePanel(true);
    }
    
    homeTargetDate = new Date();
    individualTargetDate = new Date();
    
    currentRollingTopic = null;
    
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
    document.body.style.backgroundColor = tabBackgrounds[currentPage] || '#ffdddd';
    document.documentElement.style.setProperty('--theme-color', themeColors[currentPage === '업보정리' ? upboCurrentMember : currentPage] || '#8B5CF6');
    document.body.className = document.body.className.replace(/theme-\S+/g, '');
    document.body.classList.add('theme-' + (currentPage === '업보정리' ? 'rolling' : currentPage));
    
    const mBtnContainer = document.getElementById('mobileHeaderRightBtn');
    const dBtnContainer = document.getElementById('dynamicSideBtn');
    
    const mobileUpBtnHtml = `<button onclick="toggleUpPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-arrow-up-right"></i> UP</button>`;
    const mobileMemoBtnHtml = `<button onclick="toggleMemoPanel()" class="px-3 py-[6px] bg-[#f3f4f6] text-[#5D4037] font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-gray-200"><i class="fi fi-rr-edit"></i> 메모</button>`;
    const desktopUpBtnHtml = `<button onclick="toggleUpPanel()" class="w-[100px] h-[75px] bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[15px] cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 border-[#5D4037]"><i class="fi fi-rr-arrow-up-right text-xl"></i>UP</button>`;
    const desktopMemoBtnHtml = `<button onclick="toggleMemoPanel()" class="w-[100px] h-[75px] bg-white text-[#5D4037] font-bold rounded-xl hover:bg-[#5D4037] hover:text-white transition-all shadow-sm font-paperozi text-[15px] cursor-pointer flex flex-col items-center justify-center gap-0.5 border-2 border-[#5D4037]"><i class="fi fi-rr-edit text-xl"></i>메모</button>`;    
    const mobileRollingBtnHtml = isAdmin ? `<button onclick="openRollingTopicModal()" class="px-3 py-[6px] bg-purple-100 text-purple-700 font-bold rounded-lg transition-all shadow-sm font-paperozi text-[14px] cursor-pointer flex items-center gap-1 border border-purple-300 hover:bg-purple-200"><i class="fi fi-br-plus"></i> 주제추가</button>` : '';
    const desktopRollingBtnHtml = isAdmin ? `<button onclick="openRollingTopicModal()" class="px-6 py-2.5 bg-purple-50 text-purple-700 font-bold rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-sm font-paperozi text-[18px] cursor-pointer flex items-center gap-2 border-2 border-purple-200"><i class="fi fi-br-plus"></i> 주제 추가</button>` : '';

    if (mBtnContainer) {
        if (currentPage === '홈') mBtnContainer.innerHTML = mobileUpBtnHtml;
        else if (currentPage === '롤링페이퍼') mBtnContainer.innerHTML = mobileRollingBtnHtml; 
        else if (currentPage === '업보정리') mBtnContainer.innerHTML = ''; // 업보정리 탭에서는 버튼 숨김
        else mBtnContainer.innerHTML = mobileMemoBtnHtml;
    }
    if (dBtnContainer) {
        if (currentPage === '홈') dBtnContainer.innerHTML = desktopUpBtnHtml;
        else if (currentPage === '롤링페이퍼') dBtnContainer.innerHTML = desktopRollingBtnHtml; 
        else if (currentPage === '업보정리') dBtnContainer.innerHTML = ''; // 업보정리 탭에서는 버튼 숨김
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
    } else {
        if (isMobile) {
            if (currentPage === '홈') renderMobileHome(grouped);
            else renderMobileIndividual(grouped);
        } else {
            if (currentPage === '홈') renderDesktopHome(grouped);
            else renderDesktopIndividual(grouped);
        }
    }
}

// =========================================================================
// 업보정리 (토글 함수)
// =========================================================================
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

    // 토글 버튼 HTML (관리자에게만 보임)
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
    mainHtml += toggleBtnHtml; // 토글 버튼 삽입
    
    // 모드에 따라 타이틀 변경
    const titleText = (isAdmin && upboViewMode === 'admin') ? '업보 데이터 관리' : '업보정리 조회';
    mainHtml += `<h2 class="text-[28px] lg:text-3xl font-bold text-[#5D4037] font-paperozi text-center mb-6 pt-12 md:pt-0"><i class="fi fi-rr-box-open"></i> ${titleText}</h2>`;
    
    mainHtml += tabsHtml;

    if (upboViewMode === 'search' || !isAdmin) {
        // 검색창 뷰어
        mainHtml += `
            <div class="max-w-2xl mx-auto mb-10">
                <div class="flex gap-2">
                    <input type="text" id="upboSearchInput" class="flex-1 border-[2.5px] border-[#5D4037] rounded-xl p-4 text-[17px] font-bold outline-none focus:border-[var(--theme-color)]" placeholder="닉네임 또는 아이디를 입력하세요" onkeypress="if(event.key==='Enter') searchUpbo()">
                    <button onclick="searchUpbo()" class="px-6 py-4 text-white font-bold rounded-xl hover:brightness-110 shadow-sm whitespace-nowrap text-[17px] font-paperozi" style="background-color:${themeColor};"><i class="fi fi-rr-search"></i> 검색</button>
                </div>
                <div id="upboSearchResult" class="mt-8"></div>
            </div>
        `;
    } else if (isAdmin && upboViewMode === 'admin') {
        // 관리자 표 수정
        mainHtml += `
            <div class="mt-4 pt-4 border-t-[3px] border-dashed border-[#5D4037]">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h3 class="text-[22px] font-bold text-[#5D4037] font-paperozi"><i class="fi fi-rr-settings"></i> ${upboCurrentMember} 데이터 설정</h3>
                    <div class="flex gap-2 shrink-0">
                        <button onclick="addUpboProduct()" class="px-4 py-2.5 bg-blue-50 text-blue-700 font-bold font-paperozi rounded-xl hover:bg-blue-100 border-[2px] border-blue-200 shadow-sm whitespace-nowrap">+ 상품(열) 추가</button>
                        <button onclick="saveUpboData()" class="px-5 py-2.5 bg-[#5D4037] text-white font-bold font-paperozi rounded-xl hover:brightness-110 shadow-sm whitespace-nowrap"><i class="fi fi-rr-disk"></i> 저장하기</button>
                        <button onclick="copyUpboEmbedCode()" class="px-5 py-2.5 bg-white text-[#5D4037] font-bold font-paperozi rounded-xl hover:bg-[#5D4037] hover:text-white border-2 border-[#5D4037] shadow-sm whitespace-nowrap transition-all duration-200"><i class="fi fi-rr-share"></i> 퍼가기</button>
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
        <th class="p-3 border-r border-gray-200 min-w-[60px] text-[#5D4037] font-bold">닉네임</th>
        <th class="p-3 border-r border-gray-200 min-w-[60px] text-[#5D4037] font-bold">아이디</th>`;

    products.forEach((p, idx) => {
        thead += `<th class="px-1 py-2 border-r border-gray-200 w-[80px] max-w-[80px] relative group bg-[#f3f4f6]">
            <input type="text" class="w-full bg-transparent font-bold text-[#5D4037] outline-none upbo-product-header text-center text-[14px]" value="${p}" data-idx="${idx}" placeholder="상품명">
            <button onclick="removeUpboProduct(${idx})" class="absolute top-1/2 -translate-y-1/2 right-0.5 text-red-500 opacity-0 group-hover:opacity-100 bg-white rounded-full shadow-sm p-0.5"><i class="fi fi-br-cross-small"></i></button>
        </th>`;
    });

    thead += `<th class="p-3 border-r border-gray-200 w-[80px] text-[#5D4037] font-bold text-center">상태</th>
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
        <td class="p-2 border-r"><input type="text" class="outline-none bg-transparent upbo-nick font-bold text-[#5D4037]" style="min-width: 60px; width: ${(record.nickname || '닉네임').length + 2}ch; field-sizing: content;" oninput="this.style.width = (this.value.length || this.placeholder.length) + 2 + 'ch';" value="${record.nickname || ''}" placeholder="닉네임"></td>
        <td class="p-2 border-r"><input type="text" class="outline-none bg-transparent upbo-uid font-bold text-gray-500" style="min-width: 60px; width: ${(record.uid || '아이디').length + 2}ch; field-sizing: content;" oninput="this.style.width = (this.value.length || this.placeholder.length) + 2 + 'ch';" value="${record.uid || ''}" placeholder="아이디"></td>`;

    products.forEach((p, pIdx) => {
        const qty = record.items && record.items[p] ? record.items[p] : '';
        html += `<td class="px-1 py-2 border-r bg-[#f9fafb] w-[80px] max-w-[80px]"><input type="number" class="w-full outline-none bg-transparent text-center font-bold text-[#5D4037] upbo-qty" data-product-idx="${pIdx}" value="${qty}" placeholder="-"></td>`;
    });

    // 상태는 배송완료가 아니면 무조건 배송중으로 처리
    const currentStatus = (record.status === '배송완료') ? '배송완료' : '배송중';
    const sColor = currentStatus === '배송완료' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';
    
    // 클릭할 때마다 배송중 <-> 배송완료 토글되는 버튼 (값 저장 호환을 위해 input type="button" 사용)
    let sel = `<input type="button" class="w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status ${sColor}" value="${currentStatus}" onclick="this.value = this.value === '배송중' ? '배송완료' : '배송중'; this.className = this.value === '배송완료' ? 'w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status bg-green-100 text-green-700' : 'w-[90%] mx-auto block py-1 rounded font-bold text-[13px] cursor-pointer transition-colors upbo-status bg-purple-100 text-purple-700';">`;

    const linkBtn = `<button type="button" class="bg-blue-50 border border-blue-200 text-blue-600 font-bold w-full py-1 rounded text-[12px] hover:bg-blue-100 transition whitespace-nowrap shadow-sm" onclick="const uid = this.closest('tr').querySelector('.upbo-uid').value.trim(); if(uid) { window.open('https://www.sooplive.com/station/' + uid, '_blank'); } else { alert('아이디를 먼저 입력해주세요.'); }">바로가기</button>`;

    html += `<td class="p-2 border-r align-middle">${sel}</td>
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
        let items = {};
        tr.querySelectorAll('.upbo-qty').forEach((inp) => {
            const pIdx = inp.getAttribute('data-product-idx');
            const pName = newProducts[pIdx];
            const val = parseInt(inp.value, 10);
            if(pName && !isNaN(val) && val > 0) items[pName] = val;
        });
        if (nick || uid) {
            newRecords.push({ nickname: nick, uid: uid, items: items, status: status });
        }
    });

    if(!upboData[upboCurrentMember]) upboData[upboCurrentMember] = {products:[], records:[]};
    upboData[upboCurrentMember].products = newProducts;
    upboData[upboCurrentMember].records = newRecords;
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

function addUpboRow() {
    syncUpboDomToState();
    upboData[upboCurrentMember].records.push({ nickname:'', uid:'', items:{}, status:'배송중' });
    renderUpboAdminTable();
}

async function saveUpboData() {
    syncUpboDomToState();
    const dataToSave = upboData[upboCurrentMember];

    try {
        const memberToEng = {'달타':'dalta', '다룽':'darung', '최또':'choiagain', '카나시':'kanashi'};
        const docId = memberToEng[upboCurrentMember];
        await setDoc(doc(db, 'upboData', docId), dataToSave);
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
        resultContainer.innerHTML = `<div class="text-center text-red-500 font-bold bg-red-50 p-4 rounded-xl border-2 border-red-200">닉네임 또는 아이디를 입력해주세요!</div>`;
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
                if(r.items[p] > 0) {
                    totalItems += r.items[p];
                    itemsHtml += `
                        <div class="flex justify-between items-center bg-white border-[2px] border-gray-100 p-4 rounded-xl shadow-sm hover:border-[#5D4037] transition">
                            <span class="font-bold text-gray-700 text-[16px]">${p}</span>
                            <span class="font-black text-[18px] text-[#5D4037] bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">${r.items[p]} 개</span>
                        </div>`;
                }
            });
        }
        
        if (totalItems === 0) {
            itemsHtml = `<div class="text-gray-400 font-bold text-center py-6 bg-gray-50 rounded-xl border border-dashed">주문된 상품이 없습니다.</div>`;
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
                schedulesHtml = `<div class="schedule-card hubang h-full flex items-center justify-center w-full overflow-hidden relative" style="color:#9CA3AF; background-color:#F3F4F6; padding:0; border-radius: 12px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2);" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="휴방"></div>`;
            } else {
                const borderColor = rowBorderColors[i];
                const bgColor = cardBgColors[member.name] || '#FFF5F5';
                schedulesHtml = `<div class="schedule-card h-full w-full flex items-center justify-center overflow-hidden relative" style="color: ${borderColor}; background-color: ${bgColor}; padding:0; border-radius: 12px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.2);" onclick="openAllSchedulesModal(event, '${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}', '${member.name}')"><img src="${imgSrc}" class="w-full h-full object-cover" alt="뱅온">${dayGlobalTime ? `<div class="absolute bottom-1 right-1.5 text-[14px] font-black tracking-tight" style="color: ${rowBorderColors[i]}; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0px 2px 3px rgba(0,0,0,0.3);">${dayGlobalTime}</div>` : ''}</div>`;
            }
        } else {
            schedulesHtml = `<div class="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50"><span class="text-gray-400 text-[15px] font-bold">일정 없음</span></div>`;
        }

        const borderColor = rowBorderColors[i];
        
        html += `
            <div class="flex w-full bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-[2.5px] overflow-hidden" style="border-color: ${borderColor}">
                <div class="w-1/2 aspect-square border-r-[2.5px] relative cursor-pointer p-0 shrink-0" style="border-color: ${borderColor}" onclick="openSmartLink('${member.link}')">
                    <img src="${member.img}" class="w-full h-full object-cover">
                </div>
                <div class="w-1/2 aspect-square p-2 flex flex-col justify-center gap-2 bg-[#FFFDF5] overflow-y-auto" onclick="handleDayClick(${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')" oncontextmenu="handleDayRightClick(event, ${d.getFullYear()}, ${d.getMonth()+1}, ${d.getDate()}, '${member.name}')">
                    ${schedulesHtml}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    content.innerHTML = html;
    content.className = 'shrink-0 transition-all duration-300 w-full max-w-[600px] mx-auto pb-6';
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

        homeHtml += `<div class="week-row row-${i+1}"><div class="profile-cell" ${member.link ? `onclick="openSmartLink('${member.link}')"` : ''}><img src="${member.img}" alt="${member.name}" style="width: 100%; height: 100%; object-fit: cover;"></div><div class="days-container">${daysCellsHtml}</div></div>`;
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
        <div class="schedule-input-block border-2 border-[#5D4037] p-5 rounded-xl bg-white relative shadow-sm pretendard mt-1">
            ${moveBtnsHtml} <input type="hidden" class="sch-id" value="${id}">
            
            <div class="mb-4 pr-20"> 
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">일정 제목</label>
                <input type="text" class="sch-title w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none focus:border-[var(--theme-color)] text-[15px] font-medium" placeholder="일정 제목 입력" value="${title}">
            </div>
            
            <div class="mb-4">
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">날짜</label>
                <div class="flex items-center gap-2">
                    <input type="date" class="sch-start flex-1 border-2 border-[#5D4037] rounded-lg p-2 outline-none text-[14px] font-medium" value="${sDate}">
                    <span class="font-bold text-[#5D4037]">~</span>
                    <input type="date" class="sch-end flex-1 border-2 border-[#5D4037] rounded-lg p-2 outline-none text-[14px] font-medium" value="${eDate}">
                </div>
            </div>

            <div class="flex gap-4 mb-4">
                <div class="flex-1">
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">시간 (선택)</label>
                    <div class="flex items-center justify-between border-2 border-[#5D4037] rounded-lg p-1.5 bg-white">
                        <button type="button" class="sch-ampm ampm-btn px-2.5 py-1 font-bold text-[#5D4037] rounded-md text-[13px]" onclick="toggleAmpm(this)">${ampm}</button>
                        <input type="number" min="1" max="12" class="sch-hh w-[38px] p-1 text-center font-bold text-[#5D4037] outline-none text-[15px]" placeholder="시" value="${hh}">
                        <span class="font-bold text-[#5D4037]">:</span>
                        <input type="number" min="0" max="59" class="sch-mm w-[38px] p-1 text-center font-bold text-[#5D4037] outline-none mr-1 text-[15px]" placeholder="분" value="${mm}">
                    </div>
                </div>
                <div class="flex-1">
                    <label class="block text-[13px] text-gray-500 font-bold mb-1.5">유형</label>
                    <select class="sch-broad w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none text-[15px] bg-white font-bold text-[#5D4037] cursor-pointer">
                        <option value="개인방송" ${broad==='개인방송'?'selected':''}>개인방송</option>
                        <option value="합방" ${broad==='합방'?'selected':''}>합방</option>
                        <option value="시네티" ${broad==='시네티'?'selected':''}>시네티</option>
                        <option value="휴방" ${broad==='휴방'?'selected':''}>휴방</option>
                    </select>
                </div>
            </div>

            <div class="mb-4">
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">함께하는 멤버 / 크루 (선택)</label>
                <input type="text" class="sch-mem w-full border-2 border-[#5D4037] rounded-lg p-2.5 outline-none focus:border-[var(--theme-color)] text-[15px] font-medium" placeholder="멤버 혹은 크루 이름 띄어쓰기로 입력" value="${mem}">
            </div>

            <div class="mb-4">
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">이미지 첨부 (선택)</label>
                <div class="flex items-center gap-2">
                    <input type="file" accept="image/*" class="flex-1 text-[13px] cursor-pointer" onchange="window.handleScheduleImageUpload(this)">
                    <button type="button" class="sch-img-remove-btn ${removeBtnClass} px-3 py-1.5 bg-red-500 text-white rounded text-sm font-bold shadow-sm hover:bg-red-600 transition shrink-0" onclick="window.removeScheduleImage(this)">이미지 삭제</button>
                </div>
                <input type="hidden" class="sch-image-url" value="${imageUrl}">
                <div class="sch-img-preview">${imageUrl ? `<img src="${imageUrl}" class="h-20 w-auto rounded-lg object-cover border-2 border-gray-200 mt-2">` : ''}</div>
            </div>
            
            <div>
                <label class="block text-[13px] text-gray-500 font-bold mb-1.5">상세</label>
                <textarea class="sch-desc w-full border-2 border-[#5D4037] rounded-lg p-3 outline-none focus:border-[var(--theme-color)] text-[15px] resize-none h-[75px] font-medium" placeholder="상세 내용을 입력하세요">${desc}</textarea>
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
            
            let imgHtml = sch.imageUrl ? `<img src="${sch.imageUrl}" class="w-full max-h-[260px] object-contain rounded-xl my-3 shadow-sm border border-gray-200">` : '';

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
                                <img src="${m.imageUrl}" style="width:100%; height:100%; object-fit:${isCrew ? 'contain' : 'cover'};" onerror="this.src='https://via.placeholder.com/72'">
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

async function initApp() {
    adjustDesktopScale(); 
    await seedAdmins();

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
    
    await loadLinksFromFirebase();
    await loadPopupImagesFromFirebase();
    await loadSchedulesFromFirebase(); // 여기서 업보데이터도 함께 호출됩니다.
    
    if (!isMobile) {
        openSidePanel('UP'); 
    }
    
    const today = getTodayYYYYMMDD();

    // embed 모드: 팝업 차단, 업보정리 조회창 고정
    const embedParams = new URLSearchParams(window.location.search);
    const isEmbedMode = embedParams.get('mode') === 'embed';

    if (!isEmbedMode) {
        checkAndShowPopup(today);
    }

    // 라우팅 처리
    if (isEmbedMode) {
        // embed 모드: URL의 upbo 파라미터로 멤버 결정, 없으면 달타 기본
        const upboParam = embedParams.get('upbo');
        upboCurrentMember = upboParam || '달타';
        currentPage = '업보정리';
        upboViewMode = 'search'; // 관리자여도 조회창 고정
    } else {
    const currentHash = window.location.hash;
    if (currentHash && hashToTab[currentHash]) {
        let mapped = hashToTab[currentHash];
        if (mapped.startsWith('업보정리')) {
            currentPage = '업보정리';
            if(mapped.includes('_')) {
                upboCurrentMember = mapped.split('_')[1];
            }
        } else {
            currentPage = mapped;
        }
    } else {
        currentPage = '홈';
    }
    }
    
    if (isEmbedMode) {
        // embed 모드: changeTab 우회하여 바로 렌더
        renderHeaderTabs();
        render();
    } else {
    changeTab(currentPage === '업보정리' ? `업보정리_${upboCurrentMember}` : currentPage);
    }
}

window.openEditUpLink = async function(id, source) {
    const upItem = upLinksList.find(u => u.id === id);
    if (!upItem) {
        alert("데이터를 찾을 수 없습니다.");
        return;
    }
    const newTitle = prompt("제목을 수정하세요:", upItem.title);
    if (newTitle === null) return;
    const newDeadline = prompt("마감 날짜를 수정하세요 (YYYY-MM-DD):", upItem.deadline || "");
    if (newDeadline === null) return;

    try {
        const colName = source === 'soop' ? 'soop_posts' : 'uplinks';
        const docRef = doc(db, colName, id);
        
        await updateDoc(docRef, { 
            title: newTitle, 
            deadline: newDeadline 
        });

        upItem.title = newTitle;
        upItem.deadline = newDeadline;
        renderUpLinksPanel();
        alert("수정되었습니다.");
    } catch (e) {
        console.error("수정 실패:", e);
        alert("수정에 실패했습니다.");
    }
};

window.openMemberManageModal = function() {
    if(!isAdmin) return;
    renderCustomMembersList();
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
        const docRef = await addDoc(collection(db, 'scheduleMembers'), newMem);
        customMembers.push({ id: docRef.id, ...newMem });
        
        document.getElementById('newMemberNickname').value = '';
        document.getElementById('newMemberSoopId').value = '';
        document.getElementById('newMemberImageUrl').value = '';
        renderCustomMembersList();
    } catch(e) { console.error(e); alert('추가 실패'); }
};

window.parseMembers = function(tagString) {
    if (!tagString) return [];
    const names = tagString.split(/[, ]+/).filter(n => n.trim() !== '');
    return names.map(name => {
        const found = customMembers.find(m => m.nickname === name);
        if (found) {
            return { 
                ...found, 
                nickname: found.isCrew ? '' : found.nickname 
            };
        }
        const def = members.find(m => m.name === name);
        return def ? { nickname: def.name, imageUrl: def.img, isCrew: false } : { nickname: name, imageUrl: 'https://via.placeholder.com/60', isCrew: false };
    });
};

window.deleteCustomMember = async function(id) {
    if(!confirm("이 멤버를 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, 'scheduleMembers', id));
        customMembers = customMembers.filter(m => m.id !== id);
        renderCustomMembersList();
        render();
    } catch(e) { console.error(e); }
};

window.renderCustomMembersList = function() {
    const container = document.getElementById('customMembersList');
    container.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
            ${customMembers.map(m => `
                <div class="flex flex-col items-center bg-white border-2 border-gray-200 p-2 rounded-xl shadow-sm relative w-full box-border">
                    <button onclick="deleteCustomMember('${m.id}')" class="absolute top-1 right-1 text-red-400 hover:text-red-600 transition p-1">
                        <i class="fi fi-br-cross-small text-[10px]"></i>
                    </button>
                    <img src="${m.imageUrl}" class="w-12 h-12 rounded-full object-cover border border-[#5D4037] mb-1.5" onerror="this.src='https://via.placeholder.com/40'">
                    <div class="text-center w-full overflow-hidden">
                        <div class="font-bold text-[11px] text-[#5D4037] truncate px-1">${m.nickname}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
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

// script.js 파일 맨 끝에 추가
window.copyEmbedCode = function() {
    // 현재 접속 중인 주소를 기반으로 임베드 주소 생성
    const currentUrl = window.location.origin + window.location.pathname;
    const embedUrl = `${currentUrl}?mode=embed#listdalta`;
    
    // iframe 코드 생성
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700px" style="border: none;" sandbox="allow-scripts allow-same-origin"></iframe>`;
    
    // 클립보드 복사
    navigator.clipboard.writeText(iframeCode).then(() => {
        alert("게시글용 임베드 코드가 복사되었습니다!");
    }).catch(err => {
        console.error('복사 실패:', err);
    });
};

// 업보데이터 관리표 퍼가기 함수
window.copyUpboEmbedCode = function() {
    const currentUrl = window.location.origin + window.location.pathname;
    // 현재 선택된 멤버 탭 정보 포함
    const memberParam = typeof upboCurrentMember !== 'undefined' && upboCurrentMember
        ? `&upbo=${encodeURIComponent(upboCurrentMember)}`
        : '&upbo=달타';
    const embedUrl = `${currentUrl}?mode=embed${memberParam}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700px" style="border:none; border-radius:16px;" sandbox="allow-scripts allow-same-origin"></iframe>`;

    navigator.clipboard.writeText(iframeCode).then(() => {
        // 버튼 피드백
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
        // 클립보드 API 실패 시 프롬프트로 fallback
        prompt('아래 코드를 복사하세요:', iframeCode);
    });
};

// 앱 실행
initApp();