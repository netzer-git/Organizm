import { Animal } from '../entities/Animal';
import { Environment } from '../environment/Environment';
import { EventEmitter } from '../utils/EventEmitter';
import { SimulationStats } from './SimulationStats';

export class Simulation {
  private environment: Environment;
  private animals: Animal[];
  private running: boolean;
  private timeStep: number;
  private currentTime: number;
  private events: EventEmitter;
  private stats: SimulationStats;

  constructor(width: number, height: number) {
    this.environment = new Environment(width, height);
    this.animals = [];
    this.running = false;
    this.timeStep = 0.1; // simulation time step in arbitrary units
    this.currentTime = 0;
    this.events = new EventEmitter();
    this.stats = new SimulationStats();
  }

  public addAnimal(animal: Animal): void {
    this.animals.push(animal);
    this.events.emit('animalAdded', animal);
  }

  public removeAnimal(animalId: string): void {
    const animalIndex = this.animals.findIndex(animal => animal.getId() === animalId);
    if (animalIndex !== -1) {
      const removedAnimal = this.animals[animalIndex];
      this.animals.splice(animalIndex, 1);
      this.events.emit('animalRemoved', removedAnimal);
    }
  }

  public getEnvironment(): Environment {
    return this.environment;
  }

  public getAnimals(): Animal[] {
    return [...this.animals];
  }

  public start(): void {
    if (!this.running) {
      this.running = true;
      this.events.emit('simulationStarted');
    }
  }

  public pause(): void {
    if (this.running) {
      this.running = false;
      this.events.emit('simulationPaused');
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  public update(): void {
    if (!this.running) {
      return;
    }

    // Update environment
    this.environment.update(this.timeStep);
    
    // Update all animals
    const newAnimals: Animal[] = [];
    
    for (const animal of this.animals) {
      // Skip already dead animals
      if (animal.isDead()) {
        continue;
      }
      
      // Update animal behavior
      animal.update(this.environment, this.timeStep);
      
      // Handle reproduction
      if (animal.getState() === 'mating') {
        // Find a mate (simplified for now)
        const potentialMates = this.animals.filter(
          mate => mate !== animal && 
          mate.getSpecies() === animal.getSpecies() && 
          mate.canMate()
        );
        
        if (potentialMates.length > 0) {
          const mate = potentialMates[0];
          const offspring = animal.mate(mate);
          
          if (offspring) {
            newAnimals.push(offspring);
          }
        }
      }
    }
    
    // Add new offspring
    for (const newAnimal of newAnimals) {
      this.addAnimal(newAnimal);
    }
    
    // Remove dead animals
    this.animals = this.animals.filter(animal => !animal.isDead());
    
    // Update statistics
    this.stats.update(this.animals, this.environment);
    
    // Advance simulation time
    this.currentTime += this.timeStep;
    
    // Emit update event
    this.events.emit('simulationUpdated', {
      time: this.currentTime,
      animals: this.animals,
      environment: this.environment,
      stats: this.stats
    });
  }

  public on(event: string, callback: Function): void {
    this.events.on(event, callback);
  }

  public off(event: string, callback: Function): void {
    this.events.off(event, callback);
  }

  public getStats(): SimulationStats {
    return this.stats;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public setTimeStep(timeStep: number): void {
    this.timeStep = timeStep;
  }

  public reset(): void {
    this.animals = [];
    this.environment = new Environment(this.environment.getWidth(), this.environment.getHeight());
    this.currentTime = 0;
    this.stats.reset();
    this.events.emit('simulationReset');
  }
}