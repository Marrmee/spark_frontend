'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useState,
  useRef,
} from 'react';
import { initSilk, SilkEthereumProviderInterface } from '@silk-wallet/silk-wallet-sdk';
import {
  createWalletClient,
  custom,
  Address,
  WalletClient,
  PublicClient,
  toHex,
  trim,
  http,
  TypedDataDomain,
  zeroAddress,
  type TransactionReceipt,
  type Abi
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { useNetworkInfo } from './NetworkInfoContext';
import {
  useNotification,
} from '@/app/context/NotificationContext';
import { publicClient } from '@/app/config/viem';
type WalletState = {
  address: `0x${string}` | null;
  chainId: string | null;
  isConnected: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any;
  publicClient: PublicClient<
    ReturnType<typeof http>,
    typeof base | typeof baseSepolia,
    undefined
  > | null;
  walletClient: WalletClient | null;
  isVerified: boolean;
  isSmartContractWallet: boolean;
  error: string | null;
  isLoading: boolean;
  isSilkModalLoading: boolean;
  isUniquenessLoading: boolean;
  isUniquePhone: boolean | null;
  isUniqueGovId: boolean | null;
  uniquenessChecked: boolean;
  // SBT expiry data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phoneSbtExpiry: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  govIdSbtExpiry: any | null;
};

interface WalletContextState {
  state: WalletState;
  error: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect: () => any;
  disconnect: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  switchNetwork: (provider: any, addressForUpdateProvider?: Address) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateSignInMessage: (
    address: Address | undefined,
    chainId: number | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any;
  signMessage: (message: string) => Promise<`0x${string}` | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifySignature: (
    message: string,
    signature: string,
    address: Address,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any;
  checkUniqueness: (
    address?: string
  ) => Promise<void>;
  
  // NEW: Generic functions for Spark NDA attestations
  signTypedDataGeneric: (params: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: `0x${string}`;
    };
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: Record<string, any>;
  }) => Promise<`0x${string}` | null>;
  
  writeContractGeneric: (params: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[];
  }) => Promise<`0x${string}` | null>;
  
  waitForTransactionGeneric: (params: {
    hash: `0x${string}`;
  }) => Promise<TransactionReceipt | null>;
}
const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '';

const WalletContext = createContext<WalletContextState | undefined>(undefined);

// Add Chrome extension types
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        connect: (options: { name: string }) => {
          onDisconnect: {
            addListener: (callback: () => void) => void;
          };
          onMessage: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            addListener: (callback: (message: any) => void) => void;
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          postMessage: (message: any) => void;
        };
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    silk?: any; // Add Silk SDK to window type
  }
}

// Add these constants to define session storage keys
const SESSION_ADDRESS = 'poscidondao_wallet_address';
const SESSION_CHAIN_ID = 'poscidondao_wallet_chainId';
const SESSION_CONNECTED = 'poscidondao_wallet_connected';
const SESSION_VERIFIED = 'poscidondao_wallet_verified';
const SESSION_IS_SMART_CONTRACT = 'poscidondao_wallet_isSmartContractWallet';
const SESSION_IS_UNIQUE_PHONE = 'poscidondao_wallet_isUniquePhone';
const SESSION_IS_UNIQUE_GOV_ID = 'poscidondao_wallet_isUniqueGovId';
const SESSION_UNIQUENESS_CHECKED = 'poscidondao_wallet_uniquenessChecked';
const SESSION_PHONE_SBT_EXPIRY = 'poscidondao_wallet_phoneSbtExpiry';
const SESSION_GOV_ID_SBT_EXPIRY = 'poscidondao_wallet_govIdSbtExpiry';

