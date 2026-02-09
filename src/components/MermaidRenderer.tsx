import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  WrenchIcon, 
  PlusIcon, 
  MinusIcon,
  LinkIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface MermaidRendererProps {
  code: string;
  uid?: string;
  onFixError?: (code: string, error: string) => void;
  isFixing?: boolean;
  allowFullscreen?: boolean; 
  onUpdateCode?: (newCode: string) => void;
  onRequestChange?: (code: string) => void;
}

declare global {
  interface Window {
    mermaid: any;
  }
}

// Helper to manage mermaid init directive
const updateInitConfig = (code: string, configUpdates: Record<string, string>) => {
  const initRegex = /%%\{init:\s*({[\s\S]*?})\s*\}%%/;
  const match = code.match(initRegex);
  
  let config = { themeVariables: {} as Record<string, string>, theme: 'base' };
  let prefix = '';
  let suffix = code;

  if (match) {
    try {
      // Relaxed JSON parsing (handling potential non-strict JSON in user code if possible, but standard JSON.parse is safest)
      // We assume the AI generates valid JSON in init.
      const existingConfig = JSON.parse(match[1]);
      config = { ...config, ...existingConfig };
      if (!config.themeVariables) config.themeVariables = {};
      
      prefix = code.substring(0, match.index);
      suffix = code.substring(match.index! + match[0].length);
    } catch (e) {
      console.warn("Failed to parse existing init config", e);
    }
  }

  // Update variables
  Object.entries(configUpdates).forEach(([key, value]) => {
    config.themeVariables[key] = value;
  });

  // Re-assemble
  const newInitBlock = `%%{init: ${JSON.stringify(config)} }%%`;
  return `${prefix}${newInitBlock}\n${suffix.trim()}`;
};

