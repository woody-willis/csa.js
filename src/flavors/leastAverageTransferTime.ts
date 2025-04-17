import { Connection, Stop, Service } from '../types.js';

interface Label {
    transfers: number;
    arrivalTime: Date;
    totalWaitingTime: number; // NEW: sum of all ms waited at transfers
    connection: Connection | null;
    service: Service | null;
}

export class CSALeastAverageTransferTime {
    private labels: { [stopId: string]: Label } = {};
    private departureMap: Map<string, Connection[]> | null = null;

    constructor(
        private connections: Connection[],
        private stops: Stop[],
        private minimumTransferTime: number = 5 * 60 * 1000
    ) {
        // connections assumed sorted by departureTime
    }

    initialize(source: Stop, sourceTime: Date): void {
        for (const stop of this.stops) {
            this.labels[stop.id] = {
                transfers: Infinity,
                arrivalTime: new Date(32503593600000), // far‑future
                totalWaitingTime: 0,
                connection: null,
                service: null,
            };
        }
        this.labels[source.id] = {
            transfers: 0,
            arrivalTime: sourceTime,
            totalWaitingTime: 0,
            connection: null,
            service: null,
        };
    }

    async run(
        sourceStop: Stop,
        sourceTime: Date,
        targetStop: Stop
    ): Promise<Connection[]> {
        this.initialize(sourceStop, sourceTime);

        if (!this.departureMap) {
            this.departureMap = new Map();
            for (const conn of this.connections) {
                const depId =
                    typeof conn.departureStop === 'string'
                        ? conn.departureStop
                        : conn.departureStop.id;
                if (!this.departureMap.has(depId)) {
                    this.departureMap.set(depId, []);
                }
                this.departureMap.get(depId)!.push(conn);
            }
        }

        for (const conn of this.connections) {
            const depId =
                typeof conn.departureStop === 'string'
                    ? conn.departureStop
                    : conn.departureStop.id;
            const arrId =
                typeof conn.arrivalStop === 'string'
                    ? conn.arrivalStop
                    : conn.arrivalStop.id;

            const fromLabel = this.labels[depId];
            if (!fromLabel) continue;

            // Can we catch it?
            let earliest = fromLabel.arrivalTime.getTime();
            let isTransfer = false;
            if (
                fromLabel.service !== null &&
                fromLabel.service.id !==
                    (typeof conn.service === 'string'
                        ? conn.service
                        : conn.service.id)
            ) {
                earliest += this.minimumTransferTime;
                isTransfer = true;
            }
            if (conn.departureTime.getTime() < earliest) continue;

            // Compute new metrics
            const waitTime = isTransfer
                ? conn.departureTime.getTime() - fromLabel.arrivalTime.getTime()
                : 0;

            const newTransfers = fromLabel.transfers + (isTransfer ? 1 : 0);
            const newTotalWait = fromLabel.totalWaitingTime + waitTime;
            const newAvgWait =
                newTransfers > 0 ? newTotalWait / newTransfers : 0;

            const toLabel = this.labels[arrId];
            const oldAvgWait =
                toLabel.transfers > 0
                    ? toLabel.totalWaitingTime / toLabel.transfers
                    : 0;

            const better =
                // fewer transfers
                newTransfers < toLabel.transfers ||
                // same transfers, lower avg wait
                (newTransfers === toLabel.transfers &&
                    newAvgWait < oldAvgWait) ||
                // same transfers & avg wait, but earlier arrival
                (newTransfers === toLabel.transfers &&
                    newAvgWait === oldAvgWait &&
                    conn.arrivalTime.getTime() < toLabel.arrivalTime.getTime());

            if (better) {
                this.labels[arrId] = {
                    transfers: newTransfers,
                    arrivalTime: conn.arrivalTime,
                    totalWaitingTime: newTotalWait,
                    connection: conn,
                    service:
                        typeof conn.service === 'string'
                            ? { id: conn.service }
                            : conn.service,
                };
            }
        }

        const journey = this.extractJourney(targetStop);
        this.cleanUp();
        return journey;
    }

    private extractJourney(target: Stop): Connection[] {
        const trip: Connection[] = [];
        let cur = target.id;
        const seen = new Set<string>();

        while (
            this.labels[cur] &&
            this.labels[cur].connection !== null &&
            !seen.has(cur)
        ) {
            seen.add(cur);
            const lbl = this.labels[cur];
            trip.unshift(lbl.connection!);
            cur =
                typeof lbl.connection!.departureStop === 'string'
                    ? lbl.connection!.departureStop
                    : lbl.connection!.departureStop.id;
        }
        return trip;
    }

    private cleanUp() {
        this.labels = {};
        this.departureMap = null;
    }
}
