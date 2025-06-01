# Module 05: Review & Governance Implementation

## 📋 Overview & Objectives

The Review & Governance module implements the peer review system and governance voting mechanisms for research ideas in the Spark platform. **This module MUST integrate with and leverage the existing PoSciDonDAO governance infrastructure** rather than creating parallel systems.

### **Key Responsibilities**
- Reviewer dashboard and idea evaluation interface
- **Integration with existing PoSciDonDAO governance contracts**
- **Reuse of current voting mechanisms and proposal systems**
- Review workflow management that feeds into existing governance
- **Seamless integration with current Governor contract patterns**

### **🚨 Critical Integration Requirements**
- **MUST use existing Governor contract (0x965BAd9a732A5F817c81604657a8A9B4c54A7D19)**
- **MUST leverage current governance token voting power**
- **MUST integrate with existing proposal creation patterns**
- **MUST maintain compatibility with current DAO voting mechanisms**
- **MUST not duplicate governance functionality - extend existing systems**

---

## 🗳️ Governance Architecture

### **Integration with Existing PoSciDonDAO Governance**
```typescript
// CRITICAL: Reuse existing governance patterns from PoSciDonDAO
import { useGovernance } from '@/hooks/useGovernance'; // Existing PoSciDonDAO hook
import { useProposals } from '@/hooks/useProposals'; // Existing PoSciDonDAO hook
import { useVoting } from '@/hooks/useVoting'; // Existing PoSciDonDAO hook

// Extend existing governance for Spark-specific needs
export interface SparkGovernanceExtension {
  // Leverage existing Governor contract
  governorContract: typeof useGovernance;
  
  // Extend existing proposal types for Spark ideas
  sparkProposalType: 'SPARK_IDEA_APPROVAL';
  
  // Reuse existing voting power calculation
  votingPower: typeof useVoting.getVotingPower;
  
  // Integrate with existing proposal creation
  createSparkProposal: (ideaId: string, proposalData: any) => Promise<string>;
}

// Review workflow states - integrated with existing governance
export enum ReviewStatus {
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review', 
  IN_GOVERNANCE = 'in_governance', // ⭐ NEW: Uses existing PoSciDonDAO governance
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPEALED = 'appealed'
}

// Reviewer voting - feeds into existing governance proposals
export enum VoteType {
  APPROVE = 'approve',    // Creates governance proposal for approval
  REJECT = 'reject',      // Creates governance proposal for rejection
  ABSTAIN = 'abstain',
  REQUEST_CHANGES = 'request_changes'
}
```

### **Governance Integration Flow**
```typescript
// 🔄 Spark Review → Existing PoSciDonDAO Governance Pipeline
const sparkGovernanceFlow = {
  1: 'Idea submitted and reviewed by Spark reviewers',
  2: 'Review consensus triggers governance proposal creation',
  3: '🚨 EXISTING PoSciDonDAO governance contract takes over',
  4: 'Community votes using existing voting mechanisms',
  5: 'Proposal execution uses existing DAO infrastructure',
  6: 'Results flow back to Spark for final status update'
};

// Integration with existing GovernorResearch contract
export const useSparkGovernanceIntegration = () => {
  // 🚨 REUSE existing governance hooks - do NOT recreate
  const { 
    createProposal: createDAOProposal,
    getProposals: getDAOProposals,
    castVote: castDAOVote,
    executeProposal: executeDAOProposal
  } = useGovernance(); // Existing PoSciDonDAO governance hook

  const createSparkIdeaProposal = async (ideaId: string, reviewResults: ReviewDecision[]) => {
    // Create proposal using EXISTING DAO infrastructure
    const proposalData = {
      type: 'SPARK_IDEA_APPROVAL',
      ideaId,
      reviewResults,
      description: `Spark Idea Approval: ${ideaId}`,
      // Use existing DAO proposal structure - get addresses from networkInfo
      targets: [networkInfo.sparkIdeaRegistry],
      values: [0],
      calldatas: [encodeSparkApprovalCall(ideaId)],
      // Integrate with existing DAO settings
      votingDelay: await governorContract.votingDelay(),
      votingPeriod: await governorContract.votingPeriod()
    };

    // 🚨 Use existing DAO proposal creation - do NOT duplicate
    return await createDAOProposal(proposalData);
  };

  return { createSparkIdeaProposal };
};
```

---

## 🔧 Core Review Components (Integrated with Existing Governance)

### **1. Reviewer Dashboard - Integrated with DAO**

