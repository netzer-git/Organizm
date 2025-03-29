import { Application, Container, Graphics, Text, TextStyle, FederatedPointerEvent, Point } from 'pixi.js';
import { Animal } from '../core/Animal';
import { Resource } from '../core/Resource';
import { Environment } from '../core/Environment';
import { TerrainType, ResourceType, Weather, AnimalState } from '../core/types';
import { Herbivore } from '../core/Herbivore';
import { Carnivore } from '../core/Carnivore';

/**
 * Renderer configuration options
 */
export interface RendererOptions {
  showTrails?: boolean;
  zoomLevel?: number;
  highlightHover?: boolean;
  showMinimap?: boolean;
}

/**
 * Handles rendering the simulation to a PixiJS canvas
 */
export class Renderer {
  private app: Application;
  private worldContainer: Container;
  private cellSize: number = 10; // Default size
  private terrainGraphics: Graphics;
  private resourceGraphics: Graphics;
  private animalGraphics: Graphics;
  private trailGraphics: Graphics;
  private uiContainer: Container;
  private weatherText: Text;
  private timeText: Text;
  private zoomLevel: number = 1;
  private showTrails: boolean = false;
  private selectedAnimal: Animal | null = null;
  private followingAnimal: Animal | null = null;
  private animalTrails: Map<string, {x: number, y: number}[]> = new Map();
  private maxTrailLength: number = 50;
  private onAnimalSelected: ((animal: Animal | null) => void) | null = null;
  private highlightHover: boolean = true;
  private hoveredAnimal: Animal | null = null;
  private tooltipElement: HTMLElement | null = null;
  private animalsByPosition: Map<string, Animal> = new Map();
  private isPanning: boolean = false;
  private lastPanPosition: { x: number, y: number } | null = null;
  private showMinimap: boolean = true;
  private minimapGraphics: Graphics;
  private minimapContainer: Container;
  
  /**
   * Create a new renderer
   * @param app PixiJS application 
   * @param options Rendering options
   */
  constructor(app: Application, options: RendererOptions = {}) {
    this.app = app;
    this.showTrails = options.showTrails || false;
    this.zoomLevel = options.zoomLevel || 1;
    this.highlightHover = options.highlightHover !== undefined ? options.highlightHover : true;
    this.showMinimap = options.showMinimap !== undefined ? options.showMinimap : true;
    
    // Create containers for different visual layers
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);
    
    // Graphics objects for different entity types
    this.terrainGraphics = new Graphics();
    this.resourceGraphics = new Graphics();
    this.trailGraphics = new Graphics();
    this.animalGraphics = new Graphics();
    
    // Add graphics objects to world container in desired order
    this.worldContainer.addChild(this.terrainGraphics);
    this.worldContainer.addChild(this.resourceGraphics);
    this.worldContainer.addChild(this.trailGraphics);
    this.worldContainer.addChild(this.animalGraphics);
    
    // Make animal graphics interactive
    this.animalGraphics.eventMode = 'static';
    this.animalGraphics.cursor = 'pointer';
    this.animalGraphics.on('pointerdown', this.handleAnimalClick.bind(this));
    this.animalGraphics.on('pointerover', this.handlePointerOver.bind(this));
    this.animalGraphics.on('pointerout', this.handlePointerOut.bind(this));
    
    // Create UI elements
    this.uiContainer = new Container();
    this.app.stage.addChild(this.uiContainer);
    
    // Create minimap
    this.minimapContainer = new Container();
    this.minimapGraphics = new Graphics();
    this.minimapContainer.addChild(this.minimapGraphics);
    this.app.stage.addChild(this.minimapContainer);
    
    // Position minimap in bottom-right corner
    this.minimapContainer.position.set(
      this.app.renderer.width - 120, 
      this.app.renderer.height - 120
    );
    
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
    
    // Apply initial zoom
    this.worldContainer.scale.set(this.zoomLevel);
    // Center the world container
    this.centerWorldContainer();
    
    // Get tooltip element
    this.tooltipElement = document.getElementById('tooltip');
    
