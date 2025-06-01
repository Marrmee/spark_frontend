# Module 01: Authentication & NDA System Implementation

## 📋 Overview & Objectives

The Authentication & NDA System is the foundation module for the entire Spark platform. It implements NDA-based access control, content encryption/decryption, and secure key management. All other modules depend on this system for secure content access.

### **Key Responsibilities**
- NDA attestation verification and management
- Content encryption/decryption pipeline
- Access control enforcement
- Secure key distribution
- User authentication flow integration

---

## 🔐 Access Control Architecture

### **NDA-Based Access Levels**
```typescript
// Access control hierarchy based on NDA attestations
export enum NDAAthestationLevel {
  NONE = 'none',
  PLATFORM_NDA = 'platform_nda',
  IDEATOR_TERMS = 'ideator_terms',
  IDEA_SPECIFIC_NDA = 'idea_specific_nda',
  BOTH_PLATFORM = 'both_platform'  // Platform NDA + Ideator Terms
}

export interface AccessControlRule {
  level: NDAAthestationLevel;
  description: string;
  grantedAccess: string[];
  requirement: string;
}

export const ACCESS_CONTROL_RULES: Record<NDAAthestationLevel, AccessControlRule> = {
  [NDAAthestationLevel.NONE]: {
    level: NDAAthestationLevel.NONE,
    description: 'No NDA attestation',
    grantedAccess: ['Public content only'],
    requirement: 'Wallet connection'
  },
  [NDAAthestationLevel.PLATFORM_NDA]: {
    level: NDAAthestationLevel.PLATFORM_NDA,
    description: 'Platform NDA signed',
    grantedAccess: ['Platform features'],
    requirement: 'attestationVault.hasAttestedToPlatformNda()'
  },
  [NDAAthestationLevel.IDEATOR_TERMS]: {
    level: NDAAthestationLevel.IDEATOR_TERMS,
    description: 'Ideator Terms signed',
    grantedAccess: ['Idea submission'],
    requirement: 'attestationVault.hasAttestedToIdeatorTerms()'
  },
  [NDAAthestationLevel.BOTH_PLATFORM]: {
    level: NDAAthestationLevel.BOTH_PLATFORM,
    description: 'Both platform agreements signed',
    grantedAccess: ['Draft ideas access', 'Idea submission', 'Full platform features'],
    requirement: 'attestationVault.hasAttestedToBothPlatformAgreementTypes()'
  },
  [NDAAthestationLevel.IDEA_SPECIFIC_NDA]: {
    level: NDAAthestationLevel.IDEA_SPECIFIC_NDA,
    description: 'Idea-specific NDA signed',
    grantedAccess: ['Specific idea content (Pending/Approved/Rejected)'],
    requirement: 'attestationVault.hasUserAttestedToIdeaNda(userAddress, ideaId)'
  }
};
```

---

## 🔧 Network Configuration Integration

