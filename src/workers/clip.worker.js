/* eslint-disable no-restricted-globals */
import {
  env,
  AutoTokenizer,
  AutoProcessor,
  SiglipTextModel,
  SiglipVisionModel,
  RawImage,
} from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.backends = {
  ...env.backends,
  // Отключаем WebGPU для стабильности
  webgpu: false,
};

const MODEL_ID = 'Xenova/siglip-base-patch16-224';

class SiglipService {
  static tokenizer   = null;
  static processor   = null;
  static textModel   = null;
  static visionModel = null;

  static async init(progress_callback) {
    if (this.tokenizer) return; // уже загружено

    // q8 работает быстрее и требует меньше памяти
    const options = { device: 'wasm', dtype: 'q8' };

    this.tokenizer   = await AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback });
    this.processor   = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });
    this.textModel   = await SiglipTextModel.from_pretrained(MODEL_ID, { ...options, progress_callback });
    this.visionModel = await SiglipVisionModel.from_pretrained(MODEL_ID, { ...options, progress_callback });
  }
}

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  try {
    if (type === 'init') {
      await SiglipService.init((msg) => {
        self.postMessage({ type: 'progress', data: msg });
      });

      const items        = data;
      const descriptions = items.map((i) => i.description);

      const text_inputs = await SiglipService.tokenizer(descriptions, {
        padding: 'max_length',
        truncation: true,
      });

      const { pooler_output: textOutput } = await SiglipService.textModel(text_inputs);
      const embeddingSize = 768;
      const embeddings = {};

      for (let i = 0; i < items.length; i++) {
        const start = i * embeddingSize;
        embeddings[items[i].id] = Array.from(textOutput.data.slice(start, start + embeddingSize));
      }

      self.postMessage({ type: 'text_embeddings_ready', data: embeddings });
    }

    if (type === 'image') {
      // data — dataURL вырезанного сегмента
      const image       = await RawImage.read(data);
      const imageInputs = await SiglipService.processor(image);
      const { pooler_output } = await SiglipService.visionModel(imageInputs);

      self.postMessage({
        type: 'image_embedding_ready',
        data: Array.from(pooler_output.data),
      });
    }
  } catch (error) {
    console.error('[clip.worker]', error);
    self.postMessage({ type: 'error', data: String(error) });
  }
});