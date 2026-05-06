export function getApplicationStatusMeta(application) {
  if (application.requestStatus === 'APPROVED') {
    return {
      label: '승인 완료',
      tone: 'success',
      summary: '매장 연결이 끝났고 운영을 시작할 수 있습니다.',
      progress: 100,
    };
  }

  if (application.requestStatus === 'REJECTED') {
    return {
      label: '반려됨',
      tone: 'danger',
      summary: application.rejectReason || '운영 검토 결과 반려되었습니다.',
      progress: 100,
    };
  }

  if (application.businessVerificationStatus === 'AUTO_VERIFICATION_FAILED') {
    return {
      label: '사업자 확인 실패',
      tone: 'danger',
      summary: '사업자 정보가 자동 검증과 일치하지 않습니다.',
      progress: 35,
    };
  }

  if (application.businessVerificationStatus === 'AUTO_VERIFICATION_UNAVAILABLE') {
    return {
      label: '자동 검증 재시도 필요',
      tone: 'warning',
      summary: '외부 검증이 일시적으로 불가해 관리자 확인이 필요합니다.',
      progress: 30,
    };
  }

  if (application.mapVerificationStatus === 'FAILED') {
    return {
      label: '지도 검증 실패',
      tone: 'warning',
      summary: '실영업주소 기준 매장 매칭이 아직 확정되지 않았습니다.',
      progress: 60,
    };
  }

  if (application.businessVerificationStatus === 'AUTO_VERIFIED' && application.mapVerificationStatus === 'VERIFIED') {
    return {
      label: '관리자 승인 대기',
      tone: 'info',
      summary: '자동 검증은 끝났고 최종 승인만 남았습니다.',
      progress: 85,
    };
  }

  return {
    label: '검토중',
    tone: 'neutral',
    summary: '제출된 정보를 기준으로 검증이 진행되고 있습니다.',
    progress: 45,
  };
}
