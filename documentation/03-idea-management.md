# Module 03: Idea Management Implementation

## 📋 Overview & Objectives

The Idea Management module handles the complete lifecycle of research ideas in the Spark platform. It provides functionality for idea submission, modification, finalization, and tracking throughout the research workflow.

### **Key Responsibilities**
- Encrypted idea submission with NDA verification
- Draft idea modification capabilities
- Idea finalization workflow (Draft → Pending)
- **DocuSign integration for idea-specific NDAs**
- **Automated NDA generation and reviewer signing**
- Modification history tracking
- Status monitoring and notifications

---

## 🔐 DocuSign Integration for Idea-Specific NDAs

### **Idea-Specific NDA Workflow**
```typescript
// DocuSign integration for idea-specific NDAs
export interface IdeaSpecificNDA {
  ideaId: string;
  ideatorAddress: string;
  ndaDocumentId: string; // DocuSign document ID
  docusignEnvelopeId: string;
  ndaContent: string;
  signingUrl: string;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  createdAt: number;
  signedAt?: number;
  ipfsHash?: string; // Signed NDA stored on IPFS
}

// DocuSign service integration
export class IdeaDocuSignService {
  private static docusignClient: any;

  static async initializeDocuSign() {
    this.docusignClient = new docusign.ApiClient();
    this.docusignClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
    // Configure authentication
  }

  static async generateIdeaSpecificNDA(
    ideaId: string, 
    ideaData: any, 
    ideatorAddress: string
  ): Promise<IdeaSpecificNDA> {
    try {
      // 1. Generate customized NDA content
      const ndaContent = await this.generateNDAContent(ideaId, ideaData);
      
      // 2. Create DocuSign document
      const document = await this.createDocuSignDocument(ndaContent, ideaId);
      
      // 3. Create envelope for future signing
      const envelope = await this.createDocuSignEnvelope(document, ideaId);
      
      return {
        ideaId,
        ideatorAddress,
        ndaDocumentId: document.documentId,
        docusignEnvelopeId: envelope.envelopeId,
        ndaContent,
        signingUrl: '', // Will be generated when needed
        status: 'draft',
        createdAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to generate idea-specific NDA: ${error.message}`);
    }
  }

  static async createReviewerSigningUrl(
    ndaData: IdeaSpecificNDA, 
    reviewerAddress: string, 
    reviewerEmail: string
  ): Promise<string> {
    try {
      // Add reviewer as signer to existing envelope
      const signingUrl = await this.addSignerToEnvelope(
        ndaData.docusignEnvelopeId,
        reviewerAddress,
        reviewerEmail
      );
      
      return signingUrl;
    } catch (error) {
      throw new Error(`Failed to create reviewer signing URL: ${error.message}`);
    }
  }

  private static async generateNDAContent(ideaId: string, ideaData: any): Promise<string> {
    return `
      IDEA-SPECIFIC NON-DISCLOSURE AGREEMENT
      
      Idea ID: ${ideaId}
      Idea Title: ${ideaData.title}
      Submission Date: ${new Date(ideaData.submissionTimestamp * 1000).toLocaleDateString()}
      
      This Agreement governs the disclosure of confidential information 
      related to the specific research idea identified above...
      
      [Detailed NDA terms specific to this idea]
    `;
  }
}
```

---

## 🔄 Idea Lifecycle Management

### **Idea Status Flow**
```typescript
// Idea lifecycle states
export enum IdeaStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending', 
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

