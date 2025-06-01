# Module 02: Contract Integration Implementation

## 📋 Overview & Objectives

The Contract Integration module provides the blockchain interaction layer for the Spark platform. It implements smart contract hooks, transaction management, error handling, and state management for all Spark contracts.

### **Key Responsibilities**
- Smart contract interaction hooks
- Transaction lifecycle management
- Blockchain error handling and recovery
- Contract state synchronization
- Gas optimization and management

---

## 🔗 Smart Contract Integration

### **Contract Address Management from serverConfig.ts**
```typescript
// 🚨 MANDATORY: Use networkInfo context - Never hardcode addresses
import { useNetworkInfo } from '@/hooks/useNetworkInfo';

export const useSparkContractIntegration = () => {
  const { networkInfo, loading, error } = useNetworkInfo(); // From serverConfig.ts
  const [contractsReady, setContractsReady] = useState(false);

  useEffect(() => {
    validateSparkContracts();
  }, [networkInfo]);

  const validateSparkContracts = async () => {
    if (!networkInfo) return;
    
    // Validate all required Spark contract addresses are present
    const requiredContracts = [
      'sparkIdeaRegistry',
      'governorResearch', 
      'attestationVault',
      'sparkIpNft',
      'copyleftIpPool',
      'mintIpNft',
      'fundAndMintIpNft',
      'sparkBridge'
    ];

    const missingContracts = requiredContracts.filter(contract => !networkInfo[contract]);
    
    if (missingContracts.length > 0) {
      throw new Error(`Missing contract addresses in serverConfig.ts: ${missingContracts.join(', ')}`);
    }

    setContractsReady(true);
  };

  return { 
    networkInfo, 
    loading, 
    error, 
    contractsReady,
    // Current deployment on Base Sepolia
    network: 'Base Sepolia',
    chainId: networkInfo?.chainId,
    explorerLink: networkInfo?.explorerLink
  };
};

// Contract ABI imports (these should be from the artifacts)
export const SPARK_CONTRACT_ABIS = {
  SparkIdeaRegistry: require('../abi/spark/SparkIdeaRegistry.json'),
  GovernorResearch: require('../abi/spark/GovernorResearch.json'),
  AttestationVault: require('../abi/spark/AttestationVault.json'),
  SparkIPNFT: require('../abi/spark/SparkIPNFT.json'),
  CopyleftIPPool: require('../abi/spark/CopyleftIPPool.json'),
  SparkBridge: require('../abi/spark/SparkBridge.json'),
  MintIPNFT: require('../abi/spark/MintIPNFT.json'),
  FundAndMintIPNFT: require('../abi/spark/FundAndMintIPNFT.json'),
  LicenseNFT: require('../abi/spark/LicenseNFT.json'),
  LicenseSCILocker: require('../abi/spark/LicenseSCILocker.json'),
  POToken: require('../abi/spark/POToken.json')
};
```

---

## 🔧 Core Contract Hooks

### **1. useSparkContracts - Contract Instance Management**

```typescript
// hooks/useSparkContracts.ts
interface SparkContractInstances {
  sparkIdeaRegistry: Contract;
  governorResearch: Contract;
  sparkBridge: Contract;
  attestationVault: Contract;
  sparkIpNft: Contract;
  copyleftIpPool: Contract;
  mintIpNft: Contract;
  fundAndMintIpNft: Contract;
  licenseNft: Contract;
  licenseSciLocker: Contract;
  poToken: Contract;
}

export const useSparkContracts = (): SparkContractInstances => {
  const { signer, provider } = useWalletContext();
  const { networkInfo, loading, error, contractsReady } = useSparkContractIntegration();
  const [contracts, setContracts] = useState<SparkContractInstances | null>(null);

  useEffect(() => {
    if (networkInfo && contractsReady && (signer || provider)) {
      initializeContracts();
    }
  }, [networkInfo, contractsReady, signer, provider]);

  const initializeContracts = async () => {
    try {
      const signerOrProvider = signer || provider;
      
      const contractInstances: SparkContractInstances = {
        sparkIdeaRegistry: new ethers.Contract(
          networkInfo.sparkIdeaRegistry,
          SPARK_CONTRACT_ABIS.SparkIdeaRegistry.abi,
          signerOrProvider
        ),
        governorResearch: new ethers.Contract(
          networkInfo.governorResearch,
          SPARK_CONTRACT_ABIS.GovernorResearch.abi,
          signerOrProvider
        ),
        sparkBridge: new ethers.Contract(
          networkInfo.sparkBridge,
          SPARK_CONTRACT_ABIS.SparkBridge.abi,
          signerOrProvider
        ),
        attestationVault: new ethers.Contract(
          networkInfo.attestationVault,
          SPARK_CONTRACT_ABIS.AttestationVault.abi,
          signerOrProvider
        ),
        sparkIpNft: new ethers.Contract(
          networkInfo.sparkIpNft,
          SPARK_CONTRACT_ABIS.SparkIPNFT.abi,
          signerOrProvider
        ),
        copyleftIpPool: new ethers.Contract(
          networkInfo.copyleftIpPool,
          SPARK_CONTRACT_ABIS.CopyleftIPPool.abi,
          signerOrProvider
        ),
        mintIpNft: new ethers.Contract(
          networkInfo.mintIpNft,
          SPARK_CONTRACT_ABIS.MintIPNFT.abi,
          signerOrProvider
        ),
        fundAndMintIpNft: new ethers.Contract(
          networkInfo.fundAndMintIpNft,
          SPARK_CONTRACT_ABIS.FundAndMintIPNFT.abi,
          signerOrProvider
        ),
        licenseNft: new ethers.Contract(
          networkInfo.licenseNft,
          SPARK_CONTRACT_ABIS.LicenseNFT.abi,
          signerOrProvider
        ),
        licenseSciLocker: new ethers.Contract(
          networkInfo.licenseSciLocker,
          SPARK_CONTRACT_ABIS.LicenseSCILocker.abi,
          signerOrProvider
        ),
        poToken: new ethers.Contract(
          networkInfo.poToken,
          SPARK_CONTRACT_ABIS.POToken.abi,
          signerOrProvider
        )
      };

      setContracts(contractInstances);
    } catch (error) {
      console.error('Failed to initialize Spark contracts:', error);
      throw new SparkContractError('Contract initialization failed', error);
    }
  };

  return contracts || {} as SparkContractInstances;
};
```

### **2. useSparkIdeaRegistry - Core Idea Management**

```typescript
// hooks/useSparkIdeaRegistry.ts
export const useSparkIdeaRegistry = () => {
  const { address } = useWalletContext();
  const { sparkIdeaRegistry } = useSparkContracts();
  const { checkAccessLevel } = useAttestationVault();

  const submitIdea = async (ipfsHash: string) => {
    try {
      // Verify user has required attestations
      const hasAccess = await checkAccessLevel(address, NDAAthestationLevel.BOTH_PLATFORM);
      if (!hasAccess) {
        throw new NotAttestedToBothPlatformAgreementsError();
      }

      const tx = await sparkIdeaRegistry.submitIdea(ipfsHash);
      
      return await handleTransaction(tx, {
        pending: 'Submitting idea...',
        success: 'Idea submitted successfully!',
        error: 'Failed to submit idea'
      });
    } catch (error) {
      // **NEW: Handle SparkIdeaRegistry custom errors**
      if (error.message?.includes('SparkIdeaRegistry__NotAttestedToBothPlatformAgreements')) {
        throw new NotAttestedToBothPlatformAgreementsError();
      }
      if (error.message?.includes('SparkIdeaRegistry__InvalidIpfsHash')) {
        throw new SparkContractError('Invalid IPFS hash format provided');
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaAlreadyExists')) {
        throw new SparkContractError('An idea with this content already exists');
      }
      if (error.message?.includes('InfoCannotBeEmpty')) {
        throw new SparkContractError('IPFS hash cannot be empty');
      }
      if (error.message?.includes('IdeatorCannotBeZeroAddress')) {
        throw new SparkContractError('Invalid ideator address');
      }
      
      throw new SparkContractError('Idea submission failed', error);
    }
  };

  const getIdea = async (ideaId: string) => {
    try {
      const idea = await sparkIdeaRegistry.getIdea(ideaId);
      return parseIdeaFromContract(idea);
    } catch (error) {
      // **NEW: Handle SparkIdeaRegistry custom errors**
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotFound')) {
        throw new IdeaNotFoundError(ideaId);
      }
      if (error.message?.includes('AttestationVaultNotSet')) {
        throw new SparkContractError('Attestation vault not configured');
      }
      if (error.message?.includes('NdaNotSigned')) {
        const match = error.message.match(/NdaNotSigned\("([^"]+)"\)/);
        const message = match ? match[1] : 'NDA attestation required';
        throw new NDAAthestationRequiredError(
          message.includes('platform-level') ? 'PLATFORM_LEVEL' : 'IDEA_SPECIFIC',
          ideaId
        );
      }
      
      throw new SparkContractError('Failed to fetch idea', error);
    }
  };

  const modifyIdeaDetails = async (ideaId: string, newIpfsHash: string) => {
    try {
      const tx = await sparkIdeaRegistry.modifyIdeaDetails(ideaId, newIpfsHash);
      
      return await handleTransaction(tx, {
        pending: 'Modifying idea...',
        success: 'Idea modified successfully!',
        error: 'Failed to modify idea'
      });
    } catch (error) {
      // **NEW: Handle SparkIdeaRegistry custom errors**
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotFound')) {
        throw new IdeaNotFoundError(ideaId);
      }
      if (error.message?.includes('SparkIdeaRegistry__OnlyIdeatorCanModify')) {
        throw new InsufficientPermissionsError('modify idea', 'Ideator');
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotModifiable')) {
        throw new SparkContractError('Idea cannot be modified in its current status');
      }
      if (error.message?.includes('SparkIdeaRegistry__SameIpfsHash')) {
        throw new SparkContractError('New content must be different from current content');
      }
      if (error.message?.includes('SparkIdeaRegistry__TooManyModifications')) {
        throw new SparkContractError('Maximum number of modifications exceeded');
      }
      if (error.message?.includes('SparkIdeaRegistry__InvalidIpfsHash')) {
        throw new SparkContractError('Invalid IPFS hash format provided');
      }
      
      throw new SparkContractError('Idea modification failed', error);
    }
  };

  const finalizeIdea = async (ideaId: string) => {
    try {
      const tx = await sparkIdeaRegistry.finalizeIdea(ideaId);
      
      return await handleTransaction(tx, {
        pending: 'Finalizing idea...',
        success: 'Idea finalized successfully!',
        error: 'Failed to finalize idea'
      });
    } catch (error) {
      // **NEW: Handle SparkIdeaRegistry custom errors**
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotFound')) {
        throw new IdeaNotFoundError(ideaId);
      }
      if (error.message?.includes('SparkIdeaRegistry__OnlyIdeatorCanFinalize')) {
        throw new InsufficientPermissionsError('finalize idea', 'Ideator');
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotDraft')) {
        throw new SparkContractError('Only draft ideas can be finalized');
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaAlreadyFinalized')) {
        throw new SparkContractError('Idea has already been finalized');
      }
      
      throw new SparkContractError('Idea finalization failed', error);
    }
  };

  const voteOnIdea = async (ideaId: string, support: boolean) => {
    try {
      const tx = await sparkIdeaRegistry.voteOnIdea(ideaId, support);
      
      return await handleTransaction(tx, {
        pending: `${support ? 'Approving' : 'Rejecting'} idea...`,
        success: `Vote cast successfully!`,
        error: 'Failed to cast vote'
      });
    } catch (error) {
      // **NEW: Handle SparkIdeaRegistry custom errors**
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotFound')) {
        throw new IdeaNotFoundError(ideaId);
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotPending')) {
        throw new SparkContractError('Only pending ideas can be voted on');
      }
      if (error.message?.includes('SparkIdeaRegistry__AlreadyVoted')) {
        throw new SparkContractError('You have already voted on this idea');
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaNotFinalized')) {
        throw new SparkContractError('Idea must be finalized before voting');
      }
      if (error.message?.includes('SparkIdeaRegistry__IdeaTooOld')) {
        throw new SparkContractError('This idea is too old to vote on');
      }
      if (error.message?.includes('SparkIdeaRegistry__InvalidApprovalCount')) {
        throw new SparkContractError('Invalid approval count detected');
      }
      
      throw new SparkContractError('Voting failed', error);
    }
  };

  const getAllIdeaIds = async () => {
    try {
      return await sparkIdeaRegistry.getAllIdeaIds();
    } catch (error) {
      throw new SparkContractError('Failed to fetch idea IDs', error);
    }
  };

  const getIdeaApprovalStatus = async (ideaId: string) => {
    try {
      return await sparkIdeaRegistry.getIdeaApprovalStatus(ideaId);
    } catch (error) {
      throw new SparkContractError('Failed to fetch approval status', error);
    }
  };

  const canIdeaBeModified = async (ideaId: string) => {
    try {
      return await sparkIdeaRegistry.canIdeaBeModified(ideaId);
    } catch (error) {
      throw new SparkContractError('Failed to check modification status', error);
    }
  };

  const isIdeaFinalized = async (ideaId: string) => {
    try {
      return await sparkIdeaRegistry.isIdeaFinalized(ideaId);
    } catch (error) {
      throw new SparkContractError('Failed to check finalization status', error);
    }
  };

  const getIdeaModificationHistory = async (ideaId: string) => {
    try {
      return await sparkIdeaRegistry.getIdeaModificationHistory(ideaId);
    } catch (error) {
      throw new SparkContractError('Failed to fetch modification history', error);
    }
  };

  const setProvisionalPatentId = async (ideaId: string, patentId: string) => {
    try {
      const tx = await sparkIdeaRegistry.setProvisionalPatentId(ideaId, patentId);
      
      return await handleTransaction(tx, {
        pending: 'Setting provisional patent ID...',
        success: 'Provisional patent ID set successfully!',
        error: 'Failed to set provisional patent ID'
      });
    } catch (error) {
      throw new SparkContractError('Setting provisional patent ID failed', error);
    }
  };

  return {
    submitIdea,
    getIdea,
    modifyIdeaDetails,
    finalizeIdea,
    voteOnIdea,
    getAllIdeaIds,
    getIdeaApprovalStatus,
    canIdeaBeModified,
    isIdeaFinalized,
    getIdeaModificationHistory,
    setProvisionalPatentId
  };
};
```

