# Spark Smart Contracts Frontend Implementation Guide for LLMs

## 🚨 CRITICAL IMPLEMENTATION REQUIREMENTS

### **ABSOLUTE RULES - NO EXCEPTIONS**
1. **USE EXISTING CODEBASE**: You MUST leverage all existing infrastructure, components, and patterns from the current PoSciDonDAO frontend
2. **MAINTAIN CURRENT STYLE**: Follow the exact design patterns, component structure, and coding conventions already established
3. **NO REINVENTION**: Do not create new utilities, components, or patterns if equivalent ones already exist
4. **INTEGRATE, DON'T REPLACE**: Extend the existing navigation and routing system rather than creating separate applications

---

## 📁 Project Context & Existing Infrastructure

### **Frontend Location**
```
/Users/marcohuberts/Library/Mobile Documents/com~apple~CloudDocs/Documents/Blockchain/PoSciDonDAO/dApp/poscidondao_frontend/
```

### **Contract Location (THIS REPOSITORY)**
```
/Users/marcohuberts/Library/Mobile Documents/com~apple~CloudDocs/Documents/Blockchain/PoSciDonDAO/dApp/poscidondao_contracts/
```

### **Existing Infrastructure to REUSE**
- ✅ **WalletContext** - Use existing Web3 wallet integration
- ✅ **Design System** - Leverage existing UI components (buttons, cards, modals, forms)
- ✅ **Contract Utilities** - Follow existing contract interaction patterns
- ✅ **Navigation System** - Extend existing nav structure
- ✅ **State Management** - Use established state patterns
- ✅ **Styling Approach** - Maintain current CSS/styling methodology

---

## 🔐 Spark Access Control & Encryption Flow

### **CRITICAL: NDA-Based Access Control System**

**The Spark system uses NDA attestations, NOT role-based access control for viewing ideas**

#### **Access Control Hierarchy**
```typescript
// Access levels based on NDA attestations, not roles
const ACCESS_LEVELS = {
  IDEATOR: {
    description: 'Original idea creator',
    access: 'Full access to own ideas at all stages',
    requirement: 'Must attest to Platform NDA + Ideator Terms'
  },
  PLATFORM_NDA_ATTESTED: {
    description: 'Users who signed platform-level NDAs',
    access: 'Can view Draft ideas from any ideator',
    requirement: 'attestationVault.hasAttestedToBothPlatformAgreementTypes()'
  },
  IDEA_SPECIFIC_NDA_ATTESTED: {
    description: 'Users who signed idea-specific NDAs',
    access: 'Can view Pending/Approved/Rejected ideas',
    requirement: 'attestationVault.hasUserAttestedToIdeaNda(userAddress, ideaId)'
  },
  REVIEWER_ROLE: {
    description: 'Technical reviewers',
    access: 'Can VOTE on ideas (but viewing still requires NDA attestation)',
    requirement: 'hasRole(REVIEWER_ROLE, userAddress) + appropriate NDA attestation'
  }
};
```

#### **Encryption & Data Flow**
```typescript
// CRITICAL: Ideas are encrypted OFF-CHAIN before IPFS upload
const SPARK_DATA_FLOW = {
  SUBMISSION: {
    step1: 'Ideator encrypts idea content off-chain using symmetric encryption',
    step2: 'Encrypted content uploaded to IPFS',
    step3: 'IPFS hash submitted to SparkIdeaRegistry contract',
    step4: 'Contract stores IPFS hash + metadata on-chain'
  },
  ACCESS: {
    step1: 'User requests idea details via getIdea(ideaId)',
    step2: 'Contract checks NDA attestation status',
    step3: 'If authorized, contract returns IPFS hash + metadata',
    step4: 'Frontend fetches encrypted content from IPFS',
    step5: 'Frontend decrypts content using appropriate keys (off-chain)'
  },
  KEY_MANAGEMENT: {
    note: 'Encryption keys must be managed off-chain',
    implementation: 'Frontend needs secure key distribution system',
    access: 'Keys distributed based on NDA attestation status'
  }
};
```

---

## 🎯 Spark Contract Ecosystem

