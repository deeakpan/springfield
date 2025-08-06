import { useState, useEffect } from 'react';
import { useAccount, useBalance, useContractRead, useReadContract, useContractWrite } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  CONTRACT_ADDRESSES, 
  TILE_MARKETPLACE_ABI, 
  TILE_CORE_ABI 
} from '../config/contracts';

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

export interface Tile {
  tileId: bigint;
  owner: string;
  metadataUri: string;
  isNativePayment: boolean;
}

export function useMarketplace() {
  const { address } = useAccount();
  const [activeSaleListings, setActiveSaleListings] = useState<SaleListing[]>([]);
  const [activeRentalListings, setActiveRentalListings] = useState<RentalListing[]>([]);
  const [userTiles, setUserTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(false);

  // Contract write hooks - must be at top level
  const { writeContract: writeListForSale } = useContractWrite();
  const { writeContract: writeListForRent } = useContractWrite();
  const { writeContract: writeBuyTile } = useContractWrite();
  const { writeContract: writeRentTile } = useContractWrite();

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
      
      // Convert price to wei
      const priceInWei = parseEther(price);
      
      // Call the contract function
      if (writeListForSale) {
        writeListForSale({
          address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
          abi: TILE_MARKETPLACE_ABI,
          functionName: 'listTileForSale',
          args: [BigInt(tileId), priceInWei, isNativePayment],
        });
      }
    } catch (error) {
      console.error('Error listing tile for sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const listTileForRentAction = async (tileId: number, pricePerDay: string, isNativePayment: boolean) => {
    try {
      setLoading(true);
      console.log('Listing tile for rent:', { tileId, pricePerDay, isNativePayment });
      
      // Convert price to wei
      const priceInWei = parseEther(pricePerDay);
      
      // Call the contract function
      if (writeListForRent) {
        writeListForRent({
          address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
          abi: TILE_MARKETPLACE_ABI,
          functionName: 'listTileForRent',
          args: [BigInt(tileId), priceInWei, isNativePayment],
        });
      }
    } catch (error) {
      console.error('Error listing tile for rent:', error);
    } finally {
      setLoading(false);
    }
  };

  const buyListedTileAction = async (tileId: number, price: string, isNativePayment: boolean) => {
    try {
      setLoading(true);
      console.log('Buying listed tile:', { tileId, price, isNativePayment });
      
      const priceInWei = parseEther(price);
      
      // Call the contract function
      if (writeBuyTile) {
        writeBuyTile({
          address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
          abi: TILE_MARKETPLACE_ABI,
          functionName: 'buyListedTile',
          args: [BigInt(tileId)],
          value: isNativePayment ? priceInWei : BigInt(0),
        });
      }
    } catch (error) {
      console.error('Error buying listed tile:', error);
    } finally {
      setLoading(false);
    }
  };

  const rentTileAction = async (tileId: number, duration: number) => {
    try {
      setLoading(true);
      console.log('Renting tile:', { tileId, duration });
      
      // Call the contract function - total price is calculated by the contract
      if (writeRentTile) {
        writeRentTile({
          address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
          abi: TILE_MARKETPLACE_ABI,
          functionName: 'rentTile',
          args: [BigInt(tileId), BigInt(duration)],
          // value will be calculated by the contract based on pricePerDay * duration
          // and the payment method (native vs token)
        });
      }
    } catch (error) {
      console.error('Error renting tile:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelSaleListingAction = async (tileId: number) => {
    try {
      setLoading(true);
      console.log('Canceling sale listing:', tileId);
      // Implementation would go here
    } catch (error) {
      console.error('Error canceling sale listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRentalListingAction = async (tileId: number) => {
    try {
      setLoading(true);
      console.log('Canceling rental listing:', tileId);
      // Implementation would go here
    } catch (error) {
      console.error('Error canceling rental listing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch marketplace data
  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      const saleListings: SaleListing[] = [];
      const rentalListings: RentalListing[] = [];
      
      // TODO: Implement proper marketplace data fetching
      // This should query the marketplace contract for active listings
      // For now, we'll use the existing API endpoints
      
      try {
        // Fetch sale listings from API
        const saleResponse = await fetch('/api/market-data?type=sales');
        if (saleResponse.ok) {
          const sales = await saleResponse.json();
          setActiveSaleListings(sales);
        }
        
        // Fetch rental listings from API
        const rentalResponse = await fetch('/api/market-data?type=rentals');
        if (rentalResponse.ok) {
          const rentals = await rentalResponse.json();
          setActiveRentalListings(rentals);
        }
      } catch (error) {
        console.error('Error fetching marketplace data from API:', error);
      }
      
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's owned tile IDs from TileCore contract
  const { data: userTileIds, refetch: refetchUserTileIds } = useContractRead({
    address: CONTRACT_ADDRESSES.TILE_CORE as `0x${string}`,
    abi: TILE_CORE_ABI,
    functionName: 'getUserOwnedTiles',
    args: address ? [address as `0x${string}`] : undefined,
  });

  // Fetch user's tiles
  const fetchUserTiles = async () => {
    if (!address || !userTileIds) return;
    
    setLoading(true);
    try {
      const tiles: Tile[] = [];
      
      console.log('Fetching tiles for address:', address);
      console.log('User tile IDs:', userTileIds);
      
      // Fetch each tile's details directly from the contract
      for (const tileId of userTileIds) {
        try {
          // Call getTile directly from the contract
          const { data: tileData } = useReadContract({
            address: CONTRACT_ADDRESSES.TILE_CORE as `0x${string}`,
            abi: TILE_CORE_ABI,
            functionName: 'getTile',
            args: [BigInt(tileId)],
          });
          
          console.log(`Tile ${tileId} contract data:`, tileData);
          
          if (tileData) {
            // getTile returns [owner, metadataUri, isNativePayment]
            const [owner, metadataUri, isNativePayment] = tileData;
            
            tiles.push({
              tileId: BigInt(tileId),
              owner: owner,
              metadataUri: metadataUri,
              isNativePayment: isNativePayment
            });
            
            console.log(`Tile ${tileId} metadataUri:`, metadataUri);
          } else {
            // Fallback to basic tile info
            tiles.push({
              tileId: BigInt(tileId),
              owner: address,
              metadataUri: '',
              isNativePayment: false
            });
          }
        } catch (error) {
          console.error(`Error processing tile ${tileId}:`, error);
          // Fallback to basic tile info
          tiles.push({
            tileId: BigInt(tileId),
            owner: address,
            metadataUri: '',
            isNativePayment: false
          });
        }
      }
      
      console.log('Found tiles with real metadata:', tiles);
      setUserTiles(tiles);
    } catch (error) {
      console.error('Error fetching user tiles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  useEffect(() => {
    if (address && userTileIds) {
      fetchUserTiles();
    }
  }, [address, userTileIds]);

  return {
    // State
    activeSaleListings,
    activeRentalListings,
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
  };
} 