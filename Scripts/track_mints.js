import { createPublicClient, http, parseAbiItem } from 'viem';

// Robinhood Chain definition
const robinhoodChain = {
  id: 4663,
  name: 'Robinhood Chain',
  network: 'robinhood',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ROBINHOOD_RPC_URL || 'https://rpc.robinhood.com'] },
  },
};

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
});

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function scanRecentMints(blockRange = 100n) {
  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - blockRange;

  const logs = await client.getLogs({
    event: TRANSFER_EVENT,
    args: { from: ZERO_ADDRESS },
    fromBlock,
    toBlock: currentBlock,
  });

  const stats = new Map();

  for (const log of logs) {
    const contract = log.address.toLowerCase();
    const recipient = log.args.to.toLowerCase();

    if (!stats.has(contract)) {
      stats.set(contract, {
        contract,
        totalMints: 0,
        uniqueMinters: new Set(),
        firstSeenBlock: log.blockNumber,
        lastSeenBlock: log.blockNumber,
      });
    }

    const item = stats.get(contract);
    item.totalMints += 1;
    item.uniqueMinters.add(recipient);
    item.lastSeenBlock = log.blockNumber;
  }

  const results = Array.from(stats.values()).map((s) => ({
    contract: s.contract,
    totalMints: s.totalMints,
    uniqueMinters: s.uniqueMinters.size,
    mintVelocity: s.totalMints / Number(blockRange),
  }));

  // Sort by highest velocity
  results.sort((a, b) => b.totalMints - a.totalMints);
  return results;
}

