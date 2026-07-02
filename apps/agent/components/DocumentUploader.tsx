'use client';

import { useState, useCallback, useRef } from 'react';

interface DocumentUploaderProps {
  onHash: (hash: `0x${string}`, file: File) => void;
}

export function DocumentUploader({ onHash }: DocumentUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const computeHash = useCallback(
    async (f: File) => {
      setHashing(true);
      const buffer = await f.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = `0x${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
      setHash(hashHex);
      setHashing(false);
      onHash(hashHex, f);
    },
    [onHash],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) {
        setFile(f);
        computeHash(f);
      }
    },
    [computeHash],
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) {
        setFile(f);
        computeHash(f);
      }
    },
    [computeHash],
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`signet-card cursor-pointer text-center transition ${
          dragging ? 'border-white/40 bg-white/10' : ''
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleSelect}
          className="hidden"
        />
        {file ? (
          <div className="space-y-2">
            <p className="font-medium text-white">{file.name}</p>
            <p className="font-mono text-xs text-white/40">
              {hashing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                  Computing SHA-256...
                </span>
              ) : (
                hash && (
                  <span className="break-all" title={hash}>
                    SHA-256: {hash.slice(0, 32)}...
                  </span>
                )
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/40"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <p className="text-white/60">Drop a document or click to browse</p>
            <p className="font-mono text-xs text-white/20">
              PDF, DOCX, TXT, PNG, JPG
            </p>
          </div>
        )}
      </div>
    </div>
  );
}