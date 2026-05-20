import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import SafeImage from '../src/components/common/SafeImage.js';
import { API_BASE_URL } from '../src/lib/api.js';

test('SafeImage resolves backend-relative file-view urls in the rendered image source', () => {
  const markup = renderToStaticMarkup(React.createElement(SafeImage, {
    src: '/api/v1/files/view?fileId=store-hero',
    alt: '매장 대표 사진',
  }));

  assert.match(markup, new RegExp(
    `<img[^>]+src="${new URL('/api/v1/files/view?fileId=store-hero', API_BASE_URL).href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`
  ));
  assert.match(markup, /alt="매장 대표 사진"/);
});

test('SafeImage renders a fallback empty state when src is missing', () => {
  const markup = renderToStaticMarkup(React.createElement(SafeImage, {
    src: '',
    alt: '리뷰 사진',
    fallbackLabel: '등록된 사진이 없습니다',
  }));

  assert.equal(markup.includes('<img'), false);
  assert.match(markup, /등록된 사진이 없습니다/);
});
