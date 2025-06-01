# Module 07: Admin Dashboard Implementation

## 📋 Overview & Objectives

The Admin Dashboard provides comprehensive platform management capabilities for Spark administrators. This module enables management of reviewers, system configuration, NDA oversight, and platform analytics.

### **Key Responsibilities**
- Reviewer role management (grant/revoke)
- System configuration (thresholds, licenses, contracts)
- NDA hash registration for ideas
- Platform monitoring and analytics
- Emergency controls and maintenance

---

## 🔑 Admin Functions from Smart Contract

### **SparkIdeaRegistry Admin Functions**
```solidity
// Reviewer Management
function grantReviewerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE)
function revokeReviewerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE)
function setReviewerApprovalThresholdPercent(uint256 _thresholdPercent) external onlyRole(DEFAULT_ADMIN_ROLE)

// License Management
function setCopyleftLicenseURI(string memory _copyleftLicenseURI) external onlyRole(DEFAULT_ADMIN_ROLE)
function setIdeaLicenseURI(bytes32 ideaId, string memory _licenseURI) external onlyRole(DEFAULT_ADMIN_ROLE)

// System Configuration
function setAttestationVaultAddress(address _newAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
function setIdeaNdaHash(bytes32 ideaId, bytes32 ndaHash) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### **NEW: SparkIPNFT Admin Functions**
```solidity
// Licensing Terms Management
function setLicenseTermsLimits(
    uint256 _minFeePerPeriodUSD,
    uint256 _maxFeePerPeriodUSD,
    uint256 _minPeriodLengthInDays,
    uint256 _maxPeriodLengthInDays,
    uint256 _minSciAmountToLock,
    uint256 _maxSciAmountToLock
) external onlyRole(LICENSE_ADMIN_ROLE)

function setIpNftLicenseTerms(
    uint256 ipNftId,
    uint256 feePerPeriodUSD_,
    uint256 periodLengthInDays_,
    uint256 sciAmountToLock_
) external onlyRole(LICENSE_ADMIN_ROLE)

