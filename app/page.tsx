'use client';

import dynamic from 'next/dynamic';
import {
  Shield,
  ShieldCheck,
  Zap,
  FileSearch,
  Lock,
  Check,
  X,
  ArrowRight,
  AlertTriangle,
  Layers,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';

const PDFEditor = dynamic(() => import('@/components/PDFEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-3xl mx-auto">
      <div className="drop-zone p-16 text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-[#666]">Loading PDF editor...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [showApp, setShowApp] = useState(false);

  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">
      {/* Hero gradient orbs */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              Actually<span className="text-[#ff6b35]">Redact</span>PDF
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#888]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <button
            onClick={() => setShowApp(true)}
            className="btn-primary !py-2.5 !px-5 text-sm"
          >
            <span>Start Redacting</span>
          </button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        {!showApp && (
          <section className="max-w-7xl mx-auto px-6 py-24 text-center">
            <div className="fade-in">
              <div className="badge mx-auto mb-6">
                <AlertTriangle className="w-4 h-4" />
                <span>Black boxes don&apos;t actually redact</span>
              </div>
            </div>

            <h1 className="fade-in fade-in-delay-1 text-5xl md:text-7xl font-bold mb-6 leading-tight">
              PDF Redaction That<br />
              <span className="gradient-text">Actually Works</span>
            </h1>

            <p className="fade-in fade-in-delay-2 text-xl text-[#888] max-w-2xl mx-auto mb-10">
              Most tools just draw black boxes over text—leaving it searchable and extractable.
              We permanently remove the content. Zero hidden layers. Zero metadata leaks.
            </p>

            <div className="fade-in fade-in-delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => setShowApp(true)}
                className="btn-primary text-lg flex items-center gap-2 justify-center"
              >
                <span>Redact a PDF Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#how-it-works"
                className="btn-secondary text-lg flex items-center gap-2 justify-center"
              >
                <span>See How It Works</span>
              </a>
            </div>

            {/* Problem Statement */}
            <div className="card p-8 max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-left">
                  <div className="flex items-center gap-2 text-[#ef4444] mb-4">
                    <X className="w-5 h-5" />
                    <span className="font-semibold">What most tools do</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-[#ef4444] mt-0.5" />
                      <p className="text-[#888]">Draw a black box over text (text still exists underneath)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileSearch className="w-5 h-5 text-[#ef4444] mt-0.5" />
                      <p className="text-[#888]">Text remains searchable with Ctrl+F</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Layers className="w-5 h-5 text-[#ef4444] mt-0.5" />
                      <p className="text-[#888]">Hidden text layers and metadata preserved</p>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 text-[#10b981] mb-4">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">What we do</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <EyeOff className="w-5 h-5 text-[#10b981] mt-0.5" />
                      <p className="text-[#888]">Permanently remove text from the PDF content stream</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-[#10b981] mt-0.5" />
                      <p className="text-[#888]">Nothing to search, copy, or extract</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-[#10b981] mt-0.5" />
                      <p className="text-[#888]">All metadata stripped and document sanitized</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PDF Editor */}
        {showApp && (
          <section className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Redact Your PDF</h2>
              <p className="text-[#888]">Draw boxes over sensitive content. Download a truly redacted file.</p>
            </div>
            <PDFEditor />
          </section>
        )}

        {/* Features Section */}
        {!showApp && (
          <section id="features" className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Built for Real Security</h2>
              <p className="text-xl text-[#888]">Not just visual obscurity—actual data removal</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="card p-6">
                <div className="feature-icon mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">True Redaction</h3>
                <p className="text-[#888]">
                  We modify the PDF&apos;s internal content stream, not just the visual layer.
                  The text is completely removed from the file.
                </p>
              </div>

              <div className="card p-6">
                <div className="feature-icon mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Metadata Stripping</h3>
                <p className="text-[#888]">
                  Author names, creation dates, comments, and hidden data are all
                  removed during the sanitization process.
                </p>
              </div>

              <div className="card p-6">
                <div className="feature-icon mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Browser-Based</h3>
                <p className="text-[#888]">
                  Your files never leave your device. All processing happens
                  locally in your browser for maximum privacy.
                </p>
              </div>

              <div className="card p-6">
                <div className="feature-icon mb-4">
                  <FileSearch className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Find & Redact</h3>
                <p className="text-[#888]">
                  Search for specific terms across your document and redact
                  all instances at once. Perfect for SSNs, names, or emails.
                </p>
              </div>

              <div className="card p-6">
                <div className="feature-icon mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Batch Processing</h3>
                <p className="text-[#888]">
                  Pro users can upload multiple PDFs and apply the same
                  redaction rules across all documents at once.
                </p>
              </div>

              <div className="card p-6">
                <div className="feature-icon mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Pattern Detection</h3>
                <p className="text-[#888]">
                  Automatically detect and redact common sensitive patterns like
                  SSNs, credit cards, phone numbers, and emails.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* How It Works Section */}
        {!showApp && (
          <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-[#888]">Three steps to truly secure redaction</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload Your PDF</h3>
                <p className="text-[#888]">
                  Drop your file or click to browse. Your document stays in your browser—we never see it.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Mark Redactions</h3>
                <p className="text-[#888]">
                  Draw boxes over sensitive content or use Find & Redact to locate specific terms.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Download Secure PDF</h3>
                <p className="text-[#888]">
                  Click Apply and get a clean PDF with content truly removed, not just hidden.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Pricing Section */}
        {!showApp && (
          <section id="pricing" className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
              <p className="text-xl text-[#888]">Start free. Upgrade when you need more.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Tier */}
              <div className="pricing-card">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-[#888]">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">5 PDFs per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Manual redaction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Metadata stripping</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-5 h-5 text-[#666]" />
                    <span className="text-[#666]">Batch processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-5 h-5 text-[#666]" />
                    <span className="text-[#666]">Pattern detection</span>
                  </li>
                </ul>
                <button
                  onClick={() => setShowApp(true)}
                  className="btn-secondary w-full"
                >
                  Get Started
                </button>
              </div>

              {/* Pro Tier */}
              <div className="pricing-card featured">
                <div className="badge mb-4">Most Popular</div>
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-[#888]">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Unlimited PDFs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Find & Redact</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Batch processing (10 files)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Pattern detection (SSN, emails)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Priority support</span>
                  </li>
                </ul>
                <button className="btn-primary w-full">
                  <span>Upgrade to Pro</span>
                </button>
              </div>

              {/* Enterprise Tier */}
              <div className="pricing-card">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-[#888]">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Unlimited batch processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">API access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">Custom patterns</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#888]">SOC 2 compliance report</span>
                  </li>
                </ul>
                <button className="btn-secondary w-full">
                  Contact Sales
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        {!showApp && (
          <section className="max-w-7xl mx-auto px-6 py-24">
            <div className="card p-12 text-center glow">
              <h2 className="text-4xl font-bold mb-4">
                Stop Leaking Sensitive Data
              </h2>
              <p className="text-xl text-[#888] mb-8 max-w-2xl mx-auto">
                Join thousands of legal professionals, healthcare providers, and businesses
                who trust ActuallyRedactPDF for true document security.
              </p>
              <button
                onClick={() => setShowApp(true)}
                className="btn-primary text-lg"
              >
                <span>Try It Free →</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1a1a1a] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#ff8c5a] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">ActuallyRedactPDF</span>
            </div>
            <p className="text-[#666] text-sm">
              © 2025 ActuallyRedactPDF. Your data never leaves your browser.
            </p>
            <div className="flex items-center gap-6 text-sm text-[#666]">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
