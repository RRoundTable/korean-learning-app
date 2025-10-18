import { Badge } from '@/components/ui/badge';
import { ScenarioStatus } from '@/lib/types/admin';

interface StatusBadgeProps {
  status: ScenarioStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: ScenarioStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'public':
        return {
          label: 'Public',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'archived':
        return {
          label: 'Archived',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={config.className}
    >
      {config.label}
    </Badge>
  );
}
