import { 
  generateUniqueId, 
  mixTraits, 
  clamp, 
  normalize, 
  randomChoice, 
  shuffleArray, 
  weightedRandomIndex 
} from '../../src/utils/helpers';

describe('Helper Functions', () => {
  describe('generateUniqueId', () => {
    it('should generate a unique string ID', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });
  });
  
  describe('mixTraits', () => {
    it('should mix two trait values', () => {
      const traitA = 10;
      const traitB = 20;
      
      // Test with zero mutation to ensure it's between the two values
      const result = mixTraits(traitA, traitB, 0);
      
      expect(result).toBeGreaterThanOrEqual(traitA);
      expect(result).toBeLessThanOrEqual(traitB);
    });
    
    it('should never return negative values', () => {
      const traitA = 10;
      const traitB = 20;
      
      // Test with high mutation factor
      const result = mixTraits(traitA, traitB, 1.0);
      
      expect(result).toBeGreaterThanOrEqual(0);
    });
    
    it('should apply the mutation factor correctly', () => {
      const traitA = 100;
      const traitB = 100;
      
      // With identical traits, only mutation can cause variation
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(mixTraits(traitA, traitB, 0.5));
      }
      
      // At least some variation should occur
      const uniqueValues = new Set(results);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });
  
  describe('clamp', () => {
    it('should clamp values to the specified range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
  
  describe('normalize', () => {
    it('should normalize values to the range 0-1', () => {
      expect(normalize(5, 0, 10)).toBe(0.5);
      expect(normalize(0, 0, 10)).toBe(0);
      expect(normalize(10, 0, 10)).toBe(1);
      expect(normalize(15, 0, 10)).toBe(1); // Values outside range get clamped
      expect(normalize(-5, 0, 10)).toBe(0); // Values outside range get clamped
    });
    
    it('should handle min=max case', () => {
      expect(normalize(5, 5, 5)).toBe(0.5);
    });
  });
  
  describe('randomChoice', () => {
    it('should return an item from the array', () => {
      const array = [1, 2, 3, 4, 5];
      const result = randomChoice(array);
      
      expect(array).toContain(result);
    });
  });
  
  describe('shuffleArray', () => {
    it('should return an array with the same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });
    
    it('should not modify the original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      shuffleArray(original);
      
      expect(original).toEqual(originalCopy);
    });
    
    it('should shuffle the elements (statistical test)', () => {
      const original = [1, 2, 3, 4, 5];
      
      // Run multiple shuffles to check if positions change
      let positionsChanged = false;
      for (let i = 0; i < 10; i++) {
        const shuffled = shuffleArray(original);
        
        if (shuffled.some((val, idx) => val !== original[idx])) {
          positionsChanged = true;
          break;
        }
      }
      
      expect(positionsChanged).toBe(true);
    });
  });
  
  describe('weightedRandomIndex', () => {
    it('should return an index within the weights array bounds', () => {
      const weights = [10, 20, 30, 40];
      const result = weightedRandomIndex(weights);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(weights.length);
    });
    
    it('should handle empty or zero weights', () => {
      const weights = [0, 0, 0];
      const result = weightedRandomIndex(weights);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(weights.length);
    });
    
    it('should favor higher weighted indices (statistical test)', () => {
      const weights = [10, 90]; // 10% chance for index 0, 90% for index 1
      let count0 = 0;
      let count1 = 0;
      
      // Run many trials to ensure statistical significance
      for (let i = 0; i < 1000; i++) {
        const result = weightedRandomIndex(weights);
        if (result === 0) count0++;
        if (result === 1) count1++;
      }
      
      // With these weights, index 1 should be chosen more frequently
      expect(count1).toBeGreaterThan(count0);
    });
  });
});