import { Application } from 'pixi.js';
import { Simulation, SimulationConfig } from './simulation/Simulation';
import { Weather } from './core/types';
import { Renderer, RendererOptions } from './ui/Renderer';
import { Herbivore } from './core/Herbivore';
import { Carnivore } from './core/Carnivore';
import { Animal } from './core/Animal';

// Set up the simulation configuration
const config: SimulationConfig = {
  environmentConfig: {
    width: 100,
    height: 100,
    initialWeather: Weather.SUNNY,
    weatherChangeInterval: 50
  },
  initialHerbivores: 10,
  initialPlants: 30,
  initialWaterSources: 5,
  initialCarnivores: 3
};

// Create the simulation
const simulation = new Simulation(config);

// Create PixiJS application for rendering
const app = new Application({
  width: window.innerWidth,
  height: window.innerHeight - 100, // Leave space for controls at bottom
  backgroundColor: 0x333333, // Dark gray background
  resolution: window.devicePixelRatio || 1,
  antialias: true,
});

// Create renderer options
const rendererOptions: RendererOptions = {
  showTrails: false,
  zoomLevel: 1.0
};

// Create the renderer
const renderer = new Renderer(app, rendererOptions);

// Store statistics history for charts
const populationHistory: { herbivores: number, carnivores: number }[] = [];
const populationHistoryMaxLength = 100;

// Keep track of average traits for displaying in UI
let averageHerbivoreTraits = { speed: 0, perception: 0 };
let averageCarnivoreTraits = { speed: 0, strength: 0 };

// Reference to selected animal for detail view
let selectedAnimal: Animal | null = null;

// Add the PixiJS canvas to the page
document.getElementById('simulation-container')?.appendChild(app.view as HTMLCanvasElement);

// Add listener for window resize
window.addEventListener('resize', () => {
  app.renderer.resize(
    window.innerWidth,
    window.innerHeight - 100
  );
});

// Set up the game loop
let lastTime = 0;
app.ticker.add((delta) => {
  const now = Date.now();
  const deltaTime = lastTime ? (now - lastTime) / 1000 : 0;
  lastTime = now;
  
  // Update simulation
  simulation.update(deltaTime);
  
  // Render the simulation state
  const state = simulation.getState();
  renderer.render(state.environment, state.animals, state.simulationTime);
  
  // Record population history for chart
  if (Math.floor(state.simulationTime) % 5 === 0) { // Every 5 time units
    recordPopulationHistory(state.statistics);
  }
  
  // Calculate average traits
  calculateAverageTraits(state.animals);
  
  // Update statistics display
  updateStats(state.statistics);
});

// Set renderer callback for animal selection
renderer.setAnimalSelectedCallback((animal) => {
  selectedAnimal = animal;
  updateSelectedAnimalUI();
});

/**
 * Record population history for charts
 */
function recordPopulationHistory(statistics: any): void {
  // Only add new entry if the time is different
  if (populationHistory.length === 0 || 
      populationHistory[populationHistory.length - 1].herbivores !== statistics.herbivoreCount ||
      populationHistory[populationHistory.length - 1].carnivores !== statistics.carnivoreCount) {
    
    populationHistory.push({
      herbivores: statistics.herbivoreCount,
      carnivores: statistics.carnivoreCount
    });
    
    // Limit history length
    if (populationHistory.length > populationHistoryMaxLength) {
      populationHistory.shift();
    }
    
    drawPopulationChart();
  }
}

/**
 * Draw the population history chart
 */
function drawPopulationChart(): void {
  const chartElement = document.getElementById('population-chart');
  if (!chartElement) return;
  
  const width = chartElement.clientWidth;
  const height = chartElement.clientHeight;
  
  // Clear previous chart
  while (chartElement.firstChild) {
    chartElement.removeChild(chartElement.firstChild);
  }
  
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  // Find max population for scaling
  let maxPopulation = 1;
  for (const point of populationHistory) {
    maxPopulation = Math.max(maxPopulation, point.herbivores, point.carnivores);
  }
  
  // Calculate points
  const herbivorePoints: string[] = [];
  const carnivorePoints: string[] = [];
  
  populationHistory.forEach((point, index) => {
    const x = (index / (populationHistory.length - 1)) * width;
    const herbivoreY = height - (point.herbivores / maxPopulation) * height;
    const carnivoreY = height - (point.carnivores / maxPopulation) * height;
    
    herbivorePoints.push(`${x},${herbivoreY}`);
    carnivorePoints.push(`${x},${carnivoreY}`);
  });
  
  // Create polylines
  if (herbivorePoints.length > 1) {
    const herbivorePolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    herbivorePolyline.setAttribute('points', herbivorePoints.join(' '));
    herbivorePolyline.setAttribute('fill', 'none');
    herbivorePolyline.setAttribute('stroke', '#4CAF50');
    herbivorePolyline.setAttribute('stroke-width', '2');
    svg.appendChild(herbivorePolyline);
  }
  
  if (carnivorePoints.length > 1) {
    const carnivorePolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    carnivorePolyline.setAttribute('points', carnivorePoints.join(' '));
    carnivorePolyline.setAttribute('fill', 'none');
    carnivorePolyline.setAttribute('stroke', '#f44336');
    carnivorePolyline.setAttribute('stroke-width', '2');
    svg.appendChild(carnivorePolyline);
  }
  
  chartElement.appendChild(svg);
}

