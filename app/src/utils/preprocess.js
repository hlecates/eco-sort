import * as ort from 'onnxruntime-web';
import { coverCrop } from './crop';

export async function fileToTensor(file, size, mean, std) {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const { sx, sy, sWidth, sHeight } = coverCrop(bitmap.width, bitmap.height, size, size);
  ctx.drawImage(bitmap, sx, sy, sWidth, sHeight, 0, 0, size, size);

  const { data } = ctx.getImageData(0, 0, size, size); // RGBA
  const plane = size * size;
  const out = new Float32Array(3 * plane);
  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    const r = data[i] / 255, g = data[i+1] / 255, b = data[i+2] / 255;
    out[px]           = (r - mean[0]) / std[0];
    out[plane + px]   = (g - mean[1]) / std[1];
    out[2*plane + px] = (b - mean[2]) / std[2];
  }
  return new ort.Tensor('float32', out, [1, 3, size, size]);
}
