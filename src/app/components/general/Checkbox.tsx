import { FC } from 'react';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Checkbox: FC<CheckboxProps> = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 rounded-lg border-seaBlue-700 text-seaBlue-700 focus:ring-blue-500"
      />
      <span>
        Quadratic Voting is{' '}
        <span className={`${checked ? 'text-seafoamGreen' : 'text-highlightRed'}`}>
          {label}
        </span>
      </span>
    </label>
  );
};

export default Checkbox;
