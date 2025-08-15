import '@testing-library/jest-dom';

// Mock ONNX Runtime Web
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn(() => Promise.resolve({
      inputNames: ['input'],
      outputNames: ['output'],
      run: vi.fn(() => Promise.resolve({
        output: {
          data: new Float32Array([0.8, 0.1, 0.05, 0.03, 0.02, 0.0]) // Mock probabilities
        }
      }))
    }))
  },
  Tensor: vi.fn((type, data, dims) => ({ type, data, dims })),
  env: {
    wasm: {
      wasmPaths: '',
      simd: true,
      proxy: false,
      numThreads: 1
    }
  }
}));

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
};

// Mock createImageBitmap
global.createImageBitmap = vi.fn(() => Promise.resolve({
  width: 224,
  height: 224
}));

// Mock OffscreenCanvas
global.OffscreenCanvas = vi.fn().mockImplementation(() => ({
  width: 224,
  height: 224,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(224 * 224 * 4).fill(128) // Mock image data
    }))
  }))
}));

// Mock fetch for loading labels
global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({
    materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"],
    bins: ["compost", "recycle", "landfill"],
    material_to_bin: [1, 1, 1, 1, 1, 2],
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    input_size: 224
  })
}));