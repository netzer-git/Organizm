/**
 * Generates a unique identifier for entities in the simulation
 * @returns A unique string ID
 */
export function generateUniqueId(): string {
  // Simple implementation using timestamp and random values
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Mixes two trait values with random variation to simulate genetic inheritance
 * @param traitA First parent trait value
 * @param traitB Second parent trait value
 * @param mutationFactor How much mutation to allow (0-1)
 * @returns The resulting trait value
 */
export function mixTraits(traitA: number, traitB: number, mutationFactor: number = 0.1): number {
  // Base mixing is average of parents with random weighting
  const weight = Math.random();
  const baseTrait = traitA * weight + traitB * (1 - weight);
  
  // Apply random mutation
  const mutation = (Math.random() * 2 - 1) * mutationFactor * baseTrait;
  
  return Math.max(0, baseTrait + mutation);
}

/**
 * Clamps a value between a minimum and maximum
 * @param value The value to clamp
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes a value to be between 0 and 1
 * @param value The value to normalize
 * @param min Minimum expected input value
 * @param max Maximum expected input value
 * @returns Normalized value between 0 and 1
 */
export function normalize(value: number, min: number, max: number): number {
  if (min === max) return 0.5; // Avoid division by zero
  return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Returns a random value from an array
 * @param array The array to select from
 * @returns A random item from the array
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffles an array in place
 * @param array The array to shuffle
 * @returns The shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculates weighted random index based on provided weights
 * @param weights Array of weights (positive numbers)
 * @returns Selected index based on weights
 */
export function weightedRandomIndex(weights: number[]): number {
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (totalWeight <= 0) return Math.floor(Math.random() * weights.length);
  
  let randomValue = Math.random() * totalWeight;
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