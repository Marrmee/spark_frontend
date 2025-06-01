# Spark Platform - Module 01: Authentication & NDA System

## 🔐 Overview

Module 01 provides comprehensive NDA-based access control for the Spark platform. It implements a 5-tier access control hierarchy based on on-chain attestations, ensuring secure content protection while maintaining excellent user experience.

## ✅ Implementation Status

**Module 01 is now fully implemented** with the following components:

### **Core Infrastructure ✅**
- ✅ **Access Control Types** (`types/access-control.ts`)
- ✅ **Access Rules Engine** (`utils/access-rules.ts`)
- ✅ **AttestationVault Integration** (`hooks/useAttestationVault.ts`)

### **Main Components ✅**
- ✅ **AccessGate** - Main access control wrapper
- ✅ **AccessRequiredPrompt** - Interactive NDA signing prompt
- ✅ **UnauthorizedAccess** - Clear access denial screen
- ✅ **AccessVerificationLoader** - Loading state component

### **NDA Signature Components ✅**
- ✅ **PlatformNDASignature** - Platform NDA signing modal
- ✅ **IdeatorTermsSignature** - Ideator terms signing modal
- ✅ **IdeaNDASignature** - Idea-specific NDA with DocuSign

### **Integration ✅**
- ✅ **NetworkInfoContext Extension** - Added Spark contract addresses
- ✅ **Existing Context Integration** - WalletContext, NotificationContext
- ✅ **Design System Consistency** - Matches existing PoSciDonDAO patterns

## 🎯 Access Control Hierarchy

### **5-Tier NDA Attestation Levels**

| Level | Description | Access Granted | Contract Method |
|-------|-------------|----------------|-----------------|
| `NONE` | No attestation | Public content only | N/A |
| `PLATFORM_NDA` | Platform NDA signed | Basic platform features | `hasAttestedToPlatformNda()` |
| `IDEATOR_TERMS` | Ideator terms signed | Idea submission rights | `hasAttestedToIdeatorTerms()` |
| `BOTH_PLATFORM` | Both platform agreements | Full platform access | `hasAttestedToBothPlatformAgreementTypes()` |
| `IDEA_SPECIFIC_NDA` | Idea-specific NDA | Confidential idea content | `hasUserAttestedToIdeaNda(userAddress, ideaId)` |

## 🚀 Quick Start

### **1. Basic Usage**

```typescript
import { AccessGate, NDAAthestationLevel } from '@/app/components/spark/auth';

// Protect content with Platform NDA
<AccessGate requiredAccess={NDAAthestationLevel.PLATFORM_NDA}>
  <div>This content requires Platform NDA</div>
</AccessGate>

// Protect idea-specific content
<AccessGate 
  requiredAccess={NDAAthestationLevel.IDEA_SPECIFIC_NDA}
  ideaId="12345"
>
  <div>Confidential idea content</div>
</AccessGate>
```

### **2. Multiple Access Levels**

```typescript
// Allow access with either Platform NDA OR Ideator Terms
<AccessGate 
  requiredAccess={[
    NDAAthestationLevel.PLATFORM_NDA,
    NDAAthestationLevel.IDEATOR_TERMS
  ]}
>
  <div>Flexible access content</div>
</AccessGate>
```

### **3. Using the AttestationVault Hook**

```typescript
import { useAttestationVault } from '@/app/components/spark/auth';

const MyComponent = () => {
  const { 
    checkAccessLevel, 
    attestToPlatformNda,
    getUserAttestationLevels,
    isContractReady 
  } = useAttestationVault();

  const handleSignPlatformNDA = async () => {
    const transaction = await attestToPlatformNda();
    if (transaction?.status === 'confirmed') {
      console.log('Platform NDA signed successfully!');
    }
  };
};
```

## 📁 Component Architecture

```
src/app/components/spark/auth/
├── AccessGate.tsx                      # Main access control wrapper
├── index.ts                           # Public API exports
├── README.md                          # This documentation
├── types/
│   └── access-control.ts              # TypeScript type definitions
├── utils/
│   └── access-rules.ts                # Access control rules and utilities
├── hooks/
│   └── useAttestationVault.ts         # AttestationVault contract integration
├── components/
│   ├── AccessControl/
│   │   ├── AccessRequiredPrompt.tsx   # Interactive signing prompt
│   │   ├── UnauthorizedAccess.tsx     # Access denial screen
│   │   └── AccessVerificationLoader.tsx # Loading state
│   └── NDASignature/
│       ├── PlatformNDASignature.tsx   # Platform NDA modal
│       ├── IdeatorTermsSignature.tsx  # Ideator terms modal
│       └── IdeaNDASignature.tsx       # Idea-specific NDA + DocuSign
└── examples/
    └── AccessGateExample.tsx          # Usage demonstrations
```

