import React, { useMemo, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { resolveBrowserImageUrl } from '../../lib/imageUrls.js';

const FALLBACK_STYLE = {
  width: '100%',
  height: '100%',
  minHeight: 'inherit',
  boxSizing: 'border-box',
  padding: '0.85rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: '0.45rem',
  textAlign: 'center',
  color: 'rgba(226, 232, 240, 0.82)',
  background: 'radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 58%), linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.86))',
  fontWeight: 700,
};

const LABEL_STYLE = {
  fontSize: '0.78rem',
  lineHeight: 1.35,
  fontWeight: 700,
};

const ICON_STYLE = {
  flex: 'none',
  opacity: 0.92,
};

const IS_DEV = Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);

export default function SafeImage({
  src,
  alt = '',
  className = '',
  fallback = null,
  fallbackLabel = '이미지를 불러오지 못했습니다',
  fallbackIconSize = 18,
  loading = 'lazy',
  decoding = 'async',
  onError,
  ...rest
}) {
  const [errorSrc, setErrorSrc] = useState('');
  const resolvedSrc = useMemo(() => resolveBrowserImageUrl(src), [src]);
  const hasError = Boolean(errorSrc && errorSrc === resolvedSrc);

  if (!resolvedSrc || hasError) {
    if (fallback) {
      return fallback;
    }

    return React.createElement(
      'div',
      {
        ...rest,
        className,
        style: {
          ...FALLBACK_STYLE,
          ...rest.style,
        },
        role: 'img',
        'aria-label': fallbackLabel || alt || '이미지를 불러오지 못했습니다',
      },
      React.createElement(ImageIcon, {
        size: fallbackIconSize,
        style: ICON_STYLE,
        'aria-hidden': true,
      }),
      fallbackLabel
        ? React.createElement('span', { style: LABEL_STYLE }, fallbackLabel)
        : null
    );
  }

  return React.createElement('img', {
    ...rest,
    src: resolvedSrc,
    alt,
    className,
    loading,
    decoding,
    onError: (event) => {
      if (IS_DEV) {
        console.warn('[Toggle] image load failed', {
          src: resolvedSrc,
          alt,
        });
      }

      setErrorSrc(resolvedSrc);
      if (typeof onError === 'function') {
        onError(event);
      }
    },
  });
}