```typescript
// ReviewerDashboard/ReviewerDashboard.tsx
export const ReviewerDashboard: React.FC = () => {
  const { address } = useWalletContext();
  
  // 🚨 REUSE existing DAO governance hooks
  const { 
    getVotingPower, 
    getUserProposals,
    getActiveProposals 
  } = useGovernance(); // Existing PoSciDonDAO hook
  
  const { checkAccessLevel } = useAttestationVault();
  const { getAllIdeaIds, getIdea, voteOnIdea } = useSparkIdeaRegistry();
  
  const [assignedIdeas, setAssignedIdeas] = useState<any[]>([]);
  const [daoVotingPower, setDAOVotingPower] = useState(0); // From existing DAO
  const [activeSparkProposals, setActiveSparkProposals] = useState<any[]>([]);

  useEffect(() => {
    verifyReviewerAccess();
    loadReviewerData();
    loadDAOIntegrationData(); // 🚨 Load existing DAO data
  }, [address]);

  const loadDAOIntegrationData = async () => {
    try {
      // 🚨 Use existing DAO voting power calculation
      const votingPower = await getVotingPower(address);
      setDAOVotingPower(votingPower);

      // 🚨 Filter existing DAO proposals for Spark-related ones
      const allProposals = await getActiveProposals();
      const sparkProposals = allProposals.filter(p => 
        p.description?.includes('Spark Idea') || p.type === 'SPARK_IDEA_APPROVAL'
      );
      setActiveSparkProposals(sparkProposals);

    } catch (error) {
      handleError(error, 'Loading DAO integration data');
    }
  };

  return (
    <AccessGate requiredRole="REVIEWER_ROLE">
      <div className="reviewer-dashboard">
        <div className="dashboard-header">
          <h1>Spark Reviewer Dashboard</h1>
          <p className="text-gray-600">
            Review Spark ideas and participate in PoSciDonDAO governance
          </p>
        </div>

        {/* 🚨 Show DAO voting power prominently */}
        <div className="dao-integration-section">
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <span>
              <strong>DAO Integration:</strong> Your reviews create governance proposals in the main PoSciDonDAO system. 
              Your voting power: <strong>{daoVotingPower.toLocaleString()}</strong>
            </span>
          </Alert>
        </div>

        <div className="dashboard-stats">
          <StatCard
            title="DAO Voting Power"
            value={daoVotingPower.toLocaleString()}
            icon="🗳️"
            description="Your voting power in PoSciDonDAO governance"
            highlight={true}
          />
          {/* ... existing stats ... */}
        </div>

        <div className="dashboard-content">
          {/* 🚨 Show active Spark proposals in DAO */}
          <ReviewSection title="Active DAO Proposals (Spark Ideas)" priority>
            <ActiveSparkProposals 
              proposals={activeSparkProposals}
              userVotingPower={daoVotingPower}
            />
          </ReviewSection>

          {/* Existing review sections */}
          <ReviewSection title="Pending Reviews" urgent>
            <AssignedIdeas
              ideas={assignedIdeas.filter(idea => idea.reviewStatus === 'pending')}
              onReviewComplete={loadReviewerData}
              daoIntegrated={true} // Flag for DAO integration
            />
          </ReviewSection>
        </div>
      </div>
    </AccessGate>
  );
};
```

### **2. Review Submission - Creates DAO Proposals**

