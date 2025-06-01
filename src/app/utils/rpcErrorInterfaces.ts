export interface AccessListItem {
  address: string;
  storageKeys: string[]; 
}

export type AccessList = AccessListItem[];

export interface TransactionError {
  from: string;
  to: string;
  data: string;
  accessList: AccessList;
}

export interface JsonRpcErrorData {
  code: number;
  message: string;
  data: string;
  cause: unknown;
}

export interface CustomError {
  shortMessage: string;
  name: string;
  details: string;
  docsPath?: string;
  metaMessages?: string[];
  version?: string;
  cause?: {
    name: string;
    code: number;
    shortMessage: string;
    details: string;
    version: string;
  };
  contractAddress?: string;
  functionName?: string;
  sender?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[];
}
