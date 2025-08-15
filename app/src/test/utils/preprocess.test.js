import { fileToTensor } from '../../utils/preprocess';

describe('fileToTensor function', () => {
  test('converts file to ONNX tensor with correct dimensions', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const size = 224;
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    const tensor = await fileToTensor(mockFile, size, mean, std);

    expect(tensor.type).toBe('float32');
    expect(tensor.dims).toEqual([1, 3, size, size]);
    expect(tensor.data).toBeInstanceOf(Float32Array);
    expect(tensor.data.length).toBe(3 * size * size);
  });

  test('applies normalization correctly', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const size = 224;
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // Mock the canvas context to return known pixel values
    const mockGetImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([
        255, 0, 0, 255,  // Red pixel
        0, 255, 0, 255,  // Green pixel  
        0, 0, 255, 255,  // Blue pixel
        128, 128, 128, 255 // Gray pixel
      ].concat(new Array(224 * 224 * 4 - 16).fill(0)))
    }));

    global.OffscreenCanvas = vi.fn().mockImplementation(() => ({
      width: size,
      height: size,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: mockGetImageData
      }))
    }));

    const tensor = await fileToTensor(mockFile, size, mean, std);

    // Check that normalization was applied
    // For red pixel (255, 0, 0) -> (1.0, 0.0, 0.0) -> normalized
    const plane = size * size;
    const redNormalized = (1.0 - mean[0]) / std[0];
    const greenNormalized = (0.0 - mean[1]) / std[1];
    const blueNormalized = (0.0 - mean[2]) / std[2];

    expect(tensor.data[0]).toBeCloseTo(redNormalized, 3);
    expect(tensor.data[plane]).toBeCloseTo(greenNormalized, 3);
    expect(tensor.data[2 * plane]).toBeCloseTo(blueNormalized, 3);
  });

  test('handles different image sizes through crop', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const size = 224;
    const mean = [0.5, 0.5, 0.5];
    const std = [0.5, 0.5, 0.5];

    // Mock different sized bitmap
    global.createImageBitmap = vi.fn(() => Promise.resolve({
      width: 512,
      height: 256 // Different aspect ratio
    }));

    const tensor = await fileToTensor(mockFile, size, mean, std);

    // Should still produce correct tensor dimensions
    expect(tensor.dims).toEqual([1, 3, size, size]);
    expect(tensor.data.length).toBe(3 * size * size);
  });

  test('uses OffscreenCanvas when available', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const size = 224;
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    // Ensure OffscreenCanvas is available
    expect(global.OffscreenCanvas).toBeDefined();

    const tensor = await fileToTensor(mockFile, size, mean, std);

    expect(tensor).toBeDefined();
    expect(tensor.dims).toEqual([1, 3, size, size]);
  });

  test('falls back to canvas element when OffscreenCanvas unavailable', async () => {
    const originalOffscreenCanvas = global.OffscreenCanvas;
    delete global.OffscreenCanvas;

    // Mock document.createElement for canvas
    global.document = {
      createElement: vi.fn(() => ({
        width: 224,
        height: 224,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(224 * 224 * 4).fill(128)
          }))
        }))
      }))
    };

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const size = 224;
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    const tensor = await fileToTensor(mockFile, size, mean, std);

    expect(tensor.dims).toEqual([1, 3, size, size]);
    expect(global.document.createElement).toHaveBeenCalledWith('canvas');

    // Restore
    global.OffscreenCanvas = originalOffscreenCanvas;
  });
});