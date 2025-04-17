import { describe, expect, test } from '@jest/globals';
import { getConnections } from './utils.js';
import {
    CSA,
    Priority,
    Stop,
    Service,
    CSALeastTransfers,
} from '../src/index.js';

function createCSAInstance(priority: Priority = Priority.LeastTransfers): CSA {
    // Create a CSA instance with some dummy data
    const connections = getConnections();

    return new CSA({
        connections,
        priority,
    });
}

describe('Least Transfers', () => {
    test('should create an Least Transfers CSA instance', () => {
        const csa = createCSAInstance();

        expect(csa).toBeDefined();
        expect(csa).toBeInstanceOf(CSA);

        expect(typeof csa.run).toBe('function');

        expect(csa.instance).toBeInstanceOf(CSALeastTransfers);
    });

    test('should produce the correct least transfers with no changes', async () => {
        const csa = createCSAInstance();

        const sourceStop: Stop = { id: 'BOH', name: 'Bosham' };
        const targetStop: Stop = { id: 'PMS', name: 'Portsmouth & Southsea' };

        const journey = await csa.run(
            sourceStop,
            new Date('2025-03-26T17:44:00Z'),
            targetStop
        );
        const uniqueServices = new Set(
            journey.map((connection) => (connection.service as Service).id)
        );

        expect(journey).toBeDefined();
        expect(journey.length).toBe(8);
        expect(uniqueServices.size).toBe(1);

        expect((journey[0].departureStop as Stop).id).toEqual('BOH');
        expect((journey[7].arrivalStop as Stop).id).toEqual('PMS');

        expect(journey[0].departureTime.toISOString()).toEqual(
            '2025-03-26T17:45:00.000Z'
        );
        expect(journey[7].arrivalTime.toISOString()).toEqual(
            '2025-03-26T18:15:30.000Z'
        );
    });

    test('should produce the correct least transfers with 1 change', async () => {
        const csa = createCSAInstance();

        const sourceStop: Stop = { id: 'GLD', name: 'Guildford' };
        const targetStop: Stop = { id: 'BSK', name: 'Basingstoke' };

        const journey = await csa.run(
            sourceStop,
            new Date('2025-03-26T17:01:00Z'),
            targetStop
        );
        const uniqueServices = new Set(
            journey.map((connection) => (connection.service as Service).id)
        );

        expect(journey).toBeDefined();
        expect(journey.length).toBe(8);
        expect(uniqueServices.size).toBe(2);

        expect((journey[0].departureStop as Stop).id).toEqual('GLD');
        expect((journey[7].arrivalStop as Stop).id).toEqual('BSK');

        expect(journey[0].departureTime.toISOString()).toEqual(
            '2025-03-26T17:02:00.000Z'
        );
        expect(journey[7].arrivalTime.toISOString()).toEqual(
            '2025-03-26T17:58:01.000Z'
        );
    });

    test('should produce the correct least transfers with 1 change despite a faster 2 change route', async () => {
        const csa = createCSAInstance();

        const sourceStop: Stop = { id: 'AHV', name: 'Ash Vale' };
        const targetStop: Stop = { id: 'WIN', name: 'Winchester' };

        const journey = await csa.run(
            sourceStop,
            new Date('2025-03-26T18:09:00Z'),
            targetStop
        );
        const uniqueServices = new Set(
            journey.map((connection) => (connection.service as Service).id)
        );

        expect(journey).toBeDefined();
        expect(journey.length).toBe(3);
        expect(uniqueServices.size).toBe(2);

        expect((journey[0].departureStop as Stop).id).toEqual('AHV');
        expect((journey[2].arrivalStop as Stop).id).toEqual('WIN');

        expect(journey[0].departureTime.toISOString()).toEqual(
            '2025-03-26T18:09:01.000Z'
        );
        expect(journey[2].arrivalTime.toISOString()).toEqual(
            '2025-03-26T20:31:30.000Z'
        );
    });
});
