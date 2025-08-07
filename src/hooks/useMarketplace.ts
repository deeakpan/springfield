import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  CONTRACT_ADDRESSES, 
  TILE_MARKETPLACE_ABI, 
  TILE_CORE_ABI 
} from '../config/contracts';
import { ethers } from 'ethers';

export interface SaleListing {
  tileId: bigint;
  seller: string;
  price: bigint;
  isActive: boolean;
  isNativePayment: boolean;
}

export interface RentalListing {
  tileId: bigint;
  owner: string;
  pricePerDay: bigint;
  isActive: boolean;
  isNativePayment: boolean;
  currentRenter: string;
  rentalStart: bigint;
  rentalEnd: bigint;
}

// Updated Tile interface to match getUserTilesWithDetails response
export interface Tile {
  tileId: bigint;
  owner: string;
  metadataUri: string;
  isNativePayment: boolean;
  createdAt: bigint;
  originalBuyer: string;
  isForSale: boolean;
  isForRent: boolean;
  isCurrentlyRented: boolean;
  salePrice: bigint;
  rentPricePerDay: bigint;
  currentRenter: string;
  rentalEnd: bigint;
  // Add metadata fields
  name?: string;
  description?: string;
  imageCID?: string;
  metadata?: any;
  socials?: any;
  website?: string | null;
  userType?: string;
  address?: string;
}