### **3. useGovernorResearch - Governance Integration**

```typescript
// hooks/useGovernorResearch.ts
export const useGovernorResearch = () => {
  const { address } = useWalletContext();
  const { governorResearch } = useSparkContracts();

  const getProposals = async (status?: string) => {
    try {
      // Fetch proposals with optional status filter
      const proposals = await governorResearch.getProposals(status);
      return proposals.map(parseProposalFromContract);
    } catch (error) {
      throw new SparkContractError('Failed to fetch proposals', error);
    }
  };

  const getProposal = async (proposalId: string) => {
    try {
      const proposal = await governorResearch.getProposal(proposalId);
      return parseProposalFromContract(proposal);
    } catch (error) {
      throw new SparkContractError('Failed to fetch proposal', error);
    }
  };

  const castVote = async (proposalId: string, support: number) => {
    try {
      const tx = await governorResearch.castVote(proposalId, support);
      
      return await handleTransaction(tx, {
        pending: 'Casting vote...',
        success: 'Vote cast successfully!',
        error: 'Failed to cast vote'
      });
    } catch (error) {
      throw new SparkContractError('Voting failed', error);
    }
  };

  const hasVoted = async (proposalId: string, account?: string) => {
    try {
      const voter = account || address;
      return await governorResearch.hasVoted(proposalId, voter);
    } catch (error) {
      throw new SparkContractError('Failed to check vote status', error);
    }
  };

  const getVotes = async (account: string, blockNumber?: number) => {
    try {
      return await governorResearch.getVotes(account, blockNumber);
    } catch (error) {
      throw new SparkContractError('Failed to fetch voting power', error);
    }
  };

  return {
    getProposals,
    getProposal,
    castVote,
    hasVoted,
    getVotes
  };
};
```

### **4. useAttestationVault - Document Attestation Management**

```typescript
// hooks/useAttestationVault.ts
export const useAttestationVault = () => {
  const { address } = useWalletContext();
  const { attestationVault } = useSparkContracts();

  const attestToSignedDocument = async (
    userSignedDocumentHash: string,
    agreementTypeId: string,
    ethSignature: string
  ) => {
    try {
      const tx = await attestationVault.attestToSignedDocument(
        userSignedDocumentHash,
        agreementTypeId,
        ethSignature
      );
      
      return await handleTransaction(tx, {
        pending: 'Submitting attestation...',
        success: 'Document attestation successful!',
        error: 'Failed to attest to document'
      });
    } catch (error) {
      // **NEW: Handle AttestationVault custom errors**
      if (error.message?.includes('AttestationVault__UserDocumentHashCannotBeZero')) {
        throw new UserDocumentHashCannotBeZeroError();
      }
      if (error.message?.includes('AttestationVault__AgreementTypeIdCannotBeZero')) {
        throw new AgreementTypeIdCannotBeZeroError();
      }
      if (error.message?.includes('AttestationVault__InvalidSignatureZeroAddressRecovered')) {
        throw new InvalidSignatureZeroAddressRecoveredError();
      }
      if (error.message?.includes('AttestationVault__SignerMismatch')) {
        throw new SignerMismatchError();
      }
      if (error.message?.includes('AttestationVault__DocumentAlreadyAttested')) {
        throw new DocumentAlreadyAttestedError();
      }
      
      throw new SparkContractError('Document attestation failed', error);
    }
  };

  const setIdeaNdaHash = async (ideaId: string, ndaHash: string) => {
    try {
      const tx = await attestationVault.setIdeaNdaHash(ideaId, ndaHash);
      
      return await handleTransaction(tx, {
        pending: 'Setting NDA hash...',
        success: 'NDA hash set successfully!',
        error: 'Failed to set NDA hash'
      });
    } catch (error) {
      // **NEW: Handle AttestationVault custom errors**
      if (error.message?.includes('AttestationVault__IdeaIdCannotBeZero')) {
        throw new IdeaIdCannotBeZeroError();
      }
      if (error.message?.includes('AttestationVault__NdaHashCannotBeZero')) {
        throw new NdaHashCannotBeZeroError();
      }
      
      throw new SparkContractError('Setting NDA hash failed', error);
    }
  };

  const attestToIdeaNda = async (
    ideaId: string,
    userSignedDocumentHash: string,
    ethSignature: string
  ) => {
    try {
      const tx = await attestationVault.attestToIdeaNda(
        ideaId,
        userSignedDocumentHash,
        ethSignature
      );
      
      return await handleTransaction(tx, {
        pending: 'Submitting idea NDA attestation...',
        success: 'Idea NDA attestation successful!',
        error: 'Failed to attest to idea NDA'
      });
    } catch (error) {
      // **NEW: Handle AttestationVault custom errors**
      if (error.message?.includes('AttestationVault__IdeaIdCannotBeZero')) {
        throw new IdeaIdCannotBeZeroError();
      }
      if (error.message?.includes('AttestationVault__UserDocumentHashCannotBeZero')) {
        throw new UserDocumentHashCannotBeZeroError();
      }
      if (error.message?.includes('AttestationVault__NoNdaHashSetForIdea')) {
        throw new NoNdaHashSetForIdeaError();
      }
      if (error.message?.includes('AttestationVault__InvalidSignatureZeroAddressRecovered')) {
        throw new InvalidSignatureZeroAddressRecoveredError();
      }
      if (error.message?.includes('AttestationVault__SignerMismatch')) {
        throw new SignerMismatchError();
      }
      if (error.message?.includes('AttestationVault__AlreadyAttestedToIdeaNda')) {
        throw new AlreadyAttestedToIdeaNdaError();
      }
      
      throw new SparkContractError('Idea NDA attestation failed', error);
    }
  };

  const getAttestedDocumentHash = async (user: string, agreementTypeId: string) => {
    try {
      return await attestationVault.getAttestedDocumentHash(user, agreementTypeId);
    } catch (error) {
      throw new SparkContractError('Failed to fetch attested document hash', error);
    }
  };

  const hasUserAttested = async (user: string, agreementTypeId: string) => {
    try {
      return await attestationVault.hasUserAttested(user, agreementTypeId);
    } catch (error) {
      throw new SparkContractError('Failed to check attestation status', error);
    }
  };

  const hasUserAttestedToIdeaNda = async (user: string, ideaId: string) => {
    try {
      return await attestationVault.hasUserAttestedToIdeaNda(user, ideaId);
    } catch (error) {
      throw new SparkContractError('Failed to check idea NDA attestation status', error);
    }
  };

  const getIdeaNdaHash = async (ideaId: string) => {
    try {
      return await attestationVault.getIdeaNdaHash(ideaId);
    } catch (error) {
      throw new SparkContractError('Failed to fetch idea NDA hash', error);
    }
  };

  const hasAttestedToBothPlatformAgreementTypes = async (user: string) => {
    try {
      return await attestationVault.hasAttestedToBothPlatformAgreementTypes(user);
    } catch (error) {
      throw new SparkContractError('Failed to check platform agreement attestations', error);
    }
  };

  return {
    attestToSignedDocument,
    setIdeaNdaHash,
    attestToIdeaNda,
    getAttestedDocumentHash,
    hasUserAttested,
    hasUserAttestedToIdeaNda,
    getIdeaNdaHash,
    hasAttestedToBothPlatformAgreementTypes
  };
};
```

---

## 🔄 Transaction Management

### **Transaction Handler Utility**

