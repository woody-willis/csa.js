export enum Priority {
    /**
     * Find the route with the earliest arrival time.
     */
    EarliestArrival,
    /**
     * Find the route with the least number of transfers.
     */
    LeastTransfers,
    /**
     * Find the route with the least average time spent waiting for transfers.
     */
    LeastAverageTransferTime,
}

export type Stop = {
    /**
     * The arbitrary unique string referring to the stop. This value MUST be unique across all stops passed to an instance of CSA.
     */
    id: string;
    /**
     * The name of the stop.
     */
    name?: string;
};

export type Service = {
    /**
     * The arbitrary string referring to the service. This value MUST be unique across all services passed to an instance of CSA.
     */
    id: string;
};

export type Connection = {
    /**
     * The stop that the service departs from.
     */
    departureStop: Stop | string;
    /**
     * The time that the service departs from the departure stop.
     */
    departureTime: Date;
    /**
     * The stop that the service arrives at.
     */
    arrivalStop: Stop | string;
    /**
     * The time that the service arrives at the arrival stop.
     */
    arrivalTime: Date;
    /**
     * The service that the connection refers to.
     */
    service: Service | string;
};
