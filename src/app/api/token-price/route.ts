import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const res = await fetch('https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0x71942200c579319c89c357b55a9d5c0e0ad2403e');
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
    }
    const data = await res.json();
    const price = data?.data?.attributes?.base_token_price_usd || null;
    const tokenName = data?.data?.attributes?.base_token?.name || null;

    // Calculate how many tokens for 7 USD
    if (price) {
      const tokensFor7USD = 7 / parseFloat(price);
      console.log(`Tokens needed for 7 USD: ${tokensFor7USD}`);
    }

    return NextResponse.json({ price, tokenName });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching price' }, { status: 500 });
  }
} 