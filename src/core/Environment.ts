import { Position, Weather, TerrainType } from './types';
import { Resource } from './Resource';
import { Logger } from '../utils/Logger';

/**
 * Configuration for the environment
 */
export interface EnvironmentConfig {
  width: number;
  height: number;
  initialWeather: Weather;
  weatherChangeInterval: number;
}

/**
 * The environment where animals live and interact
 */
export class Environment {
  public width: number;
  public height: number;
  public weather: Weather;
  private resources: Resource[] = [];
  private terrainMap: TerrainType[][] = [];
  private weatherTimer: number = 0;
  private weatherChangeInterval: number;
  
  private logger: Logger;

  /**
   * Create a new environment
   * @param config Configuration for the environment
   */
  constructor(config: EnvironmentConfig) {
    this.width = config.width;
    this.height = config.height;
    this.weather = config.initialWeather;
    this.weatherChangeInterval = config.weatherChangeInterval;
    this.logger = new Logger('Environment');
    
    // Initialize terrain map
    this.initializeTerrainMap();
    
    this.logger.info(`Environment created with dimensions ${this.width}x${this.height}`);
  }

  /**
   * Update the environment for one simulation tick
   * @param deltaTime Time elapsed since last update
   */
  public update(deltaTime: number): void {
    // Update weather
    this.updateWeather(deltaTime);
    
    // Update resources
    this.updateResources(deltaTime);
  }

  /**
   * Add a resource to the environment
   * @param resource The resource to add
   */
  public addResource(resource: Resource): void {
    this.resources.push(resource);
    this.logger.debug(`Resource added at (${resource.position.x}, ${resource.position.y})`);
  }

  /**
   * Get all resources in the environment
   * @returns Array of resources
   */
  public getResources(): Resource[] {
    // Include resources that are not depleted OR have regeneration
    return this.resources.filter(r => !r.depleted || r.regenerationRate > 0);
  }

  /**
   * Get resources near a position
   * @param position Center position
   * @param radius Search radius
   * @returns Resources within the radius
   */
  public getResourcesNear(position: Position, radius: number): Resource[] {
    return this.getResources().filter(resource => {
      const dx = resource.position.x - position.x;
      const dy = resource.position.y - position.y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= radius * radius;
    });
  }

  /**
   * Get terrain at a specific position
   * @param position The position to check
   * @returns The terrain type at the position
   */
  public getTerrainAt(position: Position): TerrainType {
    // Convert floating point position to integer grid coordinates
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    
    // Check bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TerrainType.WATER; // Default to water for out-of-bounds
    }
    
    return this.terrainMap[y][x];
  }

  /**
   * Check if a position is within the environment bounds
   * @param position The position to check
   * @returns True if position is within bounds
   */
  public isInBounds(position: Position): boolean {
    return position.x >= 0 && position.x < this.width && 
           position.y >= 0 && position.y < this.height;
  }

  /**
   * Get a random position within the environment bounds
   * @param terrainFilter Optional terrain type to filter for
   * @returns A random position
   */
  public getRandomPosition(terrainFilter?: TerrainType): Position {
    if (terrainFilter !== undefined) {
      // Try to find a position with the desired terrain type
      for (let i = 0; i < 100; i++) { // Limit attempts to avoid infinite loop
        const pos = {
          x: Math.random() * this.width,
          y: Math.random() * this.height
        };
        if (this.getTerrainAt(pos) === terrainFilter) {
          return pos;
        }
      }
    }
    
    // Default random position
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height
    };
  }

  /**
   * Adjust position to ensure it's within environment bounds
   * @param position The position to adjust
   * @returns The adjusted position
   */
  public boundPosition(position: Position): Position {
    return {
      x: Math.max(0, Math.min(this.width - 0.001, position.x)),
      y: Math.max(0, Math.min(this.height - 0.001, position.y))
    };
  }

  /**
   * Initialize the terrain map
   */
  private initializeTerrainMap(): void {
    this.terrainMap = [];
    
    // Create a simple terrain map with land and water
    for (let y = 0; y < this.height; y++) {
      const row: TerrainType[] = [];
      for (let x = 0; x < this.width; x++) {
        // Simple terrain generation - just a placeholder
        // In a real implementation, this would use a more sophisticated algorithm
        let terrainType: TerrainType;
        
        const normalizedX = x / this.width;
        const normalizedY = y / this.height;
        
        // Create some basic terrain patterns
        const perlinValue = this.simpleNoise(normalizedX * 5, normalizedY * 5);
        
        if (perlinValue < 0.2) {
          terrainType = TerrainType.WATER;
        } else if (perlinValue < 0.3) {
          terrainType = TerrainType.DESERT;
        } else if (perlinValue < 0.7) {
          terrainType = TerrainType.LAND;
        } else if (perlinValue < 0.9) {
          terrainType = TerrainType.FOREST;
        } else {
          terrainType = TerrainType.MOUNTAIN;
        }
        
        row.push(terrainType);
      }
      this.terrainMap.push(row);
    }
    
    this.logger.debug('Terrain map initialized');
  }

  /**
   * Update the environment's weather
   * @param deltaTime Time elapsed since last update
   */
  private updateWeather(deltaTime: number): void {
    this.weatherTimer += deltaTime;
    
    if (this.weatherTimer >= this.weatherChangeInterval) {
      this.weatherTimer = 0;
      this.changeWeather();
    }
  }

  /**
   * Change the weather to a new random state
   */
  private changeWeather(): void {
    const weatherValues = Object.values(Weather).filter(v => typeof v === 'number') as Weather[];
    const newWeather = weatherValues[Math.floor(Math.random() * weatherValues.length)];
    
    if (newWeather !== this.weather) {
      this.weather = newWeather;
      this.logger.info(`Weather changed to ${Weather[newWeather]}`);
    }
  }

  /**
   * Update all resources in the environment
   * @param deltaTime Time elapsed since last update
   */
  private updateResources(deltaTime: number): void {
    this.resources.forEach(resource => {
      resource.update(deltaTime);
    });
    
    // Remove depleted resources with no regeneration
    this.resources = this.resources.filter(resource => 
      !resource.depleted || resource.regenerationRate > 0
    );
  }

  /**
   * Simple noise function for terrain generation
   * This is a very basic implementation - for a real project, use a proper noise library
   */
  private simpleNoise(x: number, y: number): number {
    // A very simplified noise implementation
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    // Simple sine-based noise
    const noise = 0.5 * (
      Math.sin(X * 0.1 + Y * 0.1) + 
      Math.sin(X * 0.1 * Y * 0.1) + 
      Math.sin(x + y)
    ) + 0.5;
    
    return Math.min(1, Math.max(0, noise));
  }
}