// Idea lifecycle workflow
const IDEA_WORKFLOW = {
  [IdeaStatus.DRAFT]: {
    allowedTransitions: [IdeaStatus.PENDING],
    allowedActions: ['modify', 'finalize', 'delete'],
    accessRequirement: NDAAthestationLevel.BOTH_PLATFORM
  },
  [IdeaStatus.PENDING]: {
    allowedTransitions: [IdeaStatus.APPROVED, IdeaStatus.REJECTED],
    allowedActions: ['vote', 'view'],
    accessRequirement: NDAAthestationLevel.IDEA_SPECIFIC_NDA
  },
  [IdeaStatus.APPROVED]: {
    allowedTransitions: [],
    allowedActions: ['view', 'mint_ip_nft', 'license'],
    accessRequirement: NDAAthestationLevel.IDEA_SPECIFIC_NDA
  },
  [IdeaStatus.REJECTED]: {
    allowedTransitions: [],
    allowedActions: ['view'],
    accessRequirement: NDAAthestationLevel.IDEA_SPECIFIC_NDA
  }
};
```

---

## 🎨 Component Architecture

### **Component Structure**
```
src/app/components/spark/ideas/
├── IdeaSubmission/
│   ├── IdeaSubmissionForm.tsx      # Main submission form
│   ├── IdeaContentEditor.tsx       # Rich text/markdown editor
│   ├── EncryptionPreview.tsx       # Show encryption status
│   ├── SubmissionReview.tsx        # Review before submission
│   └── SubmissionConfirmation.tsx  # Post-submission confirmation
├── IdeaModification/
│   ├── IdeaModificationForm.tsx    # Modification interface
│   ├── ModificationHistory.tsx     # Show change history
│   ├── DiffViewer.tsx             # Compare versions
│   └── ModificationLimits.tsx      # Show modification constraints
├── IdeaFinalization/
│   ├── FinalizationForm.tsx        # Finalization interface with DocuSign
│   ├── FinalizationChecklist.tsx   # Pre-finalization checks
│   ├── NDAAgreementPreview.tsx     # Preview generated NDA
│   ├── DocuSignNDAGeneration.tsx   # DocuSign NDA creation
│   └── FinalizationConfirmation.tsx # Post-finalization confirmation
├── ReviewerAccess/
│   ├── ReviewerNDASignature.tsx    # DocuSign NDA signing for reviewers
│   ├── IdeaNDAStatus.tsx          # Show NDA signing status
│   ├── DocuSignCallback.tsx       # Handle DocuSign completion
│   └── NDAAccessGate.tsx          # Gate content behind NDA
├── IdeaDetails/
│   ├── IdeaDetailsView.tsx         # Complete idea display
│   ├── IdeaMetadata.tsx           # Idea metadata display
│   ├── IdeaContent.tsx            # Decrypted content display
│   ├── IdeaStatusBadge.tsx        # Status indicator
│   └── IdeaActionButtons.tsx       # Context-aware action buttons
├── MyIdeas/
│   ├── MyIdeasDashboard.tsx        # Personal ideas dashboard
│   ├── IdeaCard.tsx               # Individual idea card
│   ├── IdeaFilters.tsx            # Filter by status/date
│   └── BulkActions.tsx            # Bulk operations
└── Shared/
    ├── IdeaProgressIndicator.tsx   # Show progress through workflow
    ├── IdeaValidation.tsx          # Input validation utilities
    ├── IdeaEncryption.tsx          # Encryption status components
    └── DocuSignIntegration.tsx     # DocuSign utility components
```

---

## 🔧 Core Idea Management Components

### **1. Idea Submission Form**

```typescript
// IdeaSubmission/IdeaSubmissionForm.tsx
interface IdeaSubmissionData {
  title: string;
  description: string;
  content: string;
  tags: string[];
  category: string;
  attachments?: File[];
}

