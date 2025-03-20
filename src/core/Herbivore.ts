import { Animal } from './Animal';
import { Position, Direction, Traits, ResourceType, AnimalState } from './types';
import { mixTraits } from '../utils/helpers';
import { Environment } from './Environment';
import { Resource } from './Resource';

/**
 * A basic herbivore animal implementation
 */
export class Herbivore extends Animal {
  private environment: Environment;
  private targetResource: Resource | null = null;

  /**
   * Create a new herbivore
   * @param position Starting position
   * @param traits Animal traits
   * @param environment Reference to the environment
   * @param generation Generation number
   */
  constructor(position: Position, traits: Traits, environment: Environment, generation: number = 1) {
    super(position, traits, generation);
    this.environment = environment;
  }

  /**
   * Check if this herbivore can mate with another animal
   * @param partner Potential mating partner
   * @returns True if mating is possible
   */
  protected canMateWith(partner: Animal): boolean {
    // Basic mating rules:
    // 1. Can only mate with same species (herbivore)
    // 2. Both animals must have sufficient energy
    // 3. Both animals must not be too young or too old
    
    if (!(partner instanceof Herbivore)) {
      return false;
    }
    
    // Check energy levels
    if (this.energy < 50 || partner.energy < 50) {
      return false;
    }
    
    // Check age - mature but not too old
    const maturityAge = this.traits.lifespan * 0.1;
    const maxReproductiveAge = this.traits.lifespan * 0.8;
    
    if (this.age < maturityAge || partner.age < maturityAge) {
      return false;
    }
    
    if (this.age > maxReproductiveAge || partner.age > maxReproductiveAge) {
      return false;
    }
    
    return true;
  }

  /**
   * Create offspring based on parents' traits
   * @param partner The mating partner
   * @returns Array of new offspring
   */
  protected createOffspring(partner: Animal): Animal[] {
    const offspring: Herbivore[] = [];
    
    // Determine number of offspring based on traits
    const littersizeFactor = this.traits.reproductiveUrge + (partner as Herbivore).traits.reproductiveUrge;
    const litterSize = Math.max(1, Math.floor(littersizeFactor / 30));
    
    // Create each child
    for (let i = 0; i < litterSize; i++) {
      // Mix parent traits with potential mutations
      const childTraits: Traits = {
        speed: mixTraits(this.traits.speed, partner.traits.speed),
        strength: mixTraits(this.traits.strength, partner.traits.strength),
        perception: mixTraits(this.traits.perception, partner.traits.perception),
        metabolism: mixTraits(this.traits.metabolism, partner.traits.metabolism),
        reproductiveUrge: mixTraits(this.traits.reproductiveUrge, partner.traits.reproductiveUrge),
        lifespan: mixTraits(this.traits.lifespan, partner.traits.lifespan)
      };
      
      // Create child at nearby position
      const childPosition = {
        x: this.position.x + (Math.random() * 2 - 1),
        y: this.position.y + (Math.random() * 2 - 1)
      };
      
      // Make sure child position is within environment bounds
      const boundedPosition = this.environment.boundPosition(childPosition);
      
      const child = new Herbivore(
        boundedPosition,
        childTraits,
        this.environment,
        this.stats.generation + 1
      );
      
      offspring.push(child);
    }
    
    return offspring;
  }

  /**
   * Extend the update method to add herbivore-specific behaviors
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // If the animal is idle, decide on a new action
    if (!this.dead && this.state === AnimalState.IDLE) {
      this.decideNextAction();
    }
  }

  /**
   * Decide what action to take next based on needs and environment
   */
  private decideNextAction(): void {
    // Priority 1: Eat if hungry
    if (this.energy < 40) {
      this.findAndEatPlant();
      return;
    }
    
    // Priority 2: Sleep if tired
    if (this.energy < 70) {
      this.sleep(5); // Sleep for 5 time units
      return;
    }
    
    // Priority 3: Look for a mate if healthy
    if (this.energy > 80) {
      // Mating would be implemented here, finding nearby herbivores
      // For now, just move randomly
      this.moveRandomly();
      return;
    }
    
    // Default: Move randomly
    this.moveRandomly();
  }

  /**
   * Find nearby plant resources and move toward them to eat
   */
  private findAndEatPlant(): void {
    // Look for nearby plant resources
    const nearbyResources = this.environment.getResourcesNear(this.position, this.traits.perception);
    
    // Filter for plants
    const plants = nearbyResources.filter(r => r.type === ResourceType.PLANT);
    
    if (plants.length > 0) {
      // Find the closest plant
      let closestPlant = plants[0];
      let closestDistance = this.distanceTo(closestPlant.position);
      
      for (let i = 1; i < plants.length; i++) {
        const distance = this.distanceTo(plants[i].position);
        if (distance < closestDistance) {
          closestPlant = plants[i];
          closestDistance = distance;
        }
      }
      
      this.targetResource = closestPlant;
      
      // If we're close enough, eat it
      if (closestDistance < 1) {
        this.eat(ResourceType.PLANT);
        const consumedAmount = closestPlant.consume(1);
        this.gainEnergy(consumedAmount * closestPlant.energyValue);
        this.stats.foodEaten += consumedAmount;
      } else {
        // Move toward the plant
        const direction = this.directionTo(closestPlant.position);
        this.move(direction);
      }
    } else {
      // No plants nearby, move randomly to look for food
      this.moveRandomly();
    }
  }

  /**
   * Move in a random direction
   */
  private moveRandomly(): void {
    const directions = [
      Direction.NORTH,
      Direction.NORTHEAST,
      Direction.EAST,
      Direction.SOUTHEAST,
      Direction.SOUTH,
      Direction.SOUTHWEST,
      Direction.WEST,
      Direction.NORTHWEST
    ];
    
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    this.move(randomDirection);
  }
}