import jazzicon from '@metamask/jazzicon';
import React, { useRef, useEffect } from 'react';

interface JazziconProps {
  address: string;
  diameter?: number;
}

const Jazzicon: React.FC<JazziconProps> = ({
  address,
  diameter = 20,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && address) {
      ref.current.innerHTML = '';
      const icon = jazzicon(diameter, parseInt(address.slice(2, 10), 16));
      ref.current.appendChild(icon);
    }
  }, [address, diameter]);

  return <div  ref={ref} />;
};

export default Jazzicon;