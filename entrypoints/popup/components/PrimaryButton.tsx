interface PrimaryButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Primary action button used in alerts and banners
 * Uses theme-aware colors that adapt to light/dark mode
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  onClick,
  children,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-normal text-xs cursor-pointer transition-all bg-foreground text-background hover:opacity-80 ${className}`}
  >
    {children}
  </button>
);