export const IdeaSubmissionForm: React.FC = () => {
  const { address } = useWalletContext();
  const { submitIdea } = useSparkIdeaRegistry();
  const { checkAccessLevel } = useAttestationVault();
  const { networkInfo, loading: networkLoading } = useNetworkInfo(); // From serverConfig.ts
  const [formData, setFormData] = useState<IdeaSubmissionData>({
    title: '',
    description: '',
    content: '',
    tags: [],
    category: '',
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus>('pending');

  // Verify access before allowing submission
  useEffect(() => {
    verifySubmissionAccess();
  }, [address]);

  const verifySubmissionAccess = async () => {
    const hasAccess = await checkAccessLevel(address, NDAAthestationLevel.BOTH_PLATFORM);
    if (!hasAccess) {
      throw new Error('Platform NDA attestation required to submit ideas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Ensure contracts are properly configured
    if (!networkInfo?.sparkIdeaRegistry) {
      showErrorNotification('Spark contract not configured. Please check network settings.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Prepare idea content for encryption
      const ideaContent = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        tags: formData.tags,
        category: formData.category,
        submissionDate: new Date().toISOString(),
        submitter: address,
        contractAddress: networkInfo.sparkIdeaRegistry // Include for verification
      };

      // 2. Encrypt content
      setEncryptionStatus('encrypting');
      const { encryptedContent, encryptionMetadata } = await SparkEncryptionService.encryptIdeaContent(
        JSON.stringify(ideaContent),
        generateTemporaryIdeaId(),
        address
      );

      // 3. Upload encrypted content to IPFS
      setEncryptionStatus('uploading');
      const ipfsHash = await uploadToIPFS({
        encryptedContent,
        encryptionMetadata,
        contentType: 'application/json'
      });

      // 4. Submit to blockchain using contract from serverConfig.ts
      setEncryptionStatus('submitting');
      const result = await submitIdea(ipfsHash);

      setEncryptionStatus('completed');
      
      // 5. Show success and redirect
      showSuccessNotification('Idea submitted successfully!');
      router.push(`/spark/ideas/${result.ideaId}`);

    } catch (error) {
      setEncryptionStatus('failed');
      handleError(error, 'Idea submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show contract information to user
  const renderContractInfo = () => {
    if (!networkInfo) return null;

    return (
      <div className="contract-info-section">
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <div>
            <strong>Contract Information:</strong>
            <p className="text-sm">
              Ideas will be submitted to: {networkInfo.sparkIdeaRegistry}
            </p>
            <p className="text-sm">
              Network: {networkInfo.chainId} | 
              <a 
                href={`${networkInfo.explorerLink}/address/${networkInfo.sparkIdeaRegistry}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                View on Explorer
              </a>
            </p>
          </div>
        </Alert>
      </div>
    );
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.description.trim()) errors.push('Description is required');
    if (!formData.content.trim()) errors.push('Content is required');
    if (formData.tags.length === 0) errors.push('At least one tag is required');
    if (!formData.category) errors.push('Category is required');

    if (formData.title.length > 200) errors.push('Title must be less than 200 characters');
    if (formData.description.length > 1000) errors.push('Description must be less than 1000 characters');
    if (formData.content.length < 100) errors.push('Content must be at least 100 characters');

    if (errors.length > 0) {
      showErrorNotification(`Please fix the following errors:\n${errors.join('\n')}`);
      return false;
    }

    return true;
  };

  return (
    <AccessGate requiredAccess={NDAAthestationLevel.BOTH_PLATFORM}>
      <form onSubmit={handleSubmit} className="idea-submission-form">
        <div className="form-header">
          <h1>Submit New Research Idea</h1>
          <p className="text-gray-600">
            Share your research idea with the Spark community. Ideas are encrypted and protected by NDAs.
          </p>
        </div>

        {/* Contract Information Display */}
        {renderContractInfo()}

        <div className="form-sections">
          {/* Basic Information */}
          <FormSection title="Basic Information">
            <FormField label="Title" required>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a clear, descriptive title for your idea"
                maxLength={200}
              />
              <CharacterCount current={formData.title.length} max={200} />
            </FormField>

            <FormField label="Description" required>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide a brief overview of your research idea"
                rows={4}
                maxLength={1000}
              />
              <CharacterCount current={formData.description.length} max={1000} />
            </FormField>

            <FormField label="Category" required>
              <CategorySelector
                value={formData.category}
                onChange={(category) => setFormData(prev => ({ ...prev, category }))}
              />
            </FormField>

            <FormField label="Tags" required>
              <TagInput
                tags={formData.tags}
                onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                placeholder="Add relevant tags"
              />
            </FormField>
          </FormSection>

          {/* Detailed Content */}
          <FormSection title="Detailed Content">
            <FormField label="Research Details" required>
              <IdeaContentEditor
                content={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                placeholder="Provide detailed information about your research idea, methodology, expected outcomes, etc."
              />
              <div className="content-guidelines">
                <h4>Content Guidelines:</h4>
                <ul>
                  <li>Clearly describe the research problem and proposed solution</li>
                  <li>Include methodology and expected outcomes</li>
                  <li>Mention any relevant prior work or references</li>
                  <li>Specify potential applications and impact</li>
                </ul>
              </div>
            </FormField>

            <FormField label="Attachments (Optional)">
              <FileUpload
                files={formData.attachments}
                onChange={(attachments) => setFormData(prev => ({ ...prev, attachments }))}
                acceptedTypes={['.pdf', '.doc', '.docx', '.txt', '.md']}
                maxFiles={5}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </FormField>
          </FormSection>

          {/* Encryption & Privacy */}
          <FormSection title="Encryption & Privacy">
            <EncryptionPreview 
              status={encryptionStatus}
              contentSize={JSON.stringify(formData).length}
            />
            
            <div className="privacy-notice">
              <Alert variant="info">
                <Shield className="h-4 w-4" />
                <span>
                  Your idea will be encrypted before storage and protected by NDAs. 
                  Only you and authorized reviewers can access the content.
                </span>
              </Alert>
            </div>
          </FormSection>
        </div>

        <div className="form-actions">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || encryptionStatus === 'encrypting' || !networkInfo}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Idea'}
          </Button>
        </div>
      </form>
    </AccessGate>
  );
};
```

### **2. Idea Modification Interface**

```typescript
// IdeaModification/IdeaModificationForm.tsx
interface IdeaModificationProps {
  ideaId: string;
  currentContent: any;
  onSuccess?: () => void;
}

export const IdeaModificationForm: React.FC<IdeaModificationProps> = ({
  ideaId,
  currentContent,
  onSuccess
}) => {
  const { modifyIdeaDetails, canIdeaBeModified } = useSparkIdeaRegistry();
  const [modifiedContent, setModifiedContent] = useState(currentContent);
  const [isModifying, setIsModifying] = useState(false);
  const [canModify, setCanModify] = useState(false);
  const [modificationLimits, setModificationLimits] = useState(null);

  useEffect(() => {
    checkModificationStatus();
  }, [ideaId]);

  const checkModificationStatus = async () => {
    try {
      const modifiable = await canIdeaBeModified(ideaId);
      setCanModify(modifiable);
      
      if (!modifiable) {
        const limits = await getModificationLimits(ideaId);
        setModificationLimits(limits);
      }
    } catch (error) {
      console.error('Failed to check modification status:', error);
    }
  };

  const handleModification = async () => {
    if (!canModify) {
      showErrorNotification('This idea can no longer be modified');
      return;
    }

    setIsModifying(true);
    try {
      // 1. Encrypt modified content
      const { encryptedContent, encryptionMetadata } = await SparkEncryptionService.encryptIdeaContent(
        JSON.stringify(modifiedContent),
        ideaId,
        address
      );

      // 2. Upload to IPFS
      const newIpfsHash = await uploadToIPFS({
        encryptedContent,
        encryptionMetadata,
        contentType: 'application/json'
      });

      // 3. Submit modification
      await modifyIdeaDetails(ideaId, newIpfsHash);

      showSuccessNotification('Idea modified successfully!');
      onSuccess?.();

    } catch (error) {
      handleError(error, 'Idea modification');
    } finally {
      setIsModifying(false);
    }
  };

  if (!canModify) {
    return (
      <ModificationLimits 
        ideaId={ideaId}
        limits={modificationLimits}
      />
    );
  }

  return (
    <div className="idea-modification-form">
      <div className="modification-header">
        <h2>Modify Idea</h2>
        <p className="text-gray-600">
          You can modify your idea while it's in Draft status and before any reviewer votes.
        </p>
      </div>

      <div className="modification-content">
        <div className="side-by-side-editor">
          <div className="current-content">
            <h3>Current Version</h3>
            <ContentViewer content={currentContent} readonly />
          </div>
          
          <div className="modified-content">
            <h3>Modified Version</h3>
            <IdeaContentEditor
              content={modifiedContent}
              onChange={setModifiedContent}
            />
          </div>
        </div>

        <div className="modification-summary">
          <DiffViewer
            original={currentContent}
            modified={modifiedContent}
          />
        </div>
      </div>

      <div className="modification-actions">
        <Button variant="outline" onClick={() => setModifiedContent(currentContent)}>
          Reset Changes
        </Button>
        <Button 
          onClick={handleModification}
          disabled={isModifying || JSON.stringify(currentContent) === JSON.stringify(modifiedContent)}
          loading={isModifying}
        >
          Save Modifications
        </Button>
      </div>
    </div>
  );
};
```

### **3. Enhanced Idea Finalization with DocuSign NDA Generation**

```typescript
// IdeaFinalization/FinalizationForm.tsx
interface IdeaFinalizationProps {
  ideaId: string;
  ideaData: any;
  onSuccess?: () => void;
}

export const IdeaFinalizationForm: React.FC<IdeaFinalizationProps> = ({
  ideaId,
  ideaData,
  onSuccess
}) => {
  const { finalizeIdea, isIdeaFinalized } = useSparkIdeaRegistry();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [ideaSpecificNDA, setIdeaSpecificNDA] = useState<IdeaSpecificNDA | null>(null);
  const [finalizationChecks, setFinalizationChecks] = useState({
    contentComplete: false,
    noMoreChanges: false,
    understandsNDA: false,
    agreeToReview: false,
    ndaGenerated: false // New check for NDA generation
  });

  const allChecksComplete = Object.values(finalizationChecks).every(Boolean);

  useEffect(() => {
    // Pre-generate idea-specific NDA during finalization setup
    generateIdeaNDA();
  }, [ideaId]);

  const generateIdeaNDA = async () => {
    try {
      // Generate idea-specific NDA using DocuSign
      const ndaData = await IdeaDocuSignService.generateIdeaSpecificNDA(
        ideaId,
        ideaData,
        address
      );
      
      setIdeaSpecificNDA(ndaData);
      setFinalizationChecks(prev => ({ ...prev, ndaGenerated: true }));
      
    } catch (error) {
      console.error('Failed to generate idea-specific NDA:', error);
      showErrorNotification('Failed to generate idea-specific NDA');
    }
  };

  const handleFinalization = async () => {
    if (!allChecksComplete) {
      showErrorNotification('Please complete all finalization checks');
      return;
    }

    if (!ideaSpecificNDA) {
      showErrorNotification('Idea-specific NDA must be generated before finalization');
      return;
    }

    setIsFinalizing(true);
    try {
      // 1. Finalize idea on blockchain
      await finalizeIdea(ideaId);
      
      // 2. Store idea-specific NDA data
      await storeIdeaSpecificNDA(ideaId, ideaSpecificNDA);
      
      // 3. Activate NDA for reviewer access
      await activateIdeaNDAForReviewers(ideaId, ideaSpecificNDA);
      
      showSuccessNotification('Idea finalized and idea-specific NDA generated!');
      onSuccess?.();

    } catch (error) {
      handleError(error, 'Idea finalization');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="idea-finalization-form">
      <div className="finalization-header">
        <h2>Finalize Idea for Review</h2>
        <p className="text-gray-600">
          Once finalized, your idea will be submitted for review and can no longer be modified.
        </p>
      </div>

      <div className="finalization-preview">
        <h3>Idea Preview</h3>
        <IdeaDetailsView ideaData={ideaData} readonly />
      </div>

      {/* DocuSign NDA Section */}
      <div className="nda-generation-section">
        <h3>Idea-Specific NDA Generation</h3>
        {ideaSpecificNDA ? (
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <div>
              <strong>Idea-Specific NDA Generated</strong>
              <p>DocuSign envelope created: {ideaSpecificNDA.docusignEnvelopeId}</p>
              <p>This NDA will be required for reviewers to access your idea content.</p>
            </div>
          </Alert>
        ) : (
          <Alert variant="info">
            <Loader className="h-4 w-4 animate-spin" />
            <span>Generating idea-specific NDA with DocuSign...</span>
          </Alert>
        )}
      </div>

      <div className="finalization-checklist">
        <h3>Finalization Checklist</h3>
        
        <ChecklistItem
          checked={finalizationChecks.contentComplete}
          onChange={(checked) => setFinalizationChecks(prev => ({ ...prev, contentComplete: checked }))}
          title="Content is Complete"
          description="I have provided all necessary details and the idea is ready for review"
        />

        <ChecklistItem
          checked={finalizationChecks.noMoreChanges}
          onChange={(checked) => setFinalizationChecks(prev => ({ ...prev, noMoreChanges: checked }))}
          title="No Further Changes Needed"
          description="I understand that the idea cannot be modified after finalization"
        />

        <ChecklistItem
          checked={finalizationChecks.understandsNDA}
          onChange={(checked) => setFinalizationChecks(prev => ({ ...prev, understandsNDA: checked }))}
          title="NDA Protection Understood"
          description="I understand that reviewers will sign idea-specific NDAs via DocuSign to access my idea"
        />

        <ChecklistItem
          checked={finalizationChecks.agreeToReview}
          onChange={(checked) => setFinalizationChecks(prev => ({ ...prev, agreeToReview: checked }))}
          title="Agree to Review Process"
          description="I agree to the peer review process and potential outcomes"
        />

        <ChecklistItem
          checked={finalizationChecks.ndaGenerated}
          onChange={() => {}} // Automatic - not user controllable
          title="Idea-Specific NDA Generated"
          description="DocuSign NDA document has been created for this idea"
          disabled={true}
        />
      </div>

      <div className="finalization-info">
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <strong>Important:</strong> After finalization, your idea will:
            <ul className="mt-2 list-disc list-inside">
              <li>Be submitted to the review committee</li>
              <li>Generate an idea-specific NDA for reviewers via DocuSign</li>
              <li>Require reviewers to sign the NDA before accessing content</li>
              <li>Become permanently immutable</li>
              <li>Enter the governance voting process if approved</li>
            </ul>
          </span>
        </Alert>
      </div>

      <div className="finalization-actions">
        <Button variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button 
          onClick={handleFinalization}
          disabled={!allChecksComplete || isFinalizing}
          loading={isFinalizing}
        >
          Finalize Idea & Activate NDA
        </Button>
      </div>
    </div>
  );
};
```

### **4. Reviewer NDA Signing Component**

```typescript
// ReviewerAccess/ReviewerNDASignature.tsx
interface ReviewerNDASignatureProps {
  ideaId: string;
  reviewerAddress: string;
  reviewerEmail: string;
  onNDASignedSuccess: () => void;
}

export const ReviewerNDASignature: React.FC<ReviewerNDASignatureProps> = ({
  ideaId,
  reviewerAddress,
  reviewerEmail,
  onNDASignedSuccess
}) => {
  const [ndaData, setNdaData] = useState<IdeaSpecificNDA | null>(null);
  const [signingUrl, setSigningUrl] = useState<string>('');
  const [signingStatus, setSigningStatus] = useState<'loading' | 'ready' | 'signing' | 'signed'>('loading');

  useEffect(() => {
    loadIdeaNDAAndCreateSigningUrl();
  }, [ideaId, reviewerAddress]);

  const loadIdeaNDAAndCreateSigningUrl = async () => {
    try {
      // 1. Load idea-specific NDA data
      const ideaNDA = await loadIdeaSpecificNDA(ideaId);
      if (!ideaNDA) {
        throw new Error('Idea-specific NDA not found');
      }
      setNdaData(ideaNDA);

      // 2. Create DocuSign signing URL for this reviewer
      const url = await IdeaDocuSignService.createReviewerSigningUrl(
        ideaNDA,
        reviewerAddress,
        reviewerEmail
      );
      setSigningUrl(url);
      setSigningStatus('ready');

    } catch (error) {
      console.error('Failed to setup reviewer NDA signing:', error);
      showErrorNotification('Failed to setup NDA signing process');
    }
  };

  const handleDocuSignCallback = async (envelopeId: string, status: string) => {
    if (status === 'completed') {
      try {
        // 1. Record NDA signature in AttestationVault
        await recordIdeaNDAAttestation(ideaId, reviewerAddress, envelopeId);
        
        // 2. Update reviewer's access level
        setSigningStatus('signed');
        
        showSuccessNotification('NDA signed successfully! You now have access to the idea.');
        onNDASignedSuccess();

      } catch (error) {
        handleError(error, 'Recording NDA signature');
      }
    }
  };

  const openDocuSignSigning = () => {
    if (!signingUrl) return;
    
    setSigningStatus('signing');
    
    // Open DocuSign in new window/iframe
    const docusignWindow = window.open(
      signingUrl,
      'docusign-signing',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for DocuSign completion
    const checkCompletion = setInterval(async () => {
      try {
        // Check if signing is completed
        const status = await checkDocuSignStatus(ndaData.docusignEnvelopeId);
        if (status === 'completed') {
          clearInterval(checkCompletion);
          docusignWindow?.close();
          await handleDocuSignCallback(ndaData.docusignEnvelopeId, 'completed');
        }
      } catch (error) {
        console.error('Error checking DocuSign status:', error);
      }
    }, 3000);

    // Clean up if window is closed manually
    const windowCheck = setInterval(() => {
      if (docusignWindow?.closed) {
        clearInterval(windowCheck);
        clearInterval(checkCompletion);
        setSigningStatus('ready');
      }
    }, 1000);
  };

  if (signingStatus === 'loading') {
    return (
      <div className="reviewer-nda-loading">
        <Loader className="h-8 w-8 animate-spin" />
        <p>Setting up idea-specific NDA signing...</p>
      </div>
    );
  }

  if (signingStatus === 'signed') {
    return (
      <Alert variant="success">
        <CheckCircle className="h-4 w-4" />
        <span>
          <strong>NDA Signed Successfully!</strong>
          You now have access to review this idea's content.
        </span>
      </Alert>
    );
  }

  return (
    <div className="reviewer-nda-signature">
      <div className="nda-header">
        <h2>Idea-Specific NDA Required</h2>
        <p className="text-gray-600">
          You must sign an idea-specific NDA to access and review this research idea.
        </p>
      </div>

      {ndaData && (
        <div className="nda-details">
          <Alert variant="info">
            <FileText className="h-4 w-4" />
            <div>
              <strong>NDA Details:</strong>
              <p>Idea ID: {ndaData.ideaId}</p>
              <p>DocuSign Envelope: {ndaData.docusignEnvelopeId}</p>
              <p>This NDA is specific to this research idea and covers confidential information disclosure.</p>
            </div>
          </Alert>
        </div>
      )}

      <div className="nda-content-preview">
        <h3>NDA Content Preview</h3>
        <div className="nda-text">
          {ndaData?.ndaContent?.substring(0, 500)}...
          <Button variant="link" onClick={() => setShowFullNDA(true)}>
            View Full NDA
          </Button>
        </div>
      </div>

      <div className="signing-actions">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button 
          onClick={openDocuSignSigning}
          disabled={signingStatus === 'signing'}
          loading={signingStatus === 'signing'}
        >
          {signingStatus === 'signing' ? 'Signing in DocuSign...' : 'Sign NDA with DocuSign'}
        </Button>
      </div>

      <div className="docusign-info">
        <Alert variant="warning">
          <Shield className="h-4 w-4" />
          <span>
            <strong>Secure Signing:</strong> This NDA will be signed using DocuSign's secure 
            electronic signature platform. Your signature will be legally binding.
          </span>
        </Alert>
      </div>
    </div>
  );
};
```

### **5. My Ideas Dashboard**

```typescript
// MyIdeas/MyIdeasDashboard.tsx
export const MyIdeasDashboard: React.FC = () => {
  const { address } = useWalletContext();
  const { getAllIdeaIds, getIdea } = useSparkIdeaRegistry();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'newest',
    search: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyIdeas();
  }, [address]);

  useEffect(() => {
    applyFilters();
  }, [ideas, filters]);

  const loadMyIdeas = async () => {
    try {
      setLoading(true);
      
      // Get all idea IDs
      const allIdeaIds = await getAllIdeaIds();
      
      // Filter ideas by current user and load details
      const myIdeas = [];
      for (const ideaId of allIdeaIds) {
        try {
          const idea = await getIdea(ideaId);
          if (idea.ideator.toLowerCase() === address.toLowerCase()) {
            // Load NDA status for each idea
            const ndaStatus = await loadIdeaNDAStatus(ideaId);
            myIdeas.push({
              ...idea,
              ndaStatus
            });
          }
        } catch (error) {
          // Skip ideas we can't access
          console.warn(`Cannot access idea ${ideaId}:`, error);
        }
      }

      setIdeas(myIdeas);
    } catch (error) {
      handleError(error, 'Loading ideas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...ideas];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(idea => idea.approvalStatus === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(idea =>
        idea.title?.toLowerCase().includes(searchLower) ||
        idea.description?.toLowerCase().includes(searchLower) ||
        idea.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.submissionTimestamp - a.submissionTimestamp;
        case 'oldest':
          return a.submissionTimestamp - b.submissionTimestamp;
        case 'title':
          return a.title?.localeCompare(b.title) || 0;
        case 'status':
          return a.approvalStatus.localeCompare(b.approvalStatus);
        default:
          return 0;
      }
    });

    setFilteredIdeas(filtered);
  };

  if (loading) {
    return <LoadingDashboard />;
  }

  return (
    <AccessGate requiredAccess={NDAAthestationLevel.BOTH_PLATFORM}>
      <div className="my-ideas-dashboard">
        <div className="dashboard-header">
          <h1>My Research Ideas</h1>
          <Button onClick={() => router.push('/spark/submit')}>
            Submit New Idea
          </Button>
        </div>

        <div className="dashboard-stats">
          <StatCard
            title="Total Ideas"
            value={ideas.length}
            icon="💡"
          />
          <StatCard
            title="Draft Ideas"
            value={ideas.filter(i => i.approvalStatus === 'Draft').length}
            icon="📝"
          />
          <StatCard
            title="Under Review"
            value={ideas.filter(i => i.approvalStatus === 'Pending').length}
            icon="⏳"
          />
          <StatCard
            title="Approved"
            value={ideas.filter(i => i.approvalStatus === 'Approved').length}
            icon="✅"
          />
          <StatCard
            title="NDAs Generated"
            value={ideas.filter(i => i.ndaStatus?.generated).length}
            icon="📄"
            description="Ideas with DocuSign NDAs"
          />
        </div>

        <div className="dashboard-filters">
          <IdeaFilters
            filters={filters}
            onFiltersChange={setFilters}
            statusOptions={['all', 'Draft', 'Pending', 'Approved', 'Rejected']}
          />
        </div>

        <div className="ideas-grid">
          {filteredIdeas.length === 0 ? (
            <EmptyState
              title="No ideas found"
              description="Create your first research idea to get started"
              action={{
                label: "Submit Idea",
                onClick: () => router.push('/spark/submit')
              }}
            />
          ) : (
            filteredIdeas.map(idea => (
              <IdeaCard
                key={idea.ideaId}
                idea={idea}
                isOwner={true}
                onUpdate={loadMyIdeas}
                showNDAStatus={true} // Show DocuSign NDA status
              />
            ))
          )}
        </div>
      </div>
    </AccessGate>
  );
};
```

---

## 🧪 Testing Guidelines

### **Idea Management Testing**

```typescript
// __tests__/components/IdeaSubmissionForm.test.tsx
describe('IdeaSubmissionForm', () => {
  beforeEach(() => {
    // Mock required dependencies
    mockUseAttestationVault.mockReturnValue({
      checkAccessLevel: jest.fn().mockResolvedValue(true)
    });
    
    mockUseSparkIdeaRegistry.mockReturnValue({
      submitIdea: jest.fn().mockResolvedValue({ ideaId: 'test-idea-id' })
    });
  });

  test('renders form with all required fields', () => {
    render(<IdeaSubmissionForm />);
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByText(/submit idea/i)).toBeInTheDocument();
  });

  test('validates required fields before submission', async () => {
    render(<IdeaSubmissionForm />);
    
    fireEvent.click(screen.getByText(/submit idea/i));
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  test('encrypts and submits idea successfully', async () => {
    const mockSubmitIdea = jest.fn().mockResolvedValue({ ideaId: 'test-idea' });
    mockUseSparkIdeaRegistry.mockReturnValue({
      submitIdea: mockSubmitIdea
    });

    render(<IdeaSubmissionForm />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Idea' }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test description' }
    });
    
    // Submit
    fireEvent.click(screen.getByText(/submit idea/i));
    
    await waitFor(() => {
      expect(mockSubmitIdea).toHaveBeenCalled();
    });
  });
});
```

---

## ✅ Implementation Checklist

### **Core Submission Features**
- [ ] Encrypted idea submission form
- [ ] Content validation and guidelines
- [ ] IPFS upload with encryption
- [ ] NDA verification before submission

### **Modification Features**
- [ ] Draft idea modification interface
- [ ] Side-by-side content editor
- [ ] Diff viewer for changes
- [ ] Modification limits enforcement

### **Finalization Features**
- [ ] Finalization checklist workflow
- [ ] Immutability warnings
- [ ] NDA generation trigger
- [ ] Review process initiation

### **Dashboard Features**
- [ ] Personal ideas overview
- [ ] Status-based filtering
- [ ] Search and sorting
- [ ] Bulk operations

### **Integration Features**
- [ ] Real-time status updates
- [ ] Cross-module navigation
- [ ] Error handling and recovery
- [ ] Performance optimization

Remember: This module handles sensitive research content and must maintain strict security through encryption and NDA verification at every step. 