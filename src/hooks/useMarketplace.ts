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
  duration: bigint;
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
  // Add rental-specific fields
  isRentedByUser?: boolean;
  rentalData?: {
    pricePerDay: string;
    rentalStart: string;
    rentalEnd: string;
    isNativePayment: boolean;
  };
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

  // Get user's SPRING balance
  const { data: springBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.SPRING_TOKEN as `0x${string}`,
  });

  // Get user's native balance
  const { data: nativeBalance } = useBalance({
    address,
  });

  // Helper function to check SPRING token allowance
  const checkSpringAllowance = async (spenderAddress: string, amount: bigint) => {
    if (!address || !process.env.NEXT_PUBLIC_RPC_URL || !CONTRACT_ADDRESSES.SPRING_TOKEN) {
      return false;
    }

    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const springToken = new ethers.Contract(CONTRACT_ADDRESSES.SPRING_TOKEN, [
        {
          "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "address", "name": "spender", "type": "address" }
          ],
          "name": "allowance",
          "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "stateMutability": "view",
          "type": "function"
        }
      ], provider);

      const allowance = await springToken.allowance(address, spenderAddress);
      return allowance >= amount;
    } catch (error) {
      console.error('Error checking SPRING token allowance:', error);
      return false;
    }
  };

  // Helper functions for contract interactions
  const listTileForSaleAction = async (tileId: number, price: string, isNativePayment: boolean) => {
    try {
      console.log('Listing tile for sale:', { tileId, price, isNativePayment });
      console.log('Payment type:', isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRING)');
      
      if (!writeContractAsync) {
        throw new Error('Wallet not connected or writeContract not available');
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
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return hash; // Return the transaction hash for success
      
    } catch (error) {
      console.error('Error listing tile for sale:', error);
      throw error; // Re-throw the error so the modal can catch it
    }
  };

  const listTileForRentAction = async (tileId: number, pricePerDay: string, isNativePayment: boolean, duration: number) => {
    try {
      console.log('Listing tile for rent:', { tileId, pricePerDay, isNativePayment, duration });
      console.log('Payment type:', isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRING)');
      
      if (!writeContractAsync) {
        throw new Error('Wallet not connected or writeContract not available');
      }
      
      // Convert price to wei
      const priceInWei = parseEther(pricePerDay);
      
      // Call the contract function with duration parameter
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'listTileForRent',
        args: [BigInt(tileId), priceInWei, BigInt(duration), isNativePayment],
      });
      
      console.log('Transaction hash:', hash);
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return hash; // Return the transaction hash for success
      
    } catch (error) {
      console.error('Error listing tile for rent:', error);
      throw error; // Re-throw the error so the modal can catch it
    }
  };

  const buyListedTileAction = async (tileId: number, price: string, isNativePayment: boolean) => {
    try {
      console.log('Buying listed tile:', { tileId, price, isNativePayment });
      console.log('Payment type:', isNativePayment ? 'NATIVE (PEPU)' : 'TOKEN (SPRING)');
      
      if (!writeContractAsync) {
        throw new Error('Wallet not connected or writeContract not available');
      }
      
      // Convert price to wei
      const priceInWei = parseEther(price);
      
      // For SPRING token purchases, we need to approve the marketplace contract first
      if (!isNativePayment) {
        console.log('Checking SPRING token allowance...');
        
        // Check if user has already approved enough tokens
        const hasAllowance = await checkSpringAllowance(CONTRACT_ADDRESSES.MARKETPLACE, priceInWei);
        
        if (!hasAllowance) {
          console.log('Approving SPRING token spending for marketplace contract...');
          
          // First, approve the marketplace contract to spend SPRING tokens
          const approveHash = await writeContractAsync({
            address: CONTRACT_ADDRESSES.SPRING_TOKEN as `0x${string}`,
            abi: [
              {
                "inputs": [
                  { "internalType": "address", "name": "spender", "type": "address" },
                  { "internalType": "uint256", "name": "amount", "type": "uint256" }
                ],
                "name": "approve",
                "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`, priceInWei],
          });
          
          console.log('Approval transaction hash:', approveHash);
          
          // Wait for approval to be mined
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('SPRING token approval completed');
        } else {
          console.log('SPRING token allowance already sufficient');
        }
      }
      
      // Now call the marketplace contract to buy the tile
      console.log('Calling marketplace contract to buy tile...');
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
        abi: TILE_MARKETPLACE_ABI,
        functionName: 'buyListedTile',
        args: [BigInt(tileId)],
        value: isNativePayment ? priceInWei : BigInt(0),
        gas: BigInt(300000),
      });
      
      console.log('Buy transaction hash:', hash);
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Purchase completed successfully
      console.log('✅ Tile purchase completed successfully');
      
      return hash; // Return the transaction hash for success
      
    } catch (error) {
      console.error('Error buying listed tile:', error);
      throw error; // Re-throw the error so the modal can catch it
    }
  };

  const rentTileAction = async (tileId: number) => {
    try {
      console.log('Renting tile:', { tileId });
      console.log('writeContract function available:', !!writeContractAsync);
      console.log('Contract address:', CONTRACT_ADDRESSES.MARKETPLACE);
      console.log('Contract ABI functions:', TILE_MARKETPLACE_ABI.filter(item => item.type === 'function').map(f => f.name));
      
      if (!writeContractAsync) {
        throw new Error('Wallet not connected or writeContract not available');
      }
      
      if (!CONTRACT_ADDRESSES.MARKETPLACE || CONTRACT_ADDRESSES.MARKETPLACE === "0x...") {
        throw new Error('Contract address not configured');
      }
      
      // We need to get the rental listing details to calculate the total cost
      // The smart contract expects the exact amount to be sent as msg.value
      console.log('Getting rental listing details to calculate cost...');
      
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const marketplace = new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, TILE_MARKETPLACE_ABI, provider);
      
      // Get the rental listing details
      const rentalListing = await marketplace.rentalListings(tileId);
      console.log('Rental listing details:', rentalListing);
      
      if (!rentalListing.isActive) {
        throw new Error('Rental listing is not active');
      }
      
      // Use the duration set by the owner and ensure proper types
      const duration = BigInt(rentalListing.duration || 1);
      const pricePerDay = BigInt(rentalListing.pricePerDay || 0);
      console.log('Rental duration set by owner:', duration.toString());
      
      // Calculate total cost: price per day * duration
      const totalCost = pricePerDay * duration;
      console.log('Total rental cost:', totalCost.toString());
      
      // Check if it's native payment (PEPU) or token payment (SPRING)
      if (rentalListing.isNativePayment) {
        // For native payment, we need to send the exact amount as msg.value
        console.log('Native payment (PEPU) - sending value:', totalCost.toString());
        
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
          abi: TILE_MARKETPLACE_ABI,
          functionName: 'rentTile',
          args: [BigInt(tileId)],
          value: totalCost as bigint, // Send the exact rental cost
          gas: BigInt(300000), // Set reasonable gas limit to prevent excessive fees
        });
        
        console.log('Rent transaction hash:', hash);
        return hash;
      } else {
        // For SPRING token payment, we need to approve first, then call without value
        console.log('SPRING token payment - checking allowance...');
        
        // Check if user has already approved enough tokens
        const hasAllowance = await checkSpringAllowance(CONTRACT_ADDRESSES.MARKETPLACE, totalCost);
        
        if (!hasAllowance) {
          console.log('Approving SPRING token spending for marketplace contract...');
          
          // First, approve the marketplace contract to spend SPRING tokens
          const approveHash = await writeContractAsync({
            address: CONTRACT_ADDRESSES.SPRING_TOKEN as `0x${string}`,
            abi: [
              {
                "inputs": [
                  { "internalType": "address", "name": "spender", "type": "address" },
                  { "internalType": "uint256", "name": "amount", "type": "uint256" }
                ],
                "name": "approve",
                "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`, totalCost as bigint],
          });
          
          console.log('Approval transaction hash:', approveHash);
          
          // Wait for approval to be mined
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('SPRING token approval completed');
        } else {
          console.log('SPRING token allowance already sufficient');
        }
        
        // Now call the rental function without sending value
        console.log('Calling rental function with SPRING tokens...');
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.MARKETPLACE as `0x${string}`,
          abi: TILE_MARKETPLACE_ABI,
          functionName: 'rentTile',
          args: [BigInt(tileId)],
          gas: BigInt(300000), // Set reasonable gas limit to prevent excessive fees
        });
        
        console.log('Rent transaction hash:', hash);
        return hash;
      }
      
    } catch (error) {
      console.error('Error renting tile:', error);
      throw error; // Re-throw the error so the modal can handle it
    }
  };

  const cancelSaleListingAction = async (tileId: number) => {
    console.log('🚨 cancelSaleListingAction CALLED! 🚨');
    console.log('tileId:', tileId);
    console.log('Function is being executed!');
    
    try {
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
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return hash; // Return the transaction hash for success
      
    } catch (error) {
      console.error('Error canceling sale listing:', error);
      throw error; // Re-throw the error so the modal can catch it
    }
  };

  const cancelRentalListingAction = async (tileId: number) => {
    console.log('🚨 cancelRentalListingAction CALLED! 🚨');
    console.log('tileId:', tileId);
    console.log('Function is being executed!');
    
    try {
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
      
      return hash; // Return the transaction hash for success
      
    } catch (error) {
      console.error('Error canceling rental listing:', error);
      throw error; // Re-throw the error so the modal can catch it
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
      
      // Step 1: Get only the listed tile IDs
      console.log('Getting sale listing IDs...');
      const saleListingIds = await marketplace.getAllSaleListings();
      console.log('Sale listing IDs:', saleListingIds);
      
      console.log('Getting rental listing IDs...');
      const rentalListingIds = await marketplace.getAllRentalListings();
      console.log('Rental listing IDs:', rentalListingIds);
      
      // Step 2: Get details only for listed tiles
      console.log('Getting details for sale listings...');
      const saleListings: SaleListing[] = [];
      if (saleListingIds && saleListingIds.length > 0) {
        const saleDetails = await Promise.all(
          saleListingIds.map(async (tileId: bigint) => {
          try {
            // Get the actual sale listing to get the correct payment type
            const saleListing = await marketplace.saleListings(tileId);
            console.log(`Sale listing details for tile ${tileId}:`, {
              tileId: tileId.toString(),
              seller: saleListing.seller,
              price: saleListing.price.toString(),
              isActive: saleListing.isActive,
              isNativePayment: saleListing.isNativePayment
            });
            return {
                tileId: tileId,
                seller: saleListing.seller,
                price: BigInt(saleListing.price),
                isActive: saleListing.isActive,
                isNativePayment: saleListing.isNativePayment
            };
          } catch (error) {
              console.error(`Error fetching details for sale tile ${tileId}:`, error);
            return null;
          }
        })
      );
        saleListings.push(...saleDetails.filter(Boolean));
      }
      
      console.log('Getting details for rental listings...');
      const rentalListings: RentalListing[] = [];
      if (rentalListingIds && rentalListingIds.length > 0) {
        const rentalDetails = await Promise.all(
          rentalListingIds.map(async (tileId: bigint) => {
            try {
              // Get the actual rental listing to get the correct payment type
              const rentalListing = await marketplace.rentalListings(tileId);
              console.log(`Rental listing details for tile ${tileId}:`, {
                tileId: tileId.toString(),
                owner: rentalListing.owner,
                pricePerDay: rentalListing.pricePerDay.toString(),
                isActive: rentalListing.isActive,
                isNativePayment: rentalListing.isNativePayment,
                currentRenter: rentalListing.currentRenter,
                rentalEnd: rentalListing.rentalEnd.toString()
              });
              
              // Only include tiles that are active AND not currently rented
              // A tile is available for rent if:
              // 1. isActive is true (listed for rent)
              // 2. currentRenter is address(0) (no active renter)
              // 3. OR rental has expired (block.timestamp >= rentalEnd)
              const now = BigInt(Math.floor(Date.now() / 1000)); // Current timestamp in seconds
              const isAvailableForRent = rentalListing.isActive && 
                (rentalListing.currentRenter === '0x0000000000000000000000000000000000000000' || 
                 now >= rentalListing.rentalEnd);
              
              if (!isAvailableForRent) {
                console.log(`Tile ${tileId} is not available for rent (active: ${rentalListing.isActive}, currentRenter: ${rentalListing.currentRenter}, rentalEnd: ${rentalListing.rentalEnd})`);
                return null; // Skip this tile
              }
              
              return {
                tileId: tileId,
                owner: rentalListing.owner,
                pricePerDay: BigInt(rentalListing.pricePerDay),
                duration: BigInt(rentalListing.duration),
                isActive: rentalListing.isActive,
                isNativePayment: rentalListing.isNativePayment,
                currentRenter: rentalListing.currentRenter,
                rentalStart: BigInt(0), // Not available in getTileDetails
                rentalEnd: BigInt(rentalListing.rentalEnd)
              };
            } catch (error) {
              console.error(`Error fetching details for rental tile ${tileId}:`, error);
              return null;
            }
          })
        );
        rentalListings.push(...rentalDetails.filter(Boolean));
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
            // Get the actual sale listing to get the correct payment type
            try {
              const saleListing = await marketplace.saleListings(tileId);
              userSaleListings.push({
                tileId: BigInt(tileId),
                seller: details.owner,
                price: BigInt(details.salePrice),
                isActive: details.isForSale,
                isNativePayment: saleListing.isNativePayment
              });
            } catch (error) {
              console.error(`Error fetching sale listing for tile ${tileId}:`, error);
              // Fallback to tile details
              userSaleListings.push({
                tileId: BigInt(tileId),
                seller: details.owner,
                price: BigInt(details.salePrice),
                isActive: details.isForSale,
                isNativePayment: details.isNativePayment
              });
            }
          }
          
          // Check if tile is listed for rent
          if (details.isForRent) {
            // Get the actual rental listing to get the correct payment type
            try {
              const rentalListing = await marketplace.rentalListings(tileId);
              userRentalListings.push({
                tileId: BigInt(tileId),
                owner: details.owner,
                pricePerDay: BigInt(details.rentPricePerDay),
                duration: BigInt(rentalListing.duration),
                isActive: details.isForRent,
                isNativePayment: rentalListing.isNativePayment,
                currentRenter: rentalListing.currentRenter,
                rentalStart: BigInt(0), // Not available in getTileDetails
                rentalEnd: BigInt(details.rentalEnd)
              });
            } catch (error) {
              console.error(`Error fetching rental listing for tile ${tileId}:`, error);
              // Fallback to tile details
              userRentalListings.push({
                tileId: BigInt(tileId),
                owner: details.owner,
                pricePerDay: BigInt(details.rentPricePerDay),
                duration: BigInt(details.rentDuration || 0),
                isActive: details.isForRent,
                isNativePayment: details.isNativePayment,
                currentRenter: details.currentRenter,
                rentalStart: BigInt(0), // Not available in getTileDetails
                rentalEnd: BigInt(details.rentalEnd)
              });
            }
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
      
      // Step 2: Get user's currently rented tile IDs
      console.log('Getting user rented tile IDs...');
      console.log('Using marketplace contract address:', CONTRACT_ADDRESSES.MARKETPLACE);
      let userRentedTileIds: any[] = [];
      
      try {
        // getUserRentalListings returns tile IDs that the user has listed for rent, not tiles they're renting
        // We need to get all rental listings and filter by current renter
        const allRentalListingIds = await marketplace.getAllRentalListings();
        console.log('All rental listing IDs:', allRentalListingIds);
        if (allRentalListingIds && allRentalListingIds.length > 0) {
          console.log(`Checking ${allRentalListingIds.length} rental listings for user ${address}...`);
          const rentalDetails = await Promise.all(
            allRentalListingIds.map(async (tileId: bigint) => {
              try {
                const rentalListing = await marketplace.rentalListings(tileId);
                console.log(`Tile ${tileId} rental details:`, {
                  currentRenter: rentalListing.currentRenter,
                  userAddress: address,
                  isMatch: rentalListing.currentRenter === address,
                  rentalEnd: rentalListing.rentalEnd.toString(),
                  currentTime: Math.floor(Date.now() / 1000),
                  isExpired: BigInt(rentalListing.rentalEnd) <= BigInt(Math.floor(Date.now() / 1000))
                });
                
                                 if (rentalListing.currentRenter === address && 
                     rentalListing.currentRenter !== '0x0000000000000000000000000000000000000000' &&
                     BigInt(rentalListing.rentalEnd) > BigInt(Math.floor(Date.now() / 1000))) {
                   console.log(`✅ Tile ${tileId} is rented by user ${address}`);
                   console.log(`📅 Rental end details for tile ${tileId}:`, {
                     rentalEnd: rentalListing.rentalEnd.toString(),
                     rentalEndNumber: Number(rentalListing.rentalEnd),
                     currentTime: Math.floor(Date.now() / 1000),
                     isValidTimestamp: Number(rentalListing.rentalEnd) > 0 && Number(rentalListing.rentalEnd) < 9999999999
                   });
                   return {
                     tileId: tileId,
                     currentRenter: rentalListing.currentRenter,
                     rentalStart: rentalListing.rentalStart,
                     rentalEnd: rentalListing.rentalEnd,
                     pricePerDay: rentalListing.pricePerDay,
                     isNativePayment: rentalListing.isNativePayment
                   };
                 } else {
                   console.log(`❌ Tile ${tileId} is not rented by user (currentRenter: ${rentalListing.currentRenter}, expired: ${BigInt(rentalListing.rentalEnd) <= BigInt(Math.floor(Date.now() / 1000))})`);
                 }
                return null;
              } catch (error) {
                console.warn(`Error getting rental details for tile ${tileId}:`, error);
                return null;
              }
            })
          );
          userRentedTileIds = rentalDetails.filter(Boolean);
          console.log('Found rentals where user is current renter:', userRentedTileIds);
        } else {
          console.log('No rental listings found in the marketplace');
        }
      } catch (error) {
        console.warn('Failed to get rental listings:', error);
        userRentedTileIds = [];
      }
      
      // Filter only currently active rentals (where user is the current renter)
      const activeRentals = userRentedTileIds.filter((rental: any) => {
        const isCurrentRenter = rental.currentRenter === address;
        const isNotZeroAddress = rental.currentRenter !== '0x0000000000000000000000000000000000000000';
        const isNotExpired = BigInt(rental.rentalEnd) > BigInt(Math.floor(Date.now() / 1000));
        
        console.log(`Rental ${rental.tileId}: currentRenter=${rental.currentRenter}, address=${address}, isCurrentRenter=${isCurrentRenter}, isNotZeroAddress=${isNotZeroAddress}, isNotExpired=${isNotExpired}`);
        
        return isCurrentRenter && isNotZeroAddress && isNotExpired;
      });
      console.log('Active rentals for user:', activeRentals);
      
      // If we couldn't get rental data, just proceed with owned tiles
      if (userRentedTileIds.length === 0) {
        console.log('No rental data available, proceeding with owned tiles only');
      }
      
      // Combine owned and rented tiles
      // userOwnedTileIds contains full tile objects, activeRentals contains rental info
      const allTileIds = [...userOwnedTileIds];
      
      // Add rented tiles that the user doesn't own
      for (const rental of activeRentals) {
        const isAlreadyIncluded = userOwnedTileIds.some((ownedTile: any) => 
          ownedTile.tileId.toString() === rental.tileId.toString()
        );
        if (!isAlreadyIncluded) {
          allTileIds.push({ tileId: rental.tileId });
        }
      }
      
      if (allTileIds.length === 0) {
        console.log('No tiles owned or rented by user');
        setUserTiles([]);
        return;
      }
      
      // Step 3: Get details for each tile
      console.log('Getting details for each tile...');
      const allTilesDetails = await Promise.all(
        allTileIds.map(async (tileData: any) => {
          try {
            const tileId = tileData.tileId;
            const details = await marketplace.getTileDetails(tileId);
            
                         // Check if this tile is currently rented by the user
             const isRentedByUser = activeRentals.some((rental: any) => 
               rental.tileId.toString() === tileId.toString()
             );
             
             console.log(`Tile ${tileId} - isRentedByUser: ${isRentedByUser}`);
             if (isRentedByUser) {
               console.log(`✅ Tile ${tileId} marked as rented by user`);
             }
             
             // Find the rental data if it exists
             const rentalData = activeRentals.find((rental: any) => 
               rental.tileId.toString() === tileId.toString()
             );
             
             if (rentalData) {
               console.log(`📋 Found rental data for tile ${tileId}:`, rentalData);
               console.log(`🔍 Rental end details for tile ${tileId}:`, {
                 rentalEnd: rentalData.rentalEnd,
                 rentalEndType: typeof rentalData.rentalEnd,
                 rentalEndString: rentalData.rentalEnd.toString(),
                 rentalEndNumber: Number(rentalData.rentalEnd),
                 isValidTimestamp: Number(rentalData.rentalEnd) > 0 && Number(rentalData.rentalEnd) < 9999999999
               });
             }
            
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
              },
              isRentedByUser,
              rentalData: rentalData ? {
                pricePerDay: rentalData.pricePerDay.toString(),
                rentalStart: rentalData.rentalStart.toString(),
                rentalEnd: rentalData.rentalEnd.toString(),
                isNativePayment: rentalData.isNativePayment
              } : undefined
            };
          } catch (error) {
            console.error(`Error fetching details for tile ${tileData.tileId}:`, error);
            return null;
          }
        })
      );
      
      // Step 4: Process each tile and fetch its metadata
      const processedTiles: Tile[] = [];
      
      for (const tileData of allTilesDetails) {
        if (tileData) {
          const { tileId, details, isRentedByUser, rentalData } = tileData;
          
          let metadata = null;
          let imageCID = null;
          
          if (details.metadataUri) {
            try {
              console.log(`Fetching metadata for tile ${tileId} from: ${details.metadataUri}`);
              let metadataUrl = details.metadataUri as string;
              if (metadataUrl.startsWith('ipfs://')) {
                metadataUrl = `https://gateway.lighthouse.storage/ipfs/${metadataUrl.replace('ipfs://', '')}`;
              }
              const metadataResponse = await fetch(metadataUrl);
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
             // Use rental data if available, otherwise fall back to details
             rentalEnd: rentalData ? BigInt(rentalData.rentalEnd) : BigInt(details.rentalEnd),
             // Add metadata fields
             name: metadata?.name || `Tile ${tileId}`,
             description: metadata?.description || '',
             imageCID: imageCID,
             metadata: metadata,
             socials: metadata?.socials || {},
             website: metadata?.website || null,
             userType: metadata?.userType || 'user',
             address: metadata?.address || details.owner,
             // Add rental-specific fields
             isRentedByUser,
             rentalData: rentalData || undefined
           };
           
           // Debug: Log the final rental end value
           if (isRentedByUser) {
             console.log(`🎯 Final tile object for ${tileId}:`, {
               tileId: tile.tileId.toString(),
               isRentedByUser: tile.isRentedByUser,
               rentalEnd: tile.rentalEnd.toString(),
               rentalEndType: typeof tile.rentalEnd,
               rentalData: tile.rentalData
             });
           }
          
          if (isRentedByUser) {
            console.log(`🎯 Created tile object for ${tileId} with isRentedByUser=true:`, {
              tileId: tile.tileId.toString(),
              isRentedByUser: tile.isRentedByUser,
              rentalData: tile.rentalData
            });
          }
          
          processedTiles.push(tile);
        }
      }
      
      console.log('Processed user tiles with metadata:', processedTiles);
      console.log('Tiles with isRentedByUser=true:', processedTiles.filter(tile => tile.isRentedByUser));
      console.log('Tiles with isRentedByUser=false:', processedTiles.filter(tile => !tile.isRentedByUser));
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
     springBalance: springBalance ? formatEther(springBalance.value) : '0',
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