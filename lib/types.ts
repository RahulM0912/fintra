export type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type ProcessQueryResult = {
    success: boolean;
    aiResponse: string | null;
    visualData: any | null;
    defaultVisualization: string | null;
    completionReason: string
};