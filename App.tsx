import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileText, 
  Save, 
  Download, 
  ChevronLeft, 
  Sparkles, 
  Check, 
  AlertCircle,
  FileDown,
  History,
  RotateCcw,
  Eye,
  Edit3,
  X,
  Plus,
  Image as ImageIcon,
  PenTool
} from 'lucide-react';
import { TEMPLATES } from './constants';
import { ReportTemplate, ReportData, SectionDefinition, ReportVersion } from './types';
import { generateSectionContent } from './services/geminiService';
import { exportToDocx } from './services/exportService';

const LOCAL_STORAGE_KEY = 'genius_report_draft';

// --- Components ---

// Content Renderer handling LaTeX and Images
const ContentRenderer = ({ text, attachments }: { text: string, attachments: Record<string, string> }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // 1. Handle Images: ![alt](attachment:ID)
    // We do this before HTML escaping so we can inject img tags
    // 2. Escape HTML (but preserve our newly added img tags)
    // To do this safely, we split by the image tags we just added
    // This is a simplified approach. For production, use a proper sanitizer/parser.
    
    // Actually, a safer way: Escape everything first, then unescape the specific image syntax?
    // Let's invert: Escape HTML first, then process Markdown images, then process LaTeX.
    
    const escapeHtml = (unsafe: string) => {
      return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
    };

    // Helper for Math
    const renderMath = (math: string, displayMode: boolean) => {
      if ((window as any).katex) {
        try {
          return (window as any).katex.renderToString(math, {
            displayMode: displayMode,
            throwOnError: false
          });
        } catch (e) {
          return math;
        }
      }
      return math;
    };

    // Pipeline:
    // A. Split into segments: LaTeX ($$), Inline Math ($), Image definitions (![...](...)), and Text
    // This regex is getting complex. Let's do a multi-pass approach on the DOM or string.
    
    // PASS 1: Escape HTML of the raw text
    let safeHtml = escapeHtml(text);

    // PASS 2: Restore Markdown Image syntax (since < > etc might have been escaped)
    // The escapeHtml escapes `!`, `[`, `]`? No, it only escapes & < > " '
    // So ![alt](attachment:id) remains ![alt](attachment:id).
    
    // Replace Image syntax with HTML IMG tags
    safeHtml = safeHtml.replace(/!\[(.*?)\]\(attachment:(.*?)\)/g, (match, alt, id) => {
      const src = attachments[id];
      if (src) {
        // We trust our own base64 data
        return `$$IMG_START$$${src}$$IMG_SEP$$${alt}$$IMG_END$$`;
      }
      return `[Broken Image: ${alt}]`;
    });

    // PASS 3: LaTeX
    const parts = safeHtml.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    
    const htmlWithMath = parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return renderMath(part.slice(2, -2).replace(/&lt;/g,'<').replace(/&gt;/g,'>'), true);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        return renderMath(part.slice(1, -1).replace(/&lt;/g,'<').replace(/&gt;/g,'>'), false);
      } else {
        return part.replace(/\n/g, '<br/>');
      }
    }).join('');

    // PASS 4: Restore Image Tags
    const finalHtml = htmlWithMath.replace(/\$\$IMG_START\$\$(.*?)\$\$IMG_SEP\$\$(.*?)\$\$IMG_END\$\$/g, (match, src, alt) => {
      return `<div class="my-6 flex flex-col items-center">
                <img src="${src}" alt="${alt}" class="max-w-full h-auto max-h-[500px] rounded-lg shadow-md border border-gray-200" />
                <span class="text-sm text-gray-500 mt-2 italic">${alt}</span>
              </div>`;
    });

    containerRef.current.innerHTML = finalHtml;
  }, [text, attachments]);

  return <div ref={containerRef} className="prose max-w-none text-gray-800" />;
};