### **Core Smart Contracts (DEPLOYED)**
```typescript
const SPARK_CONTRACTS = {
  // Core Registry & Governance
  sparkIdeaRegistry: '0x1f3474D7a0a83b8eBdf544FE8EaA64BA5f4725eD',
  governorResearch: '0x965BAd9a732A5F817c81604657a8A9B4c54A7D19',
  sparkBridge: '0x54559a3DDf30a2fdECfCD4cF9A201305F05abD08',
  
  // IP-NFT & Licensing System
  sparkIpNft: '0x71474Ba393e2189CADbf8256FB196CAB36470c53',
  copyleftIpPool: '0x5aAc191fF483781AF11290F8D33A0587c76C4bee',
  licenseNft: '0x[DEPLOYED_ADDRESS]',
  licenseSciLocker: '0x[DEPLOYED_ADDRESS]',
  
  // Executor Contracts
  mintIpNft: '0x2E6e33D89953c1323Bfd5776666c566b65bF00c3',
  fundAndMintIpNft: '0xc8DE74F46DfC70Ecd59c66975CBaAb86d91a87D9',
  actionCloneFactoryResearch: '0xeD8181d7D14cBa402A3F773D18580392693C77cF',
  
  // Attestation & Compliance (CRITICAL FOR ACCESS CONTROL)
  attestationVault: '0x[DEPLOYED_ADDRESS]'
};
```

### **Contract Responsibilities & Access Control**
1. **SparkIdeaRegistry**: Stores IPFS hashes + metadata, enforces NDA-based access
2. **AttestationVault**: Manages NDA signatures and attestation verification
3. **GovernorResearch**: Due Diligence governance voting (requires reviewer role + NDA)
4. **SparkBridge**: Connects ideas to governance proposals  
5. **SparkIPNFT**: IP-NFT minting and metadata
6. **CopyleftIPPool**: IP-NFT ownership and licensing
7. **MintIPNFT/FundAndMintIPNFT**: Governance execution actions

---

## 🔧 Implementation Strategy

### **Phase 1: NDA Attestation Infrastructure**

#### **1.1 Attestation Contract Integration**
```typescript
// Add to existing src/app/utils/serverConfig.ts
export const SPARK_CONTRACTS = {
  sparkIdeaRegistry: process.env.NEXT_PUBLIC_SPARK_IDEA_REGISTRY || '0x1f3474D7a0a83b8eBdf544FE8EaA64BA5f4725eD',
  attestationVault: process.env.NEXT_PUBLIC_ATTESTATION_VAULT || '0x[DEPLOYED_ADDRESS]',
  // ... other addresses
};
```

#### **1.2 NDA Attestation Hooks (CRITICAL FOR ACCESS)**
```typescript
// src/app/hooks/spark/useAttestationVault.ts
export const useAttestationVault = () => {
  const { signer, address } = useWalletContext();
  
  // Check platform-level NDA attestation (for Draft ideas)
  const hasPlatformNDAAttestation = async (userAddress: string) => {
    // attestationVault.hasAttestedToBothPlatformAgreementTypes(userAddress)
  };
  
  // Check idea-specific NDA attestation (for Pending/Approved ideas)
  const hasIdeaNDAAttestation = async (userAddress: string, ideaId: string) => {
    // attestationVault.hasUserAttestedToIdeaNda(userAddress, ideaId)
  };
  
  // Sign platform NDA
  const signPlatformNDA = async () => {
    // Implementation for platform NDA signing
  };
  
  // Sign idea-specific NDA
  const signIdeaNDA = async (ideaId: string) => {
    // Implementation for idea-specific NDA signing
  };
  
  return {
    hasPlatformNDAAttestation,
    hasIdeaNDAAttestation,
    signPlatformNDA,
    signIdeaNDA
  };
};
```

#### **1.3 Encryption/Decryption Service (OFF-CHAIN)**
```typescript
// src/app/services/sparkEncryption.ts
export class SparkEncryptionService {
  // Encrypt idea content before IPFS upload
  static async encryptIdeaContent(content: string, ideaId: string): Promise<string> {
    // Implement symmetric encryption
    // Key derivation based on ideaId + user credentials
    // Return encrypted content for IPFS upload
  }
  
  // Decrypt idea content after IPFS fetch (requires proper access)
  static async decryptIdeaContent(encryptedContent: string, ideaId: string, userAddress: string): Promise<string> {
    // Verify user has NDA attestation
    // Retrieve appropriate decryption key
    // Decrypt and return content
  }
  
  // Key management for NDA-attested users
  static async getDecryptionKey(ideaId: string, userAddress: string): Promise<string> {
    // Verify NDA attestation status
    // Return appropriate key based on access level
  }
}
```

### **Phase 2: Navigation Extension with Access Control**

#### **2.1 Extend Existing Navigation**
```typescript
// Add to existing navigation structure
const navigationItems = [
  // ... existing items
  {
    name: 'Spark Research',
    icon: BeakerIcon,
    subItems: [
      { name: 'Submit Idea', href: '/spark/submit', requiresAttestation: 'platform' },
      { name: 'Browse Ideas', href: '/spark/browse', requiresAttestation: 'dynamic' },
      { name: 'My Research', href: '/spark/my-ideas', requiresAttestation: 'platform' },
      { name: 'Governance', href: '/spark/governance', requiresAttestation: 'reviewer' },
      { name: 'IP-NFT Portfolio', href: '/spark/portfolio', requiresAttestation: 'platform' }
    ]
  }
];
```

