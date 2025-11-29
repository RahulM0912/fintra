"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useUser } from "@clerk/nextjs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  visualData?: any;
  defaultVisualization?: string;
  timestamp: Date;
}

interface ChatResponse {
  type: string;
  data?: {
    success: boolean;
    response: string;
    visualData?: any;
    defaultVisualization?: string;
    isProcessing?: boolean;
    completionReason?: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

const dummyVisualData = [
  {
    graphTypes: ["bar", "line", "pie", "table"],
    defaultType: "bar",
    graphs: {
      title: "Spending by Category (Dummy)",
      // IMPORTANT: strings that contain JSON
      labels: '["Food","Rent","Travel","Shopping"]',
      data: "[1200, 8000, 2500, 3000]",
      groupBy: "category",
      onHover: "Show category and amount",
    },
    tableData: [
      { category: "Food", amount: 1200 },
      { category: "Rent", amount: 8000 },
      { category: "Travel", amount: 2500 },
      { category: "Shopping", amount: 3000 },
    ],
  },
];


export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId] = useState(() => {
    // Generate or retrieve chatId (in a real app, this would be persisted)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("chatId");
      if (stored) return stored;
      const newId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("chatId", newId);
      return newId;
    }
    return `chat_${Date.now()}`;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !user) return;

    // Add user message to chat
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          message: inputValue,
          chatId: chatId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";
      let visualData = null;
      let defaultVisualization = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (!data) continue;

            try {
              const parsed: ChatResponse = JSON.parse(data);

              if (parsed.type === "final_result" && parsed.data) {
                fullResponse = parsed.data.response || "";
                visualData = parsed.data.visualData;
                defaultVisualization = parsed.data.defaultVisualization;
              } else if (parsed.type === "error") {
                throw new Error(
                  parsed.error?.message || "An error occurred"
                );
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }

      // Add assistant message to chat
      if (fullResponse) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: fullResponse,
          visualData,
          defaultVisualization,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

//   const handleSendMessage = async (e: React.FormEvent) => {
//   e.preventDefault();

//   if (!inputValue.trim() || !user) return;

//   // Add user message to chat
//   const userMessage: Message = {
//     id: `msg_${Date.now()}`,
//     role: "user",
//     content: inputValue,
//     timestamp: new Date(),
//   };

//   setMessages((prev) => [...prev, userMessage]);
//   setInputValue("");
//   setIsLoading(true);

//   // ✅ MOCK: simulate a small delay and then return dummy assistant response
//   setTimeout(() => {
//     const assistantMessage: Message = {
//       id: `msg_${Date.now()}`,
//       role: "assistant",
//       content: "Here is a dummy visualization of your spending data.",
//       visualData: dummyVisualData,
//       defaultVisualization: undefined,
//       timestamp: new Date(),
//     };

//     setMessages((prev) => [...prev, assistantMessage]);
//     setIsLoading(false);
//     inputRef.current?.focus();
//   }, 600); // 0.6s fake delay
// };

  return (
    <div className="flex flex-1 h-full flex-col bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Centered chat container */}
      <div className="flex flex-1 flex-col  mx-auto w-full p-6 min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-4xl">💬</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Start a Conversation
                </h2>
                <p className="text-muted-foreground">
                  Ask me anything about your finances, transactions, and more!
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Processing your request...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-background/40 p-4 rounded-t-lg">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your finances..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              size="icon"
              className="rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-md rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Render visualization if available */}
        {!isUser && message.visualData && (
          <div className="mt-4 border-t border-current pt-4">
            <VisualizationRenderer
              visualData={message.visualData}
              defaultVisualization={message.defaultVisualization}
            />
          </div>
        )}

        {/* Fallback HTML visualization */}
        {!isUser && message.defaultVisualization && !message.visualData && (
          <div
            className="mt-4 border-t border-current pt-4"
            dangerouslySetInnerHTML={{
              __html: message.defaultVisualization,
            }}
          />
        )}
      </div>
    </div>
  );
}

type GraphType =
  | "bar"
  | "pie"
  | "line"
  | "scatter"
  | "table"
  | "grouped-bar"
  | "stacked-bar";

function parseGraphData(graphs: any) {
  try {
    const labels: string[] = JSON.parse(graphs.labels || "[]");
    const values: number[] = JSON.parse(graphs.data || "[]");

    const data = labels.map((label, i) => ({
      label,
      value: values[i] ?? 0,
    }));

    return { title: graphs.title || "", data };
  } catch (e) {
    console.error("Failed to parse graph data", e);
    return {
      title: graphs?.title || "",
      data: [] as { label: string; value: number }[],
    };
  }
}

function VisualizationRenderer({
  visualData,
  defaultVisualization,
}: {
  visualData: any;
  defaultVisualization?: string;
}) {
  if (!Array.isArray(visualData) || visualData.length === 0) {
    if (defaultVisualization) {
      return (
        <div
          className="text-xs"
          dangerouslySetInnerHTML={{ __html: defaultVisualization }}
        />
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {visualData.map((viz: any, idx: number) => (
        <VisualizationCard key={idx} viz={viz} />
      ))}
    </div>
  );
}

function VisualizationCard({ viz }: { viz: any }) {
  const [currentType, setCurrentType] = useState<GraphType>(
    viz.defaultType || viz.graphTypes?.[0] || "bar"
  );

  const { title, data } = parseGraphData(viz.graphs || {});

  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <p className="text-xs text-muted-foreground">
          No chart data available.
        </p>
      );
    }

    switch (currentType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" />
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
              >
                {data.map((_, i) => (
                  <Cell key={i} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case "table":
        return (
          <div className="overflow-x-auto text-xs border rounded">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-left">Label</th>
                  <th className="border px-2 py-1 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.label}>
                    <td className="border px-2 py-1">{row.label}</td>
                    <td className="border px-2 py-1 text-right">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "scatter":
      case "grouped-bar":
      case "stacked-bar":
        return (
          <p className="text-xs text-muted-foreground">
            {currentType} chart not implemented yet.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className="border border-current/20 rounded p-3 bg-background/40">
      {/* Title */}
      {title && <p className="font-semibold text-xs mb-2">{title}</p>}

      {/* Graph type switcher */}
      {Array.isArray(viz.graphTypes) && viz.graphTypes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {viz.graphTypes.map((type: GraphType) => (
            <button
              key={type}
              type="button"
              onClick={() => setCurrentType(type)}
              className={`text-[10px] px-2 py-1 rounded-full border ${
                currentType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/60"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {renderChart()}

      {/* Optional: raw tableData below chart */}
      {viz.tableData &&
        Array.isArray(viz.tableData) &&
        viz.tableData.length > 0 &&
        currentType !== "table" && (
          <details className="mt-2 text-[10px]">
            <summary className="cursor-pointer text-muted-foreground">
              Show raw table data
            </summary>
            <div className="mt-1 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <tbody>
                  {viz.tableData.slice(0, 5).map((row: any, rowIdx: number) => (
                    <tr key={rowIdx}>
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key} className="border px-2 py-1">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {viz.tableData.length > 5 && (
                <p className="mt-1 text-muted-foreground">
                  +{viz.tableData.length - 5} more rows
                </p>
              )}
            </div>
          </details>
        )}
    </div>
  );
}