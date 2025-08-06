import { NextRequest, NextResponse } from 'next/server';
import lighthouse from '@lighthouse-web3/sdk';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Lighthouse API key not configured' }, { status: 500 });
    }

    // Fetch all uploads from Lighthouse
    let lastKey = null;
    let allFiles: any[] = [];
    
    while (true) {
      const resp = await lighthouse.getUploads(apiKey, lastKey);
      const files = resp?.data?.fileList || [];
      allFiles = allFiles.concat(files);
      
      if (files.length === 0 || files.length < 2000) break;
      lastKey = files[files.length - 1].id;
    }

    // Filter for JSON files and metadata files
    const jsonFiles = allFiles.filter((f: any) => 
      f.fileName.endsWith('.json') || f.mimeType === 'application/octet-stream'
    );

    // Process each file to extract tile details
    const detailsMap: any = {};
    
    await Promise.all(jsonFiles.map(async (file: any) => {
      try {
        const url = `https://gateway.lighthouse.storage/ipfs/${file.cid}`;
        const res = await fetch(url);
        const text = await res.text();
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          return; // Skip this file if it's not valid JSON
        }
        
        if (data.tile) {
          // Convert old coordinate format to new numeric ID if needed
          let tileId = data.tile;
          if (typeof tileId === 'string' && tileId.includes('-')) {
            const parts = tileId.split('-');
            if (parts.length === 2) {
              const x = parseInt(parts[0]);
              const y = parseInt(parts[1]);
              if (!isNaN(x) && !isNaN(y)) {
                tileId = (x + (y - 1) * 40).toString(); // Convert to numeric ID
              }
            }
          }
          
          detailsMap[tileId] = { ...data, cid: file.cid, originalTileId: data.tile };
        }
      } catch (e) {
        console.error('Error processing file:', file, e);
      }
    }));

    return NextResponse.json({ success: true, data: detailsMap });
  } catch (error) {
    console.error('Error fetching tile details:', error);
    return NextResponse.json({ error: 'Failed to fetch tile details' }, { status: 500 });
  }
} 