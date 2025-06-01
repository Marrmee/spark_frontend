interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    // Define array type to accept both numbers and specific string values
    const pageNumbers: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

    // Always show first page
    if (totalPages > 0) pageNumbers.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

    // Add ellipsis after first page if needed
    if (rangeStart > 2) pageNumbers.push('ellipsis-start');

    // Add pages around current page
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pageNumbers.push(i);
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) pageNumbers.push('ellipsis-end');

    // Always show last page if there's more than one page
    if (totalPages > 1) pageNumbers.push(totalPages);

    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {/* Previous button - icon on mobile, text on larger screens */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-white transition-colors hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:w-auto sm:px-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="ml-1 hidden sm:inline">Previous</span>
      </button>

      {/* Page numbers - responsive based on screen size */}
      <div className="hidden items-center space-x-1 sm:flex">
        {getPageNumbers().map((page, index) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <span key={`${page}-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            );
          }

          return (
            <button
              key={`page-${page}`}
              onClick={() => onPageChange(Number(page))}
              disabled={page === currentPage}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                page === currentPage
                  ? 'bg-blue-700 text-white'
                  : 'border border-gray-700 bg-gray-800 text-white hover:border-blue-500'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Mobile page indicator */}
      <span className="text-sm text-white sm:hidden">
        {currentPage} / {totalPages}
      </span>

      {/* Next button - icon on mobile, text on larger screens */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-white transition-colors hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:w-auto sm:px-3"
      >
        <span className="mr-1 hidden sm:inline">Next</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};
