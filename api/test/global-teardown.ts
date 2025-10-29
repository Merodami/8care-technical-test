import { TestContainerSetup } from './setup/test-container.setup';

export default async function globalTeardown() {
  await TestContainerSetup.stopContainers();
}
