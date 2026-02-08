# Vyonix AI Data Factory - Landing Pages

Two stunning landing page options for Vyonix AI Data Factory, showcasing the Audio Studio, Vision Studio, and NLP Studio platforms.

## 🎨 Design Options

### Option 1: Gradient Glassmorphism
- **Style**: Modern glassmorphism with flowing gradients
- **Background**: Animated radial gradients with grid overlay
- **Cards**: Glass effect with backdrop blur
- **Animations**: Smooth fade-in-up and intersection observer triggers
- **Color Scheme**: Cyan (#00e5ff) and Blue (#0066ff) gradients
- **Best For**: Professional, premium feel with elegant transitions

### Option 2: Neon Futuristic
- **Style**: Bold neon aesthetics with particle effects
- **Background**: Animated mesh gradients with floating particles
- **Cards**: Large feature cards with alternating layouts
- **Animations**: Dynamic parallax effects and slide-in transitions
- **Color Scheme**: Neon Cyan (#00fff5), Purple (#a855f7), and Pink
- **Best For**: Modern, energetic feel with high visual impact

## 🔐 Access Codes

Both landing pages use access code validation:

### User Access Code
- **Code**: `VYONIX2026`
- **Button**: "Try Now"
- **Purpose**: General user access to try the platform

### Hackathon Judges Access Code
- **Code**: `JUDGE2026`
- **Button**: "Hackathon Judges - Access Full App"
- **Purpose**: Special access for hackathon judges

## 🚀 Features

### Common Features (Both Options)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Smooth scroll animations
- ✅ Access code modal with validation
- ✅ Modern loading transition overlay
- ✅ SEO-optimized markup
- ✅ Performance-optimized animations
- ✅ "Developed by Naresh Matta" credit in footer

### Studio Sections
Each landing page includes detailed sections for:

#### 🎵 Audio Studio
- Word-by-word transcription with timeline
- Sentiment analysis
- Speaker diarization & manual annotation
- Synthetic voice generation (TTS)
- Generated audio preview & download

#### 👁️ Vision Studio
- Gemini-powered object detection
- Manual bounding box annotation
- Multi-format export (XML, YMAX, JSON)
- Synthetic image generation pipeline
- Real-time validation

#### 📝 NLP Studio
- Named Entity Recognition (NER)
- Multi-entity tagging
- Manual annotation & QA review
- Synthetic text generation
- PDF & document ingestion
- Training dataset export

## 📁 File Structure

```
landing-page/
├── option1.html          # Gradient Glassmorphism design
├── option2.html          # Neon Futuristic design
├── assets/              # Image assets folder
│   ├── audio-studio.jpg
│   ├── all-studios.jpg
│   └── ...
└── README.md            # This file
```

## 🎯 Usage

### To View the Landing Pages:

1. **Option 1 (Glassmorphism)**:
   ```bash
   # Open in browser
   start d:\Anodatasense\landing-page\option1.html
   ```

2. **Option 2 (Neon Futuristic)**:
   ```bash
   # Open in browser
   start d:\Anodatasense\landing-page\option2.html
   ```

### To Test Access Codes:

1. Click either "Try Now" or "Hackathon Judges - Access Full App"
2. Enter one of the access codes:
   - `VYONIX2026` (user access)
   - `JUDGE2026` (judge access)
3. Click "Access App →"
4. Watch the smooth transition animation
5. You'll be redirected to `/app` (update the URL in the code to your actual app URL)

## ⚙️ Customization

### Updating Access Codes
Look for the `ACCESS_CODES` or `CODES` object in each HTML file:

```javascript
const ACCESS_CODES = {
    judge: 'JUDGE2026',
    user: 'VYONIX2026'
};
```

### Updating App Redirect URL
Find the `launchApp()` function and update:

```javascript
window.location.href = '/app'; // Change to your app URL
```

### Adding Your Images
Place your studio images in the `assets/` folder:
- `audio-studio.jpg` - Audio Studio interface screenshot
- `all-studios.jpg` - Overview or Vision/NLP studio screenshots

The images will automatically load with fallback placeholders if not found.

## 🎨 Color Customization

### Option 1 Colors (in CSS `:root`)
```css
--primary-cyan: #00e5ff;
--primary-blue: #0066ff;
--accent-purple: #8b5cf6;
--accent-pink: #ec4899;
--dark-bg: #0a0e27;
```

### Option 2 Colors (in CSS `:root`)
```css
--neon-cyan: #00fff5;
--neon-blue: #0066ff;
--neon-purple: #a855f7;
--neon-pink: #ec4899;
--dark-navy: #0f1729;
```

## 📱 Responsive Breakpoints

- **Desktop**: 1024px and above
- **Tablet**: 768px - 1023px
- **Mobile**: Below 768px

All layouts automatically adjust for optimal viewing on any device.

## 🎬 Animations

### Option 1
- Fade-in-up hero animation
- Intersection Observer for feature cards
- Smooth modal transitions
- Rotating gradient background
- Grid movement overlay

### Option 2
- Slide-in hero sections
- Floating card animation
- Particle system background
- Mesh gradient animation
- Parallax scroll effects

## 💡 Tips

1. **For best performance**: Host images on a CDN
2. **For production**: Minify HTML, CSS, and JavaScript
3. **For accessibility**: Add alt text to all images
4. **For SEO**: Update meta tags with your specific content

## 👨‍💻 Developer

**Developed by Naresh Matta**

---

## 🔄 Next Steps

1. Choose your preferred design option
2. Update the app redirect URL
3. Add your actual studio interface images
4. Customize access codes as needed
5. Deploy to your hosting platform

Both options are production-ready and fully functional!
