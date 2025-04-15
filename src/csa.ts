import { Connection, Priority, Stop } from './types.js';
import { CSAEarliestArrival } from './flavors/earliestArrival.js';

export class CSA {
    private csa: CSAEarliestArrival | null;

    constructor(
        /**
         * The connections that the CSA instance will use.
         */
        private connections: Connection[],
        /**
         * How the algorithm should prioritise finding a route. The default is to find the route with the earliest arrival time.
         * @default Priority.EarliestArrival
         */
        private priority: Priority = Priority.EarliestArrival,
        /**
         * Whether to sort the connections by departure time which is a requirement of the CSA algorithm. Only change this value if the connections are already sorted.
         * @default true
         */
        private sortConnections: boolean = true,
        /**
         * The predefined stops that the algorithm will use. When not set, this will be generated from the connections.
         * @default null
         */
        private stops: Stop[] | string[] | null
    ) {
        if (this.sortConnections) {
            // Sort by departure time ascending
            this.connections.sort(
                (a, b) => a.departureTime.getTime() - b.departureTime.getTime()
            );
        }

        // If any connections use strings for stops or services, convert them to objects
        this.connections.forEach((c) => {
            if (typeof c.departureStop === 'string') {
                c.departureStop = { id: c.departureStop };
            }
            if (typeof c.arrivalStop === 'string') {
                c.arrivalStop = { id: c.arrivalStop };
            }
            if (typeof c.service === 'string') {
                c.service = { id: c.service };
            }
        });

        if (!this.stops || typeof this.stops === 'string') {
            // Generate unique stops array from connections
            this.stops = Array.from(
                new Set(
                    this.connections.flatMap((c) => [
                        c.departureStop,
                        c.arrivalStop,
                    ])
                )
            ).map((s) => (typeof s === 'string' ? { id: s } : s));
        }

        switch (this.priority) {
            case Priority.EarliestArrival:
                this.csa = new CSAEarliestArrival(
                    this.connections,
                    this.stops as Stop[]
                );
                break;
            case Priority.LeastTransfers:
                throw new Error(
                    'LeastAverageTransferTime is not implemented yet'
                );
                break;
            case Priority.LeastAverageTransferTime:
                throw new Error(
                    'LeastAverageTransferTime is not implemented yet'
                );
                break;
            default:
                throw new Error('Invalid priority');
                break;
        }
    }

    /**
     * Run the search.
     * @param source The source stop.
     * @param sourceTime The time at which to start the search.
     * @param target The target stop.
     */
    async run(
        source: Stop,
        sourceTime: Date,
        target: Stop
    ): Promise<Connection[]> {
        if (!this.csa) {
            throw new Error('CSA instance not initialized');
        }

        return this.csa.run(source, sourceTime, target);
    }
}
