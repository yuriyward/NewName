interface PrimaryButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Primary action button with dark background used in alerts and banners
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  onClick,
  children,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-sm font-normal text-xs cursor-pointer transition-all bg-zinc-900 text-white hover:opacity-80 ${className}`}
  >
    {children}
  </button>
);
