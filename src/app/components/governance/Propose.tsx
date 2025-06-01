'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  Address,
  Abi,
  parseAbiParameters,
  encodeAbiParameters,
  parseUnits,
  zeroAddress,
  formatUnits,
} from 'viem';
import { CustomError } from '@/app/utils/rpcErrorInterfaces';
import { useWallet } from '@/app/context/WalletContext';
import { useNotification } from '@/app/context/NotificationContext';
import {
  Payment,
  ExecutionOptions,
  GovernanceResearchParameters,
} from '@/app/utils/interfaces';
import { useGovernance } from '@/app/context/GovernanceContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useEcosystemBalances } from '@/app/components/hooks/UseEcosystemBalances';
import InfoToolTip from '@/app/components/general/InfoToolTip';
import { useTokenBalance } from '@/app/components/hooks/UseTokenBalance';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { convertSecondsToReadableTime } from '../general/ConvertSecondsToTime';
import enumerateExecutionOptions from './EnumerateExecutionOptions';
import styles from './../general/Button.module.css';
import Link from 'next/link';
import ConnectWallet from '../general/ConnectWallet';
import Modal from '../modals/Modal';
import ErrorDisplay from '../general/ErrorDisplay';
import sciAbi from '@/app/abi/Sci.json';
import usdcAbi from '@/app/abi/Usdc.json';
import govResAbi from '@/app/abi/GovernorResearch.json';
import ProposalConfirmationModal from '../modals/ProposalConfirmationModal';
import ErrorBoundary from '../ErrorBoundary';
import {
  enhancedSanitizeInput,
  generateCsrfToken,
  validateCsrfToken,
  stripColorStyling,
} from '@/app/utils/securityUtils';
import { enhancedScamCheck } from '@/app/utils/securityChecks';
import {
  SecurityEventType,
  logSecurityEvent,
} from '@/app/utils/securityMonitoring';
import { calculateCharacterCount } from '@/app/utils/textUtils';
import TitleEditor from '@/app/components/general/TitleEditor';
import './proposal-content.css';
import TiptapEditor from '@/app/components/text-editor/components/TiptapEditor';
import ProposalContent from './ProposalContent';
import { getLatestBlockTimestamp } from '@/app/components/governance/GetLatestBlockTimestamp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface EncodedActionParams {
  actionType: number;
  encodedParams: string;
}

interface CountdownTimerForProposalProps {
  governance: {
    indexGovRes: number;
    govResParams?: GovernanceResearchParameters;
  };
}

