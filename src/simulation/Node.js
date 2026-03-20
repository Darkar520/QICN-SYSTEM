import { QICNConfig } from '../../services/config.js';

class Node {
    constructor(id) {
        this.id = id;
        this.energy = Math.random();
        this.coherenceState = Math.random();
        this.phase = Math.random() * 2 * Math.PI;
        this.intensity = Math.random();
        this.learningRate = QICNConfig.BASE_LEARNING_RATE;
        this.connections = []; // { targetId, weight }
        this.retroInductionFlux = 0;
        // Positional data for visualization (default, updated later)
        this.x = 0;
        this.y = 0;
        this.z = 0; // NEW: Z-coordinate for 3D
        // Velocity for force simulation (NEW)
        this.vx = 0;
        this.vy = 0;
        this.vz = 0; // NEW: Z-velocity
    }
    updateStateWithRetroInduction(futureStates, weights) {
        const retroInfluence = futureStates.reduce((acc, fs, i) => acc + fs * weights[i], 0);
        this.retroInductionFlux = (retroInfluence / weights.length) * QICNConfig.RETRO_FLUX_WEIGHT;
        this.energy = Math.max(0, Math.min(1, this.energy + this.retroInductionFlux));
        this.coherenceState = Math.max(0, Math.min(1, this.coherenceState + this.retroInductionFlux * 0.1));
        this.phase = (this.phase + this.energy * 0.1 + Math.random() * 0.01) % (2 * Math.PI);
    }
    introspectiveUpdate(ccc, stabilityBias) {
        const decay = QICNConfig.PLASTICITY_DECAY + (ccc * 0.001); // CCC stabilizes plasticity
        this.learningRate *= decay;
    }
}

export default Node;