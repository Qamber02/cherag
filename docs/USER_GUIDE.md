# Cherág - User Guide

## Welcome to Cherág - Your AI Study Partner

Cherág is an intelligent study companion that transforms your course materials into interactive learning tools.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Core Features](#3-core-features)
4. [Tips & Best Practices](#4-tips--best-practices)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Getting Started

### 1.1 Creating an Account

1. Navigate to the login page
2. Click **"Sign Up"**
3. Enter your email and password
4. Check your email for verification (if required)
5. Log in to access the dashboard

### 1.2 Uploading Your First Document

1. Click the **"Upload"** button in the sidebar
2. Select a file from your computer
3. Supported formats: **PDF**, **DOCX**, **TXT**, **MD**
4. Wait for the parsing to complete
5. Your document appears in the sidebar

---

## 2. Dashboard Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌────────────────────────────────────────────┐  │
│  │          │  │                                            │  │
│  │ SIDEBAR  │  │              CONTENT AREA                  │  │
│  │          │  │                                            │  │
│  │ • Files  │  │  Your selected tab content appears here   │  │
│  │ • Tabs   │  │                                            │  │
│  │          │  │                                            │  │
│  └──────────┘  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Tabs

| Tab | Icon | Description |
|-----|------|-------------|
| **Home** | 🏠 | Dashboard overview and stats |
| **Summary** | 📝 | AI-generated document summaries |
| **Flashcards** | 🎴 | Interactive flashcard review |
| **Quizzes** | ❓ | Multiple-choice assessments |
| **Diagrams** | 📊 | Visual flowcharts |
| **Mind Map** | 🧠 | Hierarchical concept maps |
| **Chat** | 💬 | AI Q&A assistant |
| **Study Shorts** | 🎬 | YouTube video recommendations |
| **History** | 📚 | Past activity log |
| **Settings** | ⚙️ | Account preferences |

---

## 3. Core Features

### 3.1 AI Summaries

**What it does**: Creates a concise summary of your document with key terms highlighted.

**How to use**:
1. Select a document from the sidebar
2. Go to the **Summary** tab
3. Click **"Generate Summary"**
4. Customize options (length, style, focus) if needed
5. Read the highlighted key points

**Output includes**:
- Bulleted key concepts
- **Bold** key terms
- Structured sections

---

### 3.2 Flashcards

**What it does**: Generates question-answer pairs for memorization practice.

**How to use**:
1. Select a document
2. Go to the **Flashcards** tab
3. Click **"Generate Flashcards"**
4. Click any card to flip and reveal the answer
5. Use **"Regenerate"** for new cards

**Features**:
- Animated flip cards
- Clear all cards option
- 5 cards generated per batch

---

### 3.3 Quizzes

**What it does**: Creates multiple-choice questions with explanations.

**How to use**:
1. Select a document
2. Go to the **Quizzes** tab
3. Click **"Generate Quiz"**
4. Select an answer for each question
5. View explanations after answering

**Features**:
- 4 options per question (A, B, C, D)
- Immediate feedback
- Detailed explanations
- Score tracking

---

### 3.4 Diagrams

**What it does**: Generates visual flowcharts from your content.

**How to use**:
1. Select a document
2. Go to the **Diagrams** tab
3. Click **"Generate Diagram"**
4. View the rendered flowchart
5. Export as image (if available)

**Diagram types**:
- Flowcharts (process visualization)
- Decision trees
- Sequence diagrams

---

### 3.5 Mind Maps

**What it does**: Creates hierarchical concept maps for visual learners.

**How to use**:
1. Select a document
2. Go to the **Mind Map** tab
3. Click **"Generate Mind Map"**
4. Click nodes to expand/collapse
5. View explanations in the side panel

**Features**:
- Interactive node expansion
- Color-coded topics
- Up to 3 levels deep

---

### 3.6 AI Chat

**What it does**: Answers questions about your documents in real-time.

**How to use**:
1. Select relevant document(s)
2. Go to the **Chat** tab
3. Type your question in the input box
4. Press Enter or click Send
5. Receive context-aware answers

**Example questions**:
- "What are the main concepts in this chapter?"
- "Explain [topic] in simple terms"
- "Compare X and Y from the document"

---

### 3.7 Study Shorts

**What it does**: Finds relevant educational YouTube videos on your topics.

**How to use**:
1. Select a document
2. Go to the **Study Shorts** tab
3. View recommended videos
4. Click to play embedded videos
5. Scroll for more recommendations

**Features**:
- Relevance scoring
- Educational content filtering
- Embedded player
- Infinite scroll

---

### 3.8 Settings

**Available settings**:
- **Dark Mode**: Toggle between light and dark themes
- **Account**: View email and manage account
- **Clear Data**: Reset generated content

---

## 4. Tips & Best Practices

### 4.1 Getting Better Results

| Tip | Why It Helps |
|-----|--------------|
| Upload text-heavy PDFs | More content = better AI output |
| Use one document at a time | Focused context improves accuracy |
| Be specific in chat | Clear questions get precise answers |
| Regenerate if needed | Each generation is unique |

### 4.2 Document Recommendations

**Best for AI processing**:
- ✅ Lecture notes (PDF/TXT)
- ✅ Textbook chapters (PDF)
- ✅ Study guides (DOCX)
- ✅ Research papers (PDF)

**Less effective**:
- ❌ Image-only PDFs (no text to extract)
- ❌ Handwritten notes (unless OCR'd)
- ❌ Tables without context

### 4.3 Rate Limits

To prevent API overuse, there are limits per feature:

| Feature | Limit | Refresh |
|---------|-------|---------|
| Summaries | 10/minute | Automatic |
| Flashcards | 8/minute | Automatic |
| Quizzes | 8/minute | Automatic |
| Diagrams | 5/minute | Automatic |
| Chat | 15/minute | Automatic |

*Wait a few moments if you hit a limit*

---

## 5. Troubleshooting

### 5.1 Common Issues

**"No documents found"**
- Upload at least one document
- Wait for parsing to complete

**"AI generation failed"**
- Check your internet connection
- Try again in a few seconds (rate limit)
- Content might be too short

**"File upload failed"**
- Verify file is under size limit
- Ensure format is supported (PDF, DOCX, TXT, MD)
- Try a different browser

**Flashcards not flipping**
- Click directly on the card
- Wait for animation to complete

**Videos not loading**
- YouTube API may be temporarily unavailable
- Try refreshing the page

### 5.2 Getting Help

If issues persist:
1. Refresh the page
2. Log out and log back in
3. Clear browser cache
4. Try a different browser/device

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Send chat message |
| `Escape` | Close modals |
| `Space` | Flip flashcard (when focused) |

---

*Thank you for using Cherág! Happy studying!* 📚✨
