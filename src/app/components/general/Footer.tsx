import React from 'react';
import Link from 'next/link';
import {
  faDiscord,
  faTwitter,
  faTelegram,
} from '@fortawesome/free-brands-svg-icons';
import {
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { useWallet } from '@/app/context/WalletContext';
// import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
// import { usePathname } from 'next/navigation';

export default function Footer({ setIsOpen }) {
  // const wallet = useWallet();
  // const networkInfo = useNetworkInfo();
  // const pathName = usePathname();

  // const isActive = (path) => {
  //   return pathName === path;
  // };

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="grid w-full grid-cols-1 justify-items-start gap-y-10 whitespace-nowrap sm:grid-cols-3">
        {/* Platform column */}
        <div className="flex w-full flex-col items-start sm:items-start gap-2">
          <p className="whitespace-nowrap font-acuminSemiBold uppercase text-orange-500 md:text-sm lg:text-base">
            Platform
          </p>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/submit-idea"
            onClick={() => setIsOpen(false)}
          >
            Submit Idea
          </Link>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/review-ideas"
            onClick={() => setIsOpen(false)}
          >
            Review Ideas
          </Link>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/governance/"
            onClick={() => setIsOpen(false)}
          >
            Governance
          </Link>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/ip-portfolio"
            onClick={() => setIsOpen(false)}
          >
            Licensing & IP
          </Link>
        </div>

        {/* Resources column */}
        <div className="flex w-full flex-col items-start sm:items-start gap-2">
          <p className="whitespace-nowrap font-acuminSemiBold uppercase text-orange-500 md:text-sm lg:text-base">
            Resources
          </p>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/whitepaper.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
          >
            Whitepaper{' '}
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              size="xs"
              className="ml-1"
            />
          </Link>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/terms-of-service"
            onClick={() => setIsOpen(false)}
          >
            Terms of Service
          </Link>
          <Link
            className="text-left text-gray-300 hover:text-orange-500"
            href="/privacy-policy"
            onClick={() => setIsOpen(false)}
          >
            Privacy Policy
          </Link>
        </div>

        {/* Community column */}
        <div className="flex w-full flex-col items-start sm:items-start gap-2">
          <p className="whitespace-nowrap font-acuminSemiBold uppercase text-orange-500 md:text-sm lg:text-base">
            Community
          </p>
          <a
            className="text-left text-gray-300 hover:text-orange-500 flex items-center"
            href="https://discord.com/invite/75SrHpcNSZ"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
          >
            <FontAwesomeIcon icon={faDiscord} className="mr-2" />
            Discord
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              size="xs"
              className="ml-1"
            />
          </a>
          <a
            className="text-left text-gray-300 hover:text-orange-500 flex items-center"
            href="https://twitter.com/poscidondao"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
          >
            <FontAwesomeIcon icon={faTwitter} className="mr-2" />
            Twitter 
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              size="xs"
              className="ml-1"
            />
          </a>
          <a
            className="text-left text-gray-300 hover:text-orange-500 flex items-center"
            href="https://t.me/OfficialPoSciDonDAO"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
          >
            <FontAwesomeIcon icon={faTelegram} className="mr-2" />
            Telegram
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              size="xs"
              className="ml-1"
            />
          </a>
        </div>
      </div>

      <div className="mt-10 pt-8 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} Spark. All rights reserved.</p>
      </div>
    </div>
  );
}
