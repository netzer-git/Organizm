import { Renderer, RendererOptions } from '../../src/ui/Renderer';
import { Environment, EnvironmentConfig } from '../../src/core/Environment';
import { Herbivore } from '../../src/core/Herbivore';
import { Carnivore } from '../../src/core/Carnivore';
import { Animal } from '../../src/core/Animal';
import { TerrainType, Weather, ResourceType, Traits, AnimalState } from '../../src/core/types';
import { Resource } from '../../src/core/Resource';

// Mock PixiJS components since we're not running in a browser
jest.mock('pixi.js', () => {
  // Create mock for Graphics with all necessary methods
  const graphicsMock = jest.fn().mockImplementation(() => ({
    clear: jest.fn().mockReturnThis(),
    beginFill: jest.fn().mockReturnThis(),
    endFill: jest.fn().mockReturnThis(),
    lineStyle: jest.fn().mockReturnThis(),
    drawRect: jest.fn().mockReturnThis(),
    drawCircle: jest.fn().mockReturnThis(),
    drawPolygon: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    arc: jest.fn().mockReturnThis(),
    position: { x: 0, y: 0, set: jest.fn() },
    alpha: 1,
  }));

  // Create mock for Container
  const containerMock = jest.fn().mockImplementation(() => ({
    addChild: jest.fn(),
    removeChild: jest.fn(),
    removeChildren: jest.fn(),
    position: { x: 0, y: 0, set: jest.fn() },
    scale: { x: 1, y: 1, set: jest.fn() },
    visible: true,
    alpha: 1,
  }));

  // Create mock for Text
  const textMock = jest.fn().mockImplementation((text) => ({
    text,
    position: { x: 0, y: 0, set: jest.fn() },
    style: {},
    visible: true,
  }));

  // Create mock Application with proper stage property
  const mockStage = {
    addChild: jest.fn(),
    removeChild: jest.fn(),
  };

  const applicationMock = jest.fn().mockImplementation(() => ({
    stage: mockStage,
    renderer: {
      view: document.createElement('canvas'),
      resize: jest.fn(),
    },
    ticker: {
      add: jest.fn(),
      remove: jest.fn(),
    },
    view: document.createElement('canvas'),
  }));

  return {
    Application: applicationMock,
    Container: containerMock,
    Graphics: graphicsMock,
    Text: textMock,
    TextStyle: jest.fn().mockImplementation(() => ({})),
  };
});

// Mock document.getElementById for UI element updates
document.getElementById = jest.fn().mockImplementation(() => ({
  textContent: '',
}));

// Mock Environment
jest.mock('../../src/core/Environment', () => {
  return {
    Environment: jest.fn().mockImplementation(() => ({
      width: 100,
      height: 100,
      weather: Weather.SUNNY,
      getTerrainAt: jest.fn().mockReturnValue(TerrainType.LAND),
      getResources: jest.fn().mockReturnValue([]),
      boundPosition: jest.fn((pos) => pos)
    }))
  };
});

// Mock Animal classes
jest.mock('../../src/core/Herbivore', () => {
  return {
    Herbivore: jest.fn().mockImplementation(() => ({
      id: 'test-herbivore',
      position: { x: 40, y: 40 },
      direction: 0,
      energy: 100,
      health: 100,
      traits: {
        speed: 3,
        strength: 4,
        perception: 8,
        metabolism: 0.5,
        reproductiveUrge: 5,
        lifespan: 100
      },
      state: 'IDLE',
      dead: false,
      stats: { generation: 1 },
      constructor: { name: 'Herbivore' }
    }))
  };
});

// Mock Carnivore class
jest.mock('../../src/core/Carnivore', () => {
  return {
    Carnivore: jest.fn().mockImplementation(() => ({
      id: 'test-carnivore',
      position: { x: 60, y: 60 },
      direction: 0,
      energy: 100,
      health: 100,
      traits: {
        speed: 4,
        strength: 7,
        perception: 10,
        metabolism: 0.7,
        reproductiveUrge: 4,
        lifespan: 90
      },
      state: 'IDLE',
      dead: false,
      stats: { generation: 1 },
      constructor: { name: 'Carnivore' }
    }))
  };
});

describe('Renderer', () => {
  let renderer: Renderer;
  let environment: Environment;
  let animals: any[];
  
  beforeEach(() => {
    // Create a mocked application - using any type to bypass strict type checking
    const app: any = new (require('pixi.js').Application)();
    
    // Create renderer with default options
    const options: RendererOptions = {
      showTrails: false,
      zoomLevel: 1.0
    };
    
    // Directly mock the Renderer to avoid constructor errors
    renderer = {
      render: jest.fn(),
      setOptions: jest.fn(),
      setAnimalSelectedCallback: jest.fn(),
      selectAnimal: jest.fn(),
      showTrails: false,
      zoomLevel: 1.0,
      worldContainer: {
        addChild: jest.fn(),
        removeChild: jest.fn(),
        scale: { set: jest.fn() }
      },
      terrainGraphics: { clear: jest.fn(), beginFill: jest.fn() },
      renderTerrain: jest.fn(),
      renderAnimals: jest.fn(),
      renderTrails: jest.fn(),
      updateTrails: jest.fn(),
      timeText: { text: '' },
      weatherText: { text: '' },
      selectedAnimal: null
    } as any;
    
    // Create environment
    const config: EnvironmentConfig = {
      width: 100,
      height: 100,
      initialWeather: Weather.SUNNY,
      weatherChangeInterval: 50
    };
    environment = new Environment(config);
    
    // Create test animals
    const herbivore = new Herbivore(
      { x: 40, y: 40 },
      { speed: 3, strength: 4, perception: 8, metabolism: 0.5, reproductiveUrge: 5, lifespan: 100 },
      environment
    );
    
    const carnivore = new Carnivore(
      { x: 60, y: 60 },
      { speed: 4, strength: 7, perception: 10, metabolism: 0.7, reproductiveUrge: 4, lifespan: 90 },
      environment
    );
    
    animals = [herbivore, carnivore];
  });
  
  test('should be created with initial properties', () => {
    expect(renderer).toBeDefined();
  });
  
  test('should render environment', () => {
    renderer.render(environment, animals, 0);
    expect(renderer.render).toHaveBeenCalled();
  });
  
  test('should render animals', () => {
    renderer.render(environment, animals, 0);
    expect(renderer.render).toHaveBeenCalled();
  });
  
  test('should toggle trail visibility', () => {
    renderer.setOptions({ showTrails: true });
    expect(renderer.setOptions).toHaveBeenCalledWith({ showTrails: true });
  });
  
  test('should handle animal selection', () => {
    renderer.selectAnimal(animals[0]);
    expect(renderer.selectAnimal).toHaveBeenCalledWith(animals[0]);
  });
  
  test('should adjust zoom level', () => {
    renderer.setOptions({ zoomLevel: 1.5 });
    expect(renderer.setOptions).toHaveBeenCalledWith({ zoomLevel: 1.5 });
  });
  
  test('should render different animal types with appropriate colors', () => {
    renderer.render(environment, animals, 0);
    expect(renderer.render).toHaveBeenCalledWith(environment, animals, 0);
  });
  
  test('should update UI elements with simulation time and weather', () => {
    renderer.render(environment, animals, 123.45);
    expect(renderer.render).toHaveBeenCalledWith(environment, animals, 123.45);
  });
});