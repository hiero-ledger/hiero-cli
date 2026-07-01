import type { Client } from '@hiero-ledger/sdk';

export const useTrackedClients = (): ((client: Client) => Client) => {
  const created: Client[] = [];

  afterEach(() => {
    created.forEach((c) => c.close());
    created.length = 0;
  });

  return (client: Client): Client => {
    created.push(client);
    return client;
  };
};
