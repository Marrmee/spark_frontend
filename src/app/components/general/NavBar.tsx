'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WalletMenu from '@/app/components/general/WalletMenu';
import ConnectWallet from './ConnectWallet';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import NavigationMenu from '@/app/components/general/NavigationMenu';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const [showNavigationMenu, setShowNavigationMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const navBarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isFrontPage = pathname === '/';

  const toggleNavigationMenu = () => {
    setShowNavigationMenu(!showNavigationMenu);
    setShowAccountMenu(false);
  };

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
    setShowNavigationMenu(false);
  };

  // Close menus when wallet state changes
  useEffect(() => {
    setShowAccountMenu(false);
    setShowNavigationMenu(false);
  }, [wallet?.state?.isVerified]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      navBarRef.current &&
      !navBarRef.current.contains(event.target as Node)
    ) {
      setShowNavigationMenu(false);
      setShowAccountMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav
      ref={navBarRef}
      className={`
      sticky
      top-0
      z-50
      flex
      w-full
      items-center
      justify-between
      px-4
      pt-4
      sm:px-8 
      ${isFrontPage ? 'bg-transparent' : 'bg-seaBlue-1100'}
      `}
    >
      <Link href="/">
        <Image
          width={150}
          height={100}
          priority={true}
          src={'/spark-logo.svg'}
          className="pr-4 hover:drop-shadow-[0_0_6px_#fb923c] sm:pr-0 sm:pt-2"
          alt="Spark Logo"
        />
      </Link>
      <div>
        {!wallet?.state?.walletClient ||
        wallet?.state?.chainId !== `0x${networkInfo?.chainId.toString(16)}` ||
        !wallet?.state?.isVerified ? (
          <div className="flex gap-4 sm:gap-8">
            <ConnectWallet
              isNavBar={true}
              toggleAccountMenu={toggleAccountMenu}
            />
            <NavigationMenu
              toggleNavigationMenu={toggleNavigationMenu}
              showNavigationMenu={showNavigationMenu}
            />
          </div>
        ) : (
          <div className="flex gap-4 sm:gap-8">
            <WalletMenu
              toggleAccountMenu={toggleAccountMenu}
              showAccountMenu={showAccountMenu}
            />
            <NavigationMenu
              toggleNavigationMenu={toggleNavigationMenu}
              showNavigationMenu={showNavigationMenu}
            />
          </div>
        )}
      </div>
    </nav>
  );
}
