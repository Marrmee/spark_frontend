# Module 08: Analytics & Reporting Implementation

## 📋 Overview & Objectives

The Analytics & Reporting module provides comprehensive insights, metrics, and data visualization for the Spark platform. It tracks platform performance, user engagement, research trends, and economic indicators to support data-driven decision making.

### **Key Responsibilities**
- Platform-wide analytics and KPI tracking
- Research trend analysis and insights
- User engagement and behavior analytics
- Economic metrics and revenue tracking
- Custom reporting and data export capabilities

---

## 📊 Analytics Architecture

### **Analytics Data Structure**
```typescript
// Platform-wide metrics
interface PlatformAnalytics {
  ideas: {
    totalSubmitted: number;
    totalApproved: number;
    totalRejected: number;
    averageReviewTime: number;
    submissionTrends: TimeSeriesData[];
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    reviewers: number;
    userGrowth: TimeSeriesData[];
  };
  governance: {
    totalProposals: number;
    averageVotingParticipation: number;
    votingTrends: TimeSeriesData[];
  };
  ipnft: {
    totalMinted: number;
    totalRevenue: bigint;
    licensingActivity: TimeSeriesData[];
  };
}

// Research category analytics
interface ResearchAnalytics {
  categories: {
    [category: string]: {
      totalIdeas: number;
      approvalRate: number;
      averageScore: number;
      trendDirection: 'up' | 'down' | 'stable';
    };
  };
  tags: {
    [tag: string]: {
      frequency: number;
      successRate: number;
      recentTrend: 'rising' | 'declining' | 'stable';
    };
  };
}

// User-specific analytics
interface UserAnalytics {
  ideaSubmissions: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    successRate: number;
  };
  reviewActivity: {
    totalReviews: number;
    averageScore: number;
    reviewAccuracy: number;
  };
  ipnftPortfolio: {
    totalNFTs: number;
    totalRevenue: bigint;
    averageRoyalty: number;
  };
}
```

---

## 🎨 Component Architecture

### **Component Structure**
```
src/app/components/spark/analytics/
├── Dashboard/
│   ├── AnalyticsDashboard.tsx      # Main analytics dashboard
│   ├── KPICards.tsx                # Key performance indicators
│   ├── TrendCharts.tsx             # Trend visualization
│   ├── PlatformOverview.tsx        # High-level platform metrics
│   └── QuickInsights.tsx           # Actionable insights
├── Research/
│   ├── ResearchAnalytics.tsx       # Research-focused analytics
│   ├── CategoryAnalysis.tsx        # Category performance analysis
│   ├── TagTrendAnalysis.tsx        # Tag and topic trends
│   ├── ReviewerInsights.tsx        # Reviewer performance metrics
│   └── IdeaSuccessFactors.tsx      # Success factor analysis
├── Economic/
│   ├── EconomicDashboard.tsx       # Economic metrics dashboard
│   ├── RevenueAnalytics.tsx        # Revenue tracking and analysis
│   ├── LicensingMetrics.tsx        # Licensing performance
│   ├── RoyaltyDistribution.tsx     # Royalty analytics
│   └── MarketTrends.tsx            # Market trend analysis
├── User/
│   ├── UserAnalytics.tsx           # Individual user analytics
│   ├── EngagementMetrics.tsx       # User engagement tracking
│   ├── PerformanceInsights.tsx     # Personal performance insights
│   └── GoalTracking.tsx            # User goal and milestone tracking
├── Reporting/
│   ├── ReportBuilder.tsx           # Custom report creation
│   ├── ReportTemplates.tsx         # Pre-built report templates
│   ├── DataExport.tsx              # Data export functionality
│   └── ScheduledReports.tsx        # Automated reporting
└── Shared/
    ├── ChartComponents.tsx         # Reusable chart components
    ├── DataVisualization.tsx       # Advanced visualizations
    ├── MetricCard.tsx              # Metric display components
    └── AnalyticsUtils.tsx          # Analytics utility functions
```

