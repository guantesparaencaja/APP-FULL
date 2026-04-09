/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Flame, ChefHat, Info } from 'lucide-react';
import { HealthyRecipe } from '../data/healthyRecipes';

interface RecipeCardProps {
  recipe: HealthyRecipe;
  onViewDetails: (recipe: HealthyRecipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onViewDetails }) => {
  return (
    <div 
      className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg hover:border-emerald-500/50 transition-all group relative cursor-pointer"
      onClick={() => onViewDetails(recipe)}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={recipe.imagen_url || 'https://images.unsplash.com/photo-1495195134817-a1a280719e38?w=800&q=80'} 
          alt={recipe.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-90"></div>
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
          {recipe.categoria}
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-xl text-white mb-2 leading-tight group-hover:text-emerald-400 transition-colors">{recipe.titulo}</h3>
          
          <div className="flex items-center gap-4 text-slate-300 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase">{recipe.tiempo}</span>
            </div>
            <div className="flex items-center gap-1">
              <ChefHat className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase">{recipe.ingredientes.length} Ingredientes</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] font-bold text-white">{recipe.calorias_aprox} kcal</span>
            </div>
            
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
              Ver detalles <Info className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