## 🔗 Contract Integration

### **AttestationVault Contract Methods**

All attestations are verified through the AttestationVault contract deployed on Base Sepolia:

```typescript
// Contract address is automatically loaded from serverConfig.ts
const contractAddress = '0x2f1B9630A3eA96091DE7FE995c34b8C29C606A18';

// Available methods:
- hasAttestedToPlatformNda(userAddress: string): Promise<boolean>
- hasAttestedToIdeatorTerms(userAddress: string): Promise<boolean>
- hasAttestedToBothPlatformAgreementTypes(userAddress: string): Promise<boolean>
- hasUserAttestedToIdeaNda(userAddress: string, ideaId: string): Promise<boolean>
- attestToPlatformNda(): Promise<Transaction>
- attestToIdeatorTerms(): Promise<Transaction>
- attestToIdeaNda(ideaId: string, signature: string): Promise<Transaction>
```

### **Network Configuration**

Contract addresses are automatically loaded from `serverConfig.ts` via the `NetworkInfoContext`:

```typescript
// Extended NetworkInfoType to include Spark contracts
export type NetworkInfoType = {
  // ... existing fields
  attestationVault: `0x${string}`;
  sparkIdeaRegistry: `0x${string}`;
  sparkBridge: `0x${string}`;
  sparkIpNft: `0x${string}`;
  // ... other Spark contracts
};
```

## 🎨 Design Integration

### **Consistent with Existing Platform**
- ✅ Uses existing color palette and typography
- ✅ Follows established modal and button patterns
- ✅ Integrates with existing notification system
- ✅ Matches loading and error state designs

### **Responsive Design**
- ✅ Mobile-first approach
- ✅ Works on all screen sizes
- ✅ Accessible keyboard navigation
- ✅ WCAG 2.1 compliant

## 🔒 Security Features

### **On-Chain Verification**
- All attestations verified via smart contract calls
- No client-side attestation spoofing possible
- Immutable record of user agreements

### **Content Protection**
- Content hidden until proper attestation verified
- Clear error messages for unauthorized access
- Graceful fallbacks for network issues

### **DocuSign Integration**
- Legal-grade signatures for idea-specific NDAs
- Enhanced security for sensitive content
- Audit trail for all agreements

## 🧪 Testing & Examples

### **View Live Examples**

```typescript
import { AccessGateExample } from '@/app/components/spark/auth';

// Render the example component to see all access levels in action
<AccessGateExample />
```

### **Common Use Cases**

```typescript
// 1. Protect platform features
<AccessGate requiredAccess={NDAAthestationLevel.PLATFORM_NDA}>
  <PlatformFeatures />
</AccessGate>

// 2. Protect idea submission
<AccessGate requiredAccess={NDAAthestationLevel.IDEATOR_TERMS}>
  <IdeaSubmissionForm />
</AccessGate>

// 3. Protect confidential idea content
<AccessGate 
  requiredAccess={NDAAthestationLevel.IDEA_SPECIFIC_NDA}
  ideaId={ideaId}
>
  <ConfidentialIdeaDetails />
</AccessGate>

// 4. Custom fallback content
<AccessGate 
  requiredAccess={NDAAthestationLevel.BOTH_PLATFORM}
  fallback={<PublicTeaser />}
  showPrompt={false}
>
  <PremiumContent />
</AccessGate>
```

## ⚙️ Configuration

### **Environment Variables**
No additional environment variables required. The module uses existing wallet and network configuration.

### **Contract Deployment**
Contracts are already deployed on Base Sepolia. Addresses are configured in `serverConfig.ts`.

## 🚀 Next Steps

With Module 01 complete, you can now:

1. **Integrate with existing pages** - Add AccessGate wrappers to protect content
2. **Implement Module 02** - Contract Integration for advanced blockchain features
3. **Implement Module 03** - Idea Management with NDA-protected submissions
4. **Test thoroughly** - Verify all access levels work correctly

## 📞 Support

This module follows all established patterns from the PoSciDonDAO frontend:
- Uses existing `WalletContext` for wallet management
- Integrates with `NetworkInfoContext` for contract addresses
- Leverages `NotificationContext` for user feedback
- Follows existing error handling patterns

For questions or issues, refer to the existing codebase patterns or the module-specific documentation files. 