### **Contract Address Management**
```typescript
// hooks/useNetworkInfo.ts - Access contract addresses from serverConfig.ts
import { getNetworkInfo } from '@/utils/serverConfig';

export const useNetworkInfo = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  const loadNetworkInfo = async () => {
    try {
      const info = await getNetworkInfo();
      setNetworkInfo(info);
    } catch (error) {
      console.error('Failed to load network info:', error);
    } finally {
      setLoading(false);
    }
  };

  return { networkInfo, loading };
};

// hooks/useAttestationVault.ts - Use addresses from serverConfig.ts
export const useAttestationVault = () => {
  const { networkInfo } = useNetworkInfo();
  const { signer, provider } = useWalletContext();
  const [attestationVault, setAttestationVault] = useState(null);

  useEffect(() => {
    if (networkInfo?.attestationVault && (signer || provider)) {
      initializeContract();
    }
  }, [networkInfo, signer, provider]);

  const initializeContract = async () => {
    try {
      const contract = new ethers.Contract(
        networkInfo.attestationVault,
        ATTESTATION_VAULT_ABI,
        signer || provider
      );
      setAttestationVault(contract);
    } catch (error) {
      console.error('Failed to initialize AttestationVault:', error);
    }
  };

  const checkAccessLevel = async (
    userAddress: string, 
    level: NDAAthestationLevel, 
    ideaId?: string
  ): Promise<boolean> => {
    if (!attestationVault) return false;

    try {
      switch (level) {
        case NDAAthestationLevel.PLATFORM_NDA:
          return await attestationVault.hasAttestedToPlatformNda(userAddress);
        
        case NDAAthestationLevel.IDEATOR_TERMS:
          return await attestationVault.hasAttestedToIdeatorTerms(userAddress);
        
        case NDAAthestationLevel.BOTH_PLATFORM:
          return await attestationVault.hasAttestedToBothPlatformAgreementTypes(userAddress);
        
        case NDAAthestationLevel.IDEA_SPECIFIC_NDA:
          if (!ideaId) return false;
          return await attestationVault.hasUserAttestedToIdeaNda(userAddress, ideaId);
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to check access level ${level}:`, error);
      return false;
    }
  };

  return {
    attestationVault,
    checkAccessLevel,
    contractAddress: networkInfo?.attestationVault
  };
};
```

---

## 🔧 Core Components Architecture

### **Component Structure**
```
src/app/components/spark/auth/
├── AccessGate.tsx              # Main access control wrapper
├── NDASignature/
│   ├── PlatformNDASignature.tsx    # Platform NDA signing
│   ├── IdeatorTermsSignature.tsx   # Ideator terms signing
│   ├── IdeaNDASignature.tsx        # Idea-specific NDA signing
│   └── NDAAgreementModal.tsx       # Generic NDA signing modal
├── AccessControl/
│   ├── AccessRequiredPrompt.tsx    # Shows required attestation
│   ├── AttestationStatus.tsx       # User's current attestation status
│   ├── AccessLevelIndicator.tsx    # Visual access level indicator
│   └── UnauthorizedAccess.tsx      # Unauthorized access screen
├── Encryption/
│   ├── EncryptionProvider.tsx      # Encryption context provider
│   ├── DecryptionGate.tsx          # Content decryption wrapper
│   ├── EncryptionStatus.tsx        # Shows encryption/decryption status
│   └── KeyManagement.tsx           # Key management interface
└── Integration/
    ├── WalletNDAIntegration.tsx    # Wallet + NDA integration
    ├── SessionManager.tsx          # Manage user session with attestations
    └── AccessControlProvider.tsx   # Global access control context
