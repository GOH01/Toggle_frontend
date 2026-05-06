import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, ShieldCheck, Users, Store, Activity, 
  AlertTriangle, List, Plus, Trash2, Edit, Check, X, Search
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import {
  approveStoreClosureRequest,
  fetchAdminOwnerStores,
  fetchAdminStoreClosureRequests,
  fetchAdminStores,
  rejectStoreClosureRequest,
} from '../lib/admin';
import { getClosureRequestStatusMeta } from '../lib/storeContracts';
import styles from './Admin.module.css';

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  const [stores, setStores] = useState([]);
  const [ownerStores, setOwnerStores] = useState([]);
  const [closureRequests, setClosureRequests] = useState([]);
  const [closureRequestError, setClosureRequestError] = useState('');
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingClosureRequests, setIsLoadingClosureRequests] = useState(true);
  const [isLoadingOwnerStores, setIsLoadingOwnerStores] = useState(true);
  const [selectedClosureRequestId, setSelectedClosureRequestId] = useState(null);
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState(null);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [closureRejectReason, setClosureRejectReason] = useState('');
  const [isApprovingClosureRequest, setIsApprovingClosureRequest] = useState(false);
  const [isRejectingClosureRequest, setIsRejectingClosureRequest] = useState(false);
  const [publics, setPublics] = useState([]);
  
  // 필터링 상태 (전국 시/도 단위 확장)
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const regions = ['전체', '서울', '부산', '제주', '경기', '인천', '대전', '대구', '광주', '강원'];
  
  const [reports] = useState([
    { id: 1, type: '정보오류', target: '맛있는 덮밥집', desc: '영업시간이 다릅니다.', date: '방금 전', status: '처리중' },
    { id: 2, type: '시스템오류', target: '지도화면', desc: 'GPS가 잡히지 않습니다.', date: '1시간 전', status: '대기' },
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadAdminData() {
      setIsLoadingStores(true);
      setIsLoadingOwnerStores(true);
      setIsLoadingClosureRequests(true);
      setClosureRequestError('');

      try {
        const [storeResult, ownerResult, closureResult] = await Promise.allSettled([
          fetchAdminStores(),
          fetchAdminOwnerStores(),
          fetchAdminStoreClosureRequests('PENDING'),
        ]);

        if (!ignore) {
          if (storeResult.status === 'fulfilled') {
            const storeData = storeResult.value;
            setStores(Array.isArray(storeData?.stores) ? storeData.stores : []);
          }

          if (closureResult.status === 'fulfilled') {
            setClosureRequests(closureResult.value);
            setSelectedClosureRequestId(closureResult.value[0]?.requestId ?? null);
          } else {
            setClosureRequestError(closureResult.reason?.message || '운영 종료 요청 목록을 불러오지 못했습니다.');
            setClosureRequests([]);
          }

          if (ownerResult && ownerResult.status === 'fulfilled') {
            const normalizedOwnerStores = Array.isArray(ownerResult.value) ? ownerResult.value : [];
            setOwnerStores(normalizedOwnerStores);
            setSelectedOwnerUserId((current) => {
              if (current && normalizedOwnerStores.some((store) => store.ownerUserId === current)) {
                return current;
              }
              return normalizedOwnerStores[0]?.ownerUserId ?? null;
            });
          } else if (ownerResult) {
            setOwnerStores([]);
          }
        }
      } catch (error) {
        if (!ignore) {
          setClosureRequestError(error.message || '관리자 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingStores(false);
          setIsLoadingOwnerStores(false);
          setIsLoadingClosureRequests(false);
        }
      }
    }

    loadAdminData();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDeletePublic = (id) => {
    if(window.confirm('정말 삭제하시겠습니까?')) {
      setPublics(publics.filter(p => p.id !== id));
    }
  };

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
    const query = ownerQuery.trim().toLowerCase();
    if (!query) {
      return ownerGroups;
    }

    return ownerGroups.filter((group) => {
      return [
        group.ownerNickname,
        group.ownerEmail,
        ...group.stores.map((store) => store.storeName || store.name || ''),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [ownerGroups, ownerQuery]);

  const selectedOwnerGroup = useMemo(() => {
    if (!filteredOwnerGroups.length) {
      return null;
    }

    return filteredOwnerGroups.find((group) => group.ownerUserId === selectedOwnerUserId) || filteredOwnerGroups[0];
  }, [filteredOwnerGroups, selectedOwnerUserId]);

  const handleApproveClosureRequest = async (request) => {
    if (!request?.requestId) {
      return;
    }

    setClosureRequestError('');
    setIsApprovingClosureRequest(true);

    try {
      await approveStoreClosureRequest(request.requestId);
      const [storeResult, closureResult] = await Promise.allSettled([
        fetchAdminStores(),
        fetchAdminStoreClosureRequests('PENDING'),
      ]);
      if (storeResult.status === 'fulfilled') {
        setStores(Array.isArray(storeResult.value?.stores) ? storeResult.value.stores : []);
      }
      if (closureResult.status === 'fulfilled') {
        setClosureRequests(closureResult.value);
        setSelectedClosureRequestId(closureResult.value[0]?.requestId ?? null);
      }
    } catch (error) {
      setClosureRequestError(error.message || '운영 종료 요청 승인에 실패했습니다.');
    } finally {
      setIsApprovingClosureRequest(false);
    }
  };

  const handleRejectClosureRequest = async (request) => {
    if (!request?.requestId) {
      return;
    }

    if (!closureRejectReason.trim()) {
      setClosureRequestError('운영 종료 요청 반려 사유를 입력해 주세요.');
      return;
    }

    setClosureRequestError('');
    setIsRejectingClosureRequest(true);

    try {
      await rejectStoreClosureRequest(request.requestId, closureRejectReason.trim());
      setClosureRejectReason('');
      const [storeResult, closureResult] = await Promise.allSettled([
        fetchAdminStores(),
        fetchAdminStoreClosureRequests('PENDING'),
      ]);
      if (storeResult.status === 'fulfilled') {
        setStores(Array.isArray(storeResult.value?.stores) ? storeResult.value.stores : []);
      }
      if (closureResult.status === 'fulfilled') {
        setClosureRequests(closureResult.value);
        setSelectedClosureRequestId(closureResult.value[0]?.requestId ?? null);
      }
    } catch (error) {
      setClosureRequestError(error.message || '운영 종료 요청 반려에 실패했습니다.');
    } finally {
      setIsRejectingClosureRequest(false);
    }
  };

  // --- Sub Renders ---

  // 1. 대시보드 통계 홈
  const renderDashboard = () => (
    <>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>가입 매장</span><Store size={18} /></div>
          <div className={styles.statValue}>{stores.length}</div>
          <div className={`${styles.trend} ${styles.up}`}>+12 이번 주</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>공공기관 연동</span><Activity size={18} /></div>
          <div className={styles.statValue}>{publics.length}</div>
          <div className={`${styles.trend} ${styles.up}`}>+2 이번 주</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>활성 사용자</span><Users size={18} /></div>
          <div className={styles.statValue}>8,942</div>
          <div className={`${styles.trend} ${styles.up}`}>+340 이번 주</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>미처리 제보</span><AlertTriangle size={18} color="var(--color-status-orange)" /></div>
          <div className={styles.statValue} style={{ color: 'var(--color-status-orange)' }}>{reports.filter(r => r.status === '대기').length}</div>
          <div className={`${styles.trend} ${styles.down}`}>-3 어제보다 감소</div>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>최근 상태 변경 로그 (실시간 모니터링)</h2>
        <div className={styles.tableCard}>
          <div className={`${styles.tableHeader} ${styles.grid3}`}>
            <div>매장명</div><div>현재 상태</div><div style={{ textAlign: 'right' }}>갱신 시간</div>
          </div>
          {stores.slice(0, 3).map(store => (
            <div key={store.id} className={`${styles.tableRow} ${styles.grid3}`}>
              <div className={styles.cellName}>{store.name}<span className={styles.cellCategory}>{store.category}</span></div>
              <div><StatusBadge status={store.status} type="STORE" /></div>
              <div style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{store.lastStatusUpdate}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  // 2. 매장 관리
  const renderStores = () => {
    // 지역 필터 적용
    const filteredStores = selectedRegion === '전체' 
      ? stores 
      : stores.filter(s => s.address.includes(selectedRegion));

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 className={styles.sectionTitle}>전체 매장 현황</h2>
            <select 
              className={styles.filterSelect}
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontWeight: 600, background: 'white' }}
            >
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className={styles.addButton} onClick={() => setActiveTab('OWNERS')}><Users size={16} /> 점주별 보기</button>
        </div>
        {isLoadingStores ? (
          <div className={styles.tableCard}>
            <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>매장 목록을 불러오는 중입니다...</div>
          </div>
        ) : (
        <div className={styles.tableCard}>
          <div className={`${styles.tableHeader} ${styles.grid4}`}>
            <div>매장명</div><div>상태</div><div>위치</div><div style={{ textAlign: 'right' }}>점주 보기</div>
          </div>
          {filteredStores.map(store => (
            <div key={store.id} className={`${styles.tableRow} ${styles.grid4}`}>
              <div className={styles.cellName}>{store.name}<span className={styles.cellCategory}>{store.category}</span></div>
              <div style={{ display: 'flex' }}><StatusBadge status={store.status} type="STORE" /></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{store.address.split(' ').slice(1,3).join(' ')}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className={styles.iconBtn} onClick={() => setActiveTab('OWNERS')}>
                  <Users size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </section>
    );
  };

  const renderClosureRequests = () => (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>운영 종료 요청</h2>
        <button className={styles.addButton} onClick={() => setActiveTab('STORES')}>
          <Store size={16} /> 매장 목록 보기
        </button>
      </div>
      <div className={styles.tableCard}>
        {closureRequestError && (
          <div style={{ padding: '0.75rem 1rem', color: 'var(--color-status-red)' }}>{closureRequestError}</div>
        )}
        {isLoadingClosureRequests ? (
          <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>요청을 불러오는 중입니다...</div>
        ) : closureRequests.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>대기 중인 운영 종료 요청이 없습니다.</div>
        ) : (
          closureRequests.map((request) => {
            const meta = getClosureRequestStatusMeta(request.status);
            const isSelected = selectedClosureRequestId === request.requestId;
            return (
              <div key={request.requestId} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{request.storeName || '미확인 매장'}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{request.ownerName || request.ownerEmail || '소유자 미상'}</div>
                  </div>
                  <span style={{ padding: '0.35rem 0.65rem', borderRadius: 999, background: 'rgba(59, 130, 246, 0.14)', color: '#bfdbfe', fontSize: '0.75rem', fontWeight: 800 }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  요청 사유: {request.reason || '사유 없음'}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  요청 시각: {request.createdAt || '-'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className={styles.addButton} onClick={() => handleApproveClosureRequest(request)} disabled={isApprovingClosureRequest || isRejectingClosureRequest}>
                    <Check size={16} /> 승인
                  </button>
                  <button className={styles.iconBtn} style={{ color: 'var(--color-status-red)' }} onClick={() => setSelectedClosureRequestId(request.requestId)} disabled={isApprovingClosureRequest || isRejectingClosureRequest}>
                    <X size={16} /> 반려 사유
                  </button>
                </div>
                {isSelected && (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <textarea
                      className={styles.filterSelect}
                      value={closureRejectReason}
                      onChange={(e) => setClosureRejectReason(e.target.value)}
                      placeholder="반려 사유를 입력하세요"
                      style={{ minHeight: 88, padding: '0.75rem', borderRadius: 12, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className={styles.iconBtn} style={{ color: 'var(--color-status-red)' }} onClick={() => handleRejectClosureRequest(request)} disabled={isApprovingClosureRequest || isRejectingClosureRequest}>
                        <X size={16} /> {isRejectingClosureRequest ? '반려 중...' : '반려 처리'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );

  // 3. 공공기관 관리
  const renderPublics = () => (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>공공기관 데이터 관리</h2>
        <button className={styles.addButton}><Plus size={16} /> 신규 연동</button>
      </div>
      <div className={styles.tableCard}>
        <div className={`${styles.tableHeader} ${styles.grid4}`}>
          <div>기관명</div><div>혼잡도</div><div>대기시간</div><div style={{ textAlign: 'right' }}>관리</div>
        </div>
        {publics.map(pub => (
          <div key={pub.id} className={`${styles.tableRow} ${styles.grid4}`}>
            <div className={styles.cellName}>{pub.name}<span className={styles.cellCategory}>{pub.category}</span></div>
            <div><StatusBadge status={pub.status} type="CONGESTION" /></div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{pub.estimatedWaitTime}</div>
            <div className={styles.actions}>
              <button className={styles.iconBtn}><Edit size={16} /></button>
              <button className={styles.iconBtn} style={{ color: 'var(--color-status-red)' }} onClick={() => handleDeletePublic(pub.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  // 4. 점주 관리
  const renderOwners = () => (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <h2 className={styles.sectionTitle}>점주별 등록 매장</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            점주를 선택하면 연결된 매장과 운영 종료 요청을 한 화면에서 확인합니다.
          </p>
        </div>
        <label className={styles.searchBox} style={{ minWidth: 280 }}>
          <Search size={16} />
          <input
            value={ownerQuery}
            onChange={(event) => setOwnerQuery(event.target.value)}
            placeholder="점주명, 이메일, 매장명 검색"
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)', gap: '1rem' }}>
        <div className={styles.tableCard} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
            {isLoadingOwnerStores ? '점주 목록을 불러오는 중입니다...' : `${filteredOwnerGroups.length}명의 점주`}
          </div>
          {filteredOwnerGroups.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>조건에 맞는 점주가 없습니다.</div>
          ) : (
            filteredOwnerGroups.map((group) => {
              const isSelected = selectedOwnerGroup?.ownerUserId === group.ownerUserId;
              return (
                <button
                  key={group.ownerUserId}
                  type="button"
                  onClick={() => setSelectedOwnerUserId(group.ownerUserId)}
                  className={styles.tableRow}
                  style={{
                    textAlign: 'left',
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                    borderRadius: 16,
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{group.ownerNickname}</strong>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{group.ownerEmail || '이메일 없음'}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{group.storeCount}개 매장</span>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                    운영 종료 요청 {group.pendingClosureCount}건
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className={styles.tableCard} style={{ display: 'grid', gap: '0.75rem' }}>
            <div className={styles.sectionHeader} style={{ padding: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{selectedOwnerGroup ? `${selectedOwnerGroup.ownerNickname} 연결 매장` : '선택된 점주 없음'}</h3>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  점주별 등록 매장만 보여줍니다. 삭제 버튼은 제거하고 운영 종료 요청 흐름만 유지합니다.
                </p>
              </div>
            </div>

            {!selectedOwnerGroup ? (
              <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>점주를 선택해 주세요.</div>
            ) : selectedOwnerGroup.stores.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>등록된 매장이 없습니다.</div>
            ) : (
              <div className={styles.tableCard} style={{ boxShadow: 'none', margin: 0 }}>
                <div className={`${styles.tableHeader} ${styles.grid4}`}>
                  <div>매장명</div><div>상태</div><div>카테고리</div><div style={{ textAlign: 'right' }}>연결</div>
                </div>
                {selectedOwnerGroup.stores.map((store) => (
                  <div key={store.linkId || store.storeId} className={`${styles.tableRow} ${styles.grid4}`}>
                    <div className={styles.cellName}>{store.storeName || store.name || '미확인 매장'}</div>
                    <div style={{ display: 'flex' }}>
                      <StatusBadge status={store.operationalState || store.liveBusinessStatus || 'ACTIVE'} type="STORE" />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{store.categoryName || '-'}</div>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {store.menuEligible ? '메뉴 가능' : '메뉴 제한'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.tableCard} style={{ display: 'grid', gap: '0.75rem' }}>
            <div className={styles.sectionHeader} style={{ padding: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>선택된 점주의 운영 종료 요청</h3>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                  요청 우선순위는 운영 종료 상태를 먼저 확인하는 방식으로 유지합니다.
                </p>
              </div>
            </div>
            {closureRequests.filter((request) => !selectedOwnerGroup || request.ownerUserId === selectedOwnerGroup.ownerUserId).length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>표시할 운영 종료 요청이 없습니다.</div>
            ) : (
              closureRequests
                .filter((request) => !selectedOwnerGroup || request.ownerUserId === selectedOwnerGroup.ownerUserId)
                .map((request) => {
                  const meta = getClosureRequestStatusMeta(request.status);
                  const isSelected = selectedClosureRequestId === request.requestId;
                  return (
                    <div
                      key={request.requestId}
                      style={{
                        cursor: 'default',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        borderRadius: 16,
                        padding: '1rem',
                        background: 'white',
                        display: 'grid',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div>
                          <strong>{request.storeName || '미확인 매장'}</strong>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            {request.ownerNickname || request.ownerEmail || '소유자 미상'}
                          </div>
                        </div>
                        <span style={{ padding: '0.35rem 0.65rem', borderRadius: 999, background: 'rgba(59, 130, 246, 0.14)', color: '#bfdbfe', fontSize: '0.75rem', fontWeight: 800 }}>
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        <span>요청 사유: {request.reason || '사유 없음'}</span>
                        <span>요청 시각: {request.createdAt || '-'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className={styles.addButton} onClick={() => handleApproveClosureRequest(request)} disabled={isApprovingClosureRequest || isRejectingClosureRequest}>
                          <Check size={16} /> 승인
                        </button>
                        <button className={styles.iconBtn} style={{ color: 'var(--color-status-red)' }} onClick={() => setSelectedClosureRequestId(request.requestId)} disabled={isApprovingClosureRequest || isRejectingClosureRequest}>
                          <X size={16} /> 반려 사유
                        </button>
                      </div>
                      {isSelected && (
                        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <textarea
                            className={styles.filterSelect}
                            value={closureRejectReason}
                            onChange={(e) => setClosureRejectReason(e.target.value)}
                            placeholder="반려 사유를 입력하세요"
                            style={{ minHeight: 96, padding: '0.85rem', borderRadius: 14, resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className={styles.iconBtn} style={{ color: 'var(--color-status-red)' }} onClick={() => handleRejectClosureRequest(request)} disabled={isApprovingClosureRequest || isRejectingClosureRequest}>
                              <X size={16} /> {isRejectingClosureRequest ? '반려 중...' : '반려 처리'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}><ShieldCheck size={20} color="white" /></div>
          <h1 className={styles.title}>Toggle <span className={styles.subtitle}>Admin</span></h1>
        </div>
        <button className={styles.logoutBtn} onClick={() => navigate('/login')}>
          <LogOut size={18} /> 로그아웃
        </button>
      </header>

      <div className={styles.mainFrame}>
        {/* 사이드바 메뉴 */}
        <nav className={styles.sidebar}>
          <button className={`${styles.navItem} ${activeTab === 'DASHBOARD' ? styles.activeNav : ''}`} onClick={() => setActiveTab('DASHBOARD')}><Activity size={18} /> 대시보드</button>
          <button className={`${styles.navItem} ${activeTab === 'STORES' ? styles.activeNav : ''}`} onClick={() => setActiveTab('STORES')}><Store size={18} /> 매장 관리</button>
          <button className={`${styles.navItem} ${activeTab === 'CLOSURE' ? styles.activeNav : ''}`} onClick={() => setActiveTab('CLOSURE')}><Clock size={18} /> 종료 요청</button>
          <button className={`${styles.navItem} ${activeTab === 'PUBLIC' ? styles.activeNav : ''}`} onClick={() => setActiveTab('PUBLIC')}><List size={18} /> 공공기관 관리</button>
          <button className={`${styles.navItem} ${activeTab === 'OWNERS' ? styles.activeNav : ''}`} onClick={() => setActiveTab('OWNERS')}><Users size={18} /> 점주 관리</button>
          <button className={styles.navItem} style={{ color: 'var(--color-status-orange)' }} onClick={() => alert('신고/로그 탭 확장 준비중')}><AlertTriangle size={18} /> 신고/오류</button>
        </nav>

        {/* 메인 컨텐츠 */}
        <main className={styles.content}>
          {activeTab === 'DASHBOARD' && renderDashboard()}
          {activeTab === 'STORES' && renderStores()}
          {activeTab === 'CLOSURE' && renderClosureRequests()}
          {activeTab === 'PUBLIC' && renderPublics()}
          {activeTab === 'OWNERS' && renderOwners()}
        </main>
      </div>
    </div>
  );
}
