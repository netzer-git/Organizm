import { Animal } from '../../src/core/Animal';
import { Position, Traits, AnimalState } from '../../src/core/types';
import { Environment } from '../../src/core/Environment';

/**
 * A test implementation of Animal for use in unit tests
 */
export class TestAnimal extends Animal {
  /**
   * Create a new test animal
   * @param position Initial position
   * @param traits Animal traits 
   * @param environment Optional environment reference
   * @param generation Optional generation value
   */
  constructor(position: Position, traits: Traits, environment?: Environment, generation: number = 1) {
    // If environment is not provided, create a mock environment
    const mockEnvironment = environment || {
      width: 100,
      height: 100,
      boundPosition: (pos: Position) => pos,
      getTerrainAt: () => 0, // LAND terrain
      getResourcesNear: () => [],
      isInBounds: () => true,
      weather: 0,
      resources: [],
      getAnimalsNear: () => [],
      updateAnimals: () => {}
    } as unknown as Environment;
    
    super(position, traits, mockEnvironment, generation);
  }
  
  /**
   * Test implementation of the abstract eat method
   * @param resourceType The type of resource being consumed
   */
  public eat(resourceType: number): void {
    // Simple test implementation
    this.state = AnimalState.EATING;
    this.gainEnergy(10);
  }

  /**
   * Test implementation of canMateWith method
   */
  protected canMateWith(partner: Animal): boolean {
    // Simple implementation for tests - can always mate
    return this.energy >= 60 && partner.energy >= 60;
  }

  /**
   * Test implementation of createOffspring method
   */
  protected createOffspring(partner: Animal): Animal[] {
    // Create a single offspring with mixed traits
    const childTraits: Traits = {
      speed: (this.traits.speed + partner.traits.speed) / 2,
      strength: (this.traits.strength + partner.traits.strength) / 2,
      perception: (this.traits.perception + partner.traits.perception) / 2,
      metabolism: (this.traits.metabolism + partner.traits.metabolism) / 2,
      reproductiveUrge: (this.traits.reproductiveUrge + partner.traits.reproductiveUrge) / 2,
      lifespan: (this.traits.lifespan + partner.traits.lifespan) / 2
    };
    
    const childPosition = { ...this.position };
    const nextGeneration = Math.max(this.stats.generation, partner.stats.generation) + 1;
    
    // Return array with a single offspring
    return [new TestAnimal(childPosition, childTraits, this.environment, nextGeneration)];
  }
}