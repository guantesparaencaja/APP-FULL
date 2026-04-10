import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Info, Flame } from 'lucide-react';
import { FundamentosModule, FundamentosVideo } from '../../types/fundamentos.types';

interface Props {
  module: FundamentosModule;
  isUnlocked?: boolean;
}

export function FundamentosModuleCard({ module, isUnlocked = true }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'teoria' | 'videos'>('teoria');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const containerVariants = {
    collapsed: { height: '80px' },
    expanded: { height: 'auto' }
  };

  return (
    <motion.div
      layout
      className={`bg-slate-900/60 border rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-2xl ${
        isExpanded ? 'border-primary/40 ring-1 ring-primary/20' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div 
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border transition-all duration-500 ${
            isExpanded ? 'bg-primary/20 border-primary/40 scale-110 rotate-3' : 'bg-slate-800 border-slate-700'
          }`}>
            {module.emoji}
          </div>
          <div>
            <h3 className={`font-black text-xl tracking-tight transition-colors ${
              isExpanded ? 'text-primary' : 'text-slate-100'
            }`}>
              {module.title}
            </h3>
            <p className="text-sm text-slate-400 font-medium">{module.description}</p>
          </div>
        </div>
        <div className={`p-3 rounded-full bg-slate-800/50 border border-slate-700 transition-transform duration-500 ${
          isExpanded ? 'rotate-180 text-primary' : 'text-slate-400'
        }`}>
          <ChevronDown className="w-6 h-6" />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6 pb-8 border-t border-slate-800/50"
          >
            <div className="flex gap-2 p-1.5 bg-slate-950/50 rounded-2xl border border-slate-800/50 my-6">
              {(['teoria', 'videos'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    activeTab === tab 
                      ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === 'teoria' ? 'Fundamentos' : 'Práctica (Videos)'}
                </button>
              ))}
            </div>

            {activeTab === 'teoria' ? (
              <div className="space-y-4">
                {module.content.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`rounded-3xl border transition-all duration-300 ${
                      expandedItem === idx 
                        ? 'bg-slate-800/40 border-primary/20 p-5' 
                        : 'bg-slate-900/30 border-slate-800/50 p-4 hover:border-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}
                      className="w-full flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border ${
                          expandedItem === idx ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-sm font-bold tracking-tight ${
                          expandedItem === idx ? 'text-white underline decoration-primary/50 underline-offset-4' : 'text-slate-300'
                        }`}>
                          {item.title}
                        </span>
                      </div>
                      <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${
                        expandedItem === idx ? 'rotate-90 text-primary' : 'text-slate-600'
                      }`} />
                    </button>

                    <AnimatePresence>
                      {expandedItem === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-5 space-y-6">
                            <p className="text-sm text-slate-400 leading-relaxed italic">
                              "{item.description}"
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-4xl">
                                <h5 className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Ejecución Correcta
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                  {item.execution}
                                </p>
                              </div>

                              <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-4xl">
                                <h5 className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                                  <AlertCircle className="w-3.5 h-3.5" /> Errores Comunes
                                </h5>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                  {item.errors}
                                </p>
                              </div>
                            </div>

                            {item.combinations && (
                              <div className="bg-primary/5 border border-primary/10 p-5 rounded-4xl">
                                <h5 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest mb-3">
                                  <Flame className="w-3.5 h-3.5" /> Combinaciones Recomendadas
                                </h5>
                                <p className="text-xs text-slate-300 font-bold tracking-wider">
                                  {item.combinations}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            ) : (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-8 bg-slate-950/30 rounded-[2.5rem] border border-dashed border-slate-800">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                   <Info className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500 font-bold text-sm">Próximamente estaremos cargando los videos para este módulo</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {module.videoTags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-800/50 text-[10px] text-slate-500 rounded-full border border-slate-700 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
