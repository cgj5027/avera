/**
 * Data-origin chip shown beside every financial figure.
 * Labels come from src/utils/constants.js (Manual / Sample data /
 * Plaid Sandbox / Estimated).
 */
import StatusPill from './StatusPill';
import { Info } from 'lucide-react';

export default function SourceChip({ source = 'Manual', className }) {
  const tone = source === 'Plaid Sandbox' ? 'info' : 'neutral';
  return (
    <StatusPill tone={tone} icon={Info} className={className}>
      {source}
    </StatusPill>
  );
}