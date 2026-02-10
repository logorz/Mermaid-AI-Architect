import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_INSTRUCTION } from '../../../constants';
import { DiagramType, ChatMessage, GenAIResponse } from '../../../types';

// OpenRouter API endpoint
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Model to use
const MODEL = 'google/gemini-2.5-flash-lite';

// Request types
interface GenerateRequest {
  history: ChatMessage[];
  currentCode?: string;
  diagramType: DiagramType;
}

interface FixRequest {
  code: string;
  errorMsg: string;
}

interface OptimizeRequest {
  prompt: string;
}

export async function POST(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://mermaid-ai-architect.vercel.app';
  
  // Check if API key is available
  if (!process.env.API_KEY) {
    return NextResponse.json(
      { error: "API 密钥未配置，请在 .env.local 文件中设置 API_KEY 环境变量。" },
      { status: 500 }
    );
  }

  try {
    const { action, ...data } = await request.json();

    if (action === 'generate') {
      const { history, currentCode, diagramType } = data as GenerateRequest;
      const result = await generateFromHistory(history, currentCode, diagramType, origin);
      return NextResponse.json(result);
    } else if (action === 'fix') {
      const { code, errorMsg } = data as FixRequest;
      const result = await fixDiagram(code, errorMsg, origin);
      return NextResponse.json(result);
    } else if (action === 'optimize') {
      const { prompt } = data as OptimizeRequest;
      const result = await optimizePrompt(prompt, origin);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "无效的操作类型" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("API 错误:", error);
    return NextResponse.json(
      { error: "处理请求时出现错误" },
      { status: 500 }
    );
  }
}

/**
 * Generates Mermaid code or a text response based on chat history.
 */
async function generateFromHistory(
  history: ChatMessage[],
  currentCode?: string,
  diagramType: DiagramType = 'auto',
  origin: string = 'https://mermaid-ai-architect.vercel.app'
): Promise<GenAIResponse> {
  // Construct the messages for OpenRouter
  const messages: any[] = [];
  
  // Add system message
  messages.push({
    role: 'system',
    content: SYSTEM_INSTRUCTION
  });
  
  // Add user and assistant messages
    history.forEach(msg => {
      // For OpenRouter, text content should be a string, not an object
      if (msg.content && !msg.attachment) {
        let textContent = msg.content;
        
        // Add context note if this is the last user message
        if (msg.role === 'user' && msg === history[history.length - 1]) {
          let contextNote = "";
          if (currentCode) {
            contextNote += `\n[Context - Current Mermaid Code]:\n${currentCode}\n`;
          }
          if (diagramType !== 'auto') {
            contextNote += `\n[Context - User Preferred Type]: ${diagramType}\n`;
          }
          if (contextNote) {
            textContent += contextNote;
          }
        }
        
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: textContent
        });
      } 
      // For attachments, use the array format
      else if (msg.attachment) {
        const content = [];
        
        // Add text if present
        if (msg.content) {
          content.push({
            type: 'text',
            text: msg.content
          });
        }
        
        // Add attachment based on type
        if (msg.attachment.mimeType.startsWith('image/') || msg.attachment.mimeType === 'application/pdf') {
          // Handle image and PDF attachments
          const base64Data = msg.attachment.content.includes(',') 
            ? msg.attachment.content.split(',')[1] 
            : msg.attachment.content;
            
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${msg.attachment.mimeType};base64,${base64Data}`
            }
          });
          
          // Add text description for context
          content.push({
            type: 'text',
            text: `${msg.attachment.mimeType === 'application/pdf' ? '[PDF Document]' : '[Image]'}: ${msg.attachment.fileName}\nPlease analyze this document and generate a Mermaid diagram based on its content.`
          });
        }
        
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: content
        });
      }
    });

  try {
    const response = await fetch(OPENROUTER_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'HTTP-Referer': origin,
        'X-Title': 'Mermaid AI Architect'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        response_format: {
          type: 'json_object'
        },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const jsonText = data.choices[0].message.content || '{}';
    const result = JSON.parse(jsonText) as GenAIResponse;

    // Double clean the code if it's code type
    if (result.type === 'code') {
      result.content = cleanCode(result.content);
    }

    return result;

  } catch (error) {
    console.error("OpenRouter Chat Error:", error);
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
async function fixDiagram(
  code: string,
  errorMsg: string,
  origin: string = 'https://mermaid-ai-architect.vercel.app'
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
    const response = await fetch(OPENROUTER_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'HTTP-Referer': origin,
        'X-Title': 'Mermaid AI Architect'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: {
          type: 'json_object'
        },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content || '{}');
    
    return {
      code: cleanCode(result.code || code),
      explanation: result.explanation || "已修复语法错误。"
    };
  } catch (error) {
    console.error("OpenRouter Fix Error:", error);
    throw new Error("无法修复图表。");
  }
}

function cleanCode(raw: string): string {
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

/**
 * Optimizes a prompt for better Mermaid diagram generation.
 */
async function optimizePrompt(
  prompt: string,
  origin: string = 'https://mermaid-ai-architect.vercel.app'
): Promise<GenAIResponse> {
  const optimizationPrompt = `Please optimize the following prompt for Mermaid diagram generation. The goal is to make it more clear, specific, and suitable for generating accurate Mermaid diagrams.

Original Prompt:
${prompt}

Optimized Prompt:
`;

  try {
    const response = await fetch(OPENROUTER_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'HTTP-Referer': origin,
        'X-Title': 'Mermaid AI Architect'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
        response_format: {
          type: 'json_object'
        },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const optimizedText = data.choices[0].message.content || prompt;

    return {
      type: 'message',
      content: optimizedText
    };
  } catch (error) {
    console.error("OpenRouter Optimization Error:", error);
    // Fallback response
    return {
      type: 'message',
      content: prompt
    };
  }
}
