// GET /api/templates — list all document templates
// POST /api/templates — fill a template with provided fields

import { NextResponse } from 'next/server';
import { DOCUMENT_TEMPLATES, fillTemplate, getTemplateById } from '@sigil/shared';

export async function GET() {
  try {
    // Return template metadata (no body — lighter payload)
    const templates = DOCUMENT_TEMPLATES.map(({ id, title, description, category, fields }) => ({
      id,
      title,
      description,
      category,
      fields,
    }));
    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, fields } = body as { templateId?: string; fields?: Record<string, string> };

    if (!templateId || !fields) {
      return NextResponse.json(
        { error: 'templateId and fields are required' },
        { status: 400 },
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template "${templateId}" not found` },
        { status: 404 },
      );
    }

    const result = fillTemplate(template, fields);

    // Compute SHA-256 hash of the filled document (client-side preferred, but server-side fallback)
    const encoder = new TextEncoder();
    const data = encoder.encode(result.body);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = `0x${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;

    return NextResponse.json({
      title: result.title,
      body: result.body,
      contentHash,
      templateId,
    });
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}