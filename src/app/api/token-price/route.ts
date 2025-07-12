import { NextRequest, NextResponse } from 'next/server';
import { PENK_ADDRESS } from '../../../supportedTokens';

export async function GET(req: NextRequest) {
  try {
    // Only fetch and return prices for PEPU (native) and PENK
    // For PEPU, use https://api.geckoterminal.com/api/v2/networks/eth/pools/0xb1b10b05aa043dd8d471d4da999782bc694993e3ecbe8e7319892b261b412ed5
    // For PENK, use its current pool
    const pepuRes = await fetch('https://api.geckoterminal.com/api/v2/networks/eth/pools/0xb1b10b05aa043dd8d471d4da999782bc694993e3ecbe8e7319892b261b412ed5');
    const penkRes = await fetch('https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0x71942200c579319c89c357b55a9d5c0e0ad2403e');

    let pepuTokensFor7USD = null;
    let penkTokensFor7USD = null;

    if (pepuRes.ok) {
      const data = await pepuRes.json();
      const price = data?.data?.attributes?.base_token_price_usd || null;
      if (price) {
        pepuTokensFor7USD = 7 / parseFloat(price);
    }
    }
    if (penkRes.ok) {
      const data = await penkRes.json();
    const price = data?.data?.attributes?.base_token_price_usd || null;
      if (price) {
        penkTokensFor7USD = 7 / parseFloat(price);
      }
    }

    // Build mapping
    const tokenAmounts = {
      PEPU: pepuTokensFor7USD,
      [PENK_ADDRESS]: penkTokensFor7USD
    };
    return NextResponse.json(tokenAmounts);
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching price' }, { status: 500 });
  }
} 