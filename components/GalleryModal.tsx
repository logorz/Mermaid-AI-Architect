import React from 'react';
import { GALLERY_EXAMPLES } from '../constants';
import { MermaidRenderer } from './MermaidRenderer';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ExampleTemplate } from '../types';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ExampleTemplate) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">图表类型库</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">选择一个模板开始绘图</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {GALLERY_EXAMPLES.map((ex, idx) => (
              <button
                key={ex.name}
                onClick={() => onSelect(ex)}
                className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 text-left"
              >
                {/* Preview Area */}
                <div className="h-40 bg-slate-100 dark:bg-slate-800/30 w-full relative overflow-hidden p-2 pointer-events-none border-b border-slate-100 dark:border-slate-800/50">
                   <div className="absolute inset-0 transform scale-75 origin-top group-hover:scale-90 transition-transform duration-500">
                     <MermaidRenderer 
                       code={ex.code} 
                       uid={`gallery-${idx}`} 
                       allowFullscreen={false} // Disable fullscreen in gallery
                     />
                   </div>
                </div>
                
                {/* Info Area */}
                <div className="p-4 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-300">{ex.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ex.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};
