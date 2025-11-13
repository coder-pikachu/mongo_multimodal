# 🎤 Voice Feature Setup Checklist

## ✅ Pre-Deployment Validation

### 1. Environment Configuration

**Required:**
```bash
# Add to .env.local
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

**How to get Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key and add to `.env.local`

**Verify:**
```bash
grep NEXT_PUBLIC_GEMINI_API_KEY .env.local
```

---

### 2. Dependencies Installed ✅

**Status:** All dependencies installed

```
@google/genai@1.29.0 ✅
three@0.181.1 ✅
@types/three@0.181.0 ✅
framer-motion (already installed) ✅
```

---

### 3. Files Created ✅

**Core Components:**
- ✅ `/app/lib/audio-utils.ts`
- ✅ `/app/projects/[projectId]/components/VoiceAgentView.tsx`
- ✅ `/app/projects/[projectId]/components/Voice/GenerativeImageGallery.tsx`
- ✅ `/app/projects/[projectId]/components/Voice/VoiceControls.tsx`
- ✅ `/app/projects/[projectId]/components/Voice/AnimatedOrb.tsx`

**Modified Files:**
- ✅ `/app/projects/[projectId]/components/AgentCentricLayout.tsx`
- ✅ `/app/api/projects/[projectId]/search/route.ts`
- ✅ `.env.example`

**Documentation:**
- ✅ `/VOICE_FEATURE_GUIDE.md`
- ✅ `/VOICE_SETUP_CHECKLIST.md` (this file)

---

### 4. Server Status ✅

**Dev Server:** Running on http://localhost:3002
**Status:** No compilation errors
**Turbopack:** Active

---

### 5. Feature Toggle Integration ✅

**UI Elements:**
- ✅ Text/Voice mode toggle in project header
- ✅ Keyboard shortcut (V key) implemented
- ✅ Mode persistence via localStorage
- ✅ Seamless switching between modes

---

## 🔧 Configuration Validation

### Step 1: Add Gemini API Key

```bash
# Edit .env.local and add:
NEXT_PUBLIC_GEMINI_API_KEY=AIza...your_key_here
```

### Step 2: Restart Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Test Voice Feature

1. Navigate to http://localhost:3002
2. Go to any project (or create a new one)
3. Click **Voice** button in the header
4. You should see the voice interface with animated orb

### Step 4: Grant Microphone Permission

When you click the microphone button:
1. Browser will request microphone access
2. Click "Allow"
3. Status should change to "🎤 Listening..."

### Step 5: Test Voice Query

**Test Query:** "Show me images in this project"

**Expected Behavior:**
1. ✅ Status: "Listening..." → "Searching images..." → "Speaking..."
2. ✅ Images appear in gallery with fade-in animation
3. ✅ Voice response plays
4. ✅ Transcript appears in bottom panel
5. ✅ Active image is highlighted with green border

---

## 🐛 Known Issues & Solutions

### Issue 1: "NEXT_PUBLIC_GEMINI_API_KEY not found"

**Solution:**
- Ensure you added the key to `.env.local` (NOT `.env`)
- Restart the dev server after adding the key
- Key must be prefixed with `NEXT_PUBLIC_` for client-side access

### Issue 2: Microphone Permission Denied

**Solution:**
- Check browser settings: chrome://settings/content/microphone
- On macOS: System Settings → Privacy & Security → Microphone
- Ensure no other app is blocking microphone access

### Issue 3: No Voice Response

**Solution:**
- Check browser console for errors
- Verify API key is valid
- Try different browser (Chrome/Edge recommended)
- Ensure speakers/headphones are connected

### Issue 4: Images Not Loading

**Solution:**
- Ensure project has uploaded images
- Check images are processed (have embeddings)
- Verify MongoDB connection is working
- Check API route: `/api/projects/[projectId]/search`

---

## 🚀 Testing Scenarios

### Scenario 1: Basic Voice Query
```
User: "Show me MongoDB architecture diagrams"
Expected:
- Search executes
- Architecture images appear
- Agent describes images
```

### Scenario 2: Follow-Up Questions
```
User: "Tell me about the first image"
Expected:
- First image highlights
- Agent analyzes that specific image
```

### Scenario 3: Interruption
```
User starts speaking while agent is talking
Expected:
- Audio stops immediately
- New query processes
```

### Scenario 4: Mode Switching
```
User switches from Voice to Text
Expected:
- Voice interface disappears
- Text chat appears
- No data loss
```

---

## 📊 Performance Benchmarks

**Target Metrics:**
- ⏱️ Latency: <2s end-to-end
- 🖼️ Image display: <500ms after mention
- ⏹️ Interrupt: <200ms
- 🎤 Audio quality: Natural voice (24kHz)
- 🔄 Session stability: 10+ min conversations

**How to Test:**
1. Record timestamp when you stop speaking
2. Record timestamp when audio response starts
3. Calculate difference = latency
4. Should be <2 seconds consistently

---

## 🔐 Security Checklist

### Development (Current)
- ✅ API key in environment variables
- ⚠️ Client-side API key (acceptable for dev)
- ✅ HTTPS not required for localhost

### Production (Before Deploy)
- ⚠️ Move API key to server-side proxy
- ⚠️ Implement rate limiting
- ⚠️ Add user authentication
- ⚠️ Enable HTTPS (required for microphone)
- ⚠️ Add usage monitoring

---

## 📝 Quick Start Commands

```bash
# 1. Add API key to .env.local
echo "NEXT_PUBLIC_GEMINI_API_KEY=your_key" >> .env.local

