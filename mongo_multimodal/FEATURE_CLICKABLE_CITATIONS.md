# Feature: Clickable Source Citations

## Enhancement Overview

Made source citations in agent responses clickable to preview the referenced images/documents directly in a modal.

## What Changed

### File Modified
`/app/projects/[projectId]/components/AgentView.tsx`

### New Functionality

#### 1. Clickable Citation Badges
All source citations in agent responses are now clickable buttons that open the referenced content:

**Citation Formats Supported:**
- `[Source: filename.jpg]` - Blue badge
- `[Image: filename.png]` - Green badge
- `[Analysis: filename.pdf]` - Purple badge

#### 2. Smart File Resolution
When a citation is clicked, the system:
1. **First** checks conversation references for matching dataId
2. **Fallback** searches project data by filename if not found in references
3. Opens the image/document in `ImagePreviewModal`

#### 3. Visual Feedback
- Hover effect on citation badges (opacity transition)
- Cursor changes to pointer on hover
- Tooltip shows "Click to preview {filename}"

## Code Changes

### New Handler Function
```typescript
const handleCitationClick = async (filename: string) => {
    // Try to find dataId in references by filename
    const ref = references.find(r =>
        r.title?.toLowerCase().includes(filename.toLowerCase()) ||
        filename.toLowerCase().includes(r.title?.toLowerCase() || '')
    );

    if (ref?.dataId) {
        setPreviewDataId(ref.dataId);
        return;
    }

    // If not in references, search project data
    try {
        const response = await fetch(
            `/api/projects/${projectId}/data?filename=${encodeURIComponent(filename)}&limit=1`
        );
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                setPreviewDataId(data.data[0]._id);
            }
        }
    } catch (error) {
        console.error('Error finding image:', error);
    }
};
```

### Updated ReactMarkdown Components

**Paragraph Renderer:**
```typescript
// Before: Static span
<span className={`badge-styles`}>{match[0]}</span>

// After: Clickable button
<button
    onClick={() => handleCitationClick(filename)}
    className={`badge-styles cursor-pointer hover:opacity-80`}
    title={`Click to preview ${filename}`}
>
    {match[0]}
</button>
```

**Inline Code Renderer:**
```typescript
// Before: Static span for citations
<span className={`badge-styles`}>{children}</span>

// After: Clickable button with proper matching
const citationMatch = text.match(/^\[(?:Source|Image|Analysis): ([^\]]+)\]$/);
if (citationMatch) {
    const filename = citationMatch[1];
    return (
        <button
            onClick={() => handleCitationClick(filename)}
            className={`badge-styles cursor-pointer hover:opacity-80`}
        >
            {children}
        </button>
    );
}
```

## User Experience

### Before
- Citations were highlighted but static
- No way to view referenced images without searching
- Manual workflow: see citation → remember filename → search → view

### After
- One-click access to referenced content
- Citations are interactive with hover feedback
- Seamless workflow: see citation → click → view immediately

## Visual Design

**Citation Badge Colors:**
- 🔵 **Blue** - `[Source: ...]` - bg-blue-100/text-blue-700
- 🟢 **Green** - `[Image: ...]` - bg-green-100/text-green-700
- 🟣 **Purple** - `[Analysis: ...]` - bg-purple-100/text-purple-700

**Interactive States:**
- **Default** - Colored badge with padding
- **Hover** - 80% opacity with transition
- **Cursor** - Pointer cursor indicating clickability
- **Tooltip** - Shows filename on hover

## Example Usage

Agent response with clickable citations:

```markdown
The Q4 revenue shows 27% YoY growth [Analysis: Integrated-Filing-Financials-Q4_page_6.jpg]

Key highlights from the balance sheet [Source: balance-sheet-2024.png]:
- Total assets increased by 15%
- Debt-to-equity ratio improved

Visual breakdown [Image: revenue-chart-q4.jpg] indicates strong performance.
```

Each highlighted citation is now clickable to preview the image.

## Technical Details

### Dependencies
- Uses existing `ImagePreviewModal` component
- Leverages existing `previewDataId` state
- No new dependencies required

### Performance
- Lazy loading: Only fetches image when citation is clicked
- Smart caching: Uses references array first (instant)
- Fallback API call: Only if not found in references

### Compatibility
- Works with all citation formats
- Handles both paragraph text and inline code citations
- Compatible with existing reference tracking system

## Testing

### Test Cases
1. ✅ Click `[Analysis: ...]` citation → Opens modal
2. ✅ Click `[Source: ...]` citation → Opens modal
3. ✅ Click `[Image: ...]` citation → Opens modal
4. ✅ Hover shows tooltip with filename
5. ✅ Handles missing files gracefully (no crash)
6. ✅ Works with partial filename matches

### How to Test
1. Ask agent: "Find and analyze revenue documents"
2. Agent responds with citations
3. Click any purple/blue/green citation badge
4. Verify modal opens with correct image
5. Test ESC key and close button
6. Verify navigation between images works

## Future Enhancements

Potential improvements:
- **Batch preview**: Click multiple citations to queue preview
- **Citation context**: Show surrounding text from agent response
- **Download**: Add download button in modal for cited files
- **Copy link**: Share direct link to specific citation
- **Citation count**: Show how many times a file is cited
- **Keyboard nav**: Use number keys to jump to nth citation

## Status

✅ **Implemented and Ready**
- All citations are clickable
- Modal preview works
- Visual feedback is smooth
- Error handling is graceful