---

## 🔧 Core Analytics Components

### **1. Main Analytics Dashboard**

```typescript
// Dashboard/AnalyticsDashboard.tsx
export const AnalyticsDashboard: React.FC = () => {
  const { address } = useWalletContext();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analyticsData, setAnalyticsData] = useState<PlatformAnalytics | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'reviewer' | 'admin'>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    determineUserRole();
    loadAnalyticsData();
  }, [address, timeRange]);

  const determineUserRole = async () => {
    try {
      const { checkAccessLevel } = useAttestationVault();
      
      if (await checkAccessLevel(address, 'ADMIN_ROLE')) {
        setUserRole('admin');
      } else if (await checkAccessLevel(address, 'REVIEWER_ROLE')) {
        setUserRole('reviewer');
      } else {
        setUserRole('user');
      }
    } catch (error) {
      console.error('Failed to determine user role:', error);
      setUserRole('user');
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load different data based on user role
      let data;
      switch (userRole) {
        case 'admin':
          data = await loadPlatformAnalytics(timeRange);
          break;
        case 'reviewer':
          data = await loadReviewerAnalytics(address, timeRange);
          break;
        default:
          data = await loadUserAnalytics(address, timeRange);
      }
      
      setAnalyticsData(data);
    } catch (error) {
      handleError(error, 'Loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AnalyticsDashboardSkeleton />;
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>Spark Analytics</h1>
        <div className="dashboard-controls">
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '1y', label: 'Last year' }
            ]}
          />
          
          {userRole === 'admin' && (
            <Button
              variant="outline"
              onClick={() => router.push('/spark/analytics/reports')}
            >
              Custom Reports
            </Button>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Role-specific dashboard layouts */}
        {userRole === 'admin' && (
          <AdminAnalyticsDashboard 
            data={analyticsData}
            timeRange={timeRange}
          />
        )}

        {userRole === 'reviewer' && (
          <ReviewerAnalyticsDashboard 
            data={analyticsData}
            timeRange={timeRange}
          />
        )}

        {userRole === 'user' && (
          <UserAnalyticsDashboard 
            data={analyticsData}
            timeRange={timeRange}
          />
        )}
      </div>
    </div>
  );
};
```

### **2. Admin Analytics Dashboard**

```typescript
// Dashboard/AdminAnalyticsDashboard.tsx
export const AdminAnalyticsDashboard: React.FC<{
  data: PlatformAnalytics;
  timeRange: string;
}> = ({ data, timeRange }) => {
  const [selectedMetric, setSelectedMetric] = useState<'ideas' | 'users' | 'governance' | 'economic'>('ideas');

  return (
    <div className="admin-analytics-dashboard">
      {/* Platform-wide KPIs */}
      <div className="kpi-section">
        <h2>Platform Overview</h2>
        <div className="kpi-grid">
          <KPICard
            title="Total Ideas"
            value={data.ideas.totalSubmitted}
            change={calculateChange(data.ideas.submissionTrends)}
            trend="up"
            icon="💡"
          />
          <KPICard
            title="Active Users"
            value={data.users.activeUsers}
            change={calculateChange(data.users.userGrowth)}
            trend="up"
            icon="👥"
          />
          <KPICard
            title="Approval Rate"
            value={`${((data.ideas.totalApproved / data.ideas.totalSubmitted) * 100).toFixed(1)}%`}
            change={calculateApprovalRateChange(data.ideas)}
            trend="stable"
            icon="✅"
          />
          <KPICard
            title="IP-NFT Revenue"
            value={`${formatEther(data.ipnft.totalRevenue)} ETH`}
            change={calculateRevenueChange(data.ipnft.licensingActivity)}
            trend="up"
            icon="💰"
          />
        </div>
      </div>

      {/* Metric Selection */}
      <div className="metric-selector">
        <MetricTabs
          metrics={[
            { id: 'ideas', label: 'Research Ideas', icon: '💡' },
            { id: 'users', label: 'Users & Engagement', icon: '👥' },
            { id: 'governance', label: 'Governance', icon: '🗳️' },
            { id: 'economic', label: 'Economic Metrics', icon: '💰' }
          ]}
          selected={selectedMetric}
          onSelect={setSelectedMetric}
        />
      </div>

      {/* Detailed Analytics */}
      <div className="detailed-analytics">
        {selectedMetric === 'ideas' && (
          <IdeaAnalyticsPanel data={data.ideas} timeRange={timeRange} />
        )}
        
        {selectedMetric === 'users' && (
          <UserAnalyticsPanel data={data.users} timeRange={timeRange} />
        )}
        
        {selectedMetric === 'governance' && (
          <GovernanceAnalyticsPanel data={data.governance} timeRange={timeRange} />
        )}
        
        {selectedMetric === 'economic' && (
          <EconomicAnalyticsPanel data={data.ipnft} timeRange={timeRange} />
        )}
      </div>

      {/* Quick Insights */}
      <div className="insights-section">
        <QuickInsights
          data={data}
          timeRange={timeRange}
          insights={generateAdminInsights(data)}
        />
      </div>
    </div>
  );
};
```

