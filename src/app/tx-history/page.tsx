'use client';

import React from 'react';
import TransactionHistory from '../components/general/TransactionHistory';
import donationAbi from '@/app/abi/Donation.json';
import sciManagerAbi from '@/app/abi/SciManager.json';
import govResAbi from '@/app/abi/GovernorResearch.json';
import attestationVaultAbi from '@/app/abi/AttestationVault.json';
import poToSciExchangeAbi from '@/app/abi/PoToSciExchange.json';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';

interface ContractEventPair {
  address: string | undefined;
  /* eslint-disable-next-line */
  abi: any[];
  event: string | undefined;
}

export default function Locking() {

  const networkInfo = useNetworkInfo();

  const contracts: ContractEventPair[] = [
    {
      address: networkInfo?.donation,
      abi: donationAbi,
      event: 'Donated(address,address,uint256)',
    },
    {
      address: networkInfo?.sciManager,
      abi: sciManagerAbi,
      event: 'Locked(address,address,uint256)',
    },
    {
      address: networkInfo?.sciManager,
      abi: sciManagerAbi,
      event: 'Freed(address,address,uint256)',
    },
    {
      address: networkInfo?.governorResearch,
      abi: govResAbi,
      event: 'Proposed(uint256,address,string,uint256,uint256,address,bool)',
    },
    {
      address: networkInfo?.governorResearch,
      abi: govResAbi,
      event: 'Voted(uint256,address,bool,uint256)',
    },
    {
      address: networkInfo?.poToSciExchange,
      abi: poToSciExchangeAbi,
      event: 'Exchanged(address,uint256,uint256)',
    },
    {
      address: networkInfo?.attestationVault,
      abi: attestationVaultAbi,
      event: 'Attested(address,address,uint256)',
    },
  ];

  return (
      <TransactionHistory contracts={contracts} />
  );
}
