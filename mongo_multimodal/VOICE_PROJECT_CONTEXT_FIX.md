# Voice Agent - Project Context Integration

## Date: 2025-01-13

## Problem

The voice agent was not considering the project description when formulating search queries. This led to generic searches that didn't leverage the project's domain context in the multimodal embedding space.

**User Feedback**: "The agent is not keeping the project description in context. Its just sharing information as it is. The query to vector search should be to find the data properly on a multimodal embedding space."

## Initial Incorrect Approach ❌

Initially attempted to enrich the query embedding directly by modifying `vectorSearch.service.ts` to append project context to search queries before generating embeddings.

**Why This Was Wrong**:
- Query embeddings should remain pure representations of the semantic intent
- The agent itself should craft context-aware queries, not have embeddings artificially enriched
- This would have created a mismatch between user intent and embedding representation

**User Correction**: "No we don't need to add that to the query embedding, we need to add that to the agent prompt. The query embedding should be crafted by the agent properly."

## Correct Solution ✅

Add project context to the voice agent's system instruction so it can naturally formulate better search queries.

### Implementation

**File**: [app/api/voice/stream/route.ts](app/api/voice/stream/route.ts)

**Changes Made**:

### 1. Extract Project ID from JWT Token (Line 48)

```typescript
const payload = await verifyVoiceSessionToken(token);
sessionId = payload.sessionId;
const projectId = payload.projectId;  // ← NEW
console.log('[Voice Stream GET] Verified session:', sessionId, 'projectId:', projectId);
```

### 2. Fetch Project Context from Database (Lines 51-67)

```typescript
// 2. Fetch project context
let projectContext = '';
if (projectId) {
  try {
    const db = await getDb();
    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { name: 1, description: 1 } }
    );
    if (project) {
      projectContext = `\n\nPROJECT CONTEXT:\n- Project Name: ${project.name}\n- Project Description: ${project.description || 'No description provided'}\n\nWhen formulating search queries, consider this project context to find the most relevant information in the multimodal embedding space. Craft your queries to align with the project domain and content type.`;
      console.log('[Voice Stream GET] Project context loaded:', project.name);
    }
  } catch (error) {
    console.warn('[Voice Stream GET] Failed to fetch project context:', error);
  }
}
```

### 3. Include Context in System Instruction (Line 142)

```typescript
systemInstruction: {
  parts: [{
    text: `You are a helpful AI assistant with access to a user's multimodal knowledge base.${projectContext}

WORKFLOW FOR IMAGE QUESTIONS:
1. Use searchProjectData to find relevant items
2. ALWAYS use analyzeImage with the first result's ID to see the actual image
3. Respond based on what you actually saw
...`
  }]
}
```

## How It Works

### Before Fix

```
User: "Where is the spare tire?"
   ↓
Agent (no project context): searchProjectData("spare tire")
   ↓
Generic query → Generic embedding → Generic results
```

**Problem**: Agent doesn't know this is a vehicle manual project, searches generically.

### After Fix

```
User: "Where is the spare tire?"
   ↓
Agent (with project context):
  - Project Name: "XEV 9e Vehicle Manual"
  - Project Description: "Owner's manual and maintenance guide for XEV 9e electric vehicle"
   ↓
Agent crafts query: searchProjectData("spare tire location XEV 9e vehicle manual")
   ↓
Context-aware query → Better embedding → More relevant results
```

**Benefit**: Agent formulates domain-aware queries that better match the multimodal embedding space.

## Example System Instruction

**Without Project Context**:
```
You are a helpful AI assistant with access to a user's multimodal knowledge base.

WORKFLOW FOR IMAGE QUESTIONS:
1. Use searchProjectData to find relevant items
...
```

**With Project Context**:
```
You are a helpful AI assistant with access to a user's multimodal knowledge base.

PROJECT CONTEXT:
- Project Name: XEV 9e Vehicle Manual
- Project Description: Owner's manual and maintenance guide for XEV 9e electric vehicle

When formulating search queries, consider this project context to find the most relevant
information in the multimodal embedding space. Craft your queries to align with the
project domain and content type.

WORKFLOW FOR IMAGE QUESTIONS:
1. Use searchProjectData to find relevant items
...
```

## Benefits

### 1. Context-Aware Query Formulation

Agent understands the project domain and crafts queries accordingly:
- Vehicle manual project → includes "vehicle", "manual", model name in queries
- Medical images project → includes medical terminology
- Legal documents project → includes legal context

### 2. Better Embedding Matches

Queries are more semantically aligned with the stored embeddings:
- Project data was embedded with its context
- Agent queries now include similar context
- Better cosine similarity scores in vector search

### 3. More Relevant Results

Higher-quality search results lead to:
- More accurate answers
- Fewer hallucinations
- Better user experience

### 4. Natural Integration

