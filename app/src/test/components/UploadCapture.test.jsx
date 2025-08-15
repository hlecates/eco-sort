import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadCapture from '../../components/UploadCapture';

describe('UploadCapture Component', () => {
  const mockOnFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders upload label', () => {
    render(<UploadCapture onFile={mockOnFile} />);
    
    const uploadLabel = screen.getByText('Take / Upload Photo');
    expect(uploadLabel).toBeInTheDocument();
  });

  test('has hidden file input', () => {
    render(<UploadCapture onFile={mockOnFile} />);
    
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('image/*');
    expect(fileInput.hidden).toBe(true);
  });

  test('calls onFile when file is selected', async () => {
    const user = userEvent.setup();
    render(<UploadCapture onFile={mockOnFile} />);
    
    const file = new File(['test-content'], 'test-image.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    
    await user.upload(fileInput, file);
    
    expect(mockOnFile).toHaveBeenCalledWith(file);
    expect(mockOnFile).toHaveBeenCalledTimes(1);
  });

  test('handles multiple file selection by taking first file', async () => {
    const user = userEvent.setup();
    render(<UploadCapture onFile={mockOnFile} />);
    
    const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    
    await user.upload(fileInput, [file1, file2]);
    
    expect(mockOnFile).toHaveBeenCalledWith(file1);
    expect(mockOnFile).toHaveBeenCalledTimes(1);
  });

  test('does not call onFile when no file is selected', async () => {
    const user = userEvent.setup();
    render(<UploadCapture onFile={mockOnFile} />);
    
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    
    // Simulate clicking file input but not selecting a file
    await user.click(fileInput);
    fireEvent.change(fileInput, { target: { files: [] } });
    
    expect(mockOnFile).not.toHaveBeenCalled();
  });

  test('clicking upload label triggers file input', async () => {
    const user = userEvent.setup();
    render(<UploadCapture onFile={mockOnFile} />);
    
    const uploadLabel = screen.getByText('Take / Upload Photo');
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    await user.click(uploadLabel);
    
    expect(clickSpy).toHaveBeenCalled();
  });

  test('accepts only image files', () => {
    render(<UploadCapture onFile={mockOnFile} />);
    
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    expect(fileInput.accept).toBe('image/*');
  });

  test('resets file input value after selection', async () => {
    const user = userEvent.setup();
    render(<UploadCapture onFile={mockOnFile} />);
    
    const file = new File(['test-content'], 'test-image.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText('Take / Upload Photo');
    
    await user.upload(fileInput, file);
    
    // File input should be reset to allow selecting the same file again
    expect(fileInput.value).toBe('');
  });
});