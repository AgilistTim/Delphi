import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getArtifactPaths } from '../../../../../lib/reports';

export async function GET(
  _req: Request,
  context: { params: { slug: string; ext: string } }
) {
  try {
    const { slug, ext } = context.params;
    if (!slug || !ext) {
      return NextResponse.json({ error: 'Missing slug or ext' }, { status: 400 });
    }

    const { json, md, exists } = getArtifactPaths(slug);

    let filePath: string | null = null;
    let contentType = 'application/octet-stream';

    if (ext === 'json') {
      if (!exists.json) return NextResponse.json({ error: 'JSON artifact not found' }, { status: 404 });
      filePath = json;
      contentType = 'application/json; charset=utf-8';
    } else if (ext === 'md' || ext === 'markdown') {
      if (!exists.md) return NextResponse.json({ error: 'Markdown artifact not found' }, { status: 404 });
      filePath = md;
      contentType = 'text/markdown; charset=utf-8';
    } else {
      return NextResponse.json({ error: 'Unsupported artifact type' }, { status: 400 });
    }

    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    const filename = path.basename(filePath);

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Content-Disposition': `inline; filename="${filename}"`
      }
    });
  } catch (err) {
    console.error('Artifact download error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