```typescript
// IdeaReview/ReviewSubmission.tsx
export const ReviewSubmission: React.FC<{
  reviewData: ReviewDecision;
  overallScore: number;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}> = ({ reviewData, overallScore, onSubmit, onBack, isSubmitting }) => {
  const { createSparkIdeaProposal } = useSparkGovernanceIntegration();
  const [willCreateProposal, setWillCreateProposal] = useState(false);

  useEffect(() => {
    // Determine if this review will trigger a DAO proposal
    const isApproval = overallScore >= 3.5;
    setWillCreateProposal(isApproval);
  }, [overallScore]);

  const handleEnhancedSubmission = async () => {
    try {
      // 1. Submit review vote to Spark contract
      await onSubmit();

      // 2. 🚨 If approval, create DAO governance proposal
      if (willCreateProposal) {
        const proposalId = await createSparkIdeaProposal(
          reviewData.ideaId, 
          [reviewData]
        );
        
        showSuccessNotification(
          `Review submitted and DAO proposal created! Proposal ID: ${proposalId}`
        );
      }

    } catch (error) {
      handleError(error, 'Enhanced review submission');
    }
  };

  return (
    <div className="review-submission">
      <div className="submission-header">
        <h2>Review Submission Summary</h2>
        <ReviewDecisionBadge score={overallScore} />
      </div>

      {/* 🚨 DAO Integration Notice */}
      {willCreateProposal && (
        <Alert variant="success" className="dao-integration-notice">
          <Zap className="h-4 w-4" />
          <div>
            <strong>DAO Governance Integration</strong>
            <p>
              This approval review will automatically create a governance proposal 
              in the main PoSciDonDAO system for community voting.
            </p>
          </div>
        </Alert>
      )}

      <div className="review-summary">
        <ReviewCriteriaSummary criteria={reviewData.criteria} />
        <ReviewCommentsSummary comments={reviewData.comments} />
      </div>

      {/* 🚨 DAO Integration Workflow */}
      <div className="dao-workflow-preview">
        <h3>Next Steps</h3>
        <div className="workflow-steps">
          <WorkflowStep 
            step={1} 
            title="Review Submitted" 
            description="Your review is recorded on-chain"
            completed={false}
          />
          {willCreateProposal && (
            <WorkflowStep 
              step={2} 
              title="DAO Proposal Created" 
              description="Governance proposal created in PoSciDonDAO"
              completed={false}
            />
          )}
          <WorkflowStep 
            step={willCreateProposal ? 3 : 2} 
            title="Community Voting" 
            description="DAO members vote using existing governance"
            completed={false}
          />
          <WorkflowStep 
            step={willCreateProposal ? 4 : 3} 
            title="Final Decision" 
            description="Results implemented through DAO execution"
            completed={false}
          />
        </div>
      </div>

      <div className="submission-actions">
        <Button variant="outline" onClick={onBack}>
          Back to Edit
        </Button>
        <Button 
          onClick={handleEnhancedSubmission}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review & Create DAO Proposal'}
        </Button>
      </div>
    </div>
  );
};
```

### **3. Active DAO Proposals for Spark Ideas**

```typescript
// Governance/ActiveSparkProposals.tsx
export const ActiveSparkProposals: React.FC<{
  proposals: any[];
  userVotingPower: number;
}> = ({ proposals, userVotingPower }) => {
  // 🚨 Use existing DAO voting interface
  const { castVote, hasVoted } = useGovernance();

  return (
    <div className="active-spark-proposals">
      {proposals.length === 0 ? (
        <EmptyState 
          title="No Active Spark Proposals"
          description="No Spark ideas are currently in DAO governance voting"
        />
      ) : (
        proposals.map(proposal => (
          <SparkProposalCard
            key={proposal.id}
            proposal={proposal}
            userVotingPower={userVotingPower}
            onVote={castVote} // 🚨 Use existing DAO voting
            hasVoted={hasVoted}
          />
        ))
      )}
    </div>
  );
};

const SparkProposalCard: React.FC<any> = ({ proposal, userVotingPower, onVote, hasVoted }) => {
  const [userHasVoted, setUserHasVoted] = useState(false);

  useEffect(() => {
    checkVotingStatus();
  }, [proposal.id]);

  const checkVotingStatus = async () => {
    const voted = await hasVoted(proposal.id, address);
    setUserHasVoted(voted);
  };

  return (
    <Card className="spark-proposal-card">
      <CardHeader>
        <div className="proposal-header">
          <h3>Spark Idea Governance Vote</h3>
          <ProposalStatusBadge status={proposal.state} />
        </div>
        <p className="proposal-description">{proposal.description}</p>
      </CardHeader>
      
      <CardContent>
        <div className="proposal-details">
          <div className="voting-summary">
            <VotingSummary 
              forVotes={proposal.forVotes}
              againstVotes={proposal.againstVotes}
              abstainVotes={proposal.abstainVotes}
            />
          </div>
          
          <div className="proposal-timeline">
            <ProposalTimeline 
              startTime={proposal.startTime}
              endTime={proposal.endTime}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {userHasVoted ? (
          <Alert variant="info">
            <CheckCircle className="h-4 w-4" />
            <span>You have voted on this proposal</span>
          </Alert>
        ) : (
          <DAOVotingInterface 
            proposalId={proposal.id}
            votingPower={userVotingPower}
            onVote={onVote} // 🚨 Use existing DAO voting
          />
        )}
      </CardFooter>
    </Card>
  );
};
```

---

## 🔗 **Critical Integration Points**

### **1. Existing DAO Contract Integration**
```typescript
// 🚨 MUST use these existing contracts - do NOT recreate
export const EXISTING_DAO_CONTRACTS = {
  governor: '0x965BAd9a732A5F817c81604657a8A9B4c54A7D19', // GovernorResearch
  timelock: '0x[EXISTING_TIMELOCK]',
  token: '0x[EXISTING_GOVERNANCE_TOKEN]'
};

// 🚨 Import and extend existing DAO hooks
import { 
  useGovernance,
  useProposals, 
  useVoting,
  useTimelock 
} from '@/hooks/governance'; // Existing PoSciDonDAO hooks
```

