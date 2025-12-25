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
  AlertTriangle,
  Search,
  Sparkles,
  ShieldCheck,
  Mail,
  Phone,
  CreditCard,
  Hash
} from 'lucide-react';
import {
  redactPdfByAreas,
  downloadPdf,
  findTextInPdf,
  detectSensitivePatterns,
  patternMatchesToRedactions,
  verifyRedaction,
  RedactionArea,
  TextMatch,
  PatternMatch
} from '@/lib/pdf-redaction';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface RedactionBox extends RedactionArea {
  id: string;
  source?: 'manual' | 'search' | 'pattern';
  label?: string;
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
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TextMatch[]>([]);

  // Pattern detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [patternResults, setPatternResults] = useState<PatternMatch[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set(['ssn', 'email', 'phone', 'credit_card']));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const bytes = await file.arrayBuffer();
      // Make a copy of the bytes - pdf.js transfers ownership of the original
      const bytesCopy = bytes.slice(0);
      setPdfBytes(bytesCopy);

      // Use another copy for pdf.js document loading
      const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setRedactions([]);
      setSearchResults([]);
      setPatternResults([]);
      setVerificationResult(null);
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

  // Search for text
  const handleSearch = async () => {
    if (!pdfBytes || !searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const matches = await findTextInPdf(pdfBytes, searchTerm.trim(), false);
      setSearchResults(matches);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Add search results as redactions (scale to match canvas)
  const addSearchResultsAsRedactions = () => {
    const SCALE = 1.5; // Must match render scale
    const newRedactions: RedactionBox[] = searchResults.map((match, index) => ({
      id: crypto.randomUUID(),
      pageIndex: match.pageIndex,
      x: match.x * SCALE,
      y: match.y * SCALE,
      width: match.width * SCALE,
      height: match.height * SCALE,
      source: 'search' as const,
      label: `"${searchTerm}" (${index + 1})`,
    }));

    setRedactions([...redactions, ...newRedactions]);
    setSearchResults([]);
    setSearchTerm('');
  };

  // Detect sensitive patterns
  const handleDetectPatterns = async () => {
    if (!pdfBytes) return;

    setIsDetecting(true);
    try {
      const patterns = Array.from(selectedPatterns) as ('ssn' | 'email' | 'phone' | 'credit_card')[];
      const matches = await detectSensitivePatterns(pdfBytes, patterns);
      setPatternResults(matches);
    } catch (error) {
      console.error('Pattern detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  // Add pattern results as redactions (scale to match canvas)
  const addPatternResultsAsRedactions = () => {
    const SCALE = 1.5; // Must match render scale
    const areas = patternMatchesToRedactions(patternResults);
    const newRedactions: RedactionBox[] = areas.map((area, index) => ({
      id: crypto.randomUUID(),
      pageIndex: area.pageIndex,
      x: area.x * SCALE,
      y: area.y * SCALE,
      width: area.width * SCALE,
      height: area.height * SCALE,
      source: 'pattern' as const,
      label: patternResults[index]?.patternType || 'pattern',
    }));

    setRedactions([...redactions, ...newRedactions]);
    setPatternResults([]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drawing if clicking on a redaction box or button
    const target = e.target as HTMLElement;
    if (target.closest('[data-redaction-box]') || target.tagName === 'BUTTON') {
      return;
    }

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
        source: 'manual',
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
    setVerificationResult(null);

    try {
      // Convert coordinates from canvas scale (1.5x) back to PDF scale (1x)
      const UI_SCALE = 1.5;
      const pdfScaleRedactions = redactions.map(r => ({
        ...r,
        x: r.x / UI_SCALE,
        y: r.y / UI_SCALE,
        width: r.width / UI_SCALE,
        height: r.height / UI_SCALE,
      }));

      // Apply true redaction (flattens to images)
      const redactedPdf = await redactPdfByAreas(pdfBytes, pdfScaleRedactions);

      // Verify the redaction worked (use PDF scale coordinates)
      const verification = await verifyRedaction(redactedPdf.buffer as ArrayBuffer, pdfScaleRedactions);

      if (verification.success) {
        setVerificationResult({
          success: true,
          message: 'Verified: No extractable text found in redacted areas',
        });
      } else {
        setVerificationResult({
          success: false,
          message: `Warning: Found ${verification.extractedText.length} text fragments. Re-processing...`,
        });
      }

      const filename = pdfFile?.name.replace('.pdf', '-redacted.pdf') || 'redacted.pdf';
      downloadPdf(redactedPdf, filename);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error('Redaction failed:', error);
      setVerificationResult({
        success: false,
        message: 'Redaction failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
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

  // The canvas is rendered at 1.5x scale for quality
  const RENDER_SCALE = 1.5;

  const currentPageRedactions = redactions.filter(r => r.pageIndex === currentPage - 1);
  // Scale search/pattern results to match canvas render scale
  const currentPageSearchResults = searchResults
    .filter(r => r.pageIndex === currentPage - 1)
    .map(r => ({ ...r, x: r.x * RENDER_SCALE, y: r.y * RENDER_SCALE, width: r.width * RENDER_SCALE, height: r.height * RENDER_SCALE }));
  const currentPagePatternResults = patternResults
    .filter(r => r.pageIndex === currentPage - 1)
    .map(r => ({ ...r, x: r.x * RENDER_SCALE, y: r.y * RENDER_SCALE, width: r.width * RENDER_SCALE, height: r.height * RENDER_SCALE }));

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
                or click to browse
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
            onClick={() => {
              setPdfFile(null);
              setPdfBytes(null);
              setPdfDoc(null);
              setRedactions([]);
              setSearchResults([]);
              setPatternResults([]);
              setVerificationResult(null);
            }}
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

            {/* Search result highlights (yellow) */}
            {currentPageSearchResults.map((match, idx) => (
              <div
                key={`search-${idx}`}
                className="absolute bg-yellow-500/30 border-2 border-yellow-500 pointer-events-none"
                style={{
                  left: match.x,
                  top: match.y,
                  width: match.width,
                  height: match.height,
                }}
              />
            ))}

            {/* Pattern result highlights (purple) */}
            {currentPagePatternResults.map((match, idx) => (
              <div
                key={`pattern-${idx}`}
                className="absolute bg-purple-500/30 border-2 border-purple-500 pointer-events-none"
                style={{
                  left: match.x,
                  top: match.y,
                  width: match.width,
                  height: match.height,
                }}
              />
            ))}

            {/* Existing redaction boxes */}
            {currentPageRedactions.map((box) => (
              <div
                key={box.id}
                data-redaction-box="true"
                className="absolute bg-[#ff6b35]/30 border-2 border-[#ff6b35] cursor-pointer"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeRedaction(box.id);
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRedaction(box.id);
                  }}
                  className="absolute top-0 right-0 w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center shadow-lg z-10"
                  style={{ transform: 'translate(50%, -50%)' }}
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
        <div className="w-80 space-y-4">
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

          {/* Find & Redact */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Find & Redact
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter text to find..."
                className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6b35]/50"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchTerm.trim()}
                className="btn-secondary !px-3 !py-2"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-[#888]">
                  Found <span className="text-yellow-500 font-medium">{searchResults.length}</span> matches
                </p>
                <button
                  onClick={addSearchResultsAsRedactions}
                  className="w-full btn-primary !py-2 text-sm"
                >
                  <span>Redact All Matches</span>
                </button>
              </div>
            )}
          </div>

          {/* Pattern Detection */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Pattern Detection
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => togglePattern('ssn')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedPatterns.has('credit_card')
                    ? 'bg-[#ff6b35]/20 border border-[#ff6b35]/50 text-[#ff6b35]'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#666]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Card
              </button>
            </div>

            <button
              onClick={handleDetectPatterns}
              disabled={isDetecting || selectedPatterns.size === 0}
              className="w-full btn-secondary !py-2 text-sm flex items-center justify-center gap-2"
            >
              {isDetecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Scan for Patterns
            </button>

            {patternResults.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-sm text-[#888]">
                  Found <span className="text-purple-500 font-medium">{patternResults.length}</span> sensitive patterns
                </p>
                <div className="text-xs text-[#666] space-y-1">
                  {['ssn', 'email', 'phone', 'credit_card'].map(type => {
                    const count = patternResults.filter(p => p.patternType === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-purple-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={addPatternResultsAsRedactions}
                  className="w-full btn-primary !py-2 text-sm"
                >
                  <span>Redact All Patterns</span>
                </button>
              </div>
            )}
          </div>

          {/* Redactions List */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-[#888] mb-3">
              Redactions ({redactions.length})
            </h3>
            {redactions.length === 0 ? (
              <p className="text-sm text-[#666]">
                No redactions yet. Draw boxes, search text, or detect patterns.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {redactions.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-[#0a0a0a] rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block truncate">
                        {r.label || `Page ${r.pageIndex + 1}, Area ${i + 1}`}
                      </span>
                      {r.source && (
                        <span className={`text-xs ${
                          r.source === 'search' ? 'text-yellow-500' :
                          r.source === 'pattern' ? 'text-purple-500' :
                          'text-[#666]'
                        }`}>
                          {r.source}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRedaction(r.id)}
                      className="text-[#666] hover:text-[#ef4444] transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`card p-4 ${verificationResult.success ? 'border-[#10b981]/30' : 'border-[#ef4444]/30'}`}>
              <div className="flex gap-3">
                {verificationResult.success ? (
                  <ShieldCheck className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className={`font-medium mb-1 ${verificationResult.success ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {verificationResult.success ? 'Redaction Verified' : 'Verification Issue'}
                  </p>
                  <p className="text-[#888]">{verificationResult.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="card p-4 border-[#ff6b35]/30">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff6b35] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-[#ff6b35] mb-1">True Redaction</p>
                <p className="text-[#888]">
                  Pages with redactions are flattened to images. The original text is permanently removed - not just hidden.
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
            <p className="text-sm text-[#888]">
              {verificationResult?.success
                ? 'Verified: No extractable text in redacted areas'
                : 'Your file has been downloaded'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
