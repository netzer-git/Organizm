import { Position } from '../types/Position';
import { Genes } from '../genetics/Genes';
import { Environment } from '../environment/Environment';
import { Resource } from '../environment/Resource';
import { AnimalState } from '../types/AnimalState';
import { UUID } from '../utils/UUID';

export abstract class Animal {
  private id: string;
  private position: Position;
  private energy: number;
  private health: number;
  private age: number;
  private genes: Genes;
  private state: AnimalState;
  private species: string;
  private reproductionCooldown: number;

  constructor(species: string, position: Position, genes?: Genes) {
    this.id = UUID.generate();
    this.species = species;
    this.position = position;
    this.energy = 100;
    this.health = 100;
    this.age = 0;
    this.genes = genes || new Genes();
    this.state = AnimalState.IDLE;
    this.reproductionCooldown = 0;
  }

  public getId(): string {
    return this.id;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public setPosition(position: Position): void {
    this.position = { ...position };
  }

  public getEnergy(): number {
    return this.energy;
  }

  public getHealth(): number {
    return this.health;
  }

  public getAge(): number {
    return this.age;
  }

  public getGenes(): Genes {
    return this.genes;
  }

  public getState(): AnimalState {
    return this.state;
  }

  public getSpecies(): string {
    return this.species;
  }

  public setState(state: AnimalState): void {
    this.state = state;
  }

  public sleep(duration: number): void {
    this.state = AnimalState.SLEEPING;
    const restoreAmount = this.genes.getTraitValue('energyRecoveryRate') * duration;
    this.energy = Math.min(100, this.energy + restoreAmount);
  }

  public eat(resource: Resource): void {
    this.state = AnimalState.EATING;
    const nutritionalValue = resource.getNutritionalValue();
    const metabolismEfficiency = this.genes.getTraitValue('metabolismEfficiency');
    
    const energyGained = nutritionalValue * metabolismEfficiency;
    this.energy = Math.min(100, this.energy + energyGained);
  }

  public move(destination: Position, environment: Environment): void {
    this.state = AnimalState.MOVING;
    const speed = this.genes.getTraitValue('speed');
    const distanceFactor = environment.getTerrainDifficulty(this.position, destination);
    
    // Calculate energy cost based on distance, terrain, and speed
    const distance = Math.sqrt(
      Math.pow(destination.x - this.position.x, 2) + 
      Math.pow(destination.y - this.position.y, 2)
    );
    
    const energyCost = distance * distanceFactor * (1 / speed);
    this.energy = Math.max(0, this.energy - energyCost);
    
    // Update position
    this.position = { ...destination };
  }

  public canMate(): boolean {
    return this.energy > 50 && this.health > 50 && this.reproductionCooldown <= 0;
  }

  public mate(partner: Animal): Animal | null {
    if (!this.canMate() || !partner.canMate() || this.species !== partner.getSpecies()) {
      return null;
    }

    this.state = AnimalState.MATING;
    partner.setState(AnimalState.MATING);
    
    // Create offspring with combined genes
    const offspringGenes = Genes.combine(this.genes, partner.getGenes());
    
    // Position offspring near parents
    const offspringPosition = {
      x: (this.position.x + partner.getPosition().x) / 2,
      y: (this.position.y + partner.getPosition().y) / 2
    };
    
    // Energy cost for reproduction
    this.energy -= 30;
    partner.consumeEnergy(30);
    
    // Set reproduction cooldown
    this.reproductionCooldown = this.genes.getTraitValue('reproductionRate');
    partner.setReproductionCooldown(partner.getGenes().getTraitValue('reproductionRate'));
    
    // Create offspring (to be implemented by subclasses)
    return this.createOffspring(offspringPosition, offspringGenes);
  }

  public update(environment: Environment, deltaTime: number): void {
    // Age increases with time
    this.age += deltaTime;
    
    // Natural energy consumption over time
    const baseMetabolism = this.genes.getTraitValue('baseMetabolism');
    this.energy = Math.max(0, this.energy - (baseMetabolism * deltaTime));
    
    // Health decreases if energy is too low
    if (this.energy < 20) {
      this.health = Math.max(0, this.health - (0.5 * deltaTime));
    }
    
    // Decrease reproduction cooldown
    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown = Math.max(0, this.reproductionCooldown - deltaTime);
    }
    
    // Die if health reaches 0
    if (this.health <= 0) {
      this.die();
    }
    
    // Additional behavior to be implemented by subclasses
    this.updateBehavior(environment, deltaTime);
  }

  public consumeEnergy(amount: number): void {
    this.energy = Math.max(0, this.energy - amount);
  }

  public setReproductionCooldown(cooldown: number): void {
    this.reproductionCooldown = cooldown;
  }

  public die(): void {
    this.state = AnimalState.DEAD;
    // Additional death behavior can be implemented by subclasses
  }

  public isDead(): boolean {
    return this.state === AnimalState.DEAD || this.health <= 0;
  }

  // Abstract methods to be implemented by subclasses
  protected abstract createOffspring(position: Position, genes: Genes): Animal;
  protected abstract updateBehavior(environment: Environment, deltaTime: number): void;
}
