'use client';

import AccountInfo from './AccountInfo';
import styles from './Button.module.css';
import { useState, useMemo } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import InfoToolTip from './InfoToolTip';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import SwitchNetwork from './SwitchNetworkButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

/**
 * ConnectWallet component props
 * @param isNavBar - Boolean indicating if the component is in the navbar
 * @param toggleAccountMenu - Function to toggle the account menu
 * @param nonce - A unique cryptographic nonce used for Content Security Policy (CSP)
 */
interface ConnectWalletProps {
  isNavBar: boolean;
  toggleAccountMenu: () => void;
  // nonce: string;
}

const ConnectWallet = ({ isNavBar, toggleAccountMenu }: ConnectWalletProps) => {
  const {
    state,
    connect,
    disconnect,
    signMessage,
    verifySignature,
    generateSignInMessage,
  } = useWallet();
  const { isLoading, isSilkModalLoading } = state;
  const networkInfo = useNetworkInfo();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  const handleSigning = async () => {
    if (!state?.address) return;
    if (state?.address?.toLowerCase() === networkInfo?.admin) return;
    const currentChainId = await state?.walletClient?.getChainId();
    const message = generateSignInMessage(state.address, currentChainId);
    if (state?.walletClient) {
      const signature = await signMessage(message);
      if (signature && state?.address) {
        await verifySignature(
          message,
          signature,
          state?.address,
        );
      }
    }
  };

  const handleConnect = async () => {
    if (!state?.walletClient) {
      try {
        await connect();
      } catch (error) {
        console.error('Error connecting to the wallet:', error);
      }
    }
  };

  const isNetworkMismatched = useMemo(() => {
    if (!state?.chainId || !networkInfo?.chainId) return false;
    const networkChainId = `0x${networkInfo.chainId.toString(16)}`;
    return state.chainId !== networkChainId;
  }, [state?.chainId, networkInfo?.chainId]);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleMouseEnterSwitchNetwork = () => setIsModalVisible(true);
  const handleMouseLeaveSwitchNetwork = () => setIsModalVisible(false);

  if (
    state?.walletClient &&
    isNetworkMismatched &&
    !state?.isLoading &&
    isNavBar
  ) {
    return (
      <div className="relative flex justify-center">
        <button
          className={`${styles.incorrectNetwork} px-4`}
          onMouseEnter={handleMouseEnterSwitchNetwork}
          onMouseLeave={handleMouseLeaveSwitchNetwork}
        >
          Switch to Base
        </button>

        {isModalVisible && (
          <div
            className="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-lg border-[1px] border-tropicalBlue bg-seaBlue-1100 px-4 py-3 text-center text-sm sm:text-base"
            onMouseEnter={handleMouseEnterSwitchNetwork}
            onMouseLeave={handleMouseLeaveSwitchNetwork}
          >
            <div className="flex flex-col gap-4">
              <div className="flex w-full items-center justify-center">
                <span>Switch to Base to connect</span>
                <div className="pl-1">
                  <InfoToolTip>
                    Base network, created by Coinbase, has low transaction fees,
                    making it cheap and feasible to lock your SCI tokens and
                    participate in PoSciDonDAO&apos;s governance systems.
                  </InfoToolTip>
                </div>
              </div>
              <SwitchNetwork />
              <button
                className={styles.primary}
                disabled={state?.isLoading}
                onClick={disconnect}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (
    state?.walletClient &&
    isNetworkMismatched &&
    !state?.isLoading &&
    !isNavBar
  ) {
    return <SwitchNetwork />;
  }

  if (
    state?.walletClient &&
    isNetworkMismatched &&
    state?.isLoading &&
    !isNavBar
  ) {
    return (
      <div
        className={`flex items-center gap-2 px-4 ${styles.incorrectNetwork}`}
      >
        Awaiting chain switch...
        <span className="block h-6 w-6 animate-spin rounded-full border-4 border-t-seaBlue-700"></span>
      </div>
    );
  }

  if (
    state?.walletClient &&
    !isNetworkMismatched &&
    !state?.isVerified &&
    !state?.isLoading &&
    !isNavBar &&
    state?.address?.toLowerCase() !== networkInfo?.admin.toLowerCase()
  ) {
    return (
      <button
        className={`${styles.incorrectNetwork} px-8`}
        disabled={state?.isLoading}
        onClick={handleSigning}
      >
        Sign message
      </button>
    );
  }

  if (
    !isNetworkMismatched &&
    !state?.isVerified &&
    state?.isLoading &&
    isNavBar
  ) {
    return (
      <div
        className={`flex items-center gap-2 px-4 ${styles.incorrectNetwork}`}
      >
        Signing...
        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
      </div>
    );
  }

  const handleMouseEnter = () => setIsDropdownVisible(true);
  const handleMouseLeave = () => setIsDropdownVisible(false);

  if (
    state?.walletClient &&
    !isNetworkMismatched &&
    !state?.isVerified &&
    !state?.isLoading &&
    isNavBar
  ) {
    return (
      <div className="relative flex justify-center">
        <button
          className={`${styles.incorrectNetwork} whitespace-nowrap px-4`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          Sign message
        </button>

        {isDropdownVisible && (
          <div
            className="absolute left-1/2 top-full w-[15rem] -translate-x-1/2 flex-col items-center rounded-lg border-[1px] border-seaBlue-1025 bg-seaBlue-1100 px-4 py-3 text-center text-sm sm:text-base"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex flex-col gap-4">
              <div className="flex w-full items-center justify-center">
                <span>Sign message to verify you control this wallet</span>
                <div className="pl-1">
                  <InfoToolTip>
                    Signing a message is necessary to confirm that you control
                    the wallet and that you are on the right website. Check the
                    URL and your wallet address. If you don&apos;t sign the
                    message you cannot perform actions on this website.
                  </InfoToolTip>
                </div>
              </div>
              <button
                className={styles.incorrectNetwork}
                disabled={state?.isLoading}
                onClick={handleSigning}
              >
                Sign message
              </button>
              <button
                className={styles.primary}
                disabled={state?.isLoading}
                onClick={disconnect}
              >
                Disconnect
                <FontAwesomeIcon icon={faSignOutAlt} className="ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state?.walletClient && state?.isVerified && !state?.isLoading) {
    return (
      <AccountInfo
        disconnect={disconnect}
        toggleAccountMenu={toggleAccountMenu}
      />
    );
  }

  if (isLoading || isSilkModalLoading) {
    return (
      <div
        className={`grid w-full place-content-center ${styles.primary}`}
      >
        <div className="flex items-center gap-2 whitespace-nowrap px-4">
          {isSilkModalLoading ? 'Loading wallet...' : 'Logging in...'}
          <span className="block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full items-center justify-center">
      <button
        className={`${styles.primary} w-full whitespace-nowrap px-4 sm:px-12`}
        disabled={isLoading || isSilkModalLoading}
        onClick={() => handleConnect()}
      >
        Log in
      </button>
    </div>
  );
};

export default ConnectWallet;
