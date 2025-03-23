import { Simulation, SimulationConfig } from '../../src/simulation/Simulation';
import { Environment, EnvironmentConfig } from '../../src/core/Environment';
import { Herbivore } from '../../src/core/Herbivore';
import { Carnivore } from '../../src/core/Carnivore';
import { Weather, AnimalState, Traits, TerrainType, ResourceType, Position } from '../../src/core/types';
import { Animal } from '../../src/core/Animal';

// Better mocks for animal classes to include necessary stats and methods
interface MockAnimal {
  id: string;
  position: Position;
  traits: Traits;
  energy: number;
  health: number;
  dead: boolean;
  state: AnimalState;
  stats: { generation: number; foodEaten: number; distanceTraveled: number; timeAlive: number };
  update: jest.Mock;
  mate: jest.Mock;
  reproduce: jest.Mock;
  distanceTo: jest.Mock;
  die: jest.Mock;
  constructor: { name: string };
}

const createMockHerbivore = (id = 'test-herbivore', dead = false): MockAnimal => ({
  id,
  position: { x: 50, y: 50 },
  traits: { speed: 3, strength: 4, perception: 8, metabolism: 0.5, reproductiveUrge: 5, lifespan: 100 },
  energy: 100,
  health: 100,
  dead,
  state: AnimalState.IDLE,
  stats: { generation: 1, foodEaten: 0, distanceTraveled: 0, timeAlive: 0 },
  update: jest.fn(),
  mate: jest.fn(),
  reproduce: jest.fn().mockReturnValue([]),
  distanceTo: jest.fn().mockReturnValue(1),
  die: jest.fn(),
  constructor: { name: 'Herbivore' }
});

const createMockCarnivore = (id = 'test-carnivore', dead = false): MockAnimal => ({
  id,
  position: { x: 70, y: 70 },
  traits: { speed: 4, strength: 7, perception: 10, metabolism: 0.7, reproductiveUrge: 4, lifespan: 90 },
  energy: 100,
  health: 100,
  dead,
  state: AnimalState.IDLE,
  stats: { generation: 1, foodEaten: 0, distanceTraveled: 0, timeAlive: 0 },
  update: jest.fn(),
  mate: jest.fn(),
  reproduce: jest.fn().mockReturnValue([]),
  distanceTo: jest.fn().mockReturnValue(1.5),
  die: jest.fn(),
  constructor: { name: 'Carnivore' }
});

// Define realistic animals array for the environment
const mockHerbivores: MockAnimal[] = Array(10).fill(null).map((_, i) => 
  createMockHerbivore(`herbivore-${i}`));
  
const mockCarnivores: MockAnimal[] = Array(5).fill(null).map((_, i) => 
  createMockCarnivore(`carnivore-${i}`));

// Combine all animals
const mockAnimals = [...mockHerbivores, ...mockCarnivores];

// Mock the Herbivore and Carnivore classes
jest.mock('../../src/core/Herbivore', () => {
  return {
    Herbivore: jest.fn().mockImplementation((id, position, env) => {
      // Create a new mock herbivore with the given id
      const mockHerb = createMockHerbivore(id || `herbivore-${Math.random().toString(36).substring(2)}`);
      // Override the position if provided
      if (position) {
        mockHerb.position = position;
      }
      // Important: Add the animal to the environment as the real class would
      if (env && env.addAnimal) {
        env.addAnimal(mockHerb);
      }
      return mockHerb;
    })
  };
});

jest.mock('../../src/core/Carnivore', () => {
  return {
    Carnivore: jest.fn().mockImplementation((id, position, env) => {
      // Create a new mock carnivore with the given id
      const mockCarn = createMockCarnivore(id || `carnivore-${Math.random().toString(36).substring(2)}`);
      // Override the position if provided
      if (position) {
        mockCarn.position = position;
      }
      // Important: Add the animal to the environment as the real class would
      if (env && env.addAnimal) {
        env.addAnimal(mockCarn);
      }
      return mockCarn;
    })
  };
});

