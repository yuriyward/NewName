import type { HistoryFilter } from '../../hooks/useHistory';

interface EmptyStateMessageProps {
  filter: HistoryFilter;
}

export const EmptyStateMessage: React.FC<EmptyStateMessageProps> = ({
  filter,
}) => {
  if (filter === 'all') {
    return <p className="text-default-400 text-center py-4">No history yet</p>;
  }

  const typeLabels: Record<string, string> = {
    image: 'images',
    video: 'videos',
    audio: 'audio files',
    pdf: 'PDFs',
    office: 'documents',
    archive: 'archives',
    data: 'data files',
  };

  const label = typeLabels[filter] || 'files';
  return <p className="text-default-400 text-center py-4">No {label} yet</p>;
};