### **3. Research Analytics Panel**

```typescript
// Research/ResearchAnalytics.tsx
export const ResearchAnalytics: React.FC = () => {
  const [researchData, setResearchData] = useState<ResearchAnalytics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'categories' | 'tags' | 'trends'>('overview');

  useEffect(() => {
    loadResearchAnalytics();
  }, [selectedCategory]);

  const loadResearchAnalytics = async () => {
    try {
      const data = await fetchResearchAnalytics(selectedCategory);
      setResearchData(data);
    } catch (error) {
      handleError(error, 'Loading research analytics');
    }
  };

  if (!researchData) {
    return <ResearchAnalyticsSkeleton />;
  }

  return (
    <div className="research-analytics">
      <div className="analytics-header">
        <h2>Research Analytics</h2>
        <div className="analytics-controls">
          <CategoryFilter
            categories={Object.keys(researchData.categories)}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
          
          <ViewModeSelector
            modes={[
              { id: 'overview', label: 'Overview' },
              { id: 'categories', label: 'Categories' },
              { id: 'tags', label: 'Tags' },
              { id: 'trends', label: 'Trends' }
            ]}
            selected={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      <div className="analytics-content">
        {viewMode === 'overview' && (
          <ResearchOverview data={researchData} />
        )}

        {viewMode === 'categories' && (
          <CategoryAnalysis 
            categories={researchData.categories}
            selectedCategory={selectedCategory}
          />
        )}

        {viewMode === 'tags' && (
          <TagTrendAnalysis 
            tags={researchData.tags}
          />
        )}

        {viewMode === 'trends' && (
          <ResearchTrendAnalysis data={researchData} />
        )}
      </div>
    </div>
  );
};

const CategoryAnalysis: React.FC<{
  categories: ResearchAnalytics['categories'];
  selectedCategory: string;
}> = ({ categories, selectedCategory }) => {
  const categoryData = selectedCategory === 'all' 
    ? Object.entries(categories)
    : [[selectedCategory, categories[selectedCategory]]];

  return (
    <div className="category-analysis">
      <div className="category-performance-grid">
        {categoryData.map(([category, data]) => (
          <CategoryPerformanceCard
            key={category}
            category={category}
            data={data}
          />
        ))}
      </div>

      <div className="category-comparison">
        <CategoryComparisonChart
          categories={categories}
          metrics={['totalIdeas', 'approvalRate', 'averageScore']}
        />
      </div>

      <div className="category-insights">
        <CategoryInsights categories={categories} />
      </div>
    </div>
  );
};
```

### **4. User Analytics Dashboard**