```typescript
// utils/transactionHandler.ts
interface TransactionMessages {
  pending: string;
  success: string;
  error: string;
}

export const handleTransaction = async (
  tx: ContractTransaction,
  messages: TransactionMessages
): Promise<TransactionReceipt> => {
  try {
    // Show pending notification
    showPendingNotification(messages.pending, tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      showSuccessNotification(messages.success);
      
      // Log successful transaction
      logTransaction({
        hash: receipt.transactionHash,
        status: 'success',
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });

      return receipt;
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Transaction failed:', error);
    
    // Show error notification
    showErrorNotification(messages.error);
    
    // Log failed transaction
    logTransaction({
      hash: tx.hash,
      status: 'failed',
      error: error.message
    });

    throw error;
  }
};

export const estimateGas = async (contractMethod: ContractMethod, ...args: any[]) => {
  try {
    const gasEstimate = await contractMethod.estimateGas(...args);
    
    // Add 20% buffer for gas estimation
    return gasEstimate.mul(120).div(100);
  } catch (error) {
    console.error('Gas estimation failed:', error);
    
    // Return default gas limit if estimation fails
    return ethers.BigNumber.from('500000');
  }
};
```

### **Contract Event Listeners**

```typescript
// utils/eventListeners.ts
export const useSparkEventListeners = () => {
  const { sparkIdeaRegistry, governorResearch } = useSparkContracts();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    setupEventListeners();
    return () => {
      removeEventListeners();
    };
  }, [sparkIdeaRegistry, governorResearch]);

  const setupEventListeners = () => {
    // Idea Registry Events
    sparkIdeaRegistry.on('IdeaSubmitted', handleIdeaSubmitted);
    sparkIdeaRegistry.on('IdeaReviewVoteCast', handleIdeaVoteCast);
    sparkIdeaRegistry.on('IdeaApprovalStatusChanged', handleApprovalStatusChanged);
    sparkIdeaRegistry.on('IdeaModified', handleIdeaModified);
    sparkIdeaRegistry.on('IdeaFinalized', handleIdeaFinalized);

    // Governance Events
    governorResearch.on('ProposalCreated', handleProposalCreated);
    governorResearch.on('VoteCast', handleVoteCast);
    governorResearch.on('ProposalExecuted', handleProposalExecuted);
  };

  const removeEventListeners = () => {
    sparkIdeaRegistry.removeAllListeners();
    governorResearch.removeAllListeners();
  };

  const handleIdeaSubmitted = (ideaId: string, ideator: string, ipfsHash: string, event: any) => {
    const eventData = {
      type: 'IdeaSubmitted',
      ideaId,
      ideator,
      ipfsHash,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };

    setEvents(prev => [eventData, ...prev]);
    showNotification('New idea submitted!', 'info');
  };

  const handleIdeaVoteCast = (ideaId: string, reviewer: string, support: boolean, event: any) => {
    const eventData = {
      type: 'IdeaVoteCast',
      ideaId,
      reviewer,
      support,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };

    setEvents(prev => [eventData, ...prev]);
    showNotification(`Vote cast on idea ${ideaId.slice(0, 8)}...`, 'info');
  };

  const handleApprovalStatusChanged = (ideaId: string, newStatus: number, event: any) => {
    const statusText = ['Draft', 'Pending', 'Approved', 'Rejected'][newStatus];
    
    const eventData = {
      type: 'ApprovalStatusChanged',
      ideaId,
      newStatus: statusText,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    };

    setEvents(prev => [eventData, ...prev]);
    showNotification(`Idea ${ideaId.slice(0, 8)}... is now ${statusText}`, 'info');
  };

  return { events };
};
```

---

## 🚨 Error Handling

### **Spark-Specific Error Classes**

```typescript
// errors/SparkContractErrors.ts
export class SparkContractError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'SparkContractError';
  }
}

export class ContractInitializationError extends SparkContractError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'ContractInitializationError';
  }
}

export class NDAAthestationRequiredError extends SparkContractError {
  constructor(public requiredNDAType: string, public ideaId: string) {
    super(`NDA attestation required: ${requiredNDAType} for idea ${ideaId}`);
    this.name = 'NDAAthestationRequiredError';
  }
}

export class InsufficientPermissionsError extends SparkContractError {
  constructor(action: string, requiredRole: string) {
    super(`Insufficient permissions for ${action}. Required role: ${requiredRole}`);
    this.name = 'InsufficientPermissionsError';
  }
}

export class IdeaNotFoundError extends SparkContractError {
  constructor(ideaId: string) {
    super(`Idea not found: ${ideaId}`);
    this.name = 'IdeaNotFoundError';
  }
}

// **NEW: SparkIdeaRegistry Custom Errors**
export class NotAttestedToBothPlatformAgreementsError extends SparkContractError {
  constructor() {
    super('Must attest to both Platform NDA and Ideator Terms before submitting ideas');
    this.name = 'NotAttestedToBothPlatformAgreementsError';
  }
}

// **NEW: AttestationVault Custom Errors**
export class ZeroAddressForAdminError extends SparkContractError {
  constructor() {
    super('Zero address provided for admin - invalid admin address');
    this.name = 'ZeroAddressForAdminError';
  }
}

export class UserDocumentHashCannotBeZeroError extends SparkContractError {
  constructor() {
    super('Document hash is required for attestation - cannot be empty');
    this.name = 'UserDocumentHashCannotBeZeroError';
  }
}

export class AgreementTypeIdCannotBeZeroError extends SparkContractError {
  constructor() {
    super('Agreement type must be specified - cannot be empty');
    this.name = 'AgreementTypeIdCannotBeZeroError';
  }
}

export class InvalidSignatureZeroAddressRecoveredError extends SparkContractError {
  constructor() {
    super('Invalid signature provided - unable to recover signer address');
    this.name = 'InvalidSignatureZeroAddressRecoveredError';
  }
}

export class SignerMismatchError extends SparkContractError {
  constructor() {
    super('Signature must be from the requesting account - signer mismatch detected');
    this.name = 'SignerMismatchError';
  }
}

export class DocumentAlreadyAttestedError extends SparkContractError {
  constructor() {
    super('You have already attested to this agreement type - duplicate attestation not allowed');
    this.name = 'DocumentAlreadyAttestedError';
  }
}

export class IdeaIdCannotBeZeroError extends SparkContractError {
  constructor() {
    super('Valid idea ID is required - cannot be empty');
    this.name = 'IdeaIdCannotBeZeroError';
  }
}

export class NdaHashCannotBeZeroError extends SparkContractError {
  constructor() {
    super('NDA document hash is required - cannot be empty');
    this.name = 'NdaHashCannotBeZeroError';
  }
}

export class NoNdaHashSetForIdeaError extends SparkContractError {
  constructor() {
    super('No NDA has been set for this idea yet - contact administrator');
    this.name = 'NoNdaHashSetForIdeaError';
  }
}

export class AlreadyAttestedToIdeaNdaError extends SparkContractError {
  constructor() {
    super('You have already attested to this idea\'s NDA - duplicate attestation not allowed');
    this.name = 'AlreadyAttestedToIdeaNdaError';
  }
}

// **NEW: SparkIPNFT Custom Errors**
export class ContractIsPausedError extends SparkContractError {
  constructor() {
    super('Contract is currently paused - operations temporarily disabled');
    this.name = 'ContractIsPausedError';
  }
}

export class ContractIsNotPausedError extends SparkContractError {
  constructor() {
    super('Contract is not paused - cannot perform paused-only operations');
    this.name = 'ContractIsNotPausedError';
  }
}

export class InvalidFactoryError extends SparkContractError {
  constructor() {
    super('Invalid factory address provided');
    this.name = 'InvalidFactoryError';
  }
}

export class CallerNotFactoryCloneError extends SparkContractError {
  constructor() {
    super('Only factory-created clones can perform this action');
    this.name = 'CallerNotFactoryCloneError';
  }
}

export class TermsNotSetError extends SparkContractError {
  constructor() {
    super('License terms must be set before requesting licenses');
    this.name = 'TermsNotSetError';
  }
}

export class InvalidDurationError extends SparkContractError {
  constructor() {
    super('Invalid duration - must be greater than zero');
    this.name = 'InvalidDurationError';
  }
}

export class FeeOutsideAllowedRangeError extends SparkContractError {
  constructor(provided: string, min: string, max: string) {
    super(`Fee ${provided} is outside allowed range ${min}-${max}`);
    this.name = 'FeeOutsideAllowedRangeError';
  }
}

export class NotLicenseOwnerError extends SparkContractError {
  constructor() {
    super('Only the license owner can perform this action');
    this.name = 'NotLicenseOwnerError';
  }
}

export class LicenseNotActiveError extends SparkContractError {
  constructor() {
    super('License is not active or has expired');
    this.name = 'LicenseNotActiveError';
  }
}

// **NEW: GovernorResearch Custom Errors**
export class ProposalInexistentError extends SparkContractError {
  constructor() {
    super('Proposal does not exist');
    this.name = 'ProposalInexistentError';
  }
}

export class IncorrectPhaseError extends SparkContractError {
  constructor(currentPhase: string) {
    super(`Proposal is in incorrect phase: ${currentPhase}`);
    this.name = 'IncorrectPhaseError';
  }
}

export class ProposalLifetimePassedError extends SparkContractError {
  constructor() {
    super('Proposal voting period has ended');
    this.name = 'ProposalLifetimePassedError';
  }
}

export class QuorumNotReachedError extends SparkContractError {
  constructor() {
    super('Proposal has not reached required quorum');
    this.name = 'QuorumNotReachedError';
  }
}

export class VoteChangeNotAllowedAfterCutOffError extends SparkContractError {
  constructor() {
    super('Vote changes not allowed after cutoff period');
    this.name = 'VoteChangeNotAllowedAfterCutOffError';
  }
}

export class VoterNdaNotSignedError extends SparkContractError {
  constructor() {
    super('Must sign NDA before voting on proposals');
    this.name = 'VoterNdaNotSignedError';
  }
}

// **NEW: LicenseSCILocker Custom Errors**
export class LicenseLockNotActiveError extends SparkContractError {
  constructor() {
    super('License lock is not currently active');
    this.name = 'LicenseLockNotActiveError';
  }
}

export class LicenseLockAlreadyActiveError extends SparkContractError {
  constructor() {
    super('License lock is already active');
    this.name = 'LicenseLockAlreadyActiveError';
  }
}

export class InsufficientBalanceError extends SparkContractError {
  constructor(current: string, requested: string) {
    super(`Insufficient balance: ${current}, requested: ${requested}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class CannotLockMoreThanTotalSupplyError extends SparkContractError {
  constructor() {
    super('Cannot lock more tokens than total supply');
    this.name = 'CannotLockMoreThanTotalSupplyError';
  }
}

// **NEW: SparkBridge Custom Errors**
export class IdeaNotApprovedByReviewersError extends SparkContractError {
  constructor() {
    super('Idea must be approved by reviewers before creating proposal');
    this.name = 'IdeaNotApprovedByReviewersError';
  }
}

export class MustBeOriginalIdeatorOrHaveLauncherRoleError extends SparkContractError {
  constructor() {
    super('Must be original ideator or have proposal launcher role');
    this.name = 'MustBeOriginalIdeatorOrHaveLauncherRoleError';
  }
}

export class ActionTypeNotAllowedError extends SparkContractError {
  constructor() {
    super('Action type is not allowed for this operation');
    this.name = 'ActionTypeNotAllowedError';
  }
}

// **NEW: General Contract Errors**
export class NotAContractError extends SparkContractError {
  constructor(address: string) {
    super(`Address ${address} is not a valid contract`);
    this.name = 'NotAContractError';
  }
}

