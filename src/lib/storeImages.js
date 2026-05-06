import { stripPlaceholderImageUrls } from './files.js';

function normalizeStoreImageList(imageUrls = []) {
  return stripPlaceholderImageUrls(imageUrls, []);
}

function appendUniqueImageUrls(target, source) {
  for (const imageUrl of normalizeStoreImageList(source)) {
    if (!target.includes(imageUrl)) {
      target.push(imageUrl);
    }
  }
}

export function collectStoreCoverImages(storeLike = {}) {
  const coverImages = [];

  appendUniqueImageUrls(coverImages, storeLike.ownerImages);
  appendUniqueImageUrls(coverImages, storeLike.images);
  appendUniqueImageUrls(coverImages, storeLike.imageUrls);
  appendUniqueImageUrls(coverImages, storeLike.coverImages);

  return coverImages;
}
