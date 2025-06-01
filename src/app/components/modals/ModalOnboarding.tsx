import ModalUI from './ModalUI';
import styles from './../general/Button.module.css';
import Link from 'next/link';

export default function ModalOnboarding({ handler }) {
  return (
    <ModalUI
      handler={handler}
      glowColorAndBorder={'border-highlightRed shadow-glow-highlightRed'}
    >
      <div
        className="
        flex
        flex-col
        items-center
        justify-center 
        text-center
        sm:w-[35rem]
        "
      >
        <h4
          className="
                font-acuminSemiBold 
                text-2xl
                uppercase
                text-highlightRed
                sm:text-3xl
                "
        >
          No ETH or USDC detected!
        </h4>
        <p className="mb-6 mt-4">
          To support our battle with life altering diseases (such as cancer and
          Alzheimer&apos;s Disease), you need to convert your FIAT (EUR, USD,
          JPY) to ETH or USDC .
        </p>
        <Link
          className={styles.primary}
          href={'https://www.moonpay.com/buy'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy Crypto
        </Link>
      </div>
    </ModalUI>
  );
}
