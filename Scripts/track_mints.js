
import { createPublicClient, http, parseAbiItem } from 'viem';

// Robinhood Chain definition (Chain ID 4663)
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

// ERC-721 / ERC-1155 Transfer event signatures
const ERC721_TRANSFER = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);
const ERC1155_TRANSFER_SINGLE = parseAbiItem(
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)'
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Scan recent blocks on Robinhood Chain for active mint events.
 * @param {bigint} blockRange - Number of recent blocks to scan (default 200)
 */
export async function getActiveRobinhoodMints(blockRange = 200n) {
  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock > blockRange ? currentBlock - blockRange : 0n;

  // Query ERC-721 mint logs
  const erc721Logs = await client.getLogs({
    event: ERC721_TRANSFER,
    args: { from: ZERO_ADDRESS },
    fromBlock,
    toBlock: currentBlock,
  }).catch(() => []);

  // Query ERC-1155 mint logs
  const erc1155Logs = await client.getLogs({
    event: ERC1155_TRANSFER_SINGLE,
    args: { from: ZERO_ADDRESS },
    fromBlock,
    toBlock: currentBlock,
  }).catch(() => []);

  const allLogs = [...erc721Logs, ...erc1155Logs];
  if (allLogs.length === 0) {
    return {
      scannedBlocks: Number(blockRange),
      latestBlock: Number(currentBlock),
      activeMints: [],
    };
  }

  const contractMap = new Map();

  for (const log of allLogs) {
    const contract = log.address.toLowerCase();
    const minter = (log.args.to || '').toLowerCase();

    if (!contractMap.has(contract)) {
      contractMap.set(contract, {
        contract,
        recentMints: 0,
        uniqueMinters: new Set(),
        firstBlock: log.blockNumber,
        latestBlock: log.blockNumber,
        txHashes: new Set(),
      });
    }

    const entry = contractMap.get(contract);
    entry.recentMints += 1;
    if (minter) entry.uniqueMinters.add(minter);
    if (log.transactionHash) entry.txHashes.add(log.transactionHash);
    if (log.blockNumber > entry.latestBlock) {
      entry.latestBlock = log.blockNumber;
    }
  }

  // Filter and format active mints
  const activeMints = Array.from(contractMap.values()).map((entry) => ({
    contract: entry.contract,
    recentMints: entry.recentMints,
    uniqueMinters: entry.uniqueMinters.size,
    latestMintBlock: Number(entry.latestBlock),
    blocksSinceLastMint: Number(currentBlock - entry.latestBlock),
    velocityPerBlock: (entry.recentMints / Number(blockRange)).toFixed(3),
    openSeaUrl: `https://opensea.io/assets/robinhood/${entry.contract}`,
  }));

  // Sort by highest activity/velocity
  activeMints.sort((a, b) => b.recentMints - a.recentMints);

  return {
    scannedBlocks: Number(blockRange),
    latestBlock: Number(currentBlock),
    activeMints,
  };
}
