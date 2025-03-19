import { Position, ResourceType } from './types';
import { Logger } from '../utils/Logger';
import { generateUniqueId } from '../utils/helpers';

/**
 * Represents a consumable resource in the environment
 */
export class Resource {
  public id: string;
  public position: Position;
  public type: ResourceType;
  public amount: number;
  public regenerationRate: number;
  
  private logger: Logger;
  private isDepleted: boolean = false;

  /**
   * Creates a new resource
   * @param position The position of the resource
   * @param type The type of resource
   * @param amount The initial amount of the resource
   * @param regenerationRate How quickly this resource regenerates (units per time)
   */
  constructor(position: Position, type: ResourceType, amount: number, regenerationRate: number = 0) {
    this.id = generateUniqueId();
    this.position = { ...position };
    this.type = type;
    this.amount = amount;
    this.regenerationRate = regenerationRate;
    this.logger = new Logger(`Resource-${ResourceType[type]}-${this.id}`);
    this.logger.debug(`Resource created at (${position.x}, ${position.y}) with amount ${amount}`);
  }

  /**
   * Updates the resource for one simulation tick
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    if (this.isDepleted) return;

    // Regenerate resource over time if it has a positive regeneration rate
    if (this.regenerationRate > 0) {
      this.amount += this.regenerationRate * deltaTime;
      this.logger.debug(`Resource regenerated to ${this.amount}`);
    }
  }

  /**
   * Consume some amount of this resource
   * @param consumeAmount Amount to consume
   * @returns The actual amount consumed (may be less if not enough available)
   */
  public consume(consumeAmount: number): number {
    if (this.isDepleted) return 0;
    
    const actualConsumption = Math.min(this.amount, consumeAmount);
    this.amount -= actualConsumption;
    
    this.logger.debug(`Resource consumed: ${actualConsumption}, remaining: ${this.amount}`);
    
    if (this.amount <= 0) {
      this.isDepleted = true;
      this.logger.info('Resource depleted');
    }
    
    return actualConsumption;
  }

  /**
   * Check if the resource is depleted
   */
  public get depleted(): boolean {
    return this.isDepleted;
  }

  /**
   * Get the nutritional value of this resource based on type
   */
  public get nutritionalValue(): number {
    switch (this.type) {
      case ResourceType.PLANT:
        return 5;
      case ResourceType.SMALL_ANIMAL:
        return 15;
      case ResourceType.LARGE_ANIMAL:
        return 30;
      case ResourceType.WATER:
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Get the energy provided by consuming one unit of this resource
   */
  public get energyValue(): number {
    return this.nutritionalValue * 2;
  }
}