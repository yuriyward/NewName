import {
  parseSummary,
  type SummarySegment,
} from '@/entrypoints/shared/parsing/summary-parser';

interface SummaryDisplayProps {
  summary: string;
  itemId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  summary,
  itemId,
  isExpanded,
  onToggle,
}) => {
  const summaryId = `history-summary-${itemId}`;
  const parsedSummary = parseSummary(summary);

  return (
    <div className="ml-5">
      <button
        type="button"
        onClick={onToggle}
        className="text-[10px] text-default-500 hover:text-default-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-default-300 rounded-sm"
        aria-expanded={isExpanded}
        aria-controls={summaryId}
      >
        {isExpanded ? 'Hide summary' : 'Show summary'}
      </button>
      {isExpanded && (
        <div
          id={summaryId}
          className="mt-1.5 rounded-md bg-content2/70 px-2.5 py-2 text-[11px] leading-relaxed"
        >
          {parsedSummary.length === 0 ? (
            <p className="text-default-600 whitespace-pre-wrap break-words">
              {summary}
            </p>
          ) : (
            <div className="space-y-2.5">
              {parsedSummary.map((segment, idx) => (
                <SegmentDisplay
                  // biome-ignore lint/suspicious/noArrayIndexKey: Segments have no unique identifiers
                  key={`${itemId}-segment-${idx}`}
                  segment={segment}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SegmentDisplayProps {
  segment: SummarySegment;
  index: number;
}

const SegmentDisplay: React.FC<SegmentDisplayProps> = ({ segment, index }) => {
  // Special handling for Document Title
  if (segment.key === 'Document Title') {
    // Strip surrounding quotes if present
    const title = segment.value.replace(/^["'](.*)["']$/, '$1');
    return (
      <div className="pb-2 border-b border-content3/50">
        <h4 className="font-medium text-default-800 text-[12px] leading-snug">
          {title}
        </h4>
      </div>
    );
  }

  // Hide redundant "Content:" label
  if (segment.key === 'Content' && !segment.value) {
    return null;
  }

  // Enhanced page sections
  if (segment.key?.startsWith('Page ') || segment.value.startsWith('Page ')) {
    const pageMatch = segment.key
      ? segment.key.match(/Page (\d+)/)
      : segment.value.match(/Page (\d+)/);
    const pageNum = pageMatch?.[1];
    const content = segment.key
      ? segment.value
      : segment.value.replace(/Page \d+[^:]*:\s*/, '');

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-sm bg-primary/10 text-primary text-[10px] font-medium px-1">
            {pageNum || index + 1}
          </span>
          <span className="text-[10px] font-medium text-default-700">
            Page {pageNum || index + 1}
          </span>
        </div>
        <p className="text-default-600 leading-relaxed pl-6">{content}</p>
      </div>
    );
  }

  // Generic key-value pairs
  if (segment.key) {
    return (
      <div className="space-y-0.5">
        <dt className="text-[10px] font-medium text-default-700">
          {segment.key}
        </dt>
        <dd className="text-default-600 leading-relaxed pl-3">
          {segment.value}
        </dd>
      </div>
    );
  }

  // Plain text segments
  return <p className="text-default-600 leading-relaxed">{segment.value}</p>;
};
