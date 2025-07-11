import { NextRequest, NextResponse } from 'next/server';
import { SPRFD_ADDRESS, PEPU_ADDRESS, PENK_ADDRESS } from '../../../supportedTokens';

export async function GET(req: NextRequest) {
  try {
    // SPRFD uses PENK price (Pepe Unchained pool)
    const sprfdRes = await fetch('https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0x71942200c579319c89c357b55a9d5c0e0ad2403e');
    // PEPU uses its own price (ETH pool)
    const pepuRes = await fetch('https://api.geckoterminal.com/api/v2/networks/eth/pools/0xb1b10b05aa043dd8d471d4da999782bc694993e3ecbe8e7319892b261b412ed5');
    // PENK uses its own price (Pepe Unchained pool, example pool address)
    const penkRes = await fetch('https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0x71942200c579319c89c357b55a9d5c0e0ad2403e');

    let sprfdTokensFor7USD = null;
    let pepuTokensFor7USD = null;
    let penkTokensFor7USD = null;

    if (sprfdRes.ok) {
      const data = await sprfdRes.json();
      const price = data?.data?.attributes?.base_token_price_usd || null;
      if (price) {
        sprfdTokensFor7USD = 7 / parseFloat(price);
      }
    }
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
      [SPRFD_ADDRESS]: sprfdTokensFor7USD,
      [PEPU_ADDRESS]: pepuTokensFor7USD,
      [PENK_ADDRESS]: penkTokensFor7USD
    };
    return NextResponse.json(tokenAmounts);
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching price' }, { status: 500 });
  }
} 