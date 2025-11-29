// import { Logger } from "@/lib/utils/logger";
import { Message } from "@/lib/types";
import {GoogleGenAI } from '@google/genai';

// import { extractUsage, UsageAccumulator } from "../tokenUsageAnalytics/usageDb";
// import { query } from "winston";
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

type CompactQA = {
  question: string;
  answerSummary: string;
  timestamp: number;
};

type ConversationState = {
  recentQA: CompactQA[]; // Sliding window of last 5 Q&A pairs
  overallSummary: string; // Rolling summary of entire conversation
  totalMessages: number;
  lastSummaryUpdate: number;
};

export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  private readonly WINDOW_SIZE = 5; // Keep last 5 Q&A pairs
  private readonly SUMMARY_UPDATE_THRESHOLD = 3; // Update summary every 3 new Q&A pairs

  /**
   * Initialize or get conversation state
   */
  private getConversationState(chatId: string, userId: string): ConversationState {
    if (!this.conversations.has(chatId)) {
      this.conversations.set(chatId, {
        recentQA: [],
        overallSummary: "",
        totalMessages: 0,
        lastSummaryUpdate: 0
      });
      console.log('Created new conversation state');
    }
    
    const state = this.conversations.get(chatId)!;
    
    return state;
  }

  /**
   * Build optimized messages for LLM with sliding window + summary
   */
  async buildMessages(
    currentQuestion: string,
    chatId: string,
    userId: string,
    systemPrompt?: string,
  ): Promise<Message[]> {
    const state = this.getConversationState(chatId, userId);
    const messages: Message[] = [];

    // 1. Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // 2. Add overall conversation summary if it exists
    if (state.overallSummary && state.overallSummary.trim()) {
      const summaryContent = `📋 Conversation Summary (${state.totalMessages} total messages):\n${state.overallSummary}\n\n---`;
      messages.push({
        role: "system",
        content: summaryContent
      });
      console.log('Added overall summary', {
        summaryLength: state.overallSummary.length
      });
    }

    // 3. Add recent Q&A pairs (sliding window)
    if (state.recentQA.length > 0) {
      const recentContext = state.recentQA
        .map(qa => `User: ${qa.question}\nAssistant: ${qa.answerSummary}`)
        .join('\n\n');
      
      const recentContent = `💬 Recent Conversation (last ${state.recentQA.length} exchanges):\n${recentContext}\n\n---`;
      messages.push({
        role: "system",
        content: recentContent
      });
      console.log('Added recent Q&A pairs', {
        count: state.recentQA.length,
        contentLength: recentContent.length
      });
    } else {
      console.log('No recent Q&A pairs to add');
    }

    // 4. Add current question
    messages.push({
      role: "user",
      content: currentQuestion
    });

    console.log(`Built ${messages.length} messages for conversation ${chatId}`, {
      hasOverallSummary: !!state.overallSummary,
      recentQACount: state.recentQA.length,
      totalMessages: state.totalMessages,
      messagesBuilt: messages.length
    });

    return messages;
  }

  /**
   * Add new Q&A pair and update conversation state
   */
  async addQAPair(
    chatId: string,
    userId: string,
    question: string,
    fullAnswer: string,
    modelKey?: string,
  ): Promise<void> {

    const state = this.getConversationState(chatId, userId);

    // Extract compact answer summary
    const answerSummary = this.compressAnswer(fullAnswer);

    console.log('Compressed answer', {
      originalLength: fullAnswer.length,
      compressedLength: answerSummary.length
    });

    // Add to sliding window
    state.recentQA.push({
      question,
      answerSummary,
      timestamp: Date.now()
    });

    console.log('Added to sliding window', {
      recentQACount: state.recentQA.length,
      windowSize: this.WINDOW_SIZE
    });

    // Maintain sliding window size
    if (state.recentQA.length > this.WINDOW_SIZE) {
      const removed = state.recentQA.shift(); // Remove oldest
      console.log('Removed oldest Q&A from window', {
        removedQuestion: removed?.question.substring(0, 50)
      });
    }

    state.totalMessages += 2; // User + Assistant

    // Update overall summary periodically
    const messagesSinceLastUpdate = state.totalMessages - state.lastSummaryUpdate;
    console.log('Checking summary update', {
      messagesSinceLastUpdate,
      threshold: this.SUMMARY_UPDATE_THRESHOLD * 2,
      shouldUpdate: messagesSinceLastUpdate >= this.SUMMARY_UPDATE_THRESHOLD * 2
    });

    if (messagesSinceLastUpdate >= this.SUMMARY_UPDATE_THRESHOLD * 2) {
      await this.updateOverallSummary(chatId, userId, modelKey);
    }

    console.log('Successfully added Q&A pair', {
      recentQACount: state.recentQA.length,
      totalMessages: state.totalMessages,
      summaryUpToDate: messagesSinceLastUpdate < this.SUMMARY_UPDATE_THRESHOLD * 2
    });

    // Log all conversations in memory
    // this.logAllConversations();
  }

  /**
   * Update overall conversation summary
   */
  private async updateOverallSummary(
    chatId: string,
    userId: string,
    modelKey?: string,
  ): Promise<void> {
    const state = this.getConversationState(chatId, userId);

    try {
      // Build text of all Q&A pairs for summarization
      const allQAText = state.recentQA
        .map(qa => `Q: ${qa.question}\nA: ${qa.answerSummary}`)
        .join('\n\n');

      const summaryPrompt: Message[] = [
        {
          role: "system",
          content: "You are a conversation summarizer. Create a concise summary that captures the key topics, questions asked, and important findings discovered."
        },
        {
          role: "user",
          content: `${state.overallSummary ? `Previous summary:\n${state.overallSummary}\n\n` : ''}New conversation exchanges:\n${allQAText}\n\nProvide an updated summary in 4-6 bullet points focusing on:\n- Main topics discussed\n- Key data/insights discovered\n- Important patterns or trends identified\n\nProvide only the bullet points, no preamble.`
        }
      ];

      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash',
        contents: summaryPrompt,
      });

      state.overallSummary = response.text || state.overallSummary;
      state.lastSummaryUpdate = state.totalMessages;

      console.log('Updated overall summary', {
        summaryLength: state.overallSummary.length,
        totalMessages: state.totalMessages
      });

    } catch (error) {
      console.log('Failed to update summary', error);
    }
  }


  //if in future want to compress the answer do changes here
  private compressAnswer(fullAnswer: string): string {
    try {
      return fullAnswer;
    } catch {
      return fullAnswer;
    }
  }


  logAllConversations(): void {
    console.log('🗂️ ALL CONVERSATIONS IN MEMORY:', {
      totalConversations: this.conversations.size,
      chatIds: Array.from(this.conversations.keys()),
      details: Array.from(this.conversations.entries()).map(([id, state]) => ({
        chatId: id,
        totalMessages: state.totalMessages,
        recentQACount: state.recentQA.length,
        hasSummary: !!state.overallSummary,
        summaryLength: state.overallSummary.length,
        recentQuestions: state.recentQA.map(qa => qa.question.substring(0, 50))
      }))
    });
  }
}

export const conversationManager = new ConversationManager();