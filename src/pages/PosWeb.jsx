import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Store as StoreIcon, Play, Pause, Square, AlertTriangle, Clock, Settings, List, Image as ImageIcon, Briefcase, Bell, FilePlus2, XCircle } from 'lucide-react';
import { STATUS_TYPES } from '../constants/status';
import StatusBadge from '../components/common/StatusBadge';
import StoreMenuPanel from '../components/menus/StoreMenuPanel';
import { logout as logoutRequest } from '../lib/auth';
import { unlinkOwnerStore } from '../lib/storeMenus';
import { clearAuthSession, getCurrentUser, getRefreshToken } from '../lib/session';
import {
  createOwnerStoreApplication,
  createOwnerStoreClosureRequest,
  fetchLatestOwnerStoreClosureRequest,
  fetchMyOwnerStoreApplications,
  fetchMyOwnerStores,
  updateOwnerStoreProfile,
  updateOwnerStoreStatus,
} from '../lib/owner';
import { stripPlaceholderImageUrls, uploadFiles } from '../lib/files';
import { resolveBrowserImageUrls } from '../lib/imageUrls';
import { resolveStoreClosureUiState } from '../lib/storeContracts';
import { getApplicationStatusMeta } from '../lib/ownerApplicationUi';
import styles from './PosWeb.module.css';

const DEFAULT_STORE_IMAGES = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1546702958-692ab629c4ba?auto=format&fit=crop&w=400&q=80',
];
const MAX_OWNER_IMAGES = 10;

