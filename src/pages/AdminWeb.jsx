import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSearch,
  LogOut,
  MapPinned,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Users,
  UserRound,
  XCircle,
} from 'lucide-react';
import { logout as logoutRequest } from '../lib/auth';
import {
  clearAuthSession,
  getCurrentUser,
  getRefreshToken,
} from '../lib/session';
import { useAuthSession } from '../hooks/useAuthSession';
import {
  approveStoreClosureRequest,
  approveOwnerStoreApplication,
  executeAdminBusinessVerification,
  executeAdminMapVerification,
  fetchAdminOwnerStores,
  fetchAdminStoreClosureRequests,
  fetchAdminOwnerStoreApplicationDetail,
  fetchAdminOwnerStoreApplications,
  fetchAdminStores,
  manualVerifyOwnerStoreBusiness,
  rejectStoreClosureRequest,
  rejectOwnerStoreApplication,
} from '../lib/admin';
import { getClosureRequestStatusMeta } from '../lib/storeContracts';
import styles from './AdminWeb.module.css';

const FILTER_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '접수됨' },
  { value: 'UNDER_REVIEW', label: '검토중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
  { value: 'AUTO_VERIFICATION_UNAVAILABLE', label: '자동 검증 재시도 필요' },
  { value: 'AUTO_VERIFICATION_FAILED', label: '자동 검증 실패' },
  { value: 'MANUAL_VERIFICATION_FAILED', label: '수동 검증 실패' },
  { value: 'FAILED', label: '지도 검증 실패' },
];

const BUSINESS_VERIFIED_STATUSES = new Set(['AUTO_VERIFIED', 'MANUAL_VERIFIED']);

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function getApplicationTitle(application) {
  return application.storeName || application.businessName || '미확인 신청';
}

function toStatusMeta(application) {
  if (!application) {
    return { label: '미선택', tone: 'neutral' };
  }

  if (application.requestStatus === 'APPROVED') {
    return { label: '승인 완료', tone: 'success' };
  }

  if (application.requestStatus === 'REJECTED') {
    return { label: '반려됨', tone: 'danger' };
  }

  if (application.businessVerificationStatus === 'AUTO_VERIFICATION_UNAVAILABLE') {
    return { label: '자동 검증 재시도 필요', tone: 'warning' };
  }

  if (
    application.businessVerificationStatus === 'AUTO_VERIFICATION_FAILED' ||
    application.businessVerificationStatus === 'MANUAL_VERIFICATION_FAILED'
  ) {
    return { label: '사업자 검증 실패', tone: 'danger' };
  }

  if (application.mapVerificationStatus === 'FAILED') {
    return { label: '지도 검증 실패', tone: 'danger' };
  }

  if (
    BUSINESS_VERIFIED_STATUSES.has(application.businessVerificationStatus) &&
    application.mapVerificationStatus === 'VERIFIED'
  ) {
    return { label: '승인 가능', tone: 'success' };
  }

  if (application.requestStatus === 'UNDER_REVIEW') {
    return { label: '검토중', tone: 'warning' };
  }

  return { label: '접수됨', tone: 'neutral' };
}

function matchesFilter(application, filter) {
  if (filter === 'ALL') return true;
  if (filter === 'FAILED') return application.mapVerificationStatus === 'FAILED';
  if (filter === 'AUTO_VERIFICATION_UNAVAILABLE') {
    return application.businessVerificationStatus === 'AUTO_VERIFICATION_UNAVAILABLE';
  }
  if (filter === 'AUTO_VERIFICATION_FAILED' || filter === 'MANUAL_VERIFICATION_FAILED') {
    return application.businessVerificationStatus === filter;
  }
  return application.requestStatus === filter;
}

function isApprovalReady(application) {
  return (
    application &&
    BUSINESS_VERIFIED_STATUSES.has(application.businessVerificationStatus) &&
    application.mapVerificationStatus === 'VERIFIED' &&
    application.requestStatus !== 'APPROVED' &&
    application.requestStatus !== 'REJECTED'
  );
}

