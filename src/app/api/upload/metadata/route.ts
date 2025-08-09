import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server upload key not configured' }, { status: 500 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const text = JSON.stringify(body);
    // Use direct node endpoint for text upload
    const endpoint = 'https://node.lighthouse.storage/api/v0/add?wrap-with-directory=false&cid-version=1';
    const form = new FormData();
    const blob = new Blob([text], { type: 'application/json' });
    form.append('file', blob, 'metadata.json');
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Api-Key': apiKey,
      } as any,
      body: form as any,
    });
    if (!resp.ok) {
      let msg = `Metadata upload failed (${resp.status})`;
      try { const j = await resp.json(); msg = j?.error || msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const data = await resp.json();
    const cid = data?.Hash;
    if (!cid) {
      return NextResponse.json({ error: 'Metadata upload failed' }, { status: 502 });
    }
    return NextResponse.json({ cid, uri: `ipfs://${cid}` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to upload metadata' }, { status: 500 });
  }
}