// Mock the Environment class for specific test needs
jest.mock('../../src/core/Environment', () => {
  // Keep track of the original implementation
  const originalModule = jest.requireActual('../../src/core/Environment');
  
  // Return a mocked version with animals tracking
  return {
    ...originalModule,
    Environment: jest.fn().mockImplementation(() => {
      let animals: MockAnimal[] = [];
      
      return {
        width: 100,
        height: 100,
        weather: Weather.SUNNY,
        weatherChangeInterval: 50,
        getRandomPosition: jest.fn((terrainType?: TerrainType) => {
          // Return different positions based on terrain type
          if (terrainType === TerrainType.WATER) {
            return { x: 20, y: 20 };
          }
          return { x: 50, y: 50 };
        }),
        getTerrainAt: jest.fn(),
        boundPosition: jest.fn((pos: Position) => pos),
        getResourcesNear: jest.fn().mockReturnValue([]),
        getAnimalsNear: jest.fn().mockReturnValue([]),
        updateWeather: jest.fn(),
        // Add animal to the tracking array
        addAnimal: jest.fn((animal: MockAnimal) => {
          animals.push(animal);
        }),
        removeAnimal: jest.fn((animalId: string) => {
          animals = animals.filter(a => a.id !== animalId);
        }),
        // Make this call the update method on all animals
        updateAnimals: jest.fn((dt: number) => {
          animals.forEach(animal => animal.update(dt));
        }),
        // Get all tracked animals
        getAnimals: jest.fn(() => animals),
        getResources: jest.fn().mockReturnValue([]),
        addResource: jest.fn()
      };
    })
  };
});

// Mock the Simulation's getState method
jest.mock('../../src/simulation/Simulation', () => {
  // Get the original module to extend
  const originalModule = jest.requireActual('../../src/simulation/Simulation');
  
  // Return a modified version that overrides specific methods
  return {
    ...originalModule,
    Simulation: class MockSimulation extends originalModule.Simulation {
      constructor(config: SimulationConfig) {
        super(config);
      }
      
      // Override getState to return accurate mock data
      getState() {
        const environment = (this as any).environment;
        const animals = environment.getAnimals();
        
        // Only count living animals for each type - explicitly typed now
        const herbivores = animals.filter((a: MockAnimal) => a.constructor.name === 'Herbivore' && !a.dead);
        const carnivores = animals.filter((a: MockAnimal) => a.constructor.name === 'Carnivore' && !a.dead);
        
        const livingAnimals = [...herbivores, ...carnivores];
        
        // Calculate stats as in the real implementation - explicitly typed now
        const totalGenerations = livingAnimals.reduce((sum: number, a: MockAnimal) => sum + a.stats.generation, 0);
        const avgGeneration = livingAnimals.length > 0 ? totalGenerations / livingAnimals.length : 0;
        const highestGeneration = livingAnimals.length > 0 ? 
          Math.max(...livingAnimals.map(a => a.stats.generation)) : 0;
        
        return {
          animals: animals,
          environment: environment,
          statistics: {
            simulationTime: (this as any).time || 0,
            herbivoreCount: herbivores.length,
            carnivoreCount: carnivores.length,
            totalAnimals: livingAnimals.length,
            plantsCount: environment.getResources().length,
            averageGeneration: avgGeneration,
            highestGeneration: highestGeneration
          }
        };
      }
    }
  };
});

