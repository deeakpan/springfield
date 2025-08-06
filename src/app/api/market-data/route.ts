import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Fetch market data from GeckoTerminal API
    const response = await fetch('https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0x71942200c579319c89c357b55a9d5c0e0ad2403e');
    
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