import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { analyzeImageItem } from '@/lib/services/projectData.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const analysis = await analyzeImageItem(db, id);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error('Analyze route error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze image';
    const status = message === 'Image not found or invalid' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


