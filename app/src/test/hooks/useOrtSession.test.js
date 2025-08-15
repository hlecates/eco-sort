import { renderHook, waitFor } from '@testing-library/react';
import { useOrtSession } from '../../hooks/useOrtSession';

describe('useOrtSession hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('successfully loads model and labels', async () => {
    const { result } = renderHook(() => useOrtSession());

    // Initially should be loading
    expect(result.current.session).toBeNull();
    expect(result.current.labels).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.session).not.toBeNull();
      expect(result.current.labels).not.toBeNull();
    }, { timeout: 5000 });

    // Check that session has expected properties
    expect(result.current.session.inputNames).toEqual(['input']);
    expect(result.current.session.outputNames).toEqual(['output']);
    expect(typeof result.current.session.run).toBe('function');

    // Check that labels are loaded correctly
    expect(result.current.labels.materials).toEqual([
      "glass", "paper", "cardboard", "plastic", "metal", "trash"
    ]);
    expect(result.current.labels.input_size).toBe(224);
    expect(result.current.labels.mean).toEqual([0.485, 0.456, 0.406]);
    expect(result.current.labels.std).toEqual([0.229, 0.224, 0.225]);
  });

  test('handles labels loading failure', async () => {
    // Mock fetch failure for labels
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Failed to fetch labels'));

    const { result } = renderHook(() => useOrtSession());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 3000 });

    expect(result.current.session).toBeNull();
    expect(result.current.labels).toBeNull();
    expect(result.current.error.message).toContain('Failed to fetch labels');
  });

  test('handles model loading failure', async () => {
    // Mock successful labels fetch but failed model loading
    const { InferenceSession } = await import('onnxruntime-web');
    vi.mocked(InferenceSession.create).mockRejectedValue(new Error('Model loading failed'));

    const { result } = renderHook(() => useOrtSession());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 3000 });

    expect(result.current.session).toBeNull();
    expect(result.current.error.message).toContain('Model loading failed');
  });

  test('configures ONNX Runtime environment correctly', async () => {
    const { env } = await import('onnxruntime-web');

    renderHook(() => useOrtSession());

    await waitFor(() => {
      expect(env.wasm.simd).toBe(true);
    });

    // Environment configuration should be set correctly
    expect(env.wasm.proxy).toBe(false);
    expect(env.wasm.numThreads).toBe(1);
  });

  test('falls back to baseline WASM on SIMD failure', async () => {
    // Mock SIMD failure then success with baseline
    const { InferenceSession, env } = await import('onnxruntime-web');
    
    vi.mocked(InferenceSession.create)
      .mockRejectedValueOnce(new Error('SIMD not supported'))
      .mockResolvedValueOnce({
        inputNames: ['input'],
        outputNames: ['output'],
        run: vi.fn()
      });

    const { result } = renderHook(() => useOrtSession());

    await waitFor(() => {
      expect(result.current.session).not.toBeNull();
    }, { timeout: 5000 });

    // Should have fallen back to baseline WASM
    expect(env.wasm.simd).toBe(false);
    expect(result.current.session).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('handles non-ok response for labels', async () => {
    // Mock non-ok response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const { result } = renderHook(() => useOrtSession());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 3000 });

    expect(result.current.error.message).toContain('Failed to load labels: 404');
  });
});