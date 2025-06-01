import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'primaryFixedWidth' | 'primaryNoFlex' | 'secondary' | 'tertiary' | 'incorrectNetwork';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const variants = {
    primary: `
      flex
      h-12 
      w-full
      items-center 
      justify-center 
      rounded-lg 
      border-[1px] 
      bg-[#1B2885]
      font-acuminSemiBold 
      shadow-xl 
      transition-all
      duration-300
      ease-in-out
      hover:cursor-pointer 
      hover:bg-seaBlue-500
      xs:text-base 
      md:text-lg
      disabled:cursor-not-allowed 
      disabled:bg-gray-700 
      disabled:opacity-75
    `,
    primaryFixedWidth: `
      flex
      h-12 
      min-w-[10rem]
      items-center 
      justify-center 
      rounded-lg 
      border-[1px] 
      border-seaBlue-700
      bg-seaBlue-700
      font-acuminSemiBold 
      shadow-xl 
      transition-all
      duration-300
      ease-in-out
      hover:cursor-pointer 
      hover:bg-seaBlue-500
      xs:text-sm 
      sm:text-base
      lg:text-lg
    `,
    primaryNoFlex: `
      h-12 
      w-full
      items-center 
      justify-center 
      rounded-lg 
      bg-seaBlue-700 
      font-acuminSemiBold
      shadow-xl 
      transition-all 
      duration-300 
      ease-in-out
      hover:cursor-pointer 
      hover:bg-seaBlue-500
      xs:py-3 
      xs:text-base 
      sm:py-3
      md:text-lg
    `,
    secondary: `
      flex 
      h-12
      w-full
      items-center 
      justify-center 
      rounded-lg 
      border-[1px] 
      border-solid 
      border-seaBlue-700 
      bg-seaBlue-300
      font-acuminSemiBold 
      text-seaBlue-700 
      shadow-xl
      transition-all 
      duration-300
      ease-in-out
      hover:cursor-pointer 
      hover:bg-seaBlue-200 
      xs:text-base 
      md:text-lg
      whitespace-nowrap
    `,
    tertiary: `
      inline-block 
      h-12 
      items-center 
      justify-center 
      px-4 
      py-2
      font-acuminSemiBold 
      text-seaBlue-700 
      underline 
      transition-all 
      duration-300 
      ease-in-out 
      hover:cursor-pointer 
      md:text-base 
      md:leading-8 
      lg:text-2xl 
      lg:leading-9
    `,
    incorrectNetwork: `
      flex 
      h-12 
      w-full 
      cursor-pointer 
      items-center 
      justify-center 
      rounded-lg 
      bg-highlightRed
      font-acuminSemiBold 
      shadow-xl 
      transition-all 
      duration-300 
      ease-in-out 
      hover:bg-seaBlue-500 
      xs:text-base 
      md:text-lg
    `
  };

  return (
    <button
      ref={ref}
      className={twMerge(
        variants[variant],
        disabled && 'disabled:cursor-not-allowed disabled:bg-gray-700 disabled:opacity-75',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="animate-pulse mr-2">
            Fetching Preview...
          </span>
          <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent" />
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };