# Module 06: IP-NFT System Implementation

## 📋 Overview & Objectives

The IP-NFT System module handles the conversion of approved research ideas into intellectual property NFTs, enabling researchers to monetize their innovations through the Spark platform. This module integrates with existing IP-NFT infrastructure and licensing systems.

### **Key Responsibilities**
- IP-NFT minting for approved ideas
- **Period-based licensing and monetization workflows**
- **Configurable licensing terms management**
- Royalty distribution and tracking
- Integration with existing IP-NFT contracts
- Patent application coordination
- **Batch expired license processing with PO token rewards**

---

## 🎯 IP-NFT Architecture

### **Integration with Contract Addresses from networkInfo**
```typescript
// 🚨 MANDATORY: Use networkInfo for all contract addresses
import { useNetworkInfo } from '@/hooks/useNetworkInfo';

export const useIPNFTContractAddresses = () => {
  const { networkInfo, loading, error } = useNetworkInfo();
  
  return {
    // Core IP-NFT System - deployed on Base Sepolia
    sparkIpNft: networkInfo?.sparkIpNft,
    copyleftIpPool: networkInfo?.copyleftIpPool,
    
    // Minting Executors
    mintIpNft: networkInfo?.mintIpNft,
    fundAndMintIpNft: networkInfo?.fundAndMintIpNft,
    
    // **NEW: Licensing Infrastructure**
    licenseNft: networkInfo?.licenseNft,
    licenseSciLocker: networkInfo?.licenseSciLocker,
    poToken: networkInfo?.poToken,
    sciToken: networkInfo?.sciToken,
    usdcToken: networkInfo?.usdcToken,
    
    // Network info
    chainId: networkInfo?.chainId,
    explorerLink: networkInfo?.explorerLink,
    
    loading,
    error
  };
};

// IP-NFT lifecycle states
export enum IPNFTStatus {
  ELIGIBLE = 'eligible',           // Idea approved, can mint IP-NFT
  MINTING = 'minting',            // IP-NFT minting in progress
  MINTED = 'minted',              // IP-NFT successfully created
  LICENSED = 'licensed',          // IP-NFT has active licenses
  COMMERCIALIZED = 'commercialized' // IP-NFT generating revenue
}

// **NEW: Period-based licensing system**
interface LicenseTerms {
  feePerPeriodUSD: bigint;     // Fee in USD per period (6 decimals for USDC)
  periodLengthInDays: number;  // Length of one period in days
  sciAmountToLock: bigint;     // Fixed amount of SCI to be locked (18 decimals)
  termsSet: boolean;           // Whether terms have been configured
}

interface LicenseTermsLimits {
  minFeePerPeriodUSD: bigint;      // e.g., 100 USDC (100e6)
  maxFeePerPeriodUSD: bigint;      // e.g., 10,000,000 USDC (10000000e6)
  minPeriodLengthInDays: number;   // e.g., 30 days
  maxPeriodLengthInDays: number;   // e.g., 3650 days (10 years)
  minSciAmountToLock: bigint;      // e.g., 1,000 SCI (1000e18)
  maxSciAmountToLock: bigint;      // e.g., 10,000,000 SCI (10000000e18)
}

interface SparkIPNFT {
  ideaId: string;
  tokenId: string;
  owner: string;
  mintTimestamp: number;
  ipfsMetadata: string;
  copyleftPool?: string;
  totalRoyalties: bigint;
  licenseCount: number;
  status: IPNFTStatus;
  // **NEW: Enhanced metadata**
  patentIdentifier?: string;
  researchAgreementURI?: string;
  licenseTerms?: LicenseTerms;
}
```

---

## 🎨 Component Architecture