// Admin Transfer (Two-step process)
function transferAdmin(address newAdminAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
function acceptAdmin() external

// Circuit Breaker
function pause(string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE)
function unpause() external onlyRole(DEFAULT_ADMIN_ROLE)

// Contract Address Management
function setSciTokenAddress(address _newAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
function setUsdcTokenAddress(address _newAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
function setLicenseSciLockerAddress(address _newAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
function setPoTokenAddress(address _newAddress) external onlyRole(DEFAULT_ADMIN_ROLE)
function setLicenseNFTContract(address _licenseNftAddress) external onlyRole(LICENSE_ADMIN_ROLE)

// Batch Processing & Rewards
function setLicenseProcessingReward(uint256 _newAmount) external onlyRole(DEFAULT_ADMIN_ROLE)
function setExpiryBufferTime(uint256 _newBufferTime) external onlyRole(DEFAULT_ADMIN_ROLE)
function setPOTokenContract(address _poTokenAddress) external onlyRole(LICENSE_ADMIN_ROLE)

// Metadata Management
function updatePatentIdentifier(uint256 tokenId, string memory newPatentIdentifier) external onlyRole(LICENSE_ADMIN_ROLE)
function updateResearchAgreementURI(uint256 tokenId, string memory newResearchAgreementURI) external onlyRole(LICENSE_ADMIN_ROLE)
```

---

## 🎨 Component Architecture

### **Dashboard Layout Structure**
```typescript
// AdminDashboard.tsx - Main dashboard layout
const AdminDashboard = () => {
  const { hasRole } = useAccessControl();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Verify admin role
  const isAdmin = hasRole('DEFAULT_ADMIN_ROLE');
  
  if (!isAdmin) {
    return <UnauthorizedAccess requiredRole="Admin" />;
  }
  
  return (
    <AdminLayout>
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <AdminContent section={activeSection} />
    </AdminLayout>
  );
};
```

### **Component Breakdown**
```
src/app/components/spark/admin/
├── AdminDashboard.tsx          # Main dashboard component
├── AdminLayout.tsx             # Dashboard layout wrapper
├── AdminSidebar.tsx            # Navigation sidebar
├── sections/
│   ├── OverviewSection.tsx     # Platform overview & key metrics
│   ├── ReviewerManagement.tsx  # Reviewer role management
│   ├── SystemConfig.tsx        # Platform configuration
│   ├── NDAManagement.tsx       # NDA hash management
│   ├── IdeaManagement.tsx      # Idea oversight and intervention
│   ├── IPNFTAdminSection.tsx    # NEW: IP-NFT administration
│   ├── LicensingManagement.tsx  # NEW: Licensing terms management
│   ├── EmergencyControls.tsx    # NEW: Circuit breaker & emergency actions
│   ├── ContractManagement.tsx   # NEW: Contract address management
│   ├── AnalyticsSection.tsx    # Platform analytics and reporting
│   └── AdminTransferSection.tsx # NEW: Admin role transfer
├── components/
│   ├── ReviewerCard.tsx        # Individual reviewer management
│   ├── ConfigPanel.tsx         # Configuration setting panel
│   ├── LicenseTermsPanel.tsx    # NEW: License terms configuration
│   ├── CircuitBreakerPanel.tsx  # NEW: Emergency controls
│   ├── ContractAddressPanel.tsx # NEW: Contract address management
│   ├── MetricCard.tsx          # Key metric display
│   ├── ActivityFeed.tsx        # Recent platform activity
│   ├── SystemHealth.tsx        # System status indicators
│   └── AdminActions.tsx        # Quick action buttons
└── modals/
    ├── AddReviewerModal.tsx    # Add new reviewer
    ├── RemoveReviewerModal.tsx # Remove reviewer confirmation
    ├── ConfigChangeModal.tsx   # Configuration change confirmation
    ├── LicenseTermsModal.tsx    # NEW: License terms configuration
    ├── AdminTransferModal.tsx   # NEW: Admin transfer confirmation
    ├── EmergencyPauseModal.tsx   # NEW: Emergency pause confirmation
    └── ContractUpdateModal.tsx   # NEW: Contract address update
```

---

## 🔧 **NEW: Enhanced Admin Functions Implementation**

### **1. IP-NFT Administration Section**

```typescript
// sections/IPNFTAdminSection.tsx
import { useSparkIPNFTAdmin } from '@/hooks/useSparkIPNFTAdmin';
import { useState, useEffect } from 'react';

export const IPNFTAdminSection = () => {
  const {
    licenseTermsLimits,
    getAllIPNFTs,
    paused,
    pendingAdmin,
    admin,
    loading
  } = useSparkIPNFTAdmin();
  
  const [ipNfts, setIpNfts] = useState([]);
  const [stats, setStats] = useState({
    totalIPNFTs: 0,
    ipNftsWithTerms: 0,
    activeLicenses: 0,
    totalRevenue: BigInt(0)
  });

  useEffect(() => {
    loadIPNFTData();
  }, []);

  const loadIPNFTData = async () => {
    try {
      const nfts = await getAllIPNFTs();
      setIpNfts(nfts);
      
      // Calculate statistics
      const stats = {
        totalIPNFTs: nfts.length,
        ipNftsWithTerms: nfts.filter(nft => nft.licenseTerms?.termsSet).length,
        activeLicenses: nfts.reduce((sum, nft) => sum + (nft.activeLicenseCount || 0), 0),
        totalRevenue: nfts.reduce((sum, nft) => sum + (nft.totalRevenue || BigInt(0)), BigInt(0))
      };
      setStats(stats);
    } catch (error) {
      handleError(error, 'Loading IP-NFT data');
    }
  };

  return (
    <AdminSection title="IP-NFT Administration">
      <div className="ipnft-admin-overview">
        <div className="admin-stats-grid">
          <StatCard
            title="Total IP-NFTs"
            value={stats.totalIPNFTs}
            icon="🎨"
            description="Minted IP-NFTs"
          />
          <StatCard
            title="Configured Terms"
            value={`${stats.ipNftsWithTerms}/${stats.totalIPNFTs}`}
            icon="⚙️"
            description="IP-NFTs with license terms"
          />
          <StatCard
            title="Active Licenses"
            value={stats.activeLicenses}
            icon="📄"
            description="Currently active licenses"
          />
          <StatCard
            title="Total Revenue"
            value={`${formatEther(stats.totalRevenue)} USDC`}
            icon="💰"
            description="Revenue from licensing"
          />
        </div>

        <div className="contract-status">
          <ContractStatusIndicator
            title="Contract Status"
            paused={paused}
            admin={admin}
            pendingAdmin={pendingAdmin}
          />
        </div>
      </div>

      <div className="ipnft-management-tabs">
        <TabNavigation
          tabs={[
            { id: 'licensing', label: 'Licensing Management', icon: '📋' },
            { id: 'emergency', label: 'Emergency Controls', icon: '🚨' },
            { id: 'contracts', label: 'Contract Management', icon: '🔗' },
            { id: 'transfer', label: 'Admin Transfer', icon: '👑' }
          ]}
        />
      </div>

      <div className="admin-content-panels">
        <LicensingManagementPanel 
          ipNfts={ipNfts}
          licenseTermsLimits={licenseTermsLimits}
          onUpdate={loadIPNFTData}
        />
        <EmergencyControlsPanel
          paused={paused}
          onUpdate={loadIPNFTData}
        />
        <ContractManagementPanel
          onUpdate={loadIPNFTData}
        />
        <AdminTransferPanel
          currentAdmin={admin}
          pendingAdmin={pendingAdmin}
          onUpdate={loadIPNFTData}
        />
      </div>
    </AdminSection>
  );
};
```

### **2. Licensing Management Panel**

```typescript
// components/LicenseTermsPanel.tsx
interface LicensingManagementPanelProps {
  ipNfts: any[];
  licenseTermsLimits: LicenseTermsLimits;
  onUpdate: () => void;
}

export const LicensingManagementPanel: React.FC<LicensingManagementPanelProps> = ({
  ipNfts,
  licenseTermsLimits,
  onUpdate
}) => {
  const { 
    setLicenseTermsLimits,
    setIpNftLicenseTerms 
  } = useSparkIPNFTAdmin();
  
  const [selectedAction, setSelectedAction] = useState<'limits' | 'individual' | null>(null);
  const [selectedIPNFT, setSelectedIPNFT] = useState<string>('');

  return (
    <div className="licensing-management-panel">
      <div className="panel-header">
        <h3>Licensing Management</h3>
        <p className="text-gray-600">
          Configure global licensing limits and individual IP-NFT terms
        </p>
      </div>

      <div className="management-actions">
        <div className="action-cards">
          <ActionCard
            title="Global Licensing Limits"
            description="Set platform-wide limits for license terms"
            icon="🌐"
            onClick={() => setSelectedAction('limits')}
            status={licenseTermsLimits ? 'configured' : 'not-configured'}
          />
          
          <ActionCard
            title="Individual IP-NFT Terms"
            description="Configure licensing terms for specific IP-NFTs"
            icon="🎯"
            onClick={() => setSelectedAction('individual')}
            status="available"
          />
        </div>
      </div>

      {selectedAction === 'limits' && (
        <LicenseTermsLimitsConfig
          currentLimits={licenseTermsLimits}
          onUpdate={onUpdate}
          onClose={() => setSelectedAction(null)}
        />
      )}

      {selectedAction === 'individual' && (
        <IndividualTermsConfig
          ipNfts={ipNfts}
          selectedIPNFT={selectedIPNFT}
          onIPNFTSelect={setSelectedIPNFT}
          onUpdate={onUpdate}
          onClose={() => setSelectedAction(null)}
        />
      )}

      <div className="current-limits-display">
        <h4>Current Global Limits</h4>
        {licenseTermsLimits ? (
          <LimitsDisplayGrid limits={licenseTermsLimits} />
        ) : (
          <Alert variant="warning">
            Global licensing limits have not been configured yet.
          </Alert>
        )}
      </div>
    </div>
  );
};
```

### **3. Emergency Controls Panel**

```typescript
// components/CircuitBreakerPanel.tsx
interface EmergencyControlsPanelProps {
  paused: boolean;
  onUpdate: () => void;
}

export const EmergencyControlsPanel: React.FC<EmergencyControlsPanelProps> = ({
  paused,
  onUpdate
}) => {
  const { pause, unpause } = useSparkIPNFTAdmin();
  const [isToggling, setIsToggling] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  const handleEmergencyPause = async () => {
    if (!pauseReason.trim()) {
      showErrorNotification('Please provide a reason for pausing the contract');
      return;
    }

    setIsToggling(true);
    try {
      await pause(pauseReason);
      showSuccessNotification('Contract paused successfully');
      onUpdate();
    } catch (error) {
      handleError(error, 'Emergency pause');
    } finally {
      setIsToggling(false);
    }
  };

  const handleUnpause = async () => {
    setIsToggling(true);
    try {
      await unpause();
      showSuccessNotification('Contract unpaused successfully');
      onUpdate();
    } catch (error) {
      handleError(error, 'Contract unpause');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="emergency-controls-panel">
      <div className="panel-header">
        <h3>Emergency Controls</h3>
        <p className="text-gray-600">
          Circuit breaker controls for emergency situations
        </p>
      </div>

      <div className="contract-status-display">
        <div className={`status-indicator ${paused ? 'paused' : 'active'}`}>
          <div className="status-icon">
            {paused ? '⏸️' : '▶️'}
          </div>
          <div className="status-text">
            <h4>Contract Status: {paused ? 'PAUSED' : 'ACTIVE'}</h4>
            <p>
              {paused 
                ? 'All licensing operations are currently suspended'
                : 'All systems operational'
              }
            </p>
          </div>
        </div>
      </div>

      {!paused ? (
        <div className="pause-controls">
          <h4>Emergency Pause</h4>
          <p className="text-gray-600 mb-4">
            Pause all contract operations in case of emergency
          </p>
          
          <FormField
            label="Reason for Pause"
            type="textarea"
            value={pauseReason}
            onChange={setPauseReason}
            placeholder="Describe the emergency situation..."
            required
            rows={3}
          />

          <div className="pause-actions">
            <Button
              onClick={handleEmergencyPause}
              disabled={isToggling || !pauseReason.trim()}
              loading={isToggling}
              variant="destructive"
              className="pause-button"
            >
              🚨 Emergency Pause Contract
            </Button>
          </div>

          <Alert variant="warning" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <strong>Warning:</strong> Pausing will immediately stop all licensing operations.
              This action should only be used in genuine emergency situations.
            </div>
          </Alert>
        </div>
      ) : (
        <div className="unpause-controls">
          <h4>Resume Operations</h4>
          <p className="text-gray-600 mb-4">
            Resume normal contract operations
          </p>

          <div className="unpause-actions">
            <Button
              onClick={handleUnpause}
              disabled={isToggling}
              loading={isToggling}
              variant="default"
              className="unpause-button"
            >
              ▶️ Resume Contract Operations
            </Button>
          </div>

          <Alert variant="info" className="mt-4">
            <Info className="h-4 w-4" />
            <div>
              Unpausing will restore all licensing functionality.
              Ensure the emergency situation has been resolved.
            </div>
          </Alert>
        </div>
      )}
    </div>
  );
};
```

### **4. Admin Transfer Panel**

```typescript
// components/AdminTransferPanel.tsx
interface AdminTransferPanelProps {
  currentAdmin: string;
  pendingAdmin: string | null;
  onUpdate: () => void;
}

export const AdminTransferPanel: React.FC<AdminTransferPanelProps> = ({
  currentAdmin,
  pendingAdmin,
  onUpdate
}) => {
  const { transferAdmin, acceptAdmin } = useSparkIPNFTAdmin();
  const { address } = useWalletContext();
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleInitiateTransfer = async () => {
    if (!newAdminAddress || !isValidAddress(newAdminAddress)) {
      showErrorNotification('Please enter a valid Ethereum address');
      return;
    }

    setIsTransferring(true);
    try {
      await transferAdmin(newAdminAddress);
      showSuccessNotification('Admin transfer initiated. New admin must accept the role.');
      setNewAdminAddress('');
      onUpdate();
    } catch (error) {
      handleError(error, 'Admin transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAcceptAdmin = async () => {
    setIsTransferring(true);
    try {
      await acceptAdmin();
      showSuccessNotification('Admin role accepted successfully');
      onUpdate();
    } catch (error) {
      handleError(error, 'Accepting admin role');
    } finally {
      setIsTransferring(false);
    }
  };

  const isCurrentAdmin = address.toLowerCase() === currentAdmin.toLowerCase();
  const isPendingAdmin = pendingAdmin && address.toLowerCase() === pendingAdmin.toLowerCase();

  return (
    <div className="admin-transfer-panel">
      <div className="panel-header">
        <h3>Admin Role Transfer</h3>
        <p className="text-gray-600">
          Two-step secure admin role transfer process
        </p>
      </div>

      <div className="current-admin-info">
        <h4>Current Admin</h4>
        <div className="admin-display">
          <AddressDisplay address={currentAdmin} />
          {isCurrentAdmin && (
            <Badge variant="success">You</Badge>
          )}
        </div>
      </div>

      {pendingAdmin && (
        <div className="pending-admin-info">
          <h4>Pending Admin</h4>
          <div className="admin-display">
            <AddressDisplay address={pendingAdmin} />
            {isPendingAdmin && (
              <Badge variant="warning">Waiting for your acceptance</Badge>
            )}
          </div>
        </div>
      )}

      {isCurrentAdmin && !pendingAdmin && (
        <div className="transfer-initiation">
          <h4>Initiate Admin Transfer</h4>
          <p className="text-gray-600 mb-4">
            Transfer admin role to a new address. The new admin must accept the role.
          </p>

          <FormField
            label="New Admin Address"
            type="text"
            value={newAdminAddress}
            onChange={setNewAdminAddress}
            placeholder="0x..."
            required
          />

          <div className="transfer-actions">
            <Button
              onClick={handleInitiateTransfer}
              disabled={isTransferring || !newAdminAddress}
              loading={isTransferring}
              variant="default"
            >
              Initiate Transfer
            </Button>
          </div>

          <Alert variant="info" className="mt-4">
            <Info className="h-4 w-4" />
            <div>
              <strong>Two-Step Process:</strong> After initiating, the new admin must call acceptAdmin() to complete the transfer.
            </div>
          </Alert>
        </div>
      )}

      {isPendingAdmin && (
        <div className="transfer-acceptance">
          <h4>Accept Admin Role</h4>
          <p className="text-gray-600 mb-4">
            You have been nominated as the new admin. Accept the role to complete the transfer.
          </p>

          <div className="acceptance-actions">
            <Button
              onClick={handleAcceptAdmin}
              disabled={isTransferring}
              loading={isTransferring}
              variant="default"
              className="accept-button"
            >
              👑 Accept Admin Role
            </Button>
          </div>

          <Alert variant="success" className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <div>
              You are the pending admin. Accepting will grant you full admin privileges.
            </div>
          </Alert>
        </div>
      )}

      {pendingAdmin && !isPendingAdmin && !isCurrentAdmin && (
        <Alert variant="warning">
          <Clock className="h-4 w-4" />
          <div>
            Admin transfer is pending. Waiting for {formatAddress(pendingAdmin)} to accept the role.
          </div>
        </Alert>
      )}
    </div>
  );
};
```

### **5. Contract Management Panel**

```typescript
// components/ContractAddressPanel.tsx
export const ContractManagementPanel: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const {
    sciTokenAddress,
    usdcTokenAddress,
    licenseSciLockerAddress,
    poTokenAddress,
    licenseNftContractAddress,
    setSciTokenAddress,
    setUsdcTokenAddress,
    setLicenseSciLockerAddress,
    setPoTokenAddress,
    setLicenseNFTContract
  } = useSparkIPNFTAdmin();

  const [editingContract, setEditingContract] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const contractAddresses = [
    { key: 'sciToken', label: 'SCI Token', address: sciTokenAddress, updateFn: setSciTokenAddress },
    { key: 'usdcToken', label: 'USDC Token', address: usdcTokenAddress, updateFn: setUsdcTokenAddress },
    { key: 'licenseSciLocker', label: 'License SCI Locker', address: licenseSciLockerAddress, updateFn: setLicenseSciLockerAddress },
    { key: 'poToken', label: 'PO Token', address: poTokenAddress, updateFn: setPoTokenAddress },
    { key: 'licenseNft', label: 'License NFT', address: licenseNftContractAddress, updateFn: setLicenseNFTContract }
  ];

  const handleUpdateAddress = async (updateFn: Function) => {
    if (!newAddress || !isValidAddress(newAddress)) {
      showErrorNotification('Please enter a valid contract address');
      return;
    }

    setIsUpdating(true);
    try {
      await updateFn(newAddress);
      showSuccessNotification('Contract address updated successfully');
      setEditingContract(null);
      setNewAddress('');
      onUpdate();
    } catch (error) {
      handleError(error, 'Updating contract address');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="contract-management-panel">
      <div className="panel-header">
        <h3>Contract Address Management</h3>
        <p className="text-gray-600">
          Manage addresses of dependent contracts
        </p>
      </div>

      <div className="contract-addresses-list">
        {contractAddresses.map(({ key, label, address, updateFn }) => (
          <div key={key} className="contract-address-item">
            <div className="contract-info">
              <h4>{label}</h4>
              <div className="address-display">
                {editingContract === key ? (
                  <div className="edit-address-form">
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="0x..."
                      className="address-input"
                    />
                    <div className="edit-actions">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateAddress(updateFn)}
                        disabled={isUpdating}
                        loading={isUpdating}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingContract(null);
                          setNewAddress('');
                        }}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="address-view">
                    <AddressDisplay address={address || 'Not set'} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingContract(key);
                        setNewAddress(address || '');
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="contract-status">
              <ContractStatusBadge address={address} />
            </div>
          </div>
        ))}
      </div>

      <Alert variant="warning" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <div>
          <strong>Warning:</strong> Updating contract addresses will affect all licensing operations.
          Ensure the new contracts are properly deployed and configured.
        </div>
      </Alert>
    </div>
  );
};
```

---

## 🎨 Component Architecture

### **Dashboard Layout Structure**
```typescript
// AdminDashboard.tsx - Main dashboard layout
const AdminDashboard = () => {
  const { hasRole } = useAccessControl();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Verify admin role
  const isAdmin = hasRole('DEFAULT_ADMIN_ROLE');
  
  if (!isAdmin) {
    return <UnauthorizedAccess requiredRole="Admin" />;
  }
  
  return (
    <AdminLayout>
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <AdminContent section={activeSection} />
    </AdminLayout>
  );
};
```

### **Component Breakdown**
```
src/app/components/spark/admin/
├── AdminDashboard.tsx          # Main dashboard component
├── AdminLayout.tsx             # Dashboard layout wrapper
├── AdminSidebar.tsx            # Navigation sidebar
├── sections/
│   ├── OverviewSection.tsx     # Platform overview & key metrics
│   ├── ReviewerManagement.tsx  # Reviewer role management
│   ├── SystemConfig.tsx        # Platform configuration
│   ├── NDAManagement.tsx       # NDA hash management
│   ├── IdeaManagement.tsx      # Idea oversight and intervention
│   ├── IPNFTAdminSection.tsx    # NEW: IP-NFT administration
│   ├── LicensingManagement.tsx  # NEW: Licensing terms management
│   ├── EmergencyControls.tsx    # NEW: Circuit breaker & emergency actions
│   ├── ContractManagement.tsx   # NEW: Contract address management
│   ├── AnalyticsSection.tsx    # Platform analytics and reporting
│   └── AdminTransferSection.tsx # NEW: Admin role transfer
├── components/
│   ├── ReviewerCard.tsx        # Individual reviewer management
│   ├── ConfigPanel.tsx         # Configuration setting panel
│   ├── LicenseTermsPanel.tsx    # NEW: License terms configuration
│   ├── CircuitBreakerPanel.tsx  # NEW: Emergency controls
│   ├── ContractAddressPanel.tsx # NEW: Contract address management
│   ├── MetricCard.tsx          # Key metric display
│   ├── ActivityFeed.tsx        # Recent platform activity
│   ├── SystemHealth.tsx        # System status indicators
│   └── AdminActions.tsx        # Quick action buttons
└── modals/
    ├── AddReviewerModal.tsx    # Add new reviewer
    ├── RemoveReviewerModal.tsx # Remove reviewer confirmation
    ├── ConfigChangeModal.tsx   # Configuration change confirmation
    ├── LicenseTermsModal.tsx    # NEW: License terms configuration
    ├── AdminTransferModal.tsx   # NEW: Admin transfer confirmation
    ├── EmergencyPauseModal.tsx   # NEW: Emergency pause confirmation
    └── ContractUpdateModal.tsx   # NEW: Contract address update
```

---

## 🔧 Core Admin Functions Implementation

### **1. Reviewer Management**

#### **Reviewer Management Component**
```typescript
// sections/ReviewerManagement.tsx
const ReviewerManagement = () => {
  const { grantReviewerRole, revokeReviewerRole, setApprovalThreshold } = useSparkAdmin();
  const [reviewers, setReviewers] = useState([]);
  const [totalReviewers, setTotalReviewers] = useState(0);
  const [approvalThreshold, setApprovalThreshold] = useState(60);
  
  const loadReviewers = async () => {
    // Fetch all accounts with REVIEWER_ROLE
    const reviewerList = await getAccountsWithRole('REVIEWER_ROLE');
    setReviewers(reviewerList);
    setTotalReviewers(reviewerList.length);
  };
  
  const handleGrantRole = async (address: string) => {
    try {
      await grantReviewerRole(address);
      showSuccessNotification('Reviewer role granted successfully');
      loadReviewers();
    } catch (error) {
      handleAdminError(error);
    }
  };
  
  const handleRevokeRole = async (address: string) => {
    try {
      await revokeReviewerRole(address);
      showSuccessNotification('Reviewer role revoked successfully');
      loadReviewers();
    } catch (error) {
      handleAdminError(error);
    }
  };
  
  return (
    <AdminSection title="Reviewer Management">
      <ReviewerStats 
        totalReviewers={totalReviewers}
        approvalThreshold={approvalThreshold}
      />
      
      <ThresholdControl
        currentThreshold={approvalThreshold}
        onThresholdChange={setApprovalThreshold}
        onSave={() => setApprovalThreshold(approvalThreshold)}
      />
      
      <ReviewerList 
        reviewers={reviewers}
        onGrantRole={handleGrantRole}
        onRevokeRole={handleRevokeRole}
      />
    </AdminSection>
  );
};
```

#### **Reviewer Card Component**
```typescript
// components/ReviewerCard.tsx
const ReviewerCard = ({ reviewer, onRevokeRole }) => {
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
  const { getReviewerStats } = useSparkAdmin();
  
  return (
    <Card className="reviewer-card">
      <CardHeader>
        <div className="reviewer-info">
          <Avatar address={reviewer.address} />
          <div>
            <h4>{reviewer.name || truncateAddress(reviewer.address)}</h4>
            <p className="text-gray-600">{reviewer.address}</p>
          </div>
        </div>
        
        <div className="reviewer-actions">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowConfirmRevoke(true)}
          >
            Revoke Role
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="reviewer-stats">
          <StatItem label="Ideas Reviewed" value={reviewer.ideasReviewed} />
          <StatItem label="Approval Rate" value={`${reviewer.approvalRate}%`} />
          <StatItem label="Active Since" value={reviewer.activeSince} />
        </div>
      </CardContent>
      
      <RemoveReviewerModal
        isOpen={showConfirmRevoke}
        onClose={() => setShowConfirmRevoke(false)}
        reviewer={reviewer}
        onConfirm={() => onRevokeRole(reviewer.address)}
      />
    </Card>
  );
};
```

### **2. System Configuration**

#### **System Configuration Component**
```typescript
// sections/SystemConfig.tsx
const SystemConfig = () => {
  const { 
    setCopyleftLicense, 
    setAttestationVault,
    getCurrentConfig 
  } = useSparkAdmin();
  
  const [config, setConfig] = useState({
    copyleftLicenseURI: '',
    attestationVaultAddress: '',
    reviewerApprovalThreshold: 60
  });
  
  const [pendingChanges, setPendingChanges] = useState({});
  
  useEffect(() => {
    loadCurrentConfig();
  }, []);
  
  const loadCurrentConfig = async () => {
    const currentConfig = await getCurrentConfig();
    setConfig(currentConfig);
  };
  
  const handleConfigChange = (key: string, value: any) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };
  
  const applyConfigChanges = async () => {
    try {
      for (const [key, value] of Object.entries(pendingChanges)) {
        switch (key) {
          case 'copyleftLicenseURI':
            await setCopyleftLicense(value);
            break;
          case 'attestationVaultAddress':
            await setAttestationVault(value);
            break;
          case 'reviewerApprovalThreshold':
            await setApprovalThreshold(value);
            break;
        }
      }
      
      showSuccessNotification('Configuration updated successfully');
      setPendingChanges({});
      loadCurrentConfig();
    } catch (error) {
      handleAdminError(error);
    }
  };
  
  return (
    <AdminSection title="System Configuration">
      <ConfigPanel
        title="Licensing Configuration"
        description="Manage default copyleft license for all Spark ideas"
      >
        <LicenseURIInput
          value={config.copyleftLicenseURI}
          onChange={(value) => handleConfigChange('copyleftLicenseURI', value)}
          placeholder="https://creativecommons.org/licenses/..."
        />
      </ConfigPanel>
      
      <ConfigPanel
        title="Contract Configuration"
        description="Update core contract addresses"
      >
        <ContractAddressInput
          label="Attestation Vault"
          value={config.attestationVaultAddress}
          onChange={(value) => handleConfigChange('attestationVaultAddress', value)}
        />
      </ConfigPanel>
      
      <ConfigPanel
        title="Governance Configuration"
        description="Reviewer approval requirements"
      >
        <ThresholdSlider
          value={config.reviewerApprovalThreshold}
          onChange={(value) => handleConfigChange('reviewerApprovalThreshold', value)}
          min={1}
          max={100}
        />
      </ConfigPanel>
      
      {Object.keys(pendingChanges).length > 0 && (
        <PendingChangesAlert
          changes={pendingChanges}
          onApply={applyConfigChanges}
          onDiscard={() => setPendingChanges({})}
        />
      )}
    </AdminSection>
  );
};
```

### **3. NDA Management**

#### **NDA Hash Management Component**
```typescript
// sections/NDAManagement.tsx
const NDAManagement = () => {
  const { setIdeaNDAHash, getIdeasAwaitingNDA } = useSparkAdmin();
  const [awaitingNDA, setAwaitingNDA] = useState([]);
  const [selectedIdea, setSelectedIdea] = useState(null);
  
  useEffect(() => {
    loadIdeasAwaitingNDA();
  }, []);
  
  const loadIdeasAwaitingNDA = async () => {
    // Get finalized ideas without NDA hash
    const ideas = await getIdeasAwaitingNDA();
    setAwaitingNDA(ideas);
  };
  
  const handleRegisterNDAHash = async (ideaId: string, ndaHash: string) => {
    try {
      await setIdeaNDAHash(ideaId, ndaHash);
      showSuccessNotification('NDA hash registered successfully');
      loadIdeasAwaitingNDA();
    } catch (error) {
      handleAdminError(error);
    }
  };
  
  return (
    <AdminSection title="NDA Management">
      <div className="nda-overview">
        <MetricCard
          title="Ideas Awaiting NDA"
          value={awaitingNDA.length}
          trend="neutral"
        />
      </div>
      
      <div className="ideas-awaiting-nda">
        {awaitingNDA.map(idea => (
          <IdeaNDACard
            key={idea.ideaId}
            idea={idea}
            onRegisterNDA={handleRegisterNDAHash}
            onViewDetails={setSelectedIdea}
          />
        ))}
      </div>
      
      {selectedIdea && (
        <IdeaDetailsModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onRegisterNDA={handleRegisterNDAHash}
        />
      )}
    </AdminSection>
  );
};
```

### **4. Platform Overview**

#### **Overview Dashboard Component**
```typescript
// sections/OverviewSection.tsx
const OverviewSection = () => {
  const { getPlatformMetrics } = useSparkAdmin();
  const [metrics, setMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  
  useEffect(() => {
    loadPlatformData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadPlatformData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const loadPlatformData = async () => {
    const [platformMetrics, activity] = await Promise.all([
      getPlatformMetrics(),
      getRecentPlatformActivity()
    ]);
    
    setMetrics(platformMetrics);
    setRecentActivity(activity);
  };
  
  return (
    <AdminSection title="Platform Overview">
      <div className="metrics-grid">
        <MetricCard
          title="Total Ideas"
          value={metrics?.totalIdeas || 0}
          trend={metrics?.ideasTrend}
          icon="💡"
        />
        
        <MetricCard
          title="Active Reviewers"
          value={metrics?.activeReviewers || 0}
          trend={metrics?.reviewersTrend}
          icon="👥"
        />
        
        <MetricCard
          title="Pending Reviews"
          value={metrics?.pendingReviews || 0}
          trend={metrics?.reviewsTrend}
          icon="⏳"
        />
        
        <MetricCard
          title="IP-NFTs Minted"
          value={metrics?.ipNftsMinted || 0}
          trend={metrics?.nftsTrend}
          icon="🖼️"
        />
      </div>
      
      <div className="dashboard-content">
        <div className="activity-section">
          <ActivityFeed activities={recentActivity} />
        </div>
        
        <div className="system-health">
          <SystemHealth />
        </div>
      </div>
    </AdminSection>
  );
};
```

---

## 🔗 Admin Hooks Implementation

### **useSparkAdmin Hook**
```typescript
// hooks/useSparkAdmin.ts
export const useSparkAdmin = () => {
  const { address, signer } = useWalletContext();
  const { sparkIdeaRegistry } = useSparkContracts();
  const { hasRole } = useAccessControl();
  
  // Verify admin privileges
  const isAdmin = hasRole('DEFAULT_ADMIN_ROLE', address);
  
  const grantReviewerRole = async (reviewerAddress: string) => {
    if (!isAdmin) throw new Error('Admin role required');
    
    const tx = await sparkIdeaRegistry.grantReviewerRole(reviewerAddress);
    await tx.wait();
    
    return tx.hash;
  };
  
  const revokeReviewerRole = async (reviewerAddress: string) => {
    if (!isAdmin) throw new Error('Admin role required');
    
    const tx = await sparkIdeaRegistry.revokeReviewerRole(reviewerAddress);
    await tx.wait();
    
    return tx.hash;
  };
  
  const setApprovalThreshold = async (thresholdPercent: number) => {
    if (!isAdmin) throw new Error('Admin role required');
    if (thresholdPercent < 1 || thresholdPercent > 100) {
      throw new Error('Threshold must be between 1 and 100');
    }
    
    const tx = await sparkIdeaRegistry.setReviewerApprovalThresholdPercent(thresholdPercent);
    await tx.wait();
    
    return tx.hash;
  };
  
  const setCopyleftLicense = async (licenseURI: string) => {
    if (!isAdmin) throw new Error('Admin role required');
    
    const tx = await sparkIdeaRegistry.setCopyleftLicenseURI(licenseURI);
    await tx.wait();
    
    return tx.hash;
  };
  
  const setAttestationVault = async (vaultAddress: string) => {
    if (!isAdmin) throw new Error('Admin role required');
    
    const tx = await sparkIdeaRegistry.setAttestationVaultAddress(vaultAddress);
    await tx.wait();
    
    return tx.hash;
  };
  
  const setIdeaNDAHash = async (ideaId: string, ndaHash: string) => {
    if (!isAdmin) throw new Error('Admin role required');
    
    const tx = await sparkIdeaRegistry.setIdeaNdaHash(ideaId, ndaHash);
    await tx.wait();
    
    return tx.hash;
  };
  
  return {
    isAdmin,
    grantReviewerRole,
    revokeReviewerRole,
    setApprovalThreshold,
    setCopyleftLicense,
    setAttestationVault,
    setIdeaNDAHash
  };
};
```

---

## 📊 Analytics & Monitoring

### **Admin Analytics Component**
```typescript
// sections/AnalyticsSection.tsx
const AnalyticsSection = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState(null);
  
  const timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];
  
  return (
    <AdminSection title="Platform Analytics">
      <div className="analytics-controls">
        <TimeRangeSelector
          value={timeRange}
          options={timeRanges}
          onChange={setTimeRange}
        />
      </div>
      
      <div className="analytics-grid">
        <AnalyticsCard title="Idea Submissions">
          <IdeaSubmissionChart data={analyticsData?.ideaSubmissions} />
        </AnalyticsCard>
        
        <AnalyticsCard title="Review Activity">
          <ReviewActivityChart data={analyticsData?.reviewActivity} />
        </AnalyticsCard>
        
        <AnalyticsCard title="User Engagement">
          <UserEngagementChart data={analyticsData?.userEngagement} />
        </AnalyticsCard>
        
        <AnalyticsCard title="IP-NFT Performance">
          <IPNFTPerformanceChart data={analyticsData?.ipNftPerformance} />
        </AnalyticsCard>
      </div>
    </AdminSection>
  );
};
```

---

## 🚨 Emergency Controls

### **Emergency Controls Component**
```typescript
// sections/EmergencyControls.tsx
const EmergencyControls = () => {
  const { pauseContract, unpauseContract, emergencyWithdraw } = useEmergencyAdmin();
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAction, setEmergencyAction] = useState(null);
  
  const emergencyActions = [
    {
      id: 'pause',
      title: 'Pause Platform',
      description: 'Temporarily pause all platform operations',
      severity: 'warning',
      action: pauseContract
    },
    {
      id: 'unpause',
      title: 'Unpause Platform',
      description: 'Resume normal platform operations',
      severity: 'success',
      action: unpauseContract
    }
  ];
  
  const handleEmergencyAction = (action) => {
    setEmergencyAction(action);
    setShowEmergencyModal(true);
  };
  
  return (
    <AdminSection title="Emergency Controls" variant="danger">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <span>Emergency controls should only be used in critical situations</span>
      </Alert>
      
      <div className="emergency-actions">
        {emergencyActions.map(action => (
          <EmergencyActionCard
            key={action.id}
            action={action}
            onExecute={() => handleEmergencyAction(action)}
          />
        ))}
      </div>
      
      <EmergencyModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        action={emergencyAction}
        onConfirm={() => {
          emergencyAction.action();
          setShowEmergencyModal(false);
        }}
      />
    </AdminSection>
  );
};
```

---

## 🔐 Security & Access Control

### **Admin Route Protection**
```typescript
// AdminRoute.tsx - Protect admin routes
const AdminRoute = ({ children }) => {
  const { address } = useWalletContext();
  const { hasRole } = useAccessControl();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    verifyAdminAccess();
  }, [address]);
  
  const verifyAdminAccess = async () => {
    try {
      const adminRole = await hasRole('DEFAULT_ADMIN_ROLE', address);
      setIsAdmin(adminRole);
    } catch (error) {
      console.error('Admin verification failed:', error);
      setIsAdmin(false);
    } finally {
      setIsVerifying(false);
    }
  };
  
  if (isVerifying) {
    return <AdminLoadingScreen />;
  }
  
  if (!isAdmin) {
    return <AdminUnauthorized />;
  }
  
  return children;
};
```

---

## 🧪 Testing Guidelines

### **Admin Function Testing**
```typescript
// __tests__/admin/AdminDashboard.test.tsx
describe('AdminDashboard', () => {
  beforeEach(() => {
    // Mock admin role
    mockUseAccessControl.mockReturnValue({
      hasRole: jest.fn().mockReturnValue(true)
    });
  });
  
  test('renders admin dashboard for authorized users', () => {
    render(<AdminDashboard />);
    expect(screen.getByText('Platform Overview')).toBeInTheDocument();
  });
  
  test('blocks access for non-admin users', () => {
    mockUseAccessControl.mockReturnValue({
      hasRole: jest.fn().mockReturnValue(false)
    });
    
    render(<AdminDashboard />);
    expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
  });
  
  test('reviewer management functions work correctly', async () => {
    const mockGrantRole = jest.fn();
    mockUseSparkAdmin.mockReturnValue({
      grantReviewerRole: mockGrantRole
    });
    
    render(<ReviewerManagement />);
    
    fireEvent.click(screen.getByText('Grant Role'));
    await waitFor(() => {
      expect(mockGrantRole).toHaveBeenCalled();
    });
  });
});
```

---

## 🚀 Deployment & Integration

### **Admin Dashboard Routes**
```typescript
// app/spark/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <AdminRoute>
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </AdminRoute>
  );
}

