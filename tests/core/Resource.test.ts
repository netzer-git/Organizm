import { Resource } from '../../src/core/Resource';
import { Position, ResourceType } from '../../src/core/types';

describe('Resource', () => {
  // Common test position
  const testPosition: Position = { x: 10, y: 10 };

  beforeEach(() => {
    // Reset any shared state or mocks
    jest.clearAllMocks();
  });

  it('should create a resource with the correct initial properties', () => {
    const resource = new Resource(
      testPosition,
      ResourceType.PLANT,
      50,
      0.5
    );

    expect(resource.id).toBeDefined();
    expect(resource.position).toEqual(testPosition);
    expect(resource.type).toBe(ResourceType.PLANT);
    expect(resource.amount).toBe(50);
    expect(resource.regenerationRate).toBe(0.5);
  });

  it('should not modify the original position object', () => {
    const originalPosition = { x: 10, y: 10 };
    const resource = new Resource(
      originalPosition,
      ResourceType.PLANT,
      50,
      0.5
    );

    // Change the resource position
    resource.position.x = 20;

    // Original position should remain unchanged
    expect(originalPosition.x).toBe(10);
  });

  it('should update amount based on regeneration rate', () => {
    const resource = new Resource(
      testPosition,
      ResourceType.PLANT,
      50,
      1.5 // 1.5 units per time unit
    );

    // Simulate time passing
    resource.update(2); // 2 time units

    // Amount should increase by regenerationRate * deltaTime
    expect(resource.amount).toBe(53); // 50 + (1.5 * 2)
  });

  it('should not regenerate if depleted', () => {
    const resource = new Resource(
      testPosition,
      ResourceType.PLANT,
      5,
      1
    );

    // Consume all the resource
    resource.consume(10);
    expect(resource.depleted).toBe(true);

    // Try to update
    resource.update(1);

    // Amount should still be 0
    expect(resource.amount).toBe(0);
  });

  it('should return the correct amount consumed', () => {
    const resource = new Resource(
      testPosition,
      ResourceType.PLANT,
      10,
      0
    );

    // Consume less than available
    const firstConsumption = resource.consume(4);
    expect(firstConsumption).toBe(4);
    expect(resource.amount).toBe(6);

    // Try to consume more than available
    const secondConsumption = resource.consume(10);
    expect(secondConsumption).toBe(6); // Only remaining amount
    expect(resource.amount).toBe(0);
    expect(resource.depleted).toBe(true);
  });

  it('should return 0 consumed when already depleted', () => {
    const resource = new Resource(
      testPosition,
      ResourceType.PLANT,
      5,
      0
    );

    // Deplete the resource
    resource.consume(5);
    expect(resource.depleted).toBe(true);

    // Try to consume more
    const consumption = resource.consume(1);
    expect(consumption).toBe(0);
  });

  it('should provide correct nutritional value based on type', () => {
    const plant = new Resource(testPosition, ResourceType.PLANT, 10, 0);
    const smallAnimal = new Resource(testPosition, ResourceType.SMALL_ANIMAL, 10, 0);
    const largeAnimal = new Resource(testPosition, ResourceType.LARGE_ANIMAL, 10, 0);
    const water = new Resource(testPosition, ResourceType.WATER, 10, 0);

    expect(plant.nutritionalValue).toBe(5);
    expect(smallAnimal.nutritionalValue).toBe(15);
    expect(largeAnimal.nutritionalValue).toBe(30);
    expect(water.nutritionalValue).toBe(2);
  });

  it('should provide correct energy value based on nutritional value', () => {
    const plant = new Resource(testPosition, ResourceType.PLANT, 10, 0);
    
    // Energy value is nutritionalValue * 2
    expect(plant.energyValue).toBe(plant.nutritionalValue * 2);
  });
});