```typescript
// User/UserAnalytics.tsx
export const UserAnalyticsDashboard: React.FC<{
  data: UserAnalytics;
  timeRange: string;
}> = ({ data, timeRange }) => {
  const [focusArea, setFocusArea] = useState<'ideas' | 'reviews' | 'portfolio' | 'goals'>('ideas');

  return (
    <div className="user-analytics-dashboard">
      {/* Personal Performance Overview */}
      <div className="performance-overview">
        <h2>Your Performance</h2>
        <div className="performance-grid">
          <PersonalMetricCard
            title="Ideas Submitted"
            value={data.ideaSubmissions.total}
            subtitle={`${data.ideaSubmissions.approved} approved`}
            icon="💡"
            trend={calculateIdeaTrend(data.ideaSubmissions)}
          />
          
          <PersonalMetricCard
            title="Success Rate"
            value={`${(data.ideaSubmissions.successRate * 100).toFixed(1)}%`}
            subtitle="Idea approval rate"
            icon="🎯"
            trend={calculateSuccessRateTrend(data.ideaSubmissions)}
          />

          {data.reviewActivity.totalReviews > 0 && (
            <PersonalMetricCard
              title="Reviews Completed"
              value={data.reviewActivity.totalReviews}
              subtitle={`Avg score: ${data.reviewActivity.averageScore.toFixed(1)}`}
              icon="📝"
              trend={calculateReviewTrend(data.reviewActivity)}
            />
          )}

          {data.ipnftPortfolio.totalNFTs > 0 && (
            <PersonalMetricCard
              title="IP-NFT Revenue"
              value={`${formatEther(data.ipnftPortfolio.totalRevenue)} ETH`}
              subtitle={`${data.ipnftPortfolio.totalNFTs} NFTs`}
              icon="💰"
              trend={calculatePortfolioTrend(data.ipnftPortfolio)}
            />
          )}
        </div>
      </div>

      {/* Focus Area Navigation */}
      <div className="focus-navigation">
        <FocusAreaTabs
          areas={[
            { id: 'ideas', label: 'My Ideas', count: data.ideaSubmissions.total },
            { id: 'reviews', label: 'Reviews', count: data.reviewActivity.totalReviews },
            { id: 'portfolio', label: 'Portfolio', count: data.ipnftPortfolio.totalNFTs },
            { id: 'goals', label: 'Goals & Insights' }
          ]}
          selected={focusArea}
          onSelect={setFocusArea}
        />
      </div>

      {/* Detailed Focus Area Content */}
      <div className="focus-content">
        {focusArea === 'ideas' && (
          <IdeaPerformanceAnalysis 
            data={data.ideaSubmissions}
            timeRange={timeRange}
          />
        )}

        {focusArea === 'reviews' && (
          <ReviewPerformanceAnalysis 
            data={data.reviewActivity}
            timeRange={timeRange}
          />
        )}

        {focusArea === 'portfolio' && (
          <PortfolioAnalysis 
            data={data.ipnftPortfolio}
            timeRange={timeRange}
          />
        )}

        {focusArea === 'goals' && (
          <GoalTrackingAnalysis 
            userData={data}
            timeRange={timeRange}
          />
        )}
      </div>

      {/* Personalized Insights */}
      <div className="personal-insights">
        <PersonalInsights
          data={data}
          insights={generatePersonalInsights(data)}
        />
      </div>
    </div>
  );
};
```

### **5. Report Builder**

