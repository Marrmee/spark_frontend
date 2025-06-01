'use client';

import { useRef } from 'react';
import { useClickOutside } from '../general/ClickOutside';

export default function ModalUI({ glowColorAndBorder, children, handler }) {
  /* eslint-disable-next-line */
  const modal = useRef<any>();
  useClickOutside(modal, () => handler(false));

  return (
    <div
      className="
        fixed 
        inset-0 
        z-40 
        flex 
        items-center 
        justify-center 
        overflow-hidden 
        bg-seaBlue-1100 
        bg-opacity-90
      "
    >
      <div
        className="
        flex
        w-full 
        h-full
        items-center 
        justify-center 
        p-3
        pt-8 
        sm:pt-12
        md:pt-16
        "
      >
        <div
          ref={modal}
          className={`
            flex 
            max-w-[35rem] 
            flex-col
            items-center
            justify-center 
            rounded-lg
            border-[1px]
            border-seaBlue-1025 
            bg-seaBlue-1075 
            sm:p-8
            p-2
            sm:w-auto
            w-full
            text-center 
            xs:text-base
            md:text-lg
            ${glowColorAndBorder}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