### **Component Structure**
```
src/app/components/spark/ip-nft/
├── Minting/
│   ├── IPNFTMintingInterface.tsx   # Main minting workflow
│   ├── MintingEligibility.tsx      # Check idea eligibility
│   ├── MetadataPreparation.tsx     # Prepare IP-NFT metadata
│   ├── MintingOptions.tsx          # Standard vs Copyleft minting
│   └── MintingConfirmation.tsx     # Post-minting success
├── Licensing/
│   ├── LicensingDashboard.tsx      # Manage IP-NFT licenses
│   ├── **LicenseTermsManager.tsx**     # **NEW: Configure licensing terms**
│   ├── **LicenseTermsLimitsConfig.tsx** # **NEW: Global limits configuration**
│   ├── LicenseCreation.tsx         # Create new licenses
│   ├── LicenseMarketplace.tsx      # Browse available licenses
│   ├── **PeriodBasedLicensing.tsx**    # **NEW: Period-based license interface**
│   └── LicenseRevenue.tsx          # Track licensing revenue
├── **BatchProcessing/**               # **NEW: Batch processing section**
│   ├── **BatchProcessingDashboard.tsx** # **Manage expired license processing**
│   ├── **ExpiredLicenseProcessor.tsx**  # **Process expired licenses**
│   ├── **POTokenRewardTracker.tsx**     # **Track PO token rewards**
│   └── **ProcessingAnalytics.tsx**     # **Analytics for batch processing**
├── Portfolio/
│   ├── IPNFTPortfolio.tsx          # User's IP-NFT collection
│   ├── IPNFTCard.tsx               # Individual IP-NFT display
│   ├── RevenueTracking.tsx         # Revenue analytics
│   ├── LicenseManagement.tsx       # Manage issued licenses
│   └── PatentIntegration.tsx       # Patent application status
├── **Admin/**                         # **NEW: Admin management section**
│   ├── **IPNFTAdminDashboard.tsx**     # **Admin management interface**
│   ├── **ContractAddressManager.tsx**  # **Manage contract addresses**
│   ├── **CircuitBreakerControls.tsx**  # **Emergency pause/unpause**
│   ├── **AdminTransferWorkflow.tsx**   # **Two-step admin transfer**
│   └── **LicenseTermsGlobalConfig.tsx** # **Global licensing configuration**
├── Marketplace/
│   ├── IPNFTMarketplace.tsx        # Browse/buy IP-NFTs
│   ├── IPNFTListing.tsx            # List IP-NFT for sale
│   ├── IPNFTAuction.tsx            # Auction mechanisms
│   └── IPNFTTransfer.tsx           # Transfer ownership
└── Shared/
    ├── IPNFTViewer.tsx             # Display IP-NFT details
    ├── RoyaltyCalculator.tsx       # Calculate royalty payments
    ├── LicenseValidator.tsx        # Validate license terms
    └── RevenueChart.tsx            # Revenue visualization
```

---

## 🔧 **NEW: Enhanced IP-NFT Components**

### **1. License Terms Manager**

