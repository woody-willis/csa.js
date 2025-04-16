import { Connection, Priority, Stop } from './types.js';
import { CSAEarliestArrival } from './flavors/earliestArrival.js';
import { CSALeastTransfers } from './flavors/leastTransfers.js';

export { CSAEarliestArrival, CSALeastTransfers };

interface CSAParams {
    /**
     * The connections that the CSA instance will use.
     */
    connections: Connection[];
    /**
     * How the algorithm should prioritise finding a route. The default is to find the route with the earliest arrival time.
     * @default Priority.EarliestArrival
     */
    priority?: Priority;
    /**
     * The minimum transfer time in milliseconds (applied when switching services).
     * @default 300000 // 5 minutes
     */
    minimumTransferTime?: number;
    /**
     * Whether to sort the connections by departure time which is a requirement of the CSA algorithm. Only change this value if the connections are already sorted.
     * @default true
     */
    sortConnections?: boolean;
    /**
     * The predefined stops that the algorithm will use. When not set, this will be generated from the connections.
     * @default null
     */
    stops?: Stop[] | string[] | null;
}

export class CSA {
    public instance: CSAEarliestArrival | CSALeastTransfers | null;

    public connections: Connection[];
    public priority: Priority = Priority.EarliestArrival;
    public minimumTransferTime: number = 5 * 60 * 1000; // 5 minutes
    private sortConnections: boolean = true;
    public stops: Stop[] | string[] | null = null;

    constructor(options: CSAParams) {
        if (!options.connections) throw new Error('No connections provided');

        this.connections = options.connections;
        this.priority = options.priority ?? Priority.EarliestArrival;
        this.minimumTransferTime =
            options.minimumTransferTime ?? this.minimumTransferTime;
        this.sortConnections = options.sortConnections ?? true;
        this.stops = options.stops ?? null;

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

        if (!this.stops) {
            // Generate unique stops array from connections
            this.stops = Array.from(
                new Set(
                    this.connections.flatMap((c) => [
                        typeof c.departureStop === 'string'
                            ? c.departureStop
                            : c.departureStop.id,
                        typeof c.arrivalStop === 'string'
                            ? c.arrivalStop
                            : c.arrivalStop.id,
                    ])
                )
            ).map((s) => (typeof s === 'string' ? { id: s } : s));
        }

        switch (this.priority) {
            case Priority.EarliestArrival:
                this.instance = new CSAEarliestArrival(
                    this.connections,
                    this.stops as Stop[],
                    this.minimumTransferTime
                );
                break;
            case Priority.LeastTransfers:
                this.instance = new CSALeastTransfers(
                    this.connections,
                    this.stops as Stop[],
                    this.minimumTransferTime
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
        if (!this.instance) {
            throw new Error('CSA instance not initialized');
        }

        return this.instance.run(source, sourceTime, target);
    }
}
