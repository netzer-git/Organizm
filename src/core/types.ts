/**
 * Basic position in the 2D world
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Direction of movement
 */
export enum Direction {
  NORTH,
  NORTHEAST,
  EAST,
  SOUTHEAST,
  SOUTH,
  SOUTHWEST,
  WEST,
  NORTHWEST,
  NONE
}

/**
 * Basic traits that can be passed down through generations
 */
export interface Traits {
  speed: number;             // How fast the animal moves
  strength: number;          // Physical power, affects hunting/defense
  perception: number;        // Ability to detect resources and threats
  metabolism: number;        // Rate of energy consumption
  reproductiveUrge: number;  // Likelihood to seek reproduction
  lifespan: number;          // Maximum age the animal can reach
}

/**
 * Animal's current state
 */
export enum AnimalState {
  IDLE,
  SLEEPING,
  MOVING,
  EATING,
  MATING,
  DEAD
}

/**
 * Statistics for an animal
 */
export interface AnimalStats {
  generation: number;        // Which generation this animal belongs to
  children: number;          // Number of offspring produced
  foodEaten: number;         // Amount of food consumed
  distanceTraveled: number;  // Total distance moved
  timeAlive: number;         // Time survived in simulation units
}

/**
 * Weather conditions that affect the environment
 */
export enum Weather {
  SUNNY,
  RAINY,
  STORMY,
  DROUGHT,
  COLD,
  HOT
}

/**
 * Types of terrain in the environment
 */
export enum TerrainType {
  LAND,
  WATER,
  MOUNTAIN,
  DESERT,
  FOREST
}

/**
 * Resource types that animals can consume
 */
export enum ResourceType {
  PLANT,
  SMALL_ANIMAL,
  LARGE_ANIMAL,
  WATER
}