import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import AttestationVaultABIFile from '@/app/abi/AttestationVault.json';
import { useWallet } from '@/app/context/WalletContext';
import { useNotification } from '@/app/context/NotificationContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { Abi } from 'viem';
import {
  EIP712_DOMAIN_NAME_SPARK_USER_AGREEMENTS,
  EIP712_DOMAIN_VERSION_SPARK_USER_AGREEMENTS,
  EIP712_TYPES,
  PLATFORM_NDA_TYPE_HASH_BYTES32,
  PLATFORM_IDEATOR_TERMS_TYPE_HASH_BYTES32
} from '@/app/constants/eip712';

const AttestationVaultABI = AttestationVaultABIFile;

// Document Template Literals
const PLATFORM_NDA_TEMPLATE = `
SPARK PLATFORM NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on {currentDate} by and between PoSciDonDAO Foundation, a decentralized autonomous organization ("Foundation"), and {signerName} ("Participant").

WHEREAS, Participant desires to access the Spark Platform and contribute ideas to the intellectual property pool;

WHEREAS, Foundation operates under a copyleft licensing model for collaborative scientific research;

NOW, THEREFORE, the parties agree as follows:

1. CONFIDENTIALITY OBLIGATIONS
Participant acknowledges that access to the Spark Platform may involve exposure to confidential information, research methodologies, and proprietary processes of the Foundation and other participants.

2. INTELLECTUAL PROPERTY CONTRIBUTION
By submitting ideas through the Spark Platform, Participant agrees that:
a) All submitted ideas shall become part of the PoSciDonDAO Foundation's intellectual property pool
b) Ideas will be governed by copyleft licensing terms, ensuring open access for scientific advancement
c) Participant retains attribution rights but transfers commercial rights to the Foundation

3. IDEA-SPECIFIC TERMS
This agreement covers Participant's general access to the platform and specifically relates to:
- Idea ID: {ideaId}
- Idea Title: {ideaTitle}
- Participant Address: {userAddress}

4. NON-DISCLOSURE
Participant agrees to maintain confidentiality of non-public information accessed through the platform and not to disclose such information to third parties without written consent.

5. TERM
This Agreement remains in effect indefinitely or until terminated by either party with 30 days written notice.

By signing below, Participant acknowledges understanding and agreement to these terms.

Participant Name: {signerName}
Email: {signerEmail}
Wallet Address: {userAddress}
Date: {currentDate}

Signature: _____________________
`;

const IDEATOR_TERMS_TEMPLATE = `
SPARK PLATFORM IDEATOR TERMS AND CONDITIONS

This Agreement is entered into on {currentDate} between PoSciDonDAO Foundation ("Foundation") and {signerName} ("Ideator").

TERMS OF IDEA SUBMISSION

1. SUBMISSION GRANT
By submitting ideas to the Spark Platform, Ideator grants the Foundation:
a) Perpetual, irrevocable license to use, modify, and distribute submitted ideas
b) Right to incorporate ideas into the Foundation's intellectual property pool
c) Authority to license ideas under copyleft terms for scientific advancement

2. COPYLEFT LICENSING
Ideator acknowledges and agrees that:
a) All submitted ideas will be subject to copyleft licensing
b) Ideas become part of the open scientific commons
c) Commercial applications must benefit the broader scientific community
d) Attribution to Ideator will be maintained in all derivative works

3. SPECIFIC IDEA TERMS
This submission relates to:
- Idea ID: {ideaId}
- Idea Title: {ideaTitle}
- Ideator: {signerName}
- Submission Date: {currentDate}

4. REPRESENTATIONS AND WARRANTIES
Ideator represents that:
a) They have the right to submit the idea
b) The idea does not infringe on third-party intellectual property
c) All information provided is accurate and complete

5. NO COMPENSATION
Ideator understands that idea submission is voluntary and no monetary compensation is provided, consistent with the open science mission.

By signing, Ideator agrees to these terms for idea contribution to the PoSciDonDAO Foundation.

Ideator Name: {signerName}
Email: {signerEmail}
Wallet Address: {userAddress}
Date: {currentDate}

Signature: _____________________
`;

