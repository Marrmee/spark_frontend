interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="rounded-lg border border-red-500 bg-red-100 p-4 text-red-700">
      <p>{message}</p>
    </div>
  );
}; 