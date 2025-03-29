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
  backgroundColor: 0x111111, // Very dark background for better visibility
  resolution: window.devicePixelRatio || 1,
  antialias: true,
});

// Create renderer options
const rendererOptions: RendererOptions = {
  showTrails: false,
  zoomLevel: 1.0,
  highlightHover: true,
  showMinimap: true
};

// Create the renderer
const renderer = new Renderer(app, rendererOptions);

// Store statistics history for charts
const populationHistory: { herbivores: number, carnivores: number, plants: number }[] = [];
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
  renderer.setOptions({ zoomLevel: renderer.getZoomLevel() }); // Force recenter
});

// Set up the game loop
let lastTime = 0;
let timeElapsed = 0;
let statsUpdateInterval = 5; // Update stats every 5 time units
app.ticker.add((delta) => {
  const now = Date.now();
  const deltaTime = lastTime ? (now - lastTime) / 1000 : 0;
  lastTime = now;
  
  // Update simulation
  simulation.update(deltaTime);
  
  // Render the simulation state
  const state = simulation.getState();
  renderer.render(state.environment, state.animals, state.simulationTime);
  
  // Record population history for chart every N time units
  timeElapsed += deltaTime;
  if (timeElapsed >= statsUpdateInterval) {
    timeElapsed = 0;
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
  
  // If we were following an animal and deselected it, stop following
  if (!animal) {
    renderer.stopFollowingAnimal();
  }
});

/**
 * Record population history for charts
 */
function recordPopulationHistory(statistics: any): void {
  // Only add new entry if the values are different
  if (populationHistory.length === 0 || 
      populationHistory[populationHistory.length - 1].herbivores !== statistics.herbivoreCount ||
      populationHistory[populationHistory.length - 1].carnivores !== statistics.carnivoreCount ||
      populationHistory[populationHistory.length - 1].plants !== statistics.plantsCount) {
    
    populationHistory.push({
      herbivores: statistics.herbivoreCount,
      carnivores: statistics.carnivoreCount,
      plants: statistics.plantsCount
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
    maxPopulation = Math.max(maxPopulation, point.herbivores, point.carnivores, point.plants);
  }
  
  // Calculate points
  const herbivorePoints: string[] = [];
  const carnivorePoints: string[] = [];
  const plantPoints: string[] = [];
  
  populationHistory.forEach((point, index) => {
    const x = (index / Math.max(1, populationHistory.length - 1)) * width;
    const herbivoreY = height - (point.herbivores / maxPopulation) * height;
    const carnivoreY = height - (point.carnivores / maxPopulation) * height;
    const plantY = height - (point.plants / maxPopulation) * height;
    
    herbivorePoints.push(`${x},${herbivoreY}`);
    carnivorePoints.push(`${x},${carnivoreY}`);
    plantPoints.push(`${x},${plantY}`);
  });
  
  // Add grid lines for better readability
  for (let i = 0; i <= 4; i++) {
    const y = height * (i / 4);
    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridLine.setAttribute('x1', '0');
    gridLine.setAttribute('y1', y.toString());
    gridLine.setAttribute('x2', width.toString());
    gridLine.setAttribute('y2', y.toString());
    gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
    gridLine.setAttribute('stroke-dasharray', '3,3');
    svg.appendChild(gridLine);
    
    // Add label if not the top line
    if (i < 4) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '5');
      label.setAttribute('y', (y - 5).toString());
      label.setAttribute('fill', 'rgba(255,255,255,0.5)');
      label.setAttribute('font-size', '8px');
      label.textContent = Math.floor(maxPopulation * (1 - i/4)).toString();
      svg.appendChild(label);
    }
  }
  
  // Create plant polyline (drawn first so it's in background)
  if (plantPoints.length > 1) {
    const plantPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    plantPolyline.setAttribute('points', plantPoints.join(' '));
    plantPolyline.setAttribute('fill', 'none');
    plantPolyline.setAttribute('stroke', '#32CD32');
    plantPolyline.setAttribute('stroke-width', '1');
    plantPolyline.setAttribute('stroke-dasharray', '2,2');
    plantPolyline.setAttribute('stroke-opacity', '0.6');
    svg.appendChild(plantPolyline);
  }
  
  // Create carnivore polyline
  if (carnivorePoints.length > 1) {
    const carnivorePolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    carnivorePolyline.setAttribute('points', carnivorePoints.join(' '));
    carnivorePolyline.setAttribute('fill', 'none');
    carnivorePolyline.setAttribute('stroke', '#f44336');
    carnivorePolyline.setAttribute('stroke-width', '2');
    svg.appendChild(carnivorePolyline);
    
    // Add dots for each data point
    carnivorePoints.forEach((point, index) => {
      const [x, y] = point.split(',').map(Number);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x.toString());
      dot.setAttribute('cy', y.toString());
      dot.setAttribute('r', '2');
      dot.setAttribute('fill', '#f44336');
      svg.appendChild(dot);
    });
  }
  
  // Create herbivore polyline
  if (herbivorePoints.length > 1) {
    const herbivorePolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    herbivorePolyline.setAttribute('points', herbivorePoints.join(' '));
    herbivorePolyline.setAttribute('fill', 'none');
    herbivorePolyline.setAttribute('stroke', '#4CAF50');
    herbivorePolyline.setAttribute('stroke-width', '2');
    svg.appendChild(herbivorePolyline);
    
    // Add dots for each data point
    herbivorePoints.forEach((point, index) => {
      const [x, y] = point.split(',').map(Number);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x.toString());
      dot.setAttribute('cy', y.toString());
      dot.setAttribute('r', '2');
      dot.setAttribute('fill', '#4CAF50');
      svg.appendChild(dot);
    });
  }
  
  // Add chart legend
  const legendY = height - 15;
  
  // Herbivore legend
  const legendHerbDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  legendHerbDot.setAttribute('cx', '10');
  legendHerbDot.setAttribute('cy', legendY.toString());
  legendHerbDot.setAttribute('r', '3');
  legendHerbDot.setAttribute('fill', '#4CAF50');
  svg.appendChild(legendHerbDot);
  
  const legendHerbText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  legendHerbText.setAttribute('x', '15');
  legendHerbText.setAttribute('y', (legendY + 3).toString());
  legendHerbText.setAttribute('fill', '#FFFFFF');
  legendHerbText.setAttribute('font-size', '8px');
  legendHerbText.textContent = 'Herb';
  svg.appendChild(legendHerbText);
  
  // Carnivore legend
  const legendCarnDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  legendCarnDot.setAttribute('cx', '45');
  legendCarnDot.setAttribute('cy', legendY.toString());
  legendCarnDot.setAttribute('r', '3');
  legendCarnDot.setAttribute('fill', '#f44336');
  svg.appendChild(legendCarnDot);
  
  const legendCarnText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  legendCarnText.setAttribute('x', '50');
  legendCarnText.setAttribute('y', (legendY + 3).toString());
  legendCarnText.setAttribute('fill', '#FFFFFF');
  legendCarnText.setAttribute('font-size', '8px');
  legendCarnText.textContent = 'Carn';
  svg.appendChild(legendCarnText);
  
  // Plants legend
  const legendPlantLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  legendPlantLine.setAttribute('x1', '75');
  legendPlantLine.setAttribute('y1', legendY.toString());
  legendPlantLine.setAttribute('x2', '85');
  legendPlantLine.setAttribute('y2', legendY.toString());
  legendPlantLine.setAttribute('stroke', '#32CD32');
  legendPlantLine.setAttribute('stroke-dasharray', '2,2');
  svg.appendChild(legendPlantLine);
  
  const legendPlantText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  legendPlantText.setAttribute('x', '90');
  legendPlantText.setAttribute('y', (legendY + 3).toString());
  legendPlantText.setAttribute('fill', '#FFFFFF');
  legendPlantText.setAttribute('font-size', '8px');
  legendPlantText.textContent = 'Plants';
  svg.appendChild(legendPlantText);
  
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
      
    // Update follow button
    const followButton = document.getElementById('follow-animal');
    if (followButton) {
      const isFollowing = renderer.isFollowingAnimal(selectedAnimal);
      followButton.textContent = isFollowing ? 'Unfollow' : 'Follow';
    }
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
      
      // Stop following any animal
      renderer.stopFollowingAnimal();
    });
  }
  
  // Recenter view button
  const recenterBtn = document.getElementById('recenter-btn');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      // Reset the view to center
      renderer.setOptions({ zoomLevel: renderer.getZoomLevel() }); // This will trigger a recenter
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
  
  // Legend toggle
  const legendToggle = document.getElementById('show-legend') as HTMLInputElement;
  const legend = document.getElementById('legend');
  if (legendToggle && legend) {
    legendToggle.addEventListener('change', () => {
      legend.style.display = legendToggle.checked ? 'block' : 'none';
    });
  }
  
  // Minimap toggle
  const minimapToggle = document.getElementById('show-minimap') as HTMLInputElement;
  if (minimapToggle) {
    minimapToggle.addEventListener('change', () => {
      renderer.setOptions({ showMinimap: minimapToggle.checked });
    });
  }
  
  // Close button for animal details
  const closeDetailsBtns = document.querySelectorAll('#close-entity-details, #close-entity-details-btn');
  closeDetailsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAnimal = null;
      updateSelectedAnimalUI();
      renderer.selectAnimal(null);
    });
  });
  
  // Follow animal button
  const followAnimalBtn = document.getElementById('follow-animal');
  if (followAnimalBtn) {
    followAnimalBtn.addEventListener('click', () => {
      if (!selectedAnimal) return;
      
      if (renderer.isFollowingAnimal(selectedAnimal)) {
        renderer.stopFollowingAnimal();
        followAnimalBtn.textContent = 'Follow';
      } else {
        renderer.followAnimal(selectedAnimal);
        followAnimalBtn.textContent = 'Unfollow';
      }
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
  
  // Help button
  const helpBtn = document.getElementById('help-btn');
  const helpPanel = document.getElementById('help-panel');
  if (helpBtn && helpPanel) {
    helpBtn.addEventListener('click', () => {
      helpPanel.style.display = helpPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close help panel button
    const closeHelp = document.getElementById('close-help');
    if (closeHelp) {
      closeHelp.addEventListener('click', () => {
        helpPanel.style.display = 'none';
      });
    }
  }
}

// Call setup when document is ready
document.addEventListener('DOMContentLoaded', setupControls);

// Start the simulation
simulation.start();

console.log('Organizm simulation started!');