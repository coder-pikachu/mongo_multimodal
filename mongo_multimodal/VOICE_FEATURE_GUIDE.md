# Voice Interaction Feature Guide

## 🎤 Overview

The MongoDB Multimodal app now includes **live voice interaction** powered by **Gemini 2.5 Flash Native Audio**. This allows you to speak naturally to your data and receive spoken responses, with images dynamically displayed as the agent references them.

---

## ✨ Key Features

### 1. **Natural Voice Conversations**
- Real-time speech-to-text transcription
- Natural, human-like voice responses from Gemini
- Low-latency interaction (<600ms first response)
- Interruption support - cut off the agent mid-speech to ask a new question

### 2. **Generative UI with Image Synchronization**
- Images fade in progressively as the agent mentions them
- Active image highlighting with pulse animation
- Click any image to open full-screen preview
- Smooth transitions between referenced images

### 3. **Multimodal Tool Calling**
- Agent can search your project data via voice commands
- Vector search results include base64 images sent to Gemini
- Gemini "sees" the images while generating responses
- More contextual and accurate answers about visual content

### 4. **Seamless Mode Switching**
- Toggle between Text and Voice modes with one click
- Mode preference persisted across sessions
- Keyboard shortcut: Press **V** to toggle voice mode
- All project context preserved when switching

---

## 🚀 Getting Started

### Prerequisites

1. **Gemini API Key**
   - Get your free API key at: https://aistudio.google.com/app/apikey
   - Add to `.env.local`:
     ```bash
     NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
     ```

2. **HTTPS (Production)**
   - Voice features require HTTPS in production (browser security)
   - Local development (localhost) works without HTTPS

3. **Modern Browser**
   - Chrome/Edge: Full support (best experience)
   - Firefox: Good support
   - Safari: Limited Web Audio API support (may have issues)

### Setup Steps

1. **Install Dependencies** (already done)
   ```bash
   npm install @google/genai three @types/three
   ```

2. **Configure Environment**
   Add to your `.env.local`:
   ```bash
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   VOICE_ENABLED=true
   ```

3. **Restart Dev Server**
   ```bash
   npm run dev
   ```

4. **Navigate to a Project**
   - Go to any project page
   - Click the **Voice** button in the header (next to Text)
   - Grant microphone permissions when prompted

---

## 🎯 How to Use

### Basic Voice Interaction

1. **Start Speaking**
   - Click the large circular microphone button
   - Speak your question clearly
   - The orb animates to show the system is listening

2. **Listen to Response**
   - The agent's voice response begins within 1-2 seconds
   - Transcript appears in the bottom panel
   - Images appear in the gallery as mentioned

3. **Interrupt the Agent**
   - Simply start speaking again while the agent is talking
   - Or click the red square button to stop
   - The agent stops immediately and waits for your next input

4. **Reset Session**
   - Click the reset button (circular arrow) to clear the conversation
   - Start fresh with a new topic

### Example Voice Commands

```
"Show me images of MongoDB architecture"
→ Agent searches and displays architecture diagrams

"Tell me about the sharding strategy in this diagram"
→ Agent analyzes the active image and explains

"Find charts showing revenue growth"
→ Agent searches for relevant charts and narrates findings

"Compare these two images"
→ Agent performs comparative analysis
```

### Keyboard Shortcuts

- **V** - Toggle between Text and Voice modes
- **Spacebar** - (Future) Push-to-talk mode
- **Escape** - Exit focus mode
- **Cmd/Ctrl + B** - Toggle side panel

---

## 🎨 User Interface Elements

### Voice Controls Area (Bottom Center)
- **Reset Button** (Left) - Clear conversation and start fresh
- **Microphone Button** (Center) - Start/stop recording
  - Green when ready
  - Red with pulse when recording
  - Animated orb behind indicates activity
- **Status Text** - Shows current state (Listening, Searching, Speaking, etc.)

### Image Gallery (Top 2/3 of Screen)
- **Progressive Reveal** - Images fade in sequentially (300ms stagger)
- **Active Highlighting** - Current image has green border + pulse
- **Hover Preview** - Eye icon appears on hover
- **Click to Expand** - Opens full-screen modal with zoom/navigation

### Transcript Panel (Bottom 1/3 of Screen)
- **Live Captions** - Real-time text as agent speaks
- **Scrollable History** - Review entire conversation
- **Role Labels** - "You" (blue) vs "Agent" (green)

### Animated Orb Background
- **Inactive** - Gray gradient, minimal animation
- **Listening** - Green/blue gradient, pulsing
- **Speaking** - Multi-layer glow with faster pulse

---

## 🔧 Technical Architecture

### Components

1. **VoiceAgentView.tsx**
   - Main container component
   - Manages Gemini Live session
   - Handles audio I/O and WebSocket communication

2. **GenerativeImageGallery.tsx**
   - Dynamic image grid with animations
   - Framer Motion for smooth transitions
   - Active image tracking and highlighting

