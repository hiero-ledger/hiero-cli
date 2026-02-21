/*
 * Hedera Subgraph Example - Hedera testnet
 * Scaffolded by hiero-cli subgraph plugin.
 */

import { GreetingSet } from '../generated/Greeter/IGreeter';
import { Greeting } from '../generated/schema';

export function handleGreetingSet(event: GreetingSet): void {
  let entity = Greeting.load(event.transaction.hash.toHexString());

  if (!entity) {
    entity = new Greeting(event.transaction.hash.toHex());
  }

  entity.currentGreeting = event.params._greeting;
  entity.save();
}
