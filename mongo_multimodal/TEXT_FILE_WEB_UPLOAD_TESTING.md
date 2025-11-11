# Text File & Web Upload Implementation - Testing Guide

## Overview

This document provides comprehensive testing instructions for the new text file and web link upload features with chunking and memory integration.

## Architecture Summary

### New Files Created
1. **`app/lib/text-chunker.ts`** - Semantic text chunking with CSV/JSON support
2. **`app/lib/web-scraper.ts`** - Web scraping and HTML cleaning
3. **`app/lib/services/chunking.service.ts`** - Service layer for file processing and memory extraction
4. **`app/api/projects/[projectId]/upload-text/route.ts`** - Text file upload endpoint
5. **`app/api/projects/[projectId]/upload-web/route.ts`** - Web link upload endpoint
6. **`app/api/projects/[projectId]/data/process-chunks/route.ts`** - Batch chunk processing endpoint

### Files Modified
1. **`app/types/models.ts`** - Added `text_chunk` and `web_chunk` types with `chunkInfo` metadata
2. **`app/lib/services/memory.service.ts`** - Enhanced with memory enrichment logic
3. **`app/projects/[projectId]/components/SidePanel/UploadPanel.tsx`** - UI for text/web uploads
4. **`app/api/agent/route.ts`** - Updated system prompts to mention new content types

## Testing Procedures

### Test 1: Text File Upload (Plain Text)

**Objective:** Verify chunking and upload of plain text files

**Steps:**
1. Create a simple test file: `test.txt` with 3000+ tokens of content (e.g., Lorem ipsum paragraphs)
2. In the application, navigate to a project
3. Go to Upload Panel → Files tab
4. Drag and drop or select `test.txt`
5. Verify:
   - ✅ File uploads successfully
   - ✅ Progress shows "Uploading..."
   - ✅ Success message shows: "Successfully uploaded X chunks and created Y memories"
   - ✅ Chunk count should be > 1 (since content exceeds 2000 tokens)

**Expected Output:**
- Success status with chunk count (e.g., 2-3 chunks)
- Memory creation count (typically 2-6 memories extracted)

**Verify in Database:**
```bash
# Check projectData collection for text_chunk entries
db.projectData.find({ type: "text_chunk", metadata.chunkInfo.parentId: ObjectId("...") }).pretty()
```

---

### Test 2: CSV File Upload

**Objective:** Verify CSV parsing and row-based chunking

**Steps:**
1. Create a test CSV file with 150+ rows:
   ```csv
   ID,Name,Value,Category
   1,Item1,100,A
   2,Item2,200,B
   ...
   150,Item150,15000,Z
   ```
2. Upload the file
3. Verify:
   - ✅ File uploads successfully
   - ✅ Chunk count shown in UI (should be ~2 chunks since 50-100 rows per chunk)
   - ✅ Each chunk includes the header row for context

**Expected Output:**
- 2-3 chunks depending on row size
- CSV metadata (rowStart, rowEnd, columns) stored in chunkInfo

**Verify in Database:**
```bash
db.projectData.findOne({ type: "text_chunk", "metadata.chunkInfo.csvMetadata": { $exists: true } })
# Should show rowStart, rowEnd, and columns array
```

---

### Test 3: JSON File Upload

**Objective:** Verify JSON flattening and chunking

**Steps:**
1. Create a test JSON file:
   ```json
   {
     "project": {
       "name": "Test Project",
       "description": "Test description with long content...",
       "items": [
         { "id": 1, "title": "Item 1", "description": "..." },
         { "id": 2, "title": "Item 2", "description": "..." }
       ]
     }
   }
   ```
2. Upload the file
3. Verify:
   - ✅ File uploads successfully
   - ✅ Shows chunk count
   - ✅ Content is readable (flattened JSON format like "project.name: Test Project")

**Expected Output:**
- 1-2 chunks (depending on JSON size)
- Flattened text representation in chunks

---

### Test 4: Web Link Upload

**Objective:** Verify web scraping and content extraction

**Steps:**
1. Go to Upload Panel → Web Links tab
2. Enter a URL: `https://example.com`
3. Click "Scrape"
4. Verify:
   - ✅ "Scraping..." indicator appears
   - ✅ Success message shows chunk count and memories created
   - ✅ Displays URL and chunk count

