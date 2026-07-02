// EAS (Ethereum Attestation Service) client — attestation data encoding, on-chain attestation via Circle bundler, and verification
// Uses @ethereum-attestation-service/eas-sdk SchemaEncoder for ABI encoding.
// Attestation submission happens via the Circle Modular Wallet bundler (gasless, paymaster-sponsored).

import type { SignetAttestationData } from '@sigil/shared';
import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { EAS_CONTRACT_ADDRESS, SIGNET_EAS_SCHEMA, SUPPORTED_CHAINS } from '@sigil/shared';
import { encodeFunctionData, keccak256, encodeAbiParameters } from 'viem';
import type { SmartAccount } from 'viem/account-abstraction';
import { sendUserOp } from './circle.js';
import type { SupportedChainId } from './circle.js';
import { encodeAttestationData } from './eas-schema.js';

export interface EASAttestationResult {
  uid: string;
  txHash: string;
}

/**
 * Get the EAS contract address for a given chain.
 */
export function getEASAddress(chainId: number): string {
  const address = EAS_CONTRACT_ADDRESS[chainId];
  if (!address) {
    throw new Error(
      `EAS not deployed on chain ${chainId}. Add the contract address to constants.`,
    );
  }
  return address;
}

/**
 * Get the modular wallet path for a given chain.
 */
function getModularWalletPath(chainId: number): string {
  const chain = SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain.modularWalletPath;
}

/**
 * Encode attestation data using the official EAS SchemaEncoder.
 * Schema: "bytes32 contentHash, string title, address signer, uint256 signedAt, uint8 privacyMode, uint8 signingMethod, bytes32 supplementaryProof"
 */
export function encodeSignetAttestationData(data: SignetAttestationData): `0x${string}` {
  const schemaEncoder = new SchemaEncoder(SIGNET_EAS_SCHEMA);
  const encoded = schemaEncoder.encodeData([
    { name: 'contentHash', value: data.contentHash as `0x${string}`, type: 'bytes32' },
    { name: 'title', value: data.title, type: 'string' },
    { name: 'signer', value: data.signer, type: 'address' },
    { name: 'signedAt', value: data.signedAt, type: 'uint256' },
    { name: 'privacyMode', value: BigInt(data.privacyMode), type: 'uint8' },
    { name: 'signingMethod', value: BigInt(data.signingMethod), type: 'uint8' },
    {
      name: 'supplementaryProof',
      value: data.supplementaryProof as `0x${string}`,
      type: 'bytes32',
    },
  ]);
  return encoded as `0x${string}`;
}

/**
 * Build the EAS attestation transaction call data.
 * Uses viem encodeFunctionData for correct ABI encoding.
 *
 * @param schemaUid - The EAS schema UID (registered on-chain)
 * @param data - Signet attestation data
 * @param recipient - The attestation recipient address (zero address for self-attestation)
 */
export function buildAttestationCallData(
  schemaUid: string,
  data: SignetAttestationData,
  recipient: `0x${string}`,
): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  const encodedData = encodeSignetAttestationData(data);

  const easAddress = getEASAddress(84532) as `0x${string}`; // Default: Base Sepolia (overridden by chainId in attestOnChain)

  // Encode the EAS attest() call with the full attestation request struct
  // struct AttestationRequestData {
  //   address recipient;
  //   uint64 expirationTime;
  //   bool revocable;
  //   bytes32 refUID;
  //   bytes data;
  //   uint256 value;
  // }
  // function attest(AttestationRequest calldata request) external payable returns (bytes32)
  const callData = encodeFunctionData({
    abi: [
      {
        name: 'attest',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          {
            name: 'request',
            type: 'tuple',
            components: [
              { name: 'schema', type: 'bytes32' },
              { name: 'data', type: 'tuple', components: [
                { name: 'recipient', type: 'address' },
                { name: 'expirationTime', type: 'uint64' },
                { name: 'revocable', type: 'bool' },
                { name: 'refUID', type: 'bytes32' },
                { name: 'data', type: 'bytes' },
                { name: 'value', type: 'uint256' },
              ] },
            ],
          },
        ],
        outputs: [{ name: '', type: 'bytes32' }],
      },
    ],
    args: [
      {
        schema: schemaUid as `0x${string}`,
        data: {
          recipient,
          expirationTime: 0n, // No expiration
          revocable: false,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
          data: encodedData,
          value: 0n,
        },
      },
    ],
  });

  return {
    to: easAddress,
    data: callData,
    value: 0n,
  };
}

