'use client';

import { useState, useEffect } from 'react';
import { ExecutionOptions } from '@/app/utils/interfaces';
import {
  formatUnits,
  Address,
  getContract,
  zeroAddress,
} from 'viem';
import abiMap from '../governance/AbiMap';
import enumerateExecutionOptions from '../governance/EnumerateExecutionOptions';
import { publicClient } from '@/app/config/viem';

interface TransactionDetails {
  amountUsdc: number; // Balance of USDC
  amountSci: number; // Balance of SCI token
  targetWallet: Address; // Address of the target wallet
}

interface ImpeachmentDetails {
  impeachedWallets: Address[];
}

interface ElectionDetails {
  electedWallets: Address[];
}

interface GovernanceParametersDetails {
  gov: Address;
  param: string;
  data: string;
}

export default function useActionState(
  action: Address,
  executionOption: string
) {
  const [transactionDetails, setTransactionDetails] =
    useState<TransactionDetails | null>(null);
  const [electionDetails, setElectionDetails] =
    useState<ElectionDetails | null>(null);
  const [impeachmentDetails, setImpeachmentDetails] =
    useState<ImpeachmentDetails | null>(null);
  const [parameterChangeDetails, setGovernanceParametersDetails] =
    useState<GovernanceParametersDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchContractState = async () => {
      try {
        setLoading(true);
        const { abi } = abiMap[executionOption];
        const contract = getContract({
          address: action,
          abi,
          client: publicClient,
        } as const);

        switch (enumerateExecutionOptions(executionOption)) {
          case ExecutionOptions.Transaction: {
            const [amountUsdcBigInt, amountSciBigInt, targetWallet] =
              await Promise.all([
                contract.read.amountUsdc() as Promise<bigint>,
                contract.read.amountSci() as Promise<bigint>,
                contract.read.targetWallet() as Promise<Address>,
              ]);

            const amountUsdc = Number(formatUnits(amountUsdcBigInt, 6));
            const amountSci = Number(formatUnits(amountSciBigInt, 18));

            setTransactionDetails({
              amountUsdc,
              amountSci,
              targetWallet,
            });
            break;
          }
          case ExecutionOptions.Election: {
            const electedWallets =
              await (contract.read.getAllElectedWallets() as Promise<
                Address[]
              >);
            console.log('electedWallets from contract:', electedWallets);
            setElectionDetails({ electedWallets });
            break;
          }
          case ExecutionOptions.Impeachment: {
            const impeachedWallets =
              await (contract.read.getAllImpeachedWallets() as Promise<
                Address[]
              >);
            setImpeachmentDetails({ impeachedWallets });
            break;
          }
          case ExecutionOptions.ParameterChange: {
            const [param, data, gov] = await Promise.all([
              contract.read.humanReadableParam() as Promise<string>,
              contract.read.data() as Promise<string>,
              contract.read.gov() as Promise<Address>,
            ]);
            setGovernanceParametersDetails({ gov, param, data });
            break;
          }
          default:
            console.error('Unsupported execution option');
        }
      } catch (err) {
        console.error('Error fetching contract state:', err);
      } finally {
        setLoading(false);
      }
    };

    if (action !== zeroAddress && executionOption) {
      fetchContractState();
    }
  }, [executionOption, action]);

  return {
    loading,
    transactionDetails,
    electionDetails,
    impeachmentDetails,
    parameterChangeDetails,
  };
}
