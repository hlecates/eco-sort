import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App Component', () => {
  test('renders app title and subtitle', () => {
    render(<App />);
    expect(screen.getByText('EcoSort')).toBeInTheDocument();
    expect(screen.getByText('Point. Snap. Sort.')).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading model…')).toBeInTheDocument();
  });

  test('displays upload and capture controls', () => {
    render(<App />);
    expect(screen.getByText('Take / Upload Photo')).toBeInTheDocument();
  });

  test('shows footer message about offline capability', () => {
    render(<App />);
    expect(screen.getByText('All in your browser. No uploads. Works offline after first load.')).toBeInTheDocument();
  });
});

describe('Image Upload and Classification', () => {
  test('processes uploaded image and shows prediction', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for model to load
    await waitFor(() => {
      expect(screen.queryByText('Loading model…')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Create a mock file
    const file = new File(['fake-image-content'], 'test-image.jpg', { type: 'image/jpeg' });
    
    // Find file input and upload file
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    await user.upload(fileInput, file);

    // Wait for processing and check results
    await waitFor(() => {
      const preview = screen.getByAltText('preview');
      expect(preview).toBeInTheDocument();
    });

    // Should show classification result
    await waitFor(() => {
      // Based on our mock, the highest probability should be for 'glass' (0.8)
      expect(screen.getByText('GLASS')).toBeInTheDocument();
    });
  });

  test('handles processing errors gracefully', async () => {
    // Mock a processing error
    const mockSession = {
      inputNames: ['input'],
      outputNames: ['output'],
      run: vi.fn(() => Promise.reject(new Error('Processing failed')))
    };

    vi.mocked(global.fetch).mockImplementationOnce(() => Promise.resolve({
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

    const { InferenceSession } = await import('onnxruntime-web');
    vi.mocked(InferenceSession.create).mockResolvedValueOnce(mockSession);

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading model…')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const file = new File(['fake-image-content'], 'test-image.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    await user.upload(fileInput, file);

    // Should show 'unsure' result when processing fails
    await waitFor(() => {
      expect(screen.getByText('UNSURE')).toBeInTheDocument();
    });
  });
});

describe('Model Loading Error Handling', () => {
  test('displays error message when model fails to load', async () => {
    // Mock model loading failure
    const { InferenceSession } = await import('onnxruntime-web');
    vi.mocked(InferenceSession.create).mockRejectedValue(new Error('Failed to load model'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Model load error/i)).toBeInTheDocument();
    });
  });
});