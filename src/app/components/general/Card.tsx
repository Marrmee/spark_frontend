export default function Card({ children }) {
  return (
    <div
      className="
        flex
        max-w-full
        items-center
        justify-center 
        xs:mt-12
        xs:mx-6
      "
    >
      <div
        className="
          max-w-full
          rounded-2xl 
          border-2
          border-tropicalBlue 
          shadow-glow-tropicalBlue-intermediate
        "
      >
        <div
          className="
            flex
            xs:h-[27rem]
            sm:h-[30rem]
            w-[25rem]
            max-w-full
            flex-col
            items-center
            justify-center
            whitespace-normal
            rounded-2xl
            bg-seaBlue-1075
            px-6
            sm:px-8
             
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}
