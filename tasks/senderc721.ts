import { task } from "hardhat/config";
import { assertBytes, assertNumbers } from "./util";

const SENDER_ADDRESS: string = process.env.SENDER_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC721_ADDRESS: string = process.env.ERC721_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

task("senderc721", "Send ERC721 to a list of addresses")
  .addParam("tos", "The account's address list to be sent")
  .addParam("tokenids", "The tokenIds list")
  .addParam("data", "The data list")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const tos: string[] = assertBytes(taskArgs.tos);
    const tokenIds: string[] = assertNumbers(taskArgs.tokenids);
    const data: string[] = assertBytes(taskArgs.data);
    if (tos.length !== tokenIds.length) {
      throw new Error("The number of accounts and amount must be the same");
    }

    const erc721 = await ethers.getContractAt("ERC721Mock", ERC721_ADDRESS);
    const sender = await ethers.getContractAt("Multisender", SENDER_ADDRESS);

    // mint & approve erc721
    // const { getNamedAccounts } = hre;
    // const { deployer } = await getNamedAccounts();
    // for (const tokenId of tokenIds) {
    //   await erc721.mint(deployer, tokenId);
    // }
    // await erc721.setApprovalForAll(SENDER_ADDRESS, true);

    // send
    const tx = await sender.multisendERC721(ERC721_ADDRESS, tos, tokenIds, data, 0);
    await tx.wait();

    // confirm
    for (const tokenId of tokenIds) {
      console.log(`owner of ${tokenId} is ${await erc721.ownerOf(tokenId)}`);
    }
  });
