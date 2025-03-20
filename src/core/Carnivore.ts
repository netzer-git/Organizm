// filepath: c:\clones\Organizm\src\core\Carnivore.ts
import { Animal } from './Animal';
import { Position, Direction, Traits, ResourceType, AnimalState } from './types';
import { mixTraits } from '../utils/helpers';
import { Environment } from './Environment';
import { Herbivore } from './Herbivore';

/**
 * A carnivore animal implementation that hunts herbivores
 */
export class Carnivore extends Animal {
  private environment: Environment;
  private targetPrey: Animal | null = null;
  private lastHuntTime: number = 0;
  private huntCooldown: number = 10; // Time between hunts

  /**
   * Create a new carnivore
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
   * Check if this carnivore can mate with another animal
   * @param partner Potential mating partner
   * @returns True if mating is possible
   */
  protected canMateWith(partner: Animal): boolean {
    // Basic mating rules:
    // 1. Can only mate with same species (carnivore)
    // 2. Both animals must have sufficient energy
    // 3. Both animals must not be too young or too old
    
    if (!(partner instanceof Carnivore)) {
      return false;
    }
    
    // Check energy levels
    if (this.energy < 60 || partner.energy < 60) {
      return false;
    }
    
    // Check age - mature but not too old
    const maturityAge = this.traits.lifespan * 0.15;
    const maxReproductiveAge = this.traits.lifespan * 0.75;
    
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
    const offspring: Carnivore[] = [];
    
    // Carnivores typically have fewer offspring than herbivores
    const littersizeFactor = (this.traits.reproductiveUrge + (partner as Carnivore).traits.reproductiveUrge) / 2;
    const litterSize = Math.max(1, Math.floor(littersizeFactor / 40));
    
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
      
      const child = new Carnivore(
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
   * Extend the update method to add carnivore-specific behaviors
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Update hunt cooldown
    this.lastHuntTime += deltaTime;
    
    // If the animal is idle, decide on a new action
    if (!this.dead && this.state === AnimalState.IDLE) {
      this.decideNextAction();
    }
  }

  /**
   * Decide what action to take next based on needs and environment
   */
  private decideNextAction(): void {
    // Priority 1: Hunt if hungry and hunt cooldown has expired
    if (this.energy < 50 && this.lastHuntTime >= this.huntCooldown) {
      this.hunt();
      return;
    }
    
    // Priority 2: Sleep if tired
    if (this.energy < 70) {
      this.sleep(5); // Sleep for 5 time units
      return;
    }
    
    // Priority 3: Look for a mate if healthy
    if (this.energy > 80) {
      // Mating would be implemented here, finding nearby carnivores
      // For now, just move randomly
      this.moveRandomly();
      return;
    }
    
    // Default: Move randomly
    this.moveRandomly();
  }

  /**
   * Hunt for prey (herbivores)
   */
  private hunt(): void {
    // Get all animals within perception range
    const nearbyAnimals = this.environment.getAnimalsNear(this.position, this.traits.perception);
    
    // Filter for herbivores (potential prey)
    const potentialPrey = nearbyAnimals.filter(a => a instanceof Herbivore && !a.dead);
    
    if (potentialPrey.length > 0) {
      // Find the closest prey
      let closestPrey = potentialPrey[0];
      let closestDistance = this.distanceTo(closestPrey.position);
      
      for (let i = 1; i < potentialPrey.length; i++) {
        const distance = this.distanceTo(potentialPrey[i].position);
        if (distance < closestDistance) {
          closestPrey = potentialPrey[i];
          closestDistance = distance;
        }
      }
      
      this.targetPrey = closestPrey;
      
      // If we're close enough, attack and eat it
      if (closestDistance < 1) {
        this.attackPrey(closestPrey);
      } else {
        // Move toward the prey
        const direction = this.directionTo(closestPrey.position);
        this.move(direction);
      }
    } else {
      // No prey nearby, move randomly to look for food
      this.moveRandomly();
    }
  }

  /**
   * Attack and potentially kill prey
   * @param prey The prey to attack
   */
  private attackPrey(prey: Animal): void {
    // Reset the hunt cooldown
    this.lastHuntTime = 0;
    
    // Determine attack success based on strength vs prey's traits
    const attackPower = this.traits.strength * (1 + Math.random() * 0.5);
    const preyDefense = prey.traits.speed * 0.5 + prey.energy * 0.01;
    
    if (attackPower > preyDefense) {
      // Attack succeeded
      this.eat(ResourceType.MEAT);
      
      // Gain energy based on prey's health
      const energyGained = Math.min(prey.health * 0.5, 50);
      this.gainEnergy(energyGained);
      this.stats.foodEaten += 1;
      
      // Kill the prey
      prey.die();
    } else {
      // Attack failed, prey escapes
      // The prey will run away (handled in its own update cycle)
      // Lose some energy from the failed hunt
      this.consumeEnergy(10);
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