```

---

## 🔑 Core Access Control Components

### **1. AccessGate - Main Access Control Wrapper**

```typescript
// AccessGate.tsx - Core access control component
interface AccessGateProps {
  children: React.ReactNode;
  requiredAccess: NDAAthestationLevel | NDAAthestationLevel[];
  ideaId?: string;
  fallback?: React.ReactNode;
  showPrompt?: boolean;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  children,
  requiredAccess,
  ideaId,
  fallback,
  showPrompt = true
}) => {
  const { address } = useWalletContext();
  const { checkAccessLevel } = useAttestationVault();
  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    requiredLevel?: NDAAthestationLevel;
    loading: boolean;
  }>({
    hasAccess: false,
    loading: true
  });

  useEffect(() => {
    verifyAccess();
  }, [address, requiredAccess, ideaId]);

  const verifyAccess = async () => {
    if (!address) {
      setAccessStatus({ hasAccess: false, loading: false });
      return;
    }

    try {
      const requiredLevels = Array.isArray(requiredAccess) ? requiredAccess : [requiredAccess];
      
      for (const level of requiredLevels) {
        const hasLevel = await checkAccessLevel(address, level, ideaId);
        if (hasLevel) {
          setAccessStatus({ hasAccess: true, loading: false });
          return;
        }
      }

      // Find the first required level the user doesn't have
      const missingLevel = requiredLevels[0];
      setAccessStatus({ 
        hasAccess: false, 
        requiredLevel: missingLevel,
        loading: false 
      });

    } catch (error) {
      console.error('Access verification failed:', error);
      setAccessStatus({ hasAccess: false, loading: false });
    }
  };

  if (accessStatus.loading) {
    return <AccessVerificationLoader />;
  }

  if (!accessStatus.hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showPrompt && accessStatus.requiredLevel) {
      return (
        <AccessRequiredPrompt
          requiredLevel={accessStatus.requiredLevel}
          ideaId={ideaId}
          onSuccess={verifyAccess}
        />
      );
    }

    return <UnauthorizedAccess requiredAccess={requiredAccess} />;
  }

  return <>{children}</>;
};
```

### **2. Network-Aware NDA Signature Component**

```typescript
// NDASignature/PlatformNDASignature.tsx
export const PlatformNDASignature: React.FC<{
  onSuccess?: () => void;
  onCancel?: () => void;
}> = ({ onSuccess, onCancel }) => {
  const { address } = useWalletContext();
  const { networkInfo } = useNetworkInfo();
  const { attestationVault } = useAttestationVault();
  const [isSigning, setIsSigning] = useState(false);
  const [ndaContent, setNdaContent] = useState('');

  useEffect(() => {
    loadNDAContent();
  }, []);

  const loadNDAContent = async () => {
    try {
      // Load NDA content from IPFS or API
      const content = await fetchPlatformNDAContent();
      setNdaContent(content);
    } catch (error) {
      console.error('Failed to load NDA content:', error);
    }
  };

  const handleSignature = async () => {
    if (!attestationVault || !networkInfo) {
      console.error('Contract not initialized or network info missing');
      return;
    }

    setIsSigning(true);
    try {
      // Call AttestationVault contract using address from serverConfig.ts
      const tx = await attestationVault.attestToPlatformNda();
      
      await handleTransaction(tx, {
        pending: 'Signing Platform NDA...',
        success: 'Platform NDA signed successfully!',
        error: 'Failed to sign Platform NDA'
      });

      onSuccess?.();
    } catch (error) {
      handleError(error, 'Platform NDA signature');
    } finally {
      setIsSigning(false);
    }
  };

  if (!networkInfo?.attestationVault) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <span>AttestationVault contract address not configured. Please check network settings.</span>
      </Alert>
    );
  }

  return (
    <div className="platform-nda-signature">
      <div className="nda-header">
        <h2>Platform Non-Disclosure Agreement</h2>
        <p className="text-gray-600">
          Please review and sign the platform NDA to access Spark features.
        </p>
      </div>

      <div className="nda-content">
        <div className="nda-text">
          {ndaContent || 'Loading NDA content...'}
        </div>
      </div>

      <div className="contract-info">
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <div>
            <strong>Contract Information:</strong>
            <p>AttestationVault: {networkInfo.attestationVault}</p>
            <p>Network: {networkInfo.chainId}</p>
          </div>
        </Alert>
      </div>

      <div className="signature-actions">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSignature}
          disabled={isSigning || !ndaContent}
          loading={isSigning}
        >
          Sign Platform NDA
        </Button>
      </div>
    </div>
  );
};
```

### **3. Network Info Provider Context**

```typescript
// contexts/NetworkInfoContext.tsx
interface NetworkInfoContextValue {
  networkInfo: any | null;
  loading: boolean;
  error: string | null;
  refreshNetworkInfo: () => Promise<void>;
}

const NetworkInfoContext = createContext<NetworkInfoContextValue | undefined>(undefined);

export const NetworkInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNetworkInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Import serverConfig.ts dynamically to get network info
      const { getNetworkInfo } = await import('@/utils/serverConfig');
      const info = await getNetworkInfo();
      
      // Validate required contract addresses for Spark
      const requiredAddresses = [
        'attestationVault',
        'sparkIdeaRegistry', 
        'governorResearch',
        'sparkIpNft'
      ];
      
      const missingAddresses = requiredAddresses.filter(addr => !info[addr]);
      if (missingAddresses.length > 0) {
        throw new Error(`Missing contract addresses: ${missingAddresses.join(', ')}`);
      }
      
      setNetworkInfo(info);
    } catch (err) {
      console.error('Failed to load network info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load network configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  const refreshNetworkInfo = async () => {
    await loadNetworkInfo();
  };

  return (
    <NetworkInfoContext.Provider value={{
      networkInfo,
      loading,
      error,
      refreshNetworkInfo
    }}>
      {children}
    </NetworkInfoContext.Provider>
  );
};

export const useNetworkInfo = () => {
  const context = useContext(NetworkInfoContext);
  if (context === undefined) {
    throw new Error('useNetworkInfo must be used within a NetworkInfoProvider');
  }
  return context;
};
```

Remember: This module is the security foundation for the entire Spark platform. Every component must properly verify NDA attestations and use contract addresses from `serverConfig.ts` before granting content access. 