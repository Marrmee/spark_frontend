import { useWallet } from '@/app/context/WalletContext';
import ConnectWallet from '@/app/components/general/ConnectWallet';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import Jazzicon from '@/app/components/general/Jazzicon';
import { useEnsName } from '@/app/components/hooks/UseEnsName';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

/**
 * WalletMenu component props
 * @param toggleAccountMenu - Function to toggle the account menu
 * @param showAccountMenu - Boolean indicating if the account menu is shown
 */
interface WalletMenuProps {
  toggleAccountMenu: () => void;
  showAccountMenu: boolean;
}

export default function WalletMenu({
  toggleAccountMenu,
  showAccountMenu,
}: WalletMenuProps) {
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const ensName = useEnsName(wallet?.state?.address ?? undefined);
  const isNetworkMismatched =
    wallet?.state?.chainId !== `0x${networkInfo?.chainId.toString(16)}`;

  const displayAddress =
    ensName ||
    (wallet?.state?.address
      ? `${wallet?.state?.address?.slice(0, 6)}...${wallet?.state?.address?.slice(-4)}`
      : '');

  useEffect(() => {
    if (showAccountMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAccountMenu]);

  const menuVariants = {
    closed: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
  };

  return (
    <div>
      <div className="flex w-full items-center justify-center gap-2 sm:gap-8">
        <div className="flex items-center justify-center">
          {isNetworkMismatched ? (
            <ConnectWallet
              isNavBar={true}
              toggleAccountMenu={toggleAccountMenu}
            />
          ) : wallet?.state?.isVerified ? (
            <button
              onClick={toggleAccountMenu}
              className="group flex items-center gap-2 rounded-lg bg-[#1B2885] px-3 transition-colors hover:bg-white/10 active:bg-white/20"
            >
              <span className="mt-2">
                <Jazzicon
                  address={String(wallet?.state?.address)}
                  diameter={28}
                />
              </span>
              <span className="hidden text-white transition-colors group-hover:text-seaBlue-500 sm:block">
                {displayAddress}
              </span>
            </button>
          ) : (
            <ConnectWallet
              isNavBar={true}
              toggleAccountMenu={toggleAccountMenu}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAccountMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[49] bg-black"
              onClick={toggleAccountMenu}
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="fixed right-0 top-0 z-[50] h-[100dvh] w-full max-w-screen-sm overflow-y-auto bg-seaBlue-1100/95 shadow-xl backdrop-blur-md transition-transform md:top-20 md:h-[calc(100dvh-5rem)] md:w-1/2 lg:w-2/5"
            >
              <div className="flex h-full flex-col px-2 sm:px-6 py-8 pt-16 md:pt-8">
                <button
                  onClick={toggleAccountMenu}
                  className="absolute right-4 top-4 rounded-full p-3 text-white transition-colors hover:bg-white/10 hover:text-seaBlue-500 active:bg-white/20 md:hidden"
                  aria-label="Close menu"
                >
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="mb-8 flex w-full flex-col items-center justify-center text-center">
                  <h2 className="text-3xl font-semibold text-white md:text-4xl">
                    Account Info
                  </h2>
                  <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-seaBlue-500"></div>
                </div>
                <div className="flex-grow">
                  {showAccountMenu && (
                    <ConnectWallet
                      isNavBar={true}
                      toggleAccountMenu={toggleAccountMenu}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
