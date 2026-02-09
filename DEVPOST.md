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
- ✅ **Indian Accent Mastery**: Handles Hinglish and regional phonetic nuances.
- ✅ **Sentiment Analysis**: Visualizes pitch, mood (Joy/Anger/Sadness), and speaker shifts.
- ✅ **Professional TTS**: Generates vocal assets using Gemini 2.5 TTS.
- 💎 **Recursive Intelligence Loop**: We don't just generate audio; we use Gemini 3 to "loop-back" and audit the synthetic output of Gemini 2.5. This ensures every millisecond of synthetic voice is perfectly timestamped and labeled for training.

**Human-in-the-Loop Features:**
- ✅ **Live Segment Editing**: Edit transcriptions with inline inline UI.
- ✅ **Custom Tagging**: Add speaker labels and forensic timestamps.
- ✅ **Smart ZIP Export**: Merges AI output with manual edits (zero data loss).

### 👁️ **Vision Pro Studio**
**AI-Powered Features:**
- ✅ **Zero-Shot Object Detection**: Detect ANY concept (e.g., "Defective Chip", "Person in Red Jacket").
- ✅ **Normalized Coordinates**: 0-1000 precision mapping for universal compatibility.
- ✅ **Confidence Scoring**: Forensic audit of every bounding box.
- ✅ **Synthetic Video Generation**: Veo 3.1 integration for creating training videos. The generated video is uploaded back for Gemini 3 Flash to recognize objects and transcribe, creating a self-labeling cycle.

**Human-in-the-Loop Features:**
- ✅ **Manual Annotation Tools**: Draw custom bounding boxes with precision.
- ✅ **Dynamic Aspect Ratio**: Custom wrapper ensures bounding boxes stay glued to objects even if the browser is resized.

### 🖼️ **Image Generation Studio**
**AI-Powered Features:**
- ✅ **Photorealistic Synthesis**: Generate training images using Gemini 3 Pro.
- ✅ **Concept Augmentation**: Create dataset variations ("same car in rain/snow/sunset") to reduce model bias.

### 📝 **NLP & PII Engine**
**AI-Powered Features:**
- ✅ **Named Entity Recognition**: 10+ entity types (PERSON, ORG, LOC, GPE, DATE, etc.).
- ✅ **PII Detection**: Instant identification for compliance and data privacy auditing.
- 💎 **Diamond Schema Enforcement**: Every output is governed by a strict JSON schema, turning raw reasoning into "Diamond-Grade" structured indices ready for PyTorch/TensorFlow.

### 💰 **Financial Console**
- ✅ **Real-Time Token Tracking**: See costs per request in milliseconds.
- ✅ **Batch API Integration**: 50% cost reduction on heavy datasets.

---

## ⚙️ How I built it
Vyonix is a **Distributed Multimodal Intelligence Pipeline** built with **Next.js** and deployed on **Google Cloud Run**.

-   **The Forensics**: We used **Gemini 3 Flash** via the Google AI SDK as our primary "Data Auditor."
-   **The Coordinate Mapper**: We built a custom mathematical engine to translate Gemini's 1000x1000 coordinate space into responsive CSS for the UI.
-   **Unit Economics Layer**: Every API call goes through a custom middleware that calculates real-time token costs and switches to the **Gemini Batch API** for large workloads to ensure 50% cost savings.

---

## 🏔️ Challenges I ran into
1.  **The "Drifting Box" Problem**: Displaying coordinates on a responsive video player was complex. I built a `Subject-Aware Aspect Ratio` wrapper to ensure perfect alignment.
2.  **Schema Drift**: Early models gave narrative summaries. I implemented strict **JSON-only enforcement**, forcing the model to act as a structured database rather than a writer.

---

## 🏆 Accomplishments that I am proud of
-   **Recursive Intelligence**: Proving that Gemini 3 can audit the generations of other models (Veo/TTS) to create a perfect data labeling loop.
-   **Economic Accessibility**: Proved enterprise-grade data engineering can cost the price of a few coffees using the Batch API.

---

## 📚 What I learnt
-   **"Vibe Coding" is Engineering**: Programming in natural language (prompts) requires more precision than traditional code.
-   **Context Windows are Assets**: Gemini's massive context allowed us to feed entire audio files for global consistency.

---

## 🚀 What's next for Vyonix Studio
-   **Marketplace**: A "HuggingFace for Data" where users can sell audited datasets.
-   **Action Recognition**: Moving from tracking objects to tracking behaviors across time.

---
**Built with ❤️ using Gemini 3 & Google Cloud Run**
[Try the Live App](https://vyonix-studio-service-vob67naxna-uc.a.run.app) | [Near-Production Code Reference](https://github.com/inareshmatta/vyonix-ai-data-factory)