/**
 * Calculate average traits for each species
 */
function calculateAverageTraits(animals: Animal[]): void {
  const herbivores = animals.filter(a => a instanceof Herbivore && !a.dead);
  const carnivores = animals.filter(a => a instanceof Carnivore && !a.dead);
  
  if (herbivores.length > 0) {
    const totalHerbivoreSpeed = herbivores.reduce((sum, h) => sum + h.traits.speed, 0);
    const totalHerbivorePerception = herbivores.reduce((sum, h) => sum + h.traits.perception, 0);
    
    averageHerbivoreTraits = {
      speed: parseFloat((totalHerbivoreSpeed / herbivores.length).toFixed(1)),
      perception: parseFloat((totalHerbivorePerception / herbivores.length).toFixed(1))
    };
  }
  
  if (carnivores.length > 0) {
    const totalCarnivoreSpeed = carnivores.reduce((sum, c) => sum + c.traits.speed, 0);
    const totalCarnivoreStrength = carnivores.reduce((sum, c) => sum + c.traits.strength, 0);
    
    averageCarnivoreTraits = {
      speed: parseFloat((totalCarnivoreSpeed / carnivores.length).toFixed(1)),
      strength: parseFloat((totalCarnivoreStrength / carnivores.length).toFixed(1))
    };
  }
}

/**
 * Update the statistics display
 */
function updateStats(statistics: any): void {
  // Update main stats
  document.getElementById('time')?.textContent = Math.floor(statistics.simulationTime).toString();
  document.getElementById('animals')?.textContent = statistics.totalAnimals.toString();
  document.getElementById('plants')?.textContent = statistics.plantsCount?.toString() || '0';
  document.getElementById('generation')?.textContent = statistics.averageGeneration.toFixed(1);
  document.getElementById('max-generation')?.textContent = statistics.highestGeneration.toString();
  document.getElementById('weather')?.textContent = Weather[simulation.getState().environment.weather];
  
  // Update species stats
  document.getElementById('herbivore-count')?.textContent = statistics.herbivoreCount.toString();
  document.getElementById('carnivore-count')?.textContent = statistics.carnivoreCount.toString();
  
  // Update population bars
  const totalAnimals = statistics.totalAnimals > 0 ? statistics.totalAnimals : 1;
  const herbivoreBar = document.querySelector('.herbivore-bar') as HTMLElement;
  const carnivoreBar = document.querySelector('.carnivore-bar') as HTMLElement;
  
  if (herbivoreBar) {
    herbivoreBar.style.width = `${(statistics.herbivoreCount / totalAnimals) * 100}%`;
  }
  
  if (carnivoreBar) {
    carnivoreBar.style.width = `${(statistics.carnivoreCount / totalAnimals) * 100}%`;
  }
  
  // Update average traits
  document.getElementById('herbivore-speed')?.textContent = averageHerbivoreTraits.speed.toString();
  document.getElementById('herbivore-perception')?.textContent = averageHerbivoreTraits.perception.toString();
  document.getElementById('carnivore-speed')?.textContent = averageCarnivoreTraits.speed.toString();
  document.getElementById('carnivore-strength')?.textContent = averageCarnivoreTraits.strength.toString();
  
  // Update environment info
  document.getElementById('environment-size')?.textContent = 
    `${simulation.getState().environment.width}×${simulation.getState().environment.height}`;
  document.getElementById('resource-count')?.textContent = 
    simulation.getState().environment.getResources().length.toString();
}

/**
 * Update the selected animal UI panel
 */
function updateSelectedAnimalUI(): void {
  const detailPanel = document.getElementById('selected-entity-info');
  if (!detailPanel) return;
  
  if (selectedAnimal) {
    // Show the panel
    detailPanel.style.display = 'block';
    
    // Determine animal type
    const animalType = selectedAnimal instanceof Herbivore ? 'Herbivore' : 
                      (selectedAnimal instanceof Carnivore ? 'Carnivore' : 'Animal');
    
    // Update fields
    document.getElementById('entity-type')!.textContent = animalType;
    document.getElementById('entity-age')!.textContent = selectedAnimal.age.toFixed(1);
    document.getElementById('entity-energy')!.textContent = selectedAnimal.energy.toFixed(1);
    document.getElementById('entity-health')!.textContent = selectedAnimal.health.toFixed(1);
    document.getElementById('entity-generation')!.textContent = selectedAnimal.stats.generation.toString();
    
    // Update trait values
    document.getElementById('entity-speed')!.textContent = selectedAnimal.traits.speed.toFixed(1);
    document.getElementById('entity-strength')!.textContent = selectedAnimal.traits.strength.toFixed(1);
    document.getElementById('entity-perception')!.textContent = selectedAnimal.traits.perception.toFixed(1);
    document.getElementById('entity-metabolism')!.textContent = selectedAnimal.traits.metabolism.toFixed(2);
    
    // Update trait bars
    const maxTraitValue = 10; // Assume a reasonable maximum
    (document.getElementById('entity-speed-bar') as HTMLElement).style.width = 
      `${(selectedAnimal.traits.speed / maxTraitValue) * 100}%`;
    (document.getElementById('entity-strength-bar') as HTMLElement).style.width = 
      `${(selectedAnimal.traits.strength / maxTraitValue) * 100}%`;
    (document.getElementById('entity-perception-bar') as HTMLElement).style.width = 
      `${(selectedAnimal.traits.perception / maxTraitValue) * 100}%`;
    (document.getElementById('entity-metabolism-bar') as HTMLElement).style.width = 
      `${(selectedAnimal.traits.metabolism / 1) * 100}%`; // Metabolism is usually 0-1
  } else {
    // Hide the panel
    detailPanel.style.display = 'none';
  }
}

