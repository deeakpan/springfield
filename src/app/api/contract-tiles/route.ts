import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// TileCore ABI for reading events and tile data
const TILECORE_ABI = [
  "event TileCreated(address indexed owner, uint256 indexed tileId, string metadataUri, bool isNativePayment)",
  "function getTile(uint256 tileId) external view returns (address owner, string metadataUri, bool isNativePayment)",
  "function checkTileExists(uint256 tileId) external view returns (bool)"
];

export async function GET(req: NextRequest) {
  try {
    const tileCoreAddress = process.env.NEXT_PUBLIC_TILE_CORE;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    
    if (!tileCoreAddress || !rpcUrl) {
      return NextResponse.json({ error: 'Contract address or RPC URL not configured' }, { status: 500 });
    }

    // Connect to the network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tileCore = new ethers.Contract(tileCoreAddress, TILECORE_ABI, provider);

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 10000); // Last 10k blocks, adjust as needed

    // Query TileCreated events
    const events = await tileCore.queryFilter(
      tileCore.filters.TileCreated(),
      fromBlock,
      latestBlock
    );

    // Process events to get tile details
    const tilesMap: any = {};
    
    await Promise.all(events.map(async (event) => {
      try {
        const { owner, tileId, metadataUri, isNativePayment } = event.args!;
        
        // Fetch metadata from IPFS
        if (metadataUri && metadataUri.startsWith('ipfs://')) {
          const cid = metadataUri.replace('ipfs://', '');
          const metadataUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
          
          try {
            const response = await fetch(metadataUrl);
            if (response.ok) {
              const metadata = await response.json();
              tilesMap[tileId.toString()] = {
                ...metadata,
                tileId: tileId.toString(),
                owner: owner,
                metadataUri: metadataUri,
                isNativePayment: isNativePayment,
                cid: cid
              };
            }
          } catch (fetchError) {
            console.error('Error fetching metadata for tile', tileId.toString(), fetchError);
          }
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }));

    return NextResponse.json({ success: true, data: tilesMap });
  } catch (error) {
    console.error('Error fetching contract tiles:', error);
    return NextResponse.json({ error: 'Failed to fetch contract tiles' }, { status: 500 });
  }
} 