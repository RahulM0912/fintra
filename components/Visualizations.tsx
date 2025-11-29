// components/Visualizations.tsx
import type { ChatApiData } from '@/types/visualization';
import { VisualizationCard } from './VisualizationCard';

interface VisualizationsProps {
  data: ChatApiData;
}

export function Visualizations({ data }: VisualizationsProps) {
  if (!data.visualData || data.visualData.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {data.visualData.map((item, idx) => (
        <VisualizationCard key={idx} item={item} />
      ))}
    </div>
  );
}