**Expected Output:**
- Successful scrape with 2-5 chunks depending on page length
- Memory extraction count
- No errors

**Test with Different URLs:**
- Wikipedia article (structured content)
- Blog post (narrative content)
- Documentation page (technical content)

**Verify in Database:**
```bash
db.projectData.findOne({ type: "web_chunk", "metadata.chunkInfo.sourceUrl": "..." })
# Should show sourceUrl and web_chunk type
```

---

### Test 5: Chunk Visualization in DataList

**Objective:** Verify chunks display correctly in the data explorer

**Steps:**
1. After uploading a multi-chunk file
2. Navigate to Data Explorer or Browse tab
3. Verify:
   - ✅ Chunks show type badge: "Text Chunk" or "Web Chunk"
   - ✅ Chunk indicator shows: "Chunk X/Y"
   - ✅ Web chunks show source URL
   - ✅ "No Embedding" status appears for new chunks

---

### Test 6: Chunk Embedding Generation

**Objective:** Verify embeddings are generated for chunks

**Steps:**
1. After uploading chunks, verify "No Embedding" status in DataList
2. Click "Process" button on a chunk
3. Verify:
   - ✅ Status changes to "Processing..."
   - ✅ After completion, status changes to "Embedded" (green badge)

**Alternative - Batch Processing:**
1. Select multiple unprocessed chunks
2. Click "Batch Process Selected"
3. Monitor progress

**Verify in Database:**
```bash
db.projectData.findOne({ type: "text_chunk", embedding: { $exists: true, $ne: null } })
# embedding field should contain 1024-dimensional vector
```

---

### Test 7: Vector Search on Chunks

**Objective:** Verify chunks are searchable via vector search

**Steps:**
1. After chunks are embedded, go to Search tab
2. Enter a query related to chunk content
3. Verify:
   - ✅ Chunks appear in search results
   - ✅ Similarity scores are shown
   - ✅ Results include chunks, images, and documents mixed together

**Example Queries:**
- Upload a CSV with financial data, search for "revenue"
- Upload a web article about AI, search for "machine learning"
- Upload a text file about climate, search for "temperature"

---

### Test 8: Agent Interaction with Chunks

**Objective:** Verify agent can search and analyze chunks

**Steps:**
1. Ensure chunks are embedded
2. Go to Agent view
3. Ask a question related to chunk content
4. Verify:
   - ✅ Agent creates a plan (shows searchProjectData in tools)
   - ✅ Agent searches for relevant chunks
   - ✅ Agent returns information from chunks with proper citations

**Test Queries:**
- "What does the CSV file say about [specific column]?"
- "Summarize the key points from the web article"
- "What information do we have about [topic]?"

---

### Test 9: Memory Extraction

**Objective:** Verify memories are automatically extracted and stored

**Steps:**
1. Upload a text file, CSV, or web content
2. After upload completes, verify memory count in UI
3. In agent mode, ask a question that would relate to the extracted memories
4. Verify agent references the memories in its response

**Check Memory Storage:**
```bash
db.agentMemories.find({ source: /chunk_upload/ }).pretty()
# Should show extracted facts with type: "fact" and tags: ["chunk-upload", "auto-extracted"]
```

---

### Test 10: Memory Enrichment

**Objective:** Verify similar memories are merged and enriched

**Steps:**
1. Upload content with similar facts (e.g., multiple files mentioning the same person)
2. Check memory collection
3. Verify:
   - ✅ Similar memories are merged (not duplicated)
   - ✅ Confidence scores increase when reinforced
   - ✅ Related memories are linked

**Check Enrichment:**
```bash
db.agentMemories.findOne({ tags: "chunk-upload" })
# Should show content contains "[ENRICHED: ...]" if merged
# confidence should be higher after enrichment
```

---

### Test 11: Different File Sizes

**Objective:** Verify handling of various file sizes

**Test Cases:**
1. **Small file** (< 100 tokens): Should create 1 chunk
2. **Medium file** (500-2000 tokens): Should create 1 chunk
3. **Large file** (5000+ tokens): Should create 3+ chunks
4. **Very large file** (20MB limit): Should create many chunks properly
5. **Empty file**: Should be rejected or handled gracefully

---

### Test 12: Error Handling

