import { Animal } from '../core/Animal';
import { Environment, EnvironmentConfig } from '../core/Environment';
import { Resource } from '../core/Resource';
import { Position, ResourceType, Weather, TerrainType, Traits, AnimalState } from '../core/types';
import { Logger } from '../utils/Logger';
import { Herbivore } from '../core/Herbivore';

/**
 * Configuration for simulation initialization
 */
export interface SimulationConfig {
  environmentConfig: EnvironmentConfig;
  initialHerbivores: number;
  initialPlants: number;
  initialWaterSources: number;
}

/**
 * Default traits for new animals
 */
const DEFAULT_HERBIVORE_TRAITS: Traits = {
  speed: 2,
  strength: 3,
  perception: 8,
  metabolism: 0.5,
  reproductiveUrge: 10,
  lifespan: 100
};

/**
 * Main simulation class that orchestrates all entities and their interactions
 */
export class Simulation {
  private environment: Environment;
  private animals: Animal[] = [];
  private simulationTime: number = 0;
  private logger: Logger;
  private isRunning: boolean = false;
  private timeScale: number = 1.0; // Time acceleration factor

  /**
   * Create a new simulation
   * @param config Configuration for the simulation
   */
  constructor(config: SimulationConfig) {
    this.logger = new Logger('Simulation');
    
    // Create environment
    this.environment = new Environment(config.environmentConfig);
    
    // Initialize animals
    this.initializeHerbivores(config.initialHerbivores);
    
    // Initialize plants
    this.initializePlants(config.initialPlants);
    
    // Initialize water sources
    this.initializeWaterSources(config.initialWaterSources);
    
    this.logger.info('Simulation initialized');
  }

  /**
   * Start the simulation
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logger.info('Simulation started');
  }

  /**
   * Pause the simulation
   */
  public pause(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.logger.info('Simulation paused');
  }

  /**
   * Reset the simulation to initial state
   * @param config Configuration for the simulation
   */
  public reset(config: SimulationConfig): void {
    this.pause();
    
    this.animals = [];
    this.simulationTime = 0;
    
    // Recreate environment
    this.environment = new Environment(config.environmentConfig);
    
    // Reinitialize animals and resources
    this.initializeHerbivores(config.initialHerbivores);
    this.initializePlants(config.initialPlants);
    this.initializeWaterSources(config.initialWaterSources);
    
    this.logger.info('Simulation reset');
  }

  /**
   * Update the simulation for one tick
   * @param deltaTime Time elapsed since last update in real-time seconds
   */
  public update(deltaTime: number): void {
    if (!this.isRunning) return;
    
    // Apply time scale
    const scaledDelta = deltaTime * this.timeScale;
    
    // Update simulation time
    this.simulationTime += scaledDelta;
    
    // Update environment (weather, terrain effects)
    this.environment.update(scaledDelta);
    
    // Update all animals
    this.updateAnimals(scaledDelta);
    
    // Handle interactions between animals
    this.handleAnimalInteractions();
    
    // Remove dead animals
    this.removeDeadAnimals();
    
    // Periodically spawn new resources
    this.spawnResources(scaledDelta);
  }

  /**
   * Get the current state of the simulation for rendering
   */
  public getState() {
    return {
      animals: this.animals,
      environment: this.environment,
      simulationTime: this.simulationTime,
      statistics: this.getStatistics()
    };
  }

