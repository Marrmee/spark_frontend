import { useWallet } from '@/app/context/WalletContext';

export default function Input({
  amount,
  setInputAmount,
  max,
  setSelectedAsset,
}) {
  const wallet = useWallet();

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
        text-seaBlue-950 
        shadow-xl
        xs:px-2
        xs:py-2 
        xs:text-base
        sm:px-4
        sm:py-3
        sm:text-lg
        "
    >
      <input
        className="
          w-full 
          bg-transparent 
          pl-2 
          ring-transparent
          focus:outline-none 
          focus:ring-2
          xs:text-2xs xs+:text-sm
          sm:text-lg
          "
        type="text"
        value={amount}
        placeholder="Amount"
        onChange={(event) => setInputAmount(event.target.value)}
      />
      <select
        className="
          mx-2 
          bg-transparent 
          ring-transparent
          focus:outline-none 
          focus:ring-2
          xs:text-2xs xs+:text-sm
          sm:text-lg
          "
        onChange={(event) => setSelectedAsset(event.target.value)}
      >
        <option value="SCI">SCI</option>
        <option value="USDC">USDC</option>
      </select>
      <button
        className="px-2"
        onClick={() => {
          wallet?.state?.walletClient && wallet?.state?.isVerified ? setInputAmount(max) : setInputAmount(0);
        }}
      >
        Max
      </button>
    </div>
  );
}
