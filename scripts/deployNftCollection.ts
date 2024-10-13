import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
        secondOwnerAddress: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
        priceNftX2: toNano("1"),
        priceNftTicket: toNano("2"),
        limitNftX2: 10,
        limitNftTicket: 1,
        nftItemCode: await compile("NftItem"),
        royaltyParams: {
            royaltyAddress: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
            royaltyBase: 0,
            royaltyFactor: 100
        },
        contentCollection: "https://static.storm.tg/nft/root.json",
        contentItem: "https://static.storm.tg/nft/",
        contentItemX2: "1.json",
        contentItemTicket: "5.json"
    }, await compile('NftCollection')));

    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(nftCollection.address);

    // run methods on `nftCollection`
}
