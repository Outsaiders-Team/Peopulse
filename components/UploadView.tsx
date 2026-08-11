'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';
import { UploadCloudIcon, FileIcon, RemoveIcon } from './icons';
import { USE_SAMPLE_ANALYSIS } from '@/lib/sample-analysis';

const ALLOWED_EXT = ['csv', 'xlsx', 'xls'];
const MAX_BYTES = 50 * 1024 * 1024;

const LOADING_MESSAGES = [
  'Parsing your files',
  'Summarizing your responses',
  'Separating the questions',
  'Finding the big themes',
  'Pulling out what people said',
  'Almost there',
];
const RUN_BTN_DEFAULT_LABEL = 'Summarize responses';
const LOADING_MESSAGE_INTERVAL_MS = 3200;
const LOADING_FADE_MS = 400;

function formatFileMeta(file: File) {
  const ext = file.name.split('.').pop()?.toUpperCase() || '';
  const size =
    file.size < 1024 * 1024
      ? `${Math.max(1, Math.round(file.size / 1024))} KB`
      : `${(file.size / 1048576).toFixed(1)} MB`;
  return `${ext} \u00B7 ${size}`;
}

export function UploadView({ loading, onAnalyze }: { loading: boolean; onAnalyze: (file: File | null) => void }) {
  const router = useRouter();
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const [loadingIndex, setLoadingIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const validateAndSelect = useCallback(
    (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXT.includes(ext)) {
        showToast('Please pick a CSV, XLSX, or XLS file.');
        return;
      }
      if (file.size > MAX_BYTES) {
        showToast('That file is too big. Please pick a file under 50MB.');
        return;
      }
      setSelectedFile(file);
    },
    [showToast]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    e.target.value = '';
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const dragHasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');

    const onDragEnter = (e: DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      if (!dragHasFiles(e)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files?.length && !dragHasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      if (files?.length) {
        if (files.length > 1) showToast('Only the first file will be used.');
        validateAndSelect(files[0]);
      }
    };

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, [showToast, validateAndSelect]);

  useEffect(() => {
    if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset visual state when the loading prop flips off
      setLoadingIndex(0);
      setFading(false);
      return;
    }
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFading(false);
      }, LOADING_FADE_MS);
    }, LOADING_MESSAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loading]);

  const runDisabled = loading || (!selectedFile && !USE_SAMPLE_ANALYSIS);

  return (
    <div
      className={`page active${isDragging ? ' is-dragging' : ''}`}
      id="page-upload"
    >
      <div className="shell shell--upload">
        <div className="frame">
          <div className="sheet">
            <div className="sheet-body">
              <section className="sheet-intro" aria-labelledby="upload-title">
                <div
                  className="intro-brand"
                  onClick={() => router.replace('/')}
                  role="button"
                  tabIndex={0}
                  aria-label="Peopulse home"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.replace('/');
                    }
                  }}
                >
                  <span className="brand-badge" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="brand-badge-img" src="/assets/peopulse-mark.png" alt="" width={32} height={32} decoding="async" />
                  </span>
                  Peopulse
                </div>

                <div className="intro-copy">
                  <h1 className="intro-title" id="upload-title">
                    Free yourself from the feedback pile.
                  </h1>
                  <p className="intro-lede">
                    Upload your form export. Peopulse sums up the long text into a short summary, clear insights, and
                    the positive and negative things people said, so you don&rsquo;t have to read it all.
                  </p>
                </div>
              </section>

              <section className="sheet-form" aria-labelledby="upload-form-label">
                <div className="form-panel">
                  <p className="form-label" id="upload-form-label">
                    Form export
                  </p>
                  <p className="form-hint">
                    Drop a CSV, XLSX, or XLS file anywhere on this page. We will find the big ideas, then sum up each
                    question.
                  </p>

                  <div className="upload-slot">
                    <div
                      className={`dropzone${selectedFile ? ' is-hidden' : ''}${isDragging ? ' dz-active' : ''}`}
                      id="dz"
                      role="button"
                      tabIndex={selectedFile ? -1 : 0}
                      aria-hidden={!!selectedFile}
                      aria-label="Upload feedback file"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="dz-icon" aria-hidden="true">
                        <UploadCloudIcon />
                      </div>
                      <div className="dz-title">Drop your file here</div>
                      <div className="dz-sub">CSV, XLSX, or XLS &middot; up to 50MB</div>
                      <span className="btn-ghost">Browse files</span>
                    </div>

                    <div
                      className="file-prev"
                      id="fp"
                      hidden={!selectedFile}
                      role="button"
                      tabIndex={selectedFile ? 0 : -1}
                      aria-hidden={!selectedFile}
                      aria-label="Replace feedback file"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      {selectedFile && (
                        <div className="file-attachment">
                          <div className="file-prev-icon" aria-hidden="true">
                            <FileIcon />
                          </div>
                          <div className="file-prev-meta">
                            <div className="file-prev-name" id="fn">
                              {selectedFile.name}
                            </div>
                            <div className="file-prev-size" id="fs">
                              {formatFileMeta(selectedFile)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="file-prev-rm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile();
                            }}
                            aria-label="Remove file"
                          >
                            <RemoveIcon />
                          </button>
                        </div>
                      )}
                      <p className="file-prev-hint">Click or drop a new file to replace</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="fi"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                  />

                  <button
                    type="button"
                    className={`btn-primary${loading ? ' is-loading' : ''}`}
                    id="btn-run"
                    onClick={() => onAnalyze(selectedFile)}
                    disabled={runDisabled}
                    aria-busy={loading || undefined}
                  >
                    <span className="btn-run-label">
                      {loading ? (
                        <span className={`btn-run-status${fading ? ' is-fading' : ''}`}>
                          <span className="btn-run-msg">{LOADING_MESSAGES[loadingIndex]}</span>
                          <span className="loading-dots" aria-hidden="true">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                          </span>
                        </span>
                      ) : (
                        RUN_BTN_DEFAULT_LABEL
                      )}
                    </span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
