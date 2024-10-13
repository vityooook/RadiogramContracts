import { Address, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { NftItem } from '../wrappers/NftItem';

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftItem.createFromAddress(Address.parse("kQBqiJmD-X3lSB-YwVwk90t3XspdSSD9q8ht8sSjBrPMm91F")))

    await nftCollection.sendDestroyNft(provider.sender());


    // run methods on `nftCollection`
}