import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';

describe('App Component Integration Tests', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    window.innerWidth = originalInnerWidth;
    vi.restoreAllMocks();
  });

  it('renders phone mockup container and QR code on desktop viewports (> 768px)', () => {
    window.innerWidth = 1024;
    render(<App />);

    expect(screen.getByTestId('desktop-guard')).toBeInTheDocument();
    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();
    expect(screen.getByText(/Microsoft To Do/i)).toBeInTheDocument();
  });

  it('renders full-bleed mobile shell without phone mockup or QR code on mobile viewports (<= 768px)', () => {
    window.innerWidth = 375;
    render(<App />);

    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-mockup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('desktop-guard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('handles window resize dynamically between desktop and mobile viewports', () => {
    window.innerWidth = 1024;
    render(<App />);

    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument();

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.queryByTestId('phone-mockup')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-shell')).toBeInTheDocument();

    act(() => {
      window.innerWidth = 1200;
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('phone-mockup')).toBeInTheDocument();
  });

  it('allows copying current page URL from QR code card', async () => {
    window.innerWidth = 1024;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<App />);

    const copyBtn = screen.getByTestId('copy-url-btn');
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
  });
});
