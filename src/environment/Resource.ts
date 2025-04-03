import { Position } from '../types/Position';
import { UUID } from '../utils/UUID';

export class Resource {
  private id: string;
  private position: Position;
  private type: string;
  private nutritionalValue: number;
  private quantity: number;

  constructor(position: Position, type: string, nutritionalValue: number, quantity: number = 1) {
    this.id = UUID.generate();
    this.position = position;
    this.type = type;
    this.nutritionalValue = nutritionalValue;
    this.quantity = quantity;
  }

  public getId(): string {
    return this.id;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public getType(): string {
    return this.type;
  }

  public getNutritionalValue(): number {
    return this.nutritionalValue;
  }

  public getQuantity(): number {
    return this.quantity;
  }

  public consume(amount: number = 1): number {
    const consumed = Math.min(this.quantity, amount);
    this.quantity -= consumed;
    return consumed;
  }

  public isDepletable(): boolean {
    return this.quantity > 0;
  }

  public isDepleted(): boolean {
    return this.quantity <= 0;
  }
}
