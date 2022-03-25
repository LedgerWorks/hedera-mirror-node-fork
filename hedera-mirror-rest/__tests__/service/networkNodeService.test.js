/*-
 * ‌
 * Hedera Mirror Node
 * ​
 * Copyright (C) 2019 - 2022 Hedera Hashgraph, LLC
 * ​
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ‍
 */

'use strict';

const _ = require('lodash');

const {NetworkNodeService} = require('../../service');
const {assertSqlQueryEqual} = require('../testutils');

const integrationDbOps = require('../integrationDbOps');
const integrationDomainOps = require('../integrationDomainOps');

jest.setTimeout(40000);

let dbConfig;

// set timeout for beforeAll to 2 minutes as downloading docker image if not exists can take quite some time
const defaultBeforeAllTimeoutMillis = 240 * 1000;

beforeAll(async () => {
  dbConfig = await integrationDbOps.instantiateDatabase();
  await integrationDomainOps.setUp({}, dbConfig.sqlConnection);
  global.pool = dbConfig.sqlConnection;
}, defaultBeforeAllTimeoutMillis);

afterAll(async () => {
  await integrationDbOps.closeConnection(dbConfig);
});

beforeEach(async () => {
  if (!dbConfig.sqlConnection) {
    logger.warn(`sqlConnection undefined, acquire new connection`);
    dbConfig.sqlConnection = integrationDbOps.getConnection(dbConfig.dbSessionConfig);
  }

  await integrationDbOps.cleanUp(dbConfig.sqlConnection);
});

describe('NetworkNodeService.getNetworkNodesWithFiltersQuery tests', () => {
  test('Verify simple query', async () => {
    const [query, params] = NetworkNodeService.getNetworkNodesWithFiltersQuery([], [102], 'asc', 5);
    const expected = `with adb as (
      select start_consensus_timestamp, end_consensus_timestamp, file_id from address_book where file_id = $1
     ),
     entries as (
      select description, memo, node_id, node_account_id, node_cert_hash, public_key, adb.file_id, adb.start_consensus_timestamp, adb.end_consensus_timestamp
      from address_book_entry abe
      join adb on adb.start_consensus_timestamp = abe.consensus_timestamp
     ),
     endpoints as (
      select consensus_timestamp, node_id, jsonb_agg(jsonb_build_object('ip_address_v4', ip_address_v4, 'port', port) order by port desc) as service_endpoints
      from address_book_service_endpoint abse
      join adb on adb.start_consensus_timestamp = abse.consensus_timestamp
      group by consensus_timestamp, node_id
     )
     select abe.description, abe.file_id, abe.memo, abe.node_id, abe.node_account_id, abe.node_cert_hash, abe.start_consensus_timestamp, abe.end_consensus_timestamp,
     abse.service_endpoints, abe.public_key
     from entries abe
     left join endpoints abse on abe.start_consensus_timestamp = abse.consensus_timestamp and abe.node_id = abse.node_id
     order by abe.node_id asc, abe.start_consensus_timestamp asc
     limit $2`;
    assertSqlQueryEqual(query, expected);
    expect(params).toEqual([102, 5]);
  });
});

const defaultInputAddressBooks = [
  {
    start_consensus_timestamp: 1,
    file_id: 101,
    node_count: 3,
  },
  {
    start_consensus_timestamp: 2,
    file_id: 102,
    node_count: 4,
  },
];

const defaultInputAddressBookEntries = [
  {
    consensus_timestamp: 1,
    memo: 'memo 1',
    node_id: 0,
    node_account_id: 3,
    node_cert_hash: '[0,)',
    description: 'desc 1',
  },
  {
    consensus_timestamp: 1,
    memo: 'memo 2',
    node_id: 1,
    node_account_id: 4,
    node_cert_hash: '[0,)',
    description: 'desc 2',
  },
  {
    consensus_timestamp: 2,
    memo: '0.0.3',
    node_id: 0,
    node_account_id: 3,
    node_cert_hash: '[0,)',
    description: 'desc 3',
  },
  {
    consensus_timestamp: 2,
    memo: '0.0.4',
    node_id: 1,
    node_account_id: 4,
    node_cert_hash: '[0,)',
    description: 'desc 4',
  },
];

