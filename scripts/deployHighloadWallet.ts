import { toNano } from '@ton/core';
import { HighloadWallet } from '../wrappers/HighloadWallet';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const highloadWallet = provider.open(HighloadWallet.createFromConfig({}, await compile('HighloadWallet')));

    await highloadWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(highloadWallet.address);

    // run methods on `highloadWallet`
}
