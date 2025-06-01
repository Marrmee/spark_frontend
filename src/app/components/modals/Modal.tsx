import ModalUI from './ModalUI';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

export default function Modal({
  transactionHash,
  handler,
  title,
  subtitle,
  children,
}) {
  return (
    <ModalUI
      handler={handler}
      glowColorAndBorder={'border-seaBlue-1125 hover:shadow-glow-seafoamGreen-intermediate'}
    >
      <section className="flex h-full w-full flex-col items-center justify-center gap-8 px-4 py-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-acuminSemiBold text-3xl">{title}</h2>
          {subtitle && (
            <p className="text-base sm:text-lg text-gray-300">{subtitle}</p>
          )}
        </div>
        
        <div className="flex w-full flex-col gap-6">
          <h3 className="font-acuminSemiBold text-xl">What to do next?</h3>
          
          <div className="flex flex-col gap-4 text-base">
            <div>
              Follow the transaction status{' '}
              <a
                className="text-steelBlue hover:text-tropicalBlue transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
                href={transactionHash}
              >
                here{' '}
                <FontAwesomeIcon
                  icon={faExternalLinkAlt}
                  size="xs"
                />
              </a>
            </div>
            {children}
          </div>
        </div>
      </section>
    </ModalUI>
  );
}