**Objective:** Verify graceful error handling

**Test Cases:**

1. **Invalid file type:**
   - Attempt to upload `.exe`, `.bin`, etc.
   - Expected: Error message "Invalid file type"

2. **File exceeds 20MB:**
   - Upload > 20MB file
   - Expected: Error message "File size exceeds 20MB limit"

3. **Invalid URL:**
   - Enter malformed URL (e.g., "not a url")
   - Expected: Error message "Invalid URL format"

4. **Unreachable website:**
   - Enter URL of non-existent site
   - Expected: Proper error message

5. **Network timeout:**
   - Try scraping a very slow site
   - Expected: Timeout error (15 second limit)

---

### Test 13: Integration with Agent Tools

**Objective:** Verify agent tools work correctly with new chunk types

**Steps:**
1. Ensure you have uploaded text chunks and web chunks
2. Use agent with each relevant tool:

**searchProjectData:**
- Search should return text_chunk and web_chunk types
- Verify they have proper metadata (chunkInfo)

**projectDataAnalysis:**
- Should return chunk metadata without base64
- Should include type information

**Verify Agent Behavior:**
```bash
# In agent response, check if:
# 1. Chunks are found in search results
# 2. Chunks are properly cited in response
# 3. Chunk metadata (type, chunk number) is handled correctly
```

---

## Testing Checklist

- [ ] Text file (.txt) uploads and chunks correctly
- [ ] CSV file (.csv) uploads and chunks by rows
- [ ] JSON file (.json) uploads and flattens correctly
- [ ] Web link scraping works and extracts content
- [ ] Chunks display in DataList with correct metadata
- [ ] Chunks can be embedded (vector generation)
- [ ] Chunks are searchable via vector search
- [ ] Chunks appear in agent search results
- [ ] Memories are extracted from chunks
- [ ] Similar memories are enriched and merged
- [ ] File size validation works (20MB limit)
- [ ] Invalid file types are rejected
- [ ] Invalid URLs are rejected
- [ ] Web scraping handles errors gracefully
- [ ] Agent properly cites chunk sources

---

## Database Verification Commands

### Check text chunks
```javascript
db.projectData.find({ type: "text_chunk" }).count()
```

### Check web chunks
```javascript
db.projectData.find({ type: "web_chunk" }).count()
```

### Check chunks with embeddings
```javascript
db.projectData.find({
  type: { $in: ["text_chunk", "web_chunk"] },
  embedding: { $exists: true, $ne: null }
}).count()
```

### Check extracted memories
```javascript
db.agentMemories.find({ tags: "chunk-upload" }).pretty()
```

### Check memory enrichment
```javascript
db.agentMemories.find({ content: /ENRICHED/ }).pretty()
```

---

## Performance Considerations

- **Chunking**: Should complete within seconds for typical files
- **Embedding generation**: ~5-10 seconds per chunk (depends on VoyageAI API)
- **Memory extraction**: ~3-5 seconds per first 3 chunks
- **Web scraping**: ~5-15 seconds depending on site size
- **Vector search**: Milliseconds (indexes on embedding field)

---

## Common Issues & Troubleshooting

### Issue: Chunks not appearing in search
**Solution:** Verify embeddings were generated (check "Embedded" badge in DataList)

### Issue: Memory extraction shows 0 memories
**Solution:**
- Check if `AGENT_MEMORY_ENABLED=true` in .env
- Verify LLM API keys are set
- Check console for extraction errors

### Issue: Web scraping returns no content
**Solution:**
- Try different URL (some sites block scrapers)
- Check if URL is accessible in browser
- Verify network connectivity

### Issue: Chunk count seems wrong
**Solution:**
- Check actual chunk content in database
- Verify token estimation is accurate
- Check if overlap is being included

---

## Success Criteria

✅ All 13 test cases pass
✅ No console errors
✅ Database contains proper chunk documents
✅ Memories extracted and enriched correctly
✅ Agent can search and cite chunks
✅ Vector search includes chunks in results
✅ File validation works for all types
✅ Error messages are clear and helpful

---

## Next Steps After Testing

1. Update README.md with usage instructions
2. Create user-facing documentation
3. Add example test files to repository
4. Set up automated integration tests
5. Monitor production for performance metrics
6. Gather user feedback on chunking quality


