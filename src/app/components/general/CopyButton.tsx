import { useState } from 'react';
import { useWallet } from '@/app/context/WalletContext';

export default function Copy() {
  const [success, setSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const wallet = useWallet();
  const handleSetShowInfo = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 4000);
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className="flex flex-col justify-center"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <button
          onClick={() => {
            navigator.clipboard.writeText(wallet?.state?.address ?? '');
            handleSetShowInfo();
          }}
        >
          <svg
            className="h-5 w-5 text-steelBlue hover:text-tropicalBlue"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {' '}
            <path stroke="none" d="M0 0h24v24H0z" />{' '}
            <rect x="8" y="8" width="12" height="12" rx="2" />{' '}
            <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
        </button>
      </div>
      {success && (
        <div
          className="
            absolute
            z-20 
            mr-[13rem]
            mt-[4rem]
            flex
            h-auto
            w-[12rem]
            max-w-full
            items-center
            justify-center 
            whitespace-normal 
            rounded-xl 
            border-[1px]
            border-seaBlue-700 
            bg-seaBlue-1000
            p-3 
            text-base text-green-600"
        >
          Successfully copied!
        </div>
      )}
      {showInfo && (
        <div
          className="
            absolute
            z-10
            mr-[13rem] 
            mt-[4rem]
            flex
            h-auto
            w-[12rem]
            max-w-full
            items-center
            justify-center
            whitespace-normal 
            rounded-xl 
            border-[1px] 
            border-seaBlue-700 
            bg-seaBlue-1000
            p-3 
            text-base"
        >
          Copy your address
        </div>
      )}
    </div>
  );
}