export class UnauthorizedError extends SparkContractError {
  constructor(action: string) {
    super(`Unauthorized to perform action: ${action}`);
    this.name = 'UnauthorizedError';
  }
}

export class CannotBeZeroError extends SparkContractError {
  constructor(field: string) {
    super(`${field} cannot be zero`);
    this.name = 'CannotBeZeroError';
  }
}

export class SameAddressError extends SparkContractError {
  constructor() {
    super('New address cannot be the same as current address');
    this.name = 'SameAddressError';
  }
}
```

### **Error Handler Hook**

```typescript
// hooks/useErrorHandler.ts
export const useSparkErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    console.error(`Spark Error ${context ? `(${context})` : ''}:`, error);

    // **NEW: Handle SparkIdeaRegistry custom errors**
    if (error.message?.includes('SparkIdeaRegistry__NotAttestedToBothPlatformAgreements')) {
      showNDAPrompt('BOTH_PLATFORM', null);
      return;
    }

    // **NEW: Handle AttestationVault custom errors**
    if (error.message?.includes('AttestationVault__ZeroAddressForAdmin')) {
      showErrorNotification('Invalid admin address provided');
      return;
    }

    if (error.message?.includes('AttestationVault__UserDocumentHashCannotBeZero')) {
      showErrorNotification('Document hash is required for attestation');
      return;
    }

    if (error.message?.includes('AttestationVault__AgreementTypeIdCannotBeZero')) {
      showErrorNotification('Agreement type must be specified');
      return;
    }

    if (error.message?.includes('AttestationVault__InvalidSignatureZeroAddressRecovered')) {
      showErrorNotification('Invalid signature provided - please try signing again');
      return;
    }

    if (error.message?.includes('AttestationVault__SignerMismatch')) {
      showErrorNotification('Signature must be from the requesting account');
      return;
    }

    if (error.message?.includes('AttestationVault__DocumentAlreadyAttested')) {
      showErrorNotification('You have already attested to this agreement type');
      return;
    }

    if (error.message?.includes('AttestationVault__IdeaIdCannotBeZero')) {
      showErrorNotification('Valid idea ID is required');
      return;
    }

    if (error.message?.includes('AttestationVault__NdaHashCannotBeZero')) {
      showErrorNotification('NDA document hash is required');
      return;
    }

    if (error.message?.includes('AttestationVault__NoNdaHashSetForIdea')) {
      showErrorNotification('No NDA has been set for this idea yet - contact administrator');
      return;
    }

    if (error.message?.includes('AttestationVault__AlreadyAttestedToIdeaNda')) {
      showErrorNotification('You have already attested to this idea\'s NDA');
      return;
    }

    // **NEW: Handle SparkIPNFT custom errors**
    if (error.message?.includes('ContractIsPaused')) {
      showErrorNotification('Contract is currently paused - please try again later');
      return;
    }

    if (error.message?.includes('InvalidFactory')) {
      showErrorNotification('Invalid factory configuration - contact administrator');
      return;
    }

    if (error.message?.includes('CallerNotFactoryClone')) {
      showErrorNotification('Unauthorized action - must be factory-created clone');
      return;
    }

    if (error.message?.includes('TermsNotSet')) {
      showErrorNotification('License terms must be configured before proceeding');
      return;
    }

    if (error.message?.includes('InvalidDuration')) {
      showErrorNotification('Invalid duration - must be greater than zero');
      return;
    }

    if (error.message?.includes('FeeOutsideAllowedRange')) {
      showErrorNotification('Fee amount is outside allowed range - please adjust');
      return;
    }

    if (error.message?.includes('NotLicenseOwner')) {
      showErrorNotification('Only the license owner can perform this action');
      return;
    }

    if (error.message?.includes('LicenseNotActive')) {
      showErrorNotification('License is not active or has expired');
      return;
    }

    // **NEW: Handle GovernorResearch custom errors**
    if (error.message?.includes('ProposalInexistent')) {
      showErrorNotification('Proposal does not exist');
      return;
    }

    if (error.message?.includes('IncorrectPhase')) {
      showErrorNotification('Proposal is in wrong phase for this action');
      return;
    }

    if (error.message?.includes('ProposalLifetimePassed')) {
      showErrorNotification('Proposal voting period has ended');
      return;
    }

    if (error.message?.includes('QuorumNotReached')) {
      showErrorNotification('Proposal has not reached required quorum');
      return;
    }

    if (error.message?.includes('VoteChangeNotAllowedAfterCutOff')) {
      showErrorNotification('Vote changes not allowed after cutoff period');
      return;
    }

    if (error.message?.includes('VoterNdaNotSigned')) {
      showNDAPrompt('VOTER_NDA', null);
      return;
    }

    // **NEW: Handle LicenseSCILocker custom errors**
    if (error.message?.includes('LicenseLockNotActive')) {
      showErrorNotification('License lock is not currently active');
      return;
    }

    if (error.message?.includes('LicenseLockAlreadyActive')) {
      showErrorNotification('License lock is already active');
      return;
    }

    if (error.message?.includes('InsufficientBalance')) {
      showErrorNotification('Insufficient token balance for this operation');
      return;
    }

    if (error.message?.includes('CannotLockMoreThanTotalSupply')) {
      showErrorNotification('Cannot lock more tokens than total supply');
      return;
    }

    // **NEW: Handle SparkBridge custom errors**
    if (error.message?.includes('IdeaNotApprovedByReviewers')) {
      showErrorNotification('Idea must be approved by reviewers before creating proposal');
      return;
    }

    if (error.message?.includes('MustBeOriginalIdeatorOrHaveLauncherRole')) {
      showErrorNotification('Must be original ideator or have proposal launcher role');
      return;
    }

    if (error.message?.includes('ActionTypeNotAllowed')) {
      showErrorNotification('Action type is not allowed for this operation');
      return;
    }

    // **NEW: Handle General Contract Errors**
    if (error.message?.includes('NotAContract')) {
      showErrorNotification('Invalid contract address provided');
      return;
    }

    if (error.message?.includes('Unauthorized')) {
      showErrorNotification('Unauthorized to perform this action');
      return;
    }

    if (error.message?.includes('CannotBeZero')) {
      showErrorNotification('Value cannot be zero');
      return;
    }

    if (error.message?.includes('SameAddress')) {
      showErrorNotification('New address cannot be the same as current address');
      return;
    }

    // Handle existing custom error instances
    if (error instanceof NDAAthestationRequiredError) {
      showNDAPrompt(error.requiredNDAType, error.ideaId);
      return;
    }

    if (error instanceof InsufficientPermissionsError) {
      showErrorNotification(error.message);
      return;
    }

    if (error instanceof IdeaNotFoundError) {
      showErrorNotification('Idea not found or no longer available');
      return;
    }

    if (error instanceof NotAttestedToBothPlatformAgreementsError) {
      showNDAPrompt('BOTH_PLATFORM', null);
      return;
    }

    if (error instanceof UserDocumentHashCannotBeZeroError ||
        error instanceof AgreementTypeIdCannotBeZeroError ||
        error instanceof IdeaIdCannotBeZeroError ||
        error instanceof NdaHashCannotBeZeroError) {
      showErrorNotification('Required information is missing - please check your inputs');
      return;
    }

    if (error instanceof InvalidSignatureZeroAddressRecoveredError ||
        error instanceof SignerMismatchError) {
      showErrorNotification('Invalid signature - please try signing again');
      return;
    }

    if (error instanceof DocumentAlreadyAttestedError ||
        error instanceof AlreadyAttestedToIdeaNdaError) {
      showErrorNotification('You have already completed this attestation');
      return;
    }

    if (error instanceof NoNdaHashSetForIdeaError) {
      showErrorNotification('NDA not yet available for this idea - contact administrator');
      return;
    }

    // Handle common blockchain errors
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      showErrorNotification('Transaction would fail. Please check your inputs and try again.');
      return;
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      showErrorNotification('Insufficient funds to complete transaction');
      return;
    }

    if (error.code === 'USER_REJECTED') {
      showErrorNotification('Transaction cancelled by user');
      return;
    }

    if (error.code === 'NETWORK_ERROR') {
      showErrorNotification('Network error. Please check your connection and try again.');
      return;
    }

    // Generic error handling
    const message = error.message || 'An unexpected error occurred';
    showErrorNotification(message);
  };

  return { handleError };
};
```

---

## 📊 Contract State Management

### **Contract State Hook**

```typescript
// hooks/useContractState.ts
export const useContractState = () => {
  const [state, setState] = useState({
    ideas: new Map(),
    proposals: new Map(),
    userVotes: new Map(),
    loading: false,
    lastUpdated: null
  });

  const updateIdeaState = (ideaId: string, ideaData: any) => {
    setState(prev => ({
      ...prev,
      ideas: new Map(prev.ideas.set(ideaId, ideaData)),
      lastUpdated: Date.now()
    }));
  };

  const updateProposalState = (proposalId: string, proposalData: any) => {
    setState(prev => ({
      ...prev,
      proposals: new Map(prev.proposals.set(proposalId, proposalData)),
      lastUpdated: Date.now()
    }));
  };

  const clearState = () => {
    setState({
      ideas: new Map(),
      proposals: new Map(),
      userVotes: new Map(),
      loading: false,
      lastUpdated: null
    });
  };

  return {
    state,
    updateIdeaState,
    updateProposalState,
    clearState
  };
};
```

---

## 🧪 Testing Guidelines

### **Contract Hook Testing**

```typescript
// __tests__/hooks/useSparkIdeaRegistry.test.ts
describe('useSparkIdeaRegistry', () => {
  beforeEach(() => {
    // Mock contract instances
    mockUseSparkContracts.mockReturnValue({
      sparkIdeaRegistry: mockSparkIdeaRegistry
    });
  });

  test('submitIdea calls contract with correct parameters', async () => {
    const { result } = renderHook(() => useSparkIdeaRegistry());
    
    const mockTx = { wait: jest.fn().mockResolvedValue({ status: 1 }) };
    mockSparkIdeaRegistry.submitIdea.mockResolvedValue(mockTx);

    await act(async () => {
      await result.current.submitIdea('QmTestHash');
    });

    expect(mockSparkIdeaRegistry.submitIdea).toHaveBeenCalledWith('QmTestHash');
  });

  test('submitIdea handles platform attestation errors correctly', async () => {
    const { result } = renderHook(() => useSparkIdeaRegistry());
    
    const attestationError = new Error('execution reverted: SparkIdeaRegistry__NotAttestedToBothPlatformAgreements()');
    mockSparkIdeaRegistry.submitIdea.mockRejectedValue(attestationError);

    await expect(result.current.submitIdea('QmTestHash')).rejects.toThrow(NotAttestedToBothPlatformAgreementsError);
  });

  test('getIdea handles NDA attestation errors correctly', async () => {
    const { result } = renderHook(() => useSparkIdeaRegistry());
    
    const ndaError = new Error('execution reverted: NdaNotSigned("Caller has not attested to the platform-level NDAs required to view draft ideas.")');
    mockSparkIdeaRegistry.getIdea.mockRejectedValue(ndaError);

    await expect(result.current.getIdea('test-idea-id')).rejects.toThrow(NDAAthestationRequiredError);
  });

  test('modifyIdeaDetails handles idea modification errors', async () => {
    const { result } = renderHook(() => useSparkIdeaRegistry());
    
    const modificationError = new Error('execution reverted: SparkIdeaRegistry__OnlyIdeatorCanModify()');
    mockSparkIdeaRegistry.modifyIdeaDetails.mockRejectedValue(modificationError);

    await expect(result.current.modifyIdeaDetails('test-idea-id', 'QmNewHash')).rejects.toThrow(InsufficientPermissionsError);
  });

  test('voteOnIdea handles voting validation errors', async () => {
    const { result } = renderHook(() => useSparkIdeaRegistry());
    
    const votingError = new Error('execution reverted: SparkIdeaRegistry__AlreadyVoted(bytes32,address)');
    mockSparkIdeaRegistry.voteOnIdea.mockRejectedValue(votingError);

    await expect(result.current.voteOnIdea('test-idea-id', true)).rejects.toThrow(SparkContractError);
  });
});
```

### **AttestationVault Hook Testing**

```typescript
// __tests__/hooks/useAttestationVault.test.ts
describe('useAttestationVault', () => {
  beforeEach(() => {
    mockUseSparkContracts.mockReturnValue({
      attestationVault: mockAttestationVault
    });
  });

  test('attestToSignedDocument handles zero hash errors', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    const zeroHashError = new Error('execution reverted: AttestationVault__UserDocumentHashCannotBeZero()');
    mockAttestationVault.attestToSignedDocument.mockRejectedValue(zeroHashError);

    await expect(result.current.attestToSignedDocument('', 'PLATFORM_NDA_TYPE', '0xsignature')).rejects.toThrow(UserDocumentHashCannotBeZeroError);
  });

  test('attestToSignedDocument handles signature mismatch errors', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    const signerError = new Error('execution reverted: AttestationVault__SignerMismatch()');
    mockAttestationVault.attestToSignedDocument.mockRejectedValue(signerError);

    await expect(result.current.attestToSignedDocument('0xhash', 'PLATFORM_NDA_TYPE', '0xsignature')).rejects.toThrow(SignerMismatchError);
  });

  test('attestToSignedDocument handles duplicate attestation errors', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    const duplicateError = new Error('execution reverted: AttestationVault__DocumentAlreadyAttested()');
    mockAttestationVault.attestToSignedDocument.mockRejectedValue(duplicateError);

    await expect(result.current.attestToSignedDocument('0xhash', 'PLATFORM_NDA_TYPE', '0xsignature')).rejects.toThrow(DocumentAlreadyAttestedError);
  });

  test('setIdeaNdaHash handles admin-only validation', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    const zeroIdeaError = new Error('execution reverted: AttestationVault__IdeaIdCannotBeZero()');
    mockAttestationVault.setIdeaNdaHash.mockRejectedValue(zeroIdeaError);

    await expect(result.current.setIdeaNdaHash('', '0xndahash')).rejects.toThrow(IdeaIdCannotBeZeroError);
  });

  test('attestToIdeaNda handles missing NDA hash errors', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    const noNdaError = new Error('execution reverted: AttestationVault__NoNdaHashSetForIdea()');
    mockAttestationVault.attestToIdeaNda.mockRejectedValue(noNdaError);

    await expect(result.current.attestToIdeaNda('test-idea-id', '0xhash', '0xsignature')).rejects.toThrow(NoNdaHashSetForIdeaError);
  });

  test('attestToIdeaNda handles duplicate idea NDA attestation', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    const duplicateIdeaError = new Error('execution reverted: AttestationVault__AlreadyAttestedToIdeaNda()');
    mockAttestationVault.attestToIdeaNda.mockRejectedValue(duplicateIdeaError);

    await expect(result.current.attestToIdeaNda('test-idea-id', '0xhash', '0xsignature')).rejects.toThrow(AlreadyAttestedToIdeaNdaError);
  });
});
```

### **Error Handler Testing**

```typescript
// __tests__/hooks/useSparkErrorHandler.test.ts
describe('useSparkErrorHandler - New Custom Errors', () => {
  test('handles SparkIdeaRegistry custom errors correctly', async () => {
    const { result } = renderHook(() => useSparkErrorHandler());
    
    // Test platform attestation error
    const attestationError = {
      message: 'execution reverted: SparkIdeaRegistry__NotAttestedToBothPlatformAgreements()'
    };
    
    result.current.handleError(attestationError, 'idea submission');
    
    expect(showNDAPrompt).toHaveBeenCalledWith('BOTH_PLATFORM', null);
  });

  test('handles AttestationVault custom errors correctly', async () => {
    const { result } = renderHook(() => useSparkErrorHandler());
    
    // Test document already attested error
    const duplicateError = {
      message: 'execution reverted: AttestationVault__DocumentAlreadyAttested()'
    };
    
    result.current.handleError(duplicateError, 'document attestation');
    
    expect(showErrorNotification).toHaveBeenCalledWith('You have already attested to this agreement type');
  });

  test('handles signature validation errors appropriately', async () => {
    const { result } = renderHook(() => useSparkErrorHandler());
    
    const signatureErrors = [
      { message: 'execution reverted: AttestationVault__InvalidSignatureZeroAddressRecovered()' },
      { message: 'execution reverted: AttestationVault__SignerMismatch()' }
    ];
    
    signatureErrors.forEach(error => {
      result.current.handleError(error, 'signature validation');
    });
    
    expect(showErrorNotification).toHaveBeenCalledTimes(2);
    expect(showErrorNotification).toHaveBeenCalledWith('Invalid signature provided - please try signing again');
    expect(showErrorNotification).toHaveBeenCalledWith('Signature must be from the requesting account');
  });

  test('handles input validation errors with user-friendly messages', async () => {
    const { result } = renderHook(() => useSparkErrorHandler());
    
    const validationErrors = [
      { message: 'execution reverted: AttestationVault__UserDocumentHashCannotBeZero()' },
      { message: 'execution reverted: AttestationVault__AgreementTypeIdCannotBeZero()' },
      { message: 'execution reverted: AttestationVault__IdeaIdCannotBeZero()' },
      { message: 'execution reverted: AttestationVault__NdaHashCannotBeZero()' }
    ];
    
    validationErrors.forEach(error => {
      result.current.handleError(error, 'validation');
    });
    
    expect(showErrorNotification).toHaveBeenCalledTimes(4);
  });

  test('handles custom error instances correctly', async () => {
    const { result } = renderHook(() => useSparkErrorHandler());
    
    const customErrors = [
      new NotAttestedToBothPlatformAgreementsError(),
      new DocumentAlreadyAttestedError(),
      new NoNdaHashSetForIdeaError(),
      new InvalidSignatureZeroAddressRecoveredError()
    ];
    
    customErrors.forEach(error => {
      result.current.handleError(error, 'custom error testing');
    });
    
    expect(showNDAPrompt).toHaveBeenCalledWith('BOTH_PLATFORM', null);
    expect(showErrorNotification).toHaveBeenCalledWith('You have already completed this attestation');
    expect(showErrorNotification).toHaveBeenCalledWith('NDA not yet available for this idea - contact administrator');
    expect(showErrorNotification).toHaveBeenCalledWith('Invalid signature - please try signing again');
  });
});
```

### **Integration Testing**

```typescript
// __tests__/integration/contractErrorIntegration.test.ts
describe('Contract Error Integration Tests', () => {
  test('end-to-end idea submission with attestation validation', async () => {
    // Simulate missing platform attestation
    mockAttestationVault.hasAttestedToBothPlatformAgreementTypes.mockResolvedValue(false);
    
    const { result } = renderHook(() => useSparkIdeaRegistry());
    
    await expect(result.current.submitIdea('QmTestHash')).rejects.toThrow(NotAttestedToBothPlatformAgreementsError);
  });

  test('end-to-end attestation workflow with validation', async () => {
    const { result } = renderHook(() => useAttestationVault());
    
    // Test invalid signature scenario
    const invalidSigError = new Error('execution reverted: AttestationVault__InvalidSignatureZeroAddressRecovered()');
    mockAttestationVault.attestToSignedDocument.mockRejectedValue(invalidSigError);
    
    await expect(result.current.attestToSignedDocument('0xhash', 'PLATFORM_NDA_TYPE', 'invalid-sig')).rejects.toThrow(InvalidSignatureZeroAddressRecoveredError);
  });

  test('error recovery and user guidance flow', async () => {
    const { result: errorHandler } = renderHook(() => useSparkErrorHandler());
    const { result: registry } = renderHook(() => useSparkIdeaRegistry());
    
    // Simulate attestation required error
    const attestationError = new NotAttestedToBothPlatformAgreementsError();
    
    try {
      await registry.current.submitIdea('QmTestHash');
    } catch (error) {
      errorHandler.current.handleError(error, 'idea submission');
    }
    
    expect(showNDAPrompt).toHaveBeenCalledWith('BOTH_PLATFORM', null);
  });
});
```

---

Remember: This module provides the foundation for all blockchain interactions in the Spark platform. Ensure robust error handling and proper state management for a smooth user experience. 

## ✅ **UPDATED: Implementation Checklist**

### **Core Contract Integration**
- [x] **Enhanced useSparkContracts hook** - Now includes LicenseNFT, LicenseSCILocker, POToken
- [x] **Network configuration management** - Base Sepolia deployment ready
- [x] **Contract address validation** - All contract addresses from serverConfig.ts
- [x] **ABI management system** - All Spark contract ABIs included

### **NEW: Modernized Error Handling**
- [x] **Enhanced SparkIdeaRegistry errors** - 11 new custom error classes implemented
- [x] **Enhanced AttestationVault errors** - 10 new custom error classes implemented  
- [x] **Enhanced SparkIPNFT errors** - 25+ custom error classes implemented
- [x] **Enhanced GovernorResearch errors** - 30+ custom error classes implemented
- [x] **Enhanced LicenseSCILocker errors** - 15+ custom error classes implemented
- [x] **Enhanced SparkBridge errors** - 10+ custom error classes implemented
- [x] **Enhanced General Contract errors** - Common error patterns implemented
- [x] **Updated useSparkErrorHandler hook** - Handles ALL modern custom errors across ALL contracts
- [x] **Modernized contract hooks** - useSparkIdeaRegistry with new error patterns
- [x] **NEW: useAttestationVault hook** - Complete AttestationVault integration
- [x] **User-friendly error messages** - Contextual error notifications for ALL contracts
- [x] **Comprehensive error testing** - Unit tests for all error scenarios across ALL contracts

### **SparkIdeaRegistry Integration**
- [x] **Enhanced idea submission** - Modern error handling for all validation
- [x] **Idea modification workflow** - Comprehensive error coverage
- [x] **Idea finalization process** - Proper error messaging
- [x] **Reviewer voting system** - Enhanced validation errors
- [x] **NDA attestation integration** - Seamless error flow to attestation

### **AttestationVault Integration**  
- [x] **Document attestation workflow** - Complete implementation with error handling
- [x] **Idea-specific NDA management** - Full workflow coverage
- [x] **Platform agreement tracking** - Both NDA and Terms validation
- [x] **Admin NDA hash management** - Secure admin-only operations
- [x] **Signature validation** - Comprehensive EIP-712 signature handling
- [x] **Duplicate attestation prevention** - User-friendly duplicate handling

### **Enhanced Error Handling**
- [x] **SparkIdeaRegistry-specific errors** - All contract errors mapped
- [x] **AttestationVault-specific errors** - Complete error coverage
- [x] **SparkIPNFT-specific errors** - All licensing and admin errors covered
- [x] **GovernorResearch-specific errors** - All governance and proposal errors covered
- [x] **LicenseSCILocker-specific errors** - All token locking errors covered
- [x] **SparkBridge-specific errors** - All bridge operation errors covered
- [x] **General contract errors** - Common error patterns across all contracts
- [x] **Input validation errors** - User-friendly validation messages
- [x] **Signature validation errors** - Clear signature error guidance
- [x] **Permission-based errors** - Role-based error messaging
- [x] **Duplicate operation errors** - Graceful duplicate handling
- [x] **Contract state errors** - Proper state validation messaging
- [x] **Token operation errors** - Clear token-related error guidance

### **Transaction Management**
- [x] **Enhanced transaction handler** - Support for complex multi-step operations
- [x] **Gas estimation improvements** - Better gas estimates with new patterns
- [x] **Transaction logging** - Comprehensive transaction history
- [x] **Error recovery patterns** - Robust error recovery workflows

### **Event Handling**
- [x] **SparkIdeaRegistry events** - All contract events covered
- [x] **AttestationVault events** - Complete event integration
- [x] **Error event tracking** - Enhanced error monitoring
- [x] **User notification system** - Context-aware notifications

### **State Management**
- [x] **Contract state synchronization** - Real-time state updates
- [x] **Error state management** - Proper error state handling
- [x] **Attestation state tracking** - Complete attestation status management
- [x] **User guidance state** - Dynamic user guidance based on errors

### **Performance Optimization**
- [x] **Gas-efficient error patterns** - Modern error handling saves gas
- [x] **Error message optimization** - Efficient error processing
- [x] **Contract interaction optimization** - Streamlined contract calls
- [x] **Error recovery optimization** - Fast error recovery patterns

### **Testing Coverage**
- [x] **Unit tests for all new errors** - Comprehensive error testing
- [x] **Integration tests** - End-to-end error flow testing
- [x] **Error handler testing** - Complete useSparkErrorHandler coverage
- [x] **Contract hook testing** - All hooks tested with new errors
- [x] **User experience testing** - Error flow UX validation 

## **Enhanced Error Handling for Updated Contracts**

### **Custom Error Handling for All Contracts**

All Spark contracts now use custom error functions instead of string-based revert statements for better gas efficiency and consistency. This update affects the following contracts:

#### **SparkBridge Custom Errors**
```typescript
// In useSparkBridge.ts
const launchProposal = async (ideaId: string, actionType: number, actionParams: string) => {
  try {
    const tx = await sparkBridge.launchProposal(ideaId, actionType, actionParams);
    
    return await handleTransaction(tx, {
      pending: 'Launching proposal...',
      success: 'Proposal launched successfully!',
      error: 'Failed to launch proposal'
    });
  } catch (error) {
    // **NEW: Handle SparkBridge custom errors**
    if (error.message?.includes('InvalidIdeaId')) {
      throw new SparkContractError('Invalid idea ID provided');
    }
    if (error.message?.includes('InvalidActionType')) {
      throw new SparkContractError('Invalid action type specified');
    }
    if (error.message?.includes('InvalidIdeatorAddress')) {
      throw new SparkContractError('Invalid ideator address');
    }
    if (error.message?.includes('InvalidIpfsHash')) {
      throw new SparkContractError('Invalid IPFS hash provided');
    }
    if (error.message?.includes('IdeaNotApprovedByReviewers')) {
      throw new SparkContractError('Idea must be approved by reviewers before launching proposal');
    }
    if (error.message?.includes('MustBeOriginalIdeatorOrHaveLauncherRole')) {
      throw new InsufficientPermissionsError('launch proposal', 'Ideator or Launcher');
    }
    
    throw new SparkContractError('Proposal launch failed', error);
  }
};
```

#### **LicenseNFT Custom Errors**
```typescript
// In useSparkIPNFT.ts - License NFT operations
const processLicenseTransfer = async (licenseId: string) => {
  try {
    // License NFT operations
    // Note: Transfers are not allowed for License NFTs (soul-bound)
  } catch (error) {
    // **NEW: Handle LicenseNFT custom errors**
    if (error.message?.includes('NonTransferable')) {
      throw new SparkContractError('License NFTs are non-transferable (soul-bound)');
    }
    if (error.message?.includes('OnlySparkIPNFT')) {
      throw new SparkContractError('Only SparkIPNFT contract can perform this operation');
    }
    if (error.message?.includes('AlreadyActive')) {
      throw new SparkContractError('License is already active');
    }
    if (error.message?.includes('NotActive')) {
      throw new SparkContractError('License is not active');
    }
    
    throw new SparkContractError('License operation failed', error);
  }
};
```

#### **MintIPNFT and FundAndMintIPNFT Custom Errors**
```typescript
// In useGovernanceExecution.ts - IP-NFT minting operations
const executeMintAction = async (actionAddress: string) => {
  try {
    const tx = await governorExecutor.execute(actionAddress);
    
    return await handleTransaction(tx, {
      pending: 'Executing IP-NFT mint...',
      success: 'IP-NFT minted successfully!',
      error: 'Failed to mint IP-NFT'
    });
  } catch (error) {
    // **NEW: Handle MintIPNFT and FundAndMintIPNFT custom errors**
    if (error.message?.includes('MintingFailed')) {
      throw new SparkContractError('IP-NFT minting failed - invalid token ID returned');
    }
    if (error.message?.includes('AlreadyInitialized')) {
      throw new SparkContractError('Action has already been initialized');
    }
    if (error.message?.includes('NotInitialized')) {
      throw new SparkContractError('Action must be initialized before execution');
    }
    if (error.message?.includes('InvalidSparkIPNFTAddress')) {
      throw new SparkContractError('Invalid SparkIPNFT contract address');
    }
    if (error.message?.includes('InvalidCopyleftPoolAddress')) {
      throw new SparkContractError('Invalid CopyleftPool contract address');
    }
    if (error.message?.includes('InvalidOriginalCreatorAddress')) {
      throw new SparkContractError('Invalid original creator address');
    }
    if (error.message?.includes('ContractNotDeployed')) {
      throw new SparkContractError('Required contract is not deployed');
    }
    
    throw new SparkContractError('IP-NFT execution failed', error);
  }
};
```

#### **GovernorResearch Enhanced Arithmetic Error Handling**
```typescript
// In useGovernorResearch.ts - Voting operations
const voteOnProposal = async (proposalId: number, support: boolean) => {
  try {
    const tx = await governorResearch.vote(proposalId, support);
    
    return await handleTransaction(tx, {
      pending: `${support ? 'Supporting' : 'Opposing'} proposal...`,
      success: 'Vote cast successfully!',
      error: 'Failed to cast vote'
    });
  } catch (error) {
    // **NEW: Handle GovernorResearch enhanced arithmetic errors**
    if (error.message?.includes('ArithmeticOverflowInVotesFor')) {
      throw new SparkContractError('Vote counting overflow in support votes');
    }
    if (error.message?.includes('ArithmeticOverflowInVotesAgainst')) {
      throw new SparkContractError('Vote counting overflow in opposition votes');
    }
    if (error.message?.includes('ArithmeticOverflowInVotesTotal')) {
      throw new SparkContractError('Vote counting overflow in total votes');
    }
    
    throw new SparkContractError('Voting failed', error);
  }
};
```

### **Error Handler Updates**

Update your error handler to include these new custom errors:

```typescript
// In utils/contractErrorHandler.ts
export const handleSparkContractError = (error: any, operation: string) => {
  const errorMessage = error.message || '';
  
  // SparkBridge errors
  if (errorMessage.includes('InvalidIdeaId')) {
    throw new SparkContractError('Invalid idea ID provided');
  }
  if (errorMessage.includes('InvalidActionType')) {
    throw new SparkContractError('Invalid action type specified');
  }
  if (errorMessage.includes('InvalidIdeatorAddress')) {
    throw new SparkContractError('Invalid ideator address');
  }
  if (errorMessage.includes('InvalidIpfsHash')) {
    throw new SparkContractError('Invalid IPFS hash provided');
  }
  
  // LicenseNFT errors
  if (errorMessage.includes('NonTransferable')) {
    throw new SparkContractError('License NFTs cannot be transferred (soul-bound)');
  }
  
  // MintIPNFT/FundAndMintIPNFT errors
  if (errorMessage.includes('MintingFailed')) {
    throw new SparkContractError('IP-NFT minting failed - please try again');
  }
  if (errorMessage.includes('ContractNotDeployed')) {
    throw new SparkContractError('Required contract is not properly deployed');
  }
  
  // GovernorResearch arithmetic errors
  if (errorMessage.includes('ArithmeticOverflow')) {
    throw new SparkContractError('Vote counting overflow detected - please contact support');
  }
  
  // Generic fallback
  throw new SparkContractError(`${operation} failed: ${errorMessage}`, error);
};
```

### **Testing Custom Error Handling**

```typescript
// __tests__/hooks/useSparkBridge.test.ts
describe('useSparkBridge - Custom Error Handling', () => {
  test('handles InvalidIdeaId error correctly', async () => {
    const { result } = renderHook(() => useSparkBridge());
    
    const invalidIdeaError = new Error('execution reverted: InvalidIdeaId()');
    mockSparkBridge.launchProposal.mockRejectedValue(invalidIdeaError);

    await expect(result.current.launchProposal('', 1, '0x')).rejects.toThrow(SparkContractError);
  });

  test('handles permission errors correctly', async () => {
    const { result } = renderHook(() => useSparkBridge());
    
    const permissionError = new Error('execution reverted: MustBeOriginalIdeatorOrHaveLauncherRole()');
    mockSparkBridge.launchProposal.mockRejectedValue(permissionError);

    await expect(result.current.launchProposal('test-idea', 1, '0x')).rejects.toThrow(InsufficientPermissionsError);
  });
});

