# Algorithm 1 Worker Pool Setup

1. Prepare shared spatial and crime data
2. Create a pool of worker threads with shared data

3. For each task to be evaluated:
    - Package task-specific parameters
    - Submit task to the worker pool

4. Wait for all workers to complete
5. Collect results from all tasks
6. Shut down the worker pool



# Algorithm 2 Bruteforce

1. Receive task with camera location, distance, and distance weight
2. Access shared data (buildings, bounding box, crimes, crime counts)

3. Generate camera coverage at the given location
4. Compute the camera score
5. Send result back to the parent process



# Algorithm 3 Hillclimb

1. Pick a random starting point from the grid
2. Generate initial camera coverage and compute score
3. Initialize visited points set and simulation sequence

4. While step count < MAXSTEPS - 1:
    - Define all possible movement directions
    - Evaluate all moves from current position in parallel
    - Filter out moves leading to buildings or previously visited points

    If no valid moves remain:
        - Stop simulation

    - Sort candidate moves by descending score

    - Pick the first move that:
        * increases score OR
        * keeps score equal but reduces distance traveled

    If no improving move found:
        - Stop simulation

    - Move to the selected point
    - Record the score for this step
    - Mark the point as visited
    - Increment step counter

5. Send full simulation sequence back to the parent process



# Algorithm 4 DFS

1. Select a random starting point from the grid
2. Generate camera coverage at starting point
3. Compute initial camera score

4. Initialize visited set
5. Initialize simulation sequence
6. Initialize best score with initial score

7. Mark starting point as visited
8. Add initial score to simulation sequence

9. Recursively explore neighboring grid points:

    - Stop if depth ≥ MAXSTEPS - 1
    - Stop if simulation length ≥ MAXSTEPS - 1

    - From current point, evaluate all movement directions
    - Discard invalid moves and already visited points

    - Sort remaining candidates by:
        * descending score
        * ascending total distance

    - For each candidate move (in sorted order):
        * Mark point as visited
        * Add score to simulation sequence
        * Update best score if improved
        * Recursively continue exploration

10. Add best score found to simulation sequence
11. Send simulation sequence to parent process

# 