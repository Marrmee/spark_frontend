import { FC, useEffect, useRef } from 'react';

interface TitleEditorProps {
  content: string;
  onChange: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  height?: string;
  minLength?: number;
}

const TitleEditor: FC<TitleEditorProps> = ({
  content,
  onChange,
  // placeholder = 'Provide a clear and concise title for your proposal',
  maxLength,
  minLength = 0,
}) => {
  // Reference for input container
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle content changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const textLength = text.length;

    // Check if content exceeds max length
    if (maxLength && textLength > maxLength) {
      // Don't update if exceeding max length
    } else {
      // Only update parent if content is valid
      if (onChange && textLength >= minLength) {
        onChange(text);
      }
    }
  };

  // Handle content reset
  useEffect(() => {
    if (inputRef.current && content === '') {
      inputRef.current.value = '';
    }
  }, [content]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={content}
      onChange={handleInputChange}
      // placeholder={placeholder}
      maxLength={maxLength}
      className="h-full w-full rounded-lg px-4 py-3 text-base border-[1px] border-gray-700"
      style={{
        fontFamily: 'var(--font-acuminMedium), sans-serif',
        color: '#FFFFFF',
        backgroundColor: '#061425'
      }}
    />
  );
};

export default TitleEditor;
