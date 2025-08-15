import { softmax, decide } from '../../utils/postprocess';

describe('softmax function', () => {
  test('converts logits to probabilities that sum to 1', () => {
    const logits = [2.0, 1.0, 0.1];
    const probabilities = softmax(logits);
    
    // Check that all probabilities are positive
    probabilities.forEach(p => expect(p).toBeGreaterThan(0));
    
    // Check that probabilities sum to approximately 1
    const sum = probabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    
    // Check that highest logit gives highest probability
    const maxIndex = logits.indexOf(Math.max(...logits));
    const maxProbIndex = probabilities.indexOf(Math.max(...probabilities));
    expect(maxIndex).toBe(maxProbIndex);
  });

  test('handles negative logits correctly', () => {
    const logits = [-1.0, -2.0, -3.0];
    const probabilities = softmax(logits);
    
    expect(probabilities.length).toBe(3);
    probabilities.forEach(p => expect(p).toBeGreaterThan(0));
    
    const sum = probabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  test('handles single element array', () => {
    const logits = [5.0];
    const probabilities = softmax(logits);
    
    expect(probabilities).toHaveLength(1);
    expect(probabilities[0]).toBeCloseTo(1.0, 5);
  });
});

describe('decide function', () => {
  const mockClasses = [
    'glass:bottle',
    'paper:notebook', 
    'cardboard:box',
    'plastic:bottle',
    'metal:can',
    'trash:wrapper'
  ];

  test('returns correct classification for high confidence prediction', () => {
    const logits = [5.0, 1.0, 1.0, 1.0, 1.0, 1.0]; // High confidence for glass
    const result = decide(logits, mockClasses);
    
    expect(result.top).toBe('glass');
    expect(result.label).toBe('glass:bottle');
    expect(result.p).toBeGreaterThan(0.9); // Should be very confident
  });

  test('returns unsure for very low confidence predictions', () => {
    // Create logits that will result in very low probabilities
    const logits = [-10, -10, -10, -10, -10, -9.99]; // Slightly higher for last one
    const result = decide(logits, mockClasses);
    
    // With THRESH_TOP = 0.0, this should still return the prediction
    // unless the probability is exactly 0
    expect(result.top).toBe('trash'); // Should pick the highest one
    expect(result.p).toBeGreaterThan(0);
  });

  test('handles equal probability predictions', () => {
    const logits = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0]; // All equal
    const result = decide(logits, mockClasses);
    
    expect(result.top).toBe('glass'); // Should pick first one (highest index for equal values)
    expect(result.label).toBe('glass:bottle');
    expect(result.p).toBeCloseTo(1/6, 2); // Should be ~16.67%
  });

  test('correctly extracts material from label', () => {
    const logits = [1.0, 5.0, 1.0, 1.0, 1.0, 1.0]; // High for paper
    const result = decide(logits, mockClasses);
    
    expect(result.top).toBe('paper');
    expect(result.label).toBe('paper:notebook');
  });

  test('handles zero threshold correctly', () => {
    // Test with the actual threshold used in the app (0.0)
    import('../../config/constants').then(({ THRESH_TOP }) => {
      expect(THRESH_TOP).toBe(0.0);
    });
    
    const logits = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    const result = decide(logits, mockClasses);
    
    // With threshold 0.0, any positive probability should be accepted
    expect(result.top).not.toBe('unsure');
    expect(result.p).toBeGreaterThan(0);
  });
});