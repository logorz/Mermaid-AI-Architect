import { GoogleGenAI, Type, Content } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { DiagramType, ChatAttachment, ChatMessage, GenAIResponse } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class GeminiService {
  
  /**
   * Generates Mermaid code or a text response based on chat history.
   */
  static async generateFromHistory(
    history: ChatMessage[],
    currentCode?: string,
    diagramType: DiagramType = 'auto'
  ): Promise<GenAIResponse> {
    
    // Construct the history for Gemini
    // We map our ChatMessage[] to Gemini's expected Content[] format
    const contents: Content[] = history.map(msg => {
      const parts: any[] = [];
      
      // If there's an attachment, add it as inlineData
      if (msg.attachment) {
        const base64Data = msg.attachment.content.includes(',') 
          ? msg.attachment.content.split(',')[1] 
          : msg.attachment.content;
          
        parts.push({
          inlineData: {
            mimeType: msg.attachment.mimeType,
            data: base64Data
          }
        });
      }
      
      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    });

    // Add a system prompt injection to the very last user message to ensure context awareness of the current code and diagram type
    // This is often more effective than just system instructions for context.
    const lastMsg = contents[contents.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
        let contextNote = "";
        if (currentCode) {
            contextNote += `\n[Context - Current Mermaid Code]:\n${currentCode}\n`;
        }
        if (diagramType !== 'auto') {
            contextNote += `\n[Context - User Preferred Type]: ${diagramType}\n`;
        }
        if (contextNote) {
            // Append to the last text part
            const textPart = lastMsg.parts.find(p => p.text);
            if (textPart) {
                textPart.text += contextNote;
            } else {
                lastMsg.parts.push({ text: contextNote });
            }
        }
    }

    // Optimization Strategy:
    // 1. Identify if attachments are present in the conversation.
    const hasAttachments = history.some(msg => !!msg.attachment);

    // 2. Select Model based on complexity
    // - Text only: Use Flash for speed.
    // - Attachments: Use Pro for high-quality analysis (as requested).
    const model = hasAttachments ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    // 3. Configure Thinking Budget
    // - Text only: Set budget to 0 to force fast "System 1" thinking (low latency).
    // - Attachments: Allow default thinking behavior for the Pro model to ensure quality.
    const thinkingConfig = hasAttachments ? undefined : { thinkingBudget: 0 };

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["code", "message"] },
              content: { type: Type.STRING }
            },
            required: ["type", "content"]
          },
          thinkingConfig: thinkingConfig,
        },
      });

      const jsonText = response.text || '{}';
      const result = JSON.parse(jsonText) as GenAIResponse;

      // Double clean the code if it's code type
      if (result.type === 'code') {
        result.content = this.cleanCode(result.content);
      }

      return result;

    } catch (error) {
      console.error("Gemini Chat Error:", error);
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
    const prompt = `The following Mermaid code has a syntax error.
    
Error Message: "${errorMsg}"

Code:
${code}

Please fix the code so it renders correctly. 
Return the result in JSON format with two fields:
1. "code": The corrected Mermaid code string.
2. "explanation": A single sentence in Chinese explaining what caused the error.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ['code', 'explanation']
          },
          thinkingConfig: { thinkingBudget: 0 } // Speed up fixes
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        code: this.cleanCode(result.code || code),
        explanation: result.explanation || "已修复语法错误。"
      };
    } catch (error) {
      console.error("Gemini Fix Error:", error);
      throw new Error("无法修复图表。");
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