    // Set up event handlers
    this.setupEventListeners();
    
    // Set up panning controls for the world view
    this.setupPanningControls();
  }
  
  /**
   * Set up event listeners for UI interactions
   */
  private setupEventListeners(): void {
    // Follow button
    const followButton = document.getElementById('follow-animal');
    if (followButton) {
      followButton.addEventListener('click', () => {
        if (this.selectedAnimal) {
          if (this.followingAnimal === this.selectedAnimal) {
            // Unfollow if already following this animal
            this.stopFollowingAnimal();
            followButton.textContent = 'Follow';
          } else {
            // Start following
            this.followAnimal(this.selectedAnimal);
            followButton.textContent = 'Unfollow';
          }
        }
      });
    }
    
    // Legend toggle
    const legendToggle = document.getElementById('show-legend');
    if (legendToggle) {
      legendToggle.addEventListener('change', (e) => {
        const legend = document.getElementById('legend');
        if (legend) {
          legend.style.display = (e.target as HTMLInputElement).checked ? 'block' : 'none';
        }
      });
    }
    
    // Close buttons for animal details
    const closeButtons = document.querySelectorAll('#close-entity-details, #close-entity-details-btn');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectAnimal(null);
      });
    });
  }
  
  /**
   * Set up camera panning controls
   */
  private setupPanningControls(): void {
    // Add mouse listeners for panning
    this.app.stage.eventMode = 'static';
    
    // Handle right-click and drag to pan
    this.app.stage.on('rightdown', this.startPan.bind(this));
    this.app.stage.on('rightup', this.stopPan.bind(this));
    this.app.stage.on('rightupoutside', this.stopPan.bind(this));
    this.app.stage.on('pointermove', this.updatePan.bind(this));
    
    // Add middle mouse button pan too (more intuitive for many users)
    this.app.stage.on('mousedown', (e: FederatedPointerEvent) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        e.stopPropagation();
        this.startPan(e);
      }
    });
    
    // Add key controls for panning with arrows
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const panSpeed = 20;
      switch(e.key) {
        case 'ArrowUp':
          this.worldContainer.position.y += panSpeed;
          break;
        case 'ArrowDown':
          this.worldContainer.position.y -= panSpeed;
          break;
        case 'ArrowLeft':
          this.worldContainer.position.x += panSpeed;
          break;
        case 'ArrowRight':
          this.worldContainer.position.x -= panSpeed;
          break;
        case 'Home': // Reset view
          this.centerWorldContainer();
          break;
      }
    });
  }
  
  /**
   * Start panning on mouse down
   */
  private startPan(e: FederatedPointerEvent): void {
    this.isPanning = true;
    this.lastPanPosition = { x: e.global.x, y: e.global.y };
    this.app.stage.cursor = 'grabbing';
  }
  
  /**
   * Stop panning on mouse up
   */
  private stopPan(): void {
    this.isPanning = false;
    this.lastPanPosition = null;
    this.app.stage.cursor = 'default';
  }
  
  /**
   * Update pan position on mouse move
   */
  private updatePan(e: FederatedPointerEvent): void {
    if (!this.isPanning || !this.lastPanPosition) return;
    
    // Calculate drag distance
    const dx = e.global.x - this.lastPanPosition.x;
    const dy = e.global.y - this.lastPanPosition.y;
    
    // Update container position
    this.worldContainer.position.x += dx;
    this.worldContainer.position.y += dy;
    
    // Update last position
    this.lastPanPosition = { x: e.global.x, y: e.global.y };
    
    // Stop following if manually panning
    if (this.followingAnimal && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      this.stopFollowingAnimal();
    }
  }
  
  /**
   * Set a callback function for when an animal is selected
   * @param callback The callback function
   */
  public setAnimalSelectedCallback(callback: (animal: Animal | null) => void): void {
    this.onAnimalSelected = callback;
  }
  
  /**
   * Set renderer options
   * @param options Renderer options to update
   */
  public setOptions(options: RendererOptions): void {
    if (options.showTrails !== undefined) {
      this.showTrails = options.showTrails;
      if (!this.showTrails) {
        // Clear trails if disabled
        this.trailGraphics.clear();
        this.animalTrails.clear();
      }
    }
    
    if (options.zoomLevel !== undefined) {
      this.zoomLevel = options.zoomLevel;
      this.worldContainer.scale.set(this.zoomLevel);
      this.centerWorldContainer();
    }
    
    if (options.highlightHover !== undefined) {
      this.highlightHover = options.highlightHover;
    }
    
    if (options.showMinimap !== undefined) {
      this.showMinimap = options.showMinimap;
      this.minimapContainer.visible = this.showMinimap;
    }
  }
  
  /**
   * Center the world container in the view
   */
  private centerWorldContainer(): void {
    const worldWidth = this.app.renderer.width / this.zoomLevel;
    const worldHeight = this.app.renderer.height / this.zoomLevel;
    
    this.worldContainer.position.x = (this.app.renderer.width - worldWidth * this.zoomLevel) / 2;
    this.worldContainer.position.y = (this.app.renderer.height - worldHeight * this.zoomLevel) / 2;
  }
  
  /**
   * Center the view on a specific position
   * @param position The position to center on
   */
  private centerOnPosition(position: { x: number, y: number }): void {
    // Convert position to world coordinates
    const worldX = position.x * this.cellSize;
    const worldY = position.y * this.cellSize;
    
    // Calculate new container position to center on this point
    this.worldContainer.position.x = (this.app.renderer.width / 2) - (worldX * this.zoomLevel);
    this.worldContainer.position.y = (this.app.renderer.height / 2) - (worldY * this.zoomLevel);
  }
  
  /**
   * Get current zoom level
   * @returns The current zoom level
   */
  public getZoomLevel(): number {
    return this.zoomLevel;
  }
  
  /**
   * Check if currently following a specific animal
   * @param animal The animal to check
   * @returns True if following this animal
   */
  public isFollowingAnimal(animal: Animal): boolean {
    return this.followingAnimal === animal;
  }
  
  /**
   * Start following a specific animal
   * @param animal The animal to follow
   */
  public followAnimal(animal: Animal): void {
    this.followingAnimal = animal;
    
    // Update follow button text
    const followButton = document.getElementById('follow-animal');
    if (followButton && this.selectedAnimal === animal) {
      followButton.textContent = 'Unfollow';
    }
  }
  
  /**
   * Stop following the current animal
   */
  public stopFollowingAnimal(): void {
    this.followingAnimal = null;
    
    // Update follow button text
    const followButton = document.getElementById('follow-animal');
    if (followButton) {
      followButton.textContent = 'Follow';
    }
  }
  
  /**
   * Select an animal to highlight
   * @param animal The animal to select, or null to deselect
   */
  public selectAnimal(animal: Animal | null): void {
    this.selectedAnimal = animal;
    
    // Show/hide detail panel
    const detailPanel = document.getElementById('selected-entity-info');
    if (detailPanel) {
      detailPanel.style.display = animal ? 'block' : 'none';
      
      // Update follow button
      const followButton = document.getElementById('follow-animal');
      if (followButton && animal) {
        followButton.textContent = (this.followingAnimal === animal) ? 'Unfollow' : 'Follow';
      }
    }
    
    if (this.onAnimalSelected) {
      this.onAnimalSelected(animal);
    }
  }
  
  /**
   * Handle hover events on animals
   */
  private handlePointerOver(event: FederatedPointerEvent): void {
    if (!this.highlightHover) return;
    
    const position = event.data.getLocalPosition(this.worldContainer);
    const hoverX = position.x / this.cellSize;
    const hoverY = position.y / this.cellSize;
    
    // Find animal being hovered 
    this.animalsByPosition.forEach((animal) => {
      const dx = animal.position.x - hoverX;
      const dy = animal.position.y - hoverY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const animalRadius = 0.3 + (animal.traits.strength * 0.05 * 0.3);
      
      if (distance <= animalRadius * 1.5) {
        this.hoveredAnimal = animal;
        this.showTooltip(animal, event.global.x, event.global.y);
      }
    });
  }
  
  /**
   * Handle pointer out events
   */
  private handlePointerOut(): void {
    this.hoveredAnimal = null;
    this.hideTooltip();
  }
  
  /**
   * Show tooltip with animal information
   */
  private showTooltip(animal: Animal, x: number, y: number): void {
    if (!this.tooltipElement) return;
    
    const typeText = animal instanceof Herbivore ? 'Herbivore' : 'Carnivore';
    const energyText = animal.energy.toFixed(1);
    const healthText = animal.health.toFixed(1);
    const stateText = AnimalState[animal.state];
    
    this.tooltipElement.innerHTML = `${typeText} - Gen ${animal.stats.generation}<br>Energy: ${energyText} | Health: ${healthText}<br>State: ${stateText}`;
    this.tooltipElement.style.left = `${x + 10}px`;
    this.tooltipElement.style.top = `${y + 10}px`;
    this.tooltipElement.style.opacity = '1';
  }
  
  /**
   * Hide the tooltip
   */
  private hideTooltip(): void {
    if (!this.tooltipElement) return;
    this.tooltipElement.style.opacity = '0';
  }
  
  /**
   * Handle click events on animals
   * @param event The interaction event
   */
  private handleAnimalClick(event: FederatedPointerEvent): void {
    const position = event.data.getLocalPosition(this.worldContainer);
    const clickX = position.x / this.cellSize;
    const clickY = position.y / this.cellSize;
    
    // Find the closest animal to the click position
    let closestAnimal: Animal | null = null;
    let closestDistance = Number.MAX_VALUE;
    
    // This is a simple implementation - in a real app, you'd want a more efficient lookup
    this.animalsByPosition.forEach((animal) => {
      const dx = animal.position.x - clickX;
      const dy = animal.position.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const animalRadius = 0.3 + (animal.traits.strength * 0.05 * 0.3);
      
      if (distance <= animalRadius * 1.5 && distance < closestDistance) {
        closestDistance = distance;
        closestAnimal = animal;
      }
    });
    
    this.selectAnimal(closestAnimal);
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
    ) / this.zoomLevel;
    
    // Clear previous drawings
    this.terrainGraphics.clear();
    this.resourceGraphics.clear();
    this.animalGraphics.clear();
    
    // Clear animal positions map
    this.animalsByPosition.clear();
    
    // If following an animal, center the view on it
    if (this.followingAnimal && !this.followingAnimal.dead) {
      this.centerOnPosition(this.followingAnimal.position);
    }
    
    // Render terrain
    this.renderTerrain(environment);
    
    // Render resources
    this.renderResources(environment.getResources());
    
    // Update and render animal trails
    if (this.showTrails) {
      this.updateTrails(animals);
      this.renderTrails();
    }
    
    // Render animals
    this.renderAnimals(animals);
    
    // Update UI elements
    this.weatherText.text = `Weather: ${Weather[environment.weather]}`;
    this.timeText.text = `Time: ${Math.floor(simulationTime)}`;
    
    // Check if followed animal is dead
    if (this.followingAnimal && this.followingAnimal.dead) {
      this.stopFollowingAnimal();
    }
    
    // Render minimap if enabled
    if (this.showMinimap) {
      this.renderMinimap(environment, animals);
    }
    
    // Update minimap position on window resize
    this.minimapContainer.position.set(
      this.app.renderer.width - 120, 
      this.app.renderer.height - 120
    );
  }
  
  /**
   * Update animal trails
   * @param animals List of animals to track
   */
  private updateTrails(animals: Animal[]): void {
    animals.forEach(animal => {
      if (animal.dead) {
        // Remove trails for dead animals
        this.animalTrails.delete(animal.id);
      } else {
        // Add or update trail for this animal
        const trail = this.animalTrails.get(animal.id) || [];
        
        // Add current position to trail
        trail.push({...animal.position});
        
        // Limit trail length
        if (trail.length > this.maxTrailLength) {
          trail.shift();
        }
        
        this.animalTrails.set(animal.id, trail);
      }
    });
  }
  
  /**
   * Render animal movement trails
   */
  private renderTrails(): void {
    this.trailGraphics.clear();
    
    this.animalTrails.forEach((trail, animalId) => {
      if (trail.length < 2) return;
      
      // Determine trail color based on animal type
      // We don't have a reference to the animal here, so we use a simple heuristic
      // based on the animal ID to choose a color
      const isHerbivore = animalId.charCodeAt(0) % 2 === 0;
      const trailColor = isHerbivore ? 0x4CAF50 : 0xf44336;
      
      // Make the trail more visible for the followed animal
      const isFollowed = this.followingAnimal && this.followingAnimal.id === animalId;
      const opacity = isFollowed ? 0.7 : 0.3;
      const lineWidth = isFollowed ? 2 : 1;
      
      this.trailGraphics.lineStyle(lineWidth, trailColor, opacity);
      
      // Draw trail as a line
      this.trailGraphics.moveTo(
        trail[0].x * this.cellSize,
        trail[0].y * this.cellSize
      );
      
      for (let i = 1; i < trail.length; i++) {
        this.trailGraphics.lineTo(
          trail[i].x * this.cellSize,
          trail[i].y * this.cellSize
        );
      }
    });
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
      // Store animal for lookup during clicks
      this.animalsByPosition.set(`${animal.position.x},${animal.position.y}`, animal);
      
      const x = animal.position.x * this.cellSize;
      const y = animal.position.y * this.cellSize;
      
      // Different colors for different animal types
      let color = 0xFFFFFF; // Default white
      let outlineColor = 0x333333; // Default dark gray outline
      
      if (animal instanceof Herbivore) {
        color = 0x4CAF50; // Green for herbivores
      } else if (animal instanceof Carnivore) {
        color = 0xf44336; // Red for carnivores
      }
      
      // Size based on strength and age
      const baseSize = this.cellSize * 0.3;
      const size = baseSize + animal.traits.strength * 0.05 * baseSize;
      
      // Outline width based on state
      let outlineWidth = 1;
      
      if (animal === this.selectedAnimal) {
        outlineColor = 0xFFFF00; // Yellow for selected animal
        outlineWidth = 3;
      } else if (animal === this.followingAnimal) {
        outlineColor = 0x00FFFF; // Cyan for followed animal
        outlineWidth = 3;
      } else if (animal === this.hoveredAnimal) {
        outlineColor = 0xFFFFFF; // White for hovered animal
        outlineWidth = 2;
      } else if (animal.state === AnimalState.SLEEPING) {
        outlineColor = 0x9C27B0; // Purple for sleeping
      } else if (animal.state === AnimalState.EATING) {
        outlineColor = 0xFF9800; // Orange for eating
      } else if (animal.state === AnimalState.MATING) {
        outlineColor = 0xE91E63; // Pink for mating
      }
      
      // Low health/energy indicators
      if (animal.health < 30 || animal.energy < 30) {
        outlineColor = 0xFF5722; // Deep orange for warnings
      }
      
      // Draw outline
      this.animalGraphics.lineStyle(outlineWidth, outlineColor);
      
      // Draw animal
      this.animalGraphics.beginFill(color, animal.dead ? 0.3 : 1); // Transparent if dead
      this.animalGraphics.drawCircle(x, y, size);
      this.animalGraphics.endFill();
      
      // Draw direction indicator (if moving)
      if (animal.direction !== undefined && animal.direction !== null && animal.direction > 0) {
        const directionLength = size * 1.5;
        const angle = this.getDirectionAngle(animal.direction);
        
        this.animalGraphics.lineStyle(2, 0xFFFFFF);
        this.animalGraphics.moveTo(x, y);
        this.animalGraphics.lineTo(
          x + Math.cos(angle) * directionLength,
          y + Math.sin(angle) * directionLength
        );
      }
      
      // Energy indicator (pie chart style)
      if (!animal.dead) {
        const energyPercentage = animal.energy / 100;
        const startAngle = -Math.PI / 2; // Start at top
        const endAngle = startAngle + 2 * Math.PI * energyPercentage;
        
        this.animalGraphics.lineStyle(0);
        this.animalGraphics.beginFill(0xFFEB3B, 0.7); // Yellow for energy
        this.animalGraphics.moveTo(x, y);
        this.animalGraphics.arc(x, y, size / 2, startAngle, endAngle, false);
        this.animalGraphics.lineTo(x, y);
        this.animalGraphics.endFill();
      }
      
      // Special indicators for followed animal
      if (animal === this.followingAnimal && !animal.dead) {
        // Add a glowing effect
        this.animalGraphics.lineStyle(1, 0x00FFFF, 0.5);
        this.animalGraphics.drawCircle(x, y, size * 1.8);
        
        // Add a pulsing circle
        const pulseAmount = (Math.sin(Date.now() / 300) + 1) / 4 + 1.2; // 1.2 to 1.7
        this.animalGraphics.lineStyle(2, 0x00FFFF, 0.3);
        this.animalGraphics.drawCircle(x, y, size * pulseAmount);
      }
    }
  }
  
  /**
   * Render the minimap
   * @param environment The environment to render
   * @param animals The animals to render
   */
  private renderMinimap(environment: Environment, animals: Animal[]): void {
    this.minimapGraphics.clear();
    
    const minimapSize = 100;
    const border = 2;
    
    // Draw background and border
    this.minimapGraphics.beginFill(0x000000, 0.5);
    this.minimapGraphics.drawRect(0, 0, minimapSize + border * 2, minimapSize + border * 2);
    this.minimapGraphics.endFill();
    
    // Draw the environment
    const cellSize = minimapSize / Math.max(environment.width, environment.height);
    
    // Draw terrain
    for (let y = 0; y < environment.height; y++) {
      for (let x = 0; x < environment.width; x++) {
        const terrainType = environment.getTerrainAt({ x, y });
        const terrainColor = this.getTerrainColor(terrainType);
        
        // Draw at reduced opacity
        this.minimapGraphics.beginFill(terrainColor, 0.6);
        this.minimapGraphics.drawRect(
          border + x * cellSize, 
          border + y * cellSize, 
          cellSize, 
          cellSize
        );
        this.minimapGraphics.endFill();
      }
    }
    
    // Draw animals as small dots
    for (const animal of animals) {
      if (animal.dead) continue;
      
      let color = 0xFFFFFF;
      if (animal instanceof Herbivore) {
        color = 0x4CAF50; // Green
      } else if (animal instanceof Carnivore) {
        color = 0xf44336; // Red
      }
      
      const dotSize = animal === this.selectedAnimal || animal === this.followingAnimal 
        ? 2.5 : 1.5;
      
      this.minimapGraphics.beginFill(color);
      this.minimapGraphics.drawCircle(
        border + animal.position.x * cellSize,
        border + animal.position.y * cellSize,
        dotSize
      );
      this.minimapGraphics.endFill();
    }
    
    // Draw viewport rectangle
    const viewportWidth = this.app.renderer.width / (this.cellSize * this.zoomLevel);
    const viewportHeight = this.app.renderer.height / (this.cellSize * this.zoomLevel);
    
    // Calculate the visible area of the world based on current pan/zoom
    const worldPos = this.worldContainer.position;
    const viewX = -worldPos.x / (this.cellSize * this.zoomLevel);
    const viewY = -worldPos.y / (this.cellSize * this.zoomLevel);
    
    this.minimapGraphics.lineStyle(1, 0xFFFFFF, 0.8);
    this.minimapGraphics.drawRect(
      border + viewX * cellSize,
      border + viewY * cellSize,
      viewportWidth * cellSize,
      viewportHeight * cellSize
    );
    
    // Draw followed animal indicator if needed
    if (this.followingAnimal && !this.followingAnimal.dead) {
      this.minimapGraphics.lineStyle(1, 0x00FFFF, 1);
      this.minimapGraphics.drawCircle(
        border + this.followingAnimal.position.x * cellSize,
        border + this.followingAnimal.position.y * cellSize,
        3
      );
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