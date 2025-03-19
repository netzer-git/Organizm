import { Animal } from '../../src/core/Animal';
import { Position, Direction, Traits, AnimalState, AnimalStats } from '../../src/core/types';

/**
 * Concrete implementation of Animal class for testing purposes
 */
export class TestAnimal extends Animal {
  constructor(position: Position, traits: Traits, generation: number = 1) {
    super(position, traits, generation);
  }

  /**
   * Implementation of the abstract canMateWith method for testing
   */
  protected canMateWith(partner: Animal): boolean {
    // Simple implementation for testing
    return partner instanceof TestAnimal && this.energy > 50 && partner.energy > 50;
  }

  /**
   * Implementation of the abstract createOffspring method for testing
   */
  protected createOffspring(partner: Animal): Animal[] {
    // Create a single offspring at the same position as this animal
    const offspring = new TestAnimal(
      { ...this.position },
      { ...this.traits },
      this.stats.generation + 1
    );
    
    return [offspring];
  }
}