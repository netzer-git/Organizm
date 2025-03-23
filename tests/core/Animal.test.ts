import { TestAnimal } from './TestAnimal';
import { Position, Direction, AnimalState, ResourceType, Traits } from '../../src/core/types';
import { Environment } from '../../src/core/Environment';

describe('Animal', () => {
  // Common test position and traits
  const testPosition: Position = { x: 10, y: 10 };
  const testTraits: Traits = {
    speed: 2,
    strength: 3,
    perception: 5,
    metabolism: 0.5,
    reproductiveUrge: 10,
    lifespan: 100
  };

  let mockEnvironment: Environment;

  beforeEach(() => {
    // Reset any shared state or mocks
    jest.clearAllMocks();

    // Create a mock environment for testing
    mockEnvironment = {
      boundPosition: jest.fn(pos => pos),
      getTerrainAt: jest.fn(),
      getResourcesNear: jest.fn(() => []),
      isInBounds: jest.fn(() => true),
      getAnimalsNear: jest.fn(() => [])
    } as unknown as Environment;
  });

  it('should create an animal with the correct initial properties', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);

    expect(animal.id).toBeDefined();
    expect(animal.position).toEqual(testPosition);
    expect(animal.traits).toEqual(testTraits);
    expect(animal.state).toBe(AnimalState.IDLE);
    expect(animal.direction).toBe(Direction.NONE);
    expect(animal.age).toBe(0);
    expect(animal.energy).toBe(100);
    expect(animal.health).toBe(100);
    expect(animal.stats.generation).toBe(1);
    expect(animal.stats.children).toBe(0);
    expect(animal.dead).toBe(false);
  });

  it('should not modify the original position or traits objects', () => {
    const originalPosition = { x: 10, y: 10 };
    const originalTraits = { ...testTraits };
    
    const animal = new TestAnimal(originalPosition, originalTraits, mockEnvironment);
    
    // Change the animal's position and traits
    animal.position.x = 20;
    animal.traits.speed = 10;
    
    // Original objects should remain unchanged
    expect(originalPosition.x).toBe(10);
    expect(originalTraits.speed).toBe(testTraits.speed);
  });

  it('should update age and consume energy based on metabolism', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    const initialEnergy = animal.energy;
    
    // Update for 2 time units
    animal.update(2);
    
    // Age should increase by the time delta
    expect(animal.age).toBe(2);
    
    // Energy should decrease based on metabolism
    const expectedEnergyDecrease = testTraits.metabolism * 2;
    expect(animal.energy).toBeCloseTo(initialEnergy - expectedEnergyDecrease, 0);
  });

  it('should die when energy is depleted', () => {
    const animal = new TestAnimal(testPosition, { ...testTraits, metabolism: 50 }, mockEnvironment);
    
    // High metabolism will quickly deplete energy
    animal.update(3);
    
    expect(animal.energy).toBeLessThanOrEqual(0);
    expect(animal.dead).toBe(true);
    expect(animal.state).toBe(AnimalState.DEAD);
  });

  it('should die when reaching maximum lifespan', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    // Set age to just below lifespan
    animal.age = testTraits.lifespan - 0.5;
    
    // Update to exceed lifespan
    animal.update(1);
    
    expect(animal.age).toBeGreaterThanOrEqual(testTraits.lifespan);
    expect(animal.dead).toBe(true);
    expect(animal.state).toBe(AnimalState.DEAD);
  });

  it('should not update if already dead', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    // Kill the animal
    animal.die();
    
    // Initial state
    const initialAge = animal.age;
    const initialEnergy = animal.energy;
    
    // Try to update
    animal.update(10);
    
    // No changes should occur
    expect(animal.age).toBe(initialAge);
    expect(animal.energy).toBe(initialEnergy);
  });

  it('should change state to sleeping when sleep method is called', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    animal.sleep(5);
    
    expect(animal.state).toBe(AnimalState.SLEEPING);
  });

  it('should recover energy while sleeping', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    // Reduce energy first
    animal.energy = 50;
    
    // Start sleeping
    animal.sleep(5);
    
    // Update while sleeping
    animal.update(2);
    
    // Should have regained some energy
    expect(animal.energy).toBeGreaterThan(50);
  });

  it('should change state and direction when move method is called', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    animal.move(Direction.NORTH);
    
    expect(animal.state).toBe(AnimalState.MOVING);
    expect(animal.direction).toBe(Direction.NORTH);
  });

  it('should update position when moving', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    const initialY = animal.position.y;
    
    // Move north
    animal.move(Direction.NORTH);
    
    // Update to apply movement
    animal.update(1);
    
    // Y position should decrease (moving north)
    expect(animal.position.y).toBeLessThan(initialY);
  });

  it('should change state when eat method is called', () => {
    const animal = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    animal.eat(ResourceType.PLANT);
    
    expect(animal.state).toBe(AnimalState.EATING);
  });

  it('should change state when mate method is called with compatible partner', () => {
    const animal1 = new TestAnimal(testPosition, testTraits, mockEnvironment);
    const animal2 = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    // Ensure both have enough energy
    animal1.energy = 60;
    animal2.energy = 60;
    
    animal1.mate(animal2);
    
    expect(animal1.state).toBe(AnimalState.MATING);
  });

  it('should not change state when mate method is called with incompatible partner', () => {
    const animal1 = new TestAnimal(testPosition, testTraits, mockEnvironment);
    const animal2 = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    // Make animal2 incompatible by reducing its energy
    animal1.energy = 60;
    animal2.energy = 40;
    
    // Initial state
    const initialState = animal1.state;
    
    animal1.mate(animal2);
    
    // State should not change
    expect(animal1.state).toBe(initialState);
  });

  it('should create offspring when reproduce method is called', () => {
    const animal1 = new TestAnimal(testPosition, testTraits, mockEnvironment);
    const animal2 = new TestAnimal(testPosition, testTraits, mockEnvironment);
    
    const offspring = animal1.reproduce(animal2);
    
    // Should create at least one offspring
    expect(offspring.length).toBeGreaterThan(0);
    expect(offspring[0]).toBeInstanceOf(TestAnimal);
    
    // Parent's children count should increase
    expect(animal1.stats.children).toBe(1);
    
    // Offspring should have higher generation than parents
    expect(offspring[0].stats.generation).toBe(animal1.stats.generation + 1);
  });

  it('should calculate distance to a target correctly', () => {
    const animal = new TestAnimal({ x: 0, y: 0 }, testTraits, mockEnvironment);
    const target = { x: 3, y: 4 }; // Makes a 3-4-5 triangle
    
    const distance = animal.distanceTo(target);
    
    expect(distance).toBe(5);
  });

  it('should determine the correct direction to a target', () => {
    const animal = new TestAnimal({ x: 10, y: 10 }, testTraits, mockEnvironment);
    
    // Test cardinal directions
    expect(animal.directionTo({ x: 10, y: 0 })).toBe(Direction.NORTH);
    expect(animal.directionTo({ x: 20, y: 10 })).toBe(Direction.EAST);
    expect(animal.directionTo({ x: 10, y: 20 })).toBe(Direction.SOUTH);
    expect(animal.directionTo({ x: 0, y: 10 })).toBe(Direction.WEST);
    
    // Test diagonal directions
    expect(animal.directionTo({ x: 15, y: 5 })).toBe(Direction.NORTHEAST);
    expect(animal.directionTo({ x: 15, y: 15 })).toBe(Direction.SOUTHEAST);
    expect(animal.directionTo({ x: 5, y: 15 })).toBe(Direction.SOUTHWEST);
    expect(animal.directionTo({ x: 5, y: 5 })).toBe(Direction.NORTHWEST);
  });
});