interface IconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * Icon-only button with theme-aware background
 */
export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon,
  title,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-7 h-7 rounded-sm bg-default-100 hover:bg-default-200 flex items-center justify-center text-foreground transition-all cursor-pointer ${className}`}
    title={title}
  >
    {icon}
  </button>
);