```typescript
// Licensing/LicenseTermsManager.tsx
import { useSparkIPNFT } from '@/hooks/useSparkIPNFT';
import { useState, useEffect } from 'react';
import { parseEther, formatEther, parseUnits, formatUnits } from 'ethers';

interface LicenseTermsManagerProps {
  ipNftId: string;
  currentTerms?: LicenseTerms;
  onTermsUpdated: () => void;
}

export const LicenseTermsManager: React.FC<LicenseTermsManagerProps> = ({
  ipNftId,
  currentTerms,
  onTermsUpdated
}) => {
  const { setIpNftLicenseTerms, licenseTermsLimits, loading } = useSparkIPNFT();
  const [formData, setFormData] = useState({
    feePerPeriodUSD: '',
    periodLengthInDays: '',
    sciAmountToLock: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentTerms) {
      setFormData({
        feePerPeriodUSD: formatUnits(currentTerms.feePerPeriodUSD, 6), // USDC has 6 decimals
        periodLengthInDays: currentTerms.periodLengthInDays.toString(),
        sciAmountToLock: formatEther(currentTerms.sciAmountToLock) // SCI has 18 decimals
      });
    }
  }, [currentTerms]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!licenseTermsLimits) {
      newErrors.general = 'License terms limits not loaded';
      setErrors(newErrors);
      return false;
    }

    // Validate fee
    const feeUSD = parseFloat(formData.feePerPeriodUSD);
    const minFeeUSD = parseFloat(formatUnits(licenseTermsLimits.minFeePerPeriodUSD, 6));
    const maxFeeUSD = parseFloat(formatUnits(licenseTermsLimits.maxFeePerPeriodUSD, 6));
    
    if (feeUSD < minFeeUSD || feeUSD > maxFeeUSD) {
      newErrors.feePerPeriodUSD = `Fee must be between $${minFeeUSD} and $${maxFeeUSD}`;
    }

    // Validate period length
    const periodDays = parseInt(formData.periodLengthInDays);
    if (periodDays < licenseTermsLimits.minPeriodLengthInDays || 
        periodDays > licenseTermsLimits.maxPeriodLengthInDays) {
      newErrors.periodLengthInDays = `Period must be between ${licenseTermsLimits.minPeriodLengthInDays} and ${licenseTermsLimits.maxPeriodLengthInDays} days`;
    }

    // Validate SCI amount
    const sciAmount = parseFloat(formData.sciAmountToLock);
    const minSCI = parseFloat(formatEther(licenseTermsLimits.minSciAmountToLock));
    const maxSCI = parseFloat(formatEther(licenseTermsLimits.maxSciAmountToLock));
    
    if (sciAmount < minSCI || sciAmount > maxSCI) {
      newErrors.sciAmountToLock = `SCI amount must be between ${minSCI} and ${maxSCI} SCI`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await setIpNftLicenseTerms(
        ipNftId,
        parseUnits(formData.feePerPeriodUSD, 6), // Convert to USDC units
        parseInt(formData.periodLengthInDays),
        parseEther(formData.sciAmountToLock) // Convert to SCI units
      );

      showSuccessNotification('License terms updated successfully!');
      onTermsUpdated();
    } catch (error) {
      handleError(error, 'Setting license terms');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="license-terms-manager">
      <div className="manager-header">
        <h3>Configure License Terms</h3>
        <p className="text-gray-600">
          Set the licensing terms for IP-NFT #{ipNftId}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="terms-form">
        <div className="form-grid">
          <FormField
            label="Fee per Period (USD)"
            type="number"
            step="0.01"
            min="0"
            value={formData.feePerPeriodUSD}
            onChange={(value) => setFormData(prev => ({ ...prev, feePerPeriodUSD: value }))}
            error={errors.feePerPeriodUSD}
            placeholder="100.00"
            required
          />

          <FormField
            label="Period Length (Days)"
            type="number"
            min="1"
            value={formData.periodLengthInDays}
            onChange={(value) => setFormData(prev => ({ ...prev, periodLengthInDays: value }))}
            error={errors.periodLengthInDays}
            placeholder="30"
            required
          />

          <FormField
            label="SCI Amount to Lock"
            type="number"
            step="0.000000000000000001"
            min="0"
            value={formData.sciAmountToLock}
            onChange={(value) => setFormData(prev => ({ ...prev, sciAmountToLock: value }))}
            error={errors.sciAmountToLock}
            placeholder="1000.0"
            required
          />
        </div>

        {errors.general && (
          <Alert variant="error">
            {errors.general}
          </Alert>
        )}

        {licenseTermsLimits && (
          <div className="limits-info">
            <h4>Current Limits</h4>
            <div className="limits-grid">
              <div>Fee Range: ${formatUnits(licenseTermsLimits.minFeePerPeriodUSD, 6)} - ${formatUnits(licenseTermsLimits.maxFeePerPeriodUSD, 6)}</div>
              <div>Period Range: {licenseTermsLimits.minPeriodLengthInDays} - {licenseTermsLimits.maxPeriodLengthInDays} days</div>
              <div>SCI Range: {formatEther(licenseTermsLimits.minSciAmountToLock)} - {formatEther(licenseTermsLimits.maxSciAmountToLock)} SCI</div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            loading={isSubmitting}
          >
            {currentTerms ? 'Update License Terms' : 'Set License Terms'}
          </Button>
        </div>
      </form>
    </div>
  );
};
```

### **2. Period-Based Licensing Interface**

