const express = require('express');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

// Store the auction file directly in the scripts directory
const AUCTION_FILE = path.join(__dirname, 'current_auction.json');
const CONTRACT_ADDRESS = '0x3B4Be35688BF620d8c808678D5CF22494FFD2c9B';
const CONTRACT_ABI = [
  "function refunds(address) view returns (uint256)",
  "function payoutAddress() view returns (address)"
];
const RPC_URL = 'https://rpc-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz';
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// Helper: Get next Thursday 16:50 UTC as a timestamp
function getNextThursdayAt1650UTC() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 4=Thu
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  let daysUntilThursday = (4 - day + 7) % 7;
  if (daysUntilThursday === 0 && (hour > 16 || (hour === 21 && minute >= 56))) {
    daysUntilThursday = 7;
  }
  const nextThursday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilThursday,
    21, 56, 0, 0
  ));
  return nextThursday.getTime();
}

function getDefaultAuctionTimes() {
  // Hardcoded: Thursday 16:50 UTC, 20 min duration
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 4=Thu
  let daysUntilThursday = (4 - day + 7) % 7;
  const thursday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilThursday,
    23, 20, 0, 0
  ));
  const startTime = thursday.getTime();
  const endTime = startTime + 20 * 60 * 1000;
  return { startTime, endTime };
}

function loadAuction() {
  if (!fs.existsSync(AUCTION_FILE)) {
    const now = Date.now();
    let { startTime, endTime } = getDefaultAuctionTimes();
    if (now >= startTime) {
      // Schedule for next week
      startTime += 7 * 24 * 60 * 60 * 1000;
      endTime += 7 * 24 * 60 * 60 * 1000;
    }
    const initial = {
      startTime,
      endTime,
      bids: [],
      highestBid: '0',
      highestBidder: null,
      state: 'pending',
    };
    fs.writeFileSync(AUCTION_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(AUCTION_FILE));
}

function saveAuction(data) {
  fs.writeFileSync(AUCTION_FILE, JSON.stringify(data, null, 2));
}

function getAuctionState(auction) {
  const now = Date.now();
  if (!auction.startTime || !auction.endTime) return 'pending';
  if (now < auction.startTime) return 'pending';
  if (now >= auction.startTime && now < auction.endTime) return 'active';
  return 'ended';
}

// Helper: Validate hex address
function isHexAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// API: Get current auction state (always dynamic)
app.get('/api/auction-state', (req, res) => {
  const auction = loadAuction();
  const state = getAuctionState(auction);
  res.json({ ...auction, state });
});

// API: Check refund eligibility
app.get('/api/refund-eligibility', async (req, res) => {
  const { address } = req.query;
  if (!address || !isHexAddress(address)) return res.status(400).json({ error: 'Valid hex address required' });
  try {
    const refund = await contract.refunds(address);
    res.json({ eligible: refund.gt(0), amount: refund.toString() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check refund' });
  }
});

// API: Check if address is payout wallet
app.get('/api/is-payout-wallet', async (req, res) => {
  const { address } = req.query;
  if (!address || !isHexAddress(address)) return res.status(400).json({ error: 'Valid hex address required' });
  try {
    const payout = await contract.payoutAddress();
    res.json({ isPayoutWallet: payout.toLowerCase() === address.toLowerCase() });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check payout wallet' });
  }
});

// API: Place a bid (offchain validation, not onchain)
app.post('/api/place-bid', (req, res) => {
  const { address, amount, metadataCID } = req.body;
  if (!address || !amount || !metadataCID) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const auction = loadAuction();
  auction.state = getAuctionState(auction);
  if (auction.state !== 'active') {
    return res.status(400).json({ error: 'Auction not active' });
  }
  if (ethers.BigNumber.from(amount).lte(ethers.BigNumber.from(auction.highestBid))) {
    return res.status(400).json({ error: 'Bid too low' });
  }
  // Add bid to JSON (actual onchain bid must be sent by frontend)
  const bid = {
    address,
    amount,
      metadataCID,
    timestamp: Date.now()
  };
  auction.bids.push(bid);
  auction.highestBid = amount;
  auction.highestBidder = address;
  saveAuction(auction);
  res.json({ ok: true, next: 'Send transaction to contract' });
});

// API: Start a new auction (optional, for admin)
app.post('/api/start-auction', (req, res) => {
  const { startTime, endTime } = req.body;
  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'Missing times' });
  }
  const auction = {
    startTime,
    endTime,
    bids: [],
    highestBid: '0',
    highestBidder: null,
    state: 'pending',
  };
  saveAuction(auction);
  res.json({ ok: true });
});

// API: End auction (optional, for admin)
app.post('/api/end-auction', (req, res) => {
  const auction = loadAuction();
  auction.state = 'ended';
  saveAuction(auction);
  res.json({ ok: true });
});

function getLiveAuctionState() {
  const auction = loadAuction();
  const now = Date.now();
  const state = getAuctionState(auction);
  let countdown = 0;
  if (state === 'pending') countdown = Math.max(0, auction.startTime - now);
  else if (state === 'active') countdown = Math.max(0, auction.endTime - now);
  return {
    ...auction,
    state,
    now,
    countdown,
  };
}

function broadcastAuctionState() {
  const data = JSON.stringify({ type: 'auction_update', payload: getLiveAuctionState() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

const PORT = 3001;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'auction_update', payload: getLiveAuctionState() }));
});

let lastState = null;
setInterval(() => {
  const auction = loadAuction();
  const now = Date.now();
  const state = getAuctionState(auction);
  if (auction.state !== state) {
    auction.state = state;
    saveAuction(auction);
  }
  console.log(`[Auction State] ${new Date(now).toISOString()} | State: ${state} | Countdown: ${state === 'pending' ? Math.max(0, auction.startTime - now) / 1000 : state === 'active' ? Math.max(0, auction.endTime - now) / 1000 : 0}s | Start: ${new Date(auction.startTime).toISOString()} | End: ${new Date(auction.endTime).toISOString()}`);
}, 1000);

server.listen(PORT, () => {
  console.log(`Auction backend (HTTP+WS) running on port ${PORT}`);
}); 