const defaultInputServiceEndpointBooks = [
  {
    consensus_timestamp: 1,
    ip_address_v4: '127.0.0.1',
    node_id: 0,
    port: 50211,
  },
  {
    consensus_timestamp: 1,
    ip_address_v4: '127.0.0.2',
    node_id: 1,
    port: 50212,
  },
  {
    consensus_timestamp: 2,
    ip_address_v4: '128.0.0.1',
    node_id: 0,
    port: 50212,
  },
  {
    consensus_timestamp: 2,
    ip_address_v4: '128.0.0.2',
    node_id: 1,
    port: 50212,
  },
];

const defaultExpectedNetworkNode101 = [
  {
    addressBook: {
      startConsensusTimestamp: '1',
      fileId: '101',
      endConsensusTimestamp: null,
    },
    addressBookEntry: {
      description: 'desc 2',
      memo: 'memo 2',
      nodeAccountId: '4',
      nodeId: '1',
    },
    addressBookServiceEndpoints: [
      {
        ipAddressV4: '127.0.0.2',
        port: 50212,
      },
    ],
  },
  {
    addressBook: {
      startConsensusTimestamp: '1',
      fileId: '101',
      endConsensusTimestamp: null,
    },
    addressBookEntry: {
      description: 'desc 1',
      memo: 'memo 1',
      nodeAccountId: '3',
      nodeId: '0',
    },
    addressBookServiceEndpoints: [
      {
        ipAddressV4: '127.0.0.1',
        port: 50211,
      },
    ],
  },
];

const defaultExpectedNetworkNode102 = [
  {
    addressBook: {
      endConsensusTimestamp: null,
      fileId: '102',
      startConsensusTimestamp: '2',
    },
    addressBookEntry: {
      description: 'desc 3',
      memo: '0.0.3',
      nodeAccountId: '3',
      nodeId: '0',
    },
    addressBookServiceEndpoints: [
      {
        ipAddressV4: '128.0.0.1',
        port: 50212,
      },
    ],
  },
  {
    addressBook: {
      endConsensusTimestamp: null,
      fileId: '102',
      startConsensusTimestamp: '2',
    },
    addressBookEntry: {
      description: 'desc 4',
      memo: '0.0.4',
      nodeAccountId: '4',
      nodeId: '1',
    },
    addressBookServiceEndpoints: [
      {
        ipAddressV4: '128.0.0.2',
        port: 50212,
      },
    ],
  },
];

describe('NetworkNodeService.getNetworkNodes tests', () => {
  test('NetworkNodeService.getNetworkNodes - No match', async () => {
    await expect(NetworkNodeService.getNetworkNodes([], [2], 'asc', 5)).resolves.toStrictEqual([]);
  });

  test('NetworkNodeService.getNetworkNodes - Matching 101 entity', async () => {
    await integrationDomainOps.loadAddressBooks(defaultInputAddressBooks);
    await integrationDomainOps.loadAddressBookEntries(defaultInputAddressBookEntries);
    await integrationDomainOps.loadAddressBookServiceEndpoints(defaultInputServiceEndpointBooks);

    await expect(NetworkNodeService.getNetworkNodes([], [101], 'desc', 5)).resolves.toMatchObject(
      defaultExpectedNetworkNode101
    );
  });

  test('NetworkNodeService.getNetworkNodes - Matching 102 entity', async () => {
    await integrationDomainOps.loadAddressBooks(defaultInputAddressBooks);
    await integrationDomainOps.loadAddressBookEntries(defaultInputAddressBookEntries);
    await integrationDomainOps.loadAddressBookServiceEndpoints(defaultInputServiceEndpointBooks);

    await expect(NetworkNodeService.getNetworkNodes([], [102], 'asc', 5)).resolves.toMatchObject(
      defaultExpectedNetworkNode102
    );
  });
});