### **2. Governance Token Integration**
```typescript
// 🚨 MUST use existing voting power calculation
export const useSparkVotingPower = () => {
  const { getVotingPower } = useVoting(); // Existing DAO hook
  
  // Extend for Spark-specific display, but use same underlying power
  const getSparkVotingPower = async (address: string) => {
    return await getVotingPower(address); // 🚨 Use existing calculation
  };

  return { getSparkVotingPower };
};
```

### **3. Proposal Creation Integration**
```typescript
// 🚨 Extend existing proposal creation - do NOT duplicate
export const createSparkProposalInDAO = async (
  ideaId: string, 
  reviewData: ReviewDecision[]
) => {
  const { createProposal } = useProposals(); // �� Existing DAO hook
  const { networkInfo } = useNetworkInfo(); // Get contract addresses

  const proposalData = {
    // Use existing DAO proposal structure
    targets: [networkInfo.sparkIdeaRegistry],
    values: [0],
    calldatas: [
      sparkIdeaRegistry.interface.encodeFunctionData('approveIdea', [ideaId])
    ],
    description: `Spark Research Idea Approval: ${ideaId}\n\nReview Summary:\n${formatReviewSummary(reviewData)}`
  };

  // 🚨 Use existing DAO proposal creation
  return await createProposal(proposalData);
};
```

---

## 🎨 Component Architecture

### **Component Structure**
```
src/app/components/spark/review/
├── ReviewerDashboard/
│   ├── ReviewerDashboard.tsx        # Main reviewer interface
│   ├── AssignedIdeas.tsx           # Ideas assigned for review
│   ├── ReviewQueue.tsx             # Pending review queue
│   ├── CompletedReviews.tsx        # Review history
│   └── ReviewerStats.tsx           # Performance metrics
├── IdeaReview/
│   ├── IdeaReviewInterface.tsx     # Main review interface
│   ├── ReviewForm.tsx              # Structured review form
│   ├── CriteriaEvaluation.tsx      # Scoring criteria
│   ├── ReviewComments.tsx          # Detailed feedback
│   └── ReviewSubmission.tsx        # Final review submission
├── Governance/
│   ├── GovernanceProposals.tsx     # List of governance proposals
│   ├── ProposalDetails.tsx         # Individual proposal view
│   ├── VotingInterface.tsx         # Voting mechanism
│   ├── ProposalCreation.tsx        # Create new proposals
│   └── VotingHistory.tsx           # User's voting record
├── ReviewManagement/
│   ├── ReviewAssignment.tsx        # Assign reviewers to ideas
│   ├── ReviewProgress.tsx          # Track review progress
│   ├── ConflictResolution.tsx      # Handle review conflicts
│   └── ReviewAnalytics.tsx         # Review system analytics
└── Shared/
    ├── ReviewStatusBadge.tsx       # Review status indicators
    ├── VotingPower.tsx             # Display voting power
    ├── ReviewTimeline.tsx          # Review process timeline
    └── ReviewerProfile.tsx         # Reviewer information
```

---

## 🔧 Core Review Components

### **1. Reviewer Dashboard**

