# Module 04: Idea Discovery Implementation

## 📋 Overview & Objectives

The Idea Discovery module provides comprehensive browsing, filtering, and search functionality for research ideas in the Spark platform. It implements dynamic NDA-based access control to show users only the content they're authorized to view.

### **Key Responsibilities**
- NDA-aware idea browsing and search
- Dynamic access control enforcement
- Advanced filtering and categorization
- Content preview with access prompts
- Seamless integration with authentication system

---

## 🔍 Discovery Architecture

### **Access-Controlled Content Display**
```typescript
// Content visibility based on NDA attestations
export enum ContentVisibility {
  PUBLIC_METADATA = 'public_metadata',    // Title, category, status (always visible)
  DRAFT_PREVIEW = 'draft_preview',        // Basic info for platform NDA holders
  FULL_CONTENT = 'full_content',          // Complete access for idea-specific NDA
  RESTRICTED = 'restricted'               // No access, show prompt
}

interface IdeaAccessLevel {
  visibility: ContentVisibility;
  canView: boolean;
  canVote: boolean;
  requiredNDA?: NDAAthestationLevel;
  accessPrompt?: string;
}

const getIdeaAccessLevel = async (idea: any, userAddress: string): Promise<IdeaAccessLevel> => {
  const { checkAccessLevel } = useAttestationVault();
  
  // Always show public metadata
  if (idea.approvalStatus === 'Draft') {
    const hasPlatformNDA = await checkAccessLevel(userAddress, NDAAthestationLevel.BOTH_PLATFORM);
    return {
      visibility: hasPlatformNDA ? ContentVisibility.DRAFT_PREVIEW : ContentVisibility.RESTRICTED,
      canView: hasPlatformNDA,
      canVote: false,
      requiredNDA: NDAAthestationLevel.BOTH_PLATFORM,
      accessPrompt: 'Platform NDA required to view draft ideas'
    };
  }
  
  // For Pending/Approved/Rejected ideas, check idea-specific NDA
  const hasIdeaNDA = await checkAccessLevel(userAddress, NDAAthestationLevel.IDEA_SPECIFIC_NDA, idea.ideaId);
  const isReviewer = await checkAccessLevel(userAddress, 'REVIEWER_ROLE');
  
  return {
    visibility: hasIdeaNDA ? ContentVisibility.FULL_CONTENT : ContentVisibility.PUBLIC_METADATA,
    canView: hasIdeaNDA,
    canVote: isReviewer && hasIdeaNDA,
    requiredNDA: NDAAthestationLevel.IDEA_SPECIFIC_NDA,
    accessPrompt: 'Idea-specific NDA required to view full content'
  };
};
```

---

## 🎨 Component Architecture

### **Component Structure**
```
src/app/components/spark/discovery/
├── Browse/
│   ├── IdeaBrowser.tsx              # Main browsing interface
│   ├── IdeaGrid.tsx                 # Grid layout for ideas
│   ├── IdeaList.tsx                 # List layout for ideas
│   ├── IdeaCard.tsx                 # Individual idea card with access control
│   └── AccessControlledCard.tsx     # Card wrapper with NDA prompts
├── Search/
│   ├── IdeaSearch.tsx               # Main search interface
│   ├── SearchFilters.tsx            # Advanced filtering options
│   ├── SearchResults.tsx            # Search results display
│   ├── SavedSearches.tsx            # User's saved search queries
│   └── SearchSuggestions.tsx        # Auto-complete suggestions
├── Filters/
│   ├── FilterSidebar.tsx            # Main filter panel
│   ├── StatusFilter.tsx             # Filter by approval status
│   ├── CategoryFilter.tsx           # Filter by research category
│   ├── DateRangeFilter.tsx          # Filter by submission date
│   ├── TagFilter.tsx                # Filter by tags
│   └── AccessibilityFilter.tsx      # Filter by user's access level
├── Views/
│   ├── IdeaDetailsModal.tsx         # Quick view modal
│   ├── IdeaPreview.tsx              # Content preview with access gates
│   ├── RestrictedContent.tsx        # Placeholder for restricted content
│   └── AccessPrompt.tsx             # NDA signing prompt
└── Shared/
    ├── ViewModeSelector.tsx         # Grid/List view toggle
    ├── SortOptions.tsx              # Sorting controls
    ├── LoadingStates.tsx            # Loading skeletons
    └── EmptyStates.tsx              # No results states
```

