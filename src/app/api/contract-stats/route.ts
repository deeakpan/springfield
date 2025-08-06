import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// TileCore ABI - just the functions we need
const TILE_CORE_ABI = [
  "function totalTilesCount() external view returns (uint256)",
  "function getUserOwnedTiles(address user) external view returns (uint256[] memory)"
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('userAddress');
    
    const TILE_CORE_ADDRESS = process.env.NEXT_PUBLIC_TILE_CORE_ADDRESS;
    console.log('Using TileCore address:', TILE_CORE_ADDRESS);
    console.log('User address:', userAddress);
    
    if (!TILE_CORE_ADDRESS) {
      throw new Error('TileCore address not configured');
    }

    // Connect to the network
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.pepe-unchained.com');
    const tileCoreContract = new ethers.Contract(TILE_CORE_ADDRESS, TILE_CORE_ABI, provider);

    // Get total tiles count
    const totalTilesCount = await tileCoreContract.totalTilesCount();
    console.log('Total tiles count:', totalTilesCount.toString());
    
    let userOwnedTilesCount = 0;
    
    // Get user's owned tiles if address provided
    if (userAddress && ethers.isAddress(userAddress)) {
      try {
        console.log('Calling getUserOwnedTiles for address:', userAddress);
        const userTiles = await tileCoreContract.getUserOwnedTiles(userAddress);
        console.log('Raw user tiles response:', userTiles);
        userOwnedTilesCount = userTiles.length;
        console.log('User tiles array:', userTiles);
        console.log('User owned tiles count:', userOwnedTilesCount);
      } catch (error: any) {
        console.error('Error fetching user tiles:', error);
        console.error('Error details:', error.message);
        userOwnedTilesCount = 0;
      }
    } else {
      console.log('No valid user address provided or address is invalid');
    }

    return NextResponse.json({
      success: true,
      data: {
        totalTilesCount: Number(totalTilesCount),
        userOwnedTilesCount: userOwnedTilesCount
      }
    });
  } catch (error) {
    console.error('Error fetching contract stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contract stats',
      data: {
        totalTilesCount: 0,
        userOwnedTilesCount: 0
      }
    }, { status: 500 });
  }
} 