import { Position } from '../types/Position';
import { Resource } from './Resource';
import { TerrainType } from './TerrainType';

export class Environment {
  private width: number;
  private height: number;
  private terrain: TerrainType[][];
  private resources: Resource[];
  private time: number;
  private dayLength: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.terrain = [];
    this.resources = [];
    this.time = 0;
    this.dayLength = 24;

    this.initializeTerrain();
  }

  private initializeTerrain(): void {
    // Initialize terrain with plain ground
    this.terrain = Array(this.height).fill(null).map(() => 
      Array(this.width).fill(TerrainType.PLAIN)
    );
    
    // Add some variety to the terrain
    this.generateRandomTerrain();
  }

  private generateRandomTerrain(): void {
    // Add water bodies
    const waterBodies = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < waterBodies; i++) {
      const centerX = Math.floor(Math.random() * this.width);
      const centerY = Math.floor(Math.random() * this.height);
      const radius = Math.floor(Math.random() * 10) + 5;
      
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          if (distance < radius) {
            this.terrain[y][x] = TerrainType.WATER;
          }
        }
      }
    }
    
    // Add forests
    const forests = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < forests; i++) {
      const centerX = Math.floor(Math.random() * this.width);
      const centerY = Math.floor(Math.random() * this.height);
      const radius = Math.floor(Math.random() * 15) + 8;
      
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          if (distance < radius && this.terrain[y][x] === TerrainType.PLAIN) {
            this.terrain[y][x] = TerrainType.FOREST;
          }
        }
      }
    }
    
    // Add mountains
    const mountains = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < mountains; i++) {
      const centerX = Math.floor(Math.random() * this.width);
      const centerY = Math.floor(Math.random() * this.height);
      const radius = Math.floor(Math.random() * 8) + 4;
      
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          if (distance < radius && this.terrain[y][x] === TerrainType.PLAIN) {
            this.terrain[y][x] = TerrainType.MOUNTAIN;
          }
        }
      }
    }
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getTerrainAt(position: Position): TerrainType {
    const { x, y } = position;
    if (this.isWithinBounds(position)) {
      return this.terrain[Math.floor(y)][Math.floor(x)];
    }
    return TerrainType.BOUNDARY;
  }

  public getTerrainDifficulty(from: Position, to: Position): number {
    const fromTerrain = this.getTerrainAt(from);
    const toTerrain = this.getTerrainAt(to);
    
    // Difficulty multiplier based on terrain type
    const difficultyMap = {
      [TerrainType.PLAIN]: 1.0,
      [TerrainType.FOREST]: 1.5,
      [TerrainType.WATER]: 3.0,
      [TerrainType.MOUNTAIN]: 2.5,
      [TerrainType.BOUNDARY]: 10.0
    };
    
    // Average the difficulty between the two points
    return (difficultyMap[fromTerrain] + difficultyMap[toTerrain]) / 2;
  }

  public isWithinBounds(position: Position): boolean {
    const { x, y } = position;
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public addResource(resource: Resource): void {
    this.resources.push(resource);
  }

  public getResourcesNear(position: Position, radius: number): Resource[] {
    return this.resources.filter(resource => {
      const resourcePos = resource.getPosition();
      const distance = Math.sqrt(
        Math.pow(resourcePos.x - position.x, 2) + 
        Math.pow(resourcePos.y - position.y, 2)
      );
      return distance <= radius;
    });
  }

  public removeResource(resourceId: string): void {
    this.resources = this.resources.filter(resource => resource.getId() !== resourceId);
  }

  public update(deltaTime: number): void {
    // Update time of day
    this.time = (this.time + deltaTime) % this.dayLength;
    
    // Natural resource regeneration
    this.regenerateResources(deltaTime);
  }

  private regenerateResources(deltaTime: number): void {
    // Periodic resource regeneration
    if (Math.random() < 0.05 * deltaTime) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const terrain = this.getTerrainAt({ x, y });
      
      if (terrain !== TerrainType.WATER && terrain !== TerrainType.BOUNDARY) {
        const nutritionalValue = 20 + Math.random() * 30;
        const resource = new Resource({ x, y }, 'plant', nutritionalValue);
        this.addResource(resource);
      }
    }
  }

  public getTimeOfDay(): number {
    return this.time;
  }

  public isDayTime(): boolean {
    return this.time >= 6 && this.time < 18;
  }
}