---

## 🔧 Core Discovery Components

### **1. Main Idea Browser**

```typescript
// Browse/IdeaBrowser.tsx
interface BrowseFilters {
  status: string[];
  categories: string[];
  tags: string[];
  dateRange: { start?: Date; end?: Date };
  accessLevel: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
}

export const IdeaBrowser: React.FC = () => {
  const { address } = useWalletContext();
  const { getAllIdeaIds, getIdea } = useSparkIdeaRegistry();
  const { checkAccessLevel } = useAttestationVault();
  const { networkInfo, loading: networkLoading } = useNetworkInfo(); // From serverConfig.ts
  
  const [ideas, setIdeas] = useState<any[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<any[]>([]);
  const [filters, setFilters] = useState<BrowseFilters>({
    status: [],
    categories: [],
    tags: [],
    dateRange: {},
    accessLevel: 'all',
    sortBy: 'newest',
    sortOrder: 'desc',
    search: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [userAccessLevels, setUserAccessLevels] = useState<Map<string, IdeaAccessLevel>>(new Map());

  useEffect(() => {
    if (networkInfo) {
      loadIdeas();
    }
  }, [address, networkInfo]);

  useEffect(() => {
    applyFilters();
  }, [ideas, filters]);

  const loadIdeas = async () => {
    if (!networkInfo?.sparkIdeaRegistry) {
      console.error('SparkIdeaRegistry contract address not configured');
      return;
    }

    try {
      setLoading(true);
      
      // Get all idea IDs from the contract configured in serverConfig.ts
      const allIdeaIds = await getAllIdeaIds();
      
      // Load accessible ideas with their access levels
      const loadedIdeas = [];
      const accessMap = new Map();
      
      for (const ideaId of allIdeaIds) {
        try {
          // Try to get basic idea info (this might be restricted)
          const ideaBasicInfo = await getIdeaBasicInfo(ideaId);
          
          // Determine access level for this user
          const accessLevel = await getIdeaAccessLevel(ideaBasicInfo, address);
          accessMap.set(ideaId, accessLevel);
          
          // Add to list if user can see at least metadata
          if (accessLevel.visibility !== ContentVisibility.RESTRICTED) {
            loadedIdeas.push({
              ...ideaBasicInfo,
              accessLevel,
              contractAddress: networkInfo.sparkIdeaRegistry // Include for reference
            });
          }
        } catch (error) {
          // Idea might be completely inaccessible, skip it
          console.debug(`Skipping inaccessible idea ${ideaId}`);
        }
      }

      setIdeas(loadedIdeas);
      setUserAccessLevels(accessMap);
    } catch (error) {
      handleError(error, 'Loading ideas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...ideas];

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(idea => filters.status.includes(idea.approvalStatus));
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(idea => 
        idea.category && filters.categories.includes(idea.category)
      );
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(idea =>
        idea.tags && idea.tags.some(tag => filters.tags.includes(tag))
      );
    }

    // Access level filter
    if (filters.accessLevel !== 'all') {
      filtered = filtered.filter(idea => {
        const access = idea.accessLevel;
        switch (filters.accessLevel) {
          case 'accessible':
            return access.canView;
          case 'restricted':
            return !access.canView;
          case 'voteable':
            return access.canVote;
          default:
            return true;
        }
      });
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(idea => {
        const ideaDate = new Date(idea.submissionTimestamp * 1000);
        if (filters.dateRange.start && ideaDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && ideaDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(idea => {
        // Only search in accessible content
        if (idea.accessLevel.canView) {
          return (
            idea.title?.toLowerCase().includes(searchLower) ||
            idea.description?.toLowerCase().includes(searchLower) ||
            idea.tags?.some(tag => tag.toLowerCase().includes(searchLower))
          );
        } else {
          // For restricted content, only search public metadata
          return (
            idea.publicTitle?.toLowerCase().includes(searchLower) ||
            idea.category?.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'newest':
          comparison = b.submissionTimestamp - a.submissionTimestamp;
          break;
        case 'oldest':
          comparison = a.submissionTimestamp - b.submissionTimestamp;
          break;
        case 'title':
          comparison = (a.title || a.publicTitle || '').localeCompare(b.title || b.publicTitle || '');
          break;
        case 'status':
          comparison = a.approvalStatus.localeCompare(b.approvalStatus);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredIdeas(filtered);
  };

  // Show contract connection status
  const renderContractStatus = () => {
    if (!networkInfo) {
      return (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <span>Loading contract configuration...</span>
        </Alert>
      );
    }

    return (
      <div className="contract-status">
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <div>
            <span className="text-sm">
              Connected to SparkIdeaRegistry: {networkInfo.sparkIdeaRegistry?.slice(0, 8)}...
              <a 
                href={`${networkInfo.explorerLink}/address/${networkInfo.sparkIdeaRegistry}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                View Contract
              </a>
            </span>
          </div>
        </Alert>
      </div>
    );
  };

  if (loading) {
    return <IdeaLoadingGrid />;
  }

  return (
    <div className="idea-browser">
      <div className="browser-header">
        <h1>Discover Research Ideas</h1>
        <p className="text-gray-600">
          Explore innovative research ideas from the Spark community
        </p>
      </div>

      {/* Contract Status */}
      {renderContractStatus()}

      <div className="browser-controls">
        <div className="search-section">
          <IdeaSearch
            value={filters.search}
            onChange={(search) => setFilters(prev => ({ ...prev, search }))}
            placeholder="Search ideas, topics, or researchers..."
          />
        </div>

        <div className="view-controls">
          <ViewModeSelector
            mode={viewMode}
            onChange={setViewMode}
          />
          
          <SortOptions
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={(sortBy, sortOrder) => 
              setFilters(prev => ({ ...prev, sortBy, sortOrder }))
            }
          />
        </div>
      </div>

      <div className="browser-layout">
        <FilterSidebar
          filters={filters}
          onFiltersChange={setFilters}
          availableCategories={getAvailableCategories(ideas)}
          availableTags={getAvailableTags(ideas)}
        />

        <div className="browser-content">
          <div className="results-header">
            <span className="results-count">
              {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''} found
            </span>
            
            {Object.values(filters).some(f => 
              Array.isArray(f) ? f.length > 0 : f && f !== 'all' && f !== 'newest' && f !== 'desc'
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  status: [],
                  categories: [],
                  tags: [],
                  dateRange: {},
                  accessLevel: 'all',
                  sortBy: 'newest',
                  sortOrder: 'desc',
                  search: ''
                })}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {filteredIdeas.length === 0 ? (
            <EmptyBrowseState filters={filters} />
          ) : (
            <div className={`ideas-${viewMode}`}>
              {viewMode === 'grid' ? (
                <IdeaGrid ideas={filteredIdeas} />
              ) : (
                <IdeaList ideas={filteredIdeas} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### **2. Access-Controlled Idea Card**

```typescript
// Browse/AccessControlledCard.tsx
interface AccessControlledIdeaCardProps {
  idea: any;
  onClick?: () => void;
  showActions?: boolean;
}

export const AccessControlledIdeaCard: React.FC<AccessControlledIdeaCardProps> = ({
  idea,
  onClick,
  showActions = true
}) => {
  const { address } = useWalletContext();
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const accessLevel = idea.accessLevel;

  const handleCardClick = () => {
    if (accessLevel.canView) {
      onClick?.();
    } else {
      setShowAccessPrompt(true);
    }
  };

  const renderContent = () => {
    switch (accessLevel.visibility) {
      case ContentVisibility.FULL_CONTENT:
        return (
          <FullIdeaCard
            idea={idea}
            onClick={handleCardClick}
            showActions={showActions}
          />
        );
        
      case ContentVisibility.DRAFT_PREVIEW:
        return (
          <PreviewIdeaCard
            idea={idea}
            onClick={handleCardClick}
            showActions={showActions}
          />
        );
        
      case ContentVisibility.PUBLIC_METADATA:
        return (
          <MetadataOnlyCard
            idea={idea}
            onClick={handleCardClick}
            showActions={showActions}
            accessPrompt={accessLevel.accessPrompt}
          />
        );
        
      default:
        return (
          <RestrictedIdeaCard
            ideaId={idea.ideaId}
            accessPrompt={accessLevel.accessPrompt}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}
      
      {showAccessPrompt && (
        <AccessPrompt
          isOpen={showAccessPrompt}
          onClose={() => setShowAccessPrompt(false)}
          requiredNDA={accessLevel.requiredNDA}
          ideaId={idea.ideaId}
          description={accessLevel.accessPrompt}
          onSuccess={() => {
            setShowAccessPrompt(false);
            // Reload idea with new access level
            window.location.reload();
          }}
        />
      )}
    </>
  );
};

const FullIdeaCard: React.FC<any> = ({ idea, onClick, showActions }) => (
  <Card className="idea-card cursor-pointer hover:shadow-lg" onClick={onClick}>
    <CardHeader>
      <div className="idea-header">
        <h3 className="idea-title">{idea.title}</h3>
        <IdeaStatusBadge status={idea.approvalStatus} />
      </div>
      <p className="idea-description">{idea.description}</p>
    </CardHeader>
    
    <CardContent>
      <div className="idea-metadata">
        <div className="idea-tags">
          {idea.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
          {idea.tags?.length > 3 && (
            <Badge variant="outline">+{idea.tags.length - 3} more</Badge>
          )}
        </div>
        
        <div className="idea-stats">
          <span className="text-sm text-gray-600">
            {idea.category} • {formatDate(idea.submissionTimestamp)}
          </span>
        </div>
      </div>
    </CardContent>

    {showActions && (
      <CardFooter>
        <IdeaActionButtons idea={idea} />
      </CardFooter>
    )}
  </Card>
);

const MetadataOnlyCard: React.FC<any> = ({ idea, onClick, accessPrompt }) => (
  <Card className="idea-card idea-card--restricted">
    <CardHeader>
      <div className="idea-header">
        <h3 className="idea-title">🔒 Protected Research Idea</h3>
        <IdeaStatusBadge status={idea.approvalStatus} />
      </div>
      <p className="idea-description text-gray-600">
        This idea requires additional verification to view
      </p>
    </CardHeader>
    
    <CardContent>
      <div className="idea-metadata">
        <div className="public-info">
          <span className="text-sm">
            {idea.category} • {formatDate(idea.submissionTimestamp)}
          </span>
        </div>
        
        <Alert variant="info" className="mt-4">
          <Lock className="h-4 w-4" />
          <span>{accessPrompt}</span>
        </Alert>
      </div>
    </CardContent>

    <CardFooter>
      <Button variant="outline" onClick={onClick} className="w-full">
        Sign NDA to View Content
      </Button>
    </CardFooter>
  </Card>
);
```

### **3. Advanced Search Interface**

```typescript
// Search/IdeaSearch.tsx
interface SearchState {
  query: string;
  suggestions: string[];
  recentSearches: string[];
  savedSearches: SavedSearch[];
  isSearching: boolean;
  results: any[];
}

export const IdeaSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: value,
    suggestions: [],
    recentSearches: [],
    savedSearches: [],
    isSearching: false,
    results: []
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debouncedQuery] = useDebounce(searchState.query, 300);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
      loadSuggestions(debouncedQuery);
    }
    onChange(debouncedQuery);
  }, [debouncedQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearchState(prev => ({ ...prev, isSearching: true }));
    
    try {
      // Add to recent searches
      addToRecentSearches(query);
      
      // Perform search with access control
      const results = await searchIdeasWithAccessControl(query);
      
      setSearchState(prev => ({
        ...prev,
        results,
        isSearching: false
      }));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchState(prev => ({ ...prev, isSearching: false }));
    }
  };

  const loadSuggestions = async (query: string) => {
    try {
      const suggestions = await generateSearchSuggestions(query);
      setSearchState(prev => ({ ...prev, suggestions }));
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleQueryChange = (newQuery: string) => {
    setSearchState(prev => ({ ...prev, query: newQuery }));
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchState(prev => ({ 
      ...prev, 
      query: suggestion,
      suggestions: []
    }));
  };

  const saveSearch = async () => {
    if (!searchState.query.trim()) return;
    
    try {
      const savedSearch = await saveUserSearch({
        query: searchState.query,
        timestamp: Date.now(),
        userAddress: address
      });
      
      setSearchState(prev => ({
        ...prev,
        savedSearches: [savedSearch, ...prev.savedSearches]
      }));
      
      showSuccessNotification('Search saved successfully');
    } catch (error) {
      handleError(error, 'Saving search');
    }
  };

  return (
    <div className="idea-search">
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <Search className="search-icon" />
          <input
            type="text"
            value={searchState.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder || "Search ideas, topics, or researchers..."}
            className="search-input"
          />
          
          {searchState.isSearching && (
            <Loader className="search-loading" />
          )}
          
          {searchState.query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQueryChange('')}
              className="clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="search-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
          </Button>
          
          {searchState.query && (
            <Button
              variant="outline"
              size="sm"
              onClick={saveSearch}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Search Suggestions */}
      {searchState.suggestions.length > 0 && searchState.query && (
        <div className="search-suggestions">
          <div className="suggestions-header">Suggestions</div>
          {searchState.suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <Search className="h-4 w-4" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Recent & Saved Searches */}
      {!searchState.query && (searchState.recentSearches.length > 0 || searchState.savedSearches.length > 0) && (
        <div className="search-history">
          {searchState.recentSearches.length > 0 && (
            <div className="recent-searches">
              <div className="history-header">Recent Searches</div>
              {searchState.recentSearches.map((search, index) => (
                <button
                  key={index}
                  className="history-item"
                  onClick={() => handleQueryChange(search)}
                >
                  <Clock className="h-4 w-4" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          )}
          
          {searchState.savedSearches.length > 0 && (
            <div className="saved-searches">
              <div className="history-header">Saved Searches</div>
              {searchState.savedSearches.map((search, index) => (
                <button
                  key={index}
                  className="history-item"
                  onClick={() => handleQueryChange(search.query)}
                >
                  <Bookmark className="h-4 w-4" />
                  <span>{search.query}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Advanced Search */}
      {showAdvanced && (
        <AdvancedSearchPanel
          onSearch={(advancedQuery) => handleQueryChange(advancedQuery)}
          onClose={() => setShowAdvanced(false)}
        />
      )}
    </div>
  );
};
```

### **4. Filter Sidebar**

```typescript
// Filters/FilterSidebar.tsx
export const FilterSidebar: React.FC<{
  filters: BrowseFilters;
  onFiltersChange: (filters: BrowseFilters) => void;
  availableCategories: string[];
  availableTags: string[];
}> = ({ filters, onFiltersChange, availableCategories, availableTags }) => {
  const updateFilter = (key: keyof BrowseFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3>Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({
            status: [],
            categories: [],
            tags: [],
            dateRange: {},
            accessLevel: 'all',
            sortBy: 'newest',
            sortOrder: 'desc',
            search: ''
          })}
        >
          Clear All
        </Button>
      </div>

      <div className="filter-sections">
        {/* Access Level Filter */}
        <FilterSection title="Access Level">
          <AccessibilityFilter
            value={filters.accessLevel}
            onChange={(accessLevel) => updateFilter('accessLevel', accessLevel)}
          />
        </FilterSection>

        {/* Status Filter */}
        <FilterSection title="Status">
          <StatusFilter
            selected={filters.status}
            onChange={(status) => updateFilter('status', status)}
          />
        </FilterSection>

        {/* Category Filter */}
        <FilterSection title="Categories">
          <CategoryFilter
            selected={filters.categories}
            available={availableCategories}
            onChange={(categories) => updateFilter('categories', categories)}
          />
        </FilterSection>

        {/* Tags Filter */}
        <FilterSection title="Tags">
          <TagFilter
            selected={filters.tags}
            available={availableTags}
            onChange={(tags) => updateFilter('tags', tags)}
          />
        </FilterSection>

        {/* Date Range Filter */}
        <FilterSection title="Date Range">
          <DateRangeFilter
            value={filters.dateRange}
            onChange={(dateRange) => updateFilter('dateRange', dateRange)}
          />
        </FilterSection>
      </div>
    </div>
  );
};

const AccessibilityFilter: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <div className="access-filter">
    <label className="filter-option">
      <input
        type="radio"
        value="all"
        checked={value === 'all'}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>All Ideas</span>
    </label>
    
    <label className="filter-option">
      <input
        type="radio"
        value="accessible"
        checked={value === 'accessible'}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>🔓 Accessible to Me</span>
    </label>
    
    <label className="filter-option">
      <input
        type="radio"
        value="restricted"
        checked={value === 'restricted'}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>🔒 Requires NDA</span>
    </label>
    
    <label className="filter-option">
      <input
        type="radio"
        value="voteable"
        checked={value === 'voteable'}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>🗳️ Can Vote On</span>
    </label>
  </div>
);
```

---

## 🧪 Testing Guidelines

### **Discovery Testing**

```typescript
// __tests__/components/IdeaBrowser.test.tsx
describe('IdeaBrowser', () => {
  beforeEach(() => {
    mockUseSparkIdeaRegistry.mockReturnValue({
      getAllIdeaIds: jest.fn().mockResolvedValue(['idea1', 'idea2']),
      getIdea: jest.fn().mockImplementation((id) => ({
        ideaId: id,
        title: `Test Idea ${id}`,
        approvalStatus: 'Pending'
      }))
    });
  });

  test('loads and displays ideas with access control', async () => {
    render(<IdeaBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('Discover Research Ideas')).toBeInTheDocument();
    });
  });

  test('filters ideas by access level', async () => {
    render(<IdeaBrowser />);
    
    // Click access filter
    fireEvent.click(screen.getByText('Accessible to Me'));
    
    await waitFor(() => {
      // Should filter results based on user access
      expect(screen.getByText(/ideas found/)).toBeInTheDocument();
    });
  });
});
```

---

## ✅ Implementation Checklist

### **Core Discovery Features**
- [ ] NDA-aware idea browsing
- [ ] Dynamic access control enforcement
- [ ] Search with access restrictions
- [ ] Advanced filtering system

### **Access Control Features**
- [ ] Content visibility levels
- [ ] Access prompt modals
- [ ] NDA signing integration
- [ ] Automatic access refresh

### **Search Features**
- [ ] Real-time search suggestions
- [ ] Search history management
- [ ] Saved searches functionality
- [ ] Advanced search options

### **Filter Features**
- [ ] Multi-faceted filtering
- [ ] Access-based filtering
- [ ] Date range filtering
- [ ] Tag and category filtering

Remember: This module must maintain strict access control while providing an intuitive discovery experience for users. 