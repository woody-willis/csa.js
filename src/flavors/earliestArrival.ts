import { Connection, Stop, Service } from '../types.js';

export class CSAEarliestArrival {
    private S: { [key: string]: Date | number } = {};
    private J: {
        [key: string]: [
            Service | string | null,
            Connection | null,
            Connection | null,
        ];
    } = {};
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
         * The minimum transfer time in milliseconds.
         * @default 300000 // 5 minutes
         */
        private minimumTransferTime: number = 5 * 60 * 1000
    ) {}

    /**
     * Initialize the data structures needed for the algorithm.
     */
    initialize(source: Stop, sourceTime: Date): void {
        for (const stop of this.stops) {
            this.S[stop.id] = Infinity;
            this.J[stop.id] = [null, null, null];
        }

        this.S[source.id] = sourceTime;
    }

    /**
     * Run the search.
     * @param source The source stop.
     * @param sourceTime The time at which to start the search.
     * @param target The target stop.
     */
    async run(
        sourceStop: Stop,
        sourceTime: Date,
        targetStop: Stop
    ): Promise<Connection[]> {
        this.initialize(sourceStop, sourceTime);

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

        const finalized = new Set();

        // Binary search to find the first relevant connection (Starting Criterion)
        let left = 0;
        let right = this.connections.length - 1;
        let startIndex = 0;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (this.connections[mid].departureTime >= sourceTime) {
                startIndex = mid;
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        let earliestArrival = Infinity;

        for (let i = startIndex; i < this.connections.length; i++) {
            const connection = this.connections[i];
            const {
                departureStop,
                departureTime,
                arrivalStop,
                arrivalTime,
                service,
            } = connection;

            const departureStopId: string =
                typeof departureStop === 'string'
                    ? departureStop
                    : departureStop.id;
            const arrivalStopId: string =
                typeof arrivalStop === 'string' ? arrivalStop : arrivalStop.id;

            // Stopping Criterion: Abort if no further improvement is possible
            if (departureTime.getTime() > earliestArrival) break;

            // Skip connections that cannot improve the tentative arrival time
            if (this.S[departureStopId] > departureTime) continue;

            // Skip connections that have already been finalized
            if (finalized.has(arrivalStop)) continue;

            if (arrivalStop === targetStop) {
                earliestArrival = Math.min(
                    earliestArrival,
                    arrivalTime.getTime()
                );
                finalized.add(targetStop); // Don't need to revisit
            }

            // Check transfer time from the connection that got us to the departure stop
            const previousConnectionAtDeparture = this.J[departureStopId][1];
            if (
                previousConnectionAtDeparture &&
                previousConnectionAtDeparture.service !== connection.service
            ) {
                const transferEndTime = new Date(
                    previousConnectionAtDeparture.arrivalTime.getTime() +
                        this.minimumTransferTime
                ).getTime();
                if (transferEndTime > connection.departureTime.getTime()) {
                    continue;
                }
            }

            if (arrivalTime < this.S[arrivalStopId]) {
                this.S[arrivalStopId] = arrivalTime;
                this.J[arrivalStopId] = [
                    service,
                    connection,
                    this.J[departureStopId][1] || null,
                ];

                if (arrivalStopId === targetStop.id) {
                    earliestArrival = Math.min(
                        earliestArrival,
                        arrivalTime.getTime()
                    );
                }
            }

            for (const nextConnection of this.departureMap.get(arrivalStopId) ||
                []) {
                if (
                    service !== nextConnection.service &&
                    new Date(
                        arrivalTime.getTime() + this.minimumTransferTime
                    ).getTime() > nextConnection.departureTime.getTime()
                ) {
                    continue;
                }

                const nextConnectionArrivalStopId: string =
                    typeof nextConnection.arrivalStop === 'string'
                        ? nextConnection.arrivalStop
                        : nextConnection.arrivalStop.id;

                if (
                    nextConnection.arrivalTime <
                    this.S[nextConnectionArrivalStopId]
                ) {
                    this.S[nextConnectionArrivalStopId] =
                        nextConnection.arrivalTime;
                    this.J[nextConnectionArrivalStopId] = [
                        service,
                        nextConnection,
                        null,
                    ];
                }
            }
        }

        const journey = this.extractJourney(targetStop);

        this.cleanUp();

        return journey;
    }

    /**
     * Extract the journey from the results of the algorithm.
     * @param target The target stop.
     */
    extractJourney(target: Stop): Connection[] {
        let journey: Connection[] = [];
        let stop: string = target.id;

        const visited = new Set();

        while (this.J[stop] && this.J[stop][1] !== null) {
            if (visited.has(stop)) break;
            visited.add(stop);

            const [, connection] = this.J[stop];
            if (!connection) break;

            journey.unshift(connection);
            stop =
                typeof connection.departureStop === 'string'
                    ? connection.departureStop
                    : connection.departureStop.id;
        }

        return journey;
    }

    /**
     * Clean up the data structures.
     */
    cleanUp() {
        this.S = {};
        this.J = {};
    }
}
