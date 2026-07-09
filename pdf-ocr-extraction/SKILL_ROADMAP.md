# Claude Office Skills - Roadmap

> Complete list of skills implemented, based on gap analysis from:
> - awesome-claude-skills (27k stars)
> - awesome-n8n-templates (18k stars)  
> - Stirling-PDF (73k stars)

---

## ✅ All Skills Completed! (30 skills)

### Core Office Skills (10 skills)

| # | Skill | Category | Status |
|---|-------|----------|--------|
| 1 | contract-review | Legal | ✅ Done |
| 2 | resume-tailor | HR | ✅ Done |
| 3 | invoice-generator | Finance | ✅ Done |
| 4 | nda-generator | Legal | ✅ Done |
| 5 | email-drafter | Office Core | ✅ Done |
| 6 | meeting-notes | Office Core | ✅ Done |
| 7 | weekly-report | Office Core | ✅ Done |
| 8 | expense-report | Finance | ✅ Done |
| 9 | proposal-writer | Sales | ✅ Done |
| 10 | cover-letter | HR | ✅ Done |

### HR Complete (3 skills)

| # | Skill | Category | Source | Status |
|---|-------|----------|--------|--------|
| 11 | job-description | HR | awesome-n8n | ✅ Done |
| 12 | offer-letter | HR | awesome-n8n | ✅ Done |
| 13 | applicant-screening | HR | n8n-templates | ✅ Done |

### Document AI & Productivity (6 skills)

| # | Skill | Category | Source | Status |
|---|-------|----------|--------|--------|
| 14 | chat-with-pdf | Document AI | n8n-templates | ✅ Done |
| 15 | data-analysis | Spreadsheet | n8n-templates | ✅ Done |
| 16 | email-classifier | Email | n8n-templates | ✅ Done |
| 17 | file-organizer | Productivity | awesome-claude | ✅ Done |
| 18 | brand-guidelines | Marketing | awesome-claude | ✅ Done |
| 19 | changelog-generator | Dev/PM | awesome-claude | ✅ Done |

### Sales/CRM (3 skills)

| # | Skill | Category | Source | Status |
|---|-------|----------|--------|--------|
| 20 | lead-research | Sales | awesome-claude | ✅ Done |
| 21 | lead-qualification | Sales | n8n-templates | ✅ Done |
| 22 | content-writer | Marketing | awesome-claude | ✅ Done |

### PDF Power Tools (6 skills)

| # | Skill | Category | Source | Status |
|---|-------|----------|--------|--------|
| 23 | pdf-converter | PDF | Stirling-PDF | ✅ Done |
| 24 | pdf-ocr | PDF | Stirling-PDF | ✅ Done |
| 25 | pdf-merge-split | PDF | Stirling-PDF | ✅ Done |
| 26 | pdf-form-filler | PDF | Stirling-PDF | ✅ Done |
| 27 | pdf-compress | PDF | Stirling-PDF | ✅ Done |
| 28 | pdf-watermark | PDF | Stirling-PDF | ✅ Done |

### Security/Finance (2 skills)

| # | Skill | Category | Source | Status |
|---|-------|----------|--------|--------|
| 29 | suspicious-email | Security | n8n-templates | ✅ Done |
| 30 | invoice-organizer | Finance | awesome-claude | ✅ Done |

### Official Guides (6 files)
- ✅ docx-guide.md
- ✅ xlsx-guide.md
- ✅ pptx-guide.md
- ✅ pdf-guide.md
- ✅ internal-comms.md
- ✅ doc-coauthoring.md

---

## 🎯 Future Ideas

Skills to consider for future development:

| Skill | Category | Description |
|-------|----------|-------------|
| financial-model | Finance | DCF and valuation templates |
| privacy-policy | Legal | GDPR/CCPA compliant policies |
| terms-of-service | Legal | Fair, legally-sound ToS |
| project-brief | PM | Project scope and requirements |
| presentation-script | Marketing | Compelling presentation narratives |
| onboarding-docs | HR | New employee documentation |
| competitive-analysis | Strategy | Market research templates |
| sop-generator | Operations | Standard operating procedures |

---

## 📁 Folder Structure

Each skill follows this structure:

```
skill-name/
├── SKILL.md          # Main skill file (required)
├── README.md         # Usage documentation (optional)
└── examples/         # Example files (optional)
    └── ...
```

## 🏷️ YAML Frontmatter Template

```yaml
---
name: Skill Name
description: One-line description
author: claude-office-skills
version: "1.0"
tags: [category, use-case, tool]
models: [claude-sonnet-4, claude-opus-4]
tools: [computer, text_editor, file_operations]
---
```

---

## Progress Tracker

- **Completed**: 30/30 skills (100%) 🎉
- **Official Guides**: 6 files
- **Last Updated**: 2026-01-29
