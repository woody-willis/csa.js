# csa.js

My implementation of the Connection Scan Algorithm (minus footpaths) to solve different problems. I use this library for trains, however this will work for any public transport timetable.

### Features

- Earliest arrival
- Least amount of transfers
- **Coming soon:** Least average time spent waiting for transfers

## Installation

```bash
  npm install csa.js
```

## Usage

```typescript
import { CSA, Priority, Connection, Stop } from 'csa.js';

(async () => {
    const connections: Connection[] = [
        { departureStop: 'A', departureTime: new Date(0 * 60 * 1000),  arrivalStop: 'B', arrivalTime: new Date(10 * 60 * 1000), service: '1', },
        { departureStop: 'B', departureTime: new Date(20 * 60 * 1000), arrivalStop: 'C', arrivalTime: new Date(30 * 60 * 1000), service: '1', },
        { departureStop: 'C', departureTime: new Date(40 * 60 * 1000), arrivalStop: 'D', arrivalTime: new Date(50 * 60 * 1000), service: '1', },
        { departureStop: 'A', departureTime: new Date(0 * 60 * 1000),  arrivalStop: 'C', arrivalTime: new Date(20 * 60 * 1000), service: '2', },
        { departureStop: 'C', departureTime: new Date(30 * 60 * 1000), arrivalStop: 'D', arrivalTime: new Date(40 * 60 * 1000), service: '2', },
        { departureStop: 'A', departureTime: new Date(0 * 60 * 1000),  arrivalStop: 'D', arrivalTime: new Date(50 * 60 * 1000), service: '3', },
    ];

    const csa = new CSA(connections, Priority.EarliestArrival);

    const sourceStop: Stop = { id: 'A', name: 'Station A' };
    const targetStop: Stop = { id: 'D', name: 'Station D' };

    const journey = await csa.run(sourceStop, new Date(0), targetStop);
    console.log(journey);
})();
```

## Contributing

Spotted a bug or want to add a new feature? Feel free to open a PR and I will have a look at it!
