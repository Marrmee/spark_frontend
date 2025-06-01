'use client';

import React, { ReactElement, useState, useRef } from 'react';
import { useClickOutside } from './ClickOutside';

type Props = {
  children: ReactElement[];
  startingIndex: number;
};

const DropdownTabs: React.FC<Props> = ({ children, startingIndex }) => {
  const [selectedTab, setSelectedTab] = useState(startingIndex);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => {
    if (isDropdownOpen) setIsDropdownOpen(false);
  });
  return (
    <>
      <div
        className="
      w-full  
      items-start 
      justify-center 
      xs:flex
      "
      >
        <div
          className="
          flex 
          h-full 
          w-[10rem] 
          items-center 
          justify-center 
          xs:mt-4 
          xs:text-sm 
          sm:mb-6             
          sm:mt-0 
          sm:text-base
          lg:text-lg"
        >
          <button
            className={`      
            w-[10rem]          
            rounded-lg
            bg-seaBlue-700
            px-3
            py-1
            flex
            items-center
            justify-between
            `}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{children[selectedTab].props.title}</span>
            <div className="pointer-events-none flex items-center">
              <svg
                className="h-4 w-4 fill-current text-gray-400"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </button>
        </div>

        {isDropdownOpen && (
          <div
            className="
            absolute 
            left-1/2 
            z-10 
            mt-11
            w-[10rem] 
            -translate-x-1/2 
            transform 
            flex-wrap 
            rounded-lg 
            border-[1px] 
            border-seaBlue-500 
            bg-seaBlue-950 
            text-center 
            shadow-lg
            "
            ref={dropdownRef}
          >
            {children.map((item, index) => (
              <div
                key={index}
                className="rounded-md px-3 py-1 text-white hover:cursor-pointer hover:bg-seaBlue-500 xs:text-sm sm:text-lg"
                onClick={() => {
                  setSelectedTab(index);
                  setIsDropdownOpen(false);
                }}
              >
                {item.props.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex min-h-[200px] items-center justify-center ">
        {children.map((item, index) => (
          <div
            key={index}
            className={`w-9/10 inset-0 flex
            ${index === selectedTab ? '' : 'hidden'}`}
          >
            {item}
          </div>
        ))}
      </div>
    </>
  );
};

export default DropdownTabs;
