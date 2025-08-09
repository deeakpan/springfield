import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server upload key not configured' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > 600 * 1024) {
      return NextResponse.json({ error: 'Image must be less than 600KB' }, { status: 400 });
    }

    // Directly call Lighthouse upload endpoint with FormData
    const out = new FormData();
    // Preserve filename if available
    const filename = (file as any).name || 'image';
    out.append('file', file, filename);

    // Use node endpoint recommended by Lighthouse for server uploads
    const endpoint = 'https://node.lighthouse.storage/api/v0/add?wrap-with-directory=false&cid-version=1';
    const resp = await fetch(endpoint, {
      method: 'POST',
      // Lighthouse expects X-Api-Key in some environments; try both
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Api-Key': apiKey,
      } as any,
      body: out as any,
    });

    if (!resp.ok) {
      let msg = `Upload failed (${resp.status})`;
      try {
        const j = await resp.json();
        msg = j?.error || msg;
      } catch {}
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await resp.json();
    const cid = data?.Hash;
    if (!cid) {
      return NextResponse.json({ error: 'Upload failed (no CID)' }, { status: 502 });
    }

    return NextResponse.json({ cid, uri: `ipfs://${cid}` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to upload image' }, { status: 500 });
  }
}


