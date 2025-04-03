import { Animal } from '../entities/Animal';
import { Environment } from '../environment/Environment';
import { TraitName } from '../genetics/Genes';

export class SimulationStats {
  private speciesCount: Map<string, number>;
  private totalPopulation: number;
  private averageTraits: Map<string, Map<TraitName, number>>;
  private births: number;
  private deaths: number;
  private generation: number;

  constructor() {
    this.speciesCount = new Map();
    this.totalPopulation = 0;
    this.averageTraits = new Map();
    this.births = 0;
    this.deaths = 0;
    this.generation = 1;
  }

  public update(animals: Animal[], environment: Environment): void {
    // Reset counters
    this.speciesCount = new Map();
    this.totalPopulation = animals.length;
    this.averageTraits = new Map();
    
    // Collect species data
    for (const animal of animals) {
      const species = animal.getSpecies();
      
      // Update species count
      const count = this.speciesCount.get(species) || 0;
      this.speciesCount.set(species, count + 1);
      
      // Collect trait data for averages
      if (!this.averageTraits.has(species)) {
        this.averageTraits.set(species, new Map());
      }
      
      const speciesTraits = this.averageTraits.get(species)!;
      const animalGenes = animal.getGenes();
      
      for (const [traitName, trait] of animalGenes.getTraits()) {
        const currentSum = speciesTraits.get(traitName) || 0;
        speciesTraits.set(traitName, currentSum + trait.value);
      }
    }
    
    // Calculate averages
    for (const [species, traits] of this.averageTraits) {
      const speciesCount = this.speciesCount.get(species) || 0;
      if (speciesCount > 0) {
        for (const [traitName, sum] of traits) {
          traits.set(traitName, sum / speciesCount);
        }
      }
    }
    
    // Update generation if there are no animals left
    if (animals.length === 0) {
      this.generation++;
    }
  }

  public getSpeciesCount(): Map<string, number> {
    return new Map(this.speciesCount);
  }

  public getTotalPopulation(): number {
    return this.totalPopulation;
  }

  public getAverageTraits(): Map<string, Map<TraitName, number>> {
    return new Map(this.averageTraits);
  }

  public recordBirth(): void {
    this.births++;
  }

  public recordDeath(): void {
    this.deaths++;
  }

  public getBirths(): number {
    return this.births;
  }

  public getDeaths(): number {
    return this.deaths;
  }

  public getGeneration(): number {
    return this.generation;
  }

  public reset(): void {
    this.speciesCount = new Map();
    this.totalPopulation = 0;
    this.averageTraits = new Map();
    this.births = 0;
    this.deaths = 0;
    this.generation = 1;
  }
}
