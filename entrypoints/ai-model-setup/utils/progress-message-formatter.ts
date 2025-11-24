/**
 * Progress message formatting utilities for download status display.
 * Extracted for testability and reusability across components.
 */

/**
 * Format ETA message with slow network context.
 * Converts "~X min left" to "At least X min" for slow networks.
 */
export function formatEtaMessage(
  etaText: string,
  isSlowNetwork: boolean,
): string {
  if (!isSlowNetwork) return etaText;

  // Convert "~X min left" to "At least X min"
  const match = etaText.match(/~(\d+)\s+(min|sec)\s+left/);
  if (match) {
    const [, amount, unit] = match;
    return `At least ${amount} ${unit}`;
  }
  return etaText;
}

/**
 * Build a comprehensive progress message combining percentage, ETA, and elapsed time.
 * Handles slow network warnings inline.
 *
 * @param percentText - Progress percentage as string (e.g., "45")
 * @param etaText - Estimated time remaining (e.g., "~5 min left")
 * @param elapsedText - Time elapsed since start (e.g., "2 min 30 sec")
 * @param isSlowNetwork - Whether slow network is detected
 * @returns Formatted progress message
 *
 * @example
 * buildProgressMessage("45", "~5 min left", "2 min 30 sec", false)
 * // Returns: "45% (~5 min left, 2 min 30 sec elapsed)"
 *
 * @example
 * buildProgressMessage("45", "~5 min left", "2 min 30 sec", true)
 * // Returns: "45% (At least 5 min, but with slow network can be longer, 2 min 30 sec elapsed)"
 */
export function buildProgressMessage(
  percentText: string | null,
  etaText: string | null,
  elapsedText: string | null,
  isSlowNetwork: boolean,
): string {
  const parts: string[] = [];

  if (percentText != null) parts.push(`${percentText}%`);

  const formattedEta = etaText
    ? formatEtaMessage(etaText, isSlowNetwork)
    : null;
  if (formattedEta) {
    if (isSlowNetwork) {
      parts.push(`(${formattedEta}, but with slow network can be longer`);
      if (elapsedText) parts.push(`, ${elapsedText} elapsed)`);
      else parts.push(')');
    } else {
      if (elapsedText) parts.push(`(${formattedEta}, ${elapsedText} elapsed)`);
      else parts.push(`(${formattedEta})`);
    }
  } else if (elapsedText) {
    parts.push(`(${elapsedText} elapsed)`);
  }

  return parts.join(' ');
}