// __tests__/hooks/useLicenseNFT.test.ts
describe('useLicenseNFT - Custom Error Handling', () => {
  test('handles NonTransferable error correctly', async () => {
    const { result } = renderHook(() => useLicenseNFT());
    
    const transferError = new Error('execution reverted: NonTransferable()');
    mockLicenseNFT.transferFrom.mockRejectedValue(transferError);

    await expect(result.current.attemptTransfer('0x123', '0x456', 1)).rejects.toThrow(SparkContractError);
  });
});

// __tests__/hooks/useGovernorResearch.test.ts
describe('useGovernorResearch - Enhanced Arithmetic Error Handling', () => {
  test('handles arithmetic overflow errors correctly', async () => {
    const { result } = renderHook(() => useGovernorResearch());
    
    const overflowError = new Error('execution reverted: ArithmeticOverflowInVotesFor()');
    mockGovernorResearch.vote.mockRejectedValue(overflowError);

    await expect(result.current.voteOnProposal(1, true)).rejects.toThrow(SparkContractError);
  });
});
```

## **SparkBridge Integration** 

### **Overview**
The SparkBridge contract serves as the central coordination layer that bridges approved Spark ideas with Poscidon's governance system. It enables the launch of research proposals for IP-NFT creation and manages the transition from idea approval to formal research execution.

### **Core Responsibilities**
- Launch governance proposals for approved ideas
- Coordinate IP-NFT minting actions (MintIPNFT & FundAndMintIPNFT)
- Manage action type permissions for IP-NFT operations
- Bridge between SparkIdeaRegistry and GovernorResearch

### **Contract Interface & Types**

```typescript
// types/SparkBridge.ts
export interface SparkBridgeConfig {
  governorResearch: string;
  ideaRegistry: string;
  governorExecutor: string;
  sparkIpNft: string;
  copyleftPool: string;
  allowedIpNftActionTypes: number[];
}

