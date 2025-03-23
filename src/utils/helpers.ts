/**
 * Generate a unique ID for objects in the simulation
 * @returns A unique string ID
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Mix two trait values with optional mutation
 * @param traitA First parent's trait value
 * @param traitB Second parent's trait value
 * @param mutationFactor How much mutation to apply (0 to 1)
 * @returns Mixed trait value
 */
export function mixTraits(
  traitA: number, 
  traitB: number, 
  mutationFactor: number = 0.1
): number {
  // Base mixing is weighted average of parents
  const mixRatio = Math.random();
  const baseMix = traitA * mixRatio + traitB * (1 - mixRatio);
  
  // Apply mutation
  const mutationRange = Math.max(traitA, traitB) * mutationFactor;
  const mutation = (Math.random() * 2 - 1) * mutationRange;
  
  // Ensure the result is positive
  return Math.max(0, baseMix + mutation);
}

/**
 * Clamp a value between min and max
 * @param value The value to clamp
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize a value to the range 0-1
 * @param value The value to normalize
 * @param min Minimum value in the range
 * @param max Maximum value in the range
 * @returns Normalized value between 0 and 1
 */
export function normalize(value: number, min: number, max: number): number {
  // Handle edge case
  if (min === max) return 0.5;
  
  // Normalize and clamp
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Choose a random element from an array
 * @param array The array to choose from
 * @returns A random element from the array
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle an array in-place using Fisher-Yates algorithm
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Pick an index based on weighted probabilities
 * @param weights Array of weights (higher value = higher chance)
 * @returns Selected index
 */
export function weightedRandomIndex(weights: number[]): number {
  // Calculate total weight
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  
  // If all weights are zero or negative, return random index
  if (totalWeight <= 0) {
    return Math.floor(Math.random() * weights.length);
  }
  
  // Pick a random value between 0 and total weight
  let randomValue = Math.random() * totalWeight;
  
  // Find the index corresponding to the random value
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] > 0) {
      randomValue -= weights[i];
      if (randomValue < 0) {
        return i;
      }
    }
  }
  
  return weights.length - 1;
}