```typescript
// ReviewerDashboard/ReviewerDashboard.tsx
export const ReviewerDashboard: React.FC = () => {
  const { address } = useWalletContext();
  const { checkAccessLevel } = useAttestationVault();
  const { getAllIdeaIds, getIdea, voteOnIdea } = useSparkIdeaRegistry();
  const [assignedIdeas, setAssignedIdeas] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({
    totalAssigned: 0,
    completed: 0,
    pending: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyReviewerAccess();
    loadReviewerData();
  }, [address]);

  const verifyReviewerAccess = async () => {
    const isReviewer = await checkAccessLevel(address, 'REVIEWER_ROLE');
    if (!isReviewer) {
      throw new InsufficientPermissionsError('review ideas', 'REVIEWER_ROLE');
    }
  };

  const loadReviewerData = async () => {
    try {
      setLoading(true);
      
      // Get all ideas in review status
      const allIdeaIds = await getAllIdeaIds();
      const reviewIdeas = [];
      
      for (const ideaId of allIdeaIds) {
        try {
          const idea = await getIdea(ideaId);
          if (idea.approvalStatus === 'Pending') {
            // Check if reviewer has NDA access
            const hasNDAAccess = await checkAccessLevel(
              address, 
              NDAAthestationLevel.IDEA_SPECIFIC_NDA, 
              ideaId
            );
            
            if (hasNDAAccess) {
              const reviewStatus = await getReviewStatus(ideaId, address);
              reviewIdeas.push({
                ...idea,
                reviewStatus,
                canReview: true
              });
            }
          }
        } catch (error) {
          console.warn(`Cannot access idea ${ideaId} for review:`, error);
        }
      }

      setAssignedIdeas(reviewIdeas);
      
      // Calculate stats
      const stats = calculateReviewStats(reviewIdeas);
      setReviewStats(stats);
      
    } catch (error) {
      handleError(error, 'Loading reviewer data');
    } finally {
      setLoading(false);
    }
  };

  const calculateReviewStats = (ideas: any[]) => {
    const completed = ideas.filter(idea => idea.reviewStatus === 'completed').length;
    const pending = ideas.filter(idea => idea.reviewStatus === 'pending').length;
    
    return {
      totalAssigned: ideas.length,
      completed,
      pending,
      averageScore: 0 // Calculate from completed reviews
    };
  };

  if (loading) {
    return <ReviewerDashboardSkeleton />;
  }

  return (
    <AccessGate requiredRole="REVIEWER_ROLE">
      <div className="reviewer-dashboard">
        <div className="dashboard-header">
          <h1>Reviewer Dashboard</h1>
          <p className="text-gray-600">
            Review and evaluate research ideas submitted to the Spark platform
          </p>
        </div>

        <div className="dashboard-stats">
          <StatCard
            title="Total Assigned"
            value={reviewStats.totalAssigned}
            icon="📋"
            description="Ideas assigned for review"
          />
          <StatCard
            title="Completed Reviews"
            value={reviewStats.completed}
            icon="✅"
            description="Reviews completed"
          />
          <StatCard
            title="Pending Reviews"
            value={reviewStats.pending}
            icon="⏳"
            description="Reviews awaiting completion"
            urgent={reviewStats.pending > 5}
          />
          <StatCard
            title="Average Score"
            value={reviewStats.averageScore.toFixed(1)}
            icon="⭐"
            description="Average review score given"
          />
        </div>

        <div className="dashboard-content">
          <div className="review-sections">
            <ReviewSection title="Pending Reviews" urgent>
              <AssignedIdeas
                ideas={assignedIdeas.filter(idea => idea.reviewStatus === 'pending')}
                onReviewComplete={loadReviewerData}
              />
            </ReviewSection>

            <ReviewSection title="In Progress">
              <AssignedIdeas
                ideas={assignedIdeas.filter(idea => idea.reviewStatus === 'in_progress')}
                onReviewComplete={loadReviewerData}
              />
            </ReviewSection>

            <ReviewSection title="Completed Reviews">
              <CompletedReviews
                ideas={assignedIdeas.filter(idea => idea.reviewStatus === 'completed')}
              />
            </ReviewSection>
          </div>
        </div>
      </div>
    </AccessGate>
  );
};
```

### **2. Idea Review Interface**

