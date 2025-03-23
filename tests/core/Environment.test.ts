import { Environment, EnvironmentConfig } from '../../src/core/Environment';
import { Position, Weather, TerrainType, ResourceType, Traits } from '../../src/core/types';
import { Resource } from '../../src/core/Resource';
import { Animal } from '../../src/core/Animal';
import { TestAnimal } from '../core/TestAnimal';

// Helper to create test resources with guaranteed unique IDs
let resourceCounter = 0;
function createResourceWithUniqueId(position: Position, type: ResourceType, amount: number, regenerationRate: number): Resource {
  const resource = new Resource(position, type, amount, regenerationRate);
  // Force a unique ID
  Object.defineProperty(resource, 'id', { value: `test-resource-${resourceCounter++}` });
  return resource;
}

describe('Environment', () => {
  // Default test config
  const defaultConfig: EnvironmentConfig = {
    width: 100,
    height: 100,
    initialWeather: Weather.SUNNY,
    weatherChangeInterval: 50
  };

  beforeEach(() => {
    // Reset any shared state or mocks
    jest.clearAllMocks();
  });

  it('should create an environment with the correct dimensions', () => {
    const environment = new Environment(defaultConfig);

    expect(environment.width).toBe(defaultConfig.width);
    expect(environment.height).toBe(defaultConfig.height);
    expect(environment.weather).toBe(defaultConfig.initialWeather);
  });

  it('should initialize a terrain map of the correct dimensions', () => {
    const smallConfig = { ...defaultConfig, width: 5, height: 5 };
    const environment = new Environment(smallConfig);

    // Test a position that's valid - should not return water for all positions
    const landFound = [...Array(smallConfig.width)].some((_, x) => 
      [...Array(smallConfig.height)].some((_, y) => 
        environment.getTerrainAt({ x, y }) !== TerrainType.WATER
      )
    );

    expect(landFound).toBe(true);
  });

  it('should update weather after the specified interval', () => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
    
    const config = { ...defaultConfig, weatherChangeInterval: 10 };
    const environment = new Environment(config);
    const initialWeather = environment.weather;
    
    // Update for less than the interval, weather should not change
    environment.update(5);
    expect(environment.weather).toBe(initialWeather);
    
    // Update past the interval, weather should change
    environment.update(10);
    // Since we mocked Math.random, the weather will change to a predictable value
    expect(environment.weather).not.toBe(initialWeather);
  });

  it('should add and retrieve resources', () => {
    const environment = new Environment(defaultConfig);
    const testResource = new Resource(
      { x: 50, y: 50 },
      ResourceType.PLANT,
      10,
      0
    );

    environment.addResource(testResource);
    const resources = environment.getResources();

    expect(resources).toContainEqual(expect.objectContaining({ id: testResource.id }));
  });

  it('should find resources within a specified radius', () => {
    const environment = new Environment(defaultConfig);
    
    // Add resources at different distances with forced unique IDs
    const centerResource = createResourceWithUniqueId({ x: 50, y: 50 }, ResourceType.PLANT, 10, 0);
    const nearbyResource = createResourceWithUniqueId({ x: 51, y: 51 }, ResourceType.PLANT, 10, 0);
    // Place the far resource clearly outside the radius
    const farResource = createResourceWithUniqueId({ x: 100, y: 100 }, ResourceType.PLANT, 10, 0);
    
    // Verify our test resources have unique IDs
    expect(centerResource.id).not.toEqual(nearbyResource.id);
    expect(centerResource.id).not.toEqual(farResource.id);
    expect(nearbyResource.id).not.toEqual(farResource.id);
    
    environment.addResource(centerResource);
    environment.addResource(nearbyResource);
    environment.addResource(farResource);
    
    // Find resources within a radius of 3 units from the center
    const nearbyResources = environment.getResourcesNear({ x: 50, y: 50 }, 3);
    
    // Verify exact count
    expect(nearbyResources.length).toBe(2);
    
    // Verify resource IDs to ensure we're testing the right objects
    const resourceIds = nearbyResources.map(r => r.id);
    expect(resourceIds).toContain(centerResource.id);
    expect(resourceIds).toContain(nearbyResource.id);
    expect(resourceIds).not.toContain(farResource.id);
  });

  it('should get terrain at a specific position', () => {
    const environment = new Environment(defaultConfig);
    
    // Test in-bounds position (should return a valid terrain type)
    const terrain = environment.getTerrainAt({ x: 50, y: 50 });
    expect(Object.values(TerrainType)).toContain(terrain);
    
    // Test out-of-bounds position (should return water)
    const outOfBoundsTerrain = environment.getTerrainAt({ x: -10, y: 150 });
    expect(outOfBoundsTerrain).toBe(TerrainType.WATER);
  });

  it('should check if a position is within bounds', () => {
    const environment = new Environment(defaultConfig);
    
    // Test in-bounds position
    expect(environment.isInBounds({ x: 50, y: 50 })).toBe(true);
    
    // Test out-of-bounds positions
    expect(environment.isInBounds({ x: -1, y: 50 })).toBe(false);
    expect(environment.isInBounds({ x: 50, y: -1 })).toBe(false);
    expect(environment.isInBounds({ x: 100, y: 50 })).toBe(false);
    expect(environment.isInBounds({ x: 50, y: 100 })).toBe(false);
  });

  it('should generate a random position within bounds', () => {
    const environment = new Environment(defaultConfig);
    
    // Generate a random position
    const position = environment.getRandomPosition();
    
    // Position should be within bounds
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThan(defaultConfig.width);
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y).toBeLessThan(defaultConfig.height);
  });

  it('should try to generate a random position with specific terrain type', () => {
    const environment = new Environment(defaultConfig);
    
    // Mock getTerrainAt to always return LAND to ensure our test works
    jest.spyOn(environment, 'getTerrainAt').mockReturnValue(TerrainType.LAND);
    
    // Generate a random position with specific terrain
    const position = environment.getRandomPosition(TerrainType.LAND);
    
    // Position should be within bounds
    expect(position.x).toBeGreaterThanOrEqual(0);
    expect(position.x).toBeLessThan(defaultConfig.width);
    expect(position.y).toBeGreaterThanOrEqual(0);
    expect(position.y).toBeLessThan(defaultConfig.height);
    
    // Clean up mock
    jest.restoreAllMocks();
  });

  it('should bound a position to be within environment limits', () => {
    const environment = new Environment(defaultConfig);
    
    // Test in-bounds position (should remain unchanged)
    const inBoundsPosition = { x: 50, y: 50 };
    const boundedInBounds = environment.boundPosition(inBoundsPosition);
    expect(boundedInBounds).toEqual(inBoundsPosition);
    
    // Test out-of-bounds positions
    const outOfBoundsLow = { x: -10, y: -10 };
    const boundedLow = environment.boundPosition(outOfBoundsLow);
    expect(boundedLow.x).toBe(0);
    expect(boundedLow.y).toBe(0);
    
    const outOfBoundsHigh = { x: 110, y: 110 };
    const boundedHigh = environment.boundPosition(outOfBoundsHigh);
    expect(boundedHigh.x).toBeCloseTo(defaultConfig.width - 0.001);
    expect(boundedHigh.y).toBeCloseTo(defaultConfig.height - 0.001);
  });

  it('should update resources during environment update', () => {
    const environment = new Environment(defaultConfig);
    
    // Create a mock resource
    const mockResource = new Resource({ x: 50, y: 50 }, ResourceType.PLANT, 10, 1);
    
    // Spy on the resource's update method
    const updateSpy = jest.spyOn(mockResource, 'update');
    
    // Add the resource to the environment
    environment.addResource(mockResource);
    
    // Update the environment
    environment.update(1);
    
    // Verify the resource's update method was called
    expect(updateSpy).toHaveBeenCalledWith(1);
    
    // Clean up
    updateSpy.mockRestore();
  });
  
  it('should remove depleted resources with no regeneration', () => {
    const environment = new Environment(defaultConfig);
    
    // Create resources - one that will be depleted and one that will remain
    const depletedResource = new Resource({ x: 50, y: 50 }, ResourceType.PLANT, 10, 0);
    const activeResource = new Resource({ x: 60, y: 60 }, ResourceType.PLANT, 10, 0);
    
    // Add resources to environment
    environment.addResource(depletedResource);
    environment.addResource(activeResource);
    
    // Deplete the first resource
    depletedResource.consume(10);
    expect(depletedResource.depleted).toBe(true);
    
    // Update environment
    environment.update(1);
    
    // Check that only the active resource remains
    const remainingResources = environment.getResources();
    expect(remainingResources.length).toBe(1);
    expect(remainingResources[0].id).toBe(activeResource.id);
  });
  
  it('should keep depleted resources that have regeneration', () => {
    const environment = new Environment(defaultConfig);
    
    // Create a resource that will be depleted but has regeneration
    const depletedRegeneratingResource = new Resource({ x: 50, y: 50 }, ResourceType.PLANT, 10, 1);
    
    // Add resource to environment
    environment.addResource(depletedRegeneratingResource);
    
    // Deplete the resource
    depletedRegeneratingResource.consume(10);
    expect(depletedRegeneratingResource.depleted).toBe(true);
    
    // Update environment
    environment.update(1);
    
    // Check that the resource is still there despite being depleted
    const remainingResources = environment.getResources();
    expect(remainingResources.length).toBe(1);
  });
});

