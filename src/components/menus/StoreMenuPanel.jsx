import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Save, Trash2, UtensilsCrossed } from 'lucide-react';
import {
  fetchOwnerStoreMenus,
  fetchStoreMenus,
  getClosureRequestStatusMeta,
  isMenuCategorySupported,
  resolveStoreMenuAccess,
  saveOwnerStoreMenus,
} from '../../lib/storeMenus';

function createDraft(menu = {}, index = 0) {
  return {
    draftId: menu.menuId ? `menu-${menu.menuId}` : `draft-${Date.now()}-${index}`,
    name: menu.name || '',
    price: menu.price ?? '',
    representative: Boolean(menu.representative),
    description: menu.description || '',
    imageUrl: menu.imageUrl || '',
    displayOrder: menu.displayOrder ?? index,
    available: menu.available !== false,
  };
}

function toPayload(menus) {
  return menus.map((menu, index) => ({
    name: String(menu.name || '').trim(),
    price: Number(menu.price),
    representative: Boolean(menu.representative),
    description: String(menu.description || '').trim() || null,
    imageUrl: String(menu.imageUrl || '').trim() || null,
    displayOrder: Number.isFinite(Number(menu.displayOrder)) ? Number(menu.displayOrder) : index,
    available: menu.available !== false,
  }));
}

