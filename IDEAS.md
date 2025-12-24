# Ideas Research - December 23, 2025

## Problem Research

### The PDF Redaction Failure Epidemic

**Real-world disasters caused by bad redaction:**
- Paul Manafort court filings: Journalists copy-pasted "redacted" text
- Multiple PACER documents: 2000+ documents with fake redactions found
- Government agencies leaked classified info
- Law firms exposed privileged client information
- Healthcare HIPAA violations from accessible patient data

**Why it happens:**
- Most tools just draw black boxes (visual layer only)
- Text remains in the PDF content stream
- Hidden text layers from OCR preserved
- Metadata (author, creation date) not stripped
- Users don't know the difference

### Market Analysis

**Adobe Acrobat Pro**: $20-24/month
- Has real redaction but buried in menus
- Requires "Apply Redactions" + "Sanitize Document"
- Most users skip the sanitization step
- Expensive for occasional use

**Foxit PDF Editor**: $160/year
- AI-assisted smart redaction
- Still requires proper workflow

**Nitro PDF Pro**: $15/month
- Search and redact feature
- Subscription model

**Gap in market:**
- No simple, "just works" redaction tool
- Browser-based (no install) options are rare
- Most online tools upload your files (privacy concern)

---

## Candidate: ActuallyRedactPDF

### The Problem
PDF redaction tools don't actually redact - they just draw black boxes while leaving text extractable underneath.

### The Customer
- **Specific**: Legal professionals, HR departments, healthcare providers
- **Where they hang out**: r/lawyers, r/legal, r/HIPAA, legal tech blogs
- **Pain point**: Fear of accidentally leaking confidential info

### Current Solutions
- Adobe Acrobat Pro ($240/year) - works but complex
- Foxit ($160/year) - requires learning curve
- Free online tools - upload files to unknown servers (privacy risk)
- Drawing black boxes in Word/Preview - doesn't work at all

### My Angle
1. **Browser-based** - no upload, no install, maximum privacy
2. **True redaction** - rewrites PDF content stream, not just overlay
3. **Simpler than Adobe** - no multi-step "apply + sanitize" dance
4. **Cheaper** - $19/month vs $20+/month for enterprise tools

### Pricing
- **Free**: 5 PDFs/month (prove it works, get testimonials)
- **Pro $19/month**: Unlimited, batch, patterns (impulse buy for professionals)
- **Enterprise $99/month**: API, custom patterns, compliance reports

### Revenue Potential
- 1.3M+ lawyers in US
- 16M+ healthcare workers handling patient data
- Every HR department with employee records
- 500 Pro users × $19 = $9,500 MRR
- Conservative: $5k MRR in 6 months

### Buildability
**Medium** - requires:
- PDF parsing/writing library (pdf-lib ✓)
- PDF rendering (pdfjs-dist ✓)
- Draw-to-redact interface
- Stripe payments

### Decision
**Building this one.** Clear problem, specific audience, obvious monetization, real consequences of the problem (data breaches, lawsuits).

---

## Other Ideas Considered

### 1. Invoice Parser for Accountants
- **Problem**: Manual data entry from PDFs
- **Revenue**: $29/month
- **Why not**: DocuClipper, ReceiptAI exist
- **Verdict**: Too competitive

### 2. HIPAA Compliance Checker
- **Problem**: Healthcare forms missing required elements
- **Revenue**: $99/month
- **Why not**: Requires deep healthcare knowledge
- **Verdict**: Out of my expertise

### 3. Legal Document Anonymizer
- **Problem**: Removing names/dates for case studies
- **Revenue**: $49/month
- **Why not**: Subset of redaction problem
- **Verdict**: Build as feature, not standalone

---

## Research Sources

- [Epstein Files Redaction Fail](https://allaboutpdf.com/blog/2025/12/23/epstein-files-redaction-fail)
- [Adobe Redaction Still Leaves Text Searchable](https://www.redactmypdf.com/blog/adobe-acrobat-redaction-searchable-text-fix)
- [PDF Association: Is Your Redacted Info Gone?](https://pdfa.org/is-the-information-you-just-redacted-really-gone/)
- [Court Records Redaction Failures](https://boingboing.net/2011/05/26/improper-court-recor.html)
- [Foxit Redaction Best Practices](https://www.foxit.com/blog/redacting-sensitive-data-in-pdfs-what-most-people-get-wrong/)
