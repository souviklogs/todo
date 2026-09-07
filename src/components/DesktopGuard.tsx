import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  QrCode,
  ShieldCheck
} from 'lucide-react';

interface DesktopGuardProps {
  children: React.ReactNode;
  currentUrl?: string;
}

export const DesktopGuard: React.FC<DesktopGuardProps> = ({
  children,
  currentUrl,
}) => {
  const [copied, setCopied] = useState(false);

  const resolvedUrl =
    currentUrl ||
    (typeof window !== 'undefined' &&
    window.location &&
    window.location.href &&
    window.location.href !== 'about:blank'
      ? window.location.href
      : 'http://localhost:5173');

  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
      }
    } catch {
      // Clipboard write failed or not permitted
    } finally {
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      data-testid="desktop-guard"
      className="min-h-screen w-full bg-radial from-slate-900 via-neutral-950 to-black text-white flex items-center justify-center p-6 md:p-10 lg:p-12 overflow-y-auto"
    >
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
        {/* Left / Center: Interactive Phone Mockup Frame */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {/* Ambient phone glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[56px] blur-xl opacity-25 group-hover:opacity-40 transition duration-1000"></div>

            {/* Smartphone Chassis */}
            <div
              data-testid="phone-mockup"
              className="relative w-[360px] sm:w-[390px] h-[740px] sm:h-[780px] bg-neutral-900 rounded-[52px] p-3 shadow-2xl border-[4px] border-neutral-700/80 ring-1 ring-white/10 flex flex-col items-center select-none"
            >
              {/* Dynamic Island / Top Speaker & Camera Notch */}
              <div className="absolute top-5 z-30 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end px-2.5 gap-1.5 shadow-inner">
                  <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-blue-500/80"></div>
                  </div>
                </div>
              </div>

              {/* Speaker Bar line */}
              <div className="absolute top-2.5 w-12 h-1 bg-neutral-800 rounded-full pointer-events-none"></div>

              {/* Inner Screen Surface */}
              <div className="w-full h-full rounded-[40px] overflow-hidden bg-white dark:bg-neutral-900 relative flex flex-col border border-neutral-800/40">
                {children}
              </div>

              {/* Home indicator bar at bottom */}
              <div className="absolute bottom-2 z-30 w-32 h-1 bg-neutral-600/50 rounded-full pointer-events-none"></div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Interactive Mobile Preview
          </div>
        </div>

        {/* Right: Desktop Info Panel & QR Code */}
        <div className="w-full max-w-md flex flex-col space-y-6 text-left">
          {/* Header & Logo */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile-First Experience</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </span>
              Microsoft To Do
            </h1>

            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed pt-1">
              This application is designed specifically for mobile touchscreens.
              You can test the full functionality right here in the phone mockup,
              or scan the QR code to open it seamlessly on your smartphone.
            </p>
          </div>

          {/* QR Code Card */}
          <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>Open on Your Device</span>
              </div>
              <span className="text-xs text-neutral-500">Live URL</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* QR Code Box */}
              <div
                data-testid="qr-code"
                className="p-3 bg-white rounded-2xl shadow-md border border-neutral-200 flex-shrink-0"
              >
                <QRCodeSVG
                  value={resolvedUrl}
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Instructions & Actions */}
              <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Scan this code using your phone camera to test offline-first
                  persistence and touch gestures.
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    data-testid="copy-url-btn"
                    onClick={handleCopy}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-650 text-neutral-200 text-xs font-semibold border border-neutral-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    data-testid="open-url-btn"
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition duration-150"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Browser</span>
                  </a>
                </div>
              </div>
            </div>

            {/* URL Footer */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="truncate max-w-[240px] font-mono text-neutral-400">
                {resolvedUrl}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
