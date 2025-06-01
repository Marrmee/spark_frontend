import DisplayBalance from '@/app/components/balances/display/DisplayBalance';
import { useWallet } from '@/app/context/WalletContext';
import { useEcosystemBalances } from '../hooks/UseEcosystemBalances';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { usePriceContext } from '@/app/context/PriceContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';
import { useVoucher } from '../../context/VoucherContext';

export default function SciTokenAndVotes() {
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const { prices, isLoading: isPriceLoading } = usePriceContext();
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);
  const { voucher, isLoading: isVoucherLoading } = useVoucher();
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(true);

  const { sci, lockedSci, votingRights } = useEcosystemBalances(
    wallet?.state?.address || undefined,
    '',
    networkInfo?.sci,
    networkInfo?.sciManager
  );

  // Get SCI price from the price context
  const sciPrice = prices.SCI ?? 0;

  // Check if user is unique (either phone or govId verification)
  const isUnique = wallet?.state?.isUniquePhone || wallet?.state?.isUniqueGovId;

  // Effect to handle uniqueness checking state
  useEffect(() => {
    if (!wallet?.state?.address || !wallet?.state?.isVerified) {
      setIsCheckingUniqueness(false);
      return;
    }

    setIsCheckingUniqueness(true);
    
    // Small delay to prevent flickering if the check is very fast
    const timer = setTimeout(() => {
      if (wallet?.state?.uniquenessChecked) {
        setIsCheckingUniqueness(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [wallet?.state?.address, wallet?.state?.isVerified, wallet?.state?.uniquenessChecked]);

  return (
    <>
      {wallet?.state?.address && wallet?.state?.isVerified ? (
        <div className="items-between flex w-full flex-col gap-1 text-lg md:text-xl">
          <DisplayBalance asset={'SCI'} state={Number(sci).toLocaleString()}>
            Current PoSciDonDAO token (SCI) balance.
          </DisplayBalance>
          <DisplayBalance
            asset={'loSCI'}
            state={Number(lockedSci).toLocaleString()}
          >
            Current locked PoSciDonDAO token (loSCI) balance on the Base
            network.
          </DisplayBalance>

          <DisplayBalance
            asset={'Total Value'}
            state={
              isPriceLoading
                ? 'Loading...'
                : '$' +
                  Number(
                    (Number(sci) + Number(lockedSci)) * sciPrice
                  ).toLocaleString()
            }
          >
            Current total value of your PoSciDonDAO tokens (SCI + loSCI) on the
            Base network.
          </DisplayBalance>

          {isCheckingUniqueness ? (
            <div className="flex w-full flex-col text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-steelBlue border-t-transparent"></div>
                <span className="text-base">Checking verification status...</span>
              </div>
            </div>
          ) : isUnique ? (
            <>
              <DisplayBalance
                asset={'Votes (no QV)'}
                state={Number(votingRights).toLocaleString()}
              >
                Your current voting rights without quadratic voting. You get one
                vote for every locked SCI token.{' '}
              </DisplayBalance>
              <DisplayBalance
                asset={'Votes (QV)'}
                state={Math.sqrt(Number(votingRights)).toLocaleString()}
              >
                Your current voting rights for proposals with quadratic voting
                (QV) enabled. In quadratic voting your voting power is the
                square root of the amount of locked SCI tokens.
              </DisplayBalance>
            </>
          ) : (
            <div className="flex w-full flex-col text-center sm:text-base text-sm">
              <hr className="w-full border-t-[1px] border-seaBlue-700" />
              <p className="mt-2 mb-1 text-highlightRed">Verification required to vote!</p>
              <p>
                Verify account with either phone or government ID{' '}
                <button
                  className="text-steelBlue hover:text-tropicalBlue inline-flex items-center"
                  onClick={() => {
                    if (!wallet.state.address) return;
                    
                    setIsLoadingVoucher(true);
                    try {
                      if (voucher.verificationUrl) {
                        window.open(voucher.verificationUrl, '_blank');
                      } else {
                        window.open(
                          'https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs',
                          '_blank'
                        );
                      }
                    } catch (error) {
                      console.error('Error opening verification URL:', error);
                      window.open(
                        'https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs',
                        '_blank'
                      );
                    } finally {
                      setIsLoadingVoucher(false);
                    }
                  }}
                  disabled={isLoadingVoucher || isVoucherLoading}
                >
                  here
                  {isLoadingVoucher || isVoucherLoading ? (
                    <span className="ml-1">Loading...</span>
                  ) : (
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      size="xs"
                      className="ml-1"
                    />
                  )}
                </button>
              </p>
            </div>
          )}
        </div>
      ) : wallet?.state?.address && !wallet?.state?.isVerified ? (
        <p className="h-32 flex items-center justify-center text-sm sm:text-base text-highlightRed">
          Sign message to view balances
        </p>
      ) : (
        <div className="flex w-full h-32 flex-col items-center justify-center gap-4 text-center">
          <p className="sm:text-base text-sm text-highlightRed">
            Log in to view balances
          </p>
        </div>
      )}
    </>
  );
}
