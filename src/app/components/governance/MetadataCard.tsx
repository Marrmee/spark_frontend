export default function MetadataCard({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) {
    return (
      <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075 p-2 sm:p-4">
        <p className="mb-1 text-xs text-gray-400 sm:text-sm">{label}</p>
        <div className="text-sm font-medium sm:text-base">{value}</div>
      </div>
    );
  }