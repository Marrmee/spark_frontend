import styles from '@/app/components/general/Button.module.css';
import { useWallet } from '@/app/context/WalletContext';

export default function SwitchNetwork() {
  const wallet = useWallet();

  return (
    <>
      <button
        className={styles.incorrectNetwork}
        onClick={() => {
          if (wallet?.state?.address) {
            wallet?.switchNetwork(
              wallet?.state?.provider,
              wallet?.state?.address
            );
          }
        }}
      >
        Switch to Base
      </button>
    </>
  );
}
