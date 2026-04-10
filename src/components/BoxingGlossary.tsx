import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export function BoxingGlossary() {
  const [isOpen, setIsOpen] = useState(false);

  const glossary = [
    { term: 'PI', definition: 'Paso izquierda' },
    { term: 'PD', definition: 'Paso derecha' },
    { term: 'PA', definition: 'Paso atras' },
    { term: 'PDE', definition: 'Paso adelante' },
    { term: 'PC', definition: 'Paso cruzado' },
    { term: 'P', definition: 'Pivot (cuarto de giro)' },
    { term: 'PE', definition: 'Pendulo (Paso diagonal)' },
    { term: '-', definition: 'Rolly (cintura completa)' },
    { term: '/', definition: 'Cabeceo (media cintura)' },
    { term: 'DJ', definition: 'Doble jab' },
    { term: 'DR', definition: 'Doble recto' },
    { term: 'DG', definition: 'Doble gancho' },
    { term: 'DCR', definition: 'Doble croche' },
    { term: 'DUP', definition: 'Doble uppercut con mano del jab' },
    { term: 'DUPR', definition: 'Doble uppercut con mano del recto' },
    { term: '1', definition: 'Jab' },
    { term: '2', definition: 'Recto' },
    { term: '3', definition: 'Gancho' },
    { term: '4', definition: 'Croche' },
    { term: '5', definition: 'Uppercut mano del jab' },
    { term: '6', definition: 'Uppercut mano del Recto' },
    { term: '7', definition: 'Jab al cuerpo' },
    { term: '8', definition: 'Recto al cuerpo' },
    { term: '9', definition: 'Gancho al cuerpo con mano del jab' },
    { term: '10', definition: 'Croche al cuerpo con mano del recto' },
  ];

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-6 shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-bold text-lg">Glosario de Boxeo</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {glossary.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <span className="font-black text-primary min-w-[40px]" translate="no">
                {item.term}
              </span>
              <span className="text-slate-300 text-sm">{item.definition}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