#### **2.2 Component Structure with Access Control**
```
src/app/components/spark/          # NEW: Spark-specific components
├── Attestation/                  # CRITICAL: NDA Management
│   ├── PlatformNDASignature.tsx  # Platform-level NDA signing
│   ├── IdeaNDASignature.tsx      # Idea-specific NDA signing
│   ├── AttestationStatus.tsx     # Show user's attestation status
│   └── AccessGate.tsx            # Gatekeeper component for protected content
├── IdeaSubmission/
│   ├── IdeaForm.tsx              # Use existing form patterns + encryption
│   ├── EncryptedFileUpload.tsx   # Extend existing upload with encryption
│   └── SubmissionReview.tsx      # Use existing review patterns
├── IdeaBrowser/
│   ├── IdeaList.tsx              # Mirror existing proposal list + access control
│   ├── ProtectedIdeaCard.tsx     # Idea cards with access control
│   ├── IdeaFilters.tsx           # Extend existing filter patterns
│   └── AccessRestrictedView.tsx  # Show when NDA required
├── Governance/
│   ├── ProposalList.tsx          # REUSE existing proposal components
│   ├── ReviewerVotingInterface.tsx # ADAPT existing voting UI (reviewer + NDA required)
│   └── ProposalCreation.tsx      # EXTEND existing creation flow
├── Encryption/
│   ├── EncryptionStatus.tsx      # Show encryption/decryption status
│   ├── KeyManagement.tsx         # Manage encryption keys
│   └── DecryptionGate.tsx        # Handle content decryption
└── Common/
    ├── SparkLayout.tsx           # EXTEND existing layout
    ├── NDAAwareStatusBadge.tsx   # Status badges aware of access control
    └── ProtectedActionButtons.tsx # Buttons that check attestation status
```

---

## 🎨 User Interface Requirements with Access Control

### **MANDATORY: NDA-Aware Component Patterns**

#### **Protected Content Components**
```typescript
// ✅ CORRECT: Access-controlled content viewing
const ProtectedIdeaContent = ({ ideaId, children }) => {
  const { hasRequiredAttestation } = useAttestationVault();
  const [canAccess, setCanAccess] = useState(false);
  const [needsNDA, setNeedsNDA] = useState('');
  
  useEffect(() => {
    checkAccessRights(ideaId);
  }, [ideaId]);
  
  if (!canAccess) {
    return <NDAAgreementRequired ndaType={needsNDA} ideaId={ideaId} />;
  }
  
  return <DecryptedContentViewer>{children}</DecryptedContentViewer>;
};
```

#### **User Flow Integration with NDA Gates**

#### **Research Workflow with Access Control**
1. **Onboarding**: Platform NDA signature during user registration
2. **Idea Browsing**: 
   - Draft ideas: Require platform NDA attestation
   - Pending/Approved ideas: Require idea-specific NDA attestation
3. **Idea Submission**: Platform NDA required + content encryption
4. **Review Process**: Reviewer role + appropriate NDA attestation
5. **Content Access**: Dynamic NDA verification + content decryption

---

## 📋 Core Features Implementation with Access Control

### **Feature 1: NDA-Gated Idea Access System**

#### **Required Components (CRITICAL IMPLEMENTATION)**
```typescript
// AccessControlledIdeaViewer.tsx
const AccessControlledIdeaViewer = ({ ideaId }) => {
  const { address } = useWalletContext();
  const { checkAccessLevel, signRequiredNDA } = useAttestationVault();
  const [accessLevel, setAccessLevel] = useState(null);
  const [ideaContent, setIdeaContent] = useState(null);
  
  const loadIdeaContent = async () => {
    try {
      // 1. Check NDA attestation status
      const hasAccess = await checkAccessLevel(address, ideaId);
      
      if (!hasAccess.canView) {
        setAccessLevel(hasAccess.requiredNDAType);
        return;
      }
      
      // 2. Fetch IPFS hash from contract
      const idea = await sparkIdeaRegistry.getIdea(ideaId);
      
      // 3. Fetch encrypted content from IPFS
      const encryptedContent = await fetchFromIPFS(idea.ipfsHash);
      
      // 4. Decrypt content using appropriate key
      const decryptedContent = await SparkEncryptionService.decryptIdeaContent(
        encryptedContent, 
        ideaId, 
        address
      );
      
      setIdeaContent(decryptedContent);
      
    } catch (error) {
      // Handle NDA-related errors appropriately
      if (error.message.includes('NdaNotSigned')) {
        setAccessLevel(extractRequiredNDAType(error));
      }
    }
  };
  
  if (accessLevel) {
    return <NDASignatureRequired ndaType={accessLevel} ideaId={ideaId} />;
  }
  
  if (!ideaContent) {
    return <DecryptionLoader />;
  }
  
  return <DecryptedIdeaDisplay content={ideaContent} />;
};
```

