import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, Dictionary, toNano, TupleBuilder } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NftItem } from '../wrappers/NftItem';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('NftCollection', () => {
    let nft_collection_code: Cell;
    let nft_item_code: Cell;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let second_owner: SandboxContract<TreasuryContract>;
    let buyer: SandboxContract<TreasuryContract>;
    let new_owner: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;
    let bueyrNft: (index: number) => Promise<SandboxContract<NftItem>>;

    beforeAll(async () => {
        nft_collection_code = await compile("NftCollection");
        nft_item_code = await compile("NftItem");
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        second_owner = await blockchain.treasury('second_owner');
        new_owner = await blockchain.treasury('new_owner');
        buyer = await blockchain.treasury('buyer');
    });

    beforeEach(async () => {
        nftCollection = blockchain.openContract(NftCollection.createFromConfig({
            ownerAddress: owner.address,
            secondOwnerAddress: second_owner.address,
            priceNftX2: toNano("1"),
            priceNftTicket: toNano("2"),
            limitNftX2: 1,
            limitNftTicket: 1,
            nftItemCode: nft_item_code,
            royaltyParams: {
                royaltyAddress: owner.address,
                royaltyBase: 0,
                royaltyFactor: 100
            },
            contentCollection: "test",
            contentItem: "test",
            contentItemX2: "test",
            contentItemTicket: "test"
        }, nft_collection_code));

        bueyrNft = async (index: number) => blockchain.openContract(NftItem.createFromAddress((await nftCollection.getItemAddress(index)).nft_item_address));
    });

    it('should deploy collection contract', async () => {
        const deployResult = await nftCollection.sendDeploy(owner.getSender(), toNano("1"));

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should buy x2 and ticket nft', async () => {
        const collectionData = await nftCollection.getAllInformation();
        const nftItemX2 = await bueyrNft(collectionData.lastIndex);

        const deployResultX2 = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("1"),
            typeNft: 1
        });

        expect(deployResultX2.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItemX2.address,
            deploy: true,
            success: true
        });

        expect(deployResultX2.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: owner.address,
            success: true
        });

        const collectionData2 = await nftCollection.getAllInformation();
        const nftItemTicket = await bueyrNft(collectionData2.lastIndex);

        const deployResultTicket = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("2"),
            typeNft: 0
        });

        expect(deployResultTicket.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItemTicket.address,
            deploy: true,
            success: true
        });

        expect(deployResultTicket.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: owner.address,
            success: true
        });
    });

    it('cheak error 801 and 802', async () => {

        // error 801
        let deployResult = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("0.5"),
            typeNft: 1
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: nftCollection.address,
            exitCode: 801
        });

        deployResult = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("0.5"),
            typeNft: 0
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: nftCollection.address,
            exitCode: 801
        });

        // error 802
        await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("1"),
            typeNft: 1
        });

        await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("2"),
            typeNft: 0
        });

        deployResult = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("1"),
            typeNft: 1
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: nftCollection.address,
            exitCode: 802
        });

        deployResult = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("2"),
            typeNft: 0
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: nftCollection.address,
            exitCode: 802
        });
    });


    it('owner should deploy nft', async () => {
        const collectionData = await nftCollection.getAllInformation();
        const nftItem = await bueyrNft(collectionData.lastIndex);

        const deployResult = await nftCollection.sendDeployNft(owner.getSender(), {
            itemIndex: collectionData.lastIndex,
            futureOwner: buyer.address,
            contentItem: "test"
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        });
    });


    it('should change data', async () => {
        const collectionDataBefore = await nftCollection.getAllInformation();

        const deployResult = await nftCollection.sendChangeData(owner.getSender(), {
            availablePurchase: 0n,
            priceNftX2: toNano("555"),
            priceNftTicket: toNano("999"),
            limitNftX2: 777,
            limitNftTicket: 666
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true
        });

        const collectionDataAfter = await nftCollection.getAllInformation();

        expect(collectionDataBefore.availablePurchase).toBeLessThan(collectionDataAfter.availablePurchase);
        expect(collectionDataBefore.priceNftX2).toBeLessThan(collectionDataAfter.priceNftX2);
        expect(collectionDataBefore.priceNftTicket).toBeLessThan(collectionDataAfter.priceNftTicket);
        expect(collectionDataBefore.limitNftX2).toBeLessThan(collectionDataAfter.limitNftX2);
        expect(collectionDataBefore.limitNftTicket).toBeLessThan(collectionDataAfter.limitNftTicket);
    });


    it('should change owner', async () => {
        const collectionDataBefore = await nftCollection.getAllInformation();

        const transactionResult = await nftCollection.sendOwners(owner.getSender(), {
            ownerAddress: new_owner.address,
            secondOwnerAddress: new_owner.address
        });

        expect(transactionResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            success: true
        });

        const collectionDataAfter = await nftCollection.getAllInformation();
        
        expect(collectionDataBefore.ownerAddress).not.toEqualAddress(collectionDataAfter.ownerAddress);
        expect(collectionDataBefore.secondOwnerAddress).not.toEqualAddress(collectionDataAfter.secondOwnerAddress);
    });

    it('should withdraw all balance', async () => {
        const transactionResult = await nftCollection.sendWithdraw(new_owner.getSender());

        expect(transactionResult.transactions).toHaveTransaction({
            from: new_owner.address,
            to: nftCollection.address,
            success: true
        });

        expect(transactionResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: new_owner.address,
            success: true
        });
    })

    it('should cheak owner', async () => {
        const transactionResult = await nftCollection.sendWithdraw(buyer.getSender());

        expect(transactionResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: nftCollection.address,
            exitCode: 803
        });
    });

    it('should destroy nft', async () => {

        await nftCollection.sendChangeData(new_owner.getSender(), {
            availablePurchase: -1n,
            priceNftX2: toNano("1"),
            priceNftTicket: toNano("2"),
            limitNftX2: 777,
            limitNftTicket: 666
        })

        const collectionData = await nftCollection.getAllInformation();
        const nftItemX2 = await bueyrNft(collectionData.lastIndex);

        const deployResultX2 = await nftCollection.sendBuyNft(buyer.getSender(), {
            value: toNano("1"),
            typeNft: 1
        });

        expect(deployResultX2.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItemX2.address,
            deploy: true,
            success: true
        });

        const destroyNft = await nftItemX2.sendDestroyNft(new_owner.getSender());

        expect(destroyNft.transactions).toHaveTransaction({
            from: new_owner.address,
            to: nftItemX2.address,
            destroyed: true
        });

        expect(destroyNft.transactions).toHaveTransaction({
            from: nftItemX2.address,
            to: new_owner.address,
            success: true
        });
    })
});