```typescript
// Licensing/PeriodBasedLicensing.tsx
interface PeriodBasedLicensingProps {
  ipNftId: string;
  licenseTerms: LicenseTerms;
  onLicenseRequested: (licenseId: string) => void;
}

export const PeriodBasedLicensing: React.FC<PeriodBasedLicensingProps> = ({
  ipNftId,
  licenseTerms,
  onLicenseRequested
}) => {
  const { requestLicense } = useSparkIPNFT();
  const [numberOfPeriods, setNumberOfPeriods] = useState(1);
  const [isRequesting, setIsRequesting] = useState(false);

  const calculateTotalCost = () => {
    const feePerPeriod = parseFloat(formatUnits(licenseTerms.feePerPeriodUSD, 6));
    return feePerPeriod * numberOfPeriods;
  };

  const calculateTotalDuration = () => {
    return licenseTerms.periodLengthInDays * numberOfPeriods;
  };

  const handleLicenseRequest = async () => {
    if (numberOfPeriods < 1) return;

    setIsRequesting(true);
    try {
      const result = await requestLicense(ipNftId, numberOfPeriods);
      
      showSuccessNotification(`License requested successfully! License ID: ${result.licenseId}`);
      onLicenseRequested(result.licenseId);
    } catch (error) {
      handleError(error, 'Requesting license');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="period-based-licensing">
      <div className="licensing-header">
        <h3>Request License</h3>
        <p className="text-gray-600">
          Configure your licensing period and duration
        </p>
      </div>

      <div className="license-configuration">
        <div className="period-selector">
          <label>Number of Periods</label>
          <div className="period-input-group">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNumberOfPeriods(Math.max(1, numberOfPeriods - 1))}
              disabled={numberOfPeriods <= 1}
            >
              -
            </Button>
            <input
              type="number"
              min="1"
              value={numberOfPeriods}
              onChange={(e) => setNumberOfPeriods(Math.max(1, parseInt(e.target.value) || 1))}
              className="period-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNumberOfPeriods(numberOfPeriods + 1)}
            >
              +
            </Button>
          </div>
        </div>

        <div className="license-summary">
          <div className="summary-item">
            <span className="label">Fee per Period:</span>
            <span className="value">${formatUnits(licenseTerms.feePerPeriodUSD, 6)} USDC</span>
          </div>
          <div className="summary-item">
            <span className="label">Period Length:</span>
            <span className="value">{licenseTerms.periodLengthInDays} days</span>
          </div>
          <div className="summary-item">
            <span className="label">SCI to Lock:</span>
            <span className="value">{formatEther(licenseTerms.sciAmountToLock)} SCI</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item total">
            <span className="label">Total Cost:</span>
            <span className="value">${calculateTotalCost().toFixed(2)} USDC</span>
          </div>
          <div className="summary-item total">
            <span className="label">Total Duration:</span>
            <span className="value">{calculateTotalDuration()} days</span>
          </div>
        </div>

        <div className="license-requirements">
          <h4>Requirements</h4>
          <ul>
            <li>You must have sufficient USDC balance: ${calculateTotalCost().toFixed(2)}</li>
            <li>You must have sufficient SCI balance: {formatEther(licenseTerms.sciAmountToLock)} SCI</li>
            <li>You must approve this contract to spend your USDC and SCI tokens</li>
          </ul>
        </div>

        <div className="license-actions">
          <Button
            onClick={handleLicenseRequest}
            disabled={isRequesting || numberOfPeriods < 1}
            loading={isRequesting}
            className="request-license-button"
          >
            Request License for {numberOfPeriods} Period{numberOfPeriods !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### **3. Batch Processing Dashboard**

```typescript
// BatchProcessing/BatchProcessingDashboard.tsx
export const BatchProcessingDashboard: React.FC = () => {
  const { 
    processExpiredLicensesForAddress,
    processExpiredLicensesForIpNft,
    poTokenRewardAmount,
    loading 
  } = useSparkIPNFT();
  const [processingMode, setProcessingMode] = useState<'address' | 'ipnft'>('address');
  const [targetAddress, setTargetAddress] = useState('');
  const [targetIpNftId, setTargetIpNftId] = useState('');
  const [maxProcessCount, setMaxProcessCount] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    totalRewards: 0,
    lastProcessingDate: null as Date | null
  });

  const handleBatchProcessing = async () => {
    if (processingMode === 'address' && !targetAddress) return;
    if (processingMode === 'ipnft' && !targetIpNftId) return;

    setIsProcessing(true);
    try {
      let result;
      if (processingMode === 'address') {
        result = await processExpiredLicensesForAddress(targetAddress, maxProcessCount);
      } else {
        result = await processExpiredLicensesForIpNft(targetIpNftId, maxProcessCount);
      }

      showSuccessNotification(`Processed ${result.processedCount} expired licenses. Earned ${result.rewardAmount} PO tokens.`);
      
      // Update stats
      setProcessingStats(prev => ({
        totalProcessed: prev.totalProcessed + result.processedCount,
        totalRewards: prev.totalRewards + result.rewardAmount,
        lastProcessingDate: new Date()
      }));

    } catch (error) {
      handleError(error, 'Batch processing');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="batch-processing-dashboard">
      <div className="dashboard-header">
        <h2>Batch License Processing</h2>
        <p className="text-gray-600">
          Process expired licenses and earn PO token rewards
        </p>
      </div>

      <div className="processing-stats">
        <StatCard
          title="Current Reward"
          value={`${poTokenRewardAmount} PO`}
          icon="🎁"
          description="Tokens earned per batch"
        />
        <StatCard
          title="Total Processed"
          value={processingStats.totalProcessed}
          icon="⚡"
          description="Licenses processed"
        />
        <StatCard
          title="Total Rewards"
          value={`${processingStats.totalRewards} PO`}
          icon="💰"
          description="Total tokens earned"
        />
        <StatCard
          title="Last Processing"
          value={processingStats.lastProcessingDate?.toLocaleDateString() || 'Never'}
          icon="📅"
          description="Most recent batch"
        />
      </div>

      <div className="processing-controls">
        <div className="mode-selector">
          <h3>Processing Mode</h3>
          <RadioGroup
            value={processingMode}
            onChange={setProcessingMode}
            options={[
              { value: 'address', label: 'Process by Licensee Address', description: 'Process all expired licenses for a specific address' },
              { value: 'ipnft', label: 'Process by IP-NFT', description: 'Process all expired licenses for a specific IP-NFT' }
            ]}
          />
        </div>

        <div className="target-configuration">
          {processingMode === 'address' && (
            <FormField
              label="Licensee Address"
              type="text"
              value={targetAddress}
              onChange={setTargetAddress}
              placeholder="0x..."
              required
            />
          )}

          {processingMode === 'ipnft' && (
            <FormField
              label="IP-NFT ID"
              type="number"
              value={targetIpNftId}
              onChange={setTargetIpNftId}
              placeholder="1"
              required
            />
          )}

          <FormField
            label="Max Licenses to Process"
            type="number"
            min="1"
            max="50"
            value={maxProcessCount.toString()}
            onChange={(value) => setMaxProcessCount(parseInt(value) || 10)}
            description="Maximum 50 licenses per batch for gas efficiency"
          />
        </div>

        <div className="processing-actions">
          <Button
            onClick={handleBatchProcessing}
            disabled={isProcessing || loading || 
              (processingMode === 'address' && !targetAddress) ||
              (processingMode === 'ipnft' && !targetIpNftId)}
            loading={isProcessing}
            className="process-button"
          >
            Process Expired Licenses
          </Button>
        </div>
      </div>

      <div className="processing-info">
        <Alert variant="info">
          <div>
            <strong>How Batch Processing Works:</strong>
            <ul className="mt-2 list-disc list-inside">
              <li>Only expired licenses are processed (with safety buffer)</li>
              <li>Earn {poTokenRewardAmount} PO tokens per successful batch</li>
              <li>Maximum {maxProcessCount} licenses processed per transaction</li>
              <li>Gas costs are optimized for batch operations</li>
            </ul>
          </div>
        </Alert>
      </div>
    </div>
  );
};
```

---

## 🧪 Testing Guidelines

### **IP-NFT System Testing**

```typescript
// __tests__/components/IPNFTMintingInterface.test.tsx
describe('IPNFTMintingInterface', () => {
  beforeEach(() => {
    mockUseSparkContracts.mockReturnValue({
      sparkIpNft: mockSparkIpNft,
      mintIpNft: mockMintIpNft,
      copyleftIpPool: mockCopyleftIpPool
    });
  });

  test('checks minting eligibility correctly', async () => {
    const approvedIdea = {
      ideaId: 'test-idea',
      approvalStatus: 'Approved',
      ideator: '0x123'
    };

    render(<IPNFTMintingInterface ideaId="test-idea" ideaData={approvedIdea} />);
    
    await waitFor(() => {
      expect(screen.getByText('Mint IP-NFT')).toBeInTheDocument();
    });
  });

  test('prevents minting for non-approved ideas', async () => {
    const pendingIdea = {
      ideaId: 'test-idea',
      approvalStatus: 'Pending',
      ideator: '0x123'
    };

    render(<IPNFTMintingInterface ideaId="test-idea" ideaData={pendingIdea} />);
    
    await waitFor(() => {
      expect(screen.getByText('Not Eligible for IP-NFT Minting')).toBeInTheDocument();
    });
  });
});
```

---

## ✅ Implementation Checklist

### **Core IP-NFT Features**
- [ ] IP-NFT minting interface with eligibility checks
- [ ] Standard vs Copyleft minting options
- [ ] Metadata preparation and IPFS upload
- [ ] Integration with existing IP-NFT contracts

### **Portfolio Management**
- [ ] IP-NFT portfolio dashboard
- [ ] Revenue tracking and analytics
- [ ] License management interface
- [ ] Transfer and sale functionality

### **Licensing System**
- [ ] License creation and terms definition
- [ ] License marketplace integration
- [ ] Royalty distribution system
- [ ] License compliance tracking

### **Integration Features**
- [ ] Patent application coordination
- [ ] Revenue analytics and reporting
- [ ] Cross-platform license compatibility
- [ ] Legal compliance tools

Remember: This module handles valuable intellectual property assets. Ensure robust security, clear ownership tracking, and compliance with legal requirements. 