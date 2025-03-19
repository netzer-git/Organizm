import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Animal } from '../core/Animal';
import { Resource } from '../core/Resource';
import { Environment } from '../core/Environment';
import { TerrainType, ResourceType, Weather } from '../core/types';
import { Herbivore } from '../core/Herbivore';

/**
 * Handles rendering the simulation to a PixiJS canvas
 */
export class Renderer {
  private app: Application;
  private worldContainer: Container;
  private cellSize: number;
  private terrainGraphics: Graphics;
  private resourceGraphics: Graphics;
  private animalGraphics: Graphics;
  private uiContainer: Container;
  private weatherText: Text;
  private timeText: Text;
  
  /**
   * Create a new renderer
   * @param app PixiJS application 
   */
  constructor(app: Application) {
    this.app = app;
    
    // Create containers for different visual layers
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);
    
    // Graphics objects for different entity types
    this.terrainGraphics = new Graphics();
    this.resourceGraphics = new Graphics();
    this.animalGraphics = new Graphics();
    
    // Add graphics objects to world container in desired order
    this.worldContainer.addChild(this.terrainGraphics);
    this.worldContainer.addChild(this.resourceGraphics);
    this.worldContainer.addChild(this.animalGraphics);
    
    // Create UI elements
    this.uiContainer = new Container();
    this.app.stage.addChild(this.uiContainer);
    
    // Text style for UI elements
    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 'white',
      stroke: 'black',
      strokeThickness: 2
    });
    
    // Weather text
    this.weatherText = new Text('Weather: Sunny', textStyle);
    this.weatherText.position.set(10, 10);
    this.uiContainer.addChild(this.weatherText);
    
    // Time text
    this.timeText = new Text('Time: 0', textStyle);
    this.timeText.position.set(10, 30);
    this.uiContainer.addChild(this.timeText);
  }
  
  /**
   * Render the current state of the simulation
   * @param environment The environment to render
   * @param animals List of animals to render
   * @param simulationTime Current simulation time
   */
  public render(environment: Environment, animals: Animal[], simulationTime: number): void {
    // Calculate cell size based on environment dimensions and canvas size
    this.cellSize = Math.min(
      this.app.renderer.width / environment.width,
      this.app.renderer.height / environment.height
    );
    
    // Clear previous drawings
    this.terrainGraphics.clear();
    this.resourceGraphics.clear();
    this.animalGraphics.clear();
    
    // Render terrain
    this.renderTerrain(environment);
    
    // Render resources
    this.renderResources(environment.getResources());
    
    // Render animals
    this.renderAnimals(animals);
    
    // Update UI elements
    this.weatherText.text = `Weather: ${Weather[environment.weather]}`;
    this.timeText.text = `Time: ${Math.floor(simulationTime)}`;
  }
  
  /**
   * Render the terrain
   * @param environment The environment containing terrain data
   */
  private renderTerrain(environment: Environment): void {
    // Render each terrain cell
    for (let y = 0; y < environment.height; y++) {
      for (let x = 0; x < environment.width; x++) {
        const terrainType = environment.getTerrainAt({ x, y });
        const terrainColor = this.getTerrainColor(terrainType);
        
        this.terrainGraphics.beginFill(terrainColor);
        this.terrainGraphics.drawRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
        this.terrainGraphics.endFill();
      }
    }
  }
  
  /**
   * Render the resources
   * @param resources List of resources to render
   */
  private renderResources(resources: Resource[]): void {
    for (const resource of resources) {
      const x = resource.position.x * this.cellSize;
      const y = resource.position.y * this.cellSize;
      const color = this.getResourceColor(resource.type);
      
      // Size based on resource amount
      const size = Math.min(this.cellSize * 0.5, this.cellSize * 0.2 + (resource.amount / 20) * this.cellSize * 0.3);
      
      this.resourceGraphics.beginFill(color);
      
      // Different shapes for different resource types
      if (resource.type === ResourceType.PLANT) {
        // Plants are small circles
        this.resourceGraphics.drawCircle(x, y, size);
      } else if (resource.type === ResourceType.WATER) {
        // Water is a blue square
        this.resourceGraphics.drawRect(x - size, y - size, size * 2, size * 2);
      } else {
        // Other resource types are triangles
        this.resourceGraphics.drawPolygon([
          x, y - size,
          x + size, y + size,
          x - size, y + size
        ]);
      }
      
      this.resourceGraphics.endFill();
    }
  }
  
  /**
   * Render the animals
   * @param animals List of animals to render
   */
  private renderAnimals(animals: Animal[]): void {
    for (const animal of animals) {
      const x = animal.position.x * this.cellSize;
      const y = animal.position.y * this.cellSize;
      
      // Different colors for different animal types
      let color = 0xFFFFFF; // Default white
      
      if (animal instanceof Herbivore) {
        color = 0x00FF00; // Green for herbivores
      }
      
      // Size based on strength and age
      const baseSize = this.cellSize * 0.3;
      const size = baseSize + animal.traits.strength * 0.05 * baseSize;
      
      this.animalGraphics.beginFill(color);
      this.animalGraphics.drawCircle(x, y, size);
      this.animalGraphics.endFill();
      
      // Draw direction indicator (if moving)
      if (animal.direction !== undefined && animal.direction !== null && animal.direction !== 0) {
        const directionLength = size * 1.5;
        const angle = this.getDirectionAngle(animal.direction);
        
        this.animalGraphics.lineStyle(2, 0xFFFFFF);
        this.animalGraphics.moveTo(x, y);
        this.animalGraphics.lineTo(
          x + Math.cos(angle) * directionLength,
          y + Math.sin(angle) * directionLength
        );
      }
    }
  }
  
  /**
   * Get the color for a terrain type
   * @param terrainType The terrain type
   * @returns Color as a hexadecimal number
   */
  private getTerrainColor(terrainType: TerrainType): number {
    switch (terrainType) {
      case TerrainType.WATER:
        return 0x0077BE; // Deep blue
      case TerrainType.LAND:
        return 0x8B4513; // Brown
      case TerrainType.FOREST:
        return 0x228B22; // Forest green
      case TerrainType.MOUNTAIN:
        return 0x808080; // Gray
      case TerrainType.DESERT:
        return 0xF4A460; // Sandy brown
      default:
        return 0xCCCCCC; // Light gray (default)
    }
  }
  
  /**
   * Get the color for a resource type
   * @param resourceType The resource type
   * @returns Color as a hexadecimal number
   */
  private getResourceColor(resourceType: ResourceType): number {
    switch (resourceType) {
      case ResourceType.PLANT:
        return 0x32CD32; // Lime green
      case ResourceType.WATER:
        return 0x00FFFF; // Cyan
      case ResourceType.SMALL_ANIMAL:
        return 0xFFFF00; // Yellow
      case ResourceType.LARGE_ANIMAL:
        return 0xFF8C00; // Dark orange
      default:
        return 0xFFFFFF; // White (default)
    }
  }
  
  /**
   * Convert a direction enum value to an angle in radians
   * @param direction The direction enum value
   * @returns The corresponding angle in radians
   */
  private getDirectionAngle(direction: number): number {
    const directionAngles = [
      Math.PI * 1.5, // North (0) - up
      Math.PI * 1.75, // Northeast (1) - up-right
      0, // East (2) - right
      Math.PI * 0.25, // Southeast (3) - down-right
      Math.PI * 0.5, // South (4) - down
      Math.PI * 0.75, // Southwest (5) - down-left
      Math.PI, // West (6) - left
      Math.PI * 1.25 // Northwest (7) - up-left
    ];
    
    return directionAngles[direction] || 0;
  }
}