/**
 * Submit an attestation on-chain via the Circle bundler (gasless).
 * This is the primary production call path.
 *
 * @param chainId - EVM chain ID (84532 for Base Sepolia)
 * @param schemaUid - Registered EAS schema UID
 * @param data - Signet attestation data
 * @param recipient - Attestation recipient (zero address for self-attestation)
 * @param account - Circle Smart Account
 * @returns The attestation UID and transaction hash
 */
export async function attestOnChain(
  chainId: number,
  schemaUid: string,
  data: SignetAttestationData,
  recipient: `0x${string}`,
  account: SmartAccount,
): Promise<EASAttestationResult> {
  const easAddress = getEASAddress(chainId) as `0x${string}`;
  const modularWalletPath = getModularWalletPath(chainId);

  // Build attestation with chain-specific EAS address
  const encodedData = encodeSignetAttestationData(data);
  const callData = encodeFunctionData({
    abi: [
      {
        name: 'attest',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          {
            name: 'request',
            type: 'tuple',
            components: [
              { name: 'schema', type: 'bytes32' },
              { name: 'data', type: 'tuple', components: [
                { name: 'recipient', type: 'address' },
                { name: 'expirationTime', type: 'uint64' },
                { name: 'revocable', type: 'bool' },
                { name: 'refUID', type: 'bytes32' },
                { name: 'data', type: 'bytes' },
                { name: 'value', type: 'uint256' },
              ] },
            ],
          },
        ],
        outputs: [{ name: '', type: 'bytes32' }],
      },
    ],
    args: [
      {
        schema: schemaUid as `0x${string}`,
        data: {
          recipient,
          expirationTime: 0n,
          revocable: false,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
          data: encodedData,
          value: 0n,
        },
      },
    ],
  });

  const userOpHash = await sendUserOp(
    chainId as SupportedChainId,
    modularWalletPath,
    account,
    [{ to: easAddress, data: callData, value: 0n }],
  );

  // Derive the attestation UID as the EAS contract computes it:
  // keccak256(abi.encode(schemaUid, recipient, data))
  // This matches what the contract emits in the Attested event.
  const uidBytes = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'bytes' },
      ],
      [schemaUid as `0x${string}`, recipient, encodedData],
    ),
  );
  const uid = `eip155:${chainId}:${uidBytes}`;

  return { uid, txHash: userOpHash };
}

/**
 * Decode attestation data from raw EAS attestation bytes.
 * Used when verifying an existing attestation by fetching its raw data from the contract.
 */
export function decodeSignetAttestationData(rawData: `0x${string}`): SignetAttestationData | null {
  try {
    const schemaEncoder = new SchemaEncoder(SIGNET_EAS_SCHEMA);
    const decoded = schemaEncoder.decodeData(rawData);

    const contentHash =
      (decoded.find((d) => d.name === 'contentHash')?.value?.value as string) ?? '';
    const title = (decoded.find((d) => d.name === 'title')?.value?.value as string) ?? '';
    const signer =
      (decoded.find((d) => d.name === 'signer')?.value?.value as string) ?? '';
    const signedAt = (decoded.find((d) => d.name === 'signedAt')?.value?.value as bigint) ?? 0n;
    const privacyMode = Number(
      decoded.find((d) => d.name === 'privacyMode')?.value?.value ?? 0,
    );
    const signingMethod = Number(
      decoded.find((d) => d.name === 'signingMethod')?.value?.value ?? 0,
    );
    const supplementaryProof =
      (decoded.find((d) => d.name === 'supplementaryProof')?.value?.value as string) ??
      '0x0000000000000000000000000000000000000000000000000000000000000000';

    return {
      contentHash: contentHash.startsWith('0x') ? contentHash : `0x${contentHash}`,
      title,
      signer,
      signedAt,
      privacyMode,
      signingMethod,
      supplementaryProof,
    };
  } catch {
    return null;
  }
}

// Re-export encoding utilities
export { encodeAttestationData } from './eas-schema.js';
