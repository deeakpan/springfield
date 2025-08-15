import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Fast tile details API - gets data directly from blockchain + IPFS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tileId = searchParams.get('tileId');
    
    if (!tileId) {
      return NextResponse.json({ error: 'Tile ID required' }, { status: 400 });
    }

    // Initialize blockchain connection
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.ankr.com/polygon';
    const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_TILE_CONTRACT;
    
    if (!MARKETPLACE_ADDRESS) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // ABI for getting tile details
    const TILE_MARKETPLACE_ABI = [
      "function getTileDetails(uint256 tileId) external view returns (tuple(uint256 tileId, address owner, string metadataUri, bool isNativePayment, uint256 createdAt, address originalBuyer, bool isForSale, bool isForRent, bool isCurrentlyRented, uint256 salePrice, uint256 rentPricePerDay, address currentRenter, uint256 rentalEnd))"
    ];

    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, TILE_MARKETPLACE_ABI, provider);

    // Get tile details from blockchain
    let blockchainDetails;
    try {
      blockchainDetails = await marketplace.getTileDetails(parseInt(tileId));
    } catch (error: any) {
      // Check if the error is "Tile does not exist"
      if (error.reason === 'Tile does not exist') {
        // Return a response indicating the tile doesn't exist
        return NextResponse.json({
          tileId: parseInt(tileId),
          exists: false,
          owner: null,
          metadataUri: null,
          imageUrl: null,
          isForSale: false,
          isForRent: false,
          salePrice: null,
          rentPricePerDay: null,
          createdAt: null
        });
      }
      // Re-throw other errors
      throw error;
    }
    
    // Extract image URL from metadata if available
    let imageUrl = null;
    if (blockchainDetails.metadataUri && blockchainDetails.metadataUri.startsWith('ipfs://')) {
      try {
        const metadataCid = blockchainDetails.metadataUri.replace('ipfs://', '');
        const metadataUrl = `https://gateway.lighthouse.storage/ipfs/${metadataCid}`;
        
        // Fetch metadata with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(metadataUrl, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (response.ok) {
          const metadata = await response.json();
          const imageCID = metadata.imageCID || metadata.image;
          if (imageCID) {
            imageUrl = `https://gateway.lighthouse.storage/ipfs/${imageCID}`;
          }
        }
      } catch (error) {
        // Silently fail - image URL is optional
        console.warn(`Failed to fetch metadata for tile ${tileId}:`, error);
      }
    }

    // Return fast response with blockchain data + image URL
    return NextResponse.json({
      tileId: parseInt(tileId),
      exists: true,
      owner: blockchainDetails.owner,
      metadataUri: blockchainDetails.metadataUri,
      imageUrl: imageUrl,
      isForSale: blockchainDetails.isForSale,
      isForRent: blockchainDetails.isForRent,
      salePrice: blockchainDetails.salePrice?.toString(),
      rentPricePerDay: blockchainDetails.rentPricePerDay?.toString(),
      createdAt: blockchainDetails.createdAt?.toString()
    });

  } catch (error) {
    console.error('Error in tile-details API:', error);
    return NextResponse.json({ error: 'Failed to fetch tile details' }, { status: 500 });
  }
} 