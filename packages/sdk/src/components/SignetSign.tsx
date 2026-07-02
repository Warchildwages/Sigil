import { useState, useRef, useCallback } from 'react';
import type { SigningMethod } from '@signet/shared';
import type { SmartAccount } from '@signet/blockchain/circle';

interface SignetSignProps {
  documentHash: `0x${string}` | null;
  onSign: (method: SigningMethod, account: SmartAccount | null, supplementaryProof?: string) => Promise<void>;
  signing: boolean;
}

export function SignetSign({ documentHash, onSign, signing }: SignetSignProps) {
  const [selectedMethod, setSelectedMethod] = useState<SigningMethod | null>(null);
  const [stylusData, setStylusData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const handleSelect = (method: SigningMethod) => {
    setSelectedMethod(method);
    setStylusData(null);
  };

  const handleCanvasStart = useCallback(() => {
    drawingRef.current = true;
  }, []);

  const handleCanvasMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;

    if ('touches' in e) {
      x = e.touches[0]!.clientX - rect.left;
      y = e.touches[0]!.clientY - rect.top;
      e.preventDefault();
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const handleCanvasEnd = useCallback(() => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    setStylusData(canvas.toDataURL());
  }, []);

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStylusData(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedMethod || signing) return;
    const proof = selectedMethod === 'stylus' ? (stylusData ?? undefined) : undefined;
    await onSign(selectedMethod, null, proof);
  }, [selectedMethod, signing, stylusData, onSign]);

  const methods: Array<{ key: SigningMethod; label: string; icon: string; desc: string }> = [
    {
      key: 'passkey',
      label: 'Passkey',
      icon: '🔑',
      desc: 'WebAuthn biometric — fingerprint or face on any device',
    },
    {
      key: 'stylus',
      label: 'Draw Signature',
      icon: '✍️',
      desc: 'Draw your signature with finger or stylus on any touch device',
    },
  ];

  return (
    <div className="signet-sign">
      <div className="signet-card">
        <h3 className="signet-card-title">Sign Document</h3>
        <p className="signet-card-subtitle">
          Hash: {documentHash ? `${documentHash.slice(0, 16)}...${documentHash.slice(-8)}` : '—'}
        </p>

        <div className="signet-sign-methods">
          {methods.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => handleSelect(m.key)}
              className={`signet-sign-method ${selectedMethod === m.key ? 'signet-sign-method--selected' : ''}`}
            >
              <span className="signet-sign-method-icon">{m.icon}</span>
              <div className="signet-sign-method-info">
                <span className="signet-sign-method-label">{m.label}</span>
                <span className="signet-sign-method-desc">{m.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Stylus canvas */}
        {selectedMethod === 'stylus' && (
          <div className="signet-sign-canvas-container">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="signet-sign-canvas"
              onMouseDown={handleCanvasStart}
              onMouseMove={handleCanvasMove}
              onMouseUp={handleCanvasEnd}
              onMouseLeave={handleCanvasEnd}
              onTouchStart={handleCanvasStart}
              onTouchMove={handleCanvasMove}
              onTouchEnd={handleCanvasEnd}
            />
            <button
              type="button"
              onClick={handleClearCanvas}
              className="signet-btn signet-btn--ghost signet-sign-clear"
            >
              Clear
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedMethod || signing}
          className="signet-btn signet-btn--primary signet-sign-submit"
        >
          {signing ? 'Signing...' : 'Sign & Attest'}
        </button>
      </div>
    </div>
  );
}