# 🌌 Vyonix Studio: The Multimodal AI Data Factory
**Turning "Unstructured Chaos" into "Diamond-Grade Data" with Gemini 3**

---

## 💡 Inspiration
The biggest bottleneck in AI today isn't models—it's **data**. 
I watched teams spend months building "Frankenstein pipelines" just to label a simple video dataset: 
1.  One tool for audio transcription.
2.  Another for object bounding boxes.
3.  A third to scrub PII.
4.  And a messy spreadsheet to stitch it all together.

I realized: **Why are we treating audio, vision, and text as separate problems?**
Gemini 3 sees the world like we do—holistically. I built **Vyonix Studio** to prove that a single multimodal model can replace an entire data engineering department, collapsing months of work into muntes.

---

## 🚀 What it does
Vyonix Studio is a unified **"Glass Box" for AI Data Engineering**. It ingests raw, chaotic media (video/audio/text/images) and uses **Gemini 3's multimodal intelligence** to structure it into training-ready assets with forensic precision.

It is NOT just a passive analyzer. It is a **Human-AI Collaboration System** with four specialized studios:

### 🎙️ **Audio Intelligence Studio**
**AI-Powered Features:**
- ✅ **Precision Transcription**: Sub-word timestamp accuracy (HH:MM:SS.mmm format)
- ✅ **Indian Accent Mastery**: Handles Hinglish and regional phonetics where global models fail
- ✅ **Sentiment Analysis**: Visualizes pitch, mood (Joy/Anger/Sadness), and speaker shifts
- ✅ **Professional TTS**: Generates vocal assets using Gemini 2.5 TTS with emotional range

**Human-in-the-Loop Features:**
- ✅ **Live Segment Editing**: Edit transcriptions with inline text editing
- ✅ **Custom Tagging**: Add/modify speaker labels and timestamps
- ✅ **Smart ZIP Export**: Merges AI output with manual edits (zero data loss)
- ✅ **JSON Export**: Structured output ready for training pipelines
- ✅ **Multi-File Processing**: Batch upload with history tracking

### 👁️ **Vision Pro Studio**
**AI-Powered Features:**
- ✅ **Zero-Shot Object Detection**: Detect ANY concept (e.g., "Robot Owl", "Defective Chip", "Person in Red Jacket")
- ✅ **Normalized Coordinates**: 0-1000 precision mapping for universal compatibility
- ✅ **Confidence Scoring**: Each detection includes AI confidence percentage
- ✅ **Structured Video Transcription**: Timestamped dialogue extraction from video
- ✅ **Synthetic Video Generation**: Veo 3.1 integration for creating training videos from text prompts

**Human-in-the-Loop Features:**
- ✅ **Manual Annotation Tools**: Draw custom bounding boxes with precision
- ✅ **Editable Labels**: Click-to-rename any object label
- ✅ **Dynamic Aspect Ratio**: Auto-adjusts to video dimensions (no drift!)
- ✅ **Timeline Sync**: Jump to any timestamp by clicking annotations
- ✅ **JSON Export**: HH:MM:SS formatted timestamps for easy integration

### 🖼️ **Image Generation Studio**
**AI-Powered Features:**
- ✅ **Photorealistic Synthesis**: Generate training images using Gemini 3 Pro
- ✅ **Flux Model Integration**: Alternative generation pipeline for edge cases
- ✅ **Concept Augmentation**: Create dataset variations ("same car in rain/snow/sunset")
- ✅ **Batch Generation**: Queue multiple image generation tasks

### 📝 **NLP & PII Engine**
**AI-Powered Features:**
- ✅ **Named Entity Recognition**: 10+ entity types (PERSON, ORG, LOC, GPE, DATE, SSN, PHONE, EMAIL, etc.)
- ✅ **PII Detection**: Instant identification for compliance auditing
- ✅ **Sentiment Analysis**: Document-level mood classification
- ✅ **Text Summarization**: Condensed insights from long documents
- ✅ **Topic/Keyword Extraction**: Automatic tagging and categorization

**Human-in-the-Loop Features:**
- ✅ **Interactive Tagging**: Click-to-tag custom entities
- ✅ **Index Self-Correction**: Forensic-level accuracy alignment
- ✅ **Custom Entity Types**: Define your own classification schema
- ✅ **Bulk Export**: JSON/CSV output for downstream processing

### 💰 **Financial Console**
- ✅ **Real-Time Token Tracking**: See costs per request in milliseconds
- ✅ **Batch API Integration**: 50% cost reduction on heavy workloads
- ✅ **Economic Transparency**: Unit economics at your fingertips
- ✅ **Cost Projections**: Estimate enterprise-scale processing costs

---

## ⚙️ How we built it
Vyonix is a **Next.js** application deployed on **Google Cloud Run**, powered by the **Gemini 3.0 ecosystem**.

-   **The Brain**: We use **Gemini 3 Flash** via the Google AI SDK for its blazing speed and accurate timestamp generation.
-   **The Canvas**: A custom-built **React Video/Audio Player** that syncs with AI metadata. We had to build a custom "Coordinate Mapper" to translate Gemini's 1000x1000 coordinate space into responsive CSS (`top: 23.4%, left: 11.2%`).
-   **The Workflow**:
    1.  User drags & drops a file.
    2.  Check for "Human-in-the-Loop" needs (e.g., editing a bounding box label).
    3.  **Batch API**: Heavy jobs are sent to the Batch API to cut costs by 50%.
    4.  **Export**: Data is packaged into a standard JSON/ZIP format ready for PyTorch/TensorFlow.

---

## 🏔️ Challenges we ran into
1.  **The "Drifting Box" Problem**: 
    Gemini provides coordinates normalized to `1000`. Displaying these on a responsive video player that scales with the window was a nightmare. We built a dynamic `Subject-Aware Aspect Ratio` wrapper that ensures the bounding box stays glued to the object, even if you resize the browser.

2.  **Audio " hallucinations"**:
    Early prompts gave us narrative summaries ("A man walked in"). We needed *data* ("TIMESTAMP: 00:04, SPEAKER: Man, TEXT: Hello"). We refined our system prompt to enforce a strict **JSON-only output schema**, forcing the model to act as a structured database rather than a creative writer.

---

## 🏆 Accomplishments that we're proud of
-   **Deployment**: The app is live on Google Cloud Run, scaling to zero when not in use.
-   **Economic Viability**: By integrating the **Gemini Batch API**, we proved we can process 2,000+ hours of video for the cost of a few coffees, making enterprise-grade labelling accessible to startups.
-   **The "Vibe"**: We achieved a premium "Glassmorphism" UI that feels like a sci-fi tool, not a boring internal dashboard.

---

## 📚 What we learned
-   **"Vibe Coding" is real**: We used English (prompts) as our primary compilation target. 80% of our backend logic is just... asking Gemini nicely and precisely.
-   **Context is King**: Giving Gemini the *previous* 5 seconds of context improved transcription accuracy by 40%.

---

## 🚀 What's next for Vyonix Studio
-   **Video Intelligence 2.0**: Tracking objects *across* frames (action recognition).
-   **Marketplace**: A "HuggingFace for Data" where users can sell their cleaner (Vyonix-audited) datasets.
-   **Enterprise SSO**: Integrating with corporate identity providers for secure auditing.

---
**Built with ❤️ using Gemini 3 & Google Cloud Run**
[Try the Live App](https://vyonix-studio-service-vob67naxna-uc.a.run.app) | [View Code](https://github.com/inareshmatta/vyonix-studio)
