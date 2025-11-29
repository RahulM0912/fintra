// types/visualization.ts
export type GraphType =
  | 'bar'
  | 'pie'
  | 'line'
  | 'scatter'
  | 'table'
  | 'grouped-bar'
  | 'stacked-bar';

export interface GraphConfig {
  title: string;
  labels: string;      // JSON string: string[]
  data: string;        // JSON string: number[]
  groupBy?: string;
  onHover?: string;
}

export interface VisualItem {
  graphTypes: GraphType[];
  defaultType: GraphType;
  graphs: GraphConfig;
  tableData: any[];    // shape depends on your backend
}

export interface ChatApiData {
  success: boolean;
  response: string;
  visualData?: VisualItem[];
  defaultVisualization?: number;
  isProcessing: boolean;
  completionReason?: string;
}