export function useMarketplace() {
  const { address } = useAccount();
  const [activeSaleListings, setActiveSaleListings] = useState<SaleListing[]>([]);
  const [activeRentalListings, setActiveRentalListings] = useState<RentalListing[]>([]);
  const [userSaleListings, setUserSaleListings] = useState<SaleListing[]>([]);
  const [userRentalListings, setUserRentalListings] = useState<RentalListing[]>([]);
  const [userTiles, setUserTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(false);

  // Contract write hooks - must be at top level
  const { writeContractAsync } = useWriteContract();

  // Get user's SPRFD balance
  const { data: sprfdBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.SPRFD_TOKEN as `0x${string}`,
  });

  // Get user's native balance
  const { data: nativeBalance } = useBalance({
    address,
  });

  // Helper functions for contract interactions
  const listTileForSaleAction = async (tileId: number, price: string, isNativePayment: boolean) => {
    try {
      setLoading(true);
      console.log('Listing tile for sale:', { tileId, price, isNativePayment });
      console.log('Payment type:', isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRFD)');
      
      if (!writeContractAsync) {
        alert('Wallet not connected or writeContract not available');
        return;
      }
      
      // Convert price to wei
      const priceInWei = parseEther(price);
      
      // Call the contract function
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'listTileForSale',
        args: [BigInt(tileId), priceInWei, isNativePayment],
      });
      
      console.log('Transaction hash:', hash);
      alert(`Transaction sent! Please confirm in your wallet. Listing for ${isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRFD)'}`);
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh data
      setTimeout(() => {
        fetchUserTiles();
        fetchMarketplaceData();
      }, 1000);
      
    } catch (error) {
      console.error('Error listing tile for sale:', error);
      alert('Error listing tile for sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const listTileForRentAction = async (tileId: number, pricePerDay: string, isNativePayment: boolean) => {
    try {
      setLoading(true);
      console.log('Listing tile for rent:', { tileId, pricePerDay, isNativePayment });
      console.log('Payment type:', isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRFD)');
      
      if (!writeContractAsync) {
        alert('Wallet not connected or writeContract not available');
        return;
      }
      
      // Convert price to wei
      const priceInWei = parseEther(pricePerDay);
      
      // Call the contract function
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'listTileForRent',
        args: [BigInt(tileId), priceInWei, isNativePayment],
      });
      
      console.log('Transaction hash:', hash);
      alert(`Transaction sent! Please confirm in your wallet. Listing for ${isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRFD)'}`);
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh data
      setTimeout(() => {
        fetchUserTiles();
        fetchMarketplaceData();
      }, 1000);
      
    } catch (error) {
      console.error('Error listing tile for rent:', error);
      alert('Error listing tile for rent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buyListedTileAction = async (tileId: number, price: string, isNativePayment: boolean) => {
    try {
      setLoading(true);
      console.log('Buying listed tile:', { tileId, price, isNativePayment });
      console.log('Payment type:', isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRFD)');
      
      if (!writeContractAsync) {
        alert('Wallet not connected or writeContract not available');
        return;
      }
      
      // Convert price to wei
      const priceInWei = parseEther(price);
      
      // Call the contract function with optimized gas settings
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'buyListedTile',
        args: [BigInt(tileId)],
        value: isNativePayment ? priceInWei : BigInt(0),
        // Add gas optimization
        gas: BigInt(300000), // Set reasonable gas limit
      });
      
      console.log('Transaction hash:', hash);
      alert(`Transaction sent! Please confirm in your wallet. Paying with ${isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRFD)'}`);
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh data
      setTimeout(() => {
        fetchUserTiles();
        fetchMarketplaceData();
      }, 1000);
      
    } catch (error) {
      console.error('Error buying listed tile:', error);
      alert('Error buying listed tile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rentTileAction = async (tileId: number, duration: number) => {
    try {
      setLoading(true);
      console.log('Renting tile:', { tileId, duration });
      console.log('writeContract function available:', !!writeContractAsync);
      console.log('Contract address:', CONTRACT_ADDRESSES.MARKETPLACE);
      console.log('Contract ABI functions:', TILE_MARKETPLACE_ABI.filter(item => item.type === 'function').map(f => f.name));
      
      if (!writeContractAsync) {
        alert('Wallet not connected or writeContract not available');
        return;
      }
      
      if (!CONTRACT_ADDRESSES.MARKETPLACE || CONTRACT_ADDRESSES.MARKETPLACE === "0x...") {
        alert('Contract address not configured');
        return;
      }
      
      // Call the contract function
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'rentTile',
        args: [BigInt(tileId), BigInt(duration)],
      });
      
      console.log('Transaction hash:', hash);
      alert('Transaction sent! Please confirm in your wallet.');
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh data
      setTimeout(() => {
        fetchUserTiles();
        fetchMarketplaceData();
      }, 1000);
      
    } catch (error) {
      console.error('Error renting tile:', error);
      alert('Error renting tile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSaleListingAction = async (tileId: number) => {
    console.log('🚨 cancelSaleListingAction CALLED! 🚨');
    console.log('tileId:', tileId);
    console.log('Function is being executed!');
    
    try {
      setLoading(true);
      console.log('Canceling sale listing:', tileId);
      console.log('writeContract function available:', !!writeContractAsync);
      console.log('Contract address:', CONTRACT_ADDRESSES.MARKETPLACE);
      console.log('Contract ABI functions:', TILE_MARKETPLACE_ABI.filter(item => item.type === 'function').map(f => f.name));
      
      if (!writeContractAsync) {
        alert('Wallet not connected or writeContract not available');
        return;
      }
      
      if (!CONTRACT_ADDRESSES.MARKETPLACE || CONTRACT_ADDRESSES.MARKETPLACE === "0x...") {
        alert('Contract address not configured');
        return;
      }
      
      console.log('About to call writeContractAsync for cancelSaleListing...');
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'cancelSaleListing',
        args: [BigInt(tileId)],
        gas: BigInt(200000), // Optimize gas for cancel operation
      });
      
      console.log('Transaction hash:', hash);
      alert('Transaction sent! Please confirm in your wallet.');
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh data - use the same pattern as the working rent function
      setTimeout(() => {
        fetchUserTiles();
        fetchMarketplaceData();
      }, 1000);
      
      alert('Sale listing canceled successfully!');
    } catch (error) {
      console.error('Error canceling sale listing:', error);
      alert('Error canceling sale listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelRentalListingAction = async (tileId: number) => {
    console.log('🚨 cancelRentalListingAction CALLED! 🚨');
    console.log('tileId:', tileId);
    console.log('Function is being executed!');
    
    try {
      setLoading(true);
      console.log('Canceling rental listing:', tileId);
      console.log('writeContract function available:', !!writeContractAsync);
      console.log('Contract address:', CONTRACT_ADDRESSES.MARKETPLACE);
      console.log('Contract ABI functions:', TILE_MARKETPLACE_ABI.filter(item => item.type === 'function').map(f => f.name));
      
      if (!writeContractAsync) {
        alert('Wallet not connected or writeContract not available');
        return;
      }
      
      if (!CONTRACT_ADDRESSES.MARKETPLACE || CONTRACT_ADDRESSES.MARKETPLACE === "0x...") {
        alert('Contract address not configured');
        return;
      }
      
      console.log('About to call writeContractAsync for cancelRentalListing...');
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'cancelRentalListing',
        args: [BigInt(tileId)],
        gas: BigInt(200000), // Optimize gas for cancel operation
      });
      
      console.log('Transaction hash:', hash);
      alert('Transaction sent! Please confirm in your wallet.');
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh data - use the same pattern as the working rent function
      setTimeout(() => {
        fetchUserTiles();
        fetchMarketplaceData();
      }, 1000);
      
      alert('Rental listing canceled successfully!');
    } catch (error) {
      console.error('Error canceling rental listing:', error);
      alert('Error canceling rental listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch marketplace data
  const fetchMarketplaceData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_RPC_URL || !CONTRACT_ADDRESSES.MARKETPLACE) {
      console.error('Missing RPC URL or contract address');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching marketplace data...');
      
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
      
      // Step 1: Get all created tiles
      console.log('Getting all created tiles...');
      const allCreatedTiles = await marketplace.getAllCreatedTiles();
      console.log('All created tiles:', allCreatedTiles);
      
      if (!allCreatedTiles || allCreatedTiles.length === 0) {
        console.log('No tiles created yet');
        setActiveSaleListings([]);
        setActiveRentalListings([]);
        return;
      }
      
      // Step 2: Get details for each tile
      console.log('Getting details for each tile...');
      const allTilesDetails = await Promise.all(
        allCreatedTiles.map(async (tileId: bigint) => {
          try {
            const details = await marketplace.getTileDetails(tileId);
            return {
              tileId: tileId.toString(),
              details: {
                tileId: details.tileId.toString(),
                owner: details.owner,
                metadataUri: details.metadataUri,
                isNativePayment: details.isNativePayment,
                createdAt: details.createdAt.toString(),
                originalBuyer: details.originalBuyer,
                isForSale: details.isForSale,
                isForRent: details.isForRent,
                isCurrentlyRented: details.isCurrentlyRented,
                salePrice: details.salePrice.toString(),
                rentPricePerDay: details.rentPricePerDay.toString(),
                currentRenter: details.currentRenter,
                rentalEnd: details.rentalEnd.toString()
              }
            };
          } catch (error) {
            console.error(`Error fetching details for tile ${tileId}:`, error);
            return null;
          }
        })
      );
      
      // Step 3: Filter tiles by listing status
      const saleListings: SaleListing[] = [];
      const rentalListings: RentalListing[] = [];
      
      for (const tileData of allTilesDetails) {
        if (tileData) {
          const { tileId, details } = tileData;
          
          // Check if tile is listed for sale
          if (details.isForSale) {
            saleListings.push({
              tileId: BigInt(tileId),
              seller: details.owner,
              price: BigInt(details.salePrice),
              isActive: details.isForSale,
              isNativePayment: details.isNativePayment
            });
          }
          
          // Check if tile is listed for rent
          if (details.isForRent) {
            rentalListings.push({
              tileId: BigInt(tileId),
              owner: details.owner,
              pricePerDay: BigInt(details.rentPricePerDay),
              isActive: details.isForRent,
              isNativePayment: details.isNativePayment,
              currentRenter: details.currentRenter,
              rentalStart: BigInt(0), // Not available in getTileDetails
              rentalEnd: BigInt(details.rentalEnd)
            });
          }
        }
      }
      
      setActiveSaleListings(saleListings);
      setActiveRentalListings(rentalListings);
      
      console.log('Marketplace data fetched successfully');
      console.log('Sale listings found:', saleListings.length);
      console.log('Rental listings found:', rentalListings.length);
      console.log('Sale listings:', saleListings);
      console.log('Rental listings:', rentalListings);
      
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // NEW: Fetch user's own listings
  const fetchUserListings = useCallback(async () => {
    if (!address || !process.env.NEXT_PUBLIC_RPC_URL || !CONTRACT_ADDRESSES.MARKETPLACE) {
      console.error('Missing address, RPC URL, or contract address');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching user listings for address:', address);
      
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
      
      // Step 1: Get user's owned tile IDs
      console.log('Getting user owned tile IDs...');
      const userOwnedTileIds = await marketplace.getUserTilesWithDetails(address);
      console.log('User owned tile IDs:', userOwnedTileIds);
      
      if (!userOwnedTileIds || userOwnedTileIds.length === 0) {
        console.log('No tiles owned by user');
        setUserSaleListings([]);
        setUserRentalListings([]);
        return;
      }
      
      // Step 2: Get details for each tile
      console.log('Getting details for each tile...');
      const userTilesDetails = await Promise.all(
        userOwnedTileIds.map(async (tileData: any) => {
          try {
            const tileId = tileData.tileId;
            const details = await marketplace.getTileDetails(tileId);
            return {
              tileId: tileId.toString(),
              details: {
                tileId: details.tileId.toString(),
                owner: details.owner,
                metadataUri: details.metadataUri,
                isNativePayment: details.isNativePayment,
                createdAt: details.createdAt.toString(),
                originalBuyer: details.originalBuyer,
                isForSale: details.isForSale,
                isForRent: details.isForRent,
                isCurrentlyRented: details.isCurrentlyRented,
                salePrice: details.salePrice.toString(),
                rentPricePerDay: details.rentPricePerDay.toString(),
                currentRenter: details.currentRenter,
                rentalEnd: details.rentalEnd.toString()
              }
            };
          } catch (error) {
            console.error(`Error fetching details for tile ${tileData.tileId}:`, error);
            return null;
          }
        })
      );
      
      // Step 3: Filter tiles by listing status
      const userSaleListings: SaleListing[] = [];
      const userRentalListings: RentalListing[] = [];
      
      for (const tileData of userTilesDetails) {
        if (tileData) {
          const { tileId, details } = tileData;
          
          // Check if tile is listed for sale
          if (details.isForSale) {
            userSaleListings.push({
              tileId: BigInt(tileId),
              seller: details.owner,
              price: BigInt(details.salePrice),
              isActive: details.isForSale,
              isNativePayment: details.isNativePayment
            });
          }
          
          // Check if tile is listed for rent
          if (details.isForRent) {
            userRentalListings.push({
              tileId: BigInt(tileId),
              owner: details.owner,
              pricePerDay: BigInt(details.rentPricePerDay),
              isActive: details.isForRent,
              isNativePayment: details.isNativePayment,
              currentRenter: details.currentRenter,
              rentalStart: BigInt(0), // Not available in getTileDetails
              rentalEnd: BigInt(details.rentalEnd)
            });
          }
        }
      }
      
      // Update state with user listings
      setUserSaleListings(userSaleListings);
      setUserRentalListings(userRentalListings);
      
      console.log('User listings fetched successfully');
      console.log('User sale listings found:', userSaleListings.length);
      console.log('User rental listings found:', userRentalListings.length);
      console.log('User sale listings:', userSaleListings);
      console.log('User rental listings:', userRentalListings);
      
    } catch (error) {
      console.error('Error fetching user listings:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // NEW: Fetch user tiles using the same method as grid page
  const fetchUserTiles = useCallback(async () => {
    if (!address || !process.env.NEXT_PUBLIC_RPC_URL || !CONTRACT_ADDRESSES.MARKETPLACE) {
      console.error('Missing address, RPC URL, or contract address');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching user tiles for address:', address);
      
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
      
      // Step 1: Get user's owned tile IDs
      console.log('Getting user owned tile IDs...');
      const userOwnedTileIds = await marketplace.getUserTilesWithDetails(address);
      console.log('User owned tile IDs:', userOwnedTileIds);
      
      if (!userOwnedTileIds || userOwnedTileIds.length === 0) {
        console.log('No tiles owned by user');
        setUserTiles([]);
        return;
      }
      
      // Step 2: Get details for each tile
      console.log('Getting details for each tile...');
      const userTilesDetails = await Promise.all(
        userOwnedTileIds.map(async (tileData: any) => {
          try {
            const tileId = tileData.tileId;
            const details = await marketplace.getTileDetails(tileId);
            return {
              tileId: tileId.toString(),
              details: {
                tileId: details.tileId.toString(),
                owner: details.owner,
                metadataUri: details.metadataUri,
                isNativePayment: details.isNativePayment,
                createdAt: details.createdAt.toString(),
                originalBuyer: details.originalBuyer,
                isForSale: details.isForSale,
                isForRent: details.isForRent,
                isCurrentlyRented: details.isCurrentlyRented,
                salePrice: details.salePrice.toString(),
                rentPricePerDay: details.rentPricePerDay.toString(),
                currentRenter: details.currentRenter,
                rentalEnd: details.rentalEnd.toString()
              }
            };
          } catch (error) {
            console.error(`Error fetching details for tile ${tileData.tileId}:`, error);
            return null;
          }
        })
      );
      
      // Step 3: Process each tile and fetch its metadata
      const processedTiles: Tile[] = [];
      
      for (const tileData of userTilesDetails) {
        if (tileData) {
          const { tileId, details } = tileData;
          
          let metadata = null;
          let imageCID = null;
          
          if (details.metadataUri) {
            try {
              console.log(`Fetching metadata for tile ${tileId} from: ${details.metadataUri}`);
              const metadataResponse = await fetch(details.metadataUri);
              if (metadataResponse.ok) {
                metadata = await metadataResponse.json();
                console.log(`Metadata for tile ${tileId}:`, metadata);
                
                // Extract image CID directly from metadata
                if (metadata.imageCID) {
                  imageCID = metadata.imageCID;
                  console.log(`Image CID for tile ${tileId}:`, imageCID);
                }
              }
            } catch (error) {
              console.error(`Error fetching metadata for tile ${tileId}:`, error);
            }
          }
          
          // Create tile object with metadata
          const tile: Tile = {
            tileId: BigInt(tileId),
            owner: details.owner,
            metadataUri: details.metadataUri,
            isNativePayment: details.isNativePayment,
            createdAt: BigInt(details.createdAt),
            originalBuyer: details.originalBuyer,
            isForSale: details.isForSale,
            isForRent: details.isForRent,
            isCurrentlyRented: details.isCurrentlyRented,
            salePrice: BigInt(details.salePrice),
            rentPricePerDay: BigInt(details.rentPricePerDay),
            currentRenter: details.currentRenter,
            rentalEnd: BigInt(details.rentalEnd),
            // Add metadata fields
            name: metadata?.name || `Tile ${tileId}`,
            description: metadata?.description || '',
            imageCID: imageCID,
            metadata: metadata,
            socials: metadata?.socials || {},
            website: metadata?.website || null,
            userType: metadata?.userType || 'user',
            address: metadata?.address || details.owner
          };
          
          processedTiles.push(tile);
        }
      }
      
      console.log('Processed user tiles with metadata:', processedTiles);
      setUserTiles(processedTiles);
      
    } catch (error) {
      console.error('Error fetching user tiles:', error);
      setUserTiles([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Effects
  useEffect(() => {
    fetchMarketplaceData();
  }, [fetchMarketplaceData]);

  // Fetch user tiles when address changes
  useEffect(() => {
    if (address) {
      fetchUserTiles();
    }
  }, [address, fetchUserTiles]);

  return {
    // State
    activeSaleListings,
    activeRentalListings,
    userSaleListings,
    userRentalListings,
    userTiles,
    loading,
    
    // Balances
    sprfdBalance: sprfdBalance ? formatEther(sprfdBalance.value) : '0',
    nativeBalance: nativeBalance ? formatEther(nativeBalance.value) : '0',
    
    // Actions
    listTileForSaleAction,
    listTileForRentAction,
    buyListedTileAction,
    rentTileAction,
    cancelSaleListingAction,
    cancelRentalListingAction,
    
    // Data fetching
    fetchMarketplaceData,
    fetchUserTiles,
    fetchUserListings,
  };
} 