3. **VoiceControls.tsx**
   - Start/stop/reset buttons
   - Status display and hints
   - Keyboard navigation

4. **AnimatedOrb.tsx**
   - CSS/Framer Motion orb (no Three.js dependency for now)
   - Multiple animation layers for visual feedback

5. **Audio Utilities** (`lib/audio-utils.ts`)
   - PCM audio format conversion (Float32 ↔ Int16)
   - Base64 encoding/decoding
   - Web Audio API buffer management

### Data Flow

```
User Voice Input (16kHz PCM)
    ↓
Gemini Live API (Native Audio)
    ↓
Tool Call: searchProjectData
    ↓
Next.js API Route (/api/projects/[id]/search)
    ↓
Vector Search + Base64 Images
    ↓
Tool Response → Gemini (with images)
    ↓
Gemini Generates Voice Response (24kHz PCM)
    ↓
Generative UI Updates + Audio Playback
```

### Audio Specifications

- **Input:** 16-bit PCM, 16kHz, mono
- **Output:** 16-bit PCM, 24kHz, mono
- **Latency:** <600ms first token, <200ms interrupt
- **Encoding:** Base64 for transport

---

## 🐛 Troubleshooting

### Microphone Not Working

**Issue:** "Microphone access denied" or no audio captured

**Solutions:**
1. Check browser permissions (chrome://settings/content/microphone)
2. Ensure no other app is using the microphone
3. Try restarting the browser
4. On macOS: System Settings → Privacy & Security → Microphone → Allow browser

### No Voice Response

**Issue:** Agent shows "Speaking..." but no audio plays

**Solutions:**
1. Check browser audio settings
2. Ensure volume is not muted
3. Try different browser (Chrome recommended)
4. Check console for AudioContext errors

### Images Not Appearing

**Issue:** Gallery remains empty after voice query

**Solutions:**
1. Ensure project has uploaded images
2. Check if images are processed (embeddings generated)
3. Try more specific search query
4. Check browser console for API errors

### Connection Errors

**Issue:** "Failed to connect" or "Disconnected" status

**Solutions:**
1. Verify `NEXT_PUBLIC_GEMINI_API_KEY` in `.env.local`
2. Check API key is valid at https://aistudio.google.com/
3. Ensure stable internet connection
4. Try resetting the session (reset button)

### Slow Response Time

**Issue:** >3 second delay before agent responds

**Solutions:**
1. Check internet speed (voice requires low latency)
2. Reduce number of maxResults in searches (default: 3)
3. Ensure project data has embeddings pre-generated
4. Try using Ethernet instead of WiFi

---

## 🎓 Best Practices

### For Best Voice Recognition

- **Speak Clearly** - Enunciate words, avoid mumbling
- **Reduce Background Noise** - Use quiet environment or headset
- **Use Natural Phrasing** - Speak as you would to a person
- **One Thought Per Turn** - Complete your question before waiting for response

### For Optimal Image Results

- **Be Specific** - "MongoDB cluster diagrams" vs "architecture"
- **Use Visual Terms** - "charts", "graphs", "diagrams", "screenshots"
- **Iterate Refinement** - Start broad, then narrow down
- **Ask Follow-Ups** - Reference "this image" or "the first diagram"

### For Smooth Conversations

- **Wait for Status** - Check status text before speaking again
- **Interrupt Politely** - The agent handles interruptions gracefully
- **Reset if Stuck** - Use reset button to clear context and start fresh
- **Switch Modes When Needed** - Use Text mode for complex queries requiring copy/paste

---

## 🔮 Future Enhancements

**Planned Features:**

1. **Server-Side Proxy** - Move API key to backend for better security
2. **Full 3D Orb** - Port complete Three.js visualization from audio-orb
3. **Multi-Voice Support** - Choose from 30 HD voices in 24 languages
4. **Image Annotations** - Draw attention boxes as agent references regions
5. **Split-Screen Mode** - Controls on left, images on right
6. **Conversation Export** - Download audio + transcript + images as PDF
7. **Memory Integration** - Agent remembers previous voice discussions
8. **Screen Sharing** - Include viewport in multimodal context

---

## 📊 Performance Metrics

**Target Benchmarks:**

- ✅ Latency: <2s end-to-end (voice → response)
- ✅ Image Display: <500ms after mention
- ✅ Interrupt Response: <200ms
- ✅ Session Duration: 10+ minutes without crashes
- ✅ Audio Quality: Natural, no robotic artifacts
- ✅ Sync Accuracy: Perfect timing with narration

---

## 📚 Additional Resources

- **Gemini Live API Docs**: https://ai.google.dev/gemini-api/docs/live
- **@google/genai SDK**: https://www.npmjs.com/package/@google/genai
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **Framer Motion**: https://www.framer.com/motion/

---

## 🙏 Feedback

Have suggestions or found bugs? Please report issues with:
- Browser and version
- Error messages from console
- Steps to reproduce
- Expected vs actual behavior

---

**Enjoy talking to your data! 🚀**
