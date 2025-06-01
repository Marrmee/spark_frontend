'use client';
import React from 'react';

const ProposalSkeleton = () => {
  return (
    <div className="group relative w-full overflow-hidden rounded-lg border border-seaBlue-700/50 bg-seaBlue-1100/50 p-6 backdrop-blur-sm transition-all hover:border-seafoamGreen/50 hover:shadow-glow-seafoamGreen-limited">
      {/* Title skeleton */}
      <div className="mb-4 h-7 w-3/4 animate-pulse rounded-md bg-seaBlue-700/30"></div>
      
      {/* Description skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-4 w-full animate-pulse rounded-md bg-seaBlue-700/30"></div>
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-seaBlue-700/30"></div>
        <div className="h-4 w-4/6 animate-pulse rounded-md bg-seaBlue-700/30"></div>
      </div>
      
      {/* Status and dates skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-2 h-3 w-3 animate-pulse rounded-full bg-seaBlue-700/40"></div>
          <div className="h-5 w-24 animate-pulse rounded-md bg-seaBlue-700/30"></div>
        </div>
        <div className="h-5 w-32 animate-pulse rounded-md bg-seaBlue-700/30"></div>
      </div>
      
      {/* Progress bar skeleton */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded-md bg-seaBlue-700/30"></div>
          <div className="h-4 w-16 animate-pulse rounded-md bg-seaBlue-700/30"></div>
        </div>
        <div className="h-2 w-full rounded-full bg-seaBlue-700/20">
          <div className="h-2 w-1/2 animate-pulse rounded-full bg-seaBlue-700/40"></div>
        </div>
      </div>
      
      {/* Execution option skeleton */}
      <div className="mb-4 flex items-center">
        <div className="mr-2 h-5 w-5 animate-pulse rounded-md bg-seaBlue-700/30"></div>
        <div className="h-5 w-40 animate-pulse rounded-md bg-seaBlue-700/30"></div>
      </div>
      
      {/* Status message skeleton */}
      <div className="mt-6 flex items-center justify-center">
        <div className="h-5 w-64 animate-pulse rounded-md bg-seaBlue-700/30"></div>
      </div>
    </div>
  );
};

export default ProposalSkeleton; 