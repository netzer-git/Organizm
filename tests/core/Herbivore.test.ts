import { Herbivore } from '../../src/core/Herbivore';
import { Environment } from '../../src/core/Environment';
import { Resource } from '../../src/core/Resource';
import { Position, Direction, AnimalState, ResourceType, Traits, Weather, TerrainType } from '../../src/core/types';

// Mock Environment class
jest.mock('../../src/core/Environment');

describe('Herbivore', () => {
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

  // Mock environment and resources
  let mockEnvironment: jest.Mocked<Environment>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock environment
    mockEnvironment = new Environment({
      width: 100,
      height: 100,
      initialWeather: Weather.SUNNY,
      weatherChangeInterval: 50
    }) as jest.Mocked<Environment>;
    
    // Set up common mock methods
    mockEnvironment.boundPosition = jest.fn().mockImplementation(pos => pos);
    mockEnvironment.getResourcesNear = jest.fn().mockReturnValue([]);
    mockEnvironment.getTerrainAt = jest.fn().mockReturnValue(TerrainType.LAND);
  });

  it('should create a herbivore with the correct initial properties', () => {
    const herbivore = new Herbivore(testPosition, testTraits, mockEnvironment, 1);

    expect(herbivore.id).toBeDefined();
    expect(herbivore.position).toEqual(testPosition);
    expect(herbivore.traits).toEqual(testTraits);
    expect(herbivore.state).toBe(AnimalState.IDLE);
    expect(herbivore.direction).toBe(Direction.NONE);
    expect(herbivore.age).toBe(0);
    expect(herbivore.energy).toBe(100);
    expect(herbivore.health).toBe(100);
    expect(herbivore.stats.generation).toBe(1);
  });

  it('should only mate with another herbivore with sufficient energy', () => {
    const herbivore1 = new Herbivore(testPosition, testTraits, mockEnvironment);
    const herbivore2 = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Set sufficient energy
    herbivore1.energy = 60;
    herbivore2.energy = 60;
    
    // Set proper mature age (10% of lifespan)
    herbivore1.age = testTraits.lifespan * 0.2; // 20% of lifespan
    herbivore2.age = testTraits.lifespan * 0.2; // 20% of lifespan
    
    // Attempt to mate
    herbivore1.mate(herbivore2);
    
    // Should be successful
    expect(herbivore1.state).toBe(AnimalState.MATING);
  });

  it('should not mate with another herbivore with insufficient energy', () => {
    const herbivore1 = new Herbivore(testPosition, testTraits, mockEnvironment);
    const herbivore2 = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Set sufficient energy for herbivore1 but not for herbivore2
    herbivore1.energy = 60;
    herbivore2.energy = 40; // Below threshold
    
    // Set proper mature age
    herbivore1.age = testTraits.lifespan * 0.2;
    herbivore2.age = testTraits.lifespan * 0.2;
    
    // Initial state
    const initialState = herbivore1.state;
    
    // Attempt to mate
    herbivore1.mate(herbivore2);
    
    // Should not change state
    expect(herbivore1.state).toBe(initialState);
  });

  it('should create offspring with mixed traits', () => {
    const herbivore1 = new Herbivore(testPosition, testTraits, mockEnvironment, 1);
    const herbivore2 = new Herbivore(testPosition, {
      ...testTraits,
      speed: 4 // Different speed to test trait mixing
    }, mockEnvironment, 1);
    
    // Mock boundPosition to return a valid position
    mockEnvironment.boundPosition.mockImplementation(pos => pos);
    
    // Create offspring
    const offspring = herbivore1.reproduce(herbivore2);
    
    // Should create at least one offspring
    expect(offspring.length).toBeGreaterThan(0);
    expect(offspring[0]).toBeInstanceOf(Herbivore);
    
    // Offspring should inherit from both parents
    const child = offspring[0] as Herbivore;
    expect(child.traits.speed).toBeDefined();
    
    // Offspring generation should be incremented
    expect(child.stats.generation).toBe(herbivore1.stats.generation + 1);
  });

  it('should move toward nearby plants when hungry', () => {
    const herbivore = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Make the herbivore hungry
    herbivore.energy = 30;
    
    // Create a mock plant resource
    const plantResource = new Resource(
      { x: testPosition.x + 3, y: testPosition.y }, 
      ResourceType.PLANT,
      10,
      0
    );
    
    // Mock environment to return the plant
    mockEnvironment.getResourcesNear.mockReturnValue([plantResource]);
    
    // Update herbivore to trigger decision making
    herbivore.update(0.1);
    
    // Should be in moving state
    expect(herbivore.state).toBe(AnimalState.MOVING);
    
    // Should be moving toward the plant (east direction)
    expect(herbivore.direction).toBe(Direction.EAST);
  });

  it('should eat plants when close enough', () => {
    const herbivore = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Make the herbivore hungry
    herbivore.energy = 30;
    
    // Create a mock plant resource very close to the herbivore
    const plantResource = new Resource(
      { x: testPosition.x + 0.5, y: testPosition.y }, // Less than 1 unit away
      ResourceType.PLANT,
      10,
      0
    );
    
    // Mock the resource's consume method
    const consumeSpy = jest.spyOn(plantResource, 'consume').mockReturnValue(1);
    
    // Mock environment to return the plant
    mockEnvironment.getResourcesNear.mockReturnValue([plantResource]);
    
    // Update herbivore to trigger decision making
    herbivore.update(0.1);
    
    // Should be in eating state
    expect(herbivore.state).toBe(AnimalState.EATING);
    
    // Should have consumed the plant
    expect(consumeSpy).toHaveBeenCalled();
    
    // Should have gained energy
    expect(herbivore.energy).toBeGreaterThan(30);
    
    // Should have incremented foodEaten stat
    expect(herbivore.stats.foodEaten).toBe(1);
  });

  it('should move randomly when no plants are nearby', () => {
    const herbivore = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Make the herbivore hungry
    herbivore.energy = 30;
    
    // Mock environment to return no resources
    mockEnvironment.getResourcesNear.mockReturnValue([]);
    
    // Update herbivore to trigger decision making
    herbivore.update(0.1);
    
    // Should be in moving state
    expect(herbivore.state).toBe(AnimalState.MOVING);
    
    // Direction should be set (not NONE)
    expect(herbivore.direction).not.toBe(Direction.NONE);
  });

  it('should sleep when moderately tired', () => {
    const herbivore = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Set energy to moderate level (60)
    herbivore.energy = 60;
    
    // Update herbivore to trigger decision making
    herbivore.update(0.1);
    
    // Should be in sleeping state
    expect(herbivore.state).toBe(AnimalState.SLEEPING);
  });

  it('should recover energy while sleeping', () => {
    const herbivore = new Herbivore(testPosition, testTraits, mockEnvironment);
    
    // Set energy level
    herbivore.energy = 60;
    
    // Start sleeping
    herbivore.sleep(5);
    
    // Initial energy
    const initialEnergy = herbivore.energy;
    
    // Update while sleeping
    herbivore.update(1);
    
    // Energy should increase
    expect(herbivore.energy).toBeGreaterThan(initialEnergy);
  });
});