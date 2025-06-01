import styles from '@/app/components/general/Button.module.css';
import Copy from '@/app/components/general/CopyButton';
import TermModal from '@/app/components/general/TermModal';
import Link from 'next/link';
import SwitchNetwork from '@/app/components/general/SwitchNetworkButton';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignOutAlt,
  faBook,
  faExternalLinkAlt,
  faCheck,
  faTimes,
  faQuestionCircle,
  faSpinner,
  faSync,
} from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import { base, baseSepolia } from 'viem/chains';
import { useEcosystemBalances } from '@/app/components/hooks/UseEcosystemBalances';
import { useCoinBalance } from '@/app/components/hooks/UseCoinBalance';
import { useVoucher } from '@/app/context/VoucherContext';

// External verification URL - replace with actual URL when available
const EXTERNAL_VERIFICATION_URL =
  'https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs';

export default function AccountInfo({ disconnect, toggleAccountMenu }) {
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const explorer = `${networkInfo?.explorerLink}/address/${wallet.state.address}`;

  // Add hooks for balances
  const {
    sci,
    lockedSci,
    loading: ecosystemLoading,
  } = useEcosystemBalances(
    wallet.state.address || undefined,
    networkInfo?.po || undefined,
    networkInfo?.sci || undefined,
    networkInfo?.sciManager || undefined
  );
  const ethBalance = useCoinBalance(wallet.state.address || undefined, 4);

  // Local loading states
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);
  const [isRefreshButtonHovered, setIsRefreshButtonHovered] = useState(false);
  const { voucher, isLoading: isVoucherLoading } = useVoucher();

  // Combined uniqueness status
  const isUnique = wallet.state.isUniquePhone || wallet.state.isUniqueGovId;

  // Function to check uniqueness with local loading state
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState(0);
  const [isRefreshCoolingDown, setIsRefreshCoolingDown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const COOLDOWN_PERIOD_MS = 30000; // 30 seconds cooldown
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Define animation styles
  const fadeInAnimation = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, -5px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `;

  // Handle mouse enter with counter increment
  const handleMouseEnter = useCallback(() => {
    setIsRefreshButtonHovered(true);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsRefreshButtonHovered(false);
  }, []);

  const checkUniqueness = useCallback(async () => {
    const address = wallet.state.address;
    const checkUniquenessFunc = wallet.checkUniqueness;
    
    if (!address || !checkUniquenessFunc) return;

    // Check if we're in the cooldown period
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimestamp;
    
    if (timeSinceLastCheck < COOLDOWN_PERIOD_MS) {
      const remainingTimeSeconds = Math.ceil((COOLDOWN_PERIOD_MS - timeSinceLastCheck) / 1000);
      console.log(`[DEBUG] AccountInfo.checkUniqueness: Rate limit protection, please wait ${remainingTimeSeconds} seconds`);
      setIsRefreshCoolingDown(true);
      setCooldownRemaining(remainingTimeSeconds);
      
      // Clear any existing interval
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      
      // Set up an interval to update the countdown
      cooldownTimerRef.current = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
            }
            setIsRefreshCoolingDown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return;
    }

    console.log(`[DEBUG] AccountInfo.checkUniqueness: Starting check for address ${address}`);
    setIsRefreshCoolingDown(false);
    
    try {
      console.log(`[DEBUG] AccountInfo.checkUniqueness: Calling wallet context's checkUniqueness method`);
      await checkUniquenessFunc(address);
      console.log(`[DEBUG] AccountInfo.checkUniqueness: Completed uniqueness check`);
      console.log(`[DEBUG] AccountInfo.checkUniqueness: Updated wallet state:`, {
        isUniquePhone: wallet.state.isUniquePhone,
        isUniqueGovId: wallet.state.isUniqueGovId,
        phoneSbtExpiry: wallet.state.phoneSbtExpiry,
        govIdSbtExpiry: wallet.state.govIdSbtExpiry,
        uniquenessChecked: wallet.state.uniquenessChecked
      });
      
      // Update last check timestamp
      setLastCheckTimestamp(Date.now());
    } catch (error) {
      console.log(`[DEBUG] AccountInfo.checkUniqueness: Error during uniqueness check:`, error);
    }
  },
  [
    wallet.state.isUniqueGovId,
    wallet.state.isUniquePhone,
    wallet.state.phoneSbtExpiry,
    wallet.state.govIdSbtExpiry,
    wallet.state.uniquenessChecked,
    wallet.state.address, 
    wallet.checkUniqueness, 
    lastCheckTimestamp
  ]);

  // Cleanup the interval when component unmounts
  useEffect(() => {
    // Add the animation styles to the document head
    const styleEl = document.createElement('style');
    styleEl.textContent = fadeInAnimation;
    document.head.appendChild(styleEl);
    
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
      // Remove the style element when component unmounts
      document.head.removeChild(styleEl);
    };
  }, [fadeInAnimation]);

  // Function to get a voucher and redirect to verification page
  const getVoucherAndRedirect = (e) => {
    e.preventDefault();

    if (!wallet.state.address) {
      console.log(
        `[DEBUG] AccountInfo.getVoucherAndRedirect: No wallet address available, cannot get voucher`
      );
      return;
    }

    console.log(
      `[DEBUG] AccountInfo.getVoucherAndRedirect: Starting voucher request for address:`,
      wallet.state.address
    );
    setIsLoadingVoucher(true);
    try {
      if (voucher.verificationUrl) {
        console.log(
          `[DEBUG] AccountInfo.getVoucherAndRedirect: Using existing verification URL:`,
          voucher.verificationUrl
        );
        window.open(voucher.verificationUrl, '_blank');
      } else {
        console.log(
          `[DEBUG] AccountInfo.getVoucherAndRedirect: No verification URL found, using fallback URL:`,
          EXTERNAL_VERIFICATION_URL
        );
        window.open(EXTERNAL_VERIFICATION_URL, '_blank');
      }
    } catch (error) {
      console.error('Error:', error);
      console.log(
        `[DEBUG] AccountInfo.getVoucherAndRedirect: Exception occurred, using fallback URL:`,
        EXTERNAL_VERIFICATION_URL
      );
      // Fallback to default URL
      window.open(EXTERNAL_VERIFICATION_URL, '_blank');
    } finally {
      console.log(
        `[DEBUG] AccountInfo.getVoucherAndRedirect: Completed voucher request, resetting loading state`
      );
      setIsLoadingVoucher(false);
    }
  };

  // Check uniqueness when wallet is connected
  useEffect(() => {
    console.log(
      `[DEBUG] AccountInfo.useEffect: Uniqueness check dependency check with state:`,
      {
        address: wallet.state.address,
        uniquenessChecked: wallet.state.uniquenessChecked,
        isUniquenessLoading: wallet.state.isUniquenessLoading,
        isRefreshCoolingDown
      }
    );

    if (
      wallet.state.address &&
      !wallet.state.uniquenessChecked &&
      !wallet.state.isUniquenessLoading &&
      !isRefreshCoolingDown
    ) {
      console.log(
        `[DEBUG] AccountInfo.useEffect: Conditions met to trigger uniqueness check for address:`,
        wallet.state.address
      );
      checkUniqueness();
    } else {
      console.log(
        `[DEBUG] AccountInfo.useEffect: Not triggering uniqueness check, conditions not met:`,
        {
          hasAddress: !!wallet.state.address,
          alreadyChecked: wallet.state.uniquenessChecked,
          isCurrentlyChecking: wallet.state.isUniquenessLoading,
          isCoolingDown: isRefreshCoolingDown
        }
      );
    }
  }, [
    checkUniqueness,
    isRefreshCoolingDown,
    wallet.state.address,
    wallet.state.uniquenessChecked,
    wallet.state.isUniquenessLoading
  ]);

  function returnChain() {
    if (wallet?.state?.chainId === `0x${networkInfo?.chainId.toString(16)}`) {
      if (Number(wallet?.state?.chainId) === base.id) {
        return 'Base Mainnet';
      } else if (Number(wallet?.state?.chainId) === baseSepolia.id) {
        return 'Base Sepolia';
      } else {
        return 'Unsupported network';
      }
    } else {
      return 'Unsupported network';
    }
  }

  const isOnBase = useMemo(() => {
    if (wallet?.state?.chainId && networkInfo?.chainId) {
      const chainId1 =
        typeof networkInfo?.chainId === 'number'
          ? `0x${networkInfo.chainId.toString(16)}`
          : networkInfo?.chainId;
      const chainId2 =
        typeof wallet?.state?.chainId === 'number'
          ? `0x${Number(wallet?.state?.chainId).toString(16)}`
          : wallet?.state?.chainId;

      return chainId1 === chainId2;
    }
  }, [networkInfo?.chainId, wallet?.state?.chainId]);

  // Refresh button element with new hover handling
  const refreshButton = (
    <div className="relative ml-2 inline-block">
      <button
        onClick={checkUniqueness}
        className={`transition-colors focus:outline-none ${
          isRefreshCoolingDown 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-steelBlue hover:text-tropicalBlue'
        }`}
        title={!isRefreshCoolingDown ? "Refresh uniqueness status" : ""}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Refresh uniqueness status"
      >
        <FontAwesomeIcon
          icon={wallet.state.isUniquenessLoading ? faSpinner : faSync}
          className={
            wallet.state.isUniquenessLoading
              ? 'animate-spin'
              : isRefreshCoolingDown
                ? 'opacity-50'
                : 'transition-transform duration-500 hover:rotate-180'
          }
          size="sm"
        />
      </button>
      {isRefreshButtonHovered && cooldownRemaining > 0 && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 whitespace-nowrap">
          Please wait {cooldownRemaining}s
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 left-1/2 -ml-1 -bottom-1"></div>
        </div>
      )}
    </div>
  );

  // Format expiry date for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatExpiryDate = (expiryData: any) => {
    console.log(
      `[DEBUG] AccountInfo.formatExpiryDate: Processing expiry data:`,
      expiryData
    );
    if (!expiryData) {
      console.log(
        `[DEBUG] AccountInfo.formatExpiryDate: No expiry data provided, returning null`
      );
      return null;
    }

    // Handle different possible data formats
    let dateObj;

    try {
      if (expiryData.date instanceof Date) {
        // If it's already a Date object
        dateObj = expiryData.date;
        console.log(
          `[DEBUG] AccountInfo.formatExpiryDate: Using existing Date object:`,
          dateObj.toISOString()
        );
      } else if (expiryData.timestamp) {
        // If we have a timestamp in the data
        const timestamp =
          typeof expiryData.timestamp === 'bigint'
            ? Number(expiryData.timestamp)
            : Number(expiryData.timestamp);

        dateObj = new Date(timestamp * 1000); // Convert seconds to milliseconds
        console.log(
          `[DEBUG] AccountInfo.formatExpiryDate: Created Date from timestamp:`,
          dateObj.toISOString()
        );
      } else if (
        typeof expiryData === 'number' ||
        typeof expiryData === 'bigint'
      ) {
        // If it's just a timestamp value
        dateObj = new Date(Number(expiryData) * 1000);
        console.log(
          `[DEBUG] AccountInfo.formatExpiryDate: Created Date from direct timestamp:`,
          dateObj.toISOString()
        );
      } else {
        console.log(
          `[DEBUG] AccountInfo.formatExpiryDate: Unable to extract date from expiry data`
        );
        return null;
      }

      // Validate the date is valid
      if (isNaN(dateObj.getTime())) {
        console.log(
          `[DEBUG] AccountInfo.formatExpiryDate: Generated invalid date`
        );
        return null;
      }

      const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
      console.log(
        `[DEBUG] AccountInfo.formatExpiryDate: Formatted date result:`,
        formattedDate
      );
      return formattedDate;
    } catch (error) {
      console.log(
        `[DEBUG] AccountInfo.formatExpiryDate: Error formatting date:`,
        error
      );
      return null;
    }
  };

  // Render uniqueness status
  const renderUniquenessStatus = () => {
    console.log(
      `[DEBUG] AccountInfo.renderUniquenessStatus: Starting render with state:`,
      {
        isUniquenessLoading: wallet.state.isUniquenessLoading,
        uniquenessChecked: wallet.state.uniquenessChecked,
        isUniquePhone: wallet.state.isUniquePhone,
        isUniqueGovId: wallet.state.isUniqueGovId,
        phoneSbtExpiry: wallet.state.phoneSbtExpiry,
        govIdSbtExpiry: wallet.state.govIdSbtExpiry
      }
    );

    if (wallet.state.isUniquenessLoading) {
      console.log(
        `[DEBUG] AccountInfo.renderUniquenessStatus: Currently checking uniqueness`
      );
      return (
        <div className="flex items-center">
          <span className="text-gray-500">Checking...</span>
          <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
        </div>
      );
    }

    if (!wallet.state.uniquenessChecked) {
      console.log(
        `[DEBUG] AccountInfo.renderUniquenessStatus: Uniqueness not checked yet`
      );
      return (
        <div className="flex items-center">
          <span className="text-gray-500">Unknown</span>
          <FontAwesomeIcon icon={faQuestionCircle} className="ml-2" />
          {refreshButton}
        </div>
      );
    }

    if (isUnique) {
      console.log(
        `[DEBUG] AccountInfo.renderUniquenessStatus: User is unique, preparing expiry dates`
      );
      // Show expiry dates if available
      // Use type assertion to access the extended WalletState properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walletState = wallet.state as any;
      console.log(
        `[DEBUG] AccountInfo.renderUniquenessStatus: Extended wallet state:`,
        {
          phoneSbtExpiry: walletState.phoneSbtExpiry,
          govIdSbtExpiry: walletState.govIdSbtExpiry,
        }
      );

      const phoneExpiryDate = formatExpiryDate(walletState.phoneSbtExpiry);
      const govIdExpiryDate = formatExpiryDate(walletState.govIdSbtExpiry);
      console.log(
        `[DEBUG] AccountInfo.renderUniquenessStatus: Formatted expiry dates:`,
        {
          phone: phoneExpiryDate,
          govId: govIdExpiryDate,
        }
      );

      const expiryInfo: string[] = [];

      if (phoneExpiryDate) {
        expiryInfo.push(`Phone verification expires on ${phoneExpiryDate}`);
      }

      if (govIdExpiryDate) {
        expiryInfo.push(
          `Government ID verification expires on ${govIdExpiryDate}`
        );
      }

      console.log(
        `[DEBUG] AccountInfo.renderUniquenessStatus: Final expiry info array:`,
        expiryInfo
      );

      return (
        <div className="flex flex-col items-end">
          <div className="flex items-center">
            <span className="text-green-500">Yes</span>
            <FontAwesomeIcon icon={faCheck} className="ml-2 text-green-500" />
            {refreshButton}
          </div>
          {expiryInfo.length > 0 && (
            <div className="mt-1 text-right text-xs text-gray-500">
              {expiryInfo.join(', ')}
            </div>
          )}
        </div>
      );
    }

    console.log(
      `[DEBUG] AccountInfo.renderUniquenessStatus: User is not unique`
    );
    return (
      <div className="flex w-full items-center justify-center gap-4">
        <div className="flex items-center">
          <span className="text-highlightRed">No</span>
          <FontAwesomeIcon icon={faTimes} className="ml-2 text-highlightRed" />
          {refreshButton}
        </div>
        {isLoadingVoucher || isVoucherLoading ? (
          <span className="text-steelBlue">
            <FontAwesomeIcon icon={faSpinner} className="mr-1 animate-spin" />
            Loading...
          </span>
        ) : (
          <button
            onClick={getVoucherAndRedirect}
            className="text-steelBlue hover:underline"
            disabled={isLoadingVoucher || isVoucherLoading}
          >
            Verify <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-2">
      {wallet?.state?.address ? (
        <section
          className="
					my-1
					mb-2
					flex
					w-full
					flex-col
					items-center
					justify-center
					space-y-1
					text-center
					text-base
					sm:text-lg"
        >
          <div className="w-full space-y-4 p-2">
            <div className="relative flex w-full justify-between">
              <span>Current network:&nbsp;</span>
              <TermModal term={returnChain()}>
                This is the blockchain network you are currently connected to.
                Make sure you are connected to the Base network to lock tokens
                and vote on proposals.
              </TermModal>
            </div>
            <div className="relative flex w-full justify-between">
              Account address:&nbsp;
              {wallet.state.address ? (
                <div className="flex gap-2">
                  <TermModal
                    term={
                      wallet.state.address.slice(0, 6) +
                      '...' +
                      wallet.state.address.slice(-4)
                    }
                  >
                    This is the address of the account that is currently
                    connected to the app. Always verify the address and network
                    before performing any actions.
                  </TermModal>
                  <Copy />
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    href={explorer}
                    className="text-steelBlue hover:text-tropicalBlue"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                  </Link>
                </div>
              ) : (
                <div className="animate-pulse text-sm sm:text-base">
                  Loading...
                </div>
              )}
            </div>
            <div className="relative flex w-full items-start justify-between">
              <span className="pt-1">Unique:&nbsp;</span>
              <div className="flex items-start gap-1 text-right">
                {renderUniquenessStatus()}
              </div>
            </div>
            <div className="relative flex w-full justify-between">
              <span>ETH Balance:&nbsp;</span>
              {!wallet.state.address ? (
                <div className="animate-pulse text-sm sm:text-base">
                  Loading...
                </div>
              ) : (
                <TermModal
                  term={Number(ethBalance).toLocaleString(undefined, {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                >
                  This is your ETH balance on the Base network.
                </TermModal>
              )}
            </div>
            <div className="relative flex w-full justify-between">
              <span>SCI Balance:&nbsp;</span>
              {ecosystemLoading ? (
                <div className="animate-pulse text-sm sm:text-base">
                  Loading...
                </div>
              ) : (
                <TermModal
                  term={Number(sci).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                >
                  This is your SCI token balance on the Base network.
                </TermModal>
              )}
            </div>
            <div className="relative flex w-full justify-between">
              <span>loSCI Balance:&nbsp;</span>
              {ecosystemLoading ? (
                <div className="animate-pulse text-sm sm:text-base">
                  Loading...
                </div>
              ) : (
                <TermModal
                  term={Number(lockedSci).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                >
                  This is your locked SCI (loSCI) token balance on the Base
                  network.
                </TermModal>
              )}
            </div>
          </div>
          {!isOnBase ? (
            <div
              className={`flex w-full items-center justify-center rounded-lg bg-seaBlue-300 p-2 text-seaBlue-700`}
            >
              Change network to Base{' '}
              <Image
                alt="Base network logo"
                width={20}
                height={20}
                src={`/logo-base.svg`}
                className="ml-1"
              />
            </div>
          ) : null}
        </section>
      ) : (
        <div className="flex items-center justify-center">
          <span className="animate-pulse">Loading...</span>
          <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
        </div>
      )}
      <div className="w-full">
        {!isOnBase && wallet?.state?.address ? (
          <div className="m-1 flex gap-4">
            <SwitchNetwork />
            <button
              className={`${styles.primary} w-full`}
              onClick={() => {
                disconnect();
              }}
            >
              Disconnect{' '}
              <FontAwesomeIcon icon={faSignOutAlt} className="ml-2" />
            </button>
          </div>
        ) : (
          isOnBase && (
            <div className="flex flex-col gap-4">
              <div className="w-full">
                <Link
                  href={'/tx-history'}
                  onClick={toggleAccountMenu}
                  className={styles.secondary}
                >
                  View Transaction History{' '}
                  <FontAwesomeIcon icon={faBook} className="ml-2" />
                </Link>
              </div>
              <button
                className={`${styles.primary} w-full`}
                onClick={() => {
                  disconnect();
                }}
              >
                Disconnect{' '}
                <FontAwesomeIcon icon={faSignOutAlt} className="ml-2" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