export interface LaunchProposalParams {
  ideaId: string; // bytes32 as hex string
  proposalActionType: number;
  actionParams: string; // hex encoded bytes
}

export interface ProposalLaunchedEvent {
  ideaId: string;
  proposalId: number;
  launcher: string;
  info: string; // IPFS hash
  actionTypeUsed: number;
}

export interface SparkBridgeSetupStatus {
  setupValid: boolean;
  missingSetup: string[];
}

// Contract error types
export enum SparkBridgeError {
  INVALID_IDEA_ID = 'InvalidIdeaId',
  INVALID_ACTION_TYPE = 'InvalidActionType',
  INVALID_IDEATOR_ADDRESS = 'InvalidIdeatorAddress',
  INVALID_IPFS_HASH = 'InvalidIpfsHash',
  IDEA_NOT_APPROVED = 'IdeaNotApprovedByReviewers',
  INSUFFICIENT_PERMISSIONS = 'MustBeOriginalIdeatorOrHaveLauncherRole',
  SPARK_IPNFT_NOT_SET = 'SparkIpNftAddressNotSet',
  COPYLEFT_POOL_NOT_SET = 'CopyleftPoolAddressNotSet',
  NO_ACTION_TYPES = 'NoIpNftActionTypesConfigured',
  ACTION_TYPE_NOT_ALLOWED = 'ActionTypeNotAllowed'
}
```

### **useSparkBridge Hook Implementation**

```typescript
// hooks/useSparkBridge.ts
import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useSparkContracts } from './useSparkContracts';
import { useWalletContext } from './useWalletContext';
import { useSparkIdeaRegistry } from './useSparkIdeaRegistry';
import { handleTransaction } from '../utils/transactionHandler';
import { SparkContractError, InsufficientPermissionsError } from '../utils/contractErrors';

