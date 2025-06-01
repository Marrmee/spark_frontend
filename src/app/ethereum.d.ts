/* eslint-disable */
interface EthereumProvider extends EventTarget {
  request: (...args: any[]) => Promise<any>;
  enable: () => Promise<string[]>;
  send: (request: { method: string; params?: Array<any>; }, callback: (error: any, result: any) => void) => void;
  sendAsync: (request: { method: string; params?: Array<any>; }, callback: (error: any, result: any) => void) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
  isConnected: () => boolean;
  selectedAddress: string | null;
  chainId: string | null;
  networkVersion: string | null;
  isMetaMask: boolean;
  // Add any other properties or methods you use
}

interface Window {
  ethereum?: EthereumProvider;
}