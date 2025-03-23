import { Position, Direction, Traits, AnimalState, AnimalStats, ResourceType } from './types';
import { Logger } from '../utils/Logger';
import { generateUniqueId } from '../utils/helpers';
import { Environment } from './Environment';

/**
 * Abstract base class for all animals in the simulation
 */
export abstract class Animal {
  public id: string;
  public position: Position;
  public direction: Direction = Direction.NONE;
  public state: AnimalState = AnimalState.IDLE;
  public age: number = 0;
  private _energy: number = 100; // Default starting energy
  public health: number = 100; // Default starting health
  public traits: Traits;
  public stats: AnimalStats;
  
  private logger: Logger;
  private isDead: boolean = false;
  protected environment: Environment;

  constructor(position: Position, traits: Traits, environment: Environment, generation: number = 1) {
    this.id = generateUniqueId();
    this.position = { ...position };
    this.traits = { ...traits };
    this.environment = environment;
    this.stats = {
      generation,
      children: 0,
      foodEaten: 0,
      distanceTraveled: 0,
      timeAlive: 0
    };
    this.logger = new Logger(`Animal-${this.id}`);
    this.logger.info(`Animal created at position (${position.x}, ${position.y})`);
  }

  /**
   * Energy getter - allows for proper jest.spyOn in tests
   */
  public get energy(): number {
    return this._energy;
  }

  /**
   * Energy setter - allows for proper jest.spyOn in tests
   */
  public set energy(value: number) {
    this._energy = value;
  }

  /**
   * Update the animal's state for one simulation tick
   * @param deltaTime Time elapsed since last update in simulation units
   */
  public update(deltaTime: number): void {
    if (this.isDead) return;
    
    // Update basic stats
    this.age += deltaTime;
    this.stats.timeAlive += deltaTime;
    
    // Consume energy based on metabolism
    this.consumeEnergy(this.traits.metabolism * deltaTime);
    
    // Check if the animal should die of old age or energy depletion
    if (this.age >= this.traits.lifespan || this._energy <= 0) {
      this.die();
      return;
    }

    // Perform action based on current state
    this.performStateAction(deltaTime);
  }

  /**
   * Performs the appropriate action based on the animal's current state
   * @param deltaTime Time elapsed since last update
   */
  private performStateAction(deltaTime: number): void {
    switch (this.state) {
      case AnimalState.SLEEPING:
        this.performSleeping(deltaTime);
        break;
      case AnimalState.MOVING:
        this.performMoving(deltaTime);
        break;
      case AnimalState.EATING:
        this.performEating(deltaTime);
        break;
      case AnimalState.MATING:
        this.performMating(deltaTime);
        break;
      case AnimalState.IDLE:
      default:
        this.performIdle(deltaTime);
        break;
    }
  }

  /**
   * Sleep to regain energy
   * @param duration How long to sleep in simulation units
   */
  public sleep(duration: number): void {
    this.state = AnimalState.SLEEPING;
    this.logger.debug(`Started sleeping for ${duration} time units`);
  }

  /**
   * Move in a specific direction
   * @param direction Direction to move in
   */
  public move(direction: Direction): void {
    this.direction = direction;
    this.state = AnimalState.MOVING;
    this.logger.debug(`Started moving in direction: ${Direction[direction]}`);
  }

  /**
   * Start eating a resource
   * @param resourceType Type of resource to eat
   */
  public eat(resourceType: ResourceType): void {
    this.state = AnimalState.EATING;
    this.logger.debug(`Started eating ${ResourceType[resourceType]}`);
  }

  /**
   * Attempt to mate with another animal
   * @param partner The potential mating partner
   */
  public mate(partner: Animal): void {
    if (!this.canMateWith(partner)) {
      this.logger.debug('Mating attempt rejected');
      return;
    }

    this.state = AnimalState.MATING;
    this.logger.debug(`Started mating with animal ${partner.id}`);
  }

  /**
   * Check if this animal can mate with another
   * @param partner Potential mating partner
   * @returns True if mating is possible
   */
  protected abstract canMateWith(partner: Animal): boolean;

  /**
   * Create offspring based on parents' traits
   * @param partner The mating partner
   */
  public reproduce(partner: Animal): Animal[] {
    this.stats.children++;
    return this.createOffspring(partner);
  }

