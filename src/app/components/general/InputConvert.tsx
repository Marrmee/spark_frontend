import Image from 'next/image';

export default function DisplayConvertBalance({ balanceVouchers }) {
  return (
    <div className="my-2 flex w-full flex-col items-center gap-1">
      <div
        className="
      flex
      w-full
      justify-between
      rounded-lg
      border-[1px]
      border-seaBlue-700
      bg-seaBlue-300
      px-4
      py-3
      text-seaBlue-950
      shadow-xl"
      >
        <div className="flex flex-col items-start">
          <label className="xs:text-xs sm:text-base">Your Vouchers</label>
          <div className="text-xl sm:text-3xl">
            {Number(balanceVouchers).toLocaleString()}
          </div>
        </div>
        <div className="flex items-end justify-center">
          <Image
            width={20}
            height={20}
            src={''}
            alt={`SCI vouchers (vSCI) logo`}
            className="mr-2 h-5 w-5"
          />
          <span className="text-xl sm:text-3xl">vSCI</span>
        </div>
      </div>
      <div
        className="
        flex
        w-full
        justify-between
        rounded-lg
        border-[1px]
        border-seaBlue-700
        bg-seaBlue-300
        px-4
        py-3
         text-seaBlue-950
         shadow-xl"
      >
        <div className="flex w-full items-start">
          <div className="flex flex-col">
            <label className="xs:text-xs sm:text-base">
              You Receive{' '}
              <span className="text-highlightRed">(1 SCI per vSCI)</span>
            </label>
            <div
              className="
              w-full 
              bg-transparent 
              text-xl
              ring-transparent
              focus:outline-none 
              focus:ring-2 
              sm:text-3xl
              "
            >
              {Number(balanceVouchers).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-end justify-end">
          <span className="text-xl sm:text-3xl">SCI</span>
        </div>
      </div>
    </div>
  );
}
