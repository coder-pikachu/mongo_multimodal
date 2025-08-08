import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const item = await db.collection('projectData').findOne({ _id: new ObjectId(id) });
    if (!item || item.type !== 'image' || !item.content?.base64) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Analyze with Claude Haiku for fast, structured output
    const result = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      maxOutputTokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this image and return strict JSON with keys: description (string, concise), tags (string[] up to 10), insights (string[] up to 10), facets (object of string -> string|string[]).` },
            { type: 'image' as const, image: new URL(`data:${item.metadata?.mimeType || 'image/jpeg'};base64,${item.content.base64}`) }
          ]
        }
      ]
    });

    let full = '';
    const reader = result.toTextStreamResponse().body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
      }
    }

    // Try to parse JSON
    let parsed: { description?: string; tags?: string[]; insights?: string[]; facets?: Record<string, unknown> } | null = null;
    try {
      parsed = JSON.parse(full.trim());
    } catch {}

    if (!parsed) {
      // Fallback: wrap as description
      parsed = { description: full.trim(), tags: [], insights: [], facets: {} };
    }

    await db.collection('projectData').updateOne(
      { _id: new ObjectId(id) },
      { $set: { 'analysis.description': parsed.description || '', 'analysis.tags': parsed.tags || [], 'analysis.insights': parsed.insights || [], 'analysis.facets': parsed.facets || {}, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, analysis: parsed });
  } catch (error) {
    console.error('Analyze route error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}


