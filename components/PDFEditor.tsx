'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Type,
  Shield,
  Loader2,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { redactPdfByAreas, sanitizePdf, downloadPdf, RedactionArea } from '@/lib/pdf-redaction';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface RedactionBox extends RedactionArea {
  id: string;
}

type Tool = 'select' | 'redact';

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>('redact');
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const bytes = await file.arrayBuffer();
      setPdfBytes(bytes);

      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setRedactions([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: zoom * 1.5 });

      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
    };

    renderPage();
  }, [pdfDoc, currentPage, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'redact' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setCurrentBox({
      x: Math.min(drawStart.x, x),
      y: Math.min(drawStart.y, y),
      width: Math.abs(x - drawStart.x),
      height: Math.abs(y - drawStart.y),
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;

    if (currentBox.width > 10 && currentBox.height > 10) {
      const newRedaction: RedactionBox = {
        id: crypto.randomUUID(),
        pageIndex: currentPage - 1,
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.width,
        height: currentBox.height,
      };
      setRedactions([...redactions, newRedaction]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentBox(null);
  };

  const removeRedaction = (id: string) => {
    setRedactions(redactions.filter(r => r.id !== id));
  };

  const clearAllRedactions = () => {
    setRedactions([]);
  };

  const applyRedactions = async () => {
    if (!pdfBytes || redactions.length === 0) return;

    setIsProcessing(true);
    try {
      const redactedPdf = await redactPdfByAreas(pdfBytes, redactions);
      const sanitized = await sanitizePdf(redactedPdf.buffer as ArrayBuffer);

      const filename = pdfFile?.name.replace('.pdf', '-redacted.pdf') || 'redacted.pdf';
      downloadPdf(sanitized, filename);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Redaction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageRedactions = redactions.filter(r => r.pageIndex === currentPage - 1);

  if (!pdfFile) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div
          {...getRootProps()}
          className={`drop-zone p-16 cursor-pointer text-center ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff6b35]/20 to-[#ff6b35]/5 flex items-center justify-center">
              <Upload className="w-10 h-10 text-[#ff6b35]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Drop your PDF here
              </h3>
              <p className="text-[#666]">
                or click to browse • Max 50MB
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#888]">
              <Shield className="w-4 h-4" />
              <span>Files are processed locally in your browser</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Toolbar */}
      <div className="card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPdfFile(null)}
            className="btn-secondary flex items-center gap-2 !px-4 !py-2"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">New File</span>
          </button>

          <div className="h-6 w-px bg-[#1a1a1a] mx-2" />

          <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg p-1">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded-md transition-colors ${
                tool === 'select' ? 'bg-[#1a1a1a] text-[#ff6b35]' : 'text-[#666] hover:text-white'
              }`}
              title="Select"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('redact')}
              className={`p-2 rounded-md transition-colors ${
                tool === 'redact' ? 'bg-[#1a1a1a] text-[#ff6b35]' : 'text-[#666] hover:text-white'
              }`}
              title="Redact"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-[#1a1a1a] mx-2" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-2 text-[#666] hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-[#888] w-16 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="p-2 text-[#666] hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {redactions.length > 0 && (
            <button
              onClick={clearAllRedactions}
              className="text-sm text-[#666] hover:text-[#ef4444] transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear All ({redactions.length})
            </button>
          )}

          <button
            onClick={applyRedactions}
            disabled={redactions.length === 0 || isProcessing}
            className="btn-primary flex items-center gap-2 !px-5 !py-2.5"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Apply & Download</span>
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex gap-4">
        {/* PDF Canvas */}
        <div className="flex-1 card p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
          <div
            ref={containerRef}
            className="relative inline-block cursor-crosshair"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} className="shadow-2xl rounded-lg" />

            {/* Existing redaction boxes */}
            {currentPageRedactions.map((box) => (
              <div
                key={box.id}
                className="absolute bg-[#ff6b35]/30 border-2 border-[#ff6b35] cursor-pointer group"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tool === 'select') {
                    removeRedaction(box.id);
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRedaction(box.id);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}

            {/* Current drawing box */}
            {currentBox && (
              <div
                className="absolute bg-[#ff6b35]/20 border-2 border-dashed border-[#ff6b35]"
                style={{
                  left: currentBox.x,
                  top: currentBox.y,
                  width: currentBox.width,
                  height: currentBox.height,
                }}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 space-y-4">
          {/* Page Navigation */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-[#888] mb-3">Page</h3>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-2 text-[#666] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium">
                {currentPage} <span className="text-[#666]">/ {totalPages}</span>
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 text-[#666] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Redact */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-[#888] mb-3">Find & Redact</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter text to find..."
                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6b35]/50"
              />
            </div>
            <p className="text-xs text-[#666] mt-2">
              Draw boxes over text to redact it
            </p>
          </div>

          {/* Redactions List */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-[#888] mb-3">
              Redactions ({redactions.length})
            </h3>
            {redactions.length === 0 ? (
              <p className="text-sm text-[#666]">
                No redactions yet. Draw boxes on the PDF to mark areas for redaction.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {redactions.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-[#0a0a0a] rounded-lg px-3 py-2"
                  >
                    <span className="text-sm">
                      Page {r.pageIndex + 1}, Area {i + 1}
                    </span>
                    <button
                      onClick={() => removeRedaction(r.id)}
                      className="text-[#666] hover:text-[#ef4444] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="card p-4 border-[#ff6b35]/30">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff6b35] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-[#ff6b35] mb-1">True Redaction</p>
                <p className="text-[#888]">
                  Text under redaction boxes will be permanently removed from the PDF. This cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="toast flex items-center gap-3 border-[#10b981]/30">
          <div className="w-8 h-8 rounded-full bg-[#10b981]/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-[#10b981]" />
          </div>
          <div>
            <p className="font-medium">Redaction Complete</p>
            <p className="text-sm text-[#888]">Your file has been downloaded</p>
          </div>
        </div>
      )}
    </div>
  );
}
