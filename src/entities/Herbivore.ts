import { Animal } from './Animal';
import { Position } from '../types/Position';
import { Genes } from '../genetics/Genes';
import { Environment } from '../environment/Environment';
import { AnimalState } from '../types/AnimalState';
import { TerrainType } from '../environment/TerrainType';

export class Herbivore extends Animal {
  constructor(position: Position, genes?: Genes) {
    super('Herbivore', position, genes);
  }

  protected createOffspring(position: Position, genes: Genes): Animal {
    return new Herbivore(position, genes);
  }

  protected updateBehavior(environment: Environment, deltaTime: number): void {
    // Skip behavior update if the animal is dead
    if (this.isDead()) {
      return;
    }

    // State machine for herbivore behavior
    switch (this.getState()) {
      case AnimalState.IDLE:
        this.decideNextAction(environment);
        break;
      
      case AnimalState.MOVING:
        // Continue moving or switch to another action
        if (this.getEnergy() < 20) {
          this.lookForFood(environment);
        } else if (this.getEnergy() < 40) {
          this.setState(AnimalState.IDLE);
        }
        break;
        
      case AnimalState.EATING:
        // After eating, return to idle
        this.setState(AnimalState.IDLE);
        break;
        
      case AnimalState.SLEEPING:
        // Wake up if energy is restored or it's daytime
        if (this.getEnergy() > 90 || environment.isDayTime()) {
          this.setState(AnimalState.IDLE);
        }
        break;
        
      case AnimalState.MATING:
        // Return to idle after mating
        this.setState(AnimalState.IDLE);
        break;
        
      case AnimalState.FLEEING:
        // Continue fleeing or return to idle if safe
        this.setState(AnimalState.IDLE);
        break;
    }
  }

  private decideNextAction(environment: Environment): void {
    // Decision making based on needs and surroundings
    if (this.getEnergy() < 30) {
      // Hungry, look for food
      this.lookForFood(environment);
    } else if (this.getEnergy() < 60) {
      // Not hungry but not full either, explore
      this.explore(environment);
    } else if (!environment.isDayTime() || this.getEnergy() < 40) {
      // Night time or tired, sleep
      this.sleep(1);
    } else if (this.canMate()) {
      // Look for mates
      this.lookForMate(environment);
    } else {
      // Otherwise just explore
      this.explore(environment);
    }
  }

  private lookForFood(environment: Environment): void {
    const senseRange = this.getGenes().getTraitValue('senseRange');
    const resources = environment.getResourcesNear(this.getPosition(), senseRange);
    
    // Filter for plant resources
    const plants = resources.filter(resource => 
      resource.getType() === 'plant' && !resource.isDepleted()
    );
    
    if (plants.length > 0) {
      // Find the closest plant
      const closestPlant = plants.reduce((closest, current) => {
        const closestDistance = this.getDistanceTo(closest.getPosition());
        const currentDistance = this.getDistanceTo(current.getPosition());
        return currentDistance < closestDistance ? current : closest;
      });
      
      // If we're at the plant, eat it
      if (this.getDistanceTo(closestPlant.getPosition()) < 1) {
        this.eat(closestPlant);
        closestPlant.consume(1);
        if (closestPlant.isDepleted()) {
          environment.removeResource(closestPlant.getId());
        }
      } else {
        // Move towards the plant
        this.move(closestPlant.getPosition(), environment);
      }
    } else {
      // No food found, explore
      this.explore(environment);
    }
  }

  private explore(environment: Environment): void {
    // Move in a random direction
    const currentPos = this.getPosition();
    const speed = this.getGenes().getTraitValue('speed');
    
    // Try a few random directions to find a valid move
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = (Math.random() * 0.5 + 0.5) * speed;
      
      const newPos = {
        x: currentPos.x + Math.cos(angle) * distance,
        y: currentPos.y + Math.sin(angle) * distance
      };
      
      // Check if the new position is valid
      if (environment.isWithinBounds(newPos) && 
          environment.getTerrainAt(newPos) !== TerrainType.WATER &&
          environment.getTerrainAt(newPos) !== TerrainType.BOUNDARY) {
        this.move(newPos, environment);
        break;
      }
    }
  }

  private lookForMate(environment: Environment): void {
    // This would be implemented to find a mate of the same species nearby
    // For now, just explore
    this.explore(environment);
  }

  private getDistanceTo(position: Position): number {
    const myPos = this.getPosition();
    return Math.sqrt(
      Math.pow(position.x - myPos.x, 2) + 
      Math.pow(position.y - myPos.y, 2)
    );
  }
}
