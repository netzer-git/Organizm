# Organizm Agent Instructions
## Summary
This repository simulates a dynamic ecosystem filled with evolving species. The goal is to model the lives of various animals as they interact, adapt, and make intelligent decisions over generations.

## Development Guidelines
1. Technology Stack
You have the flexibility to choose the tech stack, but prioritize maintainability, performance, and ease of debugging.
Consider modularity in design to keep each component self-contained and independently testable. 
You should also consider how will you end up visualising the simulation.
2. Test-Driven Development (TDD)
Write unit tests alongside every new component.
Continuously test and refine your code before committing.
Ensure all changes pass tests before submission.
3. Code Quality and Debugging
Follow clean coding principles—simple, readable, and maintainable code.
Create well-structured, intuitive APIs with clear documentation.
Implement detailed logging at critical points for easy debugging.
If possible, stick you files no longer than 400 lines, as they will be easier to maintain.
4. Documentation and Updates
Keep documentation up to date. If broad changes are made, update README.md accordingly.
Provide clear examples for using your APIs and modules.

## Simulation Requirements
1. Visualization
The application must include a real-time visualization of the simulation.
The display should clearly represent moving entities and their interactions.
Creativity is encouraged, but clarity and usability take priority.
2. Animal Capabilities
Each animal should have, at a minimum, the ability to:
✔ Sleep – Maintain energy levels.
✔ Eat – Sustain itself using available resources.
✔ Move – Navigate the environment.
✔ Mate – Reproduce and pass on traits.

Animals should evolve across generations, adapting behaviors and traits based on environmental conditions.

## Additional Considerations
Ensure modularity so that individual animal behaviors, environmental conditions, and evolution mechanics can be easily extended or modified.
Consider AI-based decision-making for animals to introduce emergent behaviors.
Implement environmental factors (e.g., weather, terrain, resource availability) that influence evolution and behavior.