export default function AdminWeb() {
  const navigate = useNavigate();
  const auth = useAuthSession();
  const [applications, setApplications] = useState([]);
  const [stores, setStores] = useState([]);
  const [ownerStores, setOwnerStores] = useState([]);
  const [closureRequests, setClosureRequests] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [selectedClosureRequestId, setSelectedClosureRequestId] = useState(null);
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState(null);
  const [applicationDetail, setApplicationDetail] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [ownerQuery, setOwnerQuery] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [verificationReason, setVerificationReason] = useState('');
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [listError, setListError] = useState('');
  const [storeListError, setStoreListError] = useState('');
  const [closureRequestListError, setClosureRequestListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingClosureRequests, setIsLoadingClosureRequests] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRunningBusinessVerification, setIsRunningBusinessVerification] = useState(false);
  const [isRunningMapVerification, setIsRunningMapVerification] = useState(false);
  const [isManualVerifying, setIsManualVerifying] = useState(false);
  const [isApprovingClosureRequest, setIsApprovingClosureRequest] = useState(false);
  const [isRejectingClosureRequest, setIsRejectingClosureRequest] = useState(false);
  const [closureRejectReason, setClosureRejectReason] = useState('');
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const currentUser = auth.user?.email ? auth.user : getCurrentUser();

  useEffect(() => {
    document.title = 'Toggle Admin Console';

    if (!auth.isLoggedIn || auth.role !== 'ADMIN') {
      navigate('/adminloginweb', { replace: true });
      return;
    }

    loadApplications({ initial: true });
    loadStores({ initial: true });
    loadOwnerStores({ initial: true });
    loadClosureRequests({ initial: true });
  }, [auth.isLoggedIn, auth.role, navigate]);

  useEffect(() => {
    if (!selectedApplicationId) {
      setApplicationDetail(null);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setIsLoadingDetail(true);
      setActionError('');

      try {
        const detail = await fetchAdminOwnerStoreApplicationDetail(selectedApplicationId);

        if (!cancelled) {
          setApplicationDetail(detail);
        }
      } catch (error) {
        if (!cancelled) {
          setApplicationDetail(null);
          setActionError(error.message || '신청 상세를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedApplicationId, detailReloadKey]);

  useEffect(() => {
    setRejectReason('');
    setVerificationReason('');
    setApprovalChecked(false);
    setActionError('');
  }, [selectedApplicationId]);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      if (!matchesFilter(application, filter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        application.ownerEmail,
        application.ownerNickname,
        application.storeName,
        application.businessNumber,
        application.businessPhone,
        application.representativeName,
        application.businessAddressRaw,
        application.businessPhone?.replaceAll?.(/[^0-9]/g, ''),
      ]
        .filter(Boolean)
        .some((value) => {
          const asString = String(value).toLowerCase();
          const normalizedValue = asString.replace(/[^0-9]/g, '');
          return asString.includes(normalizedQuery) || (!!normalizedValue && normalizedValue.includes(normalizedQuery.replace(/[^0-9]/g, '')));
        });
    });
  }, [applications, filter, query]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.applicationId === selectedApplicationId) || null,
    [applications, selectedApplicationId]
  );

  const stats = useMemo(() => {
    const pending = applications.filter((application) => application.requestStatus === 'PENDING').length;
    const underReview = applications.filter((application) => application.requestStatus === 'UNDER_REVIEW').length;
    const approved = applications.filter((application) => application.requestStatus === 'APPROVED').length;
    const approvalReady = applications.filter((application) => isApprovalReady(application)).length;

    return { pending, underReview, approved, approvalReady };
  }, [applications]);

  const closureRequestStats = useMemo(() => {
    const pending = closureRequests.length;
    return { pending };
  }, [closureRequests]);

  const filteredStores = useMemo(() => {
    const normalizedQuery = storeQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return stores;
    }

    return stores.filter((store) => {
      return [
        store.name,
        store.storeName,
        store.categoryName,
        store.address,
        store.roadAddress,
        store.jibunAddress,
        store.phone,
        store.externalPlaceId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [storeQuery, stores]);

  const ownerGroups = useMemo(() => {
    const grouped = new Map();

    ownerStores.forEach((store) => {
      const ownerId = store.ownerUserId ?? store.ownerId ?? store.userId;
      if (ownerId == null) {
        return;
      }

      if (!grouped.has(ownerId)) {
        grouped.set(ownerId, {
          ownerUserId: ownerId,
          ownerNickname: store.ownerNickname || store.ownerName || '미확인 점주',
          ownerEmail: store.ownerEmail || '',
          stores: [],
        });
      }

      grouped.get(ownerId).stores.push(store);
    });

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      storeCount: group.stores.length,
      pendingClosureCount: closureRequests.filter((request) => request.ownerUserId === group.ownerUserId).length,
    }));
  }, [closureRequests, ownerStores]);

  const filteredOwnerGroups = useMemo(() => {
    const normalizedQuery = ownerQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return ownerGroups;
    }

    return ownerGroups.filter((group) => {
      return [
        group.ownerNickname,
        group.ownerEmail,
        ...group.stores.map((store) => store.storeName || store.name || ''),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [ownerGroups, ownerQuery]);

  const selectedOwnerGroup = useMemo(() => {
    if (!filteredOwnerGroups.length) {
      return null;
    }

    return filteredOwnerGroups.find((group) => group.ownerUserId === selectedOwnerUserId) || filteredOwnerGroups[0];
  }, [filteredOwnerGroups, selectedOwnerUserId]);

  async function loadApplications({ initial = false } = {}) {
    if (initial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setListError('');

    try {
      const data = await fetchAdminOwnerStoreApplications();
      setApplications(data);

      setSelectedApplicationId((currentId) => {
        if (currentId && data.some((application) => application.applicationId === currentId)) {
          return currentId;
        }
        return data[0]?.applicationId ?? null;
      });
    } catch (error) {
      setListError(error.message || '관리자 신청 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function loadStores({ initial = false } = {}) {
    if (initial) {
      setIsLoadingStores(true);
    }
    setStoreListError('');

    try {
      const data = await fetchAdminStores();
      setStores(Array.isArray(data?.stores) ? data.stores : []);
    } catch (error) {
      setStoreListError(error.message || '관리자 매장 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoadingStores(false);
    }
  }

  async function loadOwnerStores({ initial = false } = {}) {
    if (initial) {
      // keep the loading indicator aligned with the shared store panel
    }

    try {
      const data = await fetchAdminOwnerStores();
      setOwnerStores(Array.isArray(data) ? data : []);
      setSelectedOwnerUserId((current) => {
        const ownerIds = Array.from(new Set((Array.isArray(data) ? data : []).map((store) => store.ownerUserId).filter((value) => value != null)));
        if (current && ownerIds.includes(current)) {
          return current;
        }
        return ownerIds[0] ?? null;
      });
    } catch (error) {
      setStoreListError(error.message || '점주별 매장 목록을 불러오지 못했습니다.');
      setOwnerStores([]);
    }
  }

  async function loadClosureRequests({ initial = false } = {}) {
    if (initial) {
      setIsLoadingClosureRequests(true);
    }
    setClosureRequestListError('');

    try {
      const data = await fetchAdminStoreClosureRequests('PENDING');
      setClosureRequests(data);
      setSelectedClosureRequestId((currentId) => {
        if (currentId && data.some((request) => request.requestId === currentId)) {
          return currentId;
        }
        return data[0]?.requestId ?? null;
      });
    } catch (error) {
      setClosureRequestListError(error.message || '운영 종료 요청 목록을 불러오지 못했습니다.');
      setClosureRequests([]);
    } finally {
      setIsLoadingClosureRequests(false);
    }
  }

  async function refreshSelected() {
    await loadApplications();
    setDetailReloadKey((value) => value + 1);
    await loadClosureRequests();
  }

  async function handleRefreshClick() {
    await Promise.all([loadApplications(), loadStores(), loadClosureRequests()]);
    if (selectedApplicationId) {
      setDetailReloadKey((value) => value + 1);
    }
  }

  async function handleExecuteBusinessVerification() {
    if (!selectedApplication) return;
    setActionError('');
    setIsRunningBusinessVerification(true);

    try {
      await executeAdminBusinessVerification(selectedApplication.applicationId);
      await refreshSelected();
    } catch (error) {
      setActionError(error.message || '사업자 자동 검증 실행에 실패했습니다.');
    } finally {
      setIsRunningBusinessVerification(false);
    }
  }

  async function handleExecuteMapVerification() {
    if (!selectedApplication) return;
    setActionError('');
    setIsRunningMapVerification(true);

    try {
      await executeAdminMapVerification(selectedApplication.applicationId, true);
      await refreshSelected();
    } catch (error) {
      setActionError(error.message || '카카오맵 검증 실행에 실패했습니다.');
    } finally {
      setIsRunningMapVerification(false);
    }
  }

  async function handleManualVerification(verified) {
    if (!selectedApplication) return;
    if (!verificationReason.trim()) {
      setActionError('수동 검증 사유를 입력해 주세요.');
      return;
    }

    setActionError('');
    setIsManualVerifying(true);

    try {
      await manualVerifyOwnerStoreBusiness(
        selectedApplication.applicationId,
        verified,
        verificationReason.trim()
      );
      setVerificationReason('');
      await refreshSelected();
    } catch (error) {
      setActionError(error.message || '수동 검증 처리에 실패했습니다.');
    } finally {
      setIsManualVerifying(false);
    }
  }

  async function handleApprove() {
    if (!selectedApplication) return;
    if (!isApprovalReady(selectedApplication)) {
      setActionError('사업자 검증과 카카오맵 검증이 모두 완료되어야 승인할 수 있습니다.');
      return;
    }
    if (!approvalChecked) {
      setActionError('관리자가 최종 확인했음을 체크해 주세요.');
      return;
    }

    setActionError('');
    setIsApproving(true);

    try {
      await approveOwnerStoreApplication(selectedApplication.applicationId, true);
      setApprovalChecked(false);
      await refreshSelected();
    } catch (error) {
      setActionError(error.message || '승인 처리에 실패했습니다.');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (!selectedApplication) return;
    if (!rejectReason.trim()) {
      setActionError('반려 사유를 입력해 주세요.');
      return;
    }

    setActionError('');
    setIsRejecting(true);

    try {
      await rejectOwnerStoreApplication(selectedApplication.applicationId, rejectReason.trim());
      setRejectReason('');
      setApprovalChecked(false);
      await refreshSelected();
    } catch (error) {
      setActionError(error.message || '반려 처리에 실패했습니다.');
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleApproveClosureRequest(request) {
    if (!request?.requestId) return;
    setActionError('');
    setIsApprovingClosureRequest(true);

    try {
      await approveStoreClosureRequest(request.requestId);
      await loadClosureRequests();
      await loadStores();
    } catch (error) {
      setActionError(error.message || '운영 종료 요청 승인에 실패했습니다.');
    } finally {
      setIsApprovingClosureRequest(false);
    }
  }

  async function handleRejectClosureRequest(request) {
    if (!request?.requestId) return;
    if (!closureRejectReason.trim()) {
      setActionError('운영 종료 요청 반려 사유를 입력해 주세요.');
      return;
    }

    setActionError('');
    setIsRejectingClosureRequest(true);

    try {
      await rejectStoreClosureRequest(request.requestId, closureRejectReason.trim());
      setClosureRejectReason('');
      await loadClosureRequests();
      await loadStores();
    } catch (error) {
      setActionError(error.message || '운영 종료 요청 반려에 실패했습니다.');
    } finally {
      setIsRejectingClosureRequest(false);
    }
  }

  async function handleLogout() {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      // ignore logout API failure and clear local state
    } finally {
      clearAuthSession();
      navigate('/adminloginweb', { replace: true });
    }
  }

  const detailApplication = applicationDetail?.application || selectedApplication;
  const businessLicensePresignedUrl = applicationDetail?.businessLicensePresignedUrl || '';
  const businessHistories = applicationDetail?.businessVerificationHistories || [];
  const mapHistories = applicationDetail?.mapVerificationHistories || [];
  const latestMapHistory = mapHistories[0] || null;
  const detailStatusMeta = toStatusMeta(detailApplication);
  const canApprove = isApprovalReady(detailApplication);
  const canManualOverride = detailApplication
    && (detailApplication.businessVerificationStatus === 'AUTO_VERIFICATION_UNAVAILABLE'
      || detailApplication.businessVerificationStatus === 'AUTO_VERIFICATION_FAILED');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}><ShieldCheck size={20} color="white" /></div>
          <div>
            <h1 className={styles.title}>Toggle Admin Console</h1>
            <p className={styles.subtitle}>{currentUser.email || 'admin'} 계정으로 운영 중</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostButton} onClick={handleRefreshClick} disabled={isRefreshing}>
            <RefreshCcw size={16} /> {isRefreshing ? '새로고침 중' : '새로고침'}
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} /> 로그아웃
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.summaryStrip}>
          <article className={styles.statCard}>
            <div className={styles.statLabel}><Clock3 size={16} /> 접수됨</div>
            <strong>{stats.pending}</strong>
            <span>새로 들어온 신청</span>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statLabel}><Activity size={16} /> 검토중</div>
            <strong>{stats.underReview}</strong>
            <span>검증 또는 관리자 검토가 진행 중인 신청</span>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statLabel}><CheckCircle2 size={16} /> 승인 가능</div>
            <strong>{stats.approvalReady}</strong>
            <span>두 검증이 끝나 승인 가능한 신청</span>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statLabel}><Clock3 size={16} /> 종료 요청</div>
            <strong>{closureRequestStats.pending}</strong>
            <span>검토 대기 중인 운영 종료 요청</span>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statLabel}><Store size={16} /> 승인 완료</div>
            <strong>{stats.approved}</strong>
            <span>최종 승인까지 끝난 신청</span>
          </article>
        </section>

        <section className={styles.workspace}>
          <div className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>신청 목록</h3>
                <p>검증 상태와 승인 가능 여부를 기준으로 우선순위를 확인합니다.</p>
              </div>
              <div className={styles.filterRow}>
                <label className={styles.searchBox}>
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="상호명, 사업자번호, 전화번호, 주소 검색"
                  />
                </label>
                <select value={filter} onChange={(event) => setFilter(event.target.value)} className={styles.select}>
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {listError && <p className={styles.errorBanner}>{listError}</p>}

            <div className={styles.applicationList}>
              {isLoading ? (
                <div className={styles.emptyState}>
                  <Activity size={20} />
                  <p>관리자 데이터를 불러오는 중입니다.</p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className={styles.emptyState}>
                  <FileSearch size={20} />
                  <p>조건에 맞는 신청이 없습니다.</p>
                </div>
              ) : (
                filteredApplications.map((application) => {
                  const statusMeta = toStatusMeta(application);
                  return (
                    <button
                      key={application.applicationId}
                      className={`${styles.applicationCard} ${selectedApplicationId === application.applicationId ? styles.selectedCard : ''}`}
                      onClick={() => setSelectedApplicationId(application.applicationId)}
                    >
                      <div className={styles.applicationTop}>
                        <div>
                          <strong>{getApplicationTitle(application)}</strong>
                          <span>{application.ownerNickname} · {application.ownerEmail}</span>
                        </div>
                        <span className={`${styles.statusPill} ${styles[`tone${statusMeta.tone}`]}`}>{statusMeta.label}</span>
                      </div>
                      <div className={styles.applicationMeta}>
                        <span><UserRound size={14} /> {application.representativeName}</span>
                        <span><MapPinned size={14} /> {application.businessAddressRaw}</span>
                        <span><Clock3 size={14} /> {formatDateTime(application.submittedAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.detailPanel}>
            {!detailApplication ? (
              <div className={styles.emptyStateLarge}>
                <Store size={24} />
                <h3>신청을 선택해 주세요</h3>
                <p>좌측 목록에서 신청을 선택하면 검증 상태와 운영 액션을 확인할 수 있습니다.</p>
              </div>
            ) : isLoadingDetail ? (
              <div className={styles.emptyStateLarge}>
                <Activity size={24} />
                <h3>상세 정보를 불러오는 중입니다</h3>
              </div>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <span className={styles.sectionEyebrow}>Application Detail</span>
                    <h3>{getApplicationTitle(detailApplication)}</h3>
                    <p>{detailApplication.ownerNickname} · {detailApplication.ownerEmail}</p>
                  </div>
                  <span className={`${styles.statusPill} ${styles[`tone${detailStatusMeta.tone}`]}`}>
                    {detailStatusMeta.label}
                  </span>
                </div>

                <div className={styles.detailGrid}>
                  <article className={styles.infoCard}>
                    <h4>신청 정보</h4>
                    <dl className={styles.definitionList}>
                      <div><dt>매장명</dt><dd>{detailApplication.storeName}</dd></div>
                      <div><dt>대표자명</dt><dd>{detailApplication.representativeName}</dd></div>
                      <div><dt>사업자 번호</dt><dd>{detailApplication.businessNumber}</dd></div>
                      <div><dt>실영업 전화번호</dt><dd>{detailApplication.businessPhone || '-'}</dd></div>
                      <div><dt>개업일자</dt><dd>{formatDate(detailApplication.businessOpenDate)}</dd></div>
                      <div><dt>실영업주소</dt><dd>{detailApplication.businessAddressRaw}</dd></div>
                      <div><dt>사업자 검증 방식</dt><dd>전국 국세청 자동 검증, 예외 상황만 관리자 수동 보정</dd></div>
                      <div><dt>사업자 서류 키</dt><dd className={styles.pathText}>{detailApplication.businessLicenseObjectKey || '-'}</dd></div>
                      <div><dt>조회 링크</dt><dd>
                        {detailApplication.businessLicenseDeletedAt ? (
                          '삭제됨'
                        ) : businessLicensePresignedUrl ? (
                          <a className={styles.secondaryButton} href={businessLicensePresignedUrl} target="_blank" rel="noreferrer">
                            5분 presigned URL 열기
                          </a>
                        ) : (
                          '-'
                        )}
                      </dd></div>
                      <div><dt>삭제 시각</dt><dd>{formatDateTime(detailApplication.businessLicenseDeletedAt) || '-'}</dd></div>
                      <div><dt>삭제 사유</dt><dd>{detailApplication.businessLicenseDeleteReason || '-'}</dd></div>
                    </dl>
                  </article>

                  <article className={styles.infoCard}>
                    <h4>검증 상태</h4>
                    <dl className={styles.definitionList}>
                      <div><dt>요청 상태</dt><dd>{detailApplication.requestStatus}</dd></div>
                      <div><dt>사업자 검증 상태</dt><dd>{detailApplication.businessVerificationStatus}</dd></div>
                      <div><dt>지도 검증 상태</dt><dd>{detailApplication.mapVerificationStatus}</dd></div>
                      <div><dt>검증된 매장</dt><dd>{detailApplication.verifiedStoreName || '-'}</dd></div>
                      <div><dt>검증된 storeId</dt><dd>{detailApplication.verifiedStoreId || '-'}</dd></div>
                      <div><dt>최종 검토 시각</dt><dd>{formatDateTime(detailApplication.reviewedAt)}</dd></div>
                      <div><dt>반려 사유</dt><dd>{detailApplication.rejectReason || '-'}</dd></div>
                    </dl>
                  </article>
                </div>

                <article className={styles.candidateCard}>
                  <div className={styles.cardHeaderRow}>
                    <div>
                      <h4>카카오 주소 검증 결과</h4>
                      <p>후보 선택 없이, 실영업주소가 정확히 일치한 카카오 결과가 정확히 1건일 때만 `stores` 저장이 가능합니다.</p>
                    </div>
                    <button
                      className={styles.secondaryButton}
                      onClick={handleExecuteMapVerification}
                      disabled={isRunningMapVerification || detailApplication.requestStatus === 'APPROVED' || detailApplication.requestStatus === 'REJECTED'}
                    >
                      <RefreshCcw size={16} /> {isRunningMapVerification ? '재검증 중' : '지도 재검증'}
                    </button>
                  </div>

                  {!latestMapHistory ? (
                    <div className={styles.inlineEmptyState}>
                      <AlertTriangle size={18} />
                      <p>지도 재검증을 실행하면 최신 주소 검증 결과가 여기에 표시됩니다.</p>
                    </div>
                  ) : (
                      <div className={styles.candidateList}>
                        <div className={styles.candidateItem}>
                          <div className={styles.candidateMain}>
                            <strong>{latestMapHistory.selectedPlaceName || '검증 실패'}</strong>
                            <span>{latestMapHistory.selectedRoadAddress || latestMapHistory.selectedJibunAddress || latestMapHistory.failureMessage || '-'}</span>
                            <span className={styles.candidateSub}>query: {latestMapHistory.queryText}</span>
                          </div>
                          <div className={styles.candidateScore}>
                            <strong>{latestMapHistory.status === 'SUCCESS' ? `${latestMapHistory.candidateCount || 1}건 중 1건 확정` : `검증 실패 (${latestMapHistory.candidateCount || 0}건)`}</strong>
                            <span>{latestMapHistory.failureCode || latestMapHistory.failureMessage || 'exact_address_confirmed'}</span>
                          </div>
                        </div>
                      </div>
                  )}
                </article>

                <div className={styles.historyGrid}>
                  <article className={styles.infoCard}>
                    <h4>사업자 검증 이력</h4>
                    {businessHistories.length === 0 ? (
                      <p className={styles.mutedText}>아직 사업자 검증 이력이 없습니다.</p>
                    ) : (
                      <div className={styles.historyList}>
                        {businessHistories.map((history, index) => (
                          <div key={`${history.verifiedAt}-${index}`} className={styles.historyItem}>
                            <strong>{history.verificationType}</strong>
                            <span>{history.status}</span>
                            <span>{history.failureCode ? `${history.failureCode} · ${history.failureMessage || '-'}` : (history.failureMessage || formatDateTime(history.verifiedAt))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className={styles.infoCard}>
                    <h4>지도 검증 이력</h4>
                    {mapHistories.length === 0 ? (
                      <p className={styles.mutedText}>아직 지도 검증 이력이 없습니다.</p>
                    ) : (
                      <div className={styles.historyList}>
                        {mapHistories.map((history, index) => (
                          <div key={`${history.verifiedAt}-${index}`} className={styles.historyItem}>
                            <strong>{history.queryText}</strong>
                            <span>{history.status}</span>
                            <span>
                              {history.selectedPlaceName
                                ? `${history.selectedPlaceName} · ${history.selectedRoadAddress || history.selectedJibunAddress || '-'}`
                                : `${history.failureCode || 'MAP_FAILED'} · ${history.failureMessage || formatDateTime(history.verifiedAt)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </div>

                <article className={styles.actionCard}>
                  <div className={styles.cardHeaderRow}>
                    <div>
                      <h4>운영 액션</h4>
                      <p>국세청 자동 검증과 카카오 검증 결과를 확인하고, 예외 상황만 수동 보정한 뒤 최종 승인 또는 반려를 처리합니다.</p>
                    </div>
                  </div>

                  {detailApplication.requestStatus !== 'APPROVED' && detailApplication.requestStatus !== 'REJECTED' ? (
                    <>
                      <div className={styles.actionPanel}>
                        <div className={styles.actionSection}>
                          <h5>사업자 검증</h5>
                          <button
                            className={styles.secondaryButton}
                            onClick={handleExecuteBusinessVerification}
                            disabled={isRunningBusinessVerification}
                          >
                            <RefreshCcw size={16} /> {isRunningBusinessVerification ? '자동 검증 중' : '국세청 자동 검증 재실행'}
                          </button>

                          {canManualOverride ? (
                            <>
                              <textarea
                                className={styles.textarea}
                                placeholder="자동 검증 결과를 수동으로 보정할 때 사유를 입력하세요"
                                value={verificationReason}
                                onChange={(event) => setVerificationReason(event.target.value)}
                              />
                              <div className={styles.actionButtons}>
                                <button
                                  className={styles.secondarySuccessButton}
                                  onClick={() => handleManualVerification(true)}
                                  disabled={isManualVerifying}
                                >
                                  <CheckCircle2 size={18} /> {isManualVerifying ? '처리 중...' : '수동 검증 완료'}
                                </button>
                                <button
                                  className={styles.secondaryDangerButton}
                                  onClick={() => handleManualVerification(false)}
                                  disabled={isManualVerifying}
                                >
                                  <XCircle size={18} /> {isManualVerifying ? '처리 중...' : '수동 검증 실패'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className={styles.mutedText}>자동 검증이 실패하거나 불가한 경우에만 수동 보정을 할 수 있습니다.</p>
                          )}
                        </div>

                        <div className={styles.actionSection}>
                          <h5>최종 승인</h5>
                          <label className={styles.confirmCard}>
                            <input
                              type="checkbox"
                              checked={approvalChecked}
                              onChange={(event) => setApprovalChecked(event.target.checked)}
                              className={styles.confirmCheckbox}
                            />
                            <div>
                              <strong>관리자 최종 확인</strong>
                              <span>사업자 검증과 카카오맵 검증 결과를 확인했고, 이 신청을 최종 승인해도 된다고 판단했습니다.</span>
                            </div>
                          </label>

                          <textarea
                            className={styles.textarea}
                            placeholder="반려 시 사유를 입력하세요"
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                          />
                        </div>
                      </div>

                      {actionError && <p className={styles.errorText}>{actionError}</p>}

                      <div className={styles.actionButtons}>
                        <button
                          className={styles.approveButton}
                          onClick={handleApprove}
                          disabled={isApproving || isRejecting || !approvalChecked || !canApprove}
                        >
                          <CheckCircle2 size={18} /> {isApproving ? '승인 처리 중...' : '최종 승인'}
                        </button>
                        <button
                          className={styles.rejectButton}
                          onClick={handleReject}
                          disabled={isApproving || isRejecting}
                        >
                          <XCircle size={18} /> {isRejecting ? '반려 처리 중...' : '반려 처리'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.inlineEmptyState}>
                      <CheckCircle2 size={18} />
                      <p>이 신청은 이미 최종 처리되었습니다. 상태와 이력을 확인해 주세요.</p>
                    </div>
                  )}
                </article>
              </>
            )}
          </div>
        </section>

        <section className={styles.listPanel} style={{ display: 'grid', gap: '1rem' }}>
          <div className={styles.panelHeader}>
            <div>
              <h3>점주별 등록 매장</h3>
              <p>점주를 선택하면 해당 점주의 연결 매장과 운영 종료 요청만 우선 확인합니다.</p>
            </div>
            <label className={styles.searchBox}>
              <Search size={16} />
              <input
                value={ownerQuery}
                onChange={(event) => setOwnerQuery(event.target.value)}
                placeholder="점주명, 이메일, 매장명 검색"
              />
            </label>
          </div>

          {storeListError && <p className={styles.errorBanner}>{storeListError}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)', gap: '1rem' }}>
            <div className={styles.applicationList}>
              {isLoadingStores || !ownerStores.length ? (
                <div className={styles.emptyState}>
                  <Activity size={20} />
                  <p>점주별 등록 매장을 불러오는 중입니다.</p>
                </div>
              ) : filteredOwnerGroups.length === 0 ? (
                <div className={styles.emptyState}>
                  <FileSearch size={20} />
                  <p>조건에 맞는 점주가 없습니다.</p>
                </div>
              ) : (
                filteredOwnerGroups.map((group) => {
                  const isSelected = selectedOwnerGroup?.ownerUserId === group.ownerUserId;
                  return (
                    <button
                      key={group.ownerUserId}
                      type="button"
                      className={styles.applicationCard}
                      onClick={() => setSelectedOwnerUserId(group.ownerUserId)}
                      style={{
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                      }}
                    >
                      <div className={styles.applicationTop}>
                        <div>
                          <strong>{group.ownerNickname}</strong>
                          <span>{group.ownerEmail || '이메일 없음'}</span>
                        </div>
                        <span style={{ padding: '0.35rem 0.65rem', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 800 }}>
                          {group.storeCount}개
                        </span>
                      </div>
                      <div className={styles.applicationMeta}>
                        <span>운영 종료 요청: {group.pendingClosureCount}건</span>
                        <span>연결 매장 클릭 시 우측 상세가 바뀝니다.</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className={styles.applicationList}>
              <article className={styles.applicationCard} style={{ cursor: 'default', alignItems: 'stretch' }}>
                <div className={styles.applicationTop}>
                  <div>
                    <strong>{selectedOwnerGroup ? `${selectedOwnerGroup.ownerNickname} 연결 매장` : '선택된 점주 없음'}</strong>
                    <span>{selectedOwnerGroup?.ownerEmail || '점주를 선택해 주세요.'}</span>
                  </div>
                  <span className={styles.statusPill}>{selectedOwnerGroup ? `${selectedOwnerGroup.storeCount}개 매장` : '대기'}</span>
                </div>
                {selectedOwnerGroup ? (
                  selectedOwnerGroup.stores.length === 0 ? (
                    <div className={styles.inlineEmptyState}>
                      <FileSearch size={18} />
                      <p>등록된 매장이 없습니다.</p>
                    </div>
                  ) : (
                    selectedOwnerGroup.stores.map((store) => (
                      <div
                        key={store.linkId || store.storeId}
                        className={styles.applicationCard}
                        style={{ cursor: 'default', alignItems: 'stretch', marginTop: '0.75rem' }}
                      >
                        <div className={styles.applicationTop}>
                          <div>
                            <strong>{store.storeName || store.name || '미확인 매장'}</strong>
                            <span>{store.categoryName || '카테고리 미지정'} · {store.operationalState || store.liveBusinessStatus || '-'}</span>
                          </div>
                          <span className={`${styles.statusPill} ${styles[`tone${store.operationalState === 'CLOSURE_REQUESTED' ? 'warning' : 'neutral'}`]}`}>
                            {store.menuEditable ? '메뉴 가능' : '메뉴 제한'}
                          </span>
                        </div>
                        <div className={styles.applicationMeta}>
                          <span>주소: {store.storeAddress || store.roadAddress || store.address || '-'}</span>
                          <span>전화: {store.phone || '-'}</span>
                          <span>등록 여부: {store.verified ? '등록됨' : '미등록'}</span>
                          <span>운영 상태: {store.operationalState || store.liveBusinessStatus || '-'}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className={styles.inlineEmptyState}>
                    <Search size={18} />
                    <p>왼쪽에서 점주를 선택해 주세요.</p>
                  </div>
                )}
              </article>

              <article className={styles.applicationCard} style={{ cursor: 'default', alignItems: 'stretch' }}>
                <div className={styles.applicationTop}>
                  <div>
                    <strong>운영 종료 요청</strong>
                    <span>선택한 점주의 요청만 우선 확인합니다.</span>
                  </div>
                  <span className={styles.statusPill}>{closureRequests.filter((request) => !selectedOwnerGroup || request.ownerUserId === selectedOwnerGroup.ownerUserId).length}건</span>
                </div>
                {closureRequestListError && <p className={styles.errorBanner}>{closureRequestListError}</p>}
                {isLoadingClosureRequests ? (
                  <div className={styles.inlineEmptyState}>
                    <Activity size={18} />
                    <p>운영 종료 요청을 불러오는 중입니다.</p>
                  </div>
                ) : closureRequests.filter((request) => !selectedOwnerGroup || request.ownerUserId === selectedOwnerGroup.ownerUserId).length === 0 ? (
                  <div className={styles.inlineEmptyState}>
                    <FileSearch size={18} />
                    <p>대기 중인 운영 종료 요청이 없습니다.</p>
                  </div>
                ) : (
                  closureRequests
                    .filter((request) => !selectedOwnerGroup || request.ownerUserId === selectedOwnerGroup.ownerUserId)
                    .map((request) => {
                      const meta = getClosureRequestStatusMeta(request.status);
                      const isSelected = selectedClosureRequestId === request.requestId;
                      return (
                        <div key={request.requestId} className={styles.applicationCard} style={{ cursor: 'default', alignItems: 'stretch', marginTop: '0.75rem' }}>
                          <div className={styles.applicationTop}>
                            <div>
                              <strong>{request.storeName || '미확인 매장'}</strong>
                              <span>{request.ownerNickname || request.ownerEmail || '소유자 미상'}</span>
                            </div>
                            <span className={`${styles.statusPill} ${styles[`tone${meta.tone}`]}`}>{meta.label}</span>
                          </div>
                          <div className={styles.applicationMeta}>
                            <span>요청 사유: {request.reason || '사유 없음'}</span>
                            <span>요청 시각: {formatDateTime(request.createdAt)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={styles.approveButton}
                              onClick={() => handleApproveClosureRequest(request)}
                              disabled={isApprovingClosureRequest || isRejectingClosureRequest}
                            >
                              <CheckCircle2 size={18} /> {isApprovingClosureRequest ? '승인 중...' : '승인'}
                            </button>
                            <button
                              type="button"
                              className={styles.rejectButton}
                              onClick={() => setSelectedClosureRequestId(request.requestId)}
                              disabled={isApprovingClosureRequest || isRejectingClosureRequest}
                            >
                              <XCircle size={18} /> 반려 사유 입력
                            </button>
                          </div>
                          {isSelected && (
                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                              <textarea
                                className={styles.textarea}
                                placeholder="반려 사유를 입력하세요"
                                value={closureRejectReason}
                                onChange={(event) => setClosureRejectReason(event.target.value)}
                                style={{ minHeight: 108 }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className={styles.rejectButton}
                                  onClick={() => handleRejectClosureRequest(request)}
                                  disabled={isApprovingClosureRequest || isRejectingClosureRequest}
                                >
                                  <XCircle size={18} /> {isRejectingClosureRequest ? '반려 중...' : '반려 처리'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </article>
            </div>
          </div>
        </section>

        <section className={styles.listPanel} style={{ display: 'grid', gap: '1rem' }}>
          <div className={styles.panelHeader}>
            <div>
              <h3>전체 매장 현황</h3>
              <p>삭제 버튼 없이 읽기 전용으로 확인합니다.</p>
            </div>
            <label className={styles.searchBox}>
              <Search size={16} />
              <input
                value={storeQuery}
                onChange={(event) => setStoreQuery(event.target.value)}
                placeholder="매장명, 카테고리, 주소 검색"
              />
            </label>
          </div>

          {storeListError && <p className={styles.errorBanner}>{storeListError}</p>}

          {isLoadingStores ? (
            <div className={styles.emptyState}>
              <Activity size={20} />
              <p>관리자 매장 목록을 불러오는 중입니다.</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className={styles.emptyState}>
              <FileSearch size={20} />
              <p>조건에 맞는 매장이 없습니다.</p>
            </div>
          ) : (
            <div className={styles.applicationList}>
              {filteredStores.map((store) => (
                <div
                  key={store.storeId}
                  className={styles.applicationCard}
                  style={{ cursor: 'default', alignItems: 'stretch' }}
                >
                  <div className={styles.applicationTop}>
                    <div>
                      <strong>{store.name || store.storeName}</strong>
                      <span>{store.categoryName || '카테고리 미지정'} · {store.liveBusinessStatus || store.businessStatus || '-'}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => setSelectedOwnerUserId(ownerStores.find((linkedStore) => linkedStore.storeId === store.storeId)?.ownerUserId ?? selectedOwnerUserId)}
                    >
                      <Users size={16} /> 점주 보기
                    </button>
                  </div>
                  <div className={styles.applicationMeta}>
                    <span>주소: {store.roadAddress || store.address || store.jibunAddress || '-'}</span>
                    <span>전화: {store.phone || '-'}</span>
                    <span>등록 여부: {store.verified ? '등록됨' : '미등록'}</span>
                    <span>상태: {store.liveBusinessStatus || store.businessStatus || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.listPanel} style={{ display: 'grid', gap: '1rem' }}>
          <div className={styles.panelHeader}>
            <div>
              <h3>운영 종료 요청</h3>
              <p>점주가 제출한 종료 요청을 검토하고 승인 또는 반려합니다.</p>
            </div>
            <div style={{ display: 'grid', gap: '0.35rem', minWidth: 280 }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                {closureRequestStats.pending}건 대기 중
              </span>
              <textarea
                className={styles.textarea}
                placeholder="선택한 요청의 반려 사유를 입력하세요"
                value={closureRejectReason}
                onChange={(event) => setClosureRejectReason(event.target.value)}
                style={{ minHeight: 84 }}
              />
            </div>
          </div>

          {closureRequestListError && <p className={styles.errorBanner}>{closureRequestListError}</p>}

          {isLoadingClosureRequests ? (
            <div className={styles.emptyState}>
              <Activity size={20} />
              <p>운영 종료 요청을 불러오는 중입니다.</p>
            </div>
          ) : closureRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <FileSearch size={20} />
              <p>대기 중인 운영 종료 요청이 없습니다.</p>
            </div>
          ) : (
            <div className={styles.applicationList}>
              {closureRequests.map((request) => {
                const statusMeta = getClosureRequestStatusMeta(request.status);
                const isSelected = selectedClosureRequestId === request.requestId;

                return (
                  <div
                    key={request.requestId}
                    className={styles.applicationCard}
                    style={{ cursor: 'default', alignItems: 'stretch' }}
                  >
                    <div className={styles.applicationTop}>
                      <div>
                        <strong>{request.storeName || '미확인 매장'}</strong>
                        <span>
                          {request.ownerName || request.ownerEmail || '소유자 미상'}
                          {request.storeId ? ` · Store #${request.storeId}` : ''}
                        </span>
                      </div>
                      <span className={`${styles.statusPill} ${styles[`tone${statusMeta.tone}`]}`}>{statusMeta.label}</span>
                    </div>
                    <div className={styles.applicationMeta}>
                      <span>요청 사유: {request.reason || '사유 없음'}</span>
                      <span>요청 시각: {formatDateTime(request.createdAt)}</span>
                      {request.reviewedAt && <span>처리 시각: {formatDateTime(request.reviewedAt)}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.approveButton}
                        onClick={() => handleApproveClosureRequest(request)}
                        disabled={isApprovingClosureRequest || isRejectingClosureRequest}
                      >
                        <CheckCircle2 size={18} /> {isApprovingClosureRequest ? '승인 중...' : '승인'}
                      </button>
                      <button
                        type="button"
                        className={styles.rejectButton}
                        onClick={() => setSelectedClosureRequestId(request.requestId)}
                        disabled={isApprovingClosureRequest || isRejectingClosureRequest}
                      >
                        <XCircle size={18} /> 반려 사유 입력
                      </button>
                    </div>
                    {isSelected && (
                      <div style={{ display: 'grid', gap: '0.65rem' }}>
                        <textarea
                          className={styles.textarea}
                          placeholder="반려 사유를 입력하세요"
                          value={closureRejectReason}
                          onChange={(event) => setClosureRejectReason(event.target.value)}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={styles.rejectButton}
                            onClick={() => handleRejectClosureRequest(request)}
                            disabled={isApprovingClosureRequest || isRejectingClosureRequest}
                          >
                            <XCircle size={18} /> {isRejectingClosureRequest ? '반려 중...' : '반려 처리'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
