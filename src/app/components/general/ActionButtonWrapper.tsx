import { ReactNode } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import SwitchNetwork from './SwitchNetworkButton';
import ConnectWallet from './ConnectWallet';
import styles from './Button.module.css';

interface ActionButtonWrapperProps {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
}

export default function ActionButtonWrapper({
  children,
  isLoading,
  loadingText = 'Loading...',
}: ActionButtonWrapperProps) {
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();

  const isNetworkMismatched =
    wallet?.state?.chainId !== `0x${networkInfo?.chainId.toString(16)}`;

  if (!wallet?.state?.walletClient) {
    return <ConnectWallet isNavBar={false} toggleAccountMenu={() => null} />;
  }

  if (isNetworkMismatched) {
    return <SwitchNetwork />;
  }

  if (!wallet?.state?.isVerified) {
    return <ConnectWallet isNavBar={false} toggleAccountMenu={() => null} />;
  }

  if (isLoading) {
    return (
      <div className={`${styles.primary}`}>
        <span className="animate-pulse">{loadingText}&nbsp;&nbsp;</span>
        <span className="block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
      </div>
    );
  }

  return <>{children}</>;
} 