/**
 * Test Environment with animal tracking and lookup capabilities
 */
describe('Environment - Animal Tracking', () => {
  let environment: Environment;
  let animal1: Animal;
  let animal2: Animal;

  beforeEach(() => {
    const config: EnvironmentConfig = {
      width: 100,
      height: 100,
      initialWeather: Weather.SUNNY,
      weatherChangeInterval: 50
    };
    
    environment = new Environment(config);
    
    // Create mock animals
    animal1 = new TestAnimal(
      { x: 25, y: 25 },
      { speed: 3, strength: 5, perception: 8, metabolism: 0.5, reproductiveUrge: 5, lifespan: 100 }
    );
    
    animal2 = new TestAnimal(
      { x: 75, y: 75 },
      { speed: 4, strength: 6, perception: 9, metabolism: 0.6, reproductiveUrge: 6, lifespan: 110 }
    );
  });
  
  test('should track animals in the environment', () => {
    // Update environment with animals
    environment.updateAnimals([animal1, animal2]);
    
    // Verify animals are tracked
    const animals = (environment as any).animals;
    expect(animals).toHaveLength(2);
    expect(animals).toContain(animal1);
    expect(animals).toContain(animal2);
  });
  
  test('should find animals near a position', () => {
    // Update environment with animals
    environment.updateAnimals([animal1, animal2]);
    
    // Get animals near animal1's position with a small radius
    const nearbyAnimals = environment.getAnimalsNear(animal1.position, 10);
    
    // Should only find animal1
    expect(nearbyAnimals).toHaveLength(1);
    expect(nearbyAnimals[0]).toBe(animal1);
    
    // Get animals near animal1's position with a large radius
    const allAnimals = environment.getAnimalsNear(animal1.position, 100);
    
    // Should find both animals
    expect(allAnimals).toHaveLength(2);
    expect(allAnimals).toContain(animal1);
    expect(allAnimals).toContain(animal2);
  });
  
  test('should exclude dead animals from search results', () => {
    // Kill animal2
    animal2.die();
    
    // Update environment with animals
    environment.updateAnimals([animal1, animal2]);
    
    // Get all animals near a position that should include both
    const nearbyAnimals = environment.getAnimalsNear({ x: 50, y: 50 }, 50);
    
    // Should only find animal1 (not the dead animal2)
    expect(nearbyAnimals).toHaveLength(1);
    expect(nearbyAnimals[0]).toBe(animal1);
  });
  
  test('should update tracked animals when updateAnimals is called again', () => {
    // Update environment with initial animals
    environment.updateAnimals([animal1, animal2]);
    
    // Create a new animal
    const animal3 = new TestAnimal(
      { x: 50, y: 50 },
      { speed: 5, strength: 7, perception: 10, metabolism: 0.7, reproductiveUrge: 7, lifespan: 120 }
    );
    
    // Update environment with a new list
    environment.updateAnimals([animal2, animal3]);
    
    // Get all animals in the environment
    const allAnimals = environment.getAnimalsNear({ x: 50, y: 50 }, 100);
    
    // Should only find animal2 and animal3 (animal1 was removed)
    expect(allAnimals).toHaveLength(2);
    expect(allAnimals).toContain(animal2);
    expect(allAnimals).toContain(animal3);
    expect(allAnimals).not.toContain(animal1);
  });
});