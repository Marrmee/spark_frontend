import Footer from './Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

/**
 * NavigationMenu component props
 * @param toggleNavigationMenu - Function to toggle the navigation menu
 * @param showNavigationMenu - Boolean indicating if the navigation menu is shown
 */
interface NavigationMenuProps {
  toggleNavigationMenu: () => void;
  showNavigationMenu: boolean;
}

const NavigationMenu = ({
  toggleNavigationMenu,
  showNavigationMenu,
}: NavigationMenuProps) => {
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (showNavigationMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showNavigationMenu]);

  const menuVariants = {
    closed: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
  };

  return (
    <section className="flex items-center justify-end bg-seaBlue-1100">
      <button
        className="relative flex h-10 w-12 items-center justify-center"
        onClick={toggleNavigationMenu}
        aria-label="Navigation menu"
      >
        <div className="group flex h-8 w-9 flex-col items-center justify-center">
          <span
            className={`absolute h-[4px] w-9 transform rounded-full bg-[#FDFDFD] transition-all duration-300 group-hover:bg-seaBlue-500 ${
              showNavigationMenu
                ? 'translate-y-0 rotate-45'
                : '-translate-y-2.5'
            }`}
          ></span>
          <span
            className={`absolute h-[4px] w-9 transform rounded-full bg-[#FDFDFD] transition-all duration-300 group-hover:bg-seaBlue-500 ${
              showNavigationMenu ? 'opacity-0' : 'opacity-100'
            }`}
          ></span>
          <span
            className={`absolute h-[4px] w-9 transform rounded-full bg-[#FDFDFD] transition-all duration-300 group-hover:bg-seaBlue-500 ${
              showNavigationMenu
                ? 'translate-y-0 -rotate-45'
                : 'translate-y-2.5'
            }`}
          ></span>
        </div>
      </button>

      <AnimatePresence>
        {showNavigationMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[49] bg-black"
              onClick={toggleNavigationMenu}
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="fixed right-0 top-0 z-[50] h-[100dvh] w-full max-w-screen-sm overflow-y-auto bg-seaBlue-1100/95 shadow-xl backdrop-blur-md transition-transform md:top-20 md:h-[calc(100dvh-5rem)] md:w-3/5 lg:w-1/2"
            >
              <div className="flex h-full flex-col px-6 py-8 pt-16 md:pt-8">
                <button
                  onClick={toggleNavigationMenu}
                  className="absolute right-4 top-4 rounded-full p-3 text-white transition-colors hover:bg-white/10 hover:text-seaBlue-500 active:bg-white/20 md:hidden"
                  aria-label="Close menu"
                >
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="mb-8 flex w-full flex-col items-center justify-center text-center">
                  <h2 className="text-3xl font-semibold text-white md:text-4xl">
                    Navigate
                  </h2>
                  <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-orange-300"></div>
                </div>
                <div className="flex w-full items-start justify-start text-left px-2 sm:px-4">
                  <Footer setIsOpen={toggleNavigationMenu} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
};

export default NavigationMenu;
