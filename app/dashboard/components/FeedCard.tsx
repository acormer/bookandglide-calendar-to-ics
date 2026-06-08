import { CopyUrlButton } from './CopyUrlButton';
import { TokenRegenButton } from './TokenRegenButton';

interface Event {
  summary: string;
  start: string;
}

interface FeedCardProps {
  title: string;
  subscriptionUrl: string;
  events: Event[];
  lastFetchedAt: Date | null;
  lastError: string | null;
  showTokenRegen?: boolean;
}

export function FeedCard({
  title,
  subscriptionUrl,
  events,
  lastFetchedAt,
  lastError,
  showTokenRegen,
}: FeedCardProps) {
  const statusColor = lastError ? 'text-red-500' : lastFetchedAt ? 'text-green-600' : 'text-gray-400';
  const statusText = lastError
    ? `Error: ${lastError}`
    : lastFetchedAt
    ? `Last fetched ${new Date(lastFetchedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`
    : 'Never fetched';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className={`text-xs ${statusColor}`}>{statusText}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <CopyUrlButton url={subscriptionUrl} />
        {showTokenRegen && <TokenRegenButton />}
      </div>

      {events.length > 0 ? (
        <ul className="divide-y divide-gray-100 text-sm">
          {events.map((ev, i) => (
            <li key={i} className="py-2 flex justify-between gap-4">
              <span className="text-gray-800 truncate">{ev.summary}</span>
              <span className="text-gray-400 shrink-0">{ev.start}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">No upcoming events</p>
      )}
    </div>
  );
}
