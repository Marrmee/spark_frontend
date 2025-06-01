import React from 'react';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ErrorDisplayProps {
  /* eslint-disable-next-line */
  error: any;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="flex w-full items-center justify-center rounded-lg bg-highlightRed bg-opacity-20 px-6 py-3">
      <FontAwesomeIcon
        icon={faExclamationTriangle}
        className="mr-3 text-highlightRed"
      />
      <p className="text-highlightRed xs:text-sm sm:text-base">
        {typeof error == "string" ? error?.charAt(0).toUpperCase() + error?.slice(1) : error}
      </p>{' '}
    </div>
  );
};

export default ErrorDisplay;