### **Feature 2: Encrypted Idea Submission**

#### **Submission with Encryption (Follow Existing Pattern)**
```typescript
// EncryptedIdeaSubmissionForm.tsx
const EncryptedIdeaSubmissionForm = () => {
  const { signer, address } = useWalletContext();
  const { hasPlatformNDAAttestation } = useAttestationVault();
  const { submitIdea } = useSparkIdeaRegistry();
  
  const handleSubmit = async (ideaData) => {
    // 1. Verify platform NDA attestation
    const hasAttestation = await hasPlatformNDAAttestation(address);
    if (!hasAttestation) {
      throw new Error('Platform NDA attestation required');
    }
    
    // 2. Encrypt idea content
    const encryptedContent = await SparkEncryptionService.encryptIdeaContent(
      ideaData.content,
      generateIdeaId(ideaData, address)
    );
    
    // 3. Upload encrypted content to IPFS
    const ipfsHash = await uploadToIPFS(encryptedContent);
    
    // 4. Submit IPFS hash to contract
    const ideaId = await submitIdea(ipfsHash);
    
    return ideaId;
  };
  
  // Use existing form validation patterns with encryption awareness
};
```

### **Feature 3: Reviewer Dashboard with Dual Requirements**

#### **Voting Interface (Reviewer Role + NDA Required)**
```typescript
// ReviewerVotingInterface.tsx - Requires BOTH reviewer role AND NDA attestation
const ReviewerVotingInterface = ({ ideaId }) => {
  const { hasRole } = useAccessControl();
  const { hasIdeaNDAAttestation } = useAttestationVault();
  const [canVote, setCanVote] = useState(false);
  const [needsNDA, setNeedsNDA] = useState(false);
  const [needsRole, setNeedsRole] = useState(false);
  
  useEffect(() => {
    checkVotingEligibility();
  }, [ideaId]);
  
  const checkVotingEligibility = async () => {
    const hasReviewerRole = await hasRole('REVIEWER_ROLE', address);
    const hasNDA = await hasIdeaNDAAttestation(address, ideaId);
    
    setNeedsRole(!hasReviewerRole);
    setNeedsNDA(!hasNDA);
    setCanVote(hasReviewerRole && hasNDA);
  };
  
  if (needsRole) {
    return <ReviewerRoleRequired />;
  }
  
  if (needsNDA) {
    return <IdeaNDASignatureRequired ideaId={ideaId} />;
  }
  
  // REUSE existing voting interface when authorized
  return <ExistingVotingInterface ideaId={ideaId} contractType="GovernorResearch" />;
};
```

---

## ⚡ Technical Implementation Guidelines

### **1. Access Control Contract Interaction**

#### **NDA-Aware Hook Patterns**
```typescript
// useSparkIdeaRegistry.ts with access control
export const useSparkIdeaRegistry = () => {
  const { signer, address } = useWalletContext();
  const { checkAccessLevel } = useAttestationVault();
  
  const getIdea = async (ideaId: string) => {
    try {
      // This will revert if user doesn't have required NDA attestation
      const idea = await sparkIdeaRegistryContract.getIdea(ideaId);
      return idea;
    } catch (error) {
      if (error.message.includes('NdaNotSigned')) {
        // Extract required NDA type from error message
        const requiredNDAType = extractNDARequirement(error.message);
        throw new NDAAthestationRequiredError(requiredNDAType, ideaId);
      }
      throw error;
    }
  };
  
  const getAccessibleIdeas = async () => {
    // Get all idea IDs
    const allIdeaIds = await sparkIdeaRegistryContract.getAllIdeaIds();
    
    // Filter based on user's attestation status
    const accessibleIdeas = [];
    for (const ideaId of allIdeaIds) {
      try {
        const idea = await getIdea(ideaId);
        accessibleIdeas.push(idea);
      } catch (error) {
        if (error instanceof NDAAthestationRequiredError) {
          // Include in list but mark as requiring NDA
          accessibleIdeas.push({
            ideaId,
            requiresNDA: error.requiredNDAType,
            accessible: false
          });
        }
      }
    }
    
    return accessibleIdeas;
  };
  
  return { getIdea, getAccessibleIdeas };
};
```