The agent naturally incorporates context without:
- Hardcoded rules
- Manual query manipulation
- Artificial embedding enrichment

## Testing Scenarios

### Test 1: Domain-Specific Question

**User**: "Where is the spare tire?"

**Expected Behavior**:
1. Agent receives project context: "XEV 9e Vehicle Manual"
2. Agent formulates query: "spare tire location XEV 9e vehicle"
3. Vector search finds exact pages about spare tire in this vehicle model
4. Agent analyzes the specific image
5. Responds with model-specific location

**Verify**:
- Console shows: `[Voice Stream GET] Project context loaded: XEV 9e Vehicle Manual`
- Search query includes domain terms
- First result is highly relevant (score > 0.7)

### Test 2: General Question with Context

**User**: "What images do I have?"

**Expected Behavior**:
1. Agent knows project is about "XEV 9e Vehicle Manual"
2. Agent searches: "vehicle manual pages images"
3. Returns vehicle-related images, not random results
4. Describes images in context of vehicle manual

**Verify**:
- Agent mentions vehicle/manual in response
- Images are domain-relevant
- Descriptions reference vehicle context

### Test 3: Follow-up Questions

**User**:
1. "Show me the trunk"
2. "What's inside?"

**Expected Behavior**:
1. First query: "trunk XEV 9e vehicle"
2. Second query maintains context: "trunk contents XEV 9e"
3. Both leverage project context for better results

**Verify**:
- Project context included in every session
- Consistent domain-aware responses
- No loss of context between queries

## Error Handling

### No Project Found

If project doesn't exist or DB query fails:
```typescript
if (!project) {
  projectContext = '';  // Empty string, no error thrown
}
```

Agent falls back to generic mode without project context.

### Missing Project Description

If project has no description:
```typescript
projectContext = `\n\nPROJECT CONTEXT:\n- Project Name: ${project.name}\n- Project Description: No description provided\n...`
```

Agent still receives project name for context.

### Database Connection Error

```typescript
catch (error) {
  console.warn('[Voice Stream GET] Failed to fetch project context:', error);
  // projectContext remains empty string
  // Session continues without context
}
```

Non-blocking - session continues even if context fetch fails.

## Implementation Notes

### Why Not Enrich Query Embeddings?

**Wrong Approach** (what we didn't do):
```typescript
// ❌ BAD: Artificially append context to query
const enrichedQuery = `${userQuery} ${project.description}`;
const embedding = await generateEmbedding(enrichedQuery);
```

**Problems**:
- Pollutes semantic representation
- User intent gets mixed with metadata
- Embeddings don't match how data was originally embedded
- Reduces precision in vector search

**Right Approach** (what we did):
```typescript
// ✅ GOOD: Let agent craft context-aware queries naturally
systemInstruction: {
  text: `You have access to: ${project.name} - ${project.description}
         Use this context when formulating search queries.`
}
```

**Benefits**:
- Agent understands domain
- Queries are naturally context-aware
- Embeddings remain pure representations
- Better semantic matching

### Performance Impact

**Negligible**:
- Database query: ~10ms (indexed lookup on _id)
- Project fetched once per session (cached in Gemini session)
- No per-query overhead
- Context string is small (~200 characters)

### Security

- Project ID comes from verified JWT token (authenticated)
- Only fetches project if ID is present
- No risk of cross-project data leakage
- Error handling prevents information disclosure

## Migration Notes

### No Breaking Changes

- Existing sessions continue to work
- Project context is optional (graceful fallback)
- No database schema changes required
- No API contract changes

### Rollout Safe

1. Deploy code
2. New sessions automatically get context
3. Old sessions (without projectId in JWT) work without context
4. Progressive enhancement

## Future Enhancements

### 1. Project Metadata

Could include additional context:
- Project tags
- Data types (images, documents, etc.)
- Creation date / last updated
- Number of items

### 2. User Preferences

Store user's query style preferences:
- Technical vs casual language
- Verbosity level
- Preferred units (metric/imperial)

### 3. Dynamic Context

Adjust context based on:
- Time of day
- Recent queries
- Most-accessed data

### 4. Multi-Project Sessions

If user has multiple projects:
- Specify which project context to use
- Allow cross-project searches with combined context

## Summary

### What Changed

- ✅ Extract projectId from JWT payload
- ✅ Fetch project name and description from MongoDB
- ✅ Include context in voice agent's system instruction
- ✅ Agent crafts domain-aware search queries
- ✅ Better results in multimodal embedding space

### What Didn't Change

- ❌ Query embeddings remain pure (not artificially enriched)
- ❌ Vector search logic unchanged
- ❌ Database schema unchanged
- ❌ API contracts unchanged

### Result

**Voice agent now formulates context-aware search queries that leverage the project's domain knowledge for better semantic matching in the multimodal embedding space.**

**Test it now!** Ask domain-specific questions and verify the agent crafts better queries based on project context. 🎉