# 2. Restart server
npm run dev

# 3. Open browser
open http://localhost:3002

# 4. Navigate to a project and click Voice button
```

---

## 🎯 Success Criteria

**Feature is ready when:**
- ✅ Voice button appears in project header
- ✅ Clicking microphone captures audio
- ✅ Gemini responds with voice
- ✅ Images appear synchronized with speech
- ✅ Transcript updates in real-time
- ✅ Can interrupt and restart conversation
- ✅ Can switch back to text mode seamlessly

---

## 🔮 Next Steps (Optional Enhancements)

**Priority 1: Security (Production)**
- [ ] Server-side API proxy
- [ ] Rate limiting (per user/IP)
- [ ] Usage analytics

**Priority 2: User Experience**
- [ ] Push-to-talk mode (spacebar)
- [ ] Voice activity detection (auto-stop)
- [ ] Multi-language support

**Priority 3: Visual Enhancements**
- [ ] Full Three.js 3D orb
- [ ] Image annotations
- [ ] Split-screen layout

**Priority 4: Advanced Features**
- [ ] Conversation export (PDF)
- [ ] Memory integration
- [ ] Multi-voice selection
- [ ] Screen sharing support

---

## ✅ Final Validation

**Run this checklist before testing:**

1. [ ] `.env.local` has `NEXT_PUBLIC_GEMINI_API_KEY`
2. [ ] Dev server is running (http://localhost:3002)
3. [ ] No TypeScript compilation errors
4. [ ] Browser has microphone permission
5. [ ] Project has uploaded images (for testing)
6. [ ] Chrome/Edge browser (best support)

**If all checked, you're ready to test! 🎉**

---

## 📞 Support

**Common Questions:**

**Q: Do I need a paid Gemini API plan?**
A: No, free tier includes Live API access with rate limits.

**Q: Does this work on mobile?**
A: Yes, but requires HTTPS in production. UI is responsive.

**Q: Can I use a different voice?**
A: Yes, modify `voiceName` in VoiceAgentView.tsx (30 voices available).

**Q: How much does this cost?**
A: Gemini Live API pricing: ~$0.002 per minute of audio.

---

**Last Updated:** 2025-11-12
**Version:** 1.0.0
**Status:** Ready for Testing 🚀
