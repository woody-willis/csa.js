import { describe, expect, test } from '@jest/globals';
import {
    CSA,
    Priority,
    CSAEarliestArrival,
    CSALeastTransfers,
    Connection,
    Stop,
} from '../src/index.js';

function createCSAInstance(sortConnections: boolean = true): CSA {
    // Create a CSA instance with some unsorted dummy data
    const connections: Connection[] = [
        {
            departureStop: 'B',
            departureTime: new Date(20 * 60 * 1000),
            arrivalStop: 'C',
            arrivalTime: new Date(30 * 60 * 1000),
            service: '1',
        },
        {
            departureStop: 'A',
            departureTime: new Date(0 * 60 * 1000),
            arrivalStop: 'B',
            arrivalTime: new Date(10 * 60 * 1000),
            service: '1',
        },
        {
            departureStop: 'A',
            departureTime: new Date(0 * 60 * 1000),
            arrivalStop: 'C',
            arrivalTime: new Date(20 * 60 * 1000),
            service: '2',
        },
        {
            departureStop: 'C',
            departureTime: new Date(30 * 60 * 1000),
            arrivalStop: 'D',
            arrivalTime: new Date(40 * 60 * 1000),
            service: '2',
        },
        {
            departureStop: 'C',
            departureTime: new Date(40 * 60 * 1000),
            arrivalStop: 'D',
            arrivalTime: new Date(50 * 60 * 1000),
            service: '1',
        },
        {
            departureStop: 'A',
            departureTime: new Date(0 * 60 * 1000),
            arrivalStop: 'D',
            arrivalTime: new Date(50 * 60 * 1000),
            service: '3',
        },
    ];

    return new CSA({
        connections,
        sortConnections,
    });
}

describe('CSA Generic', () => {
    test('should sort connections correctly when sortConnections is true', () => {
        const csa = createCSAInstance(true);

        expect(csa).toBeDefined();
        expect(csa).toBeInstanceOf(CSA);

        expect(csa.connections).toBeDefined();
        expect(csa.connections.length).toBe(6);

        const areConnectionsSorted = csa.connections.every((conn, index) => {
            if (index === 0) return true;
            return (
                conn.departureTime >= csa.connections[index - 1].departureTime
            );
        });

        expect(areConnectionsSorted).toBe(true);
        expect(csa.connections[0].departureTime.toISOString()).toEqual(
            '1970-01-01T00:00:00.000Z'
        );
        expect(csa.connections[5].arrivalTime.toISOString()).toEqual(
            '1970-01-01T00:50:00.000Z'
        );
    });

    test('should not sort connections when sortConnections is false', () => {
        const csa = createCSAInstance(false);

        expect(csa).toBeDefined();
        expect(csa).toBeInstanceOf(CSA);

        expect(csa.connections).toBeDefined();
        expect(csa.connections.length).toBe(6);

        const areConnectionsSorted = csa.connections.every((conn, index) => {
            if (index === 0) return true;
            return (
                conn.departureTime >= csa.connections[index - 1].departureTime
            );
        });

        expect(areConnectionsSorted).toBe(false);
    });

    test('should create an array of unique stops', () => {
        const csa = createCSAInstance();

        expect(csa).toBeDefined();
        expect(csa).toBeInstanceOf(CSA);

        expect(csa.stops).toBeDefined();
        if (!csa.stops) return;

        const uniqueStops = new Set(
            csa.stops.map((stop: Stop | string) =>
                typeof stop === 'string' ? stop : stop.id
            )
        );
        expect(uniqueStops.size).toBe(csa.stops.length);
    });
});