// Draw.io Modal Component
const DrawioModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: string) => void }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isOpen) return;
      if (event.data && typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'configure') {
             // Configure if needed
             iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
                 action: 'configure',
                 config: { compressXml: false }
             }), '*');
          }
          if (msg.event === 'init') {
              // Load
          }
          if (msg.event === 'export') {
            onSave(msg.data);
            onClose();
          }
          if (msg.event === 'save') {
             // User clicked save in embed mode
             iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
                 action: 'export',
                 format: 'xmlpng', 
                 spin: 'Updating...' 
             }), '*');
          }
          if (msg.event === 'exit') {
            onClose();
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onClose, onSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <PenTool className="w-4 h-4" /> Draw.io Editor
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5"/></button>
        </div>
        <div className="flex-1 relative bg-white">
          <iframe 
            ref={iframeRef}
            src="https://embed.diagrams.net/?embed=1&ui=min&spin=1&proto=json&libraries=1"
            className="w-full h-full border-0"
            title="Draw.io"
          />
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

function App() {
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Features State
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [showDrawio, setShowDrawio] = useState<boolean>(false);

  // File Input Ref for Images
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.history) parsed.history = [];
        if (parsed && !parsed.attachments) parsed.attachments = {};
        // Note: We don't auto-set template to avoid confusion on refresh, user selects it.
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Autosave
  useEffect(() => {
    if (!activeTemplate || !reportData) return;
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reportData));
      setTimeout(() => setSaveStatus('saved'), 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [reportData, activeTemplate]);

  // Handlers
  const handleTemplateSelect = (key: string) => {
    const tmpl = TEMPLATES[key];
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    let initialValues: Record<string, string> = {};
    let initialHistory: ReportVersion[] = [];
    let initialAttachments: Record<string, string> = {};
    
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.templateId === key) {
        initialValues = parsed.values;
        initialHistory = parsed.history || [];
        initialAttachments = parsed.attachments || {};
      }
    }

    setReportData({
      templateId: key,
      lastModified: Date.now(),
      values: initialValues,
      history: initialHistory,
      attachments: initialAttachments
    });
    
    setActiveTemplate(tmpl);
    setActiveSectionId(tmpl.sections[0].id);
  };

  const handleInputChange = (id: string, value: string) => {
    setSaveStatus('unsaved');
    setReportData(prev => prev ? ({
      ...prev,
      lastModified: Date.now(),
      values: { ...prev.values, [id]: value }
    }) : null);
  };

  const handleSaveVersion = () => {
    if (!reportData) return;
    const newVersion: ReportVersion = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      values: { ...reportData.values },
      attachments: { ...reportData.attachments },
      name: `Version ${reportData.history.length + 1}`
    };
    setReportData(prev => prev ? ({
      ...prev,
      history: [newVersion, ...prev.history].slice(0, 30)
    }) : null);
    
    setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        ...reportData,
        history: [newVersion, ...reportData.history].slice(0, 30)
      }));
    }, 0);
  };

  const handleRestoreVersion = (version: ReportVersion) => {
    if (!confirm(`Restore "${version.name}"? Unsaved changes will be lost.`)) return;
    setReportData(prev => prev ? ({
      ...prev,
      values: { ...version.values },
      attachments: { ...(version.attachments || {}) },
      lastModified: Date.now()
    }) : null);
    setShowHistory(false);
  };

  const handleAiGenerate = async (section: SectionDefinition) => {
    if (!reportData) return;
    setIsAiGenerating(true);
    setAiError(null);
    try {
      const context = `Report Title: ${reportData.values['title'] || 'Untitled'}. Section: ${section.label}.`;
      const prompt = section.aiPrompt ? `${section.aiPrompt} (Context: ${context})` : `Write content for "${section.label}" in context: ${context}`;
      const content = await generateSectionContent(activeTemplate?.title || "Report", section.label, prompt);
      const existing = reportData.values[section.id] || "";
      handleInputChange(section.id, existing + (existing ? "\n\n" : "") + content);
    } catch (e: any) {
      setAiError(e.message || "AI Error");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Attachment Logic
  const insertAttachment = (dataUrl: string, altText: string) => {
    if (!reportData || !activeSectionId) return;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Update attachments
    setReportData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            attachments: {
                ...prev.attachments,
                [id]: dataUrl
            }
        };
    });

    // Insert markdown tag at cursor position or append
    const tag = `\n![${altText}](attachment:${id})\n`;
    const textarea = document.querySelector(`#textarea-${activeSectionId}`) as HTMLTextAreaElement;
    
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + tag + text.substring(end);
        handleInputChange(activeSectionId, newText);
        // Defer cursor update
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + tag.length;
        }, 0);
    } else {
        // Fallback append
        handleInputChange(activeSectionId, (reportData.values[activeSectionId] || "") + tag);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (evt.target?.result) {
                insertAttachment(evt.target.result as string, file.name);
            }
        };
        reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrawioSave = (data: string) => {
      insertAttachment(data, "Diagram");
  };

  const handleBack = () => {
    setActiveTemplate(null);
    setReportData(null);
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Render ---

  if (!activeTemplate) {
    // Template Selection (Same as before)
    return (
      <div className="min-h-screen p-8 max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <FileText className="w-10 h-10 text-indigo-600" />
            ReportGenius AI
          </h1>
          <p className="text-gray-500 text-lg">Select a template to begin drafting your professional document.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {Object.entries(TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              onClick={() => handleTemplateSelect(key)}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 hover:border-indigo-400 text-left"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{tmpl.title}</h3>
              <p className="text-gray-500 mb-6 h-12">{tmpl.description}</p>
              <span className="bg-indigo-50 px-3 py-1 rounded-full text-sm text-indigo-600 font-medium">{tmpl.sections.length} Sections</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const progress = activeTemplate && reportData ? Math.round((activeTemplate.sections.filter(s => (reportData.values[s.id] || "").length > 10).length / activeTemplate.sections.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Draw.io Modal */}
      <DrawioModal isOpen={showDrawio} onClose={() => setShowDrawio(false)} onSave={handleDrawioSave} />
      
      {/* Hidden File Input */}
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />

      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 h-auto md:h-screen flex flex-col sticky top-0 md:fixed z-20 no-print">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-700 truncate max-w-[150px]">{activeTemplate.title}</span>
          <div className="w-8"></div>
        </div>
        <div className="p-6 bg-indigo-50 border-b border-indigo-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Progress</span>
            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {activeTemplate.sections.map((sec) => {
            const isFilled = reportData?.values[sec.id]?.length > 10;
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSectionId(sec.id);
                  document.getElementById(`section-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isFilled ? (isActive ? 'bg-white' : 'bg-green-500') : 'bg-gray-300'}`} />
                <span className="truncate flex-1">{sec.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
           <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
             <span>Status:</span>
             <span className={`flex items-center gap-1 ${saveStatus === 'unsaved' ? 'text-amber-500' : 'text-green-600'}`}>{saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}</span>
           </div>
           <button onClick={() => setShowHistory(true)} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg shadow-sm"><History className="w-4 h-4" /> History</button>
           <div className="grid grid-cols-2 gap-2">
             <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg shadow-sm"><FileDown className="w-4 h-4" /> PDF</button>
             <button onClick={() => exportToDocx(activeTemplate, reportData!)} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg shadow-md"><Download className="w-4 h-4" /> DOCX</button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-80 min-h-screen relative">
        <div className="max-w-4xl mx-auto p-8 md:p-12 pb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 print-only">
             <h1 className="text-3xl font-bold text-gray-800">{activeTemplate.title}</h1>
             <div className="flex items-center gap-2 mt-4 md:mt-0 no-print">
               <button onClick={handleSaveVersion} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 rounded-lg shadow-sm transition-all"><Save className="w-4 h-4 text-indigo-600" /> Save Version</button>
               <div className="h-8 w-px bg-gray-300 mx-2"></div>
               <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                 <button onClick={() => setIsPreviewMode(false)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isPreviewMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Edit3 className="w-4 h-4" /> Edit</button>
                 <button onClick={() => setIsPreviewMode(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isPreviewMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Eye className="w-4 h-4" /> Preview</button>
               </div>
             </div>
          </div>

          <div className="space-y-12">
            {activeTemplate.sections.map((sec) => (
              <div key={sec.id} id={`section-${sec.id}`} className="section-block scroll-mt-24 group">
                <div className="flex items-baseline justify-between mb-3">
                  <label className="text-lg font-semibold text-gray-800 flex items-center gap-2">{sec.label}{sec.required && <span className="text-red-500 text-sm">*</span>}</label>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {sec.type === 'textarea' && !isPreviewMode && (
                        <>
                           <button onClick={() => { setActiveSectionId(sec.id); fileInputRef.current?.click(); }} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Insert Image"><ImageIcon className="w-4 h-4" /></button>
                           <button onClick={() => { setActiveSectionId(sec.id); setShowDrawio(true); }} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Insert Draw.io Diagram"><PenTool className="w-4 h-4" /></button>
                        </>
                    )}
                    {sec.type === 'textarea' && !isPreviewMode && process.env.API_KEY && (
                      <button onClick={() => handleAiGenerate(sec)} disabled={isAiGenerating} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${isAiGenerating ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}><Sparkles className="w-3 h-3" />{isAiGenerating ? '...' : 'AI Help'}</button>
                    )}
                  </div>
                </div>

                {sec.type === 'textarea' ? (
                  <div className="relative">
                    {isPreviewMode ? (
                      <div className="w-full min-h-[160px] p-6 rounded-xl border border-gray-100 bg-white text-gray-700 leading-relaxed shadow-sm">
                         {reportData?.values[sec.id] ? <ContentRenderer text={reportData.values[sec.id]} attachments={reportData.attachments} /> : <span className="text-gray-300 italic">No content...</span>}
                      </div>
                    ) : (
                      <>
                        <div className="absolute top-0 right-0 p-2 z-10 flex gap-2 no-print pointer-events-none">
                            {/* Toolbar placeholder if needed */}
                        </div>
                        <textarea
                          id={`textarea-${sec.id}`}
                          value={reportData?.values[sec.id] || ''}
                          onChange={(e) => handleInputChange(sec.id, e.target.value)}
                          onFocus={() => setActiveSectionId(sec.id)}
                          placeholder={sec.placeholder || "Content here... (LaTeX: $x^2$, Images supported)"}
                          className="w-full min-h-[160px] p-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow text-gray-700 leading-relaxed resize-y shadow-sm font-mono text-sm"
                        />
                      </>
                    )}
                  </div>
                ) : (
                   !isPreviewMode ? (
                    <input type="text" value={reportData?.values[sec.id] || ''} onChange={(e) => handleInputChange(sec.id, e.target.value)} onFocus={() => setActiveSectionId(sec.id)} className="w-full p-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 shadow-sm" />
                   ) : (
                    <div className="text-xl font-bold text-gray-800 border-b pb-2">{reportData?.values[sec.id] || 'Untitled'}</div>
                   )
                )}
                {activeSectionId === sec.id && aiError && !isPreviewMode && <div className="mt-2 text-red-500 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {aiError}</div>}
              </div>
            ))}
            
            {/* Example Space / Placeholder */}
            {!isPreviewMode && activeTemplate.sections.length > 0 && (
              <div className="mt-8 p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-center">
                 <h4 className="text-gray-500 font-medium mb-2">Need an example?</h4>
                 <p className="text-sm text-gray-400 mb-4">You can insert flowcharts, diagrams, or images into any section above using the toolbar icons.</p>
                 <button onClick={() => { setActiveSectionId(activeTemplate.sections[activeTemplate.sections.length - 1].id); setShowDrawio(true); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center justify-center gap-2">
                    <PenTool className="w-4 h-4" /> Open Diagram Editor
                 </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Drawer */}
      {showHistory && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30" onClick={() => setShowHistory(false)} />
          <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white shadow-2xl flex flex-col">
            <div className="p-4 border-b flex justify-between bg-indigo-50/50"><h2 className="font-bold text-gray-800 flex items-center gap-2"><History className="w-5 h-5" /> History</h2><button onClick={() => setShowHistory(false)}><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {reportData?.history?.map((version) => (
                  <div key={version.id} className="p-4 border rounded-lg hover:border-indigo-300 bg-white group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div><h4 className="font-semibold text-sm">{version.name || 'Version'}</h4><p className="text-xs text-gray-500">{new Date(version.timestamp).toLocaleString()}</p></div>
                      <button onClick={() => handleRestoreVersion(version)} className="text-indigo-700 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100" title="Restore"><RotateCcw className="w-4 h-4" /></button>
                    </div>
                  </div>
              ))}
              {(!reportData?.history || reportData.history.length === 0) && <div className="text-center text-gray-400 py-8">No history yet.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;