### **2. Encryption Key Management**

#### **Secure Key Distribution (CRITICAL SECURITY)**
```typescript
// keyManagement.ts
export class SparkKeyManager {
  // Keys distributed based on NDA attestation status
  static async getIdeaAccessKey(ideaId: string, userAddress: string): Promise<string> {
    // 1. Verify NDA attestation on-chain
    const attestationStatus = await verifyNDAAttestation(userAddress, ideaId);
    
    if (!attestationStatus.hasRequiredAttestation) {
      throw new Error(`NDA attestation required: ${attestationStatus.requiredType}`);
    }
    
    // 2. Retrieve key from secure key distribution service
    // Implementation depends on chosen key management solution
    return await retrieveDecryptionKey(ideaId, userAddress, attestationStatus);
  }
  
  // Key derivation for idea creators
  static async generateIdeaKey(ideaId: string, creatorAddress: string): Promise<string> {
    // Generate deterministic key for idea creator
    // Store encrypted version for authorized users
  }
}
```

### **3. Error Handling for Access Control**

#### **NDA-Specific Error Types**
```typescript
// sparkErrors.ts
export class NDAAthestationRequiredError extends Error {
  constructor(public requiredNDAType: string, public ideaId: string) {
    super(`NDA attestation required: ${requiredNDAType} for idea ${ideaId}`);
  }
}

export class DecryptionKeyNotFoundError extends Error {
  constructor(ideaId: string) {
    super(`Decryption key not available for idea ${ideaId}`);
  }
}

// Use existing error handling utilities but extend for NDA cases
import { handleContractError } from '../existing/utils';

export const handleSparkError = (error: Error) => {
  if (error instanceof NDAAthestationRequiredError) {
    // Redirect to NDA signing flow
    return redirectToNDASignature(error.requiredNDAType, error.ideaId);
  }
  
  if (error instanceof DecryptionKeyNotFoundError) {
    // Show key access error
    return showKeyAccessError(error.message);
  }
  
  // Fall back to existing error handling
  return handleContractError(error);
};
```

---

## 🔐 Security Considerations

### **Critical Security Requirements**

1. **Encryption Keys**: Never store decryption keys in browser localStorage or sessionStorage
2. **NDA Verification**: Always verify NDA attestation on-chain before key distribution
3. **Content Protection**: Encrypted content should never be cached in decrypted form
4. **Access Logs**: Log all access attempts for audit purposes
5. **Key Rotation**: Implement key rotation for long-term security

### **Implementation Security Checklist**
- [ ] NDA attestation verified before any content access
- [ ] Encryption keys securely managed and distributed
- [ ] Decrypted content cleared from memory after viewing
- [ ] Access control enforced at multiple layers (contract + frontend)
- [ ] Audit logs for all NDA signature and content access events

---

## ✅ Implementation Checklist

### **Phase 1: Access Control Foundation**
- [ ] Implement AttestationVault integration hooks
- [ ] Create NDA signature components using existing patterns
- [ ] Build access control gating components
- [ ] Implement encryption/decryption service layer

### **Phase 2: Protected Content Features**
- [ ] Build NDA-gated idea submission flow
- [ ] Create access-controlled idea browser
- [ ] Implement encrypted content viewer
- [ ] Add reviewer voting with dual requirements (role + NDA)

### **Phase 3: Advanced Security Features**
- [ ] Implement secure key management system
- [ ] Add access audit logging
- [ ] Create NDA status dashboard
- [ ] Build content access analytics

### **Phase 4: Integration & Testing**
- [ ] Test all NDA attestation flows
- [ ] Verify encryption/decryption pipeline
- [ ] Conduct security audit of access controls
- [ ] Test cross-platform navigation with access gates

---

## 🎯 Success Criteria

### **Security & Access Control**
- All idea content properly encrypted before IPFS storage
- NDA attestation verification enforced at all access points
- Decryption keys securely managed and distributed
- No unauthorized access to protected content

### **User Experience**
- Seamless NDA signing flow integrated with existing patterns
- Clear indication of access requirements for each piece of content
- Smooth transition between different access levels
- Intuitive understanding of attestation status

### **Technical Excellence**
- Zero regression in existing functionality
- Secure implementation of encryption/decryption pipeline
- Robust access control enforcement
- Comprehensive audit logging

Remember: The Spark system's security relies entirely on proper NDA attestation verification and content encryption. Every component must respect these access controls while maintaining the seamless user experience of the existing PoSciDonDAO platform.