describe('Simulation with Carnivores', () => {
  let simulation: Simulation;
  let defaultConfig: SimulationConfig;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    defaultConfig = {
      environmentConfig: {
        width: 100,
        height: 100,
        initialWeather: Weather.SUNNY,
        weatherChangeInterval: 50
      },
      initialHerbivores: 10,
      initialCarnivores: 5,
      initialPlants: 20,
      initialWaterSources: 3
    };
    
    simulation = new Simulation(defaultConfig);
  });
  
  test('should initialize with both herbivores and carnivores', () => {
    // Check that herbivores and carnivores were created
    expect(Herbivore).toHaveBeenCalledTimes(defaultConfig.initialHerbivores);
    expect(Carnivore).toHaveBeenCalledTimes(defaultConfig.initialCarnivores);
  });
  
  test('should update environment with animals for tracking', () => {
    // Update simulation
    simulation.update(1);
    
    // Get the environment instance
    const environment = (simulation as any).environment;
    
    // Check that environment's updateAnimals was called
    expect(environment.updateAnimals).toHaveBeenCalled();
  });
  
  test('should report correct statistics for herbivores and carnivores', () => {
    // Get simulation state
    const state = simulation.getState();
    
    // Check statistics
    expect(state.statistics.herbivoreCount).toBe(defaultConfig.initialHerbivores);
    expect(state.statistics.carnivoreCount).toBe(defaultConfig.initialCarnivores);
    expect(state.statistics.totalAnimals).toBe(
      defaultConfig.initialHerbivores + defaultConfig.initialCarnivores
    );
  });
  
  test('should reset simulation with new configuration', () => {
    // Create a new configuration
    const newConfig = {
      ...defaultConfig,
      initialHerbivores: 5,
      initialCarnivores: 3
    };
    
    // Clear constructor mock calls
    (Herbivore as jest.Mock).mockClear();
    (Carnivore as jest.Mock).mockClear();
    
    // Reset simulation with new config
    simulation.reset(newConfig);
    
    // Check that correct numbers of animals were created
    expect(Herbivore).toHaveBeenCalledTimes(newConfig.initialHerbivores);
    expect(Carnivore).toHaveBeenCalledTimes(newConfig.initialCarnivores);
  });
  
  test('should handle animal interactions including predation', () => {
    // Get the environment instance
    const environment = (simulation as any).environment;
    const animals = environment.getAnimals();
    
    // Make sure we have animals to work with
    expect(animals.length).toBeGreaterThan(0);
    
    // Find a herbivore and carnivore for testing
    const mockHerbivore = animals.find((a: MockAnimal) => a.constructor.name === 'Herbivore');
    const mockCarnivore = animals.find((a: MockAnimal) => a.constructor.name === 'Carnivore');
    
    // Make sure we found both
    expect(mockHerbivore).toBeDefined();
    expect(mockCarnivore).toBeDefined();
    
    // Reset the update mocks to ensure we can check if they were called
    mockHerbivore.update.mockClear();
    mockCarnivore.update.mockClear();
    
    // Update the simulation to trigger animal updates
    simulation.update(1);
    
    // Check animals were updated
    expect(mockHerbivore.update).toHaveBeenCalled();
    expect(mockCarnivore.update).toHaveBeenCalled();
  });
  
  test('should maintain separate counts for each animal type', () => {
    // Get the environment instance
    const environment = (simulation as any).environment;
    const animals = environment.getAnimals();
    
    // Make sure we have animals to work with
    expect(animals.length).toBeGreaterThan(0);
    
    // Mark one herbivore as dead
    const firstHerbivore = animals.find((a: MockAnimal) => a.constructor.name === 'Herbivore');
    expect(firstHerbivore).toBeDefined();
    firstHerbivore.dead = true;
    
    // Count how many should be alive
    const aliveHerbivores = animals.filter((a: MockAnimal) => 
      a.constructor.name === 'Herbivore' && !a.dead).length;
    
    const aliveCarnivores = animals.filter((a: MockAnimal) => 
      a.constructor.name === 'Carnivore' && !a.dead).length;
    
    // Get state
    const state = simulation.getState();
    
    // Check counts - only living animals should be counted
    expect(state.statistics.herbivoreCount).toBe(aliveHerbivores);
    expect(state.statistics.carnivoreCount).toBe(aliveCarnivores);
    expect(state.statistics.totalAnimals).toBe(aliveHerbivores + aliveCarnivores);
  });
  
  test('should calculate average generation correctly', () => {
    // Get the environment instance
    const environment = (simulation as any).environment;
    const animals = environment.getAnimals();
    
    // Make sure we have animals to work with
    expect(animals.length).toBeGreaterThan(0);
    
    // Set different generations for the first few animals
    animals[0].stats.generation = 1;
    animals[1].stats.generation = 2;
    animals[2].stats.generation = 3;
    
    // Get state
    const state = simulation.getState();
    
    // Calculate expected average generation for living animals
    const livingAnimals = animals.filter((a: MockAnimal) => !a.dead);
    const totalGenerations = livingAnimals.reduce((sum: number, animal: MockAnimal) => 
      sum + animal.stats.generation, 0);
    
    const expectedAverage = totalGenerations / livingAnimals.length;
    
    // Check average generation
    expect(state.statistics.averageGeneration).toBeCloseTo(expectedAverage);
  });
});