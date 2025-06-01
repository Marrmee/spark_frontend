'use client';
import React, { ReactElement, useState } from 'react';

type Props = {
  children: ReactElement[];
  startingIndex: number;
};

const Tabs: React.FC<Props> = ({ children, startingIndex }) => {
  const [selectedTab, setSelectedTab] = useState(startingIndex);

  return (
    <>
      <div
        className="
      flex 
      items-center 
      justify-center 
      sm:gap-4
      gap-2
      xs:my-2 
      sm:my-0
      whitespace-nowrap
      overflow-x-auto
      px-2
      w-full
      "
      >
        {children.map((item, index) => (
          <div
            key={index}
            className={`
              flex
              items-center
              justify-center
              text-xs
              xs:text-sm 
              sm:text-base
              min-w-fit
              `}
          >
            <button
              className={`
                flex h-8 sm:h-10 w-full items-center justify-center rounded-lg px-2 sm:px-4
                ${
                  selectedTab === index
                    ? 'bg-[#1B2885] hover:bg-[#263AAD]'
                    : 'bg-transparent'
                }  
                text-center font-semibold text-white
                transition-all duration-300
                text-xs xs:text-sm sm:text-base
                ${item.props.size}
              `}
              onClick={() => {
                setSelectedTab(index);
              }}
            >
              {item.props.title}
            </button>
          </div>
        ))}
      </div>
      {children[selectedTab]}
    </>
  );
};

export default Tabs;
