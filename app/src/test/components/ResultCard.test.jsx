import { render, screen } from '@testing-library/react';
import ResultCard from '../../components/ResultCard';

describe('ResultCard Component', () => {
  test('renders nothing when no result is provided', () => {
    const { container } = render(<ResultCard result={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('displays recycle result correctly', () => {
    const result = {
      top: 'recycle',
      label: 'plastic:bottle',
      p: 0.85
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('RECYCLE')).toBeInTheDocument();
    expect(screen.getByText('· bottle')).toBeInTheDocument();
    expect(screen.getByText('(85.0%)')).toBeInTheDocument();
    expect(screen.getByText('Empty liquids; no bags or soft film.')).toBeInTheDocument();
  });

  test('displays compost result correctly', () => {
    const result = {
      top: 'compost',
      label: 'paper:food_wrapper',
      p: 0.92
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('COMPOST')).toBeInTheDocument();
    expect(screen.getByText('· food wrapper')).toBeInTheDocument();
    expect(screen.getByText('(92.0%)')).toBeInTheDocument();
    expect(screen.getByText('No plastics; include food scraps & soiled paper.')).toBeInTheDocument();
  });

  test('displays landfill result correctly', () => {
    const result = {
      top: 'landfill',
      label: 'trash:candy_wrapper',
      p: 0.78
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('LANDFILL')).toBeInTheDocument();
    expect(screen.getByText('· candy wrapper')).toBeInTheDocument();
    expect(screen.getByText('(78.0%)')).toBeInTheDocument();
    expect(screen.getByText('When in doubt, throw it out (no tanglers).')).toBeInTheDocument();
  });

  test('displays unsure result correctly', () => {
    const result = {
      top: 'unsure',
      label: 'unknown:item',
      p: 0.15
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('UNSURE')).toBeInTheDocument();
    expect(screen.getByText('(15.0%)')).toBeInTheDocument();
    expect(screen.getByText('Try again with better lighting; show one item.')).toBeInTheDocument();
    // For unsure, subtype is not displayed
    expect(screen.queryByText('· item')).not.toBeInTheDocument();
  });

  test('handles zero probability', () => {
    const result = {
      top: 'unsure',
      label: 'unknown:item',
      p: 0.0
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('(0.0%)')).toBeInTheDocument();
  });

  test('handles very high probability', () => {
    const result = {
      top: 'recycle',
      label: 'glass:bottle',
      p: 0.9999
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('(100.0%)')).toBeInTheDocument();
  });

  test('handles decimal probabilities correctly', () => {
    const result = {
      top: 'recycle',
      label: 'metal:can',
      p: 0.6789
    };

    render(<ResultCard result={result} />);
    
    expect(screen.getByText('(67.9%)')).toBeInTheDocument();
  });

  test('applies correct CSS classes for different results', () => {
    const recycleResult = {
      top: 'recycle',
      label: 'plastic:bottle',
      p: 0.85
    };

    const { container, rerender } = render(<ResultCard result={recycleResult} />);
    
    // Check for result styling
    expect(container.querySelector('.result')).toBeInTheDocument();
    expect(container.querySelector('.badge')).toBeInTheDocument();
    expect(container.querySelector('.badge.recycle')).toBeInTheDocument();
    
    const compostResult = {
      top: 'compost',
      label: 'paper:wrapper',
      p: 0.92
    };

    rerender(<ResultCard result={compostResult} />);
    
    // Should have compost-specific styling
    expect(container.querySelector('.badge.compost')).toBeInTheDocument();
  });

  test('handles unknown top level gracefully', () => {
    const result = {
      top: 'unknown-category',
      label: 'something:weird',
      p: 0.50
    };

    render(<ResultCard result={result} />);
    
    // Should still render the basic info
    expect(screen.getByText('UNKNOWN-CATEGORY')).toBeInTheDocument();
    expect(screen.getByText('· weird')).toBeInTheDocument();
    expect(screen.getByText('(50.0%)')).toBeInTheDocument();
  });
});