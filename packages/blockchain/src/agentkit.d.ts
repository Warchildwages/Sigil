// Type stub for optional CDP AgentKit dependency.
// agentkit.ts uses dynamic import() so the module is loaded at runtime only.
// This declaration keeps tsc happy without requiring the actual package.
declare module '@coinbase/cdp-agentkit-nodejs' {
  export class AgentKit {
    static configure(config: {
      apiKeyName: string;
      apiKeyPrivateKey: string;
      networkId?: string;
    }): Promise<AgentKit>;
    createWallet(options: { networkId: string }): Promise<{
      getAddress(): Promise<string>;
      signTransaction(tx: unknown): Promise<{ hash: string }>;
      sendTransaction(tx: unknown): Promise<{ hash: string }>;
      getBalance(): Promise<string>;
    }>;
  }
}
