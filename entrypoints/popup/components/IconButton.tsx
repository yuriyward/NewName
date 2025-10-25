interface IconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Icon-only button with theme-aware background
 */
export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon,
  title,
  className = '',
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-7 h-7 rounded-sm bg-default-100 hover:bg-default-200 flex items-center justify-center text-foreground transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-default-100 ${className}`}
    title={title}
  >
    {icon}
  </button>
);
