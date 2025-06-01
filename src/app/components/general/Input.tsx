import { useWallet } from '@/app/context/WalletContext';
import React, { useState, useEffect } from 'react';

export default function Input({ amount, setInputAmount, max }) {
  const wallet = useWallet();
  const [displayValue, setDisplayValue] = useState<string>('');

  // Reset display value when amount changes to 0 (after transaction)
  useEffect(() => {
    if (amount === 0) {
      setDisplayValue('');
    }
  }, [amount]);

  // Update display value when max changes (after balance refresh)
  useEffect(() => {
    // If there's a value entered and it exceeds the new max, adjust it
    if (displayValue && parseFloat(displayValue) > max) {
      setDisplayValue(formatDisplayValue(max));
      setInputAmount(max);
    }
  }, [max, displayValue, setInputAmount]);

  // Function to format display value with conditional decimals
  const formatDisplayValue = (value: number): string => {
    const roundedValue = Math.floor(value * 1000) / 1000; // Round down to 3 decimals
    return roundedValue % 1 === 0
      ? roundedValue.toFixed(0) // No decimals if the value is an integer
      : roundedValue.toFixed(3); // Keep 3 decimals otherwise
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(',', '.');
    const numericValue = parseFloat(value);
    
    // Only update if the value is empty or a non-negative number
    if (value === '' || (!isNaN(numericValue) && numericValue >= 0)) {
      setInputAmount(value);
      setDisplayValue(value);
    }
  };

  // Prevent minus sign from being entered
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === '-' || event.key === 'e') {
      event.preventDefault();
    }
  };

  // Handle max button click - always use the current max value
  const handleMaxClick = () => {
    if (wallet?.state?.provider) {
      // Always use the current max value from props
      setInputAmount(max.toString());
      setDisplayValue(formatDisplayValue(max));
    } else {
      setInputAmount('0');
      setDisplayValue('0');
    }
  };

  return (
    <div
      className="
        my-4
        flex
        w-full
        justify-between
        rounded-lg
        border-[1px]
        border-seaBlue-700
        bg-seaBlue-300
        p-2 
        px-4
        py-3
        text-seaBlue-950
        shadow-xl
        xs:text-base
        sm:text-lg
        "
    >
      <input
        className="
          w-full 
          bg-transparent 
          pl-1
          text-base 
          ring-transparent
          focus:outline-none 
          focus:ring-2
          sm:pl-2 
          sm:text-lg
          "
        type="number"
        min="0"
        step="any"
        value={displayValue}
        placeholder="Amount"
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        style={{
          MozAppearance: 'textfield',
        }}
      />
      <button
        className="px-2 
        text-base sm:text-lg
        "
        onClick={handleMaxClick}
      >
        Max
      </button>
    </div>
  );
}