export default function PosWeb() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [linkedStores, setLinkedStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationError, setApplicationError] = useState('');
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [closureRequestReason, setClosureRequestReason] = useState('');
  const [closureRequestError, setClosureRequestError] = useState('');
  const [isSubmittingClosureRequest, setIsSubmittingClosureRequest] = useState(false);
  const [closureRequestApiAvailable, setClosureRequestApiAvailable] = useState(true);
  const [latestClosureRequest, setLatestClosureRequest] = useState(null);
  
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD', 'APPLICATION_CREATE', 'APPLICATION'
  const [applicationForm, setApplicationForm] = useState({
    storeName: '',
    businessNumber: '',
    representativeName: '',
    businessOpenDate: '',
    businessAddress: '',
    businessPhone: '',
    businessLicenseFile: null,
  });

  const selectedStore = linkedStores.find((store) => store.storeId === selectedStoreId) || linkedStores[0] || null;
  
  const [storeStatus, setStoreStatus] = useState(STATUS_TYPES.STORE.CLOSED);
  const closureUiState = resolveStoreClosureUiState(selectedStore || {}, latestClosureRequest);
  const [ownerComment, setOwnerCommentState] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [breakStart, setBreakStart] = useState('15:00');
  const [breakEnd, setBreakEnd] = useState('17:00');
  
  const [storeImages, setStoreImagesState] = useState([]);
  const [imageUploadError, setImageUploadError] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const displayStoreImages = storeImages.length > 0 ? storeImages : DEFAULT_STORE_IMAGES;
  const hasCustomStoreImages = storeImages.length > 0;
  const [history, setHistory] = useState([]);

  const refreshOwnerData = async () => {
    const [stores, apps] = await Promise.all([fetchMyOwnerStores(), fetchMyOwnerStoreApplications()]);
    setLinkedStores(stores);
    setSelectedStoreId((current) => {
      if (current && stores.some((store) => store.storeId === current)) {
        return current;
      }
      return stores[0]?.storeId ?? null;
    });
    setApplications(apps);
    return stores;
  };

  useEffect(() => {
    const now = new Date();
    setHistory([{ status: STATUS_TYPES.STORE.CLOSED, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), msg: 'PC 관리자 패널 시작' }]);
    
    let ignore = false;
    async function loadData() {
      try {
        const [stores, apps] = await Promise.all([fetchMyOwnerStores(), fetchMyOwnerStoreApplications()]);
        if (!ignore) {
          setLinkedStores(stores);
          setSelectedStoreId(stores[0]?.storeId ?? null);
          setApplications(apps);
        }
      } catch (err) {
        if (!ignore) console.error(err);
      }
    }
    loadData();
    return () => ignore = true;
  }, []);

  const handleUnlinkStore = async () => {
    if (!selectedStore) {
      return;
    }

    if (!window.confirm(`"${selectedStore.storeName}" 연결을 해제하시겠습니까?`)) {
      return;
    }

    try {
      await unlinkOwnerStore(selectedStore.storeId);
      await refreshOwnerData();
      alert('매장 연결이 해제되었습니다.');
    } catch (error) {
      alert(error.message || '매장 연결 해제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitClosureRequest = async () => {
    if (!selectedStore) {
      return;
    }

    const closureState = resolveStoreClosureUiState(selectedStore, latestClosureRequest);
    if (closureState.duplicateRequestBlocked) {
      setClosureRequestError('이미 운영 종료 요청이 접수되어 있습니다.');
      return;
    }

    if (!window.confirm(`"${selectedStore.storeName}"의 운영 종료 요청을 제출하시겠습니까?`)) {
      return;
    }

    setIsSubmittingClosureRequest(true);
    setClosureRequestError('');

    try {
      const response = await createOwnerStoreClosureRequest(selectedStore.storeId, closureRequestReason);
      setLatestClosureRequest(response);
      setClosureRequestReason(response?.reason || closureRequestReason);
      setClosureRequestApiAvailable(true);
      await refreshOwnerData();
      alert('운영 종료 요청이 접수되었습니다.');
    } catch (error) {
      setClosureRequestError(error.message || '운영 종료 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingClosureRequest(false);
    }
  };

  useEffect(() => {
    if (selectedStore) {
      setStoreStatus(selectedStore.liveBusinessStatus);
      setOwnerCommentState(selectedStore.ownerNotice || '');
      setStoreImagesState(resolveBrowserImageUrls(stripPlaceholderImageUrls(selectedStore.imageUrls || [], DEFAULT_STORE_IMAGES)).slice(0, MAX_OWNER_IMAGES));
      setImageUploadError('');
      setOpenTime(selectedStore.openTime || '09:00');
      setCloseTime(selectedStore.closeTime || '21:00');
      setBreakStart(selectedStore.breakStart || '15:00');
      setBreakEnd(selectedStore.breakEnd || '17:00');
    }
  }, [selectedStore]);

  useEffect(() => {
    let ignore = false;

    async function loadClosureRequestState() {
      if (!selectedStore) {
        setLatestClosureRequest(null);
        setClosureRequestApiAvailable(true);
        return;
      }

      const storeClosureState = resolveStoreClosureUiState(selectedStore);
      setLatestClosureRequest(storeClosureState.request);
      setClosureRequestReason(storeClosureState.requestReason || '');

      if (storeClosureState.requestStatus && storeClosureState.requestReason) {
        setClosureRequestApiAvailable(true);
        return;
      }

      try {
        const latestRequest = await fetchLatestOwnerStoreClosureRequest(selectedStore.storeId);
        if (!ignore) {
          setLatestClosureRequest(latestRequest);
          setClosureRequestReason(latestRequest?.reason || '');
          setClosureRequestApiAvailable(true);
        }
      } catch (error) {
        if (!ignore) {
          setLatestClosureRequest(null);
          setClosureRequestApiAvailable(error.status !== 404);
        }
      }
    }

    loadClosureRequestState();

    return () => {
      ignore = true;
    };
  }, [selectedStore]);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch (error) {
        console.warn(error);
      }
    }
    clearAuthSession();
    navigate('/loginweb');
  };

  const logHistory = (status, msg) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory(prev => [{ status, time: timeStr, msg }, ...prev]);
  };

  const applyStatus = async (nextStatus, message) => {
    if (!selectedStore) return;
    setStatusError('');
    try {
      const updated = await updateOwnerStoreStatus(selectedStore.storeId, { status: nextStatus, comment: ownerComment });
      setStoreStatus(updated.liveBusinessStatus);
      logHistory(updated.liveBusinessStatus, message);
      const stores = await fetchMyOwnerStores();
      setLinkedStores(stores);
    } catch (err) {
      setStatusError(err.message || '상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const currentImages = stripPlaceholderImageUrls(storeImages, DEFAULT_STORE_IMAGES);
    const remainingSlots = MAX_OWNER_IMAGES - currentImages.length;
    if (remainingSlots <= 0) {
      setImageUploadError('이미지는 최대 10장까지 등록할 수 있습니다.');
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    if (files.length > uploadTargets.length) {
      setImageUploadError(`이미지는 최대 10장까지 등록할 수 있어 ${files.length - uploadTargets.length}장은 제외했습니다.`);
    } else {
      setImageUploadError('');
    }

    try {
      setIsUploadingImages(true);
      const uploadedImages = await uploadFiles(uploadTargets, 'store');
      const uploadedUrls = uploadedImages.map((item) => item.url).filter(Boolean);
      setStoreImagesState((prev) => stripPlaceholderImageUrls([...prev, ...uploadedUrls], DEFAULT_STORE_IMAGES).slice(0, MAX_OWNER_IMAGES));
    } catch (error) {
      setImageUploadError(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const buildProfilePayload = () => ({
    ownerNotice: ownerComment,
    openTime,
    closeTime,
    breakStart,
    breakEnd,
    imageUrls: stripPlaceholderImageUrls(storeImages, DEFAULT_STORE_IMAGES).slice(0, MAX_OWNER_IMAGES),
  });

  const syncUpdatedStore = (updatedStore) => {
    setLinkedStores((prev) => prev.map((store) => (
      store.storeId === updatedStore.storeId ? updatedStore : store
    )));
  };

  const handleSaveOperatingHours = async () => {
    if (!selectedStore) {
      return;
    }

    try {
      setIsSavingProfile(true);
      const updatedStore = await updateOwnerStoreProfile(selectedStore.storeId, buildProfilePayload());
      syncUpdatedStore(updatedStore);
      logHistory(storeStatus, `운영시간 변경: ${openTime} - ${closeTime} / 휴게 ${breakStart} - ${breakEnd}`);
      alert('운영시간이 서버에 저장되었습니다.');
    } catch (error) {
      alert(error.message || '운영시간 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getBtnClass = (type) => {
    if (storeStatus !== type) return styles.statusBtn;
    if (type === STATUS_TYPES.STORE.BREAK_TIME || type === STATUS_TYPES.STORE.EARLY_CLOSED) return `${styles.statusBtn} ${styles.activeOrange}`;
    if (type === STATUS_TYPES.STORE.TEMP_CLOSED) return `${styles.statusBtn} ${styles.activeRed}`;
    if (type === STATUS_TYPES.STORE.CLOSED) return `${styles.statusBtn} ${styles.activeGray}`;
    return `${styles.statusBtn} ${styles.activeGreen}`;
  };

  const handleChangeApplicationField = (field, value) => {
    setApplicationForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setApplicationError('');
    setIsSubmittingApplication(true);

    try {
      await createOwnerStoreApplication(applicationForm);
      const [stores, apps] = await Promise.all([fetchMyOwnerStores(), fetchMyOwnerStoreApplications()]);
      setLinkedStores(stores);
      setSelectedStoreId((current) => current ?? stores[0]?.storeId ?? null);
      setApplications(apps);
      setApplicationForm({
        storeName: '',
        businessNumber: '',
        representativeName: '',
        businessOpenDate: '',
        businessAddress: '',
        businessPhone: '',
        businessLicenseFile: null,
      });
      setActiveTab('APPLICATION');
      alert('매장 등록 신청이 접수되었습니다.');
    } catch (error) {
      setApplicationError(error.message || '매장 등록 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  return (
    <div className={styles.webContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand} onClick={() => navigate('/mapweb')}>
          <div className={styles.logoIcon}><StoreIcon size={24} /></div>
          <h2>Toggle <span style={{fontWeight: 300}}>POS PC</span></h2>
        </div>

        <nav className={styles.navMenu}>
          <button className={`${styles.navItem} ${activeTab === 'DASHBOARD' ? styles.navActive : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <Settings size={20} /> 대시보드
          </button>
          <button className={`${styles.navItem} ${activeTab === 'APPLICATION_CREATE' ? styles.navActive : ''}`} onClick={() => setActiveTab('APPLICATION_CREATE')}>
            <FilePlus2 size={20} /> 매장 등록 신청
          </button>
          <button className={`${styles.navItem} ${activeTab === 'APPLICATION' ? styles.navActive : ''}`} onClick={() => setActiveTab('APPLICATION')}>
            <Briefcase size={20} /> 내 신청 현황
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{currentUser?.displayName?.[0] || currentUser?.nickname?.[0] || 'O'}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{currentUser?.displayName || currentUser?.nickname || 'Owner'}</div>
              <div className={styles.userEmail}>{currentUser?.email || 'owner@toggle.com'}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}><LogOut size={18} /> 로그아웃</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <div className={styles.storeSelector}>
            {linkedStores.length > 0 ? (
              <select className={styles.selector} value={selectedStoreId || ''} onChange={(e) => setSelectedStoreId(Number(e.target.value))}>
                {linkedStores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
              </select>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>연결된 매장 없음</span>
            )}
            <StatusBadge status={storeStatus} type="STORE" />
          </div>
          <div className={styles.headerRight}>
            {selectedStore && (
              <button className={styles.iconBtn} type="button" onClick={handleUnlinkStore} title="매장 연결 해제">
                <XCircle size={20} />
              </button>
            )}
            <button className={styles.iconBtn}><Bell size={20} /></button>
          </div>
        </header>

        {activeTab === 'DASHBOARD' ? (
        <div className={styles.dashboardGrid}>
          {/* 상태 변경 컨트롤 패널 */}
          <section className={`${styles.card} ${styles.statusCard}`}>
            <h3>실시간 상태 전환</h3>
            <p className={styles.subtext}>현재 상황에 맞추어 매장 상태를 즉각 반영합니다. 토글 지도에 실시간으로 표시됩니다.</p>
            {statusError && <div className={styles.errorBox}>{statusError}</div>}
            
            <div className={styles.statusButtons}>
              <button className={getBtnClass(STATUS_TYPES.STORE.OPEN)} onClick={() => applyStatus(STATUS_TYPES.STORE.OPEN, '정상 영업 시작')} disabled={!selectedStore}>
                <Play size={24} /> 영업 시작
              </button>
              <button className={getBtnClass(STATUS_TYPES.STORE.BREAK_TIME)} onClick={() => applyStatus(STATUS_TYPES.STORE.BREAK_TIME, '브레이크타임 돌입')} disabled={!selectedStore}>
                <Pause size={24} /> 브레이크타임
              </button>
              <button className={getBtnClass(STATUS_TYPES.STORE.CLOSED)} onClick={() => applyStatus(STATUS_TYPES.STORE.CLOSED, '금일 영업 종료')} disabled={!selectedStore}>
                <Square size={24} /> 영업 종료
              </button>
              <button className={getBtnClass(STATUS_TYPES.STORE.EARLY_CLOSED)} onClick={() => applyStatus(STATUS_TYPES.STORE.EARLY_CLOSED, '재료 소진 - 조기 마감')} disabled={!selectedStore}>
                <Clock size={24} /> 조기 마감
              </button>
              <button className={getBtnClass(STATUS_TYPES.STORE.TEMP_CLOSED)} onClick={() => applyStatus(STATUS_TYPES.STORE.TEMP_CLOSED, '긴급 사정 임시 휴무')} disabled={!selectedStore}>
                <AlertTriangle size={24} /> 임시 휴무
              </button>
            </div>

            <div className={styles.divider} />
            
            <div className={styles.commentSection}>
              <h4>📢 사장님 공지 (손님 앱 알림)</h4>
              <div className={styles.commentInputWrap}>
                <input 
                  type="text" 
                  value={ownerComment} 
                  onChange={(e) => setOwnerCommentState(e.target.value)} 
                  placeholder="예) 곧 재료가 소진됩니다! 서둘러 주세요." 
                  className={styles.TextInput}
                />
                <button className={styles.primaryBtn} onClick={async () => {
                  if (!selectedStore) {
                    return;
                  }

                  try {
                    setIsSavingProfile(true);
                    const updatedStore = await updateOwnerStoreProfile(selectedStore.storeId, buildProfilePayload());
                    syncUpdatedStore(updatedStore);
                    logHistory(storeStatus, `공지 업데이트: ${ownerComment}`);
                    alert('공지 정보가 서버에 저장되었습니다.');
                  } catch (error) {
                    alert(error.message || '공지 저장 중 오류가 발생했습니다.');
                  } finally {
                    setIsSavingProfile(false);
                  }
                }} disabled={!selectedStore || isSavingProfile}>반영</button>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.commentSection}>
              <h4>운영시간 관리</h4>
              <div className={styles.commentInputWrap}>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={styles.TextInput} />
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={styles.TextInput} />
              </div>
              <div className={styles.commentInputWrap}>
                <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className={styles.TextInput} />
                <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className={styles.TextInput} />
              </div>
              <button className={styles.primaryBtn} onClick={handleSaveOperatingHours} disabled={!selectedStore || isSavingProfile}>운영시간 저장</button>
            </div>
          </section>

          <section className={`${styles.card} ${styles.statusCard}`}>
            <h3>운영 종료 요청</h3>
            <p className={styles.subtext}>운영을 종료하려는 경우 점주가 직접 삭제하지 않고 요청만 보낼 수 있습니다.</p>
            <div className={styles.closureRequestCard}>
              <div className={styles.closureRequestHeader}>
                <div style={{ display: 'grid', gap: '0.45rem' }}>
                  <div className={styles.closureRequestLabelRow}>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.72)', fontWeight: 700 }}>요청 상태</span>
                    <span className={styles.closureRequestBadge}>
                      {closureUiState.requestMeta.label}
                    </span>
                    {closureUiState.isPending && (
                      <span style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 700 }}>중복 요청이 차단됩니다.</span>
                    )}
                  </div>
                  <div className={styles.closureRequestHint}>
                    운영 종료는 직접 삭제가 아니라 관리자 검토를 거쳐 비활성화됩니다.
                  </div>
                </div>
                {closureUiState.requestReviewedAt && (
                  <div style={{ fontSize: '0.84rem', color: 'rgba(226, 232, 240, 0.6)' }}>
                    최종 처리 시각<br />
                    <strong>{closureUiState.requestReviewedAt}</strong>
                  </div>
                )}
              </div>

              <textarea
                className={styles.commentInput}
                placeholder="예: 내부 사정으로 잠시 종료하려는 경우 사유를 적어 주세요."
                value={closureRequestReason}
                onChange={(event) => setClosureRequestReason(event.target.value)}
                disabled={!closureUiState.canRequestClosure || isSubmittingClosureRequest}
                rows={6}
              />

              <div className={styles.closureRequestFooter}>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  {closureRequestError && <div style={{ color: '#fca5a5', fontSize: '0.9rem', fontWeight: 700 }}>{closureRequestError}</div>}
                  {!closureRequestApiAvailable && (
                    <div className={styles.closureRequestHint}>운영 종료 요청 API가 아직 준비되지 않아 현재는 화면만 미리 구성된 상태입니다.</div>
                  )}
                  {closureUiState.requestReason && (
                    <div className={styles.closureRequestHint}>최근 요청 사유: {closureUiState.requestReason}</div>
                  )}
                  {!closureUiState.canRequestClosure && !closureUiState.isPending && (
                    <div className={styles.closureRequestHint}>
                      {closureUiState.requestMeta.label === '반려됨'
                        ? '반려 이후에는 다시 요청할 수 있습니다.'
                        : closureUiState.requestMeta.label === '승인됨'
                          ? '이미 승인된 매장입니다.'
                          : '현재 상태에서는 운영 종료 요청을 보낼 수 없습니다.'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleSubmitClosureRequest}
                  disabled={!closureUiState.canRequestClosure || isSubmittingClosureRequest || !closureRequestApiAvailable}
                  style={{ background: closureUiState.canRequestClosure ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-status-gray)' }}
                >
                  {isSubmittingClosureRequest ? '요청 전송 중...' : closureUiState.isPending ? '이미 요청됨' : '운영 종료 요청'}
                </button>
              </div>
            </div>
          </section>

          <StoreMenuPanel
            store={selectedStore}
            storeId={selectedStore?.storeId}
            storeName={selectedStore?.storeName}
            categoryName={selectedStore?.categoryName}
            mode="edit"
            compact
          />

          {/* 히스토리 로깅 (PC 와이드) */}
          <section className={`${styles.card} ${styles.historyCard}`}>
            <h3 style={{ marginBottom: '1rem' }}><List size={18} style={{marginRight: 6}}/> 금일 작업 로그</h3>
            <div className={styles.historyList}>
              {history.map((log, idx) => (
                <div className={styles.logItem} key={idx}>
                  <time className={styles.logTime}>{log.time}</time>
                  <StatusBadge status={log.status} type="STORE" />
                  <span className={styles.logMsg}>{log.msg}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 새로운 다중 이미지 업로드 섹션 */}
          <section className={`${styles.card} ${styles.fullWidthCard}`}>
            <div className={styles.cardHeader}>
              <h3><ImageIcon size={20} /> 매장 사진첩 관리 (최대 10장)</h3>
              <button className={styles.primaryBtn} onClick={async () => {
                if (!selectedStore) {
                  return;
                }

                try {
                  setIsSavingProfile(true);
                  const updatedStore = await updateOwnerStoreProfile(selectedStore.storeId, buildProfilePayload());
                  syncUpdatedStore(updatedStore);
                  logHistory(storeStatus, `사진 ${stripPlaceholderImageUrls(storeImages, DEFAULT_STORE_IMAGES).length}장이 서버에 저장됨`);
                  alert('사진이 서버에 저장되었습니다.');
                } catch (error) {
                  alert(error.message || '사진 저장 중 오류가 발생했습니다.');
                } finally {
                  setIsSavingProfile(false);
                }
              }} disabled={!selectedStore || isSavingProfile || isUploadingImages}>서버에 저장하기</button>
            </div>
            <p className={styles.subtext}>점주님이 등록하신 이 사진들이 매장 상세 페이지 상단 캐러셀에 아름답게 나타납니다.</p>

            <div className={styles.imageGrid}>
              <label className={styles.uploadBox}>
                <ImageIcon size={32} color="var(--color-primary)" opacity={0.7} />
                <span>PC에서 사진 올리기</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={isUploadingImages} />
              </label>

              {displayStoreImages.map((img, idx) => (
                <div className={styles.imagePreview} key={`${img}-${idx}`}>
                  <img src={img} alt={hasCustomStoreImages ? `Preview ${idx + 1}` : `기본 예시 이미지 ${idx + 1}`} />
                  {hasCustomStoreImages && (
                    <button
                      type="button"
                      className={styles.deleteImgBtn}
                      onClick={() => setStoreImagesState((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
            {imageUploadError && <div className={styles.applicationErrorText}>{imageUploadError}</div>}
          </section>
        </div>
        ) : activeTab === 'APPLICATION_CREATE' ? (
          <div className={styles.dashboardGrid} style={{ display: 'block' }}>
            <section className={`${styles.card} ${styles.applicationFormCard}`}>
              <h3><FilePlus2 size={20} /> 매장 등록 신청</h3>
              <p className={styles.subtext}>PC에서도 바로 사업자 정보를 제출해 매장 연결 승인을 신청할 수 있습니다.</p>
              <form className={styles.applicationForm} onSubmit={handleSubmitApplication}>
                <div className={styles.applicationFormGrid}>
                  <input
                    className={styles.TextInput}
                    placeholder="상호명"
                    value={applicationForm.storeName}
                    onChange={(e) => handleChangeApplicationField('storeName', e.target.value)}
                    required
                  />
                  <input
                    className={styles.TextInput}
                    placeholder="사업자 등록번호 (예: 123-45-67890)"
                    value={applicationForm.businessNumber}
                    onChange={(e) => handleChangeApplicationField('businessNumber', e.target.value)}
                    required
                  />
                  <input
                    className={styles.TextInput}
                    placeholder="대표자명"
                    value={applicationForm.representativeName}
                    onChange={(e) => handleChangeApplicationField('representativeName', e.target.value)}
                    required
                  />
                  <input
                    className={styles.TextInput}
                    type="date"
                    value={applicationForm.businessOpenDate}
                    onChange={(e) => handleChangeApplicationField('businessOpenDate', e.target.value)}
                    required
                  />
                  <input
                    className={`${styles.TextInput} ${styles.applicationFormFull}`}
                    placeholder="실영업주소"
                    value={applicationForm.businessAddress}
                    onChange={(e) => handleChangeApplicationField('businessAddress', e.target.value)}
                    required
                  />
                  <input
                    className={styles.TextInput}
                    placeholder="실영업 전화번호"
                    value={applicationForm.businessPhone}
                    onChange={(e) => handleChangeApplicationField('businessPhone', e.target.value)}
                    inputMode="tel"
                    pattern="^[0-9+()\\-\\s]{7,30}$"
                    title="전화번호 형식으로 입력해 주세요."
                    required
                  />
                  <label className={`${styles.fileInputWrap} ${styles.applicationFormFull}`}>
                    <span className={styles.fileInputLabel}>사업자 등록증 파일 업로드</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleChangeApplicationField('businessLicenseFile', e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
                {applicationError && <div className={styles.errorBox}>{applicationError}</div>}
                <div className={styles.applicationFormActions}>
                  <button className={styles.primaryBtn} type="submit" disabled={isSubmittingApplication}>
                    {isSubmittingApplication ? '신청 중...' : '매장 등록 신청하기'}
                  </button>
                  <button className={styles.secondaryBtn} type="button" onClick={() => setActiveTab('APPLICATION')}>
                    내 신청 현황 보기
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : (
          <div className={styles.dashboardGrid} style={{ display: 'block' }}>
            <section className={styles.card}>
              <h3><Briefcase size={20} /> 내 신청 현황</h3>
              <p className={styles.subtext}>사업자 확인, 지도 검증, 관리자 승인 단계를 한 번에 확인합니다.</p>
              {applications.length === 0 ? (
                <div className={styles.subtext}>아직 제출한 신청이 없습니다.</div>
              ) : (
                <div className={styles.applicationList}>
                  {applications.map((application) => {
                    const meta = getApplicationStatusMeta(application);
                    return (
                      <article key={application.applicationId} className={styles.applicationCard}>
                        <div className={styles.applicationTopRow}>
                          <strong>{application.storeName}</strong>
                          <span className={`${styles.applicationBadge} ${styles[`tone_${meta.tone}`]}`}>{meta.label}</span>
                        </div>
                        <div className={styles.applicationSummary}>{meta.summary}</div>
                        <div className={styles.applicationProgressTrack}>
                          <div className={styles.applicationProgressFill} style={{ width: `${meta.progress}%` }} />
                        </div>
                        <div className={styles.applicationMetaRow}>사업자번호 {application.businessNumber}</div>
                        <div className={styles.applicationMetaRow}>{application.businessAddressRaw}</div>
                        <div className={styles.applicationMetaRow}>사업자 검증 {application.businessVerificationStatus} · 지도 검증 {application.mapVerificationStatus}</div>
                        {application.rejectReason && (
                          <div className={styles.applicationErrorText}>반려 사유: {application.rejectReason}</div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
