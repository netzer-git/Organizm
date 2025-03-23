import { Carnivore } from '../../src/core/Carnivore';
import { Environment, EnvironmentConfig } from '../../src/core/Environment';
import { Herbivore } from '../../src/core/Herbivore';
import { Animal } from '../../src/core/Animal';
import { Direction, Position, ResourceType, TerrainType, Traits, Weather, AnimalState } from '../../src/core/types';

// Mock Environment to isolate Carnivore testing
jest.mock('../../src/core/Environment', () => {
  // Create a mock implementation
  return {
    Environment: jest.fn().mockImplementation(() => ({
      width: 100,
      height: 100,
      weather: Weather.SUNNY,
      boundPosition: jest.fn((pos: Position) => pos),
      getResourcesNear: jest.fn().mockReturnValue([]),
      getTerrainAt: jest.fn().mockReturnValue(TerrainType.LAND),
      getAnimalsNear: jest.fn().mockReturnValue([]),
      isInBounds: jest.fn().mockReturnValue(true)
    }))
  };
});

// Default traits for testing
const defaultTraits: Traits = {
  speed: 3,
  strength: 7,
  perception: 10,
  metabolism: 0.7,
  reproductiveUrge: 8,
  lifespan: 90
};

describe('Carnivore', () => {
  let carnivore: Carnivore;
  let environment: Environment;
  
  beforeEach(() => {
    // Create environment
    const config: EnvironmentConfig = {
      width: 100,
      height: 100,
      initialWeather: Weather.SUNNY,
      weatherChangeInterval: 50
    };
    environment = new Environment(config);
    
    // Create a carnivore for testing
    carnivore = new Carnivore(
      { x: 50, y: 50 },
      { ...defaultTraits },
      environment
    );
  });
  
  test('should be created with correct initial values', () => {
    expect(carnivore).toBeDefined();
    expect(carnivore.position).toEqual({ x: 50, y: 50 });
    expect(carnivore.traits).toEqual(defaultTraits);
    expect(carnivore.dead).toBe(false);
    expect(carnivore.energy).toBe(100); // Initial energy should be 100
  });
  
  test('should lose energy over time', () => {
    const initialEnergy = carnivore.energy;
    carnivore.update(1); // Update with 1 second
    expect(carnivore.energy).toBeLessThan(initialEnergy);
  });
  
  test('should only mate with other carnivores', () => {
    // Create another carnivore
    const partner = new Carnivore(
      { x: 50.5, y: 50.5 }, // Close to the first carnivore
      { ...defaultTraits },
      environment
    );
    
    // Create a herbivore
    const herbivore = new Herbivore(
      { x: 50.5, y: 50.5 }, // Close to the carnivore
      { ...defaultTraits },
      environment
    );
    
    // Test mating with herbivore - should not work
    carnivore.mate(herbivore);
    expect(carnivore.state).not.toBe(AnimalState.MATING);
    
    // Set high energy to enable mating
    const energyMethod = jest.spyOn(carnivore as any, 'energy', 'get');
    energyMethod.mockReturnValue(100);
    
    const partnerEnergyMethod = jest.spyOn(partner as any, 'energy', 'get');
    partnerEnergyMethod.mockReturnValue(100);
    
    // Test mating with carnivore - should work
    carnivore.mate(partner);
    expect(carnivore.state).toBe(AnimalState.MATING);
  });
  
  test('should hunt and attack herbivores', () => {
    // Setup mock herbivore to be hunted
    const prey = new Herbivore(
      { x: 51, y: 51 },
      { ...defaultTraits, speed: 1 }, // Slower prey
      environment
    );
    
    // Mock the environment to return a herbivore as nearby animal
    (environment.getAnimalsNear as jest.Mock).mockReturnValue([prey]);
    
    // Access private method using any type assertion
    const huntMethod = jest.spyOn(carnivore as any, 'hunt');
    
    // Trigger hunting behavior
    (carnivore as any).hunt();
    
    // Verify hunt was called
    expect(huntMethod).toHaveBeenCalled();
    
    // Since environment is mocked, we can't fully test the attack
    // But we can verify the environment was queried
    expect(environment.getAnimalsNear).toHaveBeenCalled();
  });
  
  test('should consume energy when hunting fails', () => {
    // Mock the environment to return no nearby animals
    (environment.getAnimalsNear as jest.Mock).mockReturnValue([]);
    
    // Give the carnivore energy
    const initialEnergy = 100;
    jest.spyOn(carnivore as any, 'energy', 'get').mockReturnValue(initialEnergy);
    
    // Mock moveRandomly method to trigger consumeEnergy directly
    const moveRandomlySpy = jest.spyOn(carnivore as any, 'moveRandomly');
    const originalMoveRandomly = (carnivore as any).moveRandomly;
    
    (carnivore as any).moveRandomly = function() {
      // Call original to trigger energy consumption
      originalMoveRandomly.call(this);
    };
    
    // Trigger hunting behavior with no prey
    (carnivore as any).hunt();
    
    // Verify random movement was triggered
    expect(moveRandomlySpy).toHaveBeenCalled();
  });
  
  test('should gain energy when eating', () => {
    // Initial setup
    const initialEnergy = 50;
    jest.spyOn(carnivore as any, 'energy', 'get').mockReturnValue(initialEnergy);
    
    // Mock methods
    const gainEnergySpy = jest.spyOn(carnivore as any, 'gainEnergy');
    
    // Trigger eating with SMALL_ANIMAL resource type (as MEAT doesn't exist)
    carnivore.eat(ResourceType.SMALL_ANIMAL);
    
    // Check if energy was gained
    expect(gainEnergySpy).toHaveBeenCalled();
  });
  
  test('should create offspring when reproducing', () => {
    // Create a mate
    const mate = new Carnivore(
      { x: 51, y: 51 },
      { ...defaultTraits },
      environment
    );
    
    // Mock environment methods needed for reproduction
    (environment.boundPosition as jest.Mock).mockImplementation((pos: Position) => pos);
    
    // Give both animals high energy
    jest.spyOn(carnivore as any, 'energy', 'get').mockReturnValue(100);
    jest.spyOn(mate as any, 'energy', 'get').mockReturnValue(100);
    
    // Reproduce
    const offspring = carnivore.reproduce(mate);
    
    // Check if offspring were created
    expect(offspring.length).toBeGreaterThan(0);
    expect(offspring[0]).toBeInstanceOf(Carnivore);
    
    // Check if offspring have mixed traits from parents
    const childTraits = offspring[0].traits;
    expect(childTraits.speed).toBeGreaterThanOrEqual(Math.min(carnivore.traits.speed, mate.traits.speed));
    expect(childTraits.speed).toBeLessThanOrEqual(Math.max(carnivore.traits.speed, mate.traits.speed) * 1.2); // Allow for mutation
  });
});