const IDEA_SPECIFIC_NDA_TEMPLATE = `
IDEA-SPECIFIC NON-DISCLOSURE AGREEMENT

This Idea-Specific NDA is entered into on {currentDate} between PoSciDonDAO Foundation ("Foundation") and {signerName} ("Reviewer").

PURPOSE: Access to confidential idea for evaluation and review purposes.

1. CONFIDENTIAL INFORMATION
Reviewer will have access to confidential information regarding:
- Idea ID: {ideaId}
- Idea Title: {ideaTitle}
- Associated research data, methodologies, and documentation

2. CONFIDENTIALITY OBLIGATIONS
Reviewer agrees to:
a) Maintain strict confidentiality of all idea-related information
b) Use information solely for evaluation and review purposes
c) Not disclose information to any third parties without written consent
d) Return or destroy all confidential materials upon request

3. REVIEW PURPOSE
This access is granted for:
a) Scientific peer review
b) Technical evaluation
c) Collaboration assessment
d) Foundation evaluation processes

4. INTELLECTUAL PROPERTY
Reviewer acknowledges that:
a) No intellectual property rights are transferred
b) All IP remains with the Foundation and original ideator
c) Any insights gained during review remain confidential
d) Copyleft licensing terms apply to the underlying idea

5. TERM AND TERMINATION
This agreement remains effective until:
a) Review process completion
b) Termination by either party
c) One year from signing date, whichever occurs first

By signing, Reviewer commits to maintaining confidentiality of the specified idea.

Reviewer Name: {signerName}
Email: {signerEmail}
Wallet Address: {userAddress}
Date: {currentDate}

Signature: _____________________
`;

// Template processing function
const processDocumentTemplate = (
  templateType: 'PLATFORM_NDA' | 'PLATFORM_IDEATOR_TERMS' | 'IDEA_SPECIFIC_NDA',
  data: {
    signerName: string;
    signerEmail: string;
    ideaId: string;
    ideaTitle: string;
    currentDate: string;
    userAddress: string;
  }
): string => {
  let template: string;
  
  switch (templateType) {
    case 'PLATFORM_NDA':
      template = PLATFORM_NDA_TEMPLATE;
      break;
    case 'PLATFORM_IDEATOR_TERMS':
      template = IDEATOR_TERMS_TEMPLATE;
      break;
    case 'IDEA_SPECIFIC_NDA':
      template = IDEA_SPECIFIC_NDA_TEMPLATE;
      break;
    default:
      throw new Error(`Unknown template type: ${templateType}`);
  }

  // Replace all placeholders
  return template
    .replace(/{signerName}/g, data.signerName)
    .replace(/{signerEmail}/g, data.signerEmail)
    .replace(/{ideaId}/g, data.ideaId)
    .replace(/{ideaTitle}/g, data.ideaTitle)
    .replace(/{currentDate}/g, data.currentDate)
    .replace(/{userAddress}/g, data.userAddress);
};

const formatIdeaIdToBytes32 = (ideaId: string | number): `0x${string}` => {
    if (typeof ideaId === 'string') {
        if (/^0x[0-9a-fA-F]+$/.test(ideaId)) {
            if (ideaId.length === 66) return ideaId as `0x${string}`;
            try {
                return ethers.utils.hexZeroPad(ethers.utils.hexlify(ethers.BigNumber.from(ideaId).toBigInt()), 32) as `0x${string}`;
            } catch (e) {
                console.warn(`formatIdeaIdToBytes32: ideaId string '${ideaId}' (hex) could not be parsed as a BigNumber and is not bytes32. Hashing as fallback.`);
                return ethers.utils.id(ideaId) as `0x${string}`; 
            }
        } else {
            try {
                return ethers.utils.hexZeroPad(ethers.utils.hexlify(ethers.BigNumber.from(ideaId).toBigInt()), 32) as `0x${string}`;
            } catch (e) {
                console.warn(`formatIdeaIdToBytes32: ideaId string '${ideaId}' is not a number or hex. Hashing the string itself.`);
                return ethers.utils.id(ideaId) as `0x${string}`; 
            }
        }
    } 
    return ethers.utils.hexZeroPad(ethers.utils.hexlify(BigInt(ideaId)), 32) as `0x${string}`;
};

