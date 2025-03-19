import { Simulation, SimulationConfig } from '../../src/simulation/Simulation';
import { Environment } from '../../src/core/Environment';
import { Herbivore } from '../../src/core/Herbivore';
import { Weather, TerrainType } from '../../src/core/types';

// Mock dependencies
jest.mock('../../src/core/Environment');
jest.mock('../../src/core/Herbivore');

describe('Simulation', () => {
  // Default test config
  const defaultConfig: SimulationConfig = {
    environmentConfig: {
      width: 100,
      height: 100,
      initialWeather: Weather.SUNNY,
      weatherChangeInterval: 50
    },
    initialHerbivores: 10,
    initialPlants: 20,
    initialWaterSources: 5
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock Environment implementation
    (Environment as jest.Mock).mockImplementation(() => ({
      update: jest.fn(),
      getRandomPosition: jest.fn().mockReturnValue({ x: 50, y: 50 }),
      addResource: jest.fn(),
      width: defaultConfig.environmentConfig.width,
      height: defaultConfig.environmentConfig.height,
      weather: defaultConfig.environmentConfig.initialWeather
    }));
    
    // Mock Herbivore implementation
    (Herbivore as jest.Mock).mockImplementation(() => ({
      id: Math.random().toString(),
      update: jest.fn(),
      dead: false,
      position: { x: 50, y: 50 },
      energy: 100,
      state: 'IDLE',
      stats: { generation: 1, children: 0, foodEaten: 0, distanceTraveled: 0, timeAlive: 0 },
      reproduce: jest.fn().mockReturnValue([]),
      distanceTo: jest.fn().mockReturnValue(5),
      mate: jest.fn()
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a simulation with the correct initial properties', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Environment should be created with correct config
    expect(Environment).toHaveBeenCalledWith(defaultConfig.environmentConfig);
    
    // Initial animals should be created
    expect(Herbivore).toHaveBeenCalledTimes(defaultConfig.initialHerbivores);
  });

  it('should start and pause the simulation', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Simulation should start paused
    expect(simulation.getState().statistics.simulationTime).toBe(0);
    
    // Start the simulation
    simulation.start();
    
    // Update to advance time
    simulation.update(1);
    
    // Time should have advanced
    expect(simulation.getState().statistics.simulationTime).toBe(1);
    
    // Pause the simulation
    simulation.pause();
    
    // Update should not advance time when paused
    simulation.update(1);
    
    // Time should remain the same
    expect(simulation.getState().statistics.simulationTime).toBe(1);
  });

  it('should reset the simulation to initial state', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start and advance the simulation
    simulation.start();
    simulation.update(10);
    
    // Reset the simulation
    simulation.reset(defaultConfig);
    
    // Time should be reset
    expect(simulation.getState().statistics.simulationTime).toBe(0);
    
    // Environment should be recreated
    expect(Environment).toHaveBeenCalledTimes(2);
    
    // Animals should be recreated
    expect(Herbivore).toHaveBeenCalledTimes(defaultConfig.initialHerbivores * 2);
  });

  it('should update all animals during simulation update', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start the simulation
    simulation.start();
    
    // Get the mock animals for testing
    const animals = simulation.getState().animals;
    
    // Update the simulation
    simulation.update(1);
    
    // All animals should have their update method called
    animals.forEach(animal => {
      expect(animal.update).toHaveBeenCalledWith(1);
    });
  });

  it('should update the environment during simulation update', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start the simulation
    simulation.start();
    
    // Get the mock environment for testing
    const environment = simulation.getState().environment;
    
    // Update the simulation
    simulation.update(1);
    
    // Environment should have its update method called
    expect(environment.update).toHaveBeenCalledWith(1);
  });

  it('should remove dead animals during simulation update', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start the simulation
    simulation.start();
    
    // Mark some animals as dead
    const animals = simulation.getState().animals;
    (animals[0] as any).dead = true;
    (animals[1] as any).dead = true;
    
    // Initial count
    const initialCount = animals.length;
    
    // Update the simulation to trigger removal
    simulation.update(1);
    
    // Dead animals should be removed
    expect(simulation.getState().animals.length).toBe(initialCount - 2);
  });

  it('should handle animal interactions during simulation update', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start the simulation
    simulation.start();
    
    // Get the mock animals for testing
    const animals = simulation.getState().animals;
    
    // Make animals close enough to interact
    (animals[0].distanceTo as jest.Mock).mockReturnValue(1);
    
    // Set energy high enough for mating
    (animals[0] as any).energy = 60;
    (animals[1] as any).energy = 60;
    
    // Make mating successful
    (animals[0] as any).state = 'MATING';
    (animals[1] as any).state = 'MATING';
    
    // Make reproduction create an offspring
    const mockOffspring = { id: 'offspring' };
    (animals[0].reproduce as jest.Mock).mockReturnValue([mockOffspring]);
    
    // Update the simulation
    simulation.update(1);
    
    // Mate should have been called
    expect(animals[0].mate).toHaveBeenCalled();
    
    // Reproduction should have been called
    expect(animals[0].reproduce).toHaveBeenCalled();
  });

  it('should apply time scale to simulation updates', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start the simulation
    simulation.start();
    
    // Set time scale to 2x
    simulation.setTimeScale(2);
    
    // Update with real time of 1 second
    simulation.update(1);
    
    // Simulation time should advance by 2 (scaled) seconds
    expect(simulation.getState().statistics.simulationTime).toBe(2);
    
    // Animals should be updated with scaled time
    simulation.getState().animals.forEach(animal => {
      expect(animal.update).toHaveBeenCalledWith(2);
    });
  });

  it('should spawn new resources periodically', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Start the simulation
    simulation.start();
    
    // Update to just before resource spawn time
    simulation.update(9.9);
    
    // Count initial resource addition calls
    const initialCalls = (simulation.getState().environment.addResource as jest.Mock).mock.calls.length;
    
    // Update past the resource spawn threshold (10 time units)
    simulation.update(0.2);
    
    // Should have added new resources
    expect((simulation.getState().environment.addResource as jest.Mock).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should calculate statistics correctly', () => {
    const simulation = new Simulation(defaultConfig);
    
    // Set up some animals with different generations
    (Herbivore as jest.Mock).mockImplementationOnce(() => ({
      id: '1',
      update: jest.fn(),
      dead: false,
      stats: { generation: 1, children: 0, foodEaten: 0, distanceTraveled: 0, timeAlive: 0 },
      reproduce: jest.fn(),
      distanceTo: jest.fn(),
      mate: jest.fn()
    }));
    
    (Herbivore as jest.Mock).mockImplementationOnce(() => ({
      id: '2',
      update: jest.fn(),
      dead: false,
      stats: { generation: 3, children: 0, foodEaten: 0, distanceTraveled: 0, timeAlive: 0 },
      reproduce: jest.fn(),
      distanceTo: jest.fn(),
      mate: jest.fn()
    }));
    
    // Create a new simulation with these mocked animals
    const simulation = new Simulation({
      ...defaultConfig,
      initialHerbivores: 2
    });
    
    // Get statistics
    const stats = simulation.getState().statistics;
    
    // Should have correct counts
    expect(stats.totalAnimals).toBe(2);
    expect(stats.herbivoreCount).toBe(2);
    
    // Should have correct generation statistics
    expect(stats.averageGeneration).toBe(2); // (1+3)/2
    expect(stats.highestGeneration).toBe(3);
  });
});