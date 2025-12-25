'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
  Check,
  X,
  Sparkles,
  Shield,
  Mail,
  Phone,
  CreditCard,
  Hash,
  CheckCircle,
  AlertCircle,
  Package
} from 'lucide-react';
import {
  redactPdfByAreas,
  detectSensitivePatterns,
  patternMatchesToRedactions,
  PatternMatch
} from '@/lib/pdf-redaction';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface BatchFile {
  id: string;
  file: File;
  bytes: ArrayBuffer;
  pageCount: number;
  status: 'pending' | 'scanning' | 'scanned' | 'processing' | 'done' | 'error';
  patterns: PatternMatch[];
  error?: string;
}

export default function BatchProcessor() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(
    new Set(['ssn', 'email', 'phone', 'credit_card'])
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ name: string; bytes: Uint8Array }[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(f => f.type === 'application/pdf');

    const newFiles: BatchFile[] = await Promise.all(
      pdfFiles.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;

        return {
          id: crypto.randomUUID(),
          file,
          bytes,
          pageCount: doc.numPages,
          status: 'pending' as const,
          patterns: [],
        };
      })
    );

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxFiles: 10,
  });

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setProcessedFiles([]);
  };

  const togglePattern = (pattern: string) => {
    const newPatterns = new Set(selectedPatterns);
    if (newPatterns.has(pattern)) {
      newPatterns.delete(pattern);
    } else {
      newPatterns.add(pattern);
    }
    setSelectedPatterns(newPatterns);
  };

  const scanAllFiles = async () => {
    if (files.length === 0 || selectedPatterns.size === 0) return;

    setIsScanning(true);
    const patterns = Array.from(selectedPatterns) as ('ssn' | 'email' | 'phone' | 'credit_card')[];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'scanning' } : f
      ));

      try {
        const matches = await detectSensitivePatterns(file.bytes, patterns);

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'scanned', patterns: matches } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error', error: 'Scan failed' } : f
        ));
      }
    }

    setIsScanning(false);
  };

  const processAllFiles = async () => {
    const filesToProcess = files.filter(f => f.status === 'scanned' && f.patterns.length > 0);
    if (filesToProcess.length === 0) return;

    setIsProcessing(true);
    const results: { name: string; bytes: Uint8Array }[] = [];

    for (const file of filesToProcess) {
      setFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'processing' } : f
      ));

      try {
        const redactionAreas = patternMatchesToRedactions(file.patterns);
        const redactedPdf = await redactPdfByAreas(file.bytes, redactionAreas);

        results.push({
          name: file.file.name.replace('.pdf', '-redacted.pdf'),
          bytes: redactedPdf,
        });

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'done' } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error', error: 'Redaction failed' } : f
        ));
      }
    }

    setProcessedFiles(results);
    setIsProcessing(false);
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) return;

    if (processedFiles.length === 1) {
      // Single file - download directly
      const { name, bytes } = processedFiles[0];
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Multiple files - create ZIP
      const zip = new JSZip();

      for (const file of processedFiles) {
        zip.file(file.name, file.bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'redacted-documents.zip';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const totalPatterns = files.reduce((sum, f) => sum + f.patterns.length, 0);
  const scannedFiles = files.filter(f => f.status === 'scanned' || f.status === 'done').length;
  const doneFiles = files.filter(f => f.status === 'done').length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Pro Badge */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="badge">
          <Sparkles className="w-4 h-4" />
          <span>Pro Feature</span>
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`drop-zone p-12 cursor-pointer text-center mb-6 ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b35]/20 to-[#ff6b35]/5 flex items-center justify-center">
            <Upload className="w-8 h-8 text-[#ff6b35]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Drop multiple PDFs here
            </h3>
            <p className="text-[#666] text-sm">
              Up to 10 files at once
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <>
          {/* Pattern Selection */}
          <div className="card p-4 mb-4">
            <h3 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Patterns to Detect & Redact
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => togglePattern('ssn')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedPatterns.has('ssn')
                    ? 'bg-[#ff6b35]/20 border border-[#ff6b35]/50 text-[#ff6b35]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#666]'
                }`}
              >
                <Hash className="w-4 h-4" />
                SSN
              </button>
              <button
                onClick={() => togglePattern('email')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedPatterns.has('email')
                    ? 'bg-[#ff6b35]/20 border border-[#ff6b35]/50 text-[#ff6b35]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#666]'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={() => togglePattern('phone')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedPatterns.has('phone')
                    ? 'bg-[#ff6b35]/20 border border-[#ff6b35]/50 text-[#ff6b35]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#666]'
                }`}
              >
                <Phone className="w-4 h-4" />
                Phone
              </button>
              <button
                onClick={() => togglePattern('credit_card')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedPatterns.has('credit_card')
                    ? 'bg-[#ff6b35]/20 border border-[#ff6b35]/50 text-[#ff6b35]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#666]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Card
              </button>
            </div>
          </div>

          {/* File List */}
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#888]">
                Files ({files.length})
              </h3>
              <button
                onClick={clearAll}
                className="text-sm text-[#666] hover:text-[#ef4444] transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg px-4 py-3"
                >
                  <FileText className="w-5 h-5 text-[#666] flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <p className="text-xs text-[#666]">
                      {file.pageCount} page{file.pageCount !== 1 ? 's' : ''}
                      {file.patterns.length > 0 && (
                        <span className="text-purple-400 ml-2">
                          {file.patterns.length} pattern{file.patterns.length !== 1 ? 's' : ''} found
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.status === 'pending' && (
                      <span className="text-xs text-[#666]">Pending</span>
                    )}
                    {file.status === 'scanning' && (
                      <Loader2 className="w-4 h-4 text-[#ff6b35] animate-spin" />
                    )}
                    {file.status === 'scanned' && (
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                    )}
                    {file.status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-[#ff6b35] animate-spin" />
                    )}
                    {file.status === 'done' && (
                      <CheckCircle className="w-4 h-4 text-[#10b981]" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                    )}

                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-[#666] hover:text-[#ef4444] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {totalPatterns > 0 && (
            <div className="card p-4 mb-4 border-purple-500/30">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="font-medium">
                    Found <span className="text-purple-400">{totalPatterns}</span> sensitive patterns
                  </p>
                  <p className="text-sm text-[#666]">
                    Across {scannedFiles} file{scannedFiles !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {scannedFiles < files.length && (
              <button
                onClick={scanAllFiles}
                disabled={isScanning || selectedPatterns.size === 0}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Scan All Files</span>
              </button>
            )}

            {scannedFiles > 0 && doneFiles < scannedFiles && totalPatterns > 0 && (
              <button
                onClick={processAllFiles}
                disabled={isProcessing}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span>Redact All ({totalPatterns} patterns)</span>
              </button>
            )}

            {processedFiles.length > 0 && (
              <button
                onClick={downloadAll}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {processedFiles.length > 1 ? (
                  <Package className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  Download {processedFiles.length > 1 ? 'ZIP' : 'File'}
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center text-[#666] mt-8">
          <p>Upload multiple PDFs to scan for sensitive patterns and redact them all at once.</p>
          <p className="text-sm mt-2">SSNs, emails, phone numbers, and credit cards are automatically detected.</p>
        </div>
      )}
    </div>
  );
}
