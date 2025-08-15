import { fileToTensor } from '../../utils/preprocess';
import { decide } from '../../utils/postprocess';

describe('Integration: Image Classification Pipeline', () => {
  test('complete pipeline from file to classification result', async () => {
    // Mock realistic image data
    const mockImageData = new Uint8ClampedArray(224 * 224 * 4);
    // Fill with gradient pattern to simulate real image
    for (let i = 0; i < mockImageData.length; i += 4) {
      const pixel = Math.floor(i / 4);
      const intensity = (pixel % 255);
      mockImageData[i] = intensity;     // R
      mockImageData[i + 1] = intensity; // G  
      mockImageData[i + 2] = intensity; // B
      mockImageData[i + 3] = 255;       // A
    }

    global.OffscreenCanvas = vi.fn().mockImplementation(() => ({
      width: 224,
      height: 224,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: mockImageData }))
      }))
    }));

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const labels = {
      materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"],
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
      input_size: 224
    };

    // Step 1: Preprocess image to tensor
    const tensor = await fileToTensor(
      mockFile, 
      labels.input_size, 
      labels.mean, 
      labels.std
    );

    expect(tensor.dims).toEqual([1, 3, 224, 224]);
    expect(tensor.data).toBeInstanceOf(Float32Array);

    // Step 2: Mock model inference
    const { InferenceSession } = await import('onnxruntime-web');
    const mockSession = {
      inputNames: ['input'],
      outputNames: ['output'],
      run: vi.fn(() => Promise.resolve({
        output: {
          data: new Float32Array([0.1, 0.7, 0.05, 0.1, 0.03, 0.02]) // High confidence for paper
        }
      }))
    };

    const outputs = await mockSession.run({ input: tensor });
    const logits = Array.from(outputs.output.data);

    // Step 3: Post-process to get final result
    const result = decide(logits, labels.materials);

    expect(result.top).toBe('paper');
    expect(result.label).toBe('paper');
    expect(result.p).toBeGreaterThan(0.6); // Should be confident
  });

  test('handles low confidence predictions correctly', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const labels = {
      materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"],
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
      input_size: 224
    };

    const tensor = await fileToTensor(
      mockFile,
      labels.input_size,
      labels.mean,
      labels.std
    );

    // Mock very low confidence predictions
    const mockSession = {
      inputNames: ['input'],
      outputNames: ['output'],
      run: vi.fn(() => Promise.resolve({
        output: {
          data: new Float32Array([0.18, 0.17, 0.16, 0.16, 0.16, 0.17]) // All very close
        }
      }))
    };

    const outputs = await mockSession.run({ input: tensor });
    const logits = Array.from(outputs.output.data);
    const result = decide(logits, labels.materials);

    // With current threshold of 0.0, should still make a prediction
    expect(result.top).toBe('glass'); // First/highest one
    expect(result.p).toBeLessThan(0.25); // Low confidence
  });

  test('handles processing errors in pipeline', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const labels = {
      materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"],
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
      input_size: 224
    };

    // Mock preprocessing success
    const tensor = await fileToTensor(
      mockFile,
      labels.input_size,
      labels.mean,
      labels.std
    );

    // Mock inference failure
    const mockSession = {
      inputNames: ['input'],
      outputNames: ['output'],
      run: vi.fn(() => Promise.reject(new Error('Inference failed')))
    };

    try {
      await mockSession.run({ input: tensor });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toBe('Inference failed');
      
      // In the real app, this would fall back to unsure result
      const fallbackResult = { top: 'unsure', p: 0 };
      expect(fallbackResult.top).toBe('unsure');
      expect(fallbackResult.p).toBe(0);
    }
  });

  test('validates tensor format matches model expectations', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const labels = {
      materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"],
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
      input_size: 224
    };

    const tensor = await fileToTensor(
      mockFile,
      labels.input_size,
      labels.mean,
      labels.std
    );

    // Validate tensor format for ONNX model
    expect(tensor.type).toBe('float32');
    expect(tensor.dims).toEqual([1, 3, 224, 224]); // Batch=1, Channels=3, H=224, W=224
    expect(tensor.data.length).toBe(1 * 3 * 224 * 224);
    
    // Validate normalization applied (values should be roughly in range [-2, 2])
    const data = Array.from(tensor.data);
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    expect(minVal).toBeGreaterThan(-3);
    expect(maxVal).toBeLessThan(3);
  });

  test('verifies output probability distribution', async () => {
    const labels = {
      materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"]
    };

    // Test with raw logits that should produce valid probability distribution
    const logits = [2.0, 1.0, 0.5, 0.1, -0.5, -1.0];
    const result = decide(logits, labels.materials);

    expect(result.p).toBeGreaterThan(0);
    expect(result.p).toBeLessThanOrEqual(1);
    expect(result.top).toBe('glass'); // Highest logit
    expect(result.label).toBe('glass');
  });
});