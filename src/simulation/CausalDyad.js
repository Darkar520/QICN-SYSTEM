export class CausalDyad {
    constructor() {
        this.qubit1 = Math.random() > 0.5 ? 1 : 0;
        this.qubit2 = this.qubit1;
        this.entanglementStrength = 1.0;
    }

    updateEntanglement(ccc, pmia) {
        // Entanglement is stronger with high CCC and low PMIA (less uncertainty)
        this.entanglementStrength = (ccc * 0.8) + ((1 - Math.abs(pmia)) * 0.2);
    }

    measure() {
        // Simulate measurement
        const collapseProbability = Math.random();
        if (collapseProbability > this.entanglementStrength) {
            // Entanglement is broken, qubits become independent
            this.qubit1 = Math.random() > 0.5 ? 1 : 0;
            this.qubit2 = Math.random() > 0.5 ? 1 : 0;
        } else {
            // Qubits are entangled, their states are correlated
            this.qubit1 = Math.random() > 0.5 ? 1 : 0;
            this.qubit2 = this.qubit1;
        }
        return [this.qubit1, this.qubit2];
    }
}
