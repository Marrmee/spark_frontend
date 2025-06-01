import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';
import ModalUI from '../modals/ModalUI';

interface Asset {
  logo: string;
  balance: string;
  name: string;
}

interface CustomDropdownProps {
  assets: { [key: string]: Asset };
  selectedAsset: string;
  setSelectedAsset: (asset: string) => void;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  assets,
  selectedAsset,
  setSelectedAsset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (asset: string) => {
    setSelectedAsset(asset);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-32">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
            flex 
            w-full 
            items-center 
            justify-between 
            rounded-lg
            border-[1px] 
            border-seaBlue-200
            bg-seaBlue-950
            p-2
            text-gray-300  
        "
      >
        <div className="flex w-full items-center justify-between">
          <Image
            width={20}
            height={20}
            src={assets[selectedAsset].logo}
            alt={`${selectedAsset} logo`}
            className="mr-2 h-5 w-5"
          />
          <span>{selectedAsset}</span>
          <div className="pointer-events-none flex items-center">
            <svg
              className="h-4 w-4 fill-current text-gray-400"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </button>
      {isOpen && (
        <ModalUI
          glowColorAndBorder={
            'border-tropicalBlue shadow-glow-tropicalBlue-intermediate'
          }
          handler={setIsOpen}
        >
          <div className="flex w-[20rem] flex-col gap-4 text-gray-300">
            <h3>Select an asset</h3>
            {Object.keys(assets).map((asset) => (
              <div
                key={asset}
                onClick={() => handleSelect(asset)}
                className="
                flex 
                cursor-pointer 
                items-center 
                justify-between 
                rounded-lg 
                border-[1px]
                border-seaBlue-500
                p-2
                hover:border-tropicalBlue
                hover:bg-seaBlue-900
                "
              >
                <div className="flex items-center">
                  <Image
                    width={20}
                    height={20}
                    src={assets[asset].logo}
                    alt={`${asset} logo`}
                    className="mr-2 h-5 w-5"
                  />
                  <div className="flex flex-col items-start justify-center">
                    <span>{assets[asset].name}</span>
                    <span className="text-sm text-gray-600">{asset}</span>
                  </div>
                </div>
                <span>{`${assets[asset].balance}`}</span>
              </div>
            ))}
          </div>
        </ModalUI>
      )}
    </div>
  );
};

export default CustomDropdown;