const CountdownTimerForProposal: React.FC<CountdownTimerForProposalProps> = ({
  governance,
}) => {
  const [timeLeft, setTimeLeft] = useState(20);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setShowLink(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const proposalLink = `/governance/research/proposals/${governance?.indexGovRes > 0 ? governance?.indexGovRes - 1 : governance?.indexGovRes}`;

  return (
    <div>
      {showLink ? (
        <div>
          View your proposal{' '}
          <Link
            className="text-steelBlue hover:text-tropicalBlue"
            href={proposalLink ?? null}
          >
            here
          </Link>
          .
        </div>
      ) : (
        <div>
          You can view your proposal in{' '}
          <span className="text-steelBlue hover:text-tropicalBlue">
            {timeLeft}{' '}
          </span>
          seconds.
        </div>
      )}
    </div>
  );
};

interface ProposeProps {
  // No props needed for research-only governance
}

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const researchSteps = [
    { number: 1, name: 'Proposal Details' },
    { number: 2, name: 'Summary' },
    { number: 3, name: 'Execution' },
    { number: 4, name: 'Review & Submit' },
  ];

  const steps = researchSteps;

  return (
    <div className="mb-8 w-full">
      <div className={`relative grid w-full grid-cols-4`}>
        {steps.map((step, index) => (
          <div key={step.number} className="flex flex-col items-center">
            {/* Line connector - only show if not the last step */}
            {index < steps.length - 1 && (
              <div
                className={`absolute top-6 h-0.5 ${
                  currentStep > step.number
                    ? 'bg-tropicalBlue'
                    : 'bg-seaBlue-800'
                } z-0`}
                style={{
                  left: `${(100 / steps.length) * (index + 0.5)}%`,
                  width: `${100 / steps.length}%`,
                }}
              />
            )}

            {/* Step circle */}
            <div
              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                currentStep > step.number
                  ? 'border-tropicalBlue bg-tropicalBlue text-white'
                  : currentStep === step.number
                    ? 'border-tropicalBlue bg-seaBlue-1100 text-tropicalBlue'
                    : 'border-seaBlue-800 bg-seaBlue-1100 text-seaBlue-600'
              }`}
            >
              {currentStep > step.number ? (
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="text-sm font-medium">{step.number}</span>
              )}
            </div>

            {/* Step name */}
            <span
              className={`mt-2 text-center text-xs font-medium ${
                currentStep >= step.number
                  ? 'text-tropicalBlue'
                  : 'text-seaBlue-600'
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Propose({}: ProposeProps) {
  // Add a ref for the top of the page
  const topRef = useRef<HTMLDivElement>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Replace verification states with our own state
  const [isVerifyingRecaptcha, setIsVerifyingRecaptcha] = useState(false);

  const [info, setInfo] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [summary, setSummary] = useState('');
  const [targetWallet, setTargetWallet] = useState('');
  const [executionOption, setExecutionOption] = useState('');
  const [encodedActionParams, setEncodedActionParams] =
    useState<EncodedActionParams>({
      actionType: 4,
      encodedParams: '0x',
    });
  const [understoodLock, setUnderstoodLock] = useState(false);
  const [understoodImmutability, setUnderstoodImmutability] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [paymentOption, setPaymentOption] = useState<Payment>(Payment.None);
  const [transactionAmountSci, setTransactionAmountSci] = useState('0');
  const [transactionAmountUsdc, setTransactionAmountUsdc] = useState('0');
  const [proposalInitiated, setProposalInitiated] = useState(false);
  const [lockingThresholdError, setLockingThresholdError] = useState('');
  const [lockingThresholdReached, setLockingThresholdReached] = useState(false);
  const [isLoadingProposal, setIsLoadingProposal] = useState(false);
  const [isLoadingProposalForm, setIsLoadingProposalForm] = useState(false);
  const [isLoadingDeployment, setIsLoadingDeployment] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();
  const governance = useGovernance();

  const [currentStep, setCurrentStep] = useState(1);
  const { addNotification } = useNotification();
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Track addresses that need ENS resolution
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addressesToResolve = useMemo(() => {
    const addresses: string[] = [];

    // Add target wallet if it exists
    if (targetWallet && targetWallet !== '') {
      addresses.push(targetWallet);
    }

    // Return unique addresses only
    return [...new Set(addresses)];
  }, [targetWallet]);

  // Convert Map to Record for compatibility with existing code
  const ensNames = useMemo(() => {
    const record: Record<string, string | null> = {};
    // For now, return empty record since we removed batch ENS names
    return record;
  }, []);

  // Generate CSRF token on component mount
  useEffect(() => {
    setCsrfToken(generateCsrfToken());
  }, []);

  // Helper function to scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add useEffect to scroll to top when component mounts
  useEffect(() => {
    // Scroll to the absolute top of the page
    scrollToTop();

    // Add a slight delay to ensure all content is loaded before scrolling
    const timeoutId = setTimeout(() => {
      scrollToTop();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const handlePreviewError = (message: string) => {
    addNotification(message, 'error');
  };

  const handleRpcError = (errorObj: CustomError) => {
    if (errorObj?.shortMessage) {
      addNotification(errorObj.shortMessage, 'error');
    }
  };

  const { lockedSci } = useEcosystemBalances(
    wallet?.state?.address ?? '',
    '',
    '',
    networkInfo?.sciManager
  );

  // Update getParamTypes to return proper types
  function getParamTypes(actionType: number) {
    switch (actionType) {
      case 0: // NotExecutable
        return [];

      case 1: // Transaction
        return parseAbiParameters(
          'address, address, uint256, uint256, address'
        );

      default:
        throw new Error('Invalid action type for parameter encoding');
    }
  }

  const sciBalanceTreasury = useTokenBalance(
    18,
    0,
    networkInfo?.researchFundingWallet,
    networkInfo?.sci,
    sciAbi as Abi
  );

  const usdcBalanceTreasury = useTokenBalance(
    6,
    0,
    networkInfo?.researchFundingWallet,
    networkInfo?.usdc,
    usdcAbi as Abi
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function convertTime(seconds: string | number): string {
    const timeInSeconds = Number(seconds);
    const isSmallScreen = window.innerWidth < 450;
    const ONE_HOUR = 3600;
    const ONE_DAY = 86400;
    const ONE_WEEK = 604800;

    if (timeInSeconds < 60) {
      // Less than a minute
      return `${Math.floor(timeInSeconds)} ${isSmallScreen ? 'sec.' : 'second(s)'}`;
    } else if (timeInSeconds < ONE_HOUR) {
      // Less than an hour
      const minutes = Math.floor(timeInSeconds / 60);
      const minuteLabel = isSmallScreen ? 'min.' : 'minute(s)';
      return `${minutes} ${minuteLabel}`;
    } else if (timeInSeconds < ONE_DAY) {
      // Less than a day
      const hours = Math.floor(timeInSeconds / ONE_HOUR);
      const hourLabel = isSmallScreen ? 'h.' : 'hour(s)';
      return `${hours} ${hourLabel}`;
    } else if (timeInSeconds < ONE_WEEK) {
      // Less than a week - use hours for precision as requested
      const hours = Math.floor(timeInSeconds / ONE_HOUR);
      const hourLabel = isSmallScreen ? 'h.' : 'hour(s)';
      return `${hours} ${hourLabel}`;
    } else {
      // A week or more - use days
      const days = Math.floor(timeInSeconds / ONE_DAY);
      const dayLabel = isSmallScreen ? 'd.' : 'day(s)';
      return `${days} ${dayLabel}`;
    }
  }

  const handleActionParams = async () => {
    let actionType: number;
    let params:
      | [`0x${string}`, `0x${string}`, bigint, bigint, `0x${string}`]
      | never[] = [];

    switch (enumerateExecutionOptions(executionOption)) {
      case ExecutionOptions.NotExecutable:
        actionType = 0;
        return { actionType, encodedParams: '0x' };

      case ExecutionOptions.Transaction:
        actionType = 1;
        params = [
          networkInfo?.researchFundingWallet as `0x${string}`,
          targetWallet as `0x${string}`,
          parseUnits(transactionAmountUsdc || '0', 6),
          parseUnits(transactionAmountSci || '0', 18),
          networkInfo?.governorExecutor as `0x${string}`,
        ];
        break;

      default:
        throw new Error('Invalid execution option');
    }

    const paramTypes = getParamTypes(actionType);
    const encodedParams = encodeAbiParameters(paramTypes, params);

    return {
      actionType,
      encodedParams,
    };
  };

  useEffect(() => {
    let timer;
    if (isLoadingProposal) {
      timer = setTimeout(() => {
        setIsSlowConnection(true);
        console.log('Slow connection detected after 30 seconds');
      }, 30000);
    } else {
      setIsSlowConnection(false);
    }

    return () => clearTimeout(timer);
  }, [isLoadingProposal]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateProposalDetails = (details) => {
    if (!details) {
      console.log('Proposal details are undefined');
      handlePreviewError('Proposal details are undefined');
      return false;
    }

    const requiredKeys = [
      'title',
      'body',
      'summary',
      'action',
      'quadraticVoting',
    ];

    const hasAllKeys = requiredKeys.every((key) => key in details);
    console.log('Proposal validation result:', hasAllKeys);
    return hasAllKeys;
  };

  const handleCopy = (input) => {
    navigator.clipboard
      .writeText(input)
      .then(() => {
        console.log('Copy successful:', input);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text:', err);
        setCopySuccess('Failed to copy');
      });
  };

  const checkEligibilityToExecute = async () => {
    if (!networkInfo || !wallet.state.publicClient) return;

    try {
      setIsLoadingProposal(true);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let contractGovRes;

      if (
        enumerateExecutionOptions(executionOption) ==
        ExecutionOptions.Transaction
      ) {
        // SCI uses 18 decimals
        const requestedBalanceSci = parseUnits(transactionAmountSci || '0', 18);
        // USDC uses 6 decimals
        const requestedBalanceUsdc = parseUnits(
          transactionAmountUsdc || '0',
          6
        );

        // Convert treasury balances to BigInt with proper decimal handling
        const sciTreasuryBN = sciBalanceTreasury
          ? parseUnits(sciBalanceTreasury.toString(), 18)
          : BigInt(0);
        const usdcTreasuryBN = usdcBalanceTreasury
          ? parseUnits(usdcBalanceTreasury.toString(), 6)
          : BigInt(0);

        // Check if any amount is requested
        if (
          requestedBalanceSci == BigInt(0) &&
          requestedBalanceUsdc == BigInt(0)
        ) {
          handlePreviewError(
            'Transaction amount cannot be 0 for both SCI and USDC'
          );
          return false;
        }

        // Check individual token amounts
        if (requestedBalanceSci !== BigInt(0)) {
          if (sciTreasuryBN < requestedBalanceSci) {
            const shortfall = requestedBalanceSci - sciTreasuryBN;
            handlePreviewError(
              `Insufficient SCI balance in research funding wallet. ` +
                `Requested: ${formatUnits(requestedBalanceSci, 18)} SCI, ` +
                `Available: ${formatUnits(sciTreasuryBN, 18)} SCI, ` +
                `Shortfall: ${formatUnits(shortfall, 18)} SCI`
            );
            return false;
          }
        }

        if (requestedBalanceUsdc !== BigInt(0)) {
          if (usdcTreasuryBN < requestedBalanceUsdc) {
            const shortfall = requestedBalanceUsdc - usdcTreasuryBN;
            handlePreviewError(
              `Insufficient USDC balance in research funding wallet. ` +
                `Requested: ${formatUnits(requestedBalanceUsdc, 6)} USDC, ` +
                `Available: ${formatUnits(usdcTreasuryBN, 6)} USDC, ` +
                `Shortfall: ${formatUnits(shortfall, 6)} USDC`
            );
            return false;
          }

          // Then check if we have enough buffer (30% of treasury balance)
          const minimumBuffer = (usdcTreasuryBN * BigInt(30)) / BigInt(100);
          const remainingAfterRequest = usdcTreasuryBN - requestedBalanceUsdc;

          if (remainingAfterRequest < minimumBuffer) {
            handlePreviewError(
              `Warning: Low treasury USDC buffer. ` +
                `After this transaction, only ${formatUnits(remainingAfterRequest, 6)} USDC will remain ` +
                `(minimum recommended buffer is ${formatUnits(minimumBuffer, 6)} USDC). ` +
                `Consider reducing the requested amount to maintain a safe buffer.`
            );
            return false;
          }
        }

        return true;
      }

      return false;
    } catch (err) {
      console.error('Error checking potential execution:', err);
      handleRpcError(err);
      return false;
    } finally {
      setIsLoadingProposal(false);
    }
  };

  const checkLockingThreshold = useCallback(async () => {
    try {
      const lockingThreshold = governance?.govResParams?.ddThreshold;
      console.log('Locking threshold obtained:', String(lockingThreshold));

      const lockedSciValue = Number(lockedSci);
      console.log();
      if (!isNaN(lockedSciValue) && Number(lockingThreshold) > lockedSciValue) {
        const deficit = Number(lockingThreshold) - lockedSciValue;
        console.log(`Insufficient SCI: Need ${deficit} more tokens`);
        setLockingThresholdError(
          `Insufficient SCI locked, you need to lock an additional ${deficit} SCI tokens to create proposals.`
        );
        setLockingThresholdReached(false);
      } else {
        console.log('Locking threshold reached');
        setLockingThresholdError('');
        setLockingThresholdReached(true);
      }
    } catch (error) {
      console.error('Error checking locking threshold:', error);
      setLockingThresholdError('Error checking locking threshold');
    }
  }, [lockedSci, governance?.govResParams?.ddThreshold]);

  useEffect(() => {
    const fetchLockingThresholdCheck = async () => {
      await checkLockingThreshold();
    };

    if (
      wallet?.state?.address &&
      wallet?.state?.isVerified &&
      lockedSci !== undefined &&
      lockedSci !== null
    ) {
      fetchLockingThresholdCheck();
    } else {
      console.log('Missing wallet address or staked SCI data');
    }
  }, [
    wallet?.state?.address,
    wallet?.state?.isVerified,
    lockedSci,
    checkLockingThreshold,
  ]);

  const checkEligibilityToPropose = async () => {
    try {
      console.log('Checking eligibility to propose...');
      const currentBlockTimestamp = await getLatestBlockTimestamp();
      console.log('Current block timestamp:', currentBlockTimestamp);
      const lockingThreshold = governance?.govResParams?.ddThreshold;

      if (lockedSci && Number(lockedSci) < Number(lockingThreshold)) {
        handlePreviewError(
          `Insufficient SCI locked, you need to lock an additional ${
            Number(lockingThreshold) - Number(lockedSci)
          } SCI`
        );
        return false;
      }

      if (networkInfo?.governorResearch && wallet.state.publicClient) {
        const DUE_DILIGENCE_ROLE = await wallet.state.publicClient.readContract(
          {
            address: networkInfo.governorResearch as `0x${string}`,
            abi: govResAbi as Abi,
            functionName: 'DUE_DILIGENCE_ROLE',
          }
        );

        // Check if user has Due Diligence role
        const hasRole = await wallet.state.publicClient.readContract({
          address: networkInfo.governorResearch as `0x${string}`,
          abi: govResAbi as Abi,
          functionName: 'hasRole',
          args: [DUE_DILIGENCE_ROLE, wallet.state.address as `0x${string}`],
        });
        console.log('User has Due Diligence Role:', hasRole);
        if (!hasRole) {
          handlePreviewError('You do not have the Due Diligence Role');
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('Error checking eligibility to propose:', err);
      const error = JSON.parse(JSON.stringify(err));
      handleRpcError(error);
      console.log(error);
    }
  };

  async function proposeResearch(info: string) {
    setIsLoadingProposal(true);
    if (
      networkInfo?.governorResearch &&
      wallet.state.publicClient &&
      wallet.state.walletClient
    ) {
      try {
        // Get Due Diligence role directly using publicClient.readContract
        const DUE_DILIGENCE_ROLE = await wallet.state.publicClient.readContract(
          {
            address: networkInfo.governorResearch as Address,
            abi: govResAbi as unknown as Abi,
            functionName: 'DUE_DILIGENCE_ROLE',
          }
        );

        // Check if user has Due Diligence role
        const hasDueDiligenceRole =
          await wallet.state.publicClient.readContract({
            address: networkInfo.governorResearch as Address,
            abi: govResAbi as unknown as Abi,
            functionName: 'hasRole',
            args: [DUE_DILIGENCE_ROLE, wallet.state.address as Address],
          });

        if (!hasDueDiligenceRole) {
          handlePreviewError('You do not have the Due Diligence Role');
          return;
        }

        const { request } = await wallet.state.publicClient.simulateContract({
          address: networkInfo.governorResearch as Address,
          abi: govResAbi as unknown as Abi,
          functionName: 'propose',
          args: [
            info,
            BigInt(encodedActionParams.actionType),
            encodedActionParams.encodedParams,
          ],
          account: wallet.state.address as Address,
        });

        const hash = await wallet.state.walletClient.writeContract(request);

        setTransactionHash(`${networkInfo?.explorerLink}/tx/${hash}`);
        setProposalInitiated(true);

        // Add optimized cache invalidation for new proposal
        try {
          // Get the current index from governance context
          const newIndex = governance?.indexGovRes ?? 0;

          await fetch('/api/invalidate-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'research',
              action: 'newProposal',
              newIndex: newIndex + 1, // +1 because the proposal we just created will be the next index
            }),
          });
          console.log(
            `✅ Cache updated for new research proposal with index ${newIndex + 1}`
          );
        } catch (invalidationError) {
          console.warn(
            'Cache invalidation after proposal creation failed:',
            invalidationError
          );
        }
      } catch (err) {
        console.error('Error checking eligibility to propose:', err);
        // Fix BigInt serialization issue using the same approach as in proposeOperation
        const error = JSON.parse(
          JSON.stringify(err, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        );
        handleRpcError(error);
        console.log(error);
      } finally {
        setIsLoadingProposal(false);
      }
    }
  }

  const handleProposalFetching = async (direct: boolean) => {
    try {
      setIsLoadingProposalForm(true);

      console.log('info:', info);

      if (!direct) {
        console.log('Fetching proposal details...');
        // Since we removed fetchProposalDetails, we'll handle this differently
        console.log('Direct proposal submission for research governance');
      }

      console.log('Checking eligibility to propose...');
      const eligible = await checkEligibilityToPropose();
      console.log('Eligibility check result:', eligible);

      if (!eligible) {
        // If not eligible, throw an error to prevent the modal from closing
        throw new Error('Not eligible to propose');
      }

      // Check if the proposal is "NotExecutable"
      if (
        !(
          enumerateExecutionOptions(executionOption) ==
          ExecutionOptions.NotExecutable
        )
      ) {
        console.log('Checking potential execution...');
        const executable = await checkEligibilityToExecute();
        console.log('Execution check result:', executable);

        // Only proceed if the proposal is executable
        if (executable) {
          console.log('Direct proposal, proceeding with proposal operation...');
          await proposeResearch(info);
        } else {
          console.log('Proposal is not executable, aborting operation.');
          throw new Error('Proposal is not executable');
        }
      } else {
        await proposeResearch(info);
      }
    } catch (err) {
      console.error('Error fetching proposal:', err);
      const error = JSON.parse(
        JSON.stringify(err, (_, value) =>
          typeof value == 'bigint' ? value.toString() : value
        )
      );

      // Check for the "unknown account #0" error
      if (
        error.code == 'UNSUPPORTED_OPERATION' &&
        error.shortMessage == 'unknown account #0'
      ) {
        handlePreviewError(
          'Your wallet is locked. Please unlock it and reconnect.'
        );
      } else {
        handlePreviewError(
          `Error: ${error.message || err.message || 'Unknown error'}`
        );
      }
      console.log('Parsed error:', error);

      // Re-throw the error so it can be caught by the confirmation modal's onConfirm handler
      throw err;
    } finally {
      setIsLoadingProposalForm(false);
    }
  };

  // Inside the Propose component, add a function to check for scams in proposal content
  const checkForScams = async (
    title: string,
    body: string,
    summary: string
  ) => {
    // Check title for scams
    const titleScamCheck = enhancedScamCheck(title);
    if (titleScamCheck.detected && titleScamCheck.severity !== 'low') {
      handlePreviewError(
        `Potential scam detected in title: ${titleScamCheck.patterns.join(', ')}`
      );

      // Log the security event
      await logSecurityEvent(
        SecurityEventType.SCAM_DETECTED,
        {
          content: 'proposal_title',
          patterns: titleScamCheck.patterns,
          proposalType: 'research',
        },
        titleScamCheck.severity
      );

      return false;
    }

    // Check body for scams
    const bodyScamCheck = enhancedScamCheck(body);
    if (bodyScamCheck.detected && bodyScamCheck.severity !== 'low') {
      handlePreviewError(
        `Potential scam detected in proposal body: ${bodyScamCheck.patterns.join(', ')}`
      );

      // Log the security event
      await logSecurityEvent(
        SecurityEventType.SCAM_DETECTED,
        {
          content: 'proposal_body',
          patterns: bodyScamCheck.patterns,
          proposalType: 'research',
        },
        bodyScamCheck.severity
      );

      return false;
    }

    // Check summary for scams
    const summaryScamCheck = enhancedScamCheck(summary);
    if (summaryScamCheck.detected && summaryScamCheck.severity !== 'low') {
      handlePreviewError(
        `Potential scam detected in summary: ${summaryScamCheck.patterns.join(', ')}`
      );

      // Log the security event
      await logSecurityEvent(
        SecurityEventType.SCAM_DETECTED,
        {
          content: 'proposal_summary',
          patterns: summaryScamCheck.patterns,
          proposalType: 'research',
        },
        summaryScamCheck.severity
      );

      return false;
    }

    // If low-risk patterns were detected, log them but don't block the proposal
    const lowRiskDetected =
      (titleScamCheck.detected && titleScamCheck.severity == 'low') ||
      (bodyScamCheck.detected && bodyScamCheck.severity == 'low') ||
      (summaryScamCheck.detected && summaryScamCheck.severity == 'low');

    if (lowRiskDetected) {
      console.debug('Low-risk patterns detected but not blocking proposal');

      // Combine all detected patterns from low-risk checks
      const allPatterns = [
        ...(titleScamCheck.detected && titleScamCheck.severity == 'low'
          ? titleScamCheck.patterns
          : []),
        ...(bodyScamCheck.detected && bodyScamCheck.severity == 'low'
          ? bodyScamCheck.patterns
          : []),
        ...(summaryScamCheck.detected && summaryScamCheck.severity == 'low'
          ? summaryScamCheck.patterns
          : []),
      ];

      // Show a warning notification instead of an error
      addNotification(
        `Note: Some phrases in your proposal might be flagged as promotional: ${allPatterns.join(', ')}. You can proceed, but consider revising if appropriate.`,
        'warning'
      );

      // Log the security event as low severity
      await logSecurityEvent(
        SecurityEventType.SCAM_DETECTED,
        {
          content: 'proposal_content',
          patterns: allPatterns,
          proposalType: 'research',
        },
        'low'
      );
    }

    return true;
  };

  // Update the generateProposalJson function to use enhanced sanitization
  const generateProposalJson = async () => {
    // First check for scams
    const isScamFree = await checkForScams(title, body, summary);
    if (!isScamFree) {
      return null;
    }

    // Strip color styling from content before sanitization
    const contentWithoutColor = {
      title: stripColorStyling(title),
      body: stripColorStyling(body),
      summary: stripColorStyling(summary),
    };

    // Use enhanced sanitization for all inputs
    const titleResult = await enhancedSanitizeInput(contentWithoutColor.title, {
      maxLength: TITLE_MAX_LENGTH,
      allowHtml: false,
    });

    const bodyResult = await enhancedSanitizeInput(contentWithoutColor.body, {
      maxLength: BODY_MAX_LENGTH, // Adjust as needed
      allowHtml: true,
      allowUrls: true,
    });

    const summaryResult = await enhancedSanitizeInput(
      contentWithoutColor.summary,
      {
        maxLength: SUMMARY_MAX_LENGTH, // Adjust as needed
        allowHtml: true, // Allow HTML in summary to preserve formatting
        allowUrls: false, // But don't allow URLs in summary for security
      }
    );

    // Check for validation issues
    if (!titleResult.isValid) {
      handlePreviewError(
        `Title validation failed: ${titleResult.issues.join(', ')}`
      );
      return null;
    }

    if (!bodyResult.isValid) {
      handlePreviewError(
        `Body validation failed: ${bodyResult.issues.join(', ')}`
      );
      return null;
    }

    if (!summaryResult.isValid) {
      handlePreviewError(
        `Summary validation failed: ${summaryResult.issues.join(', ')}`
      );
      return null;
    }

    return {
      title: titleResult.sanitizedInput,
      body: bodyResult.sanitizedInput,
      summary: summaryResult.sanitizedInput,
      executionOption: executionOption,
      quadraticVoting: false, // Research governance doesn't use quadratic voting
    };
  };

  // Research governance only needs basic validation - no parameter changes
  const TITLE_MAX_LENGTH = 130;
  const SUMMARY_MAX_LENGTH = 5000; // Maximum length for summary (approximately 250 words)
  const BODY_MAX_LENGTH = 30000;
  const MIN_LENGTH = 10;

  const validateEvmAddress = (
    address: string
  ): { isValid: boolean; error: string } => {
    // Check if address is empty
    if (!address || address.trim().length == 0) {
      return { isValid: false, error: 'Wallet address is required' };
    }

    // Check if address starts with 0x
    if (!address.startsWith('0x')) {
      return { isValid: false, error: 'Address must start with 0x' };
    }

    // Check if address is the correct length (42 characters = 0x + 40 hex characters)
    if (address.length !== 42) {
      return { isValid: false, error: 'Address must be 42 characters long' };
    }

    // Check if address contains only valid hex characters after 0x
    const hexRegex = /^0x[0-9a-fA-F]{40}$/;
    if (!hexRegex.test(address)) {
      return {
        isValid: false,
        error: 'Address must contain only valid hexadecimal characters',
      };
    }

    // Check if address is not the zero address
    if (address.toLowerCase() == zeroAddress) {
      return { isValid: false, error: 'Cannot use zero address' };
    }

    return { isValid: true, error: '' };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateEvmAddressArray = (
    addresses: string[]
  ): { isValid: boolean; error: string } => {
    // Check for duplicates
    const uniqueAddresses = new Set(
      addresses.map((addr) => addr.toLowerCase())
    );
    if (uniqueAddresses.size !== addresses.length) {
      return { isValid: false, error: 'Duplicate addresses are not allowed' };
    }

    // Validate each address
    for (const address of addresses) {
      const validation = validateEvmAddress(address);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true, error: '' };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate CSRF token from form
    const formData = new FormData(event.target as HTMLFormElement);
    const submittedCsrfToken = formData.get('csrf_token') as string;

    if (!validateCsrfToken(submittedCsrfToken, csrfToken)) {
      addNotification('Security validation failed. Please try again.', 'error');
      await logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        {
          action: 'proposal_submission',
          error: 'CSRF token validation failed',
        },
        'high',
        wallet?.state?.address || undefined
      );
      return;
    }

    if (!executeRecaptcha) {
      console.warn('[Propose] reCAPTCHA not yet available');
      addNotification(
        'Please wait for security verification to initialize.',
        'error'
      );
      return;
    }

    setIsVerifyingRecaptcha(true);
    let recaptchaToken;

    try {
      console.log('[Propose] Executing reCAPTCHA verification');
      recaptchaToken = await executeRecaptcha('proposal_submission');
      console.log('[Propose] reCAPTCHA token generated');
    } catch (error) {
      console.error('[Propose] reCAPTCHA generation error:', error);
      addNotification(
        'Could not perform security verification. Please try again.',
        'error'
      );
      setIsVerifyingRecaptcha(false);
      return;
    }

    // No longer verifying the token on the client side
    // The API will handle verification and return appropriate errors

    setIsVerifyingRecaptcha(false);

    if (!governance) return;

    try {
      setIsLoadingDeployment(true);

      console.log(
        'Attempting to deploy contract with execution option: ',
        enumerateExecutionOptions(executionOption)
      );
      const { actionType, encodedParams } = await handleActionParams();
      console.log('Action Type:', actionType);
      console.log('Encoded parameters:', encodedParams);
      setEncodedActionParams({
        actionType,
        encodedParams,
      });
      if (actionType != 0) {
        const executable = await checkEligibilityToExecute();
        if (!executable) return;
      }

      if (!actionType && !encodedParams) {
        console.error('Action Parameters Invalid');
        handlePreviewError('Action Parameters Invalid');
        return;
      }
    } catch (err) {
      console.error('Deployment failed with error:', err);
      handlePreviewError(err.message);
    } finally {
      setIsLoadingDeployment(false);
    }

    setIsLoadingProposalForm(true);

    console.log('JSON to save:', info);

    try {
      console.log('Generating proposal JSON...');
      const jsonFile = await generateProposalJson();

      // Convert any BigInt values to strings in the jsonFile
      const serializedJsonFile = JSON.parse(
        JSON.stringify(jsonFile, (key, value) =>
          typeof value == 'bigint' ? value.toString() : value
        )
      );

      console.log('Uploading proposal to IPFS via Pinata...');
      const response = await fetch('/api/upload-pinata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonFile: serializedJsonFile,
          isOperations: false, // Always false for research governance
          indexGovRes: governance.indexGovRes?.toString(),
          recaptchaToken, // Send the token to the API
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        const errorMessage =
          errorData.error ||
          `Failed to upload proposal to IPFS (${response.status})`;
        console.error('Upload error details:', errorData);
        handlePreviewError(errorMessage);
        return;
      }

      const { ipfsHash } = await response.json();
      setInfo(ipfsHash);
      console.log(`Proposal uploaded successfully. IPFS hash: ${ipfsHash}`);
    } catch (err) {
      console.error('Error fetching proposal:', err);
      handlePreviewError(err.message);
    } finally {
      setIsLoadingProposalForm(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const executionOptionDisplayText: { [key in ExecutionOptions]: string } = {
    [ExecutionOptions.NotExecutable]: 'Not Executable',
    [ExecutionOptions.Transaction]: 'Execute Transaction',
    [ExecutionOptions.ParameterChange]: 'Change Governance Parameter',
    [ExecutionOptions.Election]: 'Elect Scientist(s)',
    [ExecutionOptions.Impeachment]: 'Impeach Scientist(s)',
  };

  // Update the AddressWithEns component to use cached ENS names
  const AddressWithEns = ({
    address,
    inOption = false,
  }: {
    address: string;
    inOption?: boolean;
  }) => {
    if (!address) return null;

    const cachedEnsName = ensNames[address];
    const displayText = `${address.slice(0, 6)}...${address.slice(-4)}${cachedEnsName ? ` (${cachedEnsName})` : ''}`;

    if (inOption) {
      return displayText;
    }

    return (
      <span>
        {`${address.slice(0, 6)}...${address.slice(-4)}`}{' '}
        {cachedEnsName && <span className="ml-2">({cachedEnsName})</span>}
      </span>
    );
  };

  // Add useEffect for cleanup when modal is closed
  useEffect(() => {
    // When modal is closed, perform cleanup
    if (!showConfirmationModal) {
      // Force any potential injected UI to be removed
      const cleanup = setTimeout(() => {
        // This will trigger a small re-render that should clean up any stale references
        setCurrentStep(currentStep);
      }, 0);

      return () => clearTimeout(cleanup);
    }
  }, [showConfirmationModal, currentStep]);

  // Update the modal open/close handlers
  const openConfirmationModal = useCallback(() => {
    // Force a small delay to ensure any previous state is cleaned up
    setTimeout(() => {
      setShowConfirmationModal(true);
    }, 10);
  }, []);

  const closeConfirmationModal = useCallback(() => {
    // Close the modal
    setShowConfirmationModal(false);

    // Force cleanup after a small delay
    setTimeout(() => {
      // This will trigger a small re-render that should clean up any stale references
      setCurrentStep(currentStep);
    }, 50);
  }, [currentStep]);

  // Add a useEffect to ensure body character count is updated when content is pasted
  useEffect(() => {
    if (body) {
      // Force a re-render to update the character count display
      const textLength = calculateCharacterCount(body, true);
      console.debug(
        `Body useEffect: length=${textLength}, body=${body.substring(0, 100)}...`
      );
    }
  }, [body]);

  // Add state for body character count
  const [bodyCharCount, setBodyCharCount] = useState(
    body ? calculateCharacterCount(body, true) : 0
  );

  // Update body content and character count
  const handleBodyChange = (newBody: string) => {
    setBody(newBody);
    const count = calculateCharacterCount(newBody, true);
    setBodyCharCount(count);
    console.debug(`Body updated: character count=${count}`);
  };

  // Replace the updateBodyCharacterCount function with a simple state update
  const updateBodyCharacterCount = (count: number) => {
    setBodyCharCount(count);
    console.debug(`Updated body character count: ${count}`);
  };

  // Add a useEffect to update the character count when the component mounts
  useEffect(() => {
    // Force update the character count display for the body
    if (body) {
      const bodyCount = calculateCharacterCount(body, true);
      console.debug(`Initial body character count: ${bodyCount}`);

      // Update the character count display in the UI
      updateBodyCharacterCount(bodyCount);
    }
  }, [body]);

  // Add a useEffect to update the character count when the body state changes
  useEffect(() => {
    // Calculate the character count for the body
    const bodyCount = calculateCharacterCount(body, true);
    console.debug(`Body state changed: character count=${bodyCount}`);

    // Update the character count display in the UI
    updateBodyCharacterCount(bodyCount);
  }, [body]);

  // Add state for summary character count
  const [summaryCharCount, setSummaryCharCount] = useState(
    summary ? calculateCharacterCount(summary, true) : 0
  );

  // Update summary content and character count
  const handleSummaryChange = (newSummary: string) => {
    const count = calculateCharacterCount(newSummary, true);

    // Only update if within limits
    if (count <= SUMMARY_MAX_LENGTH) {
      setSummary(newSummary);
      setSummaryCharCount(count);
      console.debug(`Summary updated: character count=${count}`);
    }
  };

  const goToNextStep = () => {
    // Research governance has 5 steps total (1-5)
    setCurrentStep(currentStep + 1);
    // Scroll to the top of the page when moving to the next step
    scrollToTop();
  };

  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
    // Scroll to the top of the page when going back
    scrollToTop();
  };

  // Moderation state
  const [isCheckingModeration, setIsCheckingModeration] = useState(false);

  // Content moderation check function
  const checkContentModeration = async () => {
    setIsCheckingModeration(true);

    try {
      const response = await fetch('/api/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          summary,
          proposalBody: body,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.flaggedContent && data.flaggedContent.length > 0) {
          const firstFlag = data.flaggedContent[0];
          const errorMessage =
            (firstFlag.details && firstFlag.details.message) ||
            `Error: Inappropriate content detected in ${firstFlag.section}. Please revise your content.`;
          handlePreviewError(errorMessage);
          return false;
        }
        handlePreviewError(data.error || 'Failed to check content');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Moderation check error:', error);
      handlePreviewError('Error checking content. Please try again.');
      return false;
    } finally {
      setIsCheckingModeration(false);
    }
  };

  return (
    <div className="relative flex w-full flex-col items-center">
      <div
        className="mx-auto mt-0 flex w-full flex-col items-center sm:mt-2"
        ref={topRef}
      >
        {' '}
        {/* Add ref to the top div */}
        {wallet?.state?.address &&
        wallet?.state?.isVerified &&
        lockingThresholdReached ? (
          <>
            {info.length > 0 ? (
              <div className="mt-6 w-full space-y-4 rounded-lg border-[1px] border-tropicalBlue bg-seaBlue-1075 p-6 shadow-glow-tropicalBlue-intermediate sm:w-[36rem]">
                <div className="flex items-center justify-between pb-4">
                  <h2 className="flex items-center justify-center text-center text-lg font-semibold sm:text-2xl">
                    Upload successful
                  </h2>
                  <button
                    className="text-2xl font-bold text-highlightRed/80 transition-colors hover:text-highlightRed"
                    onClick={() => setInfo('')}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex w-full flex-col items-center justify-center space-x-2 rounded-lg border-[1px] border-seaBlue-1025 bg-seaBlue-1075 px-4 text-sm sm:flex-row sm:text-base">
                  <span className="whitespace-nowrap pt-4 text-seaBlue-100 sm:pt-0">
                    IPFS link:
                  </span>
                  <div className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-4">
                    <Link
                      href={`${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}${info}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-steelBlue hover:text-tropicalBlue"
                    >
                      <span>
                        {`${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}${info}`.slice(
                          0,
                          12
                        ) +
                          '...' +
                          `${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}/ipfs/${info}`.slice(
                            -6
                          )}
                      </span>
                      <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" />
                    </Link>
                    <div className="relative">
                      {copySuccess && (
                        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform">
                          <div className="animate-fade-in whitespace-nowrap rounded-lg bg-seaBlue-800 px-4 py-2 shadow-lg">
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="text-sm font-medium text-green-500">
                                Copied!
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          handleCopy(
                            `${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}${info}`
                          )
                        }
                        className="flex items-center gap-2 rounded-lg bg-seaBlue-800 px-4 py-2 transition-colors hover:bg-seaBlue-700"
                      >
                        <span className="text-tropicalBlue">Copy</span>
                        <svg
                          className="h-5 w-5 text-tropicalBlue"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path stroke="none" d="M0 0h24v24H0z" />
                          <rect x="8" y="8" width="12" height="12" rx="2" />
                          <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-0 rounded-lg border-[1px] border-seaBlue-1025 bg-seaBlue-1075 p-4">
                  {/* <h3 className="text-sm font-medium text-seaBlue-100 sm:text-base">Please confirm the following:</h3> */}

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="understoodLock"
                        checked={understoodLock}
                        onChange={() => setUnderstoodLock(!understoodLock)}
                        className="mt-1 h-5 w-5"
                      />
                      <label
                        htmlFor="understoodLock"
                        className="text-sm text-seaBlue-100 sm:text-base"
                      >
                        You understand that, after proposing, you will not be
                        able to unlock your tokens for{' '}
                        <span className="font-medium text-highlightRed">
                          {convertSecondsToReadableTime(
                            Number(governance?.govResParams?.proposeLockTime)
                          )}
                        </span>
                        .
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="understoodImmutability"
                        checked={understoodImmutability}
                        onChange={() =>
                          setUnderstoodImmutability(!understoodImmutability)
                        }
                        className="mt-1 h-5 w-5"
                      />
                      <label
                        htmlFor="understoodImmutability"
                        className="text-sm text-seaBlue-100 sm:text-base"
                      >
                        You understand that once submitted, the proposal content
                        cannot be modified or changed in any way.
                      </label>
                    </div>
                  </div>
                </div>

                {isLoadingProposalForm || isLoadingProposal ? (
                  <button className={`${styles.primary} w-full py-4 text-lg`}>
                    <span className="animate-pulse">
                      {isLoadingProposal
                        ? 'Submitting proposal...'
                        : isSlowConnection
                          ? 'This can take several minutes...'
                          : 'Fetching proposal...'}
                    </span>
                    <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <button
                      className={`${styles.primary} w-full py-4`}
                      onClick={() => {
                        if (understoodLock && understoodImmutability) {
                          openConfirmationModal();
                        } else {
                          handlePreviewError(
                            'Please confirm both checkboxes before proceeding'
                          );
                        }
                      }}
                      disabled={!understoodLock || !understoodImmutability}
                    >
                      Confirm proposal
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full">
                {currentStep == 1 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();

                      // Check character limits for title
                      if (
                        calculateCharacterCount(title, true) > TITLE_MAX_LENGTH
                      ) {
                        handlePreviewError(
                          `Title cannot exceed ${TITLE_MAX_LENGTH} characters (currently: ${calculateCharacterCount(title, true)})`
                        );
                        return;
                      }

                      // Check minimum length requirements for title
                      if (calculateCharacterCount(title, true) < MIN_LENGTH) {
                        handlePreviewError(
                          `Title must be at least ${MIN_LENGTH} characters long (currently: ${calculateCharacterCount(title, true)})`
                        );
                        return;
                      }

                      // If validations pass, proceed to next step
                      goToNextStep();
                    }}
                    className="
                      mx-auto 
                      mt-4         
                      flex
                      w-full
                      max-w-full
                      flex-col
                      space-y-4
                      overflow-hidden
                      rounded-lg
                      border-2
                      border-tropicalBlue
                      bg-seaBlue-1075 
                      p-4 
                      shadow-glow-tropicalBlue-intermediate
                      sm:space-y-8
                      sm:p-8 
                      lg:w-[60%]
                    "
                  >
                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />

                    <div className="flex flex-1 flex-col space-y-2">
                      <label className="flex items-center justify-between">
                        <div className="flex items-center">
                          Title<span className="py-2 text-highlightRed">*</span>{' '}
                          <InfoToolTip>
                            Title should be clear and concise. Only letters,
                            numbers, and basic punctuation are allowed. Minimum{' '}
                            {MIN_LENGTH} characters required. Text will be
                            formatted upon proposing.
                          </InfoToolTip>
                        </div>
                        <span
                          className={`text-sm ${calculateCharacterCount(title, true) > TITLE_MAX_LENGTH * 0.9 ? 'text-highlightRed' : 'text-gray-400'}`}
                        >
                          {calculateCharacterCount(title, true)}/
                          {TITLE_MAX_LENGTH} characters
                        </span>
                      </label>
                      <TitleEditor
                        content={title}
                        onChange={(text) => {
                          const textLength = calculateCharacterCount(
                            text,
                            true
                          );
                          if (textLength <= TITLE_MAX_LENGTH) {
                            setTitle(text);
                          } else {
                            handlePreviewError(
                              `Title cannot exceed ${TITLE_MAX_LENGTH} characters (currently: ${textLength})`
                            );
                          }
                        }}
                        maxLength={TITLE_MAX_LENGTH}
                        height="20px"
                      />
                    </div>

                    <div className="mt-4 flex justify-end gap-4">
                      <button
                        type="submit"
                        className={`${styles.primary} w-full bg-[#1B2885] hover:bg-[#263AAD]`}
                      >
                        Next
                      </button>
                    </div>
                  </form>
                )}

                {currentStep == 2 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();

                      // Check character limits for summary
                      if (
                        calculateCharacterCount(summary, true) >
                        SUMMARY_MAX_LENGTH
                      ) {
                        handlePreviewError(
                          `Summary cannot exceed ${SUMMARY_MAX_LENGTH} characters (currently: ${calculateCharacterCount(summary, true)})`
                        );
                        return;
                      }

                      // Check minimum length requirements for summary
                      if (calculateCharacterCount(summary, true) < MIN_LENGTH) {
                        handlePreviewError(
                          `Summary must be at least ${MIN_LENGTH} characters long (currently: ${calculateCharacterCount(summary, true)})`
                        );
                        return;
                      }

                      // If validations pass, proceed to next step
                      goToNextStep();
                    }}
                    className="
                      mx-auto 
                      mt-4         
                      flex
                      w-full
                      max-w-full
                      flex-col
                      space-y-4
                      overflow-hidden
                      rounded-lg
                      border-2
                      border-tropicalBlue
                      bg-seaBlue-1075 
                      p-4 
                      shadow-glow-tropicalBlue-intermediate
                      sm:space-y-8
                      sm:p-8 
                      lg:w-[60%]
                    "
                  >
                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />

                    <div className="flex flex-1 flex-col space-y-2">
                      <label className="flex items-center justify-between">
                        <div className="flex items-center">
                          Summary
                          <span className="py-2 text-highlightRed">*</span>{' '}
                          <InfoToolTip>
                            Provide a brief overview of your proposal in{' '}
                            {MIN_LENGTH}-{SUMMARY_MAX_LENGTH} characters. This
                            should contain the most important information of the
                            proposal.
                          </InfoToolTip>
                        </div>
                        <span
                          className={`text-sm ${
                            summaryCharCount > SUMMARY_MAX_LENGTH * 0.9
                              ? 'text-highlightRed'
                              : 'text-gray-400'
                          }`}
                        >
                          {summaryCharCount}/{SUMMARY_MAX_LENGTH} characters
                        </span>
                      </label>
                      <TiptapEditor
                        initialContent={summary}
                        onContentChange={(content) =>
                          handleSummaryChange(
                            content
                              ? typeof content === 'string'
                                ? content
                                : content.toString()
                              : ''
                          )
                        }
                        placeholder={{
                          paragraph: 'Provide a brief summary...',
                        }}
                        contentMinHeight={200}
                      />
                    </div>

                    <div className="mt-4 flex justify-between gap-4">
                      <button
                        type="button"
                        onClick={goToPreviousStep}
                        className={`${styles.secondary} 
                          w-full 
                          rounded-lg 
                          border-[1px] 
                          border-solid 
                          border-seaBlue-1025 
                          bg-seaBlue-300
                          font-acuminSemiBold 
                          text-seaBlue-1025 
                          `}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className={`${styles.primary} w-full bg-[#1B2885] hover:bg-[#263AAD]`}
                      >
                        Next
                      </button>
                    </div>
                  </form>
                )}

                {currentStep == 3 && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();

                      // Check character limits for body
                      if (
                        calculateCharacterCount(body, true) > BODY_MAX_LENGTH
                      ) {
                        handlePreviewError(
                          `Body cannot exceed ${BODY_MAX_LENGTH} characters (currently: ${calculateCharacterCount(body, true)})`
                        );
                        return;
                      }

                      // Check minimum length requirements for body
                      if (calculateCharacterCount(body, true) < MIN_LENGTH) {
                        handlePreviewError(
                          `Body must be at least ${MIN_LENGTH} characters (currently: ${calculateCharacterCount(body, true)})`
                        );
                        return;
                      }

                      // Run content moderation check
                      const moderationPassed = await checkContentModeration();
                      if (!moderationPassed) {
                        return;
                      }

                      // If validations pass, proceed to next step
                      goToNextStep();
                    }}
                    className="
                      mx-auto 
                      mt-4         
                      flex
                      w-full
                      max-w-full
                      flex-col
                      space-y-4
                      overflow-hidden
                      rounded-lg
                      border-2
                      border-tropicalBlue
                      bg-seaBlue-1075 
                      p-4 
                      shadow-glow-tropicalBlue-intermediate
                      sm:space-y-8
                      sm:p-8 
                      lg:w-[60%]
                    "
                  >
                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />

                    <div className="flex flex-1 flex-col space-y-2">
                      <label className="flex items-center justify-between">
                        <div className="flex items-center">
                          Body<span className="py-2 text-highlightRed">*</span>{' '}
                          <InfoToolTip>
                            Provide detailed information about your proposal.
                            Minimum {MIN_LENGTH} characters required. You can
                            use markdown formatting.
                          </InfoToolTip>
                        </div>
                        <span
                          className={`text-sm ${
                            bodyCharCount > BODY_MAX_LENGTH * 0.9
                              ? 'text-highlightRed'
                              : 'text-gray-400'
                          }`}
                        >
                          {bodyCharCount}/{BODY_MAX_LENGTH} characters
                        </span>
                      </label>
                      <div
                        className="body-editor"
                        style={{ width: '100%', maxWidth: '100%' }}
                      >
                        <TiptapEditor
                          initialContent={body}
                          onContentChange={(content) =>
                            handleBodyChange(
                              content
                                ? typeof content === 'string'
                                  ? content
                                  : content.toString()
                                : ''
                            )
                          }
                          placeholder={{
                            paragraph: 'Write your proposal details here...',
                          }}
                          contentMinHeight={200}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between gap-4">
                      <button
                        type="button"
                        onClick={goToPreviousStep}
                        className={`${styles.secondary} 
                          w-full 
                          rounded-lg 
                          border-[1px] 
                          border-solid 
                          border-seaBlue-1025 
                          bg-seaBlue-300
                          font-acuminSemiBold 
                          text-seaBlue-1025 
                          `}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isCheckingModeration}
                        className={`${styles.primary} w-full bg-[#1B2885] hover:bg-[#263AAD] ${isCheckingModeration ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {isCheckingModeration ? 'Checking...' : 'Next'}
                      </button>
                    </div>
                  </form>
                )}

                {currentStep == 4 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      goToNextStep();
                    }}
                    className="
                      mx-auto 
                      mt-4         
                      flex
                      w-full
                      flex-col
                      space-y-4
                      overflow-hidden
                      rounded-lg
                      border-2
                      border-tropicalBlue
                      bg-seaBlue-1075 
                      p-4 
                      shadow-glow-tropicalBlue-intermediate
                      sm:space-y-8
                      sm:p-8 
                      lg:w-[60%]
                    "
                  >
                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />
                    {/* Add hidden CSRF token field */}
                    <input type="hidden" name="csrf_token" value={csrfToken} />

                    <div className="flex w-full flex-col space-y-2">
                      <label className="">
                        Is it a transaction?
                        <span className="py-2 text-highlightRed">*</span>{' '}
                        <InfoToolTip>
                          Research Funding governance has two proposal action
                          types: Transaction and Not Executable. Transaction
                          proposals transfer funds from the research funding
                          wallet to the target wallet address which is the
                          address provided by the scientists used for their
                          research proposal. NotExecutable proposals address the
                          Due Diligence process, deal source process and more.
                        </InfoToolTip>
                      </label>
                      <select
                        name="executionOption"
                        value={executionOption}
                        onChange={(e) => setExecutionOption(e.target.value)}
                        required
                        className="w-full rounded-lg border bg-seaBlue-100 px-2 py-3 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                      >
                        <option value="">Select option</option>
                        <option value="Transaction">Yes</option>
                        <option value="NotExecutable">No</option>
                      </select>
                    </div>

                    {executionOption == 'Transaction' ? (
                      <div className="flex flex-col space-y-2">
                        <label className="">
                          Payment Option
                          <span className="py-2 text-highlightRed">*</span>{' '}
                          <InfoToolTip>
                            This allows you to choose which digital asset will
                            be used to execute the transaction to the target
                            wallet address.
                          </InfoToolTip>
                        </label>
                        <select
                          name="paymentOption"
                          value={paymentOption}
                          onChange={(e) =>
                            setPaymentOption(
                              e.target.value as unknown as Payment
                            )
                          }
                          required
                          className="w-full rounded-lg border bg-seaBlue-100 px-2 py-3 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                        >
                          <option value="">Select a payment option</option>
                          <option value={Payment.Sci}>
                            PoSciDonDAO Token (SCI)
                          </option>
                          <option value={Payment.Usdc}>USD Coin (USDC)</option>
                          <option value={Payment.SciUsdc}>
                            PoSciDonDAO Token (SCI) and USD Coin (USDC)
                          </option>
                        </select>
                      </div>
                    ) : null}
                    {executionOption == 'Transaction' &&
                      paymentOption == Payment.Sci && (
                        <div className="flex flex-1 flex-col gap-2">
                          <label>
                            Amount SCI
                            <span className="py-2 text-highlightRed">
                              *
                            </span>{' '}
                            <InfoToolTip>
                              The amount of PoSciDonDAO Token (SCI) on the Base
                              network that the target wallet address will
                              receive once the proposal has passed.
                            </InfoToolTip>
                          </label>
                          <input
                            autoComplete="on"
                            type="number"
                            name="amount"
                            placeholder="Enter SCI amount"
                            value={transactionAmountSci}
                            onChange={(e) => {
                              const value = e.target.value;
                              const isValid = /^\d*\.?\d*$/.test(value);
                              if (isValid) {
                                setTransactionAmountSci(value);
                              }
                            }}
                            required
                            className="w-full rounded-lg border bg-seaBlue-100 p-2 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                          />
                        </div>
                      )}
                    {executionOption == 'Transaction' &&
                      paymentOption == Payment.Usdc && (
                        <div className="flex flex-1 flex-col gap-2">
                          <label>
                            Amount USDC
                            <span className="py-2 text-highlightRed">
                              *
                            </span>{' '}
                            <InfoToolTip>
                              The amount of USD Coin (USDC) that the target
                              wallet address will receive once the proposal has
                              passed.
                            </InfoToolTip>
                          </label>
                          <input
                            autoComplete="on"
                            type="number"
                            name="amount"
                            placeholder="Enter USDC amount"
                            value={transactionAmountUsdc}
                            onChange={(e) => {
                              const value = e.target.value;
                              const isValid = /^\d*\.?\d*$/.test(value);
                              if (isValid) {
                                setTransactionAmountUsdc(value);
                              }
                            }}
                            required
                            className="w-full rounded-lg border bg-seaBlue-100 p-2 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                          />
                        </div>
                      )}
                    {executionOption == 'Transaction' &&
                      paymentOption == Payment.SciUsdc && (
                        <div className="flex flex-1 flex-col gap-6">
                          <div className="flex flex-col gap-2">
                            <label>
                              Amount SCI
                              <span className="py-2 text-highlightRed">
                                *
                              </span>{' '}
                              <InfoToolTip>
                                The amount of PoSciDonDAO Token (SCI) on the
                                Base network that the target wallet address will
                                receive once the proposal has passed.
                              </InfoToolTip>
                            </label>
                            <input
                              autoComplete="on"
                              type="number"
                              name="amount"
                              placeholder="Enter amount"
                              value={transactionAmountSci}
                              onChange={(e) => {
                                const value = e.target.value;
                                const isValid = /^\d*\.?\d*$/.test(value);
                                if (isValid) {
                                  setTransactionAmountSci(value);
                                }
                              }}
                              required
                              className="w-full rounded-lg border bg-seaBlue-100 p-2 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label>
                              Amount USDC
                              <span className="py-2 text-highlightRed">
                                *
                              </span>{' '}
                              <InfoToolTip>
                                The amount of USD Coin (USDC) that the target
                                wallet address will receive once the proposal
                                has passed.
                              </InfoToolTip>
                            </label>
                            <input
                              autoComplete="on"
                              type="number"
                              name="amount"
                              placeholder="Enter amount USDC"
                              value={transactionAmountUsdc}
                              onChange={(e) => {
                                const value = e.target.value;
                                const isValid = /^\d*\.?\d*$/.test(value);
                                if (isValid) {
                                  setTransactionAmountUsdc(value);
                                }
                              }}
                              required
                              className="w-full rounded-lg border bg-seaBlue-100 p-2 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                            />
                          </div>
                        </div>
                      )}
                    {executionOption == 'Transaction' && (
                      <div className="flex flex-1 flex-col gap-2">
                        <label className="flex items-center justify-between">
                          <div className="flex items-center">
                            Target Wallet Address
                            <span className="py-2 text-highlightRed">
                              *
                            </span>{' '}
                            <InfoToolTip>
                              The Base network wallet address of the target,
                              starting with 0x. This address belongs to the
                              scientists that potentially receive funding for
                              their research proposal. Must be a valid EVM
                              address.
                            </InfoToolTip>
                          </div>
                        </label>
                        <input
                          autoComplete="on"
                          type="text"
                          name="targetWallet"
                          value={targetWallet}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTargetWallet(value);
                            // Provide immediate feedback
                            const validation = validateEvmAddress(value);
                            if (!validation.isValid && value.length > 0) {
                              handlePreviewError(validation.error);
                            }
                          }}
                          required
                          placeholder="0x..."
                          pattern="^0x[a-fA-F0-9]{40}$"
                          title="Must be a valid EVM address starting with 0x followed by 40 hexadecimal characters"
                          className="w-full rounded-lg border bg-seaBlue-100 p-2 text-seaBlue-1050 ring-2 ring-transparent focus:ring-tropicalBlue"
                        />
                      </div>
                    )}
                    {isLoadingDeployment ? (
                      <div className={styles.primary}>
                        <span className="animate-pulse">Deploying...</span>
                        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                      </div>
                    ) : isLoadingProposalForm ? (
                      <div className={styles.primary}>
                        <span className="animate-pulse">Uploading...</span>
                        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                      </div>
                    ) : isVerifyingRecaptcha ? (
                      <div className={styles.primary}>
                        <span className="animate-pulse">Verifying...</span>
                        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                      </div>
                    ) : (
                      <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-6">
                        <button
                          onClick={goToPreviousStep}
                          className={`${styles.secondary} 
                            w-full 
                            rounded-lg 
                            border-[1px] 
                            border-solid 
                            border-seaBlue-1025 
                            bg-seaBlue-300
                            font-acuminSemiBold 
                            text-seaBlue-1025 
                            `}
                        >
                          Back
                        </button>
                          <button
                            onClick={goToNextStep}
                            className={`${styles.primary} w-full bg-[#1B2885] hover:bg-[#263AAD]`}
                            disabled={
                              !title ||
                              !summary ||
                              !body ||
                              !executionOption ||
                              (executionOption == 'Transaction' &&
                                (paymentOption == Payment.None ||
                                  (paymentOption == Payment.Sci &&
                                    !transactionAmountSci) ||
                                  (paymentOption == Payment.Usdc &&
                                    !transactionAmountUsdc) ||
                                  (paymentOption == Payment.SciUsdc &&
                                    (!transactionAmountSci ||
                                      !transactionAmountUsdc)) ||
                                  !targetWallet))
                            }
                          >
                            Next
                          </button>
                        
                      </div>
                    )}
                  </form>
                )}


                {/* Add confirmation step for research proposals */}
                {currentStep == 5 && (
                  <form
                    onSubmit={handleSubmit}
                    className="
                    mx-auto 
                    mt-4         
                    flex
                    w-full
                    flex-col
                    space-y-4
                    overflow-hidden
                    rounded-lg
                    border-2
                    border-tropicalBlue
                    bg-seaBlue-1075 
                    p-4 
                    shadow-glow-tropicalBlue-intermediate
                    sm:p-8 
                    lg:w-[60%]
                  "
                  >
                    {/* Add CSRF token */}
                    <input type="hidden" name="csrf_token" value={csrfToken} />

                    <StepIndicator currentStep={currentStep} />

                    <h2 className="font-acuminSemiBold text-xl sm:text-2xl">
                      Confirm Submission
                    </h2>
                    <p className="text-sm text-seaBlue-100 sm:text-base">
                      Please review your proposal details before final
                      submission.{' '}
                      <span className="mb-2 text-base text-highlightRed">
                        <span className="font-acuminSemiBold text-sm sm:text-base">
                          Note:
                        </span>{' '}
                        limited styling is supported for this overview.
                      </span>
                    </p>

                    <div className="border border-seaBlue-1025 bg-seaBlue-1075 p-4">
                      <h3 className="mb-2 font-acuminSemiBold text-xl sm:text-2xl">
                        Proposal Overview
                      </h3>

                      <div className="mt-2 space-y-2 text-sm sm:text-base">
                        <div className="proposal-content space-y-2">
                          <div className="proposal-title">
                            <strong className="text-lg sm:text-xl">
                              TITLE:
                            </strong>{' '}
                            &nbsp; <span className="inline-block">{title}</span>
                          </div>
                          <div className="">
                            <strong className="text-lg sm:text-xl">
                              SUMMARY:
                            </strong>{' '}
                            &nbsp;
                            <span className="inline-block">
                              <ProposalContent
                                content={summary}
                                type="summary"
                              />
                            </span>
                          </div>
                          <div className="proposal-body">
                            <strong className="text-lg sm:text-xl">
                              BODY:
                            </strong>{' '}
                            &nbsp;
                            <span className="inline-block">
                              <ProposalContent content={body} type="body" />
                            </span>
                          </div>
                        </div>
                        <p>
                          <strong>Execution Option: </strong> &nbsp;
                          {executionOption}
                        </p>
                        {executionOption == 'Transaction' ? (
                          <>
                            <p>
                              <strong>Target Wallet:</strong> &nbsp;
                              <AddressWithEns address={targetWallet} />
                            </p>

                            {/* Show SCI amount for SCI and SciUsdc */}
                            {(paymentOption == Payment.Sci ||
                              paymentOption == Payment.SciUsdc) && (
                              <p>
                                <strong>Amount SCI: </strong> &nbsp;
                                {Number(transactionAmountSci).toLocaleString()}
                              </p>
                            )}

                            {/* Show USDC amount for USDC and SciUsdc */}
                            {(paymentOption == Payment.Usdc ||
                              paymentOption == Payment.SciUsdc) && (
                              <p>
                                <strong>Amount USDC: </strong> &nbsp;
                                {Number(transactionAmountUsdc).toLocaleString()}
                              </p>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>

                    {isLoadingDeployment ? (
                      <div className={styles.primary}>
                        <span className="animate-pulse">Deploying...</span>
                        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                      </div>
                    ) : isLoadingProposalForm ? (
                      <div className={styles.primary}>
                        <span className="animate-pulse">Uploading...</span>
                        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                      </div>
                    ) : isVerifyingRecaptcha ? (
                      <div className={styles.primary}>
                        <span className="animate-pulse">Verifying...</span>
                        <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                      </div>
                    ) : (
                      <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-6">
                        <button
                          onClick={goToPreviousStep}
                          className={`${styles.secondary} 
                            w-full 
                            rounded-lg 
                            border-[1px] 
                            border-solid 
                            border-seaBlue-1025 
                            bg-seaBlue-300
                            font-acuminSemiBold 
                            text-seaBlue-1025 
                            `}
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className={`${styles.primary} w-full bg-[#1B2885] hover:bg-[#263AAD]`}
                          disabled={
                            !title ||
                            !summary ||
                            !body ||
                            !executionOption ||
                            (executionOption == 'Transaction' &&
                              (paymentOption == Payment.None ||
                                (paymentOption == Payment.Sci &&
                                  !transactionAmountSci) ||
                                (paymentOption == Payment.Usdc &&
                                  !transactionAmountUsdc) ||
                                (paymentOption == Payment.SciUsdc &&
                                  (!transactionAmountSci ||
                                    !transactionAmountUsdc)) ||
                                !targetWallet))
                          }
                        >
                          Submit On-chain Proposal
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}
          </>
        ) : wallet?.state?.address &&
          wallet?.state?.isVerified &&
          !lockingThresholdReached ? (
          <div className="mt-4 flex max-w-full flex-col items-center justify-center">
            <ErrorDisplay error={lockingThresholdError} />
            <div className="mt-4">
              You can lock your SCI tokens{' '}
              <Link
                href={'/lock'}
                className="text-steelBlue hover:text-tropicalBlue"
              >
                here
              </Link>
              .
            </div>
          </div>
        ) : (
          <div className="mt-12 w-[16rem] max-w-full">
            <ConnectWallet isNavBar={false} toggleAccountMenu={() => null} />
          </div>
        )}
        <div className="flex w-full max-w-full">
          {proposalInitiated && (
            <Modal
              transactionHash={transactionHash ?? null}
              handler={setProposalInitiated}
              title={`Proposal successful!`}
              subtitle={''}
            >
              <div>
                <Link
                  className="text-steelBlue hover:text-tropicalBlue"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://discord.gg/75SrHpcNSZ"
                >
                  Join the PoSciDonDAO discord{' '}
                  <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                </Link>{' '}
                to incentivize others to vote on your proposal!
              </div>
              <div>
                <CountdownTimerForProposal governance={governance} />
              </div>
            </Modal>
          )}

          {showConfirmationModal && (
            <ErrorBoundary>
              <ProposalConfirmationModal
                isOpen={showConfirmationModal}
                onClose={closeConfirmationModal}
                onConfirm={async () => {
                  try {
                    await handleProposalFetching(true);
                    closeConfirmationModal(); // Close the confirmation modal only after successful transaction
                  } catch (error) {
                    console.error('Error submitting proposal:', error);
                    // Don't close the modal on error - let the user see the error and decide what to do
                    // The error will be displayed via the notification system through handlePreviewError
                  }
                }}
                isLoading={isLoadingProposalForm}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