  /**
   * Set the simulation time scale (speed multiplier)
   * @param scale New time scale factor
   */
  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(10, scale));
    this.logger.info(`Time scale set to ${this.timeScale}x`);
  }

  /**
   * Initialize herbivore animals in the simulation
   * @param count Number of herbivores to create
   */
  private initializeHerbivores(count: number): void {
    for (let i = 0; i < count; i++) {
      // Create herbivore at a random land position
      const position = this.environment.getRandomPosition(TerrainType.LAND);
      
      // Create with default traits
      const herbivore = new Herbivore(
        position,
        { ...DEFAULT_HERBIVORE_TRAITS },
        this.environment
      );
      
      this.animals.push(herbivore);
    }
    
    this.logger.info(`Created ${count} herbivores`);
  }

  /**
   * Initialize plant resources in the simulation
   * @param count Number of plants to create
   */
  private initializePlants(count: number): void {
    for (let i = 0; i < count; i++) {
      // Plants grow better on land and in forests
      const terrainType = Math.random() > 0.3 ? TerrainType.FOREST : TerrainType.LAND;
      const position = this.environment.getRandomPosition(terrainType);
      
      // Create plant resource
      const plant = new Resource(
        position,
        ResourceType.PLANT,
        10 + Math.random() * 20, // Random initial size
        0.1 + Math.random() * 0.3 // Random regeneration rate
      );
      
      this.environment.addResource(plant);
    }
    
    this.logger.info(`Created ${count} plant resources`);
  }

  /**
   * Initialize water sources in the simulation
   * @param count Number of water sources to create
   */
  private initializeWaterSources(count: number): void {
    for (let i = 0; i < count; i++) {
      const position = this.environment.getRandomPosition(TerrainType.WATER);
      
      // Create water resource
      const water = new Resource(
        position,
        ResourceType.WATER,
        100 + Math.random() * 200, // Large initial amount
        1 + Math.random() * 2 // Fast regeneration
      );
      
      this.environment.addResource(water);
    }
    
    this.logger.info(`Created ${count} water sources`);
  }

  /**
   * Update all animals in the simulation
   * @param deltaTime Time elapsed since last update
   */
  private updateAnimals(deltaTime: number): void {
    this.animals.forEach(animal => {
      animal.update(deltaTime);
    });
  }

  /**
   * Handle interactions between animals (mating, fighting, etc)
   */
  private handleAnimalInteractions(): void {
    // Find potential mates
    for (let i = 0; i < this.animals.length; i++) {
      const animalA = this.animals[i];
      
      // Skip dead animals
      if (animalA.dead) continue;
      
      // Look for potential mates
      for (let j = i + 1; j < this.animals.length; j++) {
        const animalB = this.animals[j];
        
        if (animalB.dead) continue;
        
        // If animals are close enough and both are in appropriate state
        const distance = animalA.distanceTo(animalB.position);
        
        if (distance < 2) {
          // Check if both animals are ready to mate
          if (animalA.energy > 50 && animalB.energy > 50) {
            // Attempt to mate
            animalA.mate(animalB);
            
            // If mating successful, create offspring
            if (animalA.state === AnimalState.MATING && animalB.state === AnimalState.MATING) {
              const offspring = animalA.reproduce(animalB);
              this.animals.push(...offspring);
              
              this.logger.debug(`Animals ${animalA.id} and ${animalB.id} produced ${offspring.length} offspring`);
            }
          }
        }
      }
    }
  }

  /**
   * Remove dead animals from the simulation
   */
  private removeDeadAnimals(): void {
    const initialCount = this.animals.length;
    this.animals = this.animals.filter(animal => !animal.dead);
    
    const removedCount = initialCount - this.animals.length;
    if (removedCount > 0) {
      this.logger.debug(`Removed ${removedCount} dead animals`);
    }
  }

  /**
   * Spawn new resources periodically
   * @param deltaTime Time elapsed since last update
   */
  private spawnResources(deltaTime: number): void {
    // Every 10 simulation time units, spawn some new resources
    if (Math.floor(this.simulationTime / 10) > Math.floor((this.simulationTime - deltaTime) / 10)) {
      // Spawn a few new plants
      const newPlantCount = 2 + Math.floor(Math.random() * 3);
      this.initializePlants(newPlantCount);
    }
  }

  /**
   * Get statistics about the current simulation state
   */
  private getStatistics(): any {
    const totalAnimals = this.animals.length;
    const herbivores = this.animals.filter(a => a instanceof Herbivore).length;
    
    // Calculate average generation
    const totalGenerations = this.animals.reduce((sum, animal) => sum + animal.stats.generation, 0);
    const averageGeneration = totalAnimals > 0 ? totalGenerations / totalAnimals : 0;
    
    // Get highest generation
    const highestGeneration = this.animals.reduce(
      (max, animal) => Math.max(max, animal.stats.generation),
      0
    );
    
    return {
      totalAnimals,
      herbivoreCount: herbivores,
      averageGeneration,
      highestGeneration,
      simulationTime: this.simulationTime
    };
  }
}