export default function StoreMenuPanel({
  store = null,
  storeId,
  storeName,
  categoryName,
  menuEligible,
  menuEditable,
  menuEligibilityReason,
  operationalState,
  closureRequestStatus,
  mode = 'read',
  compact = false,
}) {
  const editable = mode === 'edit';
  const resolvedStore = store || {
    storeId,
    storeName,
    categoryName,
    menuEligible,
    menuEditable,
    menuEligibilityReason,
    operationalState,
    closureRequestStatus,
  };
  const access = resolveStoreMenuAccess(resolvedStore);
  const menuCategorySupported = isMenuCategorySupported(access.categoryName || categoryName);
  const canEditMenus = editable && access.menuEditable;

  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const [menus, setMenus] = useState([]);
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadMenus() {
      if (!storeId) {
        if (!ignore) {
          setLoading(false);
          setSupported(false);
          setMenus([]);
          setDrafts([]);
        }
        return;
      }

      if (!access.menuEligible || !menuCategorySupported) {
        if (!ignore) {
          setLoading(false);
          setSupported(false);
          setMenus([]);
          setDrafts([]);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = canEditMenus
          ? await fetchOwnerStoreMenus(storeId)
          : await fetchStoreMenus(storeId);

        if (ignore) {
          return;
        }

        setSupported(response?.enabled !== false);
        const nextMenus = Array.isArray(response?.items) ? response.items : [];
        setMenus(nextMenus);
        setDrafts(canEditMenus ? (nextMenus.length > 0 ? nextMenus.map(createDraft) : [createDraft({}, 0)]) : []);
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message || '메뉴 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadMenus();

    return () => {
      ignore = true;
    };
  }, [access.menuEligible, canEditMenus, menuCategorySupported, storeId]);

  const updateDraft = (draftId, field, value) => {
    setDrafts((current) => current.map((draft) => (
      draft.draftId === draftId ? { ...draft, [field]: value } : draft
    )));
  };

  const addDraft = () => {
    setDrafts((current) => [...current, createDraft({}, current.length)]);
  };

  const removeDraft = (draftId) => {
    setDrafts((current) => {
      const next = current.filter((draft) => draft.draftId !== draftId);
      return next.length > 0 ? next : [createDraft({}, 0)];
    });
  };

  const handleSave = async () => {
    if (!canEditMenus || !storeId) {
      return;
    }

    const trimmedDrafts = drafts.filter((draft) => String(draft.name || '').trim().length > 0);
    if (trimmedDrafts.length === 0) {
      setError('최소 1개의 메뉴를 입력해 주세요.');
      return;
    }

    const invalidDraft = trimmedDrafts.find((draft) => !Number.isFinite(Number(draft.price)) || Number(draft.price) < 0);
    if (invalidDraft) {
      setError('메뉴 가격을 0원 이상의 숫자로 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await saveOwnerStoreMenus(storeId, toPayload(trimmedDrafts));
      const nextMenus = Array.isArray(response?.items) ? response.items : [];
      setMenus(nextMenus);
      setDrafts(nextMenus.length > 0 ? nextMenus.map(createDraft) : [createDraft({}, 0)]);
    } catch (requestError) {
      setError(requestError.message || '메뉴 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!storeId) {
    return (
      <section style={compact ? compactSectionStyle : sectionStyle}>
        <MenuHeader storeName={storeName} editable={editable} />
        <p style={helperTextStyle}>매장을 선택하면 메뉴를 확인하고 편집할 수 있습니다.</p>
      </section>
    );
  }

  if (!access.isRegisteredStore) {
    return (
      <section style={compact ? compactSectionStyle : sectionStyle}>
        <MenuHeader storeName={storeName} editable={editable} access={access} />
        <p style={helperTextStyle}>{access.menuEligibilityReason || '등록된 매장이 아닙니다'}</p>
      </section>
    );
  }

  if (!access.menuEligible || !menuCategorySupported) {
    return (
      <section style={compact ? compactSectionStyle : sectionStyle}>
        <MenuHeader storeName={storeName} editable={editable} access={access} />
        <p style={helperTextStyle}>{access.menuEligibilityReason || '메뉴 기능은 음식점과 카페에서만 사용할 수 있습니다.'}</p>
        <p style={helperTextStyle}>
          현재 카테고리: {access.categoryName || categoryName || '미지정'}
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section style={compact ? compactSectionStyle : sectionStyle}>
        <MenuHeader storeName={storeName} editable={editable} access={access} />
        <p style={helperTextStyle}>메뉴 정보를 불러오는 중입니다...</p>
      </section>
    );
  }

  if (!supported) {
    return (
      <section style={compact ? compactSectionStyle : sectionStyle}>
        <MenuHeader storeName={storeName} editable={editable} access={access} />
        <p style={helperTextStyle}>메뉴 기능이 아직 활성화되지 않았습니다.</p>
      </section>
    );
  }

  if (!editable && menus.length === 0) {
    return (
      <section style={compact ? compactSectionStyle : sectionStyle}>
        <MenuHeader storeName={storeName} editable={editable} access={access} />
        <p style={helperTextStyle}>등록된 메뉴가 없습니다</p>
      </section>
    );
  }

  return (
    <section style={compact ? compactSectionStyle : sectionStyle}>
      <MenuHeader storeName={storeName} editable={editable} access={access} />
      {error && <div style={errorStyle}>{error}</div>}

      {access.isClosureRequested && (
        <div style={noticeStyle}>
          <strong>운영 종료 요청이 접수되었습니다.</strong>
          <span>{getClosureRequestStatusMeta(access.closureRequestStatus).label} 상태에서는 메뉴를 수정할 수 없습니다.</span>
        </div>
      )}

      {editable && !canEditMenus && (
        <div style={noticeStyle}>
          <strong>메뉴 편집이 잠시 비활성화되었습니다.</strong>
          <span>{access.menuEligibilityReason || '현재 상태에서는 메뉴를 수정할 수 없습니다.'}</span>
        </div>
      )}

      {canEditMenus ? (
        <>
          <p style={helperTextStyle}>음식점과 카페 매장에서만 메뉴가 노출됩니다.</p>
          <div style={editorGridStyle}>
            {drafts.map((draft) => (
              <article key={draft.draftId} style={draftCardStyle}>
                <div style={rowStyle}>
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.draftId, 'name', event.target.value)}
                    placeholder="메뉴명"
                    style={inputStyle}
                  />
                  <input
                    value={draft.price}
                    onChange={(event) => updateDraft(draft.draftId, 'price', event.target.value)}
                    placeholder="가격"
                    type="number"
                    min="0"
                    step="100"
                    style={{ ...inputStyle, maxWidth: 140 }}
                  />
                </div>
                <div style={rowStyle}>
                  <label style={checkLabelStyle}>
                    <input
                      type="checkbox"
                      checked={draft.representative}
                      onChange={(event) => updateDraft(draft.draftId, 'representative', event.target.checked)}
                    />
                    대표 메뉴
                  </label>
                  <label style={checkLabelStyle}>
                    <input
                      type="checkbox"
                      checked={draft.available}
                      onChange={(event) => updateDraft(draft.draftId, 'available', event.target.checked)}
                    />
                    판매중
                  </label>
                </div>
                <textarea
                  value={draft.description}
                  onChange={(event) => updateDraft(draft.draftId, 'description', event.target.value)}
                  placeholder="메뉴 설명"
                  rows={3}
                  style={textareaStyle}
                />
                <input
                  value={draft.imageUrl}
                  onChange={(event) => updateDraft(draft.draftId, 'imageUrl', event.target.value)}
                  placeholder="이미지 URL (선택)"
                  style={inputStyle}
                />
                <div style={rowStyle}>
                  <input
                    value={draft.displayOrder}
                    onChange={(event) => updateDraft(draft.draftId, 'displayOrder', event.target.value)}
                    placeholder="순서"
                    type="number"
                    min="0"
                    step="1"
                    style={{ ...inputStyle, maxWidth: 120 }}
                  />
                  <button type="button" onClick={() => removeDraft(draft.draftId)} style={ghostButtonStyle}>
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div style={actionsStyle}>
            <button type="button" onClick={addDraft} style={secondaryButtonStyle}>
              <Plus size={16} />
              메뉴 추가
            </button>
            <button type="button" onClick={handleSave} style={primaryButtonStyle} disabled={saving}>
              <Save size={16} />
              {saving ? '저장 중' : '메뉴 저장'}
            </button>
          </div>
        </>
      ) : menus.length > 0 ? (
        <div style={listStyle}>
          {menus.map((menu) => (
            <article key={menu.menuId} style={menuCardStyle}>
              {menu.imageUrl ? (
                <img src={menu.imageUrl} alt={menu.name} style={menuImageStyle} />
              ) : (
                <div style={menuImageFallbackStyle}>
                  <ImageIcon size={20} />
                </div>
              )}
              <div style={menuContentStyle}>
                <div style={menuTopRowStyle}>
                  <strong style={{ fontSize: '1rem' }}>{menu.name}</strong>
                  <span style={priceStyle}>{Number(menu.price).toLocaleString()}원</span>
                </div>
                <div style={tagRowStyle}>
                  {menu.representative && <span style={tagStyle}>대표</span>}
                  {!menu.available && <span style={{ ...tagStyle, background: 'rgba(248, 113, 113, 0.15)', color: '#fca5a5' }}>품절</span>}
                </div>
                {menu.description && <p style={descriptionStyle}>{menu.description}</p>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p style={helperTextStyle}>등록된 메뉴가 없습니다</p>
      )}
    </section>
  );
}

function MenuHeader({ storeName, editable, access = null }) {
  const closureMeta = access?.closureRequestStatus ? getClosureRequestStatusMeta(access.closureRequestStatus) : null;

  return (
    <div style={headerStyle}>
      <div style={titleRowStyle}>
        <UtensilsCrossed size={18} />
        <h3 style={titleStyle}>메뉴</h3>
      </div>
      <span style={subTitleStyle}>{editable ? `${storeName || '내 매장'} 메뉴 편집` : `${storeName || '매장'} 메뉴`}</span>
      {closureMeta && <span style={metaBadgeStyle}>{closureMeta.label}</span>}
    </div>
  );
}

const sectionStyle = {
  marginTop: '1.25rem',
  padding: '1rem',
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(15, 23, 42, 0.24)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
};

const compactSectionStyle = {
  ...sectionStyle,
  padding: '0.9rem',
  gap: '0.75rem',
};

const headerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const titleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'white',
  fontWeight: 800,
};

const titleStyle = {
  margin: 0,
  fontSize: '1.05rem',
};

const subTitleStyle = {
  color: 'rgba(226, 232, 240, 0.7)',
  fontSize: '0.82rem',
};

const metaBadgeStyle = {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  padding: '0.3rem 0.65rem',
  borderRadius: '999px',
  background: 'rgba(59, 130, 246, 0.14)',
  color: '#bfdbfe',
  fontSize: '0.72rem',
  fontWeight: 800,
};

const helperTextStyle = {
  margin: 0,
  color: 'rgba(226, 232, 240, 0.72)',
  fontSize: '0.92rem',
};

const errorStyle = {
  padding: '0.75rem 0.9rem',
  borderRadius: '12px',
  background: 'rgba(239, 68, 68, 0.14)',
  color: '#fca5a5',
  fontSize: '0.9rem',
};

const noticeStyle = {
  display: 'grid',
  gap: '0.25rem',
  padding: '0.8rem 0.9rem',
  borderRadius: '14px',
  background: 'rgba(245, 158, 11, 0.12)',
  border: '1px solid rgba(245, 158, 11, 0.2)',
  color: '#fde68a',
  fontSize: '0.9rem',
};

const editorGridStyle = {
  display: 'grid',
  gap: '0.75rem',
};

const draftCardStyle = {
  padding: '0.9rem',
  borderRadius: '16px',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  background: 'rgba(15, 23, 42, 0.42)',
  display: 'grid',
  gap: '0.7rem',
};

const rowStyle = {
  display: 'flex',
  gap: '0.7rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const inputStyle = {
  flex: 1,
  minWidth: 0,
  padding: '0.78rem 0.9rem',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(15, 23, 42, 0.55)',
  color: 'white',
  fontSize: '0.92rem',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '88px',
  resize: 'vertical',
};

const checkLabelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  color: 'rgba(226, 232, 240, 0.86)',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const ghostButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.72rem 0.95rem',
  borderRadius: '999px',
  border: '1px solid rgba(248, 113, 113, 0.35)',
  background: 'rgba(239, 68, 68, 0.08)',
  color: '#fca5a5',
  fontWeight: 700,
  cursor: 'pointer',
};

const actionsStyle = {
  display: 'flex',
  gap: '0.75rem',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  padding: '0.8rem 1rem',
  borderRadius: '999px',
  border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  padding: '0.8rem 1rem',
  borderRadius: '999px',
  border: '1px solid rgba(96, 165, 250, 0.45)',
  background: 'rgba(59, 130, 246, 0.1)',
  color: '#bfdbfe',
  fontWeight: 800,
  cursor: 'pointer',
};

const listStyle = {
  display: 'grid',
  gap: '0.75rem',
};

const menuCardStyle = {
  display: 'grid',
  gridTemplateColumns: '88px 1fr',
  gap: '0.85rem',
  padding: '0.9rem',
  borderRadius: '16px',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  background: 'rgba(15, 23, 42, 0.38)',
};

const menuImageStyle = {
  width: '88px',
  height: '88px',
  objectFit: 'cover',
  borderRadius: '14px',
};

const menuImageFallbackStyle = {
  width: '88px',
  height: '88px',
  borderRadius: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(59, 130, 246, 0.1)',
  color: '#93c5fd',
};

const menuContentStyle = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
};

const menuTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  alignItems: 'baseline',
};

const priceStyle = {
  color: '#bfdbfe',
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

const tagRowStyle = {
  display: 'flex',
  gap: '0.4rem',
  flexWrap: 'wrap',
};

const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.28rem 0.55rem',
  borderRadius: '999px',
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#bfdbfe',
  fontSize: '0.72rem',
  fontWeight: 800,
};

const descriptionStyle = {
  margin: 0,
  color: 'rgba(226, 232, 240, 0.78)',
  fontSize: '0.86rem',
  lineHeight: 1.45,
};
