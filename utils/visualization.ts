// utils/visualization.ts
import { GraphConfig } from '@/types/visualization';

export function parseGraphConfig(graphs: GraphConfig) {
  let labels: string[] = [];
  let values: number[] = [];

  try {
    labels = JSON.parse(graphs.labels);
    values = JSON.parse(graphs.data);
  } catch (e) {
    console.error('Failed to parse graph labels/data', e);
  }

  const data = labels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));

  return { title: graphs.title, data };
}
