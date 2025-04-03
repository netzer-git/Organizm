import { UUID } from '../utils/UUID';

export type Trait = {
  value: number;
  mutationRate: number;
  min: number;
  max: number;
};

export type TraitName = 
  | 'speed' 
  | 'strength' 
  | 'senseRange' 
  | 'metabolismEfficiency' 
  | 'baseMetabolism' 
  | 'energyRecoveryRate' 
  | 'reproductionRate'
  | 'size'
  | 'lifespan'
  | 'intelligence';

export class Genes {
  private id: string;
  private traits: Map<TraitName, Trait>;

  constructor(traits?: Map<TraitName, Trait>) {
    this.id = UUID.generate();
    
    if (traits) {
      this.traits = new Map(traits);
    } else {
      // Initialize default traits
      this.traits = new Map<TraitName, Trait>();
      this.initializeDefaultTraits();
    }
  }

  private initializeDefaultTraits(): void {
    this.traits.set('speed', { value: 1.0, mutationRate: 0.1, min: 0.5, max: 2.0 });
    this.traits.set('strength', { value: 1.0, mutationRate: 0.1, min: 0.5, max: 2.0 });
    this.traits.set('senseRange', { value: 10.0, mutationRate: 0.1, min: 5.0, max: 20.0 });
    this.traits.set('metabolismEfficiency', { value: 1.0, mutationRate: 0.1, min: 0.5, max: 1.5 });
    this.traits.set('baseMetabolism', { value: 0.5, mutationRate: 0.05, min: 0.2, max: 1.0 });
    this.traits.set('energyRecoveryRate', { value: 1.0, mutationRate: 0.1, min: 0.5, max: 2.0 });
    this.traits.set('reproductionRate', { value: 10.0, mutationRate: 0.1, min: 5.0, max: 20.0 });
    this.traits.set('size', { value: 1.0, mutationRate: 0.1, min: 0.5, max: 2.0 });
    this.traits.set('lifespan', { value: 100.0, mutationRate: 0.1, min: 50.0, max: 200.0 });
    this.traits.set('intelligence', { value: 1.0, mutationRate: 0.1, min: 0.5, max: 2.0 });
  }

  public getId(): string {
    return this.id;
  }

  public getTraitValue(traitName: TraitName): number {
    const trait = this.traits.get(traitName);
    if (!trait) {
      throw new Error(`Trait '${traitName}' not found`);
    }
    return trait.value;
  }

  public getTraits(): Map<TraitName, Trait> {
    return new Map(this.traits);
  }

  public static combine(parent1: Genes, parent2: Genes): Genes {
    const combinedTraits = new Map<TraitName, Trait>();
    
    // Combine traits from both parents and apply random mutations
    for (const [traitName, trait1] of parent1.getTraits()) {
      const trait2 = parent2.getTraits().get(traitName);
      
      if (trait2) {
        // Randomly choose which parent's trait to inherit as base
        const baseTrait = Math.random() < 0.5 ? trait1 : trait2;
        
        // Create a new trait with potential mutations
        const newValue = this.mutate(
          baseTrait.value,
          baseTrait.mutationRate,
          baseTrait.min,
          baseTrait.max
        );
        
        combinedTraits.set(traitName, {
          value: newValue,
          mutationRate: baseTrait.mutationRate,
          min: baseTrait.min,
          max: baseTrait.max
        });
      }
    }
    
    return new Genes(combinedTraits);
  }

  private static mutate(value: number, mutationRate: number, min: number, max: number): number {
    // Determine if mutation occurs
    if (Math.random() < mutationRate) {
      // Apply random mutation, more likely to be small than large
      const mutationFactor = (Math.random() - 0.5) * 0.2; // -10% to +10% change
      const newValue = value * (1 + mutationFactor);
      
      // Clamp to allowed range
      return Math.max(min, Math.min(max, newValue));
    }
    
    return value;
  }
}