// eslint-disable-next-line
export const WalletProvider: React.FC<any> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    provider: null,
    publicClient: null,
    walletClient: null,
    isVerified: false,
    isSmartContractWallet: false,
    error: null,
    isLoading: false,
    isSilkModalLoading: false,
    isUniquenessLoading: false,
    isUniquePhone: null,
    isUniqueGovId: null,
    uniquenessChecked: false,
    phoneSbtExpiry: null,
    govIdSbtExpiry: null,
  });

  const networkInfo = useNetworkInfo();
  const hexChainId = `0x${Number(networkInfo?.chainId).toString(16)}`;
  const { addNotification } = useNotification();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [silkProvider, setSilkProvider] = useState<SilkEthereumProviderInterface | null>(null);
  const messagePortRef = useRef<{
    port: MessagePort | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chromePort: any | null;
  }>({ port: null, chromePort: null });
  const isPageHiddenRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  const networkMap = useMemo(
    () => ({
      1: 'Ethereum Mainnet',
      84532: 'Base Sepolia',
      8453: 'Base Mainnet',
    }),
    []
  );

  const checkCode = useCallback(async (signingAddress: string) => {
    const bytecode = await publicClient?.getCode({
      address: signingAddress as Address,
    }); // get the bytecode
    console.log('Bytecode:', bytecode);
    const isSmartContract = bytecode && trim(bytecode) !== '0x';
    console.log('Is smart contract:', isSmartContract);
    return isSmartContract;
  }, []);

  const signMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (message: any): Promise<`0x${string}` | null> => {
      console.log('Attempting signMessage. WalletClient:', state.walletClient, 'Address:', state.address);
      if (!state.walletClient || !state.address) {
        console.error('signMessage called with null walletClient or address');
        return null;
      }
      try {
        // Ensure address is properly formatted
        const accountToSign = state.address.startsWith('0x') ? state.address : (`0x${state.address}` as `0x${string}`);
        console.log('Calling signTypedData with account:', accountToSign);
        
        // Create properly formatted EIP-712 message
        const domain: TypedDataDomain = {
          name: message.domain.name,
          version: message.domain.version,
          chainId: BigInt(message.domain.chainId),
          verifyingContract: zeroAddress
        };

        const formattedMessage = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' }
            ],
            SignIn: [
              { name: 'URL', type: 'string' },
              { name: 'network', type: 'string' },
              { name: 'account', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'issued', type: 'string' },
              { name: 'nonce', type: 'string' }
            ]
          },
          primaryType: 'SignIn' as const,
          domain,
          message: {
            ...message.message,
            account: accountToSign,
            chainId: BigInt(message.message.chainId)
          }
        };

        // Rely solely on viem's signTypedData via the Silk provider (state.walletClient)
        console.log('Using viem signTypedData (via Silk provider) for message signing');
        const signature = await state.walletClient.signTypedData({
          account: accountToSign,
          primaryType: 'SignIn' as const,
          types: {
            SignIn: [
              { name: 'URL', type: 'string' },
              { name: 'network', type: 'string' },
              { name: 'account', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'issued', type: 'string' },
              { name: 'nonce', type: 'string' }
            ]
          },
          domain: {
            chainId: Number(networkInfo?.chainId),
            name: 'Poscidon Protocol',
            version: '1',
            verifyingContract: zeroAddress
          },
          message: {
            ...formattedMessage.message,
            chainId: Number(formattedMessage.message.chainId)
          }
        });
        console.log('Signature received (via Silk provider):', signature);
        return signature;
      } catch (error) {
        console.error('Error signing message:', error);
        if (error.details) {
          console.error('Error details:', error.details);
        }
        if (error.cause) {
          console.error('Error cause:', error.cause);
        }
        return null;
      }
    },
    [state.walletClient, networkInfo?.chainId, state.address]
  );

  useEffect(() => {
    const initializeSilk = async () => {
      try {
        console.log('Initializing Silk provider...');
// Initialize Silk with your configuration
        const silk = initSilk({
          config: {
            allowedSocials: [],
            authenticationMethods: ['email', 'wallet'],
            styles: {
              darkMode: true
            }
          },
          useStaging: true,
          walletConnectProjectId: projectId
        });

        // Check if the provider is properly initialized
        if (!silk || typeof silk !== 'object') {
          throw new Error('Silk provider initialization failed');
        }

        console.log('Silk provider initialized successfully');
        setSilkProvider(silk);
        setState((prev) => ({
          ...prev,
          provider: silk,
        }));
      } catch (error) {
        console.error('Error initializing Silk provider:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to initialize Silk wallet',
        }));
      }
    };

    initializeSilk();
  }, []);

  // Add function to save wallet state to session storage
  const saveWalletStateToStorage = useCallback((walletState: Partial<WalletState>) => {
    try {
      if (typeof window !== 'undefined') {
        // Save individual pieces of data that need to be restored
        sessionStorage.setItem(SESSION_ADDRESS, walletState.address || '');
        sessionStorage.setItem(SESSION_CHAIN_ID, walletState.chainId || '');
        sessionStorage.setItem(SESSION_CONNECTED, walletState.isConnected ? 'true' : 'false');
        sessionStorage.setItem(SESSION_VERIFIED, walletState.isVerified ? 'true' : 'false');
        sessionStorage.setItem(SESSION_IS_SMART_CONTRACT, walletState.isSmartContractWallet ? 'true' : 'false');
        
        // Save uniqueness check states
        if (walletState.isUniquePhone !== undefined) {
          sessionStorage.setItem(SESSION_IS_UNIQUE_PHONE, walletState.isUniquePhone ? 'true' : 'false');
        }
        if (walletState.isUniqueGovId !== undefined) {
          sessionStorage.setItem(SESSION_IS_UNIQUE_GOV_ID, walletState.isUniqueGovId ? 'true' : 'false');
        }
        if (walletState.uniquenessChecked !== undefined) {
          sessionStorage.setItem(SESSION_UNIQUENESS_CHECKED, walletState.uniquenessChecked ? 'true' : 'false');
        }
        
        // Save SBT expiry data
        if (walletState.phoneSbtExpiry) {
          sessionStorage.setItem(SESSION_PHONE_SBT_EXPIRY, JSON.stringify(walletState.phoneSbtExpiry));
        }
        if (walletState.govIdSbtExpiry) {
          sessionStorage.setItem(SESSION_GOV_ID_SBT_EXPIRY, JSON.stringify(walletState.govIdSbtExpiry));
        }
      }
    } catch (error) {
      console.error('Error saving wallet state to session storage:', error);
    }
  }, []);

  // Add function to retrieve wallet state from session storage
  const getWalletStateFromStorage = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        const address = sessionStorage.getItem(SESSION_ADDRESS) as `0x${string}` | null;
        const chainId = sessionStorage.getItem(SESSION_CHAIN_ID);
        const isConnected = sessionStorage.getItem(SESSION_CONNECTED) === 'true';
        const isVerified = sessionStorage.getItem(SESSION_VERIFIED) === 'true';
        const isSmartContractWallet = sessionStorage.getItem(SESSION_IS_SMART_CONTRACT) === 'true';
        
        // Retrieve uniqueness check states
        const isUniquePhone = sessionStorage.getItem(SESSION_IS_UNIQUE_PHONE) === 'true' ? true : 
                              sessionStorage.getItem(SESSION_IS_UNIQUE_PHONE) === 'false' ? false : null;
        const isUniqueGovId = sessionStorage.getItem(SESSION_IS_UNIQUE_GOV_ID) === 'true' ? true :
                              sessionStorage.getItem(SESSION_IS_UNIQUE_GOV_ID) === 'false' ? false : null;
        const uniquenessChecked = sessionStorage.getItem(SESSION_UNIQUENESS_CHECKED) === 'true';
        
        // Retrieve SBT expiry data
        let phoneSbtExpiry = null;
        let govIdSbtExpiry = null;
        
        try {
          const phoneSbtExpiryStr = sessionStorage.getItem(SESSION_PHONE_SBT_EXPIRY);
          if (phoneSbtExpiryStr) {
            phoneSbtExpiry = JSON.parse(phoneSbtExpiryStr);
          }
          
          const govIdSbtExpiryStr = sessionStorage.getItem(SESSION_GOV_ID_SBT_EXPIRY);
          if (govIdSbtExpiryStr) {
            govIdSbtExpiry = JSON.parse(govIdSbtExpiryStr);
          }
        } catch (parseError) {
          console.error('Error parsing SBT expiry data:', parseError);
        }

        if (isConnected && address) {
          return {
            address,
            chainId,
            isConnected,
            isVerified,
            isSmartContractWallet,
            isUniquePhone,
            isUniqueGovId,
            uniquenessChecked,
            phoneSbtExpiry,
            govIdSbtExpiry
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error retrieving wallet state from session storage:', error);
      return null;
    }
  }, []);

  // Add function to clear session storage when disconnecting
  const clearWalletStateFromStorage = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_ADDRESS);
        sessionStorage.removeItem(SESSION_CHAIN_ID);
        sessionStorage.removeItem(SESSION_CONNECTED);
        sessionStorage.removeItem(SESSION_VERIFIED);
        sessionStorage.removeItem(SESSION_IS_SMART_CONTRACT);
        sessionStorage.removeItem(SESSION_IS_UNIQUE_PHONE);
        sessionStorage.removeItem(SESSION_IS_UNIQUE_GOV_ID);
        sessionStorage.removeItem(SESSION_UNIQUENESS_CHECKED);
        sessionStorage.removeItem(SESSION_PHONE_SBT_EXPIRY);
        sessionStorage.removeItem(SESSION_GOV_ID_SBT_EXPIRY);
      }
    } catch (error) {
      console.error('Error clearing wallet state from session storage:', error);
    }
  }, []);

  // Update the disconnect function to clear session storage
  const disconnect = useCallback(async () => {
    console.log('Disconnect: Starting disconnection process...');
    try {
      if (window.silk && typeof window.silk.logout === 'function') {
        console.log('Disconnect: Calling window.silk.logout()');
        await window.silk.logout();
        console.log('Disconnect: window.silk.logout() completed.');
      } else if (state.provider && typeof (state.provider ).disconnect === 'function') {
        // Fallback if silk.logout isn't found but a generic disconnect exists
        console.log('Disconnect: Calling state.provider.disconnect()');
        await (state.provider).disconnect();
        console.log('Disconnect: state.provider.disconnect() completed.');
      } else if (state.address === null || state.provider === null || state.walletClient === null){
        console.log('Disconnect: state.address, state.provider, or state.walletClient is null.');
        return;
      } else {
        console.log('Disconnect: No specific logout/disconnect method found on provider.');
      }
    } catch (error) {
      console.error('Disconnect: Error during provider logout/disconnect:', error);
    } finally {
      console.log('Disconnect: Clearing session storage and resetting state.');
      clearWalletStateFromStorage();
      
      setState(() => {
        console.log('Disconnect: setState called to reset wallet state.');
        return {
          // Explicitly list all fields to ensure a full reset to initial-like state
          address: null,
          chainId: null,
          isConnected: false,
          provider: null, // Provider should be null after disconnect
          publicClient: null, // publicClient might be global but best to clear from connected state context
          walletClient: null,
          isVerified: false,
          isSmartContractWallet: false,
          error: null,
          isLoading: false,
          isSilkModalLoading: false,
          isUniquenessLoading: false,
          isUniquePhone: null,
          isUniqueGovId: null,
          uniquenessChecked: false,
          phoneSbtExpiry: null,
          govIdSbtExpiry: null,
        };
      });
      console.log('Disconnect: State reset complete.');
    }
  }, [state.provider, state.address, state.walletClient, clearWalletStateFromStorage, setState]); // Added setState to dependencies

  const updateProvider = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (newAccountAddress?: Address, explicitProvider?: any) => {
      const accountToUse = newAccountAddress || state.address;
      const providerToUse = explicitProvider || state.provider; // Use explicit if provided

      if (providerToUse && accountToUse) {
        const walletClient = createWalletClient({
          transport: custom(providerToUse), // Use providerToUse
          account: accountToUse,
          chain: networkInfo?.chainId === base.id ? base : baseSepolia,
        });

        const chainId = await walletClient.getChainId();
        setState((prev) => ({
          ...prev,
          chainId: toHex(chainId),
          walletClient,
          provider: providerToUse, // Ensure state.provider is also updated to what was used
        }));
        return { provider: providerToUse, publicClient, walletClient };
      } else {
        console.warn(
          'updateProvider called with no provider or no account to use. Provider actual: ',
          providerToUse, 'Account actual: ', accountToUse,
          'Arguments were: newAccountAddress:', newAccountAddress, 'explicitProvider:', explicitProvider,
          'State was: state.address:', state.address, 'state.provider:', state.provider
        );
        return null;
      }
    },
    [networkInfo, state.address, state.provider] // Keep dependencies
  );

  const switchNetwork = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (providerForSwitch: any, addressForUpdateProvider?: Address) => {
      console.log('[WalletContext/switchNetwork] Called. Args:', { providerForSwitch: typeof providerForSwitch, addressForUpdateProvider });
      console.log('[WalletContext/switchNetwork] Current state.isLoading:', state.isLoading, 'state.provider:', typeof state.provider);

      if (state.isLoading) {
        console.warn('[WalletContext/switchNetwork] Aborting: Another network operation is already in progress (isLoading is true).');
        return;
      }

      if (!providerForSwitch) {
        console.error('[WalletContext/switchNetwork] Aborting: providerForSwitch argument is null/undefined.');
        addNotification('Cannot switch network: provider not available.', 'error');
        return;
      }
      
      if (typeof providerForSwitch.request !== 'function') {
        console.error('[WalletContext/switchNetwork] Aborting: providerForSwitch.request is not a function. Provider type:', typeof providerForSwitch, providerForSwitch);
        addNotification('Cannot switch network: provider is invalid.', 'error');
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));
      const network = {
        chainId: hexChainId,
        chainName: networkMap[Number(networkInfo?.chainId)],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [
          isMainnet
            ? process.env.NEXT_PUBLIC_RPC_URL_MAINNET!
            : process.env.NEXT_PUBLIC_RPC_URL_TESTNET!,
        ],
        blockExplorerUrls: [networkInfo?.explorerLink],
      };

      const attemptSwitchNetwork = async (provider) => {
        try {
          console.log('Attempting network switch via Silk provider...');
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          });

          // Add delay after switching network
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Update the chain ID by fetching directly from the provider
          const rawNewChainIdHex = await provider.request({ method: 'eth_chainId' });
          if (!rawNewChainIdHex) {
            throw new Error('Failed to get new chain ID from provider after switch attempt');
          }
          const newChainIdNumeric = parseInt(rawNewChainIdHex, 16); // parseInt handles "0x"

          setState((prev) => ({
            ...prev,
            chainId: toHex(newChainIdNumeric),
            error: null,
          }));

          // Refresh the provider after switching
          const updatedProviderResult = await updateProvider(addressForUpdateProvider, provider);
          if (!updatedProviderResult) throw new Error('Failed to update provider');

          setState((prev) => ({
            ...prev,
            // chainId is already set by updateProvider or above direct fetch
            provider: updatedProviderResult.provider ?? null,
            walletClient: updatedProviderResult.walletClient as WalletClient | null,
            error: null, // Explicitly null out error here
          }));
        } catch (error) {
          console.error('Switch network error:', error);

          // Handle specific error codes
          if (error.code === 4902 || error.code === -32603) {
            try {
              console.log('Attempting to add network via Silk provider...');
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    ...network,
                    // chainId: hexChainId, // Ensure this is hex, which it is via ...network if network.chainId is hex
                  },
                ],
              });

              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Update the chain ID by fetching directly from the provider
              const rawNewChainIdHexAfterAdd = await provider.request({ method: 'eth_chainId' });
              if (!rawNewChainIdHexAfterAdd) {
                throw new Error(
                  'Failed to get chain ID from provider after adding network'
                );
              }
              const newChainIdNumericAfterAdd = parseInt(rawNewChainIdHexAfterAdd, 16);

              setState((prev) => ({
                ...prev,
                chainId: toHex(newChainIdNumericAfterAdd),
                error: null,
              }));

              const updatedProviderAfterAddResult = await updateProvider(addressForUpdateProvider, provider);
              if (!updatedProviderAfterAddResult)
                throw new Error(
                  'Failed to update provider after adding network'
                );

              setState((prev) => ({
                ...prev,
                // chainId is already set by updateProvider or above direct fetch
                provider: updatedProviderAfterAddResult.provider ?? null,
                walletClient:
                  updatedProviderAfterAddResult.walletClient as WalletClient | null,
                error: null, // Explicitly null out error here
              }));
            } catch (addError) {
              console.error('Failed to add network:', addError);
              setState((prev) => ({
                ...prev,
                error:
                  'Failed to add the network. Please add it manually in your wallet settings.',
              }));
              throw addError;
            }
          } else {
            setState((prev) => ({
              ...prev,
              error: `Failed to switch network: ${error.message}`,
            }));
            throw error;
          }
        }
      };

      try {
        await attemptSwitchNetwork(providerForSwitch);

        // This block might be Silk-specific or generic depending on how Silk reports chainId
        console.log('Network switch/add attempt completed via Silk. Fetching updated chain ID...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const updatedChainId = await providerForSwitch.request({
          method: 'eth_chainId',
        });

        if (!updatedChainId)
          throw new Error('Failed to get updated chain ID');

        const formattedChainId = `0x${Number(updatedChainId).toString(16)}`;
        setState((prev) => ({
          ...prev,
          chainId: formattedChainId,
          error: null,
        }));
      } catch (error) {
        console.error('Error in network switching process:', error);
        setState((prev) => ({
          ...prev,
          error: `Network switch failed: ${error.message}`,
        }));
        throw error;
      } finally {
        setState((prev) => {
          console.log('[WalletContext/switchNetwork] Executing finally block. Setting isLoading to false. Previous isLoading:', prev.isLoading);
          return {
            ...prev,
            isLoading: false,
          };
        });
      }
    },
    [state.provider, state.isLoading, networkInfo, hexChainId, networkMap, updateProvider, addNotification, setState]
  );

  const handleProviderChainChanged = useCallback(async (newChainIdFromEvent: string) => {
    console.log('[handleProviderChainChanged] Detected. New chainId from event:', newChainIdFromEvent);
    if (!newChainIdFromEvent || typeof newChainIdFromEvent !== 'string' || !newChainIdFromEvent.startsWith('0x')) {
      console.warn('[handleProviderChainChanged] Received invalid or non-hex chainId:', newChainIdFromEvent);
      return;
    }

    const normalizedNewHexChainId = newChainIdFromEvent.toLowerCase() as `0x${string}`;

    setState((prev: WalletState): WalletState => {
      if (normalizedNewHexChainId !== prev.chainId?.toLowerCase()) {
        console.log(`[handleProviderChainChanged] Chain changed from ${prev.chainId} to ${normalizedNewHexChainId}. Updating state, resetting verification.`);
        return {
          ...prev,
          chainId: normalizedNewHexChainId,
          isVerified: false, // Reset verification status
          error: null, // Clear any previous errors
        };
      }
      console.log(`[handleProviderChainChanged] Event for ${normalizedNewHexChainId}, but prev.chainId (${prev.chainId}) is same.`);
      return prev;
    });
  }, [setState]);

  useEffect(() => {
    if (state.isConnected && state.provider && typeof state.provider.on === 'function') {
      state.provider.on('chainChanged', handleProviderChainChanged);
    } else if (state.isConnected && state.provider) {
      console.warn("WalletContext: state.provider does not have an 'on' method for 'chainChanged' event.");
    }

    return () => {
      if (state.provider && typeof state.provider.removeListener === 'function') {
        state.provider.removeListener('chainChanged', handleProviderChainChanged);
      } else if (state.provider) {
        // console.warn("WalletContext: state.provider does not have a 'removeListener' method for 'chainChanged' event.");
      }
    };
  }, [
    state.provider,
    state.isConnected,
    handleProviderChainChanged, // Now stable as it only depends on setState
  ]);

  const checkUniqueness = useCallback(
    async (address?: string) => {
      if (!address) {
        console.error('Cannot check uniqueness: no address provided');
        return;
      }

      try {
        // Add a throttling mechanism to prevent rapid successive calls
        setState(prev => {
          // If there's an ongoing uniqueness check, don't start another one
          if (prev.isUniquenessLoading) {
            console.log('Uniqueness check already in progress, skipping duplicate request');
            return prev;
          }
          
          console.log('Starting uniqueness check for address:', address);
          return {
            ...prev,
            isUniquenessLoading: true
          };
        });

        console.log('Checking uniqueness for address:', address);

        // Check phone uniqueness
        const phoneResponse = await fetch('/api/check-uniqueness', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: address,
            type: 'phone',
          }),
        });

        if (!phoneResponse.ok) {
          throw new Error('Failed to check phone uniqueness');
        }

        const phoneData = await phoneResponse.json();
        console.log('Phone uniqueness check response:', phoneData);

        // Add a small delay between requests to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check government ID uniqueness
        const govIdResponse = await fetch('/api/check-uniqueness', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: address,
            type: 'govId',
          }),
        });

        if (!govIdResponse.ok) {
          throw new Error('Failed to check government ID uniqueness');
        }

        const govIdData = await govIdResponse.json();
        console.log('Gov ID uniqueness check response:', govIdData);

        // Ensure state update is properly applied
        await new Promise<void>((resolve) => {
          console.log('Setting state with phone uniqueness:', phoneData.isUniquePhone);
          console.log('Setting state with gov ID uniqueness:', govIdData.isUniqueGovId);
          
          setState((prevState) => {
            const newState = {
              ...prevState,
              isUniquePhone: phoneData.isUniquePhone,
              isUniqueGovId: govIdData.isUniqueGovId,
              phoneSbtExpiry: phoneData.phoneSbtExpiry || null,
              govIdSbtExpiry: govIdData.govIdSbtExpiry || null,
              uniquenessChecked: true,
              isUniquenessLoading: false
            };
            console.log('Updated wallet state:', newState.isUniquePhone, newState.isUniqueGovId);
            return newState;
          });
          resolve();
        });
      } catch (error) {
        console.error('Error checking uniqueness:', error);
        await new Promise<void>((resolve) => {
          setState((prevState) => ({
            ...prevState,
            isUniquePhone: null,
            isUniqueGovId: null,
            phoneSbtExpiry: null,
            govIdSbtExpiry: null,
            uniquenessChecked: false,
            error: error.message || 'Failed to check uniqueness',
            isUniquenessLoading: false
          }));
          resolve();
        });
      }
    },
    []
  );

  const generateNonce = () => {
    const randomValue = Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    ).toString(16);
    return `0x${randomValue}` as `0x${string}`;
  };

  const generateSignInMessage = useCallback(
    (address, chainId) => {
      const nonce = generateNonce();
      const baseUri = `${window.location.protocol}//${window.location.host}`;

      const network = networkMap[chainId] || `Chain ID: ${chainId}`;

      const domain = {
        name: 'Poscidon Protocol',
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: zeroAddress
      };

      const issuedDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      });

      const message = {
        URL: baseUri,
        network,
        account: address,
        chainId: BigInt(chainId),
        issued: issuedDate,
        nonce,
      };

      const types = {
        SignIn: [
          { name: 'URL', type: 'string' },
          { name: 'network', type: 'string' },
          { name: 'account', type: 'address' },
          { name: 'chainId', type: 'uint256' },
          { name: 'issued', type: 'string' },
          { name: 'nonce', type: 'string' },
        ],
      };

      return { domain, message, types };
    },
    [networkMap]
  );

  const verifySignature = useCallback(
    async (message, signature, address) => {
      setState(
        (prev: WalletState): WalletState => ({
          ...prev,
          isLoading: true,
        })
      );
      try {
        if (address === networkInfo?.admin?.toLowerCase()) {
          setState(
            (prev: WalletState): WalletState => ({
              ...prev,
              isVerified: true,
            })
          );
        } else {
          // Create a deep copy of the message and convert all BigInt values to strings
          const serializedMessage = {
            domain: {
              ...message.domain,
              chainId: message.domain.chainId.toString(),
            },
            types: message.types,
            message: {
              ...message.message,
              chainId: message.message.chainId.toString(),
            },
            signature,
            address,
          };

          console.log('Sending verification request with serialized message:', {
            domain: serializedMessage.domain,
            messageChainId: serializedMessage.message.chainId,
            signature: signature.slice(0, 20) + '...',
            address
          });

          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serializedMessage)
          });
          
          console.log('Verification response:', response);
          const data = await response.json();

          console.log('Verification data:', data);
          if (data.success) {
            setState(
              (prev: WalletState): WalletState => ({
                ...prev,
                isVerified: data.isValid,
              })
            );
            return data.isValid;
          } else {
            console.error('Verification failed:', data.error);
            return false;
          }
        }
      } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
      } finally {
        setState(
          (prev: WalletState): WalletState => ({
            ...prev,
            isLoading: false,
          })
        );
      }
    },
    [networkInfo?.admin]
  );

  const connect = useCallback(async () => {
    console.log('Starting wallet connection process...');

    // Set Silk modal loading state immediately
    setState((prev) => ({ ...prev, isSilkModalLoading: true }));

    if (!silkProvider) {
      console.error('Silk provider initialization failed');
      addNotification(
        'Wallet provider initialization failed. Please refresh the page.',
        'error'
      );
      setState((prev) => ({ ...prev, isSilkModalLoading: false })); // Reset on early exit
      return;
    }

    try {
      if (!window.silk) {
        console.error('Silk SDK (window.silk) is not available');
        addNotification(
          'Wallet provider (Silk) not ready. Please refresh the page.',
          'error'
        );
        setState((prev) => ({ ...prev, isSilkModalLoading: false })); // Reset on early exit
        return;
      }

      console.log('Requesting wallet connection via window.silk.login()...');
      await window.silk.login(); // This handles the wallet selection modal
      console.log('Silk login process completed.');

      // After login, window.silk is the provider
      const provider = window.silk;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        provider: provider , // Store the Silk provider
      }));

      // Create a WalletClient with the Silk provider
      const walletClient = createWalletClient({
        transport: custom(provider ),
        chain: networkInfo?.chainId === base.id ? base : baseSepolia,
      });

      // Get accounts using the Silk provider's request method
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        await disconnect(); // Ensure state is cleaned up
        throw new Error('No accounts returned from Silk provider');
      }
      const userAddress = accounts[0] as `0x${string}`;

      const initialChainId = await walletClient.getChainId();
      const currentChainIdHex = `0x${initialChainId.toString(16)}`;
      const requiredChainIdHex = `0x${networkInfo?.chainId.toString(16)}`;
      const isSmartContractWallet = await checkCode(userAddress);

      // For admin wallet or smart contract wallet, update state and mark as verified without signing
      if (
        userAddress?.toLowerCase() === networkInfo?.admin?.toLowerCase() ||
        isSmartContractWallet
      ) {
        const newState: WalletState = {
          isConnected: true,
          address: userAddress,
          chainId: currentChainIdHex,
          provider: provider ,
          walletClient: walletClient as WalletClient,
          publicClient: publicClient as PublicClient<
            ReturnType<typeof http>,
            typeof base | typeof baseSepolia,
            undefined
          >,
          isVerified: true,
          isLoading: false,
          isSilkModalLoading: false,
          error: null,
          isSmartContractWallet: !!isSmartContractWallet,
          isUniquenessLoading: false,
          isUniquePhone: null,
          isUniqueGovId: null,
          uniquenessChecked: false,
          phoneSbtExpiry: null,
          govIdSbtExpiry: null,
        };
        
        setState((prev) => ({
           ...prev,
           ...newState,
           isSmartContractWallet: newState.isSmartContractWallet, // Explicitly use the boolean from newState
        }));
        saveWalletStateToStorage(newState);
        await checkUniqueness(userAddress);
        console.log('Admin or SC Wallet connected successfully via Silk');
        addNotification('Wallet connected successfully!', 'success');
        return;
      }

      // For all other wallets, first update connection state
      setState(
        (prev: WalletState): WalletState => ({
          ...prev,
          address: userAddress,
          chainId: currentChainIdHex,
          isConnected: true,
          provider: provider ,
          walletClient: walletClient as WalletClient,
          publicClient: publicClient as PublicClient<
            ReturnType<typeof http>,
            typeof base | typeof baseSepolia,
            undefined
          >,
          isVerified: false, // Will be set after signature
          isLoading: true,
          error: null,
        })
      );

      // Handle network switching if needed
      if (currentChainIdHex !== requiredChainIdHex) {
        try {
          console.log('Switching network from', currentChainIdHex, 'to', requiredChainIdHex);
          await switchNetwork(provider, userAddress); // Pass provider and userAddress
          
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay for switch
          
          const newChainId = await walletClient.getChainId();
          const newChainIdHex = `0x${newChainId.toString(16)}`;
          
          if (newChainIdHex !== requiredChainIdHex) {
            throw new Error(`Network switch failed. Expected ${requiredChainIdHex}, got ${newChainIdHex}`);
          }
          console.log('Network switch successful, new chainId:', newChainIdHex);
        } catch (switchError) {
          console.error('Network switch failed:', switchError);
          let notificationMessage = 'Failed to switch network. Please try again.';
          if (switchError && typeof switchError.message === 'string' && switchError.message.includes('8,004')) {
            notificationMessage = 'Automatic network switch failed (Error 8004). Please switch to Base network in your wallet and reconnect.';
          }
          addNotification(notificationMessage, 'error');
          await disconnect(); // Disconnect if network switch fails
          return;
        }
      }

      // Request signature for verification
      try {
        addNotification(
          'Please check your wallet for a signature request to verify your wallet.',
          'info'
        );

        const finalChainId = await walletClient.getChainId();
        console.log('Final chainId before signing:', finalChainId);

        const message = generateSignInMessage(userAddress, finalChainId);
        const signature = await walletClient.signTypedData({
          account: userAddress,
          primaryType: 'SignIn' as const,
          types: {
            SignIn: [
              { name: 'URL', type: 'string' },
              { name: 'network', type: 'string' },
              { name: 'account', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'issued', type: 'string' },
              { name: 'nonce', type: 'string' }
            ]
          },
          domain: {
            name: message.domain.name,
            version: message.domain.version,
            chainId: Number(message.domain.chainId),
            verifyingContract: zeroAddress
          },
          message: message.message
        });

        if (signature) {
          const serializedPayload = {
            domain: {
              ...message.domain,
              chainId: message.domain.chainId.toString(),
            },
            types: message.types,
            message: {
              ...message.message,
              chainId: message.message.chainId.toString(),
            },
            signature,
            address: userAddress,
          };
          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serializedPayload),
          });

          const data = await response.json();
          const formattedChainId = toHex(finalChainId);
          const isVerified = data.success && data.isValid; // Ensure isValid is also checked
          
          const finalState = {
            isVerified,
            isLoading: false,
            isSilkModalLoading: false,
            address: userAddress,
            chainId: formattedChainId,
            isConnected: true,
            walletClient: walletClient as WalletClient,
            publicClient: publicClient as PublicClient<
              ReturnType<typeof http>,
              typeof base | typeof baseSepolia,
              undefined
            >,
          } as Partial<WalletState>;

          setState((prev) => ({ 
            ...prev, 
            ...finalState,
            provider: provider ,
            isSmartContractWallet: !!isSmartContractWallet,
            error: null,
           }));
          
          if (isVerified) {
            const completeStateToSave = {
              ...state,
              ...finalState,
              provider: provider ,
              isSmartContractWallet: !!isSmartContractWallet,
              error: null,
            } as WalletState;
            saveWalletStateToStorage(completeStateToSave);
            addNotification('Wallet verified successfully!', 'success');
            await checkUniqueness(userAddress);
          } else {
            addNotification('Wallet connected but verification failed.', 'warning');
            const completeStateToSave = {
              ...state,
              ...finalState,
              provider: provider ,
              isSmartContractWallet: !!isSmartContractWallet,
              isVerified: false,
              error: null, 
            } as WalletState;
            saveWalletStateToStorage(completeStateToSave); 
          }
        } else {
          // Signature was null (e.g., user rejected)
          throw new Error('Signature request rejected or failed.');
        }
      } catch (signError) {
        console.error('Signature error:', signError);
        setState((prev) => ({
          ...prev,
          error: signError.message,
          isVerified: false,
          isLoading: false,
        }));
        addNotification(signError.message.includes('rejected') ? 'Signature request rejected.' : 'Failed to verify wallet signature.', 'error');
        // Potentially disconnect or save a non-verified state
        await disconnect(); // Or save a non-verified state
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      const errorMessage = error.message || 'Error connecting to the wallet';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isConnected: false,
        isVerified: false,
        isLoading: false,
        provider: null,
        walletClient: null,
      }));
      addNotification(errorMessage, 'error');
    } finally {
      setState((prev) => {
        console.log('[WalletContext/connect] Executing finally block. Setting isLoading and isSilkModalLoading to false. Previous isLoading:', prev.isLoading, 'Previous isSilkModalLoading:', prev.isSilkModalLoading);
        return {
          ...prev,
          isLoading: false,
          isSilkModalLoading: false,
        };
      });
    }
  }, [
    state,
    silkProvider, // window.silk is initialized into silkProvider state
    networkInfo?.chainId,
    generateSignInMessage,
    disconnect,
    networkInfo?.admin,
    switchNetwork,
    addNotification,
    checkUniqueness,
    checkCode,
    saveWalletStateToStorage
  ]);

  // Add effect to restore connection from session storage on initial load
  useEffect(() => {
    const restoreConnectionFromSession = async () => {
      const sessionState = getWalletStateFromStorage();
      
      if (!sessionState) return;
      if (state.isLoading || state.isConnected) return;

      try {
        setState(prev => ({ ...prev, isLoading: true }));
        console.log('Restoring Silk wallet connection from session storage...');
        
        if (!window.silk) {
          console.error('Silk SDK (window.silk) is not available for session restoration.');
          throw new Error('Silk provider not ready for session restoration.');
        }

        // Check for existing accounts without triggering login modal
        const accounts = await window.silk.request({ method: 'eth_accounts' });

        if (!accounts || accounts.length === 0 || accounts[0]?.toLowerCase() !== sessionState.address?.toLowerCase()) {
          console.log('No accounts found for Silk session, or address mismatch. Clearing session.');
          clearWalletStateFromStorage();
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const userAddress = accounts[0] as `0x${string}`;
        const provider = window.silk;

        const walletClient = createWalletClient({
          transport: custom(provider ),
          chain: networkInfo?.chainId === base.id ? base : baseSepolia,
        });

        const chainId = await walletClient.getChainId();
        const formattedChainId = toHex(chainId);
        const isSmartContract = await checkCode(userAddress);

        // If chain IDs don't match the current network, try to switch or notify
        // For simplicity in restoration, we might just set the chainId and let user switch manually if needed
        // or attempt a switch if critical.
        if (formattedChainId !== hexChainId && networkInfo) {
          console.warn(`Restored session on chain ${formattedChainId}, but current network is ${hexChainId}. User may need to switch.`);
          // Optionally, attempt to switch, but this could be disruptive on load
          // await switchNetwork('silk', provider);
          // const newChainIdAfterSwitch = await walletClient.getChainId();
          // formattedChainId = toHex(newChainIdAfterSwitch);
        }
        
        setState(prev => ({
          ...prev,
          address: userAddress,
          chainId: formattedChainId,
          isConnected: true,
          provider: provider ,
          walletClient,
          publicClient,
          walletSelector: 'silk',
          isVerified: sessionState.isVerified, // Restore verification state
          isSmartContractWallet: !!isSmartContract, // Ensure boolean
          isLoading: false,
          error: null,
          isUniquenessLoading: false,
          isUniquePhone: sessionState.isUniquePhone,
          isUniqueGovId: sessionState.isUniqueGovId,
          uniquenessChecked: sessionState.uniquenessChecked || false,
          phoneSbtExpiry: sessionState.phoneSbtExpiry || null,
          govIdSbtExpiry: sessionState.govIdSbtExpiry || null
        }));
        
        console.log('Successfully restored Silk wallet connection from session');
        // Optionally, trigger checkUniqueness if needed
        if (sessionState.isVerified) {
          await checkUniqueness(userAddress);
        }

      } catch (error) {
        console.error('Error restoring Silk wallet connection from session:', error);
        clearWalletStateFromStorage(); // Clear session on any restoration error
        setState(prev => ({
          ...prev,
          isLoading: false,
          isConnected: false,
          address: null,
          chainId: null,
          walletSelector: 'none',
          provider: null,
          walletClient: null,
          isVerified: false,
        }));
      }
    };
    
    if (!state.isConnected && networkInfo && silkProvider) { // Ensure silkProvider (window.silk) is ready
      restoreConnectionFromSession();
    }
  }, [
    state.isConnected,
    state.isLoading, // Added isLoading to prevent re-trigger if already processing
    networkInfo,
    getWalletStateFromStorage,
    clearWalletStateFromStorage,
    switchNetwork, // May be used if auto-switch on restore is implemented
    hexChainId,
    silkProvider, // Depends on silkProvider (window.silk) being initialized
    checkCode,      // For isSmartContractWallet check
    setState,       // To update state
    checkUniqueness // For post-restore action
  ]);

  // Add effect to update session storage when connection state changes
  useEffect(() => {
    if (state.isConnected && state.address) {
      saveWalletStateToStorage({
        address: state.address,
        chainId: state.chainId,
        isConnected: state.isConnected,
        isVerified: state.isVerified,
        isSmartContractWallet: state.isSmartContractWallet,
        isUniquenessLoading: state.isUniquenessLoading,
        isUniquePhone: state.isUniquePhone,
        isUniqueGovId: state.isUniqueGovId,
        uniquenessChecked: state.uniquenessChecked,
        phoneSbtExpiry: state.phoneSbtExpiry,
        govIdSbtExpiry: state.govIdSbtExpiry
      });
    }
  }, [
    state.isConnected,
    state.address,
    state.chainId,
    state.isVerified,
    state.isSmartContractWallet,
    state.isUniquenessLoading,
    state.isUniquePhone,
    state.isUniqueGovId,
    state.uniquenessChecked,
    state.phoneSbtExpiry,
    state.govIdSbtExpiry,
    saveWalletStateToStorage
  ]);

  useEffect(() => {
    const handleWalletDisconnect = (error?) => { // Made error optional as it might not always be provided
      console.log('handleWalletDisconnect: Detected provider disconnect event.', error || '(No error object provided)');
      // It's important that this call to disconnect uses the latest version of the disconnect function.
      disconnect(); 
      console.log(`handleWalletDisconnect: Main disconnect function invoked.`);
    };

    if (state.provider && typeof state.provider.on === 'function') {
      state.provider.on('disconnect', handleWalletDisconnect);
    } else if (state.provider) {
      console.warn("WalletContext: state.provider does not have an 'on' method for 'disconnect' event.");
    }

    return () => {
      if (state.provider && typeof state.provider.removeListener === 'function') {
        state.provider.removeListener('disconnect', handleWalletDisconnect);
      } else if (state.provider) {
        // console.warn("WalletContext: state.provider does not have a 'removeListener' method for 'disconnect' event.");
      }
    };
  }, [state.provider, disconnect]);

  // <<<< HUGELY IMPORTANT: THIS FUNCTION MUST BE MOVED OUTSIDE OF ANY USEEFFECT >>>>
  // It should be at the same level as 'connect', 'disconnect', 'switchNetwork' etc.
  const handleAccountsChanged = useCallback(async (accounts: Address[]) => {
    console.log('[handleAccountsChanged] Event triggered. Accounts:', accounts);
    console.log('[handleAccountsChanged] Current state.address before anything:', state.address);
    console.log('[handleAccountsChanged] Current state.isLoading before anything:', state.isLoading);

    // Determine if we need to set isLoading. Only set it if not already loading from another process.
    // However, handleAccountsChanged often implies a loading state for its operations.
    // For simplicity and safety, we manage isLoading internally here and ensure it's reset.
    setState(prev => ({
      ...prev,
      isLoading: true // Assume loading for the duration of this function
    }));

    try {
      if (accounts.length === 0) {
        console.log('[handleAccountsChanged] No accounts found, disconnecting.');
        await disconnect();
        return;
      }

      const newAddress = accounts[0]?.toLowerCase() as Address | undefined;
      const currentAddress = state.address?.toLowerCase();

      console.log(`[handleAccountsChanged] New address from event: ${newAddress}, Current state address: ${currentAddress}`);

      if (newAddress === currentAddress) {
        console.log('Same address detected, skipping further account change logic, resetting isLoading if it was set by this function.');
        // If this function set isLoading true, and it was originally false, reset it.
        // This check is a bit tricky due to async nature of setState. The finally block is more reliable.
        return;
      }

      console.log('[handleAccountsChanged] Proceeding with account change.');

      const currentProvider = state.provider; // Use state.provider from the closure

      // try {
      console.log('[handleAccountsChanged] Attempting to update provider for new address:', newAddress);
      const updatedProviderResult = await updateProvider(newAddress as Address, currentProvider); // Pass currentProvider explicitly
      if (!updatedProviderResult?.walletClient) {
        console.error('[handleAccountsChanged] Failed to update wallet client for the new address. updatedProviderResult:', updatedProviderResult);
        throw new Error('Failed to update wallet client for the new address');
      }
      console.log('[handleAccountsChanged] Provider updated successfully for new address:', newAddress);

      const chainId = await updatedProviderResult.walletClient.getChainId();
      const formattedChainId = chainId ? toHex(chainId) : null;
      console.log(`[handleAccountsChanged] New chainId: ${formattedChainId} for address: ${newAddress}`);

      if (networkInfo?.admin?.toLowerCase() === newAddress?.toLowerCase()) {
        console.log('[handleAccountsChanged] New address is admin. Setting verified state.');
        setState((prev) => {
          const newState = {
            ...prev,
            address: newAddress as Address,
            chainId: formattedChainId,
            isConnected: true,
            provider: updatedProviderResult.provider,
            walletClient: updatedProviderResult.walletClient,
            publicClient: updatedProviderResult.publicClient,
            isVerified: true,
            // isLoading: true, // isLoading is managed by the outer try/finally
            error: null,
            isSmartContractWallet: false,
            isUniquenessLoading: false,
            isUniquePhone: null,
            isUniqueGovId: null,
          };
          console.log('[handleAccountsChanged] Admin: setState called. New state being set:', { address: newState.address, chainId: newState.chainId, isVerified: newState.isVerified });
          return newState;
        });
        console.log('[handleAccountsChanged] Admin: Calling checkUniqueness for address:', newAddress);
        await checkUniqueness(newAddress as Address);
        // setState((prev) => ({ ...prev, isLoading: false })); // isLoading is managed by the outer try/finally
        console.log('[handleAccountsChanged] Admin: checkUniqueness done.');
        return;
      }

      console.log('[handleAccountsChanged] Non-admin wallet. Checking smart contract status for address:', newAddress);
      const isSmartContract = await checkCode(newAddress as Address);
      console.log(`[handleAccountsChanged] Smart contract status for ${newAddress}: ${isSmartContract}`);

      setState((prev) => {
        const newState = {
          ...prev,
          address: newAddress as Address,
          chainId: formattedChainId,
          isConnected: true,
          provider: updatedProviderResult.provider,
          walletClient: updatedProviderResult.walletClient,
          publicClient: updatedProviderResult.publicClient,
          isVerified: false,
          // isLoading: true, // isLoading is managed by the outer try/finally
          error: null,
          isSmartContractWallet: !!isSmartContract,
          isUniquenessLoading: false,
          isUniquePhone: null,
          isUniqueGovId: null,
        };
        console.log('[handleAccountsChanged] Non-admin: setState called to update address and set isLoading/isVerified. New state being set:', { address: newState.address, chainId: newState.chainId, isVerified: newState.isVerified, /*isLoading: newState.isLoading,*/ isSmartContractWallet: newState.isSmartContractWallet });
        return newState;
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log('[handleAccountsChanged] Non-admin: After 500ms delay.');

      // If initial connection flow is active (Silk modal was just used), skip redundant signing here
      if (state.isSilkModalLoading) {
        console.log('[handleAccountsChanged] Initial connect flow (isSilkModalLoading is true) is active or just completed. Skipping redundant sign/verify in handleAccountsChanged.');
        // isLoading is managed by the finally block of handleAccountsChanged, so no need to set it here.
        return; 
      }

      try {
        addNotification(
          'Please check your wallet for a signature request to verify your wallet.',
          'info'
        );
        console.log('[handleAccountsChanged] Non-admin: Generating sign-in message for address:', newAddress, 'chainId:', chainId);
        const message = generateSignInMessage(newAddress, chainId);
        console.log('[handleAccountsChanged] Non-admin: Requesting signature from walletClient for address:', newAddress);
        const signature = await updatedProviderResult.walletClient.signTypedData({
          account: newAddress as Address,
          primaryType: 'SignIn' as const,
          types: {
            SignIn: [
              { name: 'URL', type: 'string' },
              { name: 'network', type: 'string' },
              { name: 'account', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'issued', type: 'string' },
              { name: 'nonce', type: 'string' }
            ]
          },
          domain: {
            name: message.domain.name,
            version: message.domain.version,
            chainId: Number(message.domain.chainId),
            verifyingContract: zeroAddress
          },
          message: message.message
        });

        if (signature) {
          const serializedPayload = {
            domain: {
              ...message.domain,
              chainId: message.domain.chainId.toString(),
            },
            types: message.types,
            message: {
              ...message.message,
              chainId: message.message.chainId.toString(),
            },
            signature,
            address: newAddress,
          };
          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serializedPayload),
          });

          const data = await response.json();
          console.log('[handleAccountsChanged] Non-admin: Verification API response data:', data);
          setState((prev) => {
            const newState = {
              ...prev,
              isVerified: data.success && data.isValid, // Ensure isValid is checked too
              // isLoading: false, // isLoading is managed by the outer try/finally
            };
            console.log('[handleAccountsChanged] Non-admin: setState called for verification. New state being set:', { isVerified: newState.isVerified, /*isLoading: newState.isLoading*/ });
            return newState;
          });

          if (data.success && data.isValid) {
            addNotification('Wallet verified successfully!', 'success');
            console.log('[handleAccountsChanged] Non-admin: Wallet verified. Calling checkUniqueness for address:', newAddress);
            await checkUniqueness(newAddress as Address);
          } else {
            addNotification('Wallet connected but verification failed.', 'warning');
            console.log('[handleAccountsChanged] Non-admin: Wallet connected but verification failed.');
          }
        } else {
          console.log('[handleAccountsChanged] Non-admin: Signature was null (rejected or failed).');
          addNotification('Signature request rejected or failed.', 'error');
          setState((prev) => ({
            ...prev,
            isVerified: false,
            // isLoading: false, // isLoading is managed by the outer try/finally
            error: 'Signature request rejected or failed.',
          }));
        }
      } catch (signError) {
        console.log('[handleAccountsChanged] Non-admin: Error during signing/verification:', signError);
        setState((prev) => {
          const newState = {
            ...prev,
            isVerified: false,
            // isLoading: false, // isLoading is managed by the outer try/finally
            error: signError.message || 'Error during signing.',
          };
          console.log('[handleAccountsChanged] Non-admin: setState called in signError catch. New state being set:', { isVerified: newState.isVerified, /*isLoading: newState.isLoading,*/ error: newState.error });
          return newState;
        });
        addNotification(
          'Signature request rejected or failed.',
          'error'
        );
      }
    } catch (error) {
      console.error('[handleAccountsChanged] Critical error during wallet change:', error);
      // Ensure state is reset properly on critical failure
      setState((prev) => {
        const newState = {
          ...prev,
          address: null,
          chainId: null,
          isConnected: false,
          publicClient: null,
          walletClient: null,
          isVerified: false,
          isSmartContractWallet: false,
          error: 'Failed to update wallet. Please reconnect your wallet.',
          // isLoading: false, // isLoading is managed by the outer try/finally
          // provider should ideally be reset or handled carefully here
        };
        console.log('[handleAccountsChanged] Critical error: setState called. New state being set:', newState);
        return newState;
      });
      addNotification(
        'Failed to update wallet. Please reconnect your wallet.',
        'error'
      );
    } finally {
      // Ensure isLoading is reset to its original state or false if this function was the one to set it.
      // More simply, just ensure it's false if no other process should be holding it.
      setState(prev => {
        console.log('[handleAccountsChanged] Executing finally block. Resetting isLoading to false. Previous isLoading:', prev.isLoading);
        return {
          ...prev,
          isLoading: false // Reset isLoading state
        };
      });
      console.log('[handleAccountsChanged] Operation finished.');
    }
  }, [
    state.isLoading,
    state.provider, // Ensure to use state.provider from the closure if not passed as an arg
    state.address,
    disconnect, 
    updateProvider, 
    generateSignInMessage, 
    addNotification, 
    checkUniqueness, 
    networkInfo?.admin, 
    checkCode,
    state.isSilkModalLoading
  ]);

  // useEffect for attempting to set up native provider event listeners
  useEffect(() => {
    if (state.provider && typeof state.provider.on === 'function' && typeof state.provider.removeListener === 'function') {
      console.log("Setting up native 'accountsChanged' listener.");
      state.provider.on('accountsChanged', handleAccountsChanged);
      // Also setup chainChanged listener here if it uses a similar pattern
      // state.provider.on('chainChanged', handleChainChangedCallback);

      return () => {
        console.log("Removing native 'accountsChanged' listener.");
        state.provider.removeListener('accountsChanged', handleAccountsChanged);
        // state.provider.removeListener('chainChanged', handleChainChangedCallback);
      };
    } else if (state.provider) {
      console.warn("WalletContext: state.provider does not have 'on' and/or 'removeListener' methods for 'accountsChanged' event.");
    }
  }, [state.provider, handleAccountsChanged]); // Only state.provider and the callback itself

  // Handle extension message port
  const setupExtensionMessagePort = useCallback(() => {
    try {
      // Check if we have a message port from an extension
      if (window.chrome?.runtime?.connect) {
        const port = window.chrome.runtime.connect({ name: 'poscidondao' });
        messagePortRef.current.chromePort = port;

        // Handle port disconnection
        port.onDisconnect.addListener(() => {
          console.log('Extension message port disconnected');
          messagePortRef.current.chromePort = null;

          // Attempt to reconnect if we have an active wallet connection
          if (
            state.isConnected &&
            reconnectAttemptsRef.current < maxReconnectAttempts
          ) {
            reconnectAttemptsRef.current++;
            console.log(
              `Attempting to reconnect extension port (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );
            setTimeout(setupExtensionMessagePort, 1000);
          }
        });

        // Handle messages from extension
        port.onMessage.addListener((message) => {
          console.log('Received message from extension:', message);
          // Handle extension messages here
        });
      }
    } catch (error) {
      console.warn('Failed to setup extension message port:', error);
    }
  }, [state.isConnected]);

  // Handle page visibility changes
  const handleVisibilityChange = useCallback(() => {
    const isHidden = document.hidden;
    isPageHiddenRef.current = isHidden;

    if (!isHidden) {
      // Page is visible again, check and restore connections
      console.log('Page restored from hidden state');
      setupExtensionMessagePort();

      // Rely on Silk's session management or the session restoration useEffect
      if (state.isConnected && state.provider && window.silk) {
        reconnectAttemptsRef.current = 0;
        // Silk might auto-reconnect or require a specific call, e.g., window.silk.login() or check status
        // For now, session restoration effect should handle this primarily.
      }
    }
  }, [
    state.isConnected,
    state.provider,
    setupExtensionMessagePort,
  ]);

  // Handle bfcache events
  const handleBFCache = useCallback(
    (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('Page restored from bfcache');
        reconnectAttemptsRef.current = 0;
        // Restore connections after a short delay to ensure everything is ready
        setTimeout(() => {
          setupExtensionMessagePort();
          // Rely on Silk's session management or the session restoration useEffect
          if (state.isConnected && state.provider && window.silk) {
            // Similar to visibility change, rely on session restoration or Silk's internal handling.
          }
        }, 100);
      }
    },
    [
      state.isConnected,
      state.provider,
      setupExtensionMessagePort,
    ]
  );

  // Set up event listeners for page visibility and bfcache
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handleBFCache);

    // Capture the current ref values
    const chromePort = messagePortRef.current.chromePort;
    const port = messagePortRef.current.port;

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleBFCache);

      // Clean up message ports using captured values
      if (chromePort) {
        try {
          chromePort.postMessage({ type: 'disconnect' });
        } catch (error) {
          console.warn('Failed to disconnect chrome port:', error);
        }
      }
      if (port) {
        try {
          port.close();
        } catch (error) {
          console.warn('Failed to close message port:', error);
        }
      }
    };
  }, [handleVisibilityChange, handleBFCache]);

  // Set up extension message port when component mounts
  useEffect(() => {
    setupExtensionMessagePort();
  }, [setupExtensionMessagePort]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (state.isConnected && state.provider && typeof state.provider.request === 'function') {
      intervalId = setInterval(async () => {
        try {
          const accounts = await state.provider.request({ method: 'eth_accounts' });
          if (!accounts || accounts.length === 0) {
            console.log('useEffect [connectionPoller]: No accounts found during poll. Potentially disconnected. Triggering disconnect.');
            disconnect(); 
            return; // Exit early if disconnected
          } else if (state.address && accounts[0]?.toLowerCase() !== state.address.toLowerCase()) {
            console.warn('useEffect [connectionPoller]: Polled account differs from state address. Polled:', accounts[0], 'State:', state.address, 'Triggering handleAccountsChanged.');
            await handleAccountsChanged(accounts as Address[]);
            return; // Exit early if account changed, as it might involve chain changes too
          }

          // Poll for chainId changes if accounts are stable
          const polledHexChainId = await state.provider.request({ method: 'eth_chainId' });
          if (polledHexChainId && typeof polledHexChainId === 'string' && polledHexChainId.startsWith('0x')) {
            const normalizedPolledChainId = polledHexChainId.toLowerCase() as `0x${string}`;
            const normalizedCurrentStateChainId = state.chainId?.toLowerCase();

            if (normalizedCurrentStateChainId !== normalizedPolledChainId) {
              console.log(`useEffect [connectionPoller]: ChainId changed from ${normalizedCurrentStateChainId} to ${normalizedPolledChainId}. Updating state.`);
              setState(prev => ({
                ...prev,
                chainId: normalizedPolledChainId,
                isVerified: false, // Reset verification on chain change
                error: null,       // Clear any errors
                isLoading: false,  // Explicitly set isLoading to false here too
              }));
            }
          } else {
            console.warn('useEffect [connectionPoller]: Invalid chainId received from poll:', polledHexChainId);
          }

        } catch (error) {
          console.error('useEffect [connectionPoller]: Error during connection poll. Triggering disconnect.', error);
          disconnect();
        }
      }, 1000);
    } 

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isConnected, state.provider, state.address, state.chainId, disconnect, handleAccountsChanged, setState]);

  // NEW: Generic typed data signing function for Spark NDA attestations
  const signTypedDataGeneric = useCallback(
    async (params: {
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: `0x${string}`;
      };
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: Record<string, any>;
    }): Promise<`0x${string}` | null> => {
      console.log('Attempting signTypedDataGeneric. WalletClient:', state.walletClient, 'Address:', state.address);
      if (!state.walletClient || !state.address) {
        console.error('signTypedDataGeneric called with null walletClient or address');
        return null;
      }

      try {
        const accountToSign = state.address.startsWith('0x') ? state.address : (`0x${state.address}` as `0x${string}`);
        console.log('Calling signTypedData with account:', accountToSign);

        const signature = await state.walletClient.signTypedData({
          account: accountToSign,
          domain: {
            name: params.domain.name,
            version: params.domain.version,
            chainId: params.domain.chainId,
            verifyingContract: params.domain.verifyingContract
          },
          types: params.types,
          primaryType: params.primaryType as string,
          message: params.message
        });

        console.log('Generic typed data signature received:', signature);
        return signature;
      } catch (error) {
        console.error('Error signing typed data:', error);
        return null;
      }
    },
    [state.walletClient, state.address]
  );

  // NEW: Generic contract writing function
  const writeContractGeneric = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: any[];
    }): Promise<`0x${string}` | null> => {
      console.log('Attempting writeContractGeneric. WalletClient:', state.walletClient, 'Address:', state.address);
      if (!state.walletClient || !state.address) {
        console.error('writeContractGeneric called with null walletClient or address');
        return null;
      }

      try {
        const accountToUse = state.address.startsWith('0x') ? state.address : (`0x${state.address}` as `0x${string}`);
        console.log('Calling writeContract with account:', accountToUse);

        const hash = await state.walletClient.writeContract({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
          account: accountToUse,
          chain: state.walletClient.chain
        });

        console.log('Contract write transaction hash:', hash);
        return hash;
      } catch (error) {
        console.error('Error writing to contract:', error);
        return null;
      }
    },
    [state.walletClient, state.address]
  );

  // NEW: Generic transaction waiting function
  const waitForTransactionGeneric = useCallback(
    async (params: {
      hash: `0x${string}`;
    }): Promise<TransactionReceipt | null> => {
      console.log('Attempting waitForTransactionGeneric. PublicClient:', state.publicClient);
      if (!state.publicClient) {
        console.error('waitForTransactionGeneric called with null publicClient');
        return null;
      }

      try {
        console.log('Waiting for transaction confirmation:', params.hash);
        
        const receipt = await state.publicClient.waitForTransactionReceipt({
          hash: params.hash
        });

        console.log('Transaction receipt received:', receipt);
        return receipt;
      } catch (error) {
        console.error('Error waiting for transaction:', error);
        return null;
      }
    },
    [state.publicClient]
  );

  const memoizedValue = useMemo(
    () => ({
      state,
      error: state.error,
      connect,
      disconnect,
      switchNetwork,
      generateSignInMessage,
      signMessage,
      verifySignature,
      checkUniqueness,
      signTypedDataGeneric,
      writeContractGeneric,
      waitForTransactionGeneric,
    }),
    [
      state,
      connect,
      disconnect,
      switchNetwork,
      generateSignInMessage,
      signMessage,
      verifySignature,
      checkUniqueness,
      signTypedDataGeneric,
      writeContractGeneric,
      waitForTransactionGeneric,
    ]
  );

  return (
    <WalletContext.Provider value={memoizedValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextState => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