```typescript
// IdeaReview/IdeaReviewInterface.tsx
interface IdeaReviewProps {
  ideaId: string;
  onReviewComplete?: () => void;
}

export const IdeaReviewInterface: React.FC<IdeaReviewProps> = ({
  ideaId,
  onReviewComplete
}) => {
  const { address } = useWalletContext();
  const { getIdea, voteOnIdea } = useSparkIdeaRegistry();
  const { checkAccessLevel } = useAttestationVault();
  const [idea, setIdea] = useState<any>(null);
  const [reviewData, setReviewData] = useState<ReviewDecision>({
    ideaId,
    reviewerAddress: address,
    vote: VoteType.ABSTAIN,
    comments: '',
    criteria: {
      novelty: 0,
      feasibility: 0,
      impact: 0,
      clarity: 0,
      methodology: 0
    },
    timestamp: 0,
    ndaAttested: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const reviewSteps = [
    'Idea Review',
    'Criteria Evaluation', 
    'Comments & Feedback',
    'Final Decision'
  ];

  useEffect(() => {
    loadIdeaForReview();
  }, [ideaId]);

  const loadIdeaForReview = async () => {
    try {
      // Verify reviewer has access
      const isReviewer = await checkAccessLevel(address, 'REVIEWER_ROLE');
      if (!isReviewer) {
        throw new InsufficientPermissionsError('review ideas', 'REVIEWER_ROLE');
      }

      // Verify NDA access to idea
      const hasNDAAccess = await checkAccessLevel(
        address, 
        NDAAthestationLevel.IDEA_SPECIFIC_NDA, 
        ideaId
      );
      if (!hasNDAAccess) {
        throw new NDAAthestationRequiredError(
          NDAAthestationLevel.IDEA_SPECIFIC_NDA, 
          ideaId
        );
      }

      const ideaData = await getIdea(ideaId);
      setIdea(ideaData);
      
      setReviewData(prev => ({
        ...prev,
        ndaAttested: true
      }));

    } catch (error) {
      handleError(error, 'Loading idea for review');
    }
  };

  const handleCriteriaChange = (criterion: keyof ReviewCriteria, value: number) => {
    setReviewData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria,
        [criterion]: value
      }
    }));
  };

  const calculateOverallScore = () => {
    const { novelty, feasibility, impact, clarity, methodology } = reviewData.criteria;
    return (novelty + feasibility + impact + clarity + methodology) / 5;
  };

  const handleReviewSubmission = async () => {
    if (!validateReview()) return;

    setIsSubmitting(true);
    try {
      // Determine vote based on overall score
      const overallScore = calculateOverallScore();
      const vote = overallScore >= 3.5 ? VoteType.APPROVE : 
                   overallScore >= 2.5 ? VoteType.REQUEST_CHANGES : 
                   VoteType.REJECT;

      // Submit vote to blockchain
      const support = vote === VoteType.APPROVE;
      await voteOnIdea(ideaId, support);

      // Store detailed review data off-chain
      await storeReviewData({
        ...reviewData,
        vote,
        timestamp: Date.now()
      });

      showSuccessNotification('Review submitted successfully!');
      onReviewComplete?.();

    } catch (error) {
      handleError(error, 'Submitting review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateReview = (): boolean => {
    const errors: string[] = [];

    // Check all criteria are scored
    Object.entries(reviewData.criteria).forEach(([key, value]) => {
      if (value === 0) {
        errors.push(`Please score ${key}`);
      }
    });

    if (!reviewData.comments.trim()) {
      errors.push('Please provide review comments');
    }

    if (reviewData.comments.length < 50) {
      errors.push('Review comments must be at least 50 characters');
    }

    if (errors.length > 0) {
      showErrorNotification(`Please fix the following:\n${errors.join('\n')}`);
      return false;
    }

    return true;
  };

  if (!idea) {
    return <ReviewLoadingSkeleton />;
  }

  return (
    <div className="idea-review-interface">
      <div className="review-header">
        <h1>Review Research Idea</h1>
        <ReviewProgressIndicator 
          steps={reviewSteps}
          currentStep={currentStep}
        />
      </div>

      <div className="review-content">
        {currentStep === 0 && (
          <IdeaReviewStep
            idea={idea}
            onNext={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 1 && (
          <CriteriaEvaluation
            criteria={reviewData.criteria}
            onChange={handleCriteriaChange}
            onNext={() => setCurrentStep(2)}
            onBack={() => setCurrentStep(0)}
          />
        )}

        {currentStep === 2 && (
          <ReviewComments
            comments={reviewData.comments}
            onChange={(comments) => setReviewData(prev => ({ ...prev, comments }))}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <ReviewSubmission
            reviewData={reviewData}
            overallScore={calculateOverallScore()}
            onSubmit={handleReviewSubmission}
            onBack={() => setCurrentStep(2)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
};
```

### **3. Criteria Evaluation Component**

