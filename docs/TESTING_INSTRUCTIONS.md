# 🧪 Vyonix AI Data Factory - Testing Instructions

**Live Demo:** [https://vyonix-studio-90127835710.us-central1.run.app](https://vyonix-studio-90127835710.us-central1.run.app)

Vyonix is a **Next-Gen Data Annotation Platform** powered by **Gemini 3**. It solves the biggest bottleneck in AI development: creating high-quality labeled datasets. Instead of manual labor, we use Gemini's multimodal intelligence to auto-label Audio, Vision, and Text data at 100x speed.

---

## 🚀 Key Annotation Workflows to Test

### 1. 🎙️ Audio Annotation (Gemini 3 Flash)
*   **The Problem**: Manually typing transcripts and timestamps takes hours.
*   **Our Solution**: 
    1.  **Upload** any audio file.
    2.  Click **"Sequential Process"**.
    3.  **Witness**: Gemini instantly produces time-stamped, speaker-aware segments.
    4.  **Refine**: Click the **"Sentiment"** button to layer "Emotional Metadata" on top of the raw text—a feature impossible for human transcribers to do consistently in real-time.
    5.  **Gen-AI Bonus**: Use the **"TTS"** feature to synthesize missing voice data for training sets.

### 2. 👁️ Vision Annotation (Gemini 3 Vision)
*   **The Problem**: Drawing thousands of bounding boxes is slow and error-prone.
*   **Our Solution**:
    1.  **Upload** a complex image.
    2.  Click the **"Auto-Annotate"** button (Green).
    3.  **Witness**: Gemini 3 Vision performs "Zero-Shot Detection," instantly drawing precise bounding boxes around objects without needing a pre-trained model.
    4.  **Edit**: Use the **"Box"** tool to manually adjust if needed.
    5.  **Export**: Click **"JSON"** or **"ZIP"** to download a training-ready dataset immediately.
    6.  **Synthesize**: Use the **"Generate Image"** tool to create *new* training images for rare edge cases that are hard to capture in real life.

### 3. 📝 Semantic Text Labelling (Gemini Pro)
*   **The Problem**: Identifying PII (Sensitive info) and entities in massive documents is a compliance nightmare.
*   **Our Solution**:
    1.  **Upload** a PDF, Text, or CSV file.
    2.  **Witness**: The "Intelligence Pipeline" automatically tags Entities (People, Orgs, Locations) and detects PII.
    3.  **Toggle Privacy**: Click **"AUDIT MODE ACTIVE"** to instantly verify redaction accuracy.
    4.  **Synthesize**: Use the **"Generate Data"** tool to ask Gemini to write *fake* realistic data (e.g., "Create 50 medical records") to train your models without risking real user privacy.

### 4. 💰 The Business Case (Financial Console)
*   **Check the Cost**: Click the **"Cost"** tab.
*   **Real-Time ROI**: We track every token. See exactly how much cheaper Vyonix is compared to manual human labeling farms (often >90% savings).
