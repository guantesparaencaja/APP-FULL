/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HealthyRecipe } from '../data/healthyRecipes';

/**
 * Utility to parse or format recipe data for display
 */
export const formatRecipeForDisplay = (recipe: HealthyRecipe) => {
  return {
    ...recipe,
    displayIngredients: recipe.ingredientes.join(', '),
    displayPreparation: recipe.preparacion.join('\n')
  };
};

export const filterRecipesByCategory = (recipes: HealthyRecipe[], category: string) => {
  if (category === 'todas') return recipes;
  return recipes.filter(r => r.categoria.toLowerCase() === category.toLowerCase());
};
