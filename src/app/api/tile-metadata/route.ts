import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tileId = searchParams.get('tileId');
    
    if (!tileId) {
      return NextResponse.json({ error: 'Tile ID is required' }, { status: 400 });
    }

    // For now, let's use the existing approach but make it more efficient
    // In the future, this should fetch the metadataUri from the contract and then fetch the metadata
    
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Lighthouse API key not configured' }, { status: 500 });
    }

    // Import lighthouse dynamically to avoid issues
    const lighthouse = await import('@lighthouse-web3/sdk');

    // Fetch all uploads from Lighthouse
    let lastKey = null;
    let allFiles: any[] = [];
    
    while (true) {
      const resp = await lighthouse.default.getUploads(apiKey, lastKey);
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
          let tileIdFromData = data.tile;
          if (typeof tileIdFromData === 'string' && tileIdFromData.includes('-')) {
            const parts = tileIdFromData.split('-');
            if (parts.length === 2) {
              const x = parseInt(parts[0]);
              const y = parseInt(parts[1]);
              if (!isNaN(x) && !isNaN(y)) {
                tileIdFromData = (x + (y - 1) * 40).toString(); // Convert to numeric ID
              }
            }
          }
          
          detailsMap[tileIdFromData] = { ...data, cid: file.cid, originalTileId: data.tile };
        }
      } catch (e) {
        console.error('Error processing file:', file, e);
      }
    }));

    // Return the specific tile's metadata if found
    const tileMetadata = detailsMap[tileId];
    if (tileMetadata) {
      return NextResponse.json(tileMetadata);
    } else {
      // Return a default structure if metadata not found
      return NextResponse.json({
        name: `Tile #${tileId}`,
        imageCID: null,
        socials: null,
        website: null,
        address: null,
        cid: null
      });
    }
  } catch (error) {
    console.error('Error fetching tile metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch tile metadata' }, { status: 500 });
  }
} 