import { task } from "hardhat/config";

const SENDER_ADDRESS: string = process.env.SENDER_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC721_ADDRESS: string = process.env.ERC721_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const assertAccounts = (accounts: string): string[] => {
  const accountList = accounts.split(",");
  if (accountList.length < 1) {
    throw new Error("No accounts provided");
  }
  return accountList;
};

const assertIds = (ids: string): string[] => {
  const tokenIdList = ids.split(",");
  if (tokenIdList.length < 1) {
    throw new Error("No id provided");
  }
  return tokenIdList;
};

const assertData = (data_: string): string[] => {
  const data = data_.split(",");
  if (data.length < 1) {
    throw new Error("No data provided");
  }
  return data;
};

task("senderc721", "Send ERC721 to a list of addresses")
  .addParam("tos", "The account's address list to be sent")
  .addParam("tokenids", "The tokenIds list")
  .addParam("data", "The data list")
  .setAction(async (taskArgs, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const tos: string[] = assertAccounts(taskArgs.tos);
    const tokenIds: string[] = assertIds(taskArgs.tokenids);
    const data: string[] = assertData(taskArgs.data);
    if (tos.length !== tokenIds.length) {
      throw new Error("The number of accounts and amount must be the same");
    }

    const erc721 = await ethers.getContractAt("ERC721Mock", ERC721_ADDRESS);
    const sender = await ethers.getContractAt("Multisender", SENDER_ADDRESS);

    // mint & approve erc721
    for (const tokenId of tokenIds) {
      await erc721.mint(deployer, tokenId);
    }
    await erc721.setApprovalForAll(SENDER_ADDRESS, true);

    // send
    const tx = await sender.multisendERC721(ERC721_ADDRESS, tos, tokenIds, data, 0);
    await tx.wait();

    // confirm mint
    for (const tokenId of tokenIds) {
      console.log(`owner of ${tokenId} is ${await erc721.ownerOf(tokenId)}`);
    }
  });
