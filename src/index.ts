import { Application } from 'pixi.js';
import { Simulation, SimulationConfig } from './simulation/Simulation';
import { Weather } from './core/types';
import { Renderer } from './ui/Renderer';

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
  initialWaterSources: 5
};

// Create the simulation
const simulation = new Simulation(config);

// Create PixiJS application for rendering
const app = new Application({
  width: 800,
  height: 600,
  backgroundColor: 0x333333, // Dark gray background
  resolution: window.devicePixelRatio || 1,
});

// Create the renderer
const renderer = new Renderer(app);

// Add the PixiJS canvas to the page
document.body.appendChild(app.view as HTMLCanvasElement);

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
  
  // Update statistics display
  updateStats(state.statistics);
});

// Update the statistics display
function updateStats(statistics: any) {
  document.getElementById('time').textContent = Math.floor(statistics.simulationTime).toString();
  document.getElementById('animals').textContent = statistics.totalAnimals.toString();
  document.getElementById('plants').textContent = statistics.plantsCount?.toString() || '0';
  document.getElementById('generation').textContent = statistics.averageGeneration.toFixed(1);
  document.getElementById('weather').textContent = Weather[simulation.getState().environment.weather];
}

// Add controls for user interaction
function setupControls() {
  // Start/Pause button
  const playPauseButton = document.createElement('button');
  playPauseButton.textContent = 'Pause';
  playPauseButton.style.position = 'absolute';
  playPauseButton.style.top = '10px';
  playPauseButton.style.left = '10px';
  
  playPauseButton.addEventListener('click', () => {
    if (simulation.getState().isRunning) {
      simulation.pause();
      playPauseButton.textContent = 'Play';
    } else {
      simulation.start();
      playPauseButton.textContent = 'Pause';
    }
  });
  
  document.body.appendChild(playPauseButton);
  
  // Reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset';
  resetButton.style.position = 'absolute';
  resetButton.style.top = '10px';
  resetButton.style.left = '80px';
  
  resetButton.addEventListener('click', () => {
    simulation.reset(config);
    playPauseButton.textContent = 'Play';
  });
  
  document.body.appendChild(resetButton);
  
  // Speed slider
  const speedSlider = document.getElementById('speed') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value');
  
  speedSlider.addEventListener('input', () => {
    const value = parseFloat(speedSlider.value);
    simulation.setTimeScale(value);
    speedValue.textContent = `${value.toFixed(1)}x`;
  });
}

// Call setup when document is ready
document.addEventListener('DOMContentLoaded', setupControls);

// Start the simulation
simulation.start();

console.log('Organizm simulation started!');