// app/spark/admin/page.tsx
export default function AdminPage() {
  return <OverviewSection />;
}

// app/spark/admin/reviewers/page.tsx
export default function ReviewersPage() {
  return <ReviewerManagement />;
}
```

### **Navigation Integration**
```typescript
// Add to existing navigation
const adminNavItems = [
  {
    name: 'Admin',
    icon: ShieldIcon,
    href: '/spark/admin',
    requiresRole: 'DEFAULT_ADMIN_ROLE',
    subItems: [
      { name: 'Overview', href: '/spark/admin' },
      { name: 'Reviewers', href: '/spark/admin/reviewers' },
      { name: 'Configuration', href: '/spark/admin/config' },
      { name: 'NDA Management', href: '/spark/admin/nda' },
      { name: 'Analytics', href: '/spark/admin/analytics' }
    ]
  }
];
```

---

## ✅ Implementation Checklist

### **Core Admin Functions**
- [ ] Reviewer role management (grant/revoke)
- [ ] Approval threshold configuration
- [ ] License URI management
- [ ] Contract address updates
- [ ] NDA hash registration

### **Dashboard Features**
- [ ] Platform overview with key metrics
- [ ] Real-time activity monitoring
- [ ] System health indicators
- [ ] Admin action audit logs

### **Security & Access**
- [ ] Admin role verification on all routes
- [ ] Secure admin function execution
- [ ] Emergency controls implementation
- [ ] Audit trail for all admin actions

### **User Experience**
- [ ] Intuitive admin interface design
- [ ] Clear confirmation dialogs for destructive actions
- [ ] Real-time updates and notifications
- [ ] Responsive design for mobile admin access

Remember: The Admin Dashboard is a high-privilege component that requires careful security implementation and thorough testing before deployment. 