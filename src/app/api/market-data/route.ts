import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Fetch market data from GeckoTerminal API
    const response = await fetch('https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0xb1ff9a6a353e7ada85a6a100b7992fde9de566f3');
    
    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }
    
    const data = await response.json();
    const poolData = data.data.attributes;
    
    // Use fdv_usd since market_cap_usd is null
    const marketCap = parseFloat(poolData.fdv_usd) || 0;
    
    console.log('Market data from GeckoTerminal:', {
      market_cap_usd: poolData.market_cap_usd,
      fdv_usd: poolData.fdv_usd,
      used_value: marketCap
    });
    
    return NextResponse.json({ 
      success: true, 
      data: {
        marketCap: marketCap,
        marketCapFormatted: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(marketCap)
      }
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch market data',
      data: {
        marketCap: 0,
        marketCapFormatted: '$0'
      }
    }, { status: 500 });
  }
} 