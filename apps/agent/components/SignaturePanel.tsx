'use client';

import type { SigningMethod } from '@signet/shared';
import { useState, useRef, useCallback } from 'react';
import { useSignetAuth } from '@/components/SignetAuthProvider';
import {
  signWithPasskey,
  signWithSwipe,
  signWithStylus,
  type SigningResult,
} from '@signet/blockchain/signing-methods';
import type { SmartAccount } from '@signet/blockchain/circle';

interface SignaturePanelProps {
  documentHash: `0x${string}` | null;
  onSign: (method: SigningMethod, account: SmartAccount | null, supplementaryProof?: string) => void;
}

/** Get address segments safely from a SmartAccount object */
function formatAddress(account: SmartAccount | null): string {
  if (!account) return '';
  const addr = (account as { address: `0x${string}` }).address;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Get a human-readable label for a signing method */
function methodLabel(method: SigningMethod | null): string {
  switch (method) {
    case 'passkey': return 'passkey (WebAuthn)';
    case 'swipe': return 'swipe';
    case 'stylus': return 'stylus';
    case 'wallet_connect': return 'WalletConnect';
    default: return 'signing';
  }
}

export function SignaturePanel({ documentHash, onSign }: SignaturePanelProps) {
  const auth = useSignetAuth();
  const [activeMethod, setActiveMethod] = useState<SigningMethod | null>(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleSign = useCallback(
    async (method: SigningMethod) => {
      if (!documentHash) return;
      setActiveMethod(method);
      setSigning(true);
      setError(null);

      const account = auth.account;

      try {
        let result: SigningResult | null = null;

        if (account) {
          if (method === 'passkey') {
            result = await signWithPasskey(account, documentHash, 'Signet Document');
          } else if (method === 'swipe') {
            result = await signWithSwipe(account, documentHash, 'Signet Document');
          } else if (method === 'stylus' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
              result = await signWithStylus(account, documentHash, 'Signet Document', imageData);
            }
          } else if (method === 'wallet_connect') {
            // WalletConnect — lazy-loaded to avoid SSR issues
            try {
              const { WalletConnectModal } = await import('@walletconnect/modal');
              const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000';
              const modal = new WalletConnectModal({ projectId });
              // In production: open modal → connect wallet → eth_signTypedData_v4
              // For demo: simulate successful connection
              result = {
                method: 'wallet_connect' as SigningMethod,
                signature: `0x${'00'.repeat(65)}` as `0x${string}`,
                supplementaryProof: undefined,
              };
            } catch {
              setError('WalletConnect failed. Try passkey or stylus.');
            }
          }
        }

        if (result) {
          setSigning(false);
          onSign(method, account, result.supplementaryProof ?? undefined);
        } else {
          // Fallback: simulated signing for demo UI
          let supplementaryProof: string | undefined;
          if (method === 'stylus' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const hashBuffer = await crypto.subtle.digest('SHA-256', imageData.data.buffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              supplementaryProof = `0x${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
            }
          }
          setTimeout(() => {
            setSigning(false);
            onSign(method, account, supplementaryProof);
          }, 1500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Signing failed');
        setSigning(false);
      }
    },
    [documentHash, onSign, auth.account],
  );

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const methods: Array<{ key: SigningMethod; label: string; icon: string }> = [
    { key: 'passkey', label: 'Passkey', icon: '🔑' },
    { key: 'swipe', label: 'Swipe to Sign', icon: '👆' },
    { key: 'stylus', label: 'Draw Signature', icon: '✍️' },
    { key: 'wallet_connect', label: 'WalletConnect', icon: '🔗' },
  ];

  if (!documentHash) {
    return (
      <div className="signet-card text-center">
        <p className="text-white/40">Upload a document first to enable signing</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-sm text-white/40 uppercase tracking-wider">Sign Document</h3>

      {/* Passkey Setup — only shown when not authenticated */}
      {!auth.isAuthenticated && !auth.isLoading && (
        <div className="signet-card space-y-3">
          <p className="font-mono text-xs text-white/60">
            Set up a passkey to sign with real cryptographic proof (Circle Smart Wallet).
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => auth.registerIndividual(`signet-user-${Date.now()}`)}
              className="rounded-lg bg-white/10 px-4 py-2 font-mono text-xs text-white/80 transition hover:bg-white/20"
            >
              Set Up Passkey
            </button>
          </div>
        </div>
      )}

      {/* Account Status */}
      {auth.account && (
        <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4 py-2 font-mono text-xs text-green-400/60">
          <span className="h-2 w-2 rounded-full bg-green-400/60" />
          Smart Account: {formatAddress(auth.account)}
        </div>
      )}

      {/* Signing Methods Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {methods.map((method) => (
          <button
            key={method.key}
            onClick={() => handleSign(method.key)}
            disabled={signing}
            className={`signet-card flex flex-col items-center gap-2 p-4 text-center transition ${
              signing ? 'opacity-30 cursor-not-allowed' : 'hover:border-white/30 hover:bg-white/5'
            } ${
              activeMethod === method.key && signing ? 'border-white/40 bg-white/10' : ''
            }`}
          >
            <span className="text-2xl">{method.icon}</span>
            <span className="font-mono text-xs text-white/60">{method.label}</span>
          </button>
        ))}
      </div>

      {/* Stylus Canvas */}
      {activeMethod === 'stylus' && (
        <div className="signet-card space-y-3">
          <p className="font-mono text-xs text-white/40">Draw your signature below</p>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full rounded-lg border border-white/10 bg-white/5"
          />
          <div className="flex gap-3">
            <button
              onClick={clearCanvas}
              className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-xs text-white/40 transition hover:border-white/30 hover:text-white/60"
            >
              Clear
            </button>
            <button
              onClick={() => handleSign('stylus')}
              disabled={signing}
              className="rounded-full bg-white px-4 py-1.5 font-mono text-xs font-medium text-black transition hover:bg-white/90"
            >
              {signing ? 'Signing...' : 'Submit Signature'}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-400/60">
          {error}
        </div>
      )}

      {/* Signing Indicator */}
      {signing && (
        <div className="flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          <span className="font-mono text-sm text-white/60">
            Signing via {methodLabel(activeMethod)}
          </span>
        </div>
      )}
    </div>
  );
}