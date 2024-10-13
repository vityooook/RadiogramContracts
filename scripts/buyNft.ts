import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromAddress(Address.parse("kQAdj2BwCJloNKSPOCEYBfCX4Nat6ufWf19HaCuSgRnGim0y")))

    await nftCollection.sendBuyNft(provider.sender(), {
        value: toNano("2"),
        typeNft: 0
    })


    // run methods on `nftCollection`
}