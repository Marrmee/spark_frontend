import ModalUI from './ModalUI';

export default function OffchainModal({ handler, title, subtitle, children }) {
  return (
    <ModalUI
      handler={handler}
      glowColorAndBorder={
        'border-seaBlue-1125 hover:shadow-glow-seafoamGreen-intermediate'
      }
    >
      <section className="flex h-full w-full flex-col items-center justify-center gap-2 sm:gap-4 p-3 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-acuminSemiBold text-xl sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-xs sm:text-base text-gray-300">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-4 text-base">{children}</div>
      </section>
    </ModalUI>
  );
}