```typescript
// IdeaReview/CriteriaEvaluation.tsx
interface CriteriaEvaluationProps {
  criteria: ReviewCriteria;
  onChange: (criterion: keyof ReviewCriteria, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CriteriaEvaluation: React.FC<CriteriaEvaluationProps> = ({
  criteria,
  onChange,
  onNext,
  onBack
}) => {
  const criteriaDefinitions = {
    novelty: {
      title: 'Novelty & Originality',
      description: 'How original and innovative is this research idea?',
      scale: [
        'Not novel - well-established concept',
        'Slightly novel - minor variations',
        'Moderately novel - some new aspects',
        'Highly novel - significant innovation',
        'Extremely novel - groundbreaking concept'
      ]
    },
    feasibility: {
      title: 'Technical Feasibility',
      description: 'How realistic is it to implement this research?',
      scale: [
        'Not feasible with current technology',
        'Challenging - requires major breakthroughs',
        'Moderately feasible - some challenges',
        'Highly feasible - clear path forward',
        'Extremely feasible - ready to implement'
      ]
    },
    impact: {
      title: 'Potential Impact',
      description: 'What is the potential scientific and societal impact?',
      scale: [
        'Limited impact - narrow application',
        'Minor impact - specific field benefit',
        'Moderate impact - broader field benefit',
        'High impact - cross-disciplinary benefit',
        'Transformative impact - paradigm shifting'
      ]
    },
    clarity: {
      title: 'Clarity & Communication',
      description: 'How well is the idea explained and communicated?',
      scale: [
        'Very unclear - difficult to understand',
        'Somewhat unclear - missing details',
        'Moderately clear - generally understandable',
        'Very clear - well explained',
        'Extremely clear - excellent communication'
      ]
    },
    methodology: {
      title: 'Methodology & Approach',
      description: 'How sound is the proposed research methodology?',
      scale: [
        'Poor methodology - major flaws',
        'Weak methodology - some issues',
        'Adequate methodology - acceptable approach',
        'Strong methodology - well designed',
        'Excellent methodology - rigorous approach'
      ]
    }
  };

  const allCriteriaScored = Object.values(criteria).every(score => score > 0);

  return (
    <div className="criteria-evaluation">
      <div className="evaluation-header">
        <h2>Evaluate Research Criteria</h2>
        <p className="text-gray-600">
          Please score each criterion on a scale of 1-5 based on the definitions below.
        </p>
      </div>

      <div className="criteria-list">
        {Object.entries(criteriaDefinitions).map(([key, definition]) => (
          <CriterionCard
            key={key}
            criterion={key as keyof ReviewCriteria}
            definition={definition}
            currentScore={criteria[key as keyof ReviewCriteria]}
            onChange={(value) => onChange(key as keyof ReviewCriteria, value)}
          />
        ))}
      </div>

      <div className="evaluation-summary">
        <div className="overall-score">
          <h3>Overall Score</h3>
          <div className="score-display">
            {allCriteriaScored ? (
              <span className="score-value">
                {(Object.values(criteria).reduce((a, b) => a + b, 0) / 5).toFixed(1)}/5.0
              </span>
            ) : (
              <span className="score-pending">Complete all criteria</span>
            )}
          </div>
        </div>
      </div>

      <div className="evaluation-actions">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={!allCriteriaScored}
        >
          Continue to Comments
        </Button>
      </div>
    </div>
  );
};

const CriterionCard: React.FC<{
  criterion: keyof ReviewCriteria;
  definition: any;
  currentScore: number;
  onChange: (value: number) => void;
}> = ({ criterion, definition, currentScore, onChange }) => {
  return (
    <Card className="criterion-card">
      <CardHeader>
        <h3 className="criterion-title">{definition.title}</h3>
        <p className="criterion-description">{definition.description}</p>
      </CardHeader>
      
      <CardContent>
        <div className="score-selector">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              className={`score-button ${currentScore === score ? 'selected' : ''}`}
              onClick={() => onChange(score)}
            >
              <span className="score-number">{score}</span>
              <span className="score-label">{definition.scale[score - 1]}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### **4. Governance Voting Interface**

```typescript
// Governance/VotingInterface.tsx
interface VotingInterfaceProps {
  proposalId: string;
  proposal: any;
  onVoteComplete?: () => void;
}

