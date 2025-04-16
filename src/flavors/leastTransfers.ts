import { Connection, Stop, Service } from '../types.js';

interface Label {
    transfers: number;
    arrivalTime: Date;
    // the connection used to arrive at the stop
    connection: Connection | null;
    // the service taken on the last leg (null for the source)
    service: Service | null;
}

export class CSALeastTransfers {
    // For each stop, store the best label (least transfers, and then earliest arrival)
    private labels: { [stopId: string]: Label } = {};
    // Map departure stop id -> list of connections departing from that stop.
    private departureMap: Map<string, Connection[]> | null = null;

    constructor(
        /**
         * The connections that the algorithm will use.
         */
        private connections: Connection[],
        /**
         * The stops that the algorithm will use.
         */
        private stops: Stop[],
        /**
         * The minimum transfer time in milliseconds (applied when switching services).
         * @default 300000 // 5 minutes
         */
        private minimumTransferTime: number = 5 * 60 * 1000
    ) {
        // It is assumed that the connections are pre-sorted by departureTime.
    }

    /**
     * Initialize the labels for each stop.
     */
    initialize(source: Stop, sourceTime: Date): void {
        for (const stop of this.stops) {
            this.labels[stop.id] = {
                transfers: Infinity,
                // Use a far-future date as an initial value. (2999-12-31)
                arrivalTime: new Date(32503593600000),
                connection: null,
                service: null,
            };
        }
        // Set the source stop with zero transfers and the given source time.
        this.labels[source.id] = {
            transfers: 0,
            arrivalTime: sourceTime,
            connection: null,
            service: null,
        };
    }

    /**
     * Run the connection scan to compute a journey that minimizes the number of transfers.
     *
     * @param sourceStop The source stop.
     * @param sourceTime The time from which we may depart.
     * @param targetStop The target stop.
     */
    async run(
        sourceStop: Stop,
        sourceTime: Date,
        targetStop: Stop
    ): Promise<Connection[]> {
        this.initialize(sourceStop, sourceTime);

        // Build a map from departure stop id to its departing connections.
        if (!this.departureMap) {
            this.departureMap = new Map();
            for (const conn of this.connections) {
                const departureStopId: string =
                    typeof conn.departureStop === 'string'
                        ? conn.departureStop
                        : conn.departureStop.id;

                if (!this.departureMap.has(departureStopId)) {
                    this.departureMap.set(departureStopId, []);
                }
                this.departureMap.get(departureStopId)?.push(conn);
            }
        }

        // Process each connection in order of departure time.
        for (const connection of this.connections) {
            // Get stop IDs.
            const departureStopId: string =
                typeof connection.departureStop === 'string'
                    ? connection.departureStop
                    : connection.departureStop.id;
            const arrivalStopId: string =
                typeof connection.arrivalStop === 'string'
                    ? connection.arrivalStop
                    : connection.arrivalStop.id;

            const departureLabel = this.labels[departureStopId];
            if (!departureLabel) continue;

            // Determine the earliest time we can catch the connection.
            // If we are changing services (and not at the source), we add the minimum transfer time.
            let earliestDeparture = departureLabel.arrivalTime.getTime();
            let transferIncrement = 0;
            if (
                departureLabel.service !== null &&
                departureLabel.service.id !==
                    (typeof connection.service === 'string'
                        ? connection.service
                        : connection.service.id)
            ) {
                earliestDeparture += this.minimumTransferTime;
                transferIncrement = 1;
            }
            // If the connection departs before we can catch it, skip it.
            if (connection.departureTime.getTime() < earliestDeparture)
                continue;

            // Compute the new number of transfers.
            const newTransfers = departureLabel.transfers + transferIncrement;
            const arrivalTime = connection.arrivalTime;
            const arrivalLabel = this.labels[arrivalStopId];

            // Update the label if:
            // - The new path uses fewer transfers, or
            // - The new path uses the same number of transfers but arrives earlier.
            if (
                newTransfers < arrivalLabel.transfers ||
                (newTransfers === arrivalLabel.transfers &&
                    arrivalTime.getTime() < arrivalLabel.arrivalTime.getTime())
            ) {
                this.labels[arrivalStopId] = {
                    transfers: newTransfers,
                    arrivalTime: arrivalTime,
                    connection: connection,
                    service:
                        typeof connection.service === 'string'
                            ? { id: connection.service }
                            : connection.service,
                };
            }
        }

        // Reconstruct the journey from the labels.
        const journey = this.extractJourney(targetStop);

        this.cleanUp();

        return journey;
    }

    /**
     * Reconstructs the journey (list of connections) for the target stop.
     * The journey is built backwards from targetStop using stored connection pointers.
     */
    extractJourney(target: Stop): Connection[] {
        const journey: Connection[] = [];
        let currentStopId = target.id;
        const visited = new Set<string>();

        while (
            this.labels[currentStopId] &&
            this.labels[currentStopId].connection
        ) {
            if (visited.has(currentStopId)) break;
            visited.add(currentStopId);

            const currentLabel = this.labels[currentStopId];
            if (!currentLabel.connection) break;
            // Prepend the connection so the final journey is in chronological order.
            journey.unshift(currentLabel.connection);
            // Move to the departure stop of the connection.
            currentStopId =
                typeof currentLabel.connection.departureStop === 'string'
                    ? currentLabel.connection.departureStop
                    : currentLabel.connection.departureStop.id;
        }

        return journey;
    }

    /**
     * Clean up internal state.
     */
    cleanUp() {
        this.labels = {};
        this.departureMap = null;
    }
}
