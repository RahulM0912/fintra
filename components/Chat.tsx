"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from "@clerk/nextjs";

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

export function Chat() {
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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages Container */}
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

      {/* Input Area */}
      <div className="border-t border-border bg-background p-4">
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
        <div key={idx} className="border border-current/20 rounded p-2">
          {/* Render table if available */}
          {viz.tableData && Array.isArray(viz.tableData) && viz.tableData.length > 0 && (
            <div className="overflow-x-auto text-xs">
              <table className="min-w-full border-collapse">
                <tbody>
                  {viz.tableData.slice(0, 5).map((row: any, rowIdx: number) => (
                    <tr key={rowIdx}>
                      {Object.entries(row).map(([key, value]: [string, any]) => (
                        <td
                          key={key}
                          className="border border-current/20 px-2 py-1"
                        >
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {viz.tableData.length > 5 && (
                <p className="text-xs text-muted-foreground mt-1">
                  +{viz.tableData.length - 5} more rows
                </p>
              )}
            </div>
          )}

          {/* Render graph title */}
          {viz.graphs?.title && (
            <p className="font-semibold text-xs mt-2">{viz.graphs.title}</p>
          )}

          {/* Render data summary */}
          {viz.graphs?.data && (
            <p className="text-xs text-muted-foreground mt-1">
              {typeof viz.graphs.data === "string"
                ? viz.graphs.data
                : JSON.stringify(viz.graphs.data).substring(0, 100)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
