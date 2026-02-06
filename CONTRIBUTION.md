# My Contribution to Vyonix AI Data Factory

I am the **sole architect and developer** of Vyonix AI Data Factory, a production-grade data annotation platform that solves the fundamental bottleneck in AI development: creating high-quality labeled datasets.

## What I Built

### Full-Stack Serverless Application
- Designed and implemented a **Next.js 16** application with **App Router** architecture
- Built **10+ serverless API routes** handling multimodal AI processing (Audio, Vision, Text)
- Deployed to **Google Cloud Run** with custom Docker containerization
- Integrated **4 different Gemini models** (`gemini-3-flash-preview`, `gemini-3-pro-image-preview`, `gemini-2.5-flash-preview-tts`, and generic models)

### Core Technical Innovations

#### 1. Audio Intelligence Pipeline
- Engineered a robust file upload system using **Gemini File Manager API** with async state polling
- Solved the "raw PCM audio stream" problem by implementing **WAV header injection** from scratch (44-byte RIFF header construction)
- Built multi-version prompt engineering system (v1-v4) with A/B testing capability
- Implemented precise timestamp parsing (`HH:MM:SS.mmm` → milliseconds) for waveform synchronization

#### 2. Vision Zero-Shot Detection
- Created a coordinate normalization system (0-1000 scale) to handle device-independent bounding boxes
- Integrated **Gemini Vision** for auto-annotation without pre-trained models
- Built synthetic image generation workflows for rare edge-case data augmentation

#### 3. NLP Entity Extraction
- Designed **LLM index self-correction algorithms** to handle response drift (±20 char fuzzy matching)
- Implemented Privacy-First PII detection and redaction system
- Created structured JSON parsing with markdown wrapper handling

#### 4. Production Architecture
- Solved **Cloud Run read-only filesystem** constraints by redesigning storage to use `/tmp`
- Implemented **60-minute extended timeouts** for heavy media processing
- Built error scrubbing middleware to hide underlying model identities (enterprise white-labeling)
- Created real-time token usage tracking for cost optimization

### UI/UX Development
- Designed a premium dark-mode interface with **Tailwind CSS 4**
- Integrated **Wavesurfer.js** for interactive waveform manipulation
- Built sliding panels, drag-and-drop uploads, and real-time sentiment overlays

## Technical Challenges Overcome

### 1. Stream Processing
**Problem:** Gemini TTS returns raw PCM data without headers—browsers can't play it.

**Solution:** I reverse-engineered the WAV format spec to inject valid headers on-the-fly.

```typescript
// 44-byte RIFF header construction
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + audioBuffer.length, 4);
header.write("WAVE", 8);
// ... complete WAV specification implementation
```

### 2. Serverless Storage
**Problem:** Next.js/Cloud Run's immutable filesystem prevents traditional file serving.

**Solution:** Moved to in-memory base64 encoding for TTS output, eliminating filesystem dependencies.

### 3. LLM Reliability
**Problem:** Entity extraction indices often drifted ±5-20 characters from actual text positions.

**Solution:** Built a fuzzy search algorithm to self-correct the model's output:

```typescript
const searchStart = Math.max(0, entity.start - 20);
const searchEnd = Math.min(text.length, entity.end + 20);
const segment = text.slice(searchStart, searchEnd);
const localIdx = segment.indexOf(entity.mention);
```

## Impact

Vyonix reduces data labeling costs by **>90%** compared to human annotation farms, enabling small teams to train high-quality AI models without venture capital.

**GitHub:** https://github.com/inareshmatta/vyonix-ai-data-factory  
**Live Demo:** https://vyonix-studio-90127835710.us-central1.run.app

---

**Built for:** Google Gemini Developer Competition  
**Author:** @inareshmatta