export const VotingInterface: React.FC<VotingInterfaceProps> = ({
  proposalId,
  proposal,
  onVoteComplete
}) => {
  const { address } = useWalletContext();
  const { castVote, hasVoted, getVotes } = useGovernorResearch();
  const [votingPower, setVotingPower] = useState(0);
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteReason, setVoteReason] = useState('');

  const voteOptions = [
    { value: 0, label: 'Against', description: 'Vote against this proposal', color: 'red' },
    { value: 1, label: 'For', description: 'Vote in favor of this proposal', color: 'green' },
    { value: 2, label: 'Abstain', description: 'Abstain from voting', color: 'gray' }
  ];

  useEffect(() => {
    loadVotingData();
  }, [proposalId, address]);

  const loadVotingData = async () => {
    try {
      // Check if user has already voted
      const voted = await hasVoted(proposalId, address);
      setHasUserVoted(voted);

      // Get user's voting power
      const power = await getVotes(address);
      setVotingPower(power);

    } catch (error) {
      console.error('Failed to load voting data:', error);
    }
  };

  const handleVoteSubmission = async () => {
    if (selectedVote === null) {
      showErrorNotification('Please select a vote option');
      return;
    }

    setIsVoting(true);
    try {
      await castVote(proposalId, selectedVote);
      
      // Store vote reason off-chain if provided
      if (voteReason.trim()) {
        await storeVoteReason({
          proposalId,
          voterAddress: address,
          vote: selectedVote,
          reason: voteReason,
          timestamp: Date.now()
        });
      }

      showSuccessNotification('Vote cast successfully!');
      onVoteComplete?.();

    } catch (error) {
      handleError(error, 'Casting vote');
    } finally {
      setIsVoting(false);
    }
  };

  if (hasUserVoted) {
    return (
      <div className="voting-complete">
        <Alert variant="info">
          <CheckCircle className="h-4 w-4" />
          <span>You have already voted on this proposal</span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="voting-interface">
      <div className="voting-header">
        <h3>Cast Your Vote</h3>
        <div className="voting-power">
          <span className="power-label">Your Voting Power:</span>
          <span className="power-value">{votingPower.toLocaleString()}</span>
        </div>
      </div>

      <div className="vote-options">
        {voteOptions.map(option => (
          <VoteOptionCard
            key={option.value}
            option={option}
            selected={selectedVote === option.value}
            onSelect={() => setSelectedVote(option.value)}
          />
        ))}
      </div>

      <div className="vote-reason">
        <FormField label="Reason for Vote (Optional)">
          <textarea
            value={voteReason}
            onChange={(e) => setVoteReason(e.target.value)}
            placeholder="Explain your reasoning for this vote..."
            rows={4}
            maxLength={1000}
          />
          <CharacterCount current={voteReason.length} max={1000} />
        </FormField>
      </div>

      <div className="voting-actions">
        <Button
          onClick={handleVoteSubmission}
          disabled={selectedVote === null || isVoting}
          loading={isVoting}
          className="w-full"
        >
          {isVoting ? 'Casting Vote...' : 'Cast Vote'}
        </Button>
      </div>

      <div className="voting-info">
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <strong>Important:</strong> Votes are permanent and cannot be changed once submitted.
          </span>
        </Alert>
      </div>
    </div>
  );
};

const VoteOptionCard: React.FC<{
  option: any;
  selected: boolean;
  onSelect: () => void;
}> = ({ option, selected, onSelect }) => (
  <Card 
    className={`vote-option-card ${selected ? 'selected' : ''} ${option.color}`}
    onClick={onSelect}
  >
    <CardContent className="vote-option-content">
      <div className="option-header">
        <span className="option-label">{option.label}</span>
        {selected && <CheckCircle className="h-5 w-5" />}
      </div>
      <p className="option-description">{option.description}</p>
    </CardContent>
  </Card>
);
```

---

## 🧪 Testing Guidelines

### **Review System Testing**

```typescript
// __tests__/components/IdeaReviewInterface.test.tsx
describe('IdeaReviewInterface', () => {
  beforeEach(() => {
    mockUseAttestationVault.mockReturnValue({
      checkAccessLevel: jest.fn().mockResolvedValue(true)
    });
    
    mockUseSparkIdeaRegistry.mockReturnValue({
      getIdea: jest.fn().mockResolvedValue({
        ideaId: 'test-idea',
        title: 'Test Idea',
        approvalStatus: 'Pending'
      }),
      voteOnIdea: jest.fn().mockResolvedValue({})
    });
  });

  test('loads idea for review with proper access control', async () => {
    render(<IdeaReviewInterface ideaId="test-idea" />);
    
    await waitFor(() => {
      expect(screen.getByText('Review Research Idea')).toBeInTheDocument();
    });
  });

  test('validates review criteria before submission', async () => {
    render(<IdeaReviewInterface ideaId="test-idea" />);
    
    // Navigate to submission without completing criteria
    // Should show validation errors
  });
});
```

---

## ✅ Implementation Checklist

### **🚨 DAO Integration Requirements (CRITICAL)**
- [ ] Import and use existing PoSciDonDAO governance hooks
- [ ] Integrate with GovernorResearch contract (0x965BAd9a732A5F817c81604657a8A9B4c54A7D19)
- [ ] Use existing voting power calculation
- [ ] Leverage existing proposal creation patterns
- [ ] Maintain compatibility with current DAO voting UI

### **Core Review Features**
- [ ] Reviewer dashboard with DAO integration
- [ ] Structured review interface with criteria
- [ ] Review submission that creates DAO proposals
- [ ] Integration with existing governance timeline

### **Governance Features**
- [ ] Display active Spark proposals from DAO
- [ ] Use existing DAO voting interface
- [ ] Show DAO voting power prominently
- [ ] Integrate with existing proposal execution

### **Access Control Features**
- [ ] Reviewer role verification
- [ ] NDA-protected idea access
- [ ] DAO voting power display
- [ ] Permission-based UI rendering

**🚨 CRITICAL REMINDER:** This module must NOT create parallel governance systems. It extends and integrates with the existing PoSciDonDAO governance infrastructure to ensure consistency and avoid fragmentation of the DAO's decision-making processes. 