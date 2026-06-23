import { apiUrl } from '../api/client';

/** URL ảnh biểu đồ đề thi — public/topik_images trước, sau đó backend */
export function resolveQuestionImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/topik_images/')) return imageUrl;
  return apiUrl(imageUrl);
}