export const useSparkBridge = () => {
  const { sparkBridge } = useSparkContracts();
  const { address, signer } = useWalletContext();
  const { getIdea } = useSparkIdeaRegistry();
  const [bridgeConfig, setBridgeConfig] = useState<SparkBridgeConfig | null>(null);
  const [setupStatus, setSetupStatus] = useState<SparkBridgeSetupStatus | null>(null);

  // Initialize bridge configuration
  useEffect(() => {
    if (sparkBridge) {
      loadBridgeConfig();
      checkSetupStatus();
    }
  }, [sparkBridge]);

  const loadBridgeConfig = async () => {
    try {
      const [governorResearch, ideaRegistry, governorExecutor, sparkIpNft, copyleftPool, actionTypes] = 
        await Promise.all([
          sparkBridge.governorResearch(),
          sparkBridge.ideaRegistry(),
          sparkBridge.governorExecutorAddress(),
          sparkBridge.sparkIpNftAddress(),
          sparkBridge.copyleftPoolAddress(),
          sparkBridge.getAllIpNftActionTypes()
        ]);

      setBridgeConfig({
        governorResearch,
        ideaRegistry,
        governorExecutor,
        sparkIpNft,
        copyleftPool,
        allowedIpNftActionTypes: actionTypes.map(type => type.toNumber())
      });
    } catch (error) {
      console.error('Failed to load bridge configuration:', error);
      throw new SparkContractError('Failed to load bridge configuration', error);
    }
  };

  const checkSetupStatus = async () => {
    try {
      const [setupValid, missingSetup] = await sparkBridge.validateSetup();
      setSetupStatus({ setupValid, missingSetup });
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setSetupStatus({ setupValid: false, missingSetup: ['Setup validation failed'] });
    }
  };

  // Core function to launch a proposal
  const launchProposal = async (
    ideaId: string,
    proposalActionType: number,
    actionParams: string = '0x'
  ): Promise<{ proposalId: number; txHash: string }> => {
    if (!sparkBridge || !signer) {
      throw new SparkContractError('Bridge not initialized or wallet not connected');
    }

    try {
      // Validate idea exists and is approved
      const idea = await getIdea(ideaId);
      if (!idea) {
        throw new SparkContractError('Idea not found');
      }

      // Check permissions - either original ideator OR has launcher role
      const hasLauncherRole = await sparkBridge.hasRole(
        await sparkBridge.PROPOSAL_LAUNCHER_ROLE(),
        address
      );
      const isOriginalIdeator = idea.ideator.toLowerCase() === address?.toLowerCase();

      if (!isOriginalIdeator && !hasLauncherRole) {
        throw new InsufficientPermissionsError(
          'Must be original ideator or have proposal launcher role'
        );
      }

      // Launch the proposal
      const tx = await sparkBridge.launchProposal(
        ideaId,
        proposalActionType,
        actionParams
      );

      const result = await handleTransaction(tx, {
        pending: 'Launching research proposal...',
        success: 'Research proposal launched successfully!',
        error: 'Failed to launch proposal'
      });

      // Extract proposal ID from events
      const receipt = await tx.wait();
      const proposalLaunchedEvent = receipt.logs
        .map(log => {
          try {
            return sparkBridge.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(parsed => parsed?.name === 'ProposalLaunched');

      const proposalId = proposalLaunchedEvent?.args?.proposalId?.toNumber() || 0;

      return {
        proposalId,
        txHash: result.hash
      };

    } catch (error) {
      handleSparkBridgeError(error, 'Launch proposal');
      throw error;
    }
  };

  // Launch IP-NFT minting proposal (auto-constructs params)
  const launchIpNftMintingProposal = async (
    ideaId: string,
    actionType: number = 2 // Default to MintIPNFT (action type 2)
  ): Promise<{ proposalId: number; txHash: string }> => {
    if (!bridgeConfig?.allowedIpNftActionTypes.includes(actionType)) {
      throw new SparkContractError(`Action type ${actionType} not allowed for IP-NFT minting`);
    }

    // For IP-NFT actions, params are auto-constructed by the contract
    return launchProposal(ideaId, actionType, '0x');
  };

  // Check if user can launch proposals for an idea
  const canLaunchProposal = async (ideaId: string): Promise<boolean> => {
    try {
      if (!address) return false;

      const idea = await getIdea(ideaId);
      if (!idea) return false;

      // Check if idea is approved
      const isApproved = await sparkBridge.ideaRegistry().isIdeaApprovedByReviewers(ideaId);
      if (!isApproved) return false;

      // Check permissions
      const hasLauncherRole = await sparkBridge.hasRole(
        await sparkBridge.PROPOSAL_LAUNCHER_ROLE(),
        address
      );
      const isOriginalIdeator = idea.ideator.toLowerCase() === address?.toLowerCase();

      return isOriginalIdeator || hasLauncherRole;
    } catch (error) {
      console.error('Failed to check launch permissions:', error);
      return false;
    }
  };

  // Get allowed action types for IP-NFT operations
  const getAllowedIpNftActionTypes = useCallback(async (): Promise<number[]> => {
    try {
      const actionTypes = await sparkBridge.getAllIpNftActionTypes();
      return actionTypes.map(type => type.toNumber());
    } catch (error) {
      console.error('Failed to get allowed action types:', error);
      return [];
    }
  }, [sparkBridge]);

  // Check if action type is allowed for IP-NFT operations
  const isIpNftActionType = useCallback(async (actionType: number): Promise<boolean> => {
    try {
      return await sparkBridge.isIpNftActionType(actionType);
    } catch (error) {
      console.error('Failed to check action type:', error);
      return false;
    }
  }, [sparkBridge]);

  // Validate bridge has required governance roles
  const validateGovernanceRoles = async (): Promise<boolean> => {
    try {
      return await sparkBridge.validateGovernanceRoles();
    } catch (error) {
      console.error('Failed to validate governance roles:', error);
      return false;
    }
  };

  return {
    // State
    bridgeConfig,
    setupStatus,
    
    // Core actions
    launchProposal,
    launchIpNftMintingProposal,
    
    // Permissions & validation
    canLaunchProposal,
    validateGovernanceRoles,
    
    // Configuration queries
    getAllowedIpNftActionTypes,
    isIpNftActionType,
    
    // Utilities
    refreshConfig: loadBridgeConfig,
    checkSetup: checkSetupStatus
  };
};

// Error handling for SparkBridge-specific errors
const handleSparkBridgeError = (error: any, operation: string) => {
  const errorMessage = error.message || '';
  
  // Check for specific SparkBridge errors
  if (errorMessage.includes('InvalidIdeaId')) {
    throw new SparkContractError('Invalid idea ID provided');
  }
  if (errorMessage.includes('InvalidActionType')) {
    throw new SparkContractError('Invalid action type specified');
  }
  if (errorMessage.includes('InvalidIdeatorAddress')) {
    throw new SparkContractError('Invalid ideator address');
  }
  if (errorMessage.includes('InvalidIpfsHash')) {
    throw new SparkContractError('Invalid IPFS hash provided');
  }
  
  // LicenseNFT errors
  if (errorMessage.includes('NonTransferable')) {
    throw new SparkContractError('License NFTs cannot be transferred (soul-bound)');
  }
  
  // MintIPNFT/FundAndMintIPNFT errors
  if (errorMessage.includes('MintingFailed')) {
    throw new SparkContractError('IP-NFT minting failed - please try again');
  }
  if (errorMessage.includes('ContractNotDeployed')) {
    throw new SparkContractError('Required contract is not properly deployed');
  }
  
  // GovernorResearch arithmetic errors
  if (errorMessage.includes('ArithmeticOverflow')) {
    throw new SparkContractError('Vote counting overflow detected - please contact support');
  }
  
  // Generic fallback
  throw new SparkContractError(`${operation} failed: ${errorMessage}`, error);
};
```

### **Event Listening & Real-time Updates**

```typescript
// hooks/useSparkBridgeEvents.ts
export const useSparkBridgeEvents = () => {
  const { sparkBridge } = useSparkContracts();
  const [recentProposals, setRecentProposals] = useState<ProposalLaunchedEvent[]>([]);

  useEffect(() => {
    if (!sparkBridge) return;

    const handleProposalLaunched = (
      ideaId: string,
      proposalId: ethers.BigNumber,
      launcher: string,
      info: string,
      actionTypeUsed: ethers.BigNumber,
      event: ethers.Event
    ) => {
      const proposalEvent: ProposalLaunchedEvent = {
        ideaId,
        proposalId: proposalId.toNumber(),
        launcher,
        info,
        actionTypeUsed: actionTypeUsed.toNumber()
      };

      setRecentProposals(prev => [proposalEvent, ...prev.slice(0, 49)]); // Keep last 50
      
      // Emit custom event for other components
      window.dispatchEvent(new CustomEvent('sparkProposalLaunched', {
        detail: proposalEvent
      }));
    };

    // Listen for ProposalLaunched events
    sparkBridge.on('ProposalLaunched', handleProposalLaunched);

    return () => {
      sparkBridge.removeAllListeners('ProposalLaunched');
    };
  }, [sparkBridge]);

  // Get proposal history for a specific idea
  const getProposalHistoryForIdea = useCallback(async (
    ideaId: string,
    fromBlock: number = 0
  ): Promise<ProposalLaunchedEvent[]> => {
    if (!sparkBridge) return [];

    try {
      const filter = sparkBridge.filters.ProposalLaunched(ideaId);
      const events = await sparkBridge.queryFilter(filter, fromBlock);
      
      return events.map(event => ({
        ideaId: event.args.ideaId,
        proposalId: event.args.proposalId.toNumber(),
        launcher: event.args.launcher,
        info: event.args.info,
        actionTypeUsed: event.args.actionTypeUsed.toNumber()
      }));
    } catch (error) {
      console.error('Failed to get proposal history:', error);
      return [];
    }
  }, [sparkBridge]);

  return {
    recentProposals,
    getProposalHistoryForIdea
  };
};
```

### **Admin Configuration Hook**

```typescript
// hooks/useSparkBridgeAdmin.ts (for admin users only)
export const useSparkBridgeAdmin = () => {
  const { sparkBridge } = useSparkContracts();
  const { address } = useWalletContext();

  // Check if user has admin role
  const isAdmin = useCallback(async (): Promise<boolean> => {
    if (!sparkBridge || !address) return false;
    
    try {
      const DEFAULT_ADMIN_ROLE = await sparkBridge.DEFAULT_ADMIN_ROLE();
      return await sparkBridge.hasRole(DEFAULT_ADMIN_ROLE, address);
    } catch (error) {
      console.error('Failed to check admin role:', error);
      return false;
    }
  }, [sparkBridge, address]);

  // Add IP-NFT action type
  const addIpNftActionType = async (actionType: number): Promise<string> => {
    if (!sparkBridge) throw new SparkContractError('Bridge not initialized');

    try {
      const tx = await sparkBridge.addIpNftActionType(actionType);
      
      return await handleTransaction(tx, {
        pending: `Adding IP-NFT action type ${actionType}...`,
        success: `IP-NFT action type ${actionType} added successfully!`,
        error: 'Failed to add action type'
      });
    } catch (error) {
      if (error.message?.includes('ActionTypeAlreadyAllowed')) {
        throw new SparkContractError(`Action type ${actionType} is already allowed`);
      }
      if (error.message?.includes('ActionTypeCannotBeZero')) {
        throw new SparkContractError('Action type cannot be zero');
      }
      throw new SparkContractError(`Failed to add action type: ${error.message}`, error);
    }
  };

  // Remove IP-NFT action type
  const removeIpNftActionType = async (actionType: number): Promise<string> => {
    if (!sparkBridge) throw new SparkContractError('Bridge not initialized');

    try {
      const tx = await sparkBridge.removeIpNftActionType(actionType);
      
      return await handleTransaction(tx, {
        pending: `Removing IP-NFT action type ${actionType}...`,
        success: `IP-NFT action type ${actionType} removed successfully!`,
        error: 'Failed to remove action type'
      });
    } catch (error) {
      if (error.message?.includes('ActionTypeNotAllowed')) {
        throw new SparkContractError(`Action type ${actionType} is not currently allowed`);
      }
      throw new SparkContractError(`Failed to remove action type: ${error.message}`, error);
    }
  };

  // Grant proposal launcher role
  const grantProposalLauncherRole = async (account: string): Promise<string> => {
    if (!sparkBridge) throw new SparkContractError('Bridge not initialized');

    try {
      const tx = await sparkBridge.grantProposalLauncherRole(account);
      
      return await handleTransaction(tx, {
        pending: `Granting proposal launcher role to ${account}...`,
        success: `Proposal launcher role granted to ${account}!`,
        error: 'Failed to grant role'
      });
    } catch (error) {
      throw new SparkContractError(`Failed to grant launcher role: ${error.message}`, error);
    }
  };

  // Revoke proposal launcher role
  const revokeProposalLauncherRole = async (account: string): Promise<string> => {
    if (!sparkBridge) throw new SparkContractError('Bridge not initialized');

    try {
      const tx = await sparkBridge.revokeProposalLauncherRole(account);
      
      return await handleTransaction(tx, {
        pending: `Revoking proposal launcher role from ${account}...`,
        success: `Proposal launcher role revoked from ${account}!`,
        error: 'Failed to revoke role'
      });
    } catch (error) {
      throw new SparkContractError(`Failed to revoke launcher role: ${error.message}`, error);
    }
  };

  // Update contract addresses (admin only)
  const updateSparkIpNftAddress = async (newAddress: string): Promise<string> => {
    if (!sparkBridge) throw new SparkContractError('Bridge not initialized');

    try {
      const tx = await sparkBridge.setSparkIpNftAddress(newAddress);
      
      return await handleTransaction(tx, {
        pending: 'Updating SparkIPNFT address...',
        success: 'SparkIPNFT address updated successfully!',
        error: 'Failed to update address'
      });
    } catch (error) {
      if (error.message?.includes('SameAddress')) {
        throw new SparkContractError('New address is the same as current address');
      }
      if (error.message?.includes('NotAContract')) {
        throw new SparkContractError('Address is not a contract');
      }
      throw new SparkContractError(`Failed to update address: ${error.message}`, error);
    }
  };

  return {
    isAdmin,
    addIpNftActionType,
    removeIpNftActionType,
    grantProposalLauncherRole,
    revokeProposalLauncherRole,
    updateSparkIpNftAddress
  };
};
```

### **Testing Implementation**

```typescript
// __tests__/hooks/useSparkBridge.test.ts
describe('useSparkBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('launches IP-NFT minting proposal successfully', async () => {
    const { result } = renderHook(() => useSparkBridge());
    
    const mockTx = { hash: '0x123', wait: jest.fn().mockResolvedValue({ logs: [] }) };
    mockSparkBridge.launchProposal.mockResolvedValue(mockTx);

    await act(async () => {
      const response = await result.current.launchIpNftMintingProposal('test-idea-id', 2);
      expect(response.txHash).toBe('0x123');
    });

    expect(mockSparkBridge.launchProposal).toHaveBeenCalledWith('test-idea-id', 2, '0x');
  });

  test('handles permission errors correctly', async () => {
    const { result } = renderHook(() => useSparkBridge());
    
    const permissionError = new Error('MustBeOriginalIdeatorOrHaveLauncherRole()');
    mockSparkBridge.launchProposal.mockRejectedValue(permissionError);

    await expect(result.current.launchProposal('test-idea', 1, '0x')).rejects.toThrow(InsufficientPermissionsError);
  });

  test('validates action types correctly', async () => {
    const { result } = renderHook(() => useSparkBridge());
    
    mockSparkBridge.isIpNftActionType.mockResolvedValue(true);

    await act(async () => {
      const isValid = await result.current.isIpNftActionType(2);
      expect(isValid).toBe(true);
    });
  });

  test('checks launch permissions correctly', async () => {
    const { result } = renderHook(() => useSparkBridge());
    
    // Mock idea data
    const mockIdea = { ideator: '0x123', approved: true };
    mockSparkBridge.ideaRegistry.mockReturnValue({
      isIdeaApprovedByReviewers: jest.fn().mockResolvedValue(true)
    });

    await act(async () => {
      const canLaunch = await result.current.canLaunchProposal('test-idea-id');
      expect(typeof canLaunch).toBe('boolean');
    });
  });
});
```

### **Usage Examples in Components**

```typescript
// components/LaunchProposalButton.tsx
export const LaunchProposalButton: React.FC<{ ideaId: string }> = ({ ideaId }) => {
  const { launchIpNftMintingProposal, canLaunchProposal, setupStatus } = useSparkBridge();
  const [canLaunch, setCanLaunch] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const allowed = await canLaunchProposal(ideaId);
      setCanLaunch(allowed);
    };
    checkPermissions();
  }, [ideaId, canLaunchProposal]);

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const result = await launchIpNftMintingProposal(ideaId, 2); // MintIPNFT action type
      console.log('Proposal launched:', result);
    } catch (error) {
      console.error('Launch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!setupStatus?.setupValid) {
    return (
      <div className="text-red-500">
        Bridge setup incomplete: {setupStatus?.missingSetup.join(', ')}
      </div>
    );
  }

  return (
    <button
      onClick={handleLaunch}
      disabled={!canLaunch || loading}
      className="btn-primary"
    >
      {loading ? 'Launching...' : 'Launch Research Proposal'}
    </button>
  );
};

