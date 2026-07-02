import { useCallback, useState, useRef } from 'react';
import { hashDocument } from '@sigil/blockchain/hash';

interface SignetUploadProps {
  onHash: (hash: `0x${string}`, file: File) => void;
  prefillTitle?: string;
}

export function SignetUpload({ onHash, prefillTitle }: SignetUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setHashing(true);
      try {
        const docHash = await hashDocument(file);
        onHash(docHash, file);
      } catch {
        // hash computation failed
      } finally {
        setHashing(false);
      }
    },
    [onHash],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleClick = () => inputRef.current?.click();

  return (
    <div className="signet-upload">
      <div
        className={`signet-upload-zone ${dragging ? 'signet-upload-zone--dragging' : ''} ${selectedFile ? 'signet-upload-zone--has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleChange}
          className="signet-upload-input"
        />

        {hashing ? (
          <div className="signet-upload-hashing">
            <div className="signet-spinner" />
            <p className="signet-upload-text">Computing document hash...</p>
          </div>
        ) : selectedFile ? (
          <div className="signet-upload-selected">
            <span className="signet-upload-icon">📄</span>
            <span className="signet-upload-filename">{selectedFile.name}</span>
            <span className="signet-upload-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : (
          <div className="signet-upload-placeholder">
            <span className="signet-upload-icon">↑</span>
            <p className="signet-upload-text">Drop a document or click to browse</p>
            <p className="signet-upload-hint">PDF, DOCX, or TXT</p>
            {prefillTitle && (
              <p className="signet-upload-prefill">Document: {prefillTitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}