```typescript
// Reporting/ReportBuilder.tsx
export const ReportBuilder: React.FC = () => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: '',
    description: '',
    dataSource: 'platform',
    metrics: [],
    timeRange: '30d',
    filters: {},
    visualizations: [],
    schedule: null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const report = await buildCustomReport(reportConfig);
      setPreviewData(report);
      
      // Optionally save report template
      if (reportConfig.title) {
        await saveReportTemplate(reportConfig);
      }

    } catch (error) {
      handleError(error, 'Generating report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const exportData = await exportReportData(previewData, format);
      downloadFile(exportData, `spark-report.${format}`);
      
      showSuccessNotification(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      handleError(error, 'Exporting report');
    }
  };

  return (
    <div className="report-builder">
      <div className="builder-header">
        <h1>Custom Report Builder</h1>
        <p className="text-gray-600">
          Create custom analytics reports for your specific needs
        </p>
      </div>

      <div className="builder-layout">
        <div className="builder-sidebar">
          <ReportConfigPanel
            config={reportConfig}
            onChange={setReportConfig}
          />
        </div>

        <div className="builder-content">
          <div className="report-preview">
            {previewData ? (
              <ReportPreview 
                data={previewData}
                config={reportConfig}
                onExport={exportReport}
              />
            ) : (
              <EmptyReportState
                onGenerate={generateReport}
                isGenerating={isGenerating}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportConfigPanel: React.FC<{
  config: ReportConfig;
  onChange: (config: ReportConfig) => void;
}> = ({ config, onChange }) => {
  return (
    <div className="report-config-panel">
      <div className="config-section">
        <h3>Report Details</h3>
        <FormField label="Report Title">
          <input
            value={config.title}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
            placeholder="Enter report title"
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={config.description}
            onChange={(e) => onChange({ ...config, description: e.target.value })}
            placeholder="Describe the purpose of this report"
            rows={3}
          />
        </FormField>
      </div>

      <div className="config-section">
        <h3>Data Source</h3>
        <DataSourceSelector
          selected={config.dataSource}
          onChange={(dataSource) => onChange({ ...config, dataSource })}
        />
      </div>

      <div className="config-section">
        <h3>Metrics</h3>
        <MetricSelector
          selected={config.metrics}
          onChange={(metrics) => onChange({ ...config, metrics })}
          dataSource={config.dataSource}
        />
      </div>

      <div className="config-section">
        <h3>Time Range</h3>
        <TimeRangeSelector
          value={config.timeRange}
          onChange={(timeRange) => onChange({ ...config, timeRange })}
        />
      </div>

      <div className="config-section">
        <h3>Visualizations</h3>
        <VisualizationSelector
          selected={config.visualizations}
          onChange={(visualizations) => onChange({ ...config, visualizations })}
          metrics={config.metrics}
        />
      </div>
    </div>
  );
};
```

---

## 🧪 Testing Guidelines

### **Analytics Testing**

```typescript
// __tests__/components/AnalyticsDashboard.test.tsx
describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    mockAnalyticsAPI.mockResolvedValue({
      ideas: { totalSubmitted: 100, totalApproved: 80 },
      users: { totalUsers: 50, activeUsers: 30 }
    });
  });

  test('loads analytics data based on user role', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Spark Analytics')).toBeInTheDocument();
    });
  });

  test('updates data when time range changes', async () => {
    render(<AnalyticsDashboard />);
    
    fireEvent.click(screen.getByText('Last 90 days'));
    
    await waitFor(() => {
      expect(mockAnalyticsAPI).toHaveBeenCalledWith('90d');
    });
  });
});
```

---

## ✅ Implementation Checklist

### **Core Analytics Features**
- [ ] Role-based analytics dashboards
- [ ] Real-time KPI tracking
- [ ] Trend analysis and visualization
- [ ] Research performance metrics

### **Advanced Analytics**
- [ ] Category and tag analysis
- [ ] User engagement tracking
- [ ] Economic performance metrics
- [ ] Predictive insights

### **Reporting Features**
- [ ] Custom report builder
- [ ] Automated report scheduling
- [ ] Multiple export formats
- [ ] Report template library

### **Integration Features**
- [ ] Real-time data synchronization
- [ ] Cross-module analytics
- [ ] Performance optimization
- [ ] Data privacy compliance

Remember: This module provides critical business intelligence. Ensure data accuracy, performance optimization, and user privacy protection. 