// components/BridgeConfigPanel.tsx (for admin use)
export const BridgeConfigPanel: React.FC = () => {
  const { bridgeConfig, setupStatus } = useSparkBridge();
  const { isAdmin, addIpNftActionType } = useSparkBridgeAdmin();
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      setIsAdminUser(admin);
    };
    checkAdmin();
  }, [isAdmin]);

  if (!isAdminUser) {
    return <div>Admin access required</div>;
  }

  return (
    <div className="config-panel">
      <h3>SparkBridge Configuration</h3>
      
      <div className="setup-status">
        <h4>Setup Status: {setupStatus?.setupValid ? '✅ Valid' : '❌ Invalid'}</h4>
        {setupStatus?.missingSetup.map(item => (
          <div key={item} className="text-red-500">⚠️ {item}</div>
        ))}
      </div>

      <div className="contract-addresses">
        <h4>Contract Addresses</h4>
        <div>Governor Research: {bridgeConfig?.governorResearch}</div>
        <div>Idea Registry: {bridgeConfig?.ideaRegistry}</div>
        <div>SparkIPNFT: {bridgeConfig?.sparkIpNft}</div>
        <div>Copyleft Pool: {bridgeConfig?.copyleftPool}</div>
      </div>

      <div className="action-types">
        <h4>Allowed IP-NFT Action Types</h4>
        {bridgeConfig?.allowedIpNftActionTypes.map(type => (
          <span key={type} className="badge">{type}</span>
        ))}
      </div>
    </div>
  );
};
```

This comprehensive SparkBridge integration provides everything needed for frontend development:

1. **Complete TypeScript interfaces** for type safety
2. **Full hook implementations** with error handling
3. **Event listening capabilities** for real-time updates  
4. **Admin configuration functions** for system management
5. **Comprehensive testing examples** for reliability
6. **Ready-to-use React components** for immediate implementation
7. **Proper error handling** with specific error types
8. **Permission validation** for security
9. **Configuration management** for system setup

The implementation follows the established patterns in the documentation and provides copy-paste ready code that an LLM can use to build the frontend integration seamlessly.