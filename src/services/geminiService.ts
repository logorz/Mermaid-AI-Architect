import { DiagramType, ChatMessage, GenAIResponse } from '../types';

export class GeminiService {
  
  /**
   * Generates Mermaid code or a text response based on chat history.
   */
  static async generateFromHistory(
    history: ChatMessage[],
    currentCode?: string,
    diagramType: DiagramType = 'auto'
  ): Promise<GenAIResponse> {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          history,
          currentCode,
          diagramType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json() as GenAIResponse;
      return result;

    } catch (error) {
      console.error("API 调用错误:", error);
      // Fallback response
      return {
        type: 'message',
        content: "抱歉，连接 AI 服务时出现错误或超时，请重试。"
      };
    }
  }

  /**
   * Fixes syntax errors in Mermaid code.
   */
  static async fixDiagram(
    code: string,
    errorMsg: string
  ): Promise<{ code: string; explanation: string }> {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fix',
          code,
          errorMsg,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json() as { code: string; explanation: string };
      return result;
    } catch (error) {
      console.error("API 调用错误:", error);
      throw new Error("无法修复图表。");
    }
  }

  /**
   * Optimizes a prompt for better Mermaid diagram generation.
   */
  static async optimizePrompt(
    prompt: string
  ): Promise<GenAIResponse> {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'optimize',
          prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json() as GenAIResponse;
      return result;

    } catch (error) {
      console.error("API 调用错误:", error);
      // Fallback response
      return {
        type: 'message',
        content: prompt
      };
    }
  }

  private static cleanCode(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(mermaid)?\n?/, '').replace(/```$/, '');
    }
    
    clean = clean.trim();

    // Bottom-layer optimization: 
    // Automatically enforce 'flowchart' over 'graph' for better layout engine stability
    if (clean.startsWith('graph ')) {
      clean = clean.replace(/^graph /, 'flowchart ');
    }

    return clean;
  }
}
