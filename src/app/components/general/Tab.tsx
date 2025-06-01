'use client';

import React from 'react';

type Props = {
  title: string;
  size: string;
  children;
};

const Tab: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex flex-col items-center justify-center sm:my-2 w-full">{children}</div>
  );
};

export default Tab;