const defaultNodeFilter = 'abe.node_id = $2';
describe('NetworkNodeService.getNetworkNodes tests node filter', () => {
  test('NetworkNodeService.getNetworkNodes - No match', async () => {
    await expect(NetworkNodeService.getNetworkNodes([defaultNodeFilter], [2, 0], 'asc', 5)).resolves.toStrictEqual([]);
  });

  const expectedNetworkNode101 = [
    {
      addressBook: {
        startConsensusTimestamp: '1',
        fileId: '101',
        endConsensusTimestamp: null,
      },
      addressBookEntry: {
        description: 'desc 1',
        memo: 'memo 1',
        nodeAccountId: '3',
        nodeId: '0',
      },
      addressBookServiceEndpoints: [
        {
          ipAddressV4: '127.0.0.1',
          port: 50211,
        },
      ],
    },
  ];

  const expectedNetworkNode102 = [
    {
      addressBook: {
        endConsensusTimestamp: null,
        fileId: '102',
        startConsensusTimestamp: '2',
      },
      addressBookEntry: {
        description: 'desc 3',
        memo: '0.0.3',
        nodeAccountId: '3',
        nodeId: '0',
      },
      addressBookServiceEndpoints: [
        {
          ipAddressV4: '128.0.0.1',
          port: 50212,
        },
      ],
    },
  ];

  test('NetworkNodeService.getNetworkNodes - Matching 101 entity', async () => {
    await integrationDomainOps.loadAddressBooks(defaultInputAddressBooks);
    await integrationDomainOps.loadAddressBookEntries(defaultInputAddressBookEntries);
    await integrationDomainOps.loadAddressBookServiceEndpoints(defaultInputServiceEndpointBooks);

    await expect(NetworkNodeService.getNetworkNodes([defaultNodeFilter], [101, 0], 'desc', 5)).resolves.toMatchObject(
      expectedNetworkNode101
    );
  });

  test('NetworkNodeService.getNetworkNodes - Matching 102 entity', async () => {
    await integrationDomainOps.loadAddressBooks(defaultInputAddressBooks);
    await integrationDomainOps.loadAddressBookEntries(defaultInputAddressBookEntries);
    await integrationDomainOps.loadAddressBookServiceEndpoints(defaultInputServiceEndpointBooks);

    await expect(NetworkNodeService.getNetworkNodes([defaultNodeFilter], [102, 0], 'asc', 5)).resolves.toMatchObject(
      expectedNetworkNode102
    );
  });
});

const defaultTimestampFilter = 'abe.start_consensus_timestamp >= $2';
describe('NetworkNodeService.getNetworkNodes tests timestamp filter', () => {
  test('NetworkNodeService.getNetworkNodes - No match', async () => {
    await expect(NetworkNodeService.getNetworkNodes([defaultTimestampFilter], [2, 0], 'asc', 5)).resolves.toStrictEqual(
      []
    );
  });

  test('NetworkNodeService.getNetworkNodes - Matching 101 entity', async () => {
    await integrationDomainOps.loadAddressBooks(defaultInputAddressBooks);
    await integrationDomainOps.loadAddressBookEntries(defaultInputAddressBookEntries);
    await integrationDomainOps.loadAddressBookServiceEndpoints(defaultInputServiceEndpointBooks);

    await expect(
      NetworkNodeService.getNetworkNodes([defaultTimestampFilter], [101, 1], 'desc', 5)
    ).resolves.toMatchObject(defaultExpectedNetworkNode101);
  });

  test('NetworkNodeService.getNetworkNodes - Matching 102 entity', async () => {
    await integrationDomainOps.loadAddressBooks(defaultInputAddressBooks);
    await integrationDomainOps.loadAddressBookEntries(defaultInputAddressBookEntries);
    await integrationDomainOps.loadAddressBookServiceEndpoints(defaultInputServiceEndpointBooks);

    await expect(
      NetworkNodeService.getNetworkNodes([defaultTimestampFilter], [102, 2], 'asc', 5)
    ).resolves.toMatchObject(defaultExpectedNetworkNode102);
  });
});
