import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import TermModal from '../../general/TermModal';
import { useWallet } from '@/app/context/WalletContext';
import { ReactNode } from 'react';

interface DisplayBalanceProps {
  asset: string;
  state: string | number;
  children: ReactNode;
}

export default function DisplayBalance({ asset, state, children }: DisplayBalanceProps) {
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();

  return (
    <section className="items-between flex justify-between text-base sm:text-lg">
      <span>{asset}</span>
      <div className="relative">
        {state !== undefined &&
        wallet?.state?.address &&
        wallet?.state?.chainId === `0x${networkInfo?.chainId.toString(16)}` &&
        wallet?.state?.isVerified ? (
          <TermModal term={`${state}`}>{children}</TermModal>
        ) : state === undefined && wallet?.state?.address ? (
          <>
            <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-4 border-t-seaBlue-700"></span>
            <span className="animate-pulse">loading...</span>
          </>
        ) : wallet?.state?.chainId !==
            `0x${networkInfo?.chainId.toString(16)}` &&
          wallet?.state?.address ? (
          <span className="pl-2 text-sm sm:text-base text-highlightRed">switch network</span>
        ) : wallet?.state?.address && !wallet?.state?.isVerified ? (
          <span className="pl-2 text-sm sm:text-base text-highlightRed">sign message to view</span>
        ) : (
          <span className="pl-2 text-sm sm:text-base text-highlightRed">log in to view balance</span>
        )}
      </div>
    </section>
  );
}
