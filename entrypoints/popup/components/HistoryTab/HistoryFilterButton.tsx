interface HistoryFilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export const HistoryFilterButton: React.FC<HistoryFilterButtonProps> = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-xs px-2 py-1 rounded-md transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-default-100 text-default-600 hover:bg-default-200'
    }`}
  >
    {label}
  </button>
);