  /**
   * Creates new offspring with traits derived from parents
   * @param partner The other parent
   */
  protected abstract createOffspring(partner: Animal): Animal[];

  /**
   * Handle the animal's death
   */
  public die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.state = AnimalState.DEAD;
    this.logger.info(`Animal died at age ${this.age}, generation ${this.stats.generation}`);
  }

  /**
   * Check if the animal is dead
   */
  public get dead(): boolean {
    return this.isDead;
  }

  /**
   * Consume energy from the animal
   * @param amount Amount of energy to consume
   */
  protected consumeEnergy(amount: number): void {
    this._energy = Math.max(0, this._energy - amount);
    if (this._energy <= 0) {
      this.logger.debug('Ran out of energy');
    }
  }

  /**
   * Gain energy from consuming resources
   * @param amount Amount of energy to gain
   */
  protected gainEnergy(amount: number): void {
    // Cap energy at 100
    this._energy = Math.min(100, this._energy + amount);
  }

  /* Implementation of state-specific behaviors */

  private performSleeping(deltaTime: number): void {
    // When sleeping, regain energy at a faster rate than before
    const energyRecoveryRate = 1.5 * this.traits.metabolism;
    this.gainEnergy(energyRecoveryRate * deltaTime);
  }

  private performMoving(deltaTime: number): void {
    // Calculate distance based on speed trait
    const distance = this.traits.speed * deltaTime;
    this.stats.distanceTraveled += distance;

    // Update position based on direction and distance
    this.updatePosition(distance);

    // Moving consumes energy based on speed
    this.consumeEnergy(0.2 * this.traits.speed * deltaTime);
  }

  private performEating(deltaTime: number): void {
    // Implemented by concrete animal classes
  }

  private performMating(deltaTime: number): void {
    // Energy cost of mating
    this.consumeEnergy(10 * deltaTime);
  }

  private performIdle(deltaTime: number): void {
    // Even when idle, the animal consumes a small amount of energy
    this.consumeEnergy(0.1 * this.traits.metabolism * deltaTime);
  }

  /**
   * Update the animal's position based on direction and distance
   * @param distance Distance to move
   */
  private updatePosition(distance: number): void {
    const directionVectors = {
      [Direction.NORTH]: { x: 0, y: -1 },
      [Direction.NORTHEAST]: { x: 0.7071, y: -0.7071 },
      [Direction.EAST]: { x: 1, y: 0 },
      [Direction.SOUTHEAST]: { x: 0.7071, y: 0.7071 },
      [Direction.SOUTH]: { x: 0, y: 1 },
      [Direction.SOUTHWEST]: { x: -0.7071, y: 0.7071 },
      [Direction.WEST]: { x: -1, y: 0 },
      [Direction.NORTHWEST]: { x: -0.7071, y: -0.7071 },
      [Direction.NONE]: { x: 0, y: 0 },
    };

    const vector = directionVectors[this.direction];
    const newPosition = {
      x: this.position.x + vector.x * distance,
      y: this.position.y + vector.y * distance
    };
    
    // Use the environment to ensure the animal stays within bounds
    if (this.environment) {
      this.position = this.environment.boundPosition(newPosition);
    } else {
      this.position = newPosition;
    }
  }

  /**
   * Calculate the distance to another position
   * @param target Target position
   * @returns Distance to target
   */
  public distanceTo(target: Position): number {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get the direction toward a target position
   * @param target Target position
   * @returns Direction toward target
   */
  public directionTo(target: Position): Direction {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    
    // Calculate angle in radians, then convert to degrees
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Convert angle to one of the 8 compass directions
    if (angle >= -22.5 && angle < 22.5) return Direction.EAST;
    if (angle >= 22.5 && angle < 67.5) return Direction.SOUTHEAST;
    if (angle >= 67.5 && angle < 112.5) return Direction.SOUTH;
    if (angle >= 112.5 && angle < 157.5) return Direction.SOUTHWEST;
    if (angle >= 157.5 || angle < -157.5) return Direction.WEST;
    if (angle >= -157.5 && angle < -112.5) return Direction.NORTHWEST;
    if (angle >= -112.5 && angle < -67.5) return Direction.NORTH;
    return Direction.NORTHEAST;
  }
}