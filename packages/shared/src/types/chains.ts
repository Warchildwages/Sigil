export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  easContractAddress?: string;
  arcanevmEnabled?: boolean;
  modularWalletPath: string;
  isTestnet: boolean;
  explorerUrl: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: 84532,
    name: 'Base Sepolia',
    modularWalletPath: '/baseSepolia',
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
    easContractAddress: '0x4200000000000000000000000000000000000021',
  },
  {
    chainId: 5042002,
    name: 'Arc Testnet',
    modularWalletPath: '/arcTestnet',
    isTestnet: true,
    explorerUrl: 'https://explorer.testnet.arc.circle.com',
    rpcUrl: 'https://rpc.testnet.arc.circle.com',
    arcanevmEnabled: false,
    // EAS not yet deployed on Arc Testnet — register schema when available
    // easContractAddress: '0x...',
  },
  {
    chainId: 8453,
    name: 'Base',
    modularWalletPath: '/base',
    isTestnet: false,
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
    easContractAddress: '0x4200000000000000000000000000000000000021',
  },
  {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    modularWalletPath: '/avalanche',
    isTestnet: false,
    explorerUrl: 'https://snowtrace.io',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    easContractAddress: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
  },
  {
    chainId: 43113,
    name: 'Avalanche Fuji Testnet',
    modularWalletPath: '/avalancheFuji',
    isTestnet: true,
    explorerUrl: 'https://testnet.snowtrace.io',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    easContractAddress: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
  },
];