interface AttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementType: 'PLATFORM_NDA' | 'PLATFORM_IDEATOR_TERMS' | 'IDEA_SPECIFIC_NDA';
  ideaId?: string | number;
  ideaTitle?: string;
  onAttestationSuccess: () => void;
}

const eip712DomainInternal = (chainId: number, verifyingContract: `0x${string}`) => ({
  name: EIP712_DOMAIN_NAME_SPARK_USER_AGREEMENTS, 
  version: EIP712_DOMAIN_VERSION_SPARK_USER_AGREEMENTS,          
  chainId: chainId, 
  verifyingContract: verifyingContract,
});

interface MessagePayload {
  userSignedDocumentHash: `0x${string}`;
  ideaId?: `0x${string}`;
  agreementTypeId?: `0x${string}`;
}

interface SwitchError {
  message: string;
}

const AttestationModal: React.FC<AttestationModalProps> = ({
  isOpen,
  onClose,
  agreementType,
  ideaId,
  ideaTitle,
  onAttestationSuccess,
}) => {
  // DocuSign states
  const [internalSignerEmail, setInternalSignerEmail] = useState('');
  const [internalSignerName, setInternalSignerName] = useState('');
  const [internalIdeaTitle, setInternalIdeaTitle] = useState(ideaTitle || '');
  const [docusignSigningUrl, setDocusignSigningUrl] = useState<string | null>(null);
  const [docusignEnvelopeId, setDocusignEnvelopeId] = useState<string | null>(null);
  const [isLoadingDocusign, setIsLoadingDocusign] = useState(false);
  const [docusignCompleted, setDocusignCompleted] = useState(false);
  const [showDocusignIframe, setShowDocusignIframe] = useState(false);

  // Attestation states
  const [isProcessingAttestation, setIsProcessingAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'collect_info' | 'docusign_signing' | 'blockchain_attestation'>('collect_info');

  const { state: walletState, signTypedDataGeneric, writeContractGeneric, waitForTransactionGeneric, switchNetwork } = useWallet();
  const { addNotification } = useNotification();
  const networkInfo = useNetworkInfo();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const currentChainIdFromWallet = walletState.chainId ? parseInt(walletState.chainId, 16) : null;
  const accountAddress = walletState.address;
  const isConnected = walletState.isConnected;

  const targetChainId = networkInfo?.chainId;
  const attestationVaultAddress = networkInfo?.attestationVault;

  // Listen for DocuSign completion messages
  useEffect(() => {
    const handleDocusignMessage = (event: MessageEvent) => {
      // Validate origin for security
      if (!event.origin.includes('docusign')) return;
      
      console.log('[DocuSign] Received message:', event.data);
      
      if (event.data === 'signing_complete' || 
          (typeof event.data === 'object' && event.data.event === 'signing_complete')) {
        console.log('[DocuSign] Signing completed successfully');
        setDocusignCompleted(true);
        setShowDocusignIframe(false);
        setCurrentStep('blockchain_attestation');
        addNotification('Document signed successfully! Now proceeding with blockchain attestation.', 'success');
      } else if (event.data === 'session_timeout' || 
                 event.data === 'ttl_expired' ||
                 (typeof event.data === 'object' && (event.data.event === 'session_timeout' || event.data.event === 'ttl_expired'))) {
        console.log('[DocuSign] Session expired or timed out');
        setError('DocuSign session expired. Please try again.');
        setShowDocusignIframe(false);
        setCurrentStep('collect_info');
        addNotification('DocuSign session expired. Please try again.', 'error');
      }
    };

    if (showDocusignIframe) {
      window.addEventListener('message', handleDocusignMessage);
      return () => window.removeEventListener('message', handleDocusignMessage);
    }
  }, [showDocusignIframe, addNotification]);

  const handleClose = useCallback(() => {
    setInternalSignerEmail('');
    setInternalSignerName('');
    setInternalIdeaTitle(ideaTitle || '');
    setDocusignSigningUrl(null);
    setDocusignEnvelopeId(null);
    setDocusignCompleted(false);
    setShowDocusignIframe(false);
    setError(null);
    setIsLoadingDocusign(false);
    setIsProcessingAttestation(false);
    setCurrentStep('collect_info');
    onClose();
  }, [onClose, ideaTitle]);

  const getAgreementTypeIdBytes32 = useCallback((): `0x${string}` | null => {
    if (agreementType === "PLATFORM_NDA") return PLATFORM_NDA_TYPE_HASH_BYTES32 as `0x${string}`;
    if (agreementType === "PLATFORM_IDEATOR_TERMS") return PLATFORM_IDEATOR_TERMS_TYPE_HASH_BYTES32 as `0x${string}`;
    if (agreementType === "IDEA_SPECIFIC_NDA") return null; 
    console.error("Unknown agreement type for ID generation:", agreementType);
    throw new Error("Unknown agreement type for ID generation");
  }, [agreementType]);

  const initiateDocusignSigning = async () => {
    if (!internalSignerEmail || !internalSignerName) {
      setError('Please provide both email and name.');
      return;
    }

    if (!internalIdeaTitle) {
      setError('Please provide an idea title.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(internalSignerEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!executeRecaptcha) {
      setError('Security verification not available. Please try again.');
      return;
    }

    setIsLoadingDocusign(true);
    setError(null);

    try {
      // Generate reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('docusign_initiate');
      if (!recaptchaToken) {
        throw new Error('Failed to generate security verification token');
      }

      // Process dynamic document template
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const documentContent = processDocumentTemplate(agreementType, {
        signerName: internalSignerName,
        signerEmail: internalSignerEmail,
        ideaId: ideaId?.toString() || 'N/A',
        ideaTitle: internalIdeaTitle,
        currentDate,
        userAddress: accountAddress || 'N/A'
      });

      const returnUrl = `${window.location.origin}${window.location.pathname}?docusign_complete=true`;
      
      const response = await fetch('/api/docusign/initiate-signing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: accountAddress,
          documentType: agreementType,
          documentContent, // Send processed template content
          signerEmail: internalSignerEmail,
          signerName: internalSignerName,
          ideaId: ideaId?.toString(),
          ideaTitle: internalIdeaTitle,
          returnUrl,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate DocuSign signing');
      }

      setDocusignSigningUrl(data.signingUrl);
      setDocusignEnvelopeId(data.envelopeId);
      setShowDocusignIframe(true);
      setCurrentStep('docusign_signing');
      
      console.log('[DocuSign] Signing URL generated:', data.signingUrl);
      addNotification('DocuSign signing session initiated. Please complete the signing process.', 'info');

    } catch (error: unknown) {
      console.error('[DocuSign] Error initiating signing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate DocuSign signing process';
      setError(errorMessage);
      addNotification(`DocuSign error: ${errorMessage}`, 'error');
    } finally {
      setIsLoadingDocusign(false);
    }
  };

  const handleBlockchainAttestation = async () => {
    if (!networkInfo || !targetChainId || !attestationVaultAddress) {
      setError("Network information is not available. Cannot proceed with attestation.");
      addNotification("Network configuration missing.", "error");
      return;
    }

    if (!docusignCompleted || !docusignEnvelopeId) {
      setError("DocuSign signing must be completed first.");
      addNotification("Complete DocuSign signing first.", "error");
      return;
    }

    if (agreementType === "IDEA_SPECIFIC_NDA" && (ideaId === undefined || ideaId === null)) {
      setError("Idea ID is missing for Idea-Specific NDA attestation.");
      addNotification("Idea ID missing for Idea NDA.", "error");
      return;
    }

    if (!isConnected || !accountAddress) {
      setError("Wallet not connected or address not available.");
      addNotification("Connect wallet first.", "error");
      return;
    }

    if (currentChainIdFromWallet !== targetChainId) {
      setError(`Please switch to the correct network (Target: ${targetChainId}, Current: ${currentChainIdFromWallet}).`);
      addNotification(`Incorrect network. Switch to target chain ID ${targetChainId}.`, "error");
      return;
    }

    setError(null);
    setIsProcessingAttestation(true);

    try {
      // For DocuSign integration, we'll use the envelope ID as the document hash
      // This links the blockchain attestation to the specific DocuSign envelope
      const userSignedDocumentHash = ethers.utils.id(docusignEnvelopeId) as `0x${string}`;

      let messagePayload: MessagePayload;
      let primaryEipType: keyof typeof EIP712_TYPES;
      let contractFunctionName: string;
      let contractArgs: unknown[];

      const domain = eip712DomainInternal(targetChainId, attestationVaultAddress);

      if (agreementType === "IDEA_SPECIFIC_NDA") {
        primaryEipType = 'SparkIdeaNdaAttestation';
        const ideaIdAsBytes32 = formatIdeaIdToBytes32(ideaId!);
        messagePayload = {
          userSignedDocumentHash: userSignedDocumentHash,
          ideaId: ideaIdAsBytes32,
        };
        contractFunctionName = 'attestToIdeaNda';
      } else { 
        primaryEipType = 'SparkUserDocumentAttestation';
        const currentAgreementTypeId = getAgreementTypeIdBytes32();
        if (!currentAgreementTypeId) {
          throw new Error("Could not determine agreement type ID for platform agreement.");
        }
        messagePayload = {
          userSignedDocumentHash: userSignedDocumentHash,
          agreementTypeId: currentAgreementTypeId,
        };
        contractFunctionName = 'attestToUserDocument';
      }
      
      const typesForSigning = { ...EIP712_TYPES }; 

      addNotification("Please sign the attestation in your wallet.", "info");
      const signature = await signTypedDataGeneric({
        domain: domain,
        types: typesForSigning, 
        primaryType: primaryEipType as string, 
        message: messagePayload,
      });

      if (!signature) {
        setError("Failed to sign the attestation data. Signature was not returned.");
        addNotification("Signature failed or rejected.", "error");
        setIsProcessingAttestation(false);
        return;
      }

      const { v, r, s } = ethers.utils.splitSignature(signature);

      if (agreementType === "IDEA_SPECIFIC_NDA") {
        contractArgs = [userSignedDocumentHash, messagePayload.ideaId, v, r, s];
      } else {
        contractArgs = [userSignedDocumentHash, messagePayload.agreementTypeId, v, r, s];
      }
      
      addNotification("Submitting attestation to the blockchain...", "info");
      const txHash = await writeContractGeneric({
        address: attestationVaultAddress,
        abi: AttestationVaultABI as Abi, 
        functionName: contractFunctionName,
        args: contractArgs,
      });

      if (!txHash) {
        setError("Failed to submit the attestation transaction. No transaction hash returned.");
        addNotification("Attestation transaction submission failed.", "error");
        setIsProcessingAttestation(false);
        return;
      }

      addNotification(`Transaction submitted: ${txHash}. Waiting for confirmation...`, "info");
      const receipt = await waitForTransactionGeneric({ hash: txHash });

      if (receipt && receipt.status === 'success') {
        addNotification("Attestation successful!", "success");
        onAttestationSuccess();
        handleClose();
      } else {
        setError(`Attestation transaction failed. Status: ${receipt?.status}. Check console for details.`);
        addNotification("Attestation transaction failed or was reverted.", "error");
        console.error("Transaction failed or reverted. Receipt:", receipt);
      }

    } catch (e: unknown) {
      console.error("Attestation process error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during the attestation process.";
      setError(errorMessage);
      addNotification(`Attestation error: ${errorMessage}`, "error");
    } finally {
      setIsProcessingAttestation(false);
    }
  };

  if (!isOpen) return null;
  
  if (!networkInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <p className="text-center text-gray-700">Loading network configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white p-6 rounded-lg shadow-xl w-full ${showDocusignIframe ? 'max-w-4xl h-5/6' : 'max-w-md'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {agreementType.replace('_', ' ')} Attestation
            {currentStep === 'docusign_signing' && ' - DocuSign'}
            {currentStep === 'blockchain_attestation' && ' - Blockchain'}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        {/* Document Information */}
        {ideaTitle && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-700">
              You are attesting to the <strong className="font-medium">{ideaTitle}</strong>.
            </p>
          </div>
        )}

        {/* Step 1: Collect Signer Information */}
        {currentStep === 'collect_info' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="signerName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="signerName"
                value={internalSignerName}
                onChange={(e) => setInternalSignerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                disabled={isLoadingDocusign}
              />
            </div>

            <div>
              <label htmlFor="signerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="signerEmail"
                value={internalSignerEmail}
                onChange={(e) => setInternalSignerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email address"
                disabled={isLoadingDocusign}
              />
            </div>

            <div>
              <label htmlFor="ideaTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Idea Title
              </label>
              <input
                type="text"
                id="ideaTitle"
                value={internalIdeaTitle}
                onChange={(e) => setInternalIdeaTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the idea title"
                disabled={isLoadingDocusign}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Next:</strong> You&apos;ll be redirected to DocuSign to electronically sign the document. 
                After signing, you&apos;ll return here to complete the blockchain attestation.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: DocuSign Iframe */}
        {currentStep === 'docusign_signing' && showDocusignIframe && docusignSigningUrl && (
          <div className="h-full">
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                Please complete the signing process in the DocuSign interface below. 
                You&apos;ll automatically return to the next step when finished.
              </p>
            </div>
            <iframe
              src={docusignSigningUrl}
              className="w-full h-5/6 border border-gray-300 rounded-md"
              title="DocuSign Signing Interface"
            />
          </div>
        )}

        {/* Step 3: Blockchain Attestation */}
        {currentStep === 'blockchain_attestation' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">
                ✅ Document signed successfully with DocuSign!
              </p>
              <p className="text-xs text-green-600 mt-1">
                Envelope ID: {docusignEnvelopeId}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Final Step:</strong> Complete the blockchain attestation to record your signature on-chain.
                This creates an immutable record linking your DocuSign signature to the blockchain.
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm">
            <p>{error}</p>
          </div>
        )}

        {/* Network Warning */}
        {currentChainIdFromWallet !== targetChainId && isConnected && targetChainId && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-400 text-yellow-700 rounded-md text-sm">
            <p>Please switch to the target network (ID: {targetChainId}) to attest.</p>
            {walletState.provider && typeof switchNetwork === 'function' && (
              <button 
                onClick={async () => {
                  if(walletState.provider && switchNetwork) {
                    try {
                      await switchNetwork(walletState.provider); 
                    } catch (switchError: unknown) {
                      const error = switchError as SwitchError;
                      addNotification(`Failed to switch network: ${error.message}`, 'error');
                    }
                  }
                }}
                className="mt-2 px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
                disabled={isProcessingAttestation || !walletState.provider} 
              >
                Switch Network
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!showDocusignIframe && (
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={handleClose} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              disabled={isLoadingDocusign || isProcessingAttestation}
            >
              Cancel
            </button>
            
            {currentStep === 'collect_info' && (
              <button 
                onClick={initiateDocusignSigning}
                disabled={!internalSignerEmail || !internalSignerName || !internalIdeaTitle || isLoadingDocusign || !isConnected}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-300"
              >
                {isLoadingDocusign ? 'Initiating DocuSign...' : 'Sign with DocuSign'}
              </button>
            )}
            
            {currentStep === 'blockchain_attestation' && (
              <button 
                onClick={handleBlockchainAttestation}
                disabled={!docusignCompleted || isProcessingAttestation || currentChainIdFromWallet !== targetChainId || !isConnected || !networkInfo}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-gray-300"
              >
                {isProcessingAttestation ? 'Processing Attestation...' : 'Complete Blockchain Attestation'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttestationModal; 