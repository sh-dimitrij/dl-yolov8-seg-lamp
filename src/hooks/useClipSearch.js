import { useState, useRef, useEffect, useCallback } from 'react';
import { SEARCH_ITEMS } from '../utils/searchItems';

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Все категории с карточками в исходном порядке (score = null — ещё не ранжировано)
const buildDefaultItems = () => ({
  lamp:       SEARCH_ITEMS.filter(i => i.category === 'lamp').map(i => ({ ...i, score: null })),
  luminaire:  SEARCH_ITEMS.filter(i => i.category === 'luminaire').map(i => ({ ...i, score: null })),
  chandelier: SEARCH_ITEMS.filter(i => i.category === 'chandelier').map(i => ({ ...i, score: null })),
});

export const useClipSearch = () => {
  const [clipReady, setClipReady] = useState(false);
  const [clipLoading, setClipLoading] = useState(true);
  const [clipProgress, setClipProgress] = useState(0);
  const [clipError, setClipError] = useState(null);
  // Всегда содержит все карточки; после поиска — отсортированные по score
  const [clipItems, setClipItems] = useState(buildDefaultItems);

  const workerRef = useRef(null);
  const textEmbeddingsRef = useRef({});
  const pendingImageRef = useRef(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/clip.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type, data } = e.data;
      switch (type) {
        case 'progress':
          if (data.status === 'progress') setClipProgress(Math.round(data.progress ?? 0));
          break;
        case 'text_embeddings_ready':
          textEmbeddingsRef.current = data;
          setClipReady(true);
          setClipLoading(false);
          break;
        case 'image_embedding_ready':
          if (pendingImageRef.current) {
            console.log('[CLIP] Got image embedding, length:', data.length);
            pendingImageRef.current(data);
            pendingImageRef.current = null;
          }
          break;
        case 'error':
          setClipError(data);
          setClipLoading(false);
          pendingImageRef.current = null;
          break;
        default:
          break;
      }
    };

    worker.onerror = (e) => {
      setClipError(e.message);
      setClipLoading(false);
    };

    workerRef.current = worker;
    setClipLoading(true);
    worker.postMessage({ type: 'init', data: SEARCH_ITEMS });

    return () => worker.terminate();
  }, []);

  const searchOneSegment = useCallback(async (dataUrl, category) => {
    console.log(`[CLIP] Searching for ${category}, dataUrl length: ${dataUrl.length}`);
    const imageEmbedding = await new Promise((resolve, reject) => {
      pendingImageRef.current = resolve;
      workerRef.current.postMessage({ type: 'image', data: dataUrl });
      setTimeout(() => {
        if (pendingImageRef.current) { pendingImageRef.current = null; reject(new Error('timeout')); }
      }, 30000);
    });

    const items = SEARCH_ITEMS.filter(i => i.category === category);
    const scored = items.map(item => {
      const vec = textEmbeddingsRef.current[item.id];
      return { ...item, score: vec ? cosineSimilarity(imageEmbedding, vec) : 0 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, []);

  // segments = [{ categoryKey, dataUrl }]
  const searchSegments = useCallback(async (segments) => {
    if (!clipReady) return;
    setClipLoading(true);
    setClipError(null);

    try {
      const updates = {};
      for (const seg of segments) {
        updates[seg.categoryKey] = await searchOneSegment(seg.dataUrl, seg.categoryKey);
      }
      // Категории без детекции — оставляем в исходном порядке с score: null
      setClipItems(prev => ({ ...prev, ...updates }));
    } catch (err) {
      setClipError(String(err));
    } finally {
      setClipLoading(false);
    }
  }, [clipReady, searchOneSegment]);

  const resetClipResults = useCallback(() => {
    setClipItems(buildDefaultItems());
    setClipError(null);
  }, []);

  return { clipReady, clipLoading, clipProgress, clipError, clipItems, searchSegments, resetClipResults };
};