/**
 * Set up UI controls
 */
function setupControls(): void {
  // Play/Pause button
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (simulation.getState().isRunning) {
        simulation.pause();
        playPauseBtn.textContent = 'Play';
      } else {
        simulation.start();
        playPauseBtn.textContent = 'Pause';
      }
    });
  }
  
  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Get values from sliders first
      const plantsValue = parseInt((document.getElementById('initial-plants') as HTMLInputElement).value);
      const herbivoresValue = parseInt((document.getElementById('initial-herbivores') as HTMLInputElement).value);
      const carnivoresValue = parseInt((document.getElementById('initial-carnivores') as HTMLInputElement).value);
      
      // Update config
      const newConfig = {
        ...config,
        initialPlants: plantsValue,
        initialHerbivores: herbivoresValue,
        initialCarnivores: carnivoresValue
      };
      
      // Reset simulation
      simulation.reset(newConfig);
      
      // Update button text and clear selection
      if (playPauseBtn) playPauseBtn.textContent = 'Pause';
      selectedAnimal = null;
      updateSelectedAnimalUI();
      
      // Clear population history
      populationHistory.length = 0;
      drawPopulationChart();
    });
  }
  
  // Speed slider
  const speedSlider = document.getElementById('speed') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value');
  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', () => {
      const value = parseFloat(speedSlider.value);
      simulation.setTimeScale(value);
      speedValue.textContent = `${value.toFixed(1)}x`;
    });
  }
  
  // Zoom slider
  const zoomSlider = document.getElementById('zoom') as HTMLInputElement;
  const zoomValue = document.getElementById('zoom-value');
  if (zoomSlider && zoomValue) {
    zoomSlider.addEventListener('input', () => {
      const value = parseFloat(zoomSlider.value);
      renderer.setOptions({ zoomLevel: value });
      zoomValue.textContent = `${value.toFixed(1)}x`;
    });
  }
  
  // Trail toggle
  const trailsCheckbox = document.getElementById('show-trails') as HTMLInputElement;
  if (trailsCheckbox) {
    trailsCheckbox.addEventListener('change', () => {
      renderer.setOptions({ showTrails: trailsCheckbox.checked });
    });
  }
  
  // Stats toggle
  const statsCheckbox = document.getElementById('show-stats') as HTMLInputElement;
  if (statsCheckbox) {
    statsCheckbox.addEventListener('change', () => {
      const statsElements = [
        document.getElementById('stats-panel'),
        document.getElementById('species-panel'),
        document.getElementById('charts-panel'),
        document.getElementById('environment-info')
      ];
      
      statsElements.forEach(el => {
        if (el) el.style.display = statsCheckbox.checked ? 'block' : 'none';
      });
    });
  }
  
  // Close button for animal details
  const closeDetailsBtn = document.getElementById('close-entity-details');
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', () => {
      selectedAnimal = null;
      updateSelectedAnimalUI();
      renderer.selectAnimal(null);
    });
  }
  
  // Initial plants slider
  const plantsSlider = document.getElementById('initial-plants') as HTMLInputElement;
  const plantsValueEl = document.getElementById('plants-value');
  if (plantsSlider && plantsValueEl) {
    plantsSlider.addEventListener('input', () => {
      plantsValueEl.textContent = plantsSlider.value;
    });
  }
  
  // Initial herbivores slider
  const herbivoresSlider = document.getElementById('initial-herbivores') as HTMLInputElement;
  const herbivoresValueEl = document.getElementById('herbivores-value');
  if (herbivoresSlider && herbivoresValueEl) {
    herbivoresSlider.addEventListener('input', () => {
      herbivoresValueEl.textContent = herbivoresSlider.value;
    });
  }
  
  // Initial carnivores slider
  const carnivoresSlider = document.getElementById('initial-carnivores') as HTMLInputElement;
  const carnivoresValueEl = document.getElementById('carnivores-value');
  if (carnivoresSlider && carnivoresValueEl) {
    carnivoresSlider.addEventListener('input', () => {
      carnivoresValueEl.textContent = carnivoresSlider.value;
    });
  }
}

// Call setup when document is ready
document.addEventListener('DOMContentLoaded', setupControls);

// Start the simulation
simulation.start();

console.log('Organizm simulation started!');