const getInitVariable = (code: string, key: string): string => {
   const initRegex = /%%\{init:\s*({[\s\S]*?})\s*\}%%/;
   const match = code.match(initRegex);
   if (match) {
     try {
       const config = JSON.parse(match[1]);
       return config.themeVariables?.[key] || '';
     } catch (e) { return ''; }
   }
   return '';
};

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ 
  code, 
  uid, 
  onFixError, 
  isFixing,
  allowFullscreen = true,
  onUpdateCode,
  onRequestChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // View State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Color Palette State
  const [showPalette, setShowPalette] = useState(false);
  // We keep a local map of replacements to apply: oldColor -> newColor
  const [colorReplacements, setColorReplacements] = useState<Record<string, string>>({});
  // We keep track of global theme variable edits
  const [themeEdits, setThemeEdits] = useState<{ textColor: string, primaryColor: string, lineColor: string }>({
    textColor: '',
    primaryColor: '',
    lineColor: ''
  });
  
  // Chat Dialog State
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Extract detected hardcoded hex colors
  const detectedColors = useMemo(() => {
    const hexRegex = /#([0-9a-fA-F]{3,6})\b/g;
    const matches = code.match(hexRegex) || [];
    return Array.from(new Set(matches));
  }, [code]);

  // Sync theme edits with current code when palette opens
  useEffect(() => {
    if (showPalette) {
      setThemeEdits({
        textColor: getInitVariable(code, 'textColor') || '#333333',
        primaryColor: getInitVariable(code, 'primaryColor') || '#ffffff',
        lineColor: getInitVariable(code, 'lineColor') || '#333333',
      });
      setColorReplacements({});
    }
  }, [showPalette, code]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
         if (showPalette) setShowPalette(false);
         else if (isFullscreen) toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showPalette]);

  // Update grid visibility based on dark mode
  useEffect(() => {
    const updateGridStyle = () => {
      const container = containerRef.current;
      if (container) {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
          container.style.backgroundColor = '#0f172a';
          container.style.backgroundImage = `
            linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)
          `;
        } else {
          container.style.backgroundColor = '#ffffff';
          container.style.backgroundImage = `
            linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)
          `;
        }
      }
    };

    updateGridStyle();
    const observer = new MutationObserver(updateGridStyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Render Logic
  useEffect(() => {
    let active = true;
    const renderDiagram = async () => {
      if (!code || !containerRef.current || !window.mermaid) return;

      try {
        setError(null);
        const isDark = document.documentElement.classList.contains('dark');
        
        // If the user has explicitly set theme variables in the code (via our tool), use 'base' to respect them.
        // Otherwise use default/dark.
        const hasInit = /%%\{init:/.test(code);
        const theme = hasInit ? 'base' : (isDark ? 'dark' : 'default');

        window.mermaid.initialize({ 
          startOnLoad: false, 
          theme: theme, 
          securityLevel: 'loose',
          fontFamily: 'Fira Code, monospace',
        });

        const uniqueId = `mermaid-${uid || Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const { svg } = await window.mermaid.render(uniqueId, code);
        
        if (active) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (active) {
          console.warn("Mermaid Render Error:", err.message);
          setError(err.message || "语法错误 (Syntax Error)");
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 100); 
    const observer = new MutationObserver(renderDiagram);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [code, uid]);

  // Controls
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || isFullscreen || true) { 
      const sensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, scale - e.deltaY * sensitivity), 10);
      setScale(newScale);
    }
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; 
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setIsDragging(false);
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 10));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.1));
  const resetView = () => { setScale(1); setPosition({ x: 0, y: 0 }); };
  const toggleFullscreen = () => {
    if (!allowFullscreen) return;
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) { setScale(1); setPosition({ x: 0, y: 0 }); }
  };

  // Color Logic
  const applyColors = () => {
    if (!onUpdateCode) return;
    let newCode = code;

    // 1. Apply global theme edits
    const updates: Record<string, string> = {};
    if (themeEdits.textColor) updates['primaryTextColor'] = themeEdits.textColor;
    if (themeEdits.primaryColor) updates['primaryColor'] = themeEdits.primaryColor;
    if (themeEdits.lineColor) updates['lineColor'] = themeEdits.lineColor;
    
    // Only update if we have values
    if (Object.keys(updates).length > 0) {
       newCode = updateInitConfig(newCode, updates);
    }

    // 2. Apply explicit hex replacements
    Object.entries(colorReplacements).forEach(([oldColor, newColor]) => {
      newCode = newCode.replaceAll(oldColor, newColor);
    });

    onUpdateCode(newCode);
    setShowPalette(false);
  };

  const cancelColors = () => {
    setShowPalette(false);
    setColorReplacements({});
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    setIsChatLoading(true);
    try {
      // 这里可以添加与AI的交互逻辑
      // 暂时先模拟一个响应
      setTimeout(() => {
        // 关闭对话框
        setShowChatDialog(false);
        setChatInput('');
        
        // 调用onRequestChange回调，通知父组件用户的聊天内容
        if (onRequestChange) {
          onRequestChange(code);
        }
      }, 1000);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col" 
    : "flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-900/50 relative group overflow-hidden transition-colors duration-300";

  return (
    <div className={containerClass}>
      
      {/* Top Controls */}
      <div className={`absolute top-4 right-4 z-20 flex flex-col items-end gap-2 transition-opacity ${!isFullscreen && 'opacity-0 group-hover:opacity-100'} ${error ? 'hidden' : ''}`}>
        
        {/* Fullscreen/Exit Buttons */}
        <div className="flex items-center gap-2">
            {isFullscreen && (
                <button 
                onClick={toggleFullscreen}
                className="bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur text-xs px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 shadow-lg flex items-center gap-2 font-bold transition-all"
                >
                <ArrowLeftIcon className="w-4 h-4" />
                退出 (ESC)
                </button>
            )}
            {!isFullscreen && allowFullscreen && (
            <button 
                onClick={toggleFullscreen}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur text-xs px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 shadow-lg flex items-center gap-1.5"
            >
                <LinkIcon className="w-3 h-3" />
                实时预览
            </button>
            )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg border border-slate-300 dark:border-slate-700 p-1 shadow-xl">
           <button onClick={() => setShowPalette(!showPalette)} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors ${showPalette ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-500 dark:text-slate-400'}`} title="颜色编辑器">
             <WrenchIcon className="w-4 h-4" />
           </button>
           <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
           <button onClick={zoomOut} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400" title="缩小">
             <MinusIcon className="w-4 h-4" />
           </button>
           <button onClick={resetView} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400" title="复位">
             <span>🔄</span>
           </button>
           <button onClick={zoomIn} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400" title="放大">
             <PlusIcon className="w-4 h-4" />
           </button>
           <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
           {onRequestChange && (
             <button onClick={() => setShowChatDialog(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 ml-1" title="提需求">
               <span>💬</span>
             </button>
           )}
           {allowFullscreen && (
             <button onClick={toggleFullscreen} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 ml-1">
               {isFullscreen ? <ArrowLeftIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
             </button>
           )}
        </div>

        {/* Improved Color Palette Popover */}
        {showPalette && onUpdateCode && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl mt-2 w-64 animate-in slide-in-from-top-2 duration-200 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                   <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">图表配色</h3>
                </div>
                
                <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                    {/* Global Settings */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase">全局设置</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-600 dark:text-slate-300">文本颜色</label>
                          <div className="flex items-center gap-2">
                             <input type="color" className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" value={themeEdits.textColor} onChange={e => setThemeEdits({...themeEdits, textColor: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-600 dark:text-slate-300">线条/边框</label>
                           <div className="flex items-center gap-2">
                             <input type="color" className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" value={themeEdits.lineColor} onChange={e => setThemeEdits({...themeEdits, lineColor: e.target.value})} />
                          </div>
                        </div>
                         <div className="flex items-center justify-between">
                          <label className="text-xs text-slate-600 dark:text-slate-300">默认填充</label>
                           <div className="flex items-center gap-2">
                             <input type="color" className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" value={themeEdits.primaryColor} onChange={e => setThemeEdits({...themeEdits, primaryColor: e.target.value})} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detected Hex Colors */}
                    {detectedColors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase">替换现有颜色</p>
                        <div className="grid grid-cols-5 gap-2">
                            {detectedColors.map((color) => {
                                const activeColor = colorReplacements[color] || color;
                                return (
                                  <div key={color} className="relative group w-8 h-8 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden ring-offset-1 dark:ring-offset-slate-800 hover:ring-2 ring-brand-500 transition-all">
                                      <input 
                                          type="color" 
                                          value={activeColor} 
                                          title={`Replace ${color}`}
                                          onChange={(e) => setColorReplacements(prev => ({ ...prev, [color]: e.target.value }))}
                                          className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                                      />
                                  </div>
                                );
                            })}
                        </div>
                      </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                   <button 
                     onClick={cancelColors}
                     className="flex-1 py-1.5 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                   >
                     <XMarkIcon className="w-3 h-3" /> 取消
                   </button>
                   <button 
                     onClick={applyColors}
                     className="flex-1 py-1.5 px-3 text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 rounded shadow-sm transition-colors flex items-center justify-center gap-1"
                   >
                     <CheckIcon className="w-3 h-3" /> 应用更改
                   </button>
                </div>
            </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/50 text-red-700 dark:text-red-200 p-3 rounded backdrop-blur-md z-30 text-xs font-mono break-all flex items-start justify-between gap-4 shadow-lg">
          <div>
             <p className="font-bold mb-1">渲染错误:</p>
             <p>{error}</p>
          </div>
          {onFixError && (
            <button 
              onClick={() => onFixError(code, error)}
              disabled={isFixing}
              className="flex items-center gap-1 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/40 border border-red-200 dark:border-red-500/50 text-red-800 dark:text-red-100 px-3 py-1.5 rounded transition-colors whitespace-nowrap text-xs font-bold"
            >
              <WrenchIcon className={`w-4 h-4 ${isFixing ? 'animate-spin' : ''}`} />
              {isFixing ? '修复中...' : 'AI 自动修复'}
            </button>
          )}
        </div>
      )}
      
      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className={`w-full h-full overflow-hidden cursor-grab active:cursor-grabbing ${error ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
        style={{
          backgroundColor: '#ffffff',
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 0'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
           className="w-full h-full flex items-center justify-center origin-center transition-transform duration-75 ease-out"
           style={{ 
             transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
           }}
           dangerouslySetInnerHTML={{ __html: svgContent }}
           id="mermaid-chart-container"
        />
      </div>

      {/* Bottom Hint */}
      {!isFullscreen && (
        <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 dark:text-slate-500 select-none pointer-events-none">
            Ctrl + 滚轮缩放 | 拖拽移动
        </div>
      )}

      {/* Chat Dialog */}
      {showChatDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Dialog Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">提需求</h3>
              <button 
                onClick={() => setShowChatDialog(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                请描述您对当前流程图的修改需求，我会根据您的描述进行调整。
              </p>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="例如：我想在流程图中添加一个新的步骤，用于验证用户身份..."
                className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-40"
                disabled={isChatLoading}
              />
            </div>

            {/* Dialog Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowChatDialog(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                disabled={isChatLoading}
              >
                取消
              </button>
              <button 
                onClick={handleChatSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isChatLoading || !chatInput.trim()}
              >
                {isChatLoading ? '处理中...' : '提交需求'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
