import { Tooltip } from '@heroui/tooltip';

interface IconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Icon-only button with theme-aware background and tooltip
 */
export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon,
  title,
  className = '',
  disabled = false,
}) => {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-sm bg-default-100 hover:bg-default-200 flex items-center justify-center text-foreground transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-default-100 ${className}`}
    >
      {icon}
    </button>
  );

  if (title) {
    return (
      <Tooltip content={title} placement="bottom" delay={300}>
        {button}
      </Tooltip>
    );
  }

  return button;
};
