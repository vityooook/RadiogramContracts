import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, storeHashUpdate, toNano, TupleBuilder } from '@ton/core';
import {encodeOffChainContent} from "./help/content";
import { decodeOffChainContent, decodeContentItem } from "./help/content";

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type NftCollectionConfig = {
    ownerAddress: Address;
    secondOwnerAddress: Address;
    priceNftX2: bigint;
    priceNftTicket: bigint;
    limitNftX2: number;
    limitNftTicket: number;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
    contentCollection: string;
    contentItem: string;
    contentItemX2: string;
    contentItemTicket: string;
};

export function buildNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    let contentCell = beginCell();

    let encodedCollectionContent = encodeOffChainContent(collectionContent);

    let commonContentCell = beginCell();
    commonContentCell.storeBuffer(Buffer.from(commonContent));

    contentCell.storeRef(encodedCollectionContent);
    contentCell.storeRef(commonContentCell.asCell());

    return contentCell.endCell();
}


export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeAddress(config.secondOwnerAddress)
        .storeUint(0, 32)
        .storeInt(-1n, 1)
        .storeCoins(config.priceNftX2)
        .storeCoins(config.priceNftTicket)
        .storeUint(config.limitNftX2, 32)
        .storeUint(config.limitNftTicket, 32)
        .storeUint(0, 32)
        .storeUint(0, 32)
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeUint(config.royaltyParams.royaltyFactor, 16)
                .storeUint(config.royaltyParams.royaltyBase, 16)
                .storeAddress(config.royaltyParams.royaltyAddress)
            .endCell()
        )
        .storeRef(
            beginCell()
                .storeRef(buildNftCollectionContentCell(config.contentCollection, config.contentItem))
                .storeRef(beginCell().storeBuffer(Buffer.from(config.contentItemX2)).endCell())
                .storeRef(beginCell().storeBuffer(Buffer.from(config.contentItemTicket)).endCell())
            .endCell()
        )
    .endCell();
};

export class NftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendBuyNft(provider: ContractProvider, via: Sender, args: {
        value: bigint;
        typeNft: number;
    }) {
        await provider.internal(via, {
            value: args.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .storeUint(args.typeNft, 1)
            .endCell(),
        });
    }

    async sendDeployNft(provider: ContractProvider, via: Sender,
        args: {
            itemIndex?: number;
            futureOwner: Address;
            contentItem: string;
        }
    ) {
        const index = args.itemIndex ?? 0;
        await provider.internal(via, {
            value: toNano("0.031"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(0, 64)
                .storeUint(index, 32)
                .storeAddress(args.futureOwner)
                .storeRef(beginCell().storeBuffer(Buffer.from(args.contentItem)).endCell())
            .endCell(),
        });
    }

    async sendChangeData(provider: ContractProvider, via: Sender, args: {
        availablePurchase: bigint;
        priceNftX2: bigint;
        priceNftTicket: bigint;
        limitNftX2: number;
        limitNftTicket: number;
    }) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeInt(args.availablePurchase, 1)
                .storeCoins(args.priceNftX2)
                .storeCoins(args.priceNftTicket)
                .storeUint(args.limitNftX2, 32)
                .storeUint(args.limitNftTicket, 32)
            .endCell(),
        })
    }


    async sendOwners(provider: ContractProvider, via: Sender, 
        args: {
            ownerAddress: Address;
            secondOwnerAddress: Address;
        }) {
        
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
                .storeAddress(args.ownerAddress)
                .storeAddress(args.secondOwnerAddress)
            .endCell(),
        })
    }

    async sendWithdraw(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(5, 32)
                .storeUint(0, 64)
            .endCell(),
        });
    }

    async getCollectionData(provider: ContractProvider) {
        const result = await provider.get("get_collection_data", []);
        return {
            next_item_index: result.stack.readNumber(),
            content: result.stack.readCellOpt(),
            owner_address: result.stack.readAddress()
        };
    };

    async getItemAddress(provider: ContractProvider, nftIndex: number) {
        const tuple = new TupleBuilder()
        tuple.writeNumber(nftIndex);
        const result = await provider.get("get_nft_address_by_index", tuple.build());
        return {
            nft_item_address: result.stack.readAddress()
        };
    };

    async getAllInformation(provider: ContractProvider) {
        const result = await provider.get("get_all_information", []);
        return {
            ownerAddress: result.stack.readAddress(),
            secondOwnerAddress: result.stack.readAddress(),
            lastIndex: result.stack.readNumber(),
            availablePurchase: result.stack.readNumber(),
            priceNftX2: result.stack.readBigNumber(),
            priceNftTicket: result.stack.readBigNumber(),
            limitNftX2: result.stack.readNumber(),
            limitNftTicket: result.stack.readNumber(),
            saleNftX2: result.stack.readNumber(),
            saleNftTicket: result.stack.readNumber(),
            contentCollection: decodeOffChainContent(result.stack.readCell()),
            contentItemX2: decodeContentItem(result.stack.readCell()),
            contentItemTicket: decodeContentItem(result.stack.readCell())
        };
    };
}
