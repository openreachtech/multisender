import { task } from "hardhat/config";
import { assertBytes, assertNumbers } from "./util";

const SENDER_ADDRESS: string = process.env.SENDER_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

task("send", "Send native token to a list of addresses")
  .addParam("tos", "The account's address list to be sent")
  .addParam("amounts", "The amounts list. the unit is wai")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const tos: string[] = assertBytes(taskArgs.tos);
    const amounts: string[] = assertNumbers(taskArgs.amounts);
    if (tos.length !== amounts.length) {
      throw new Error("The number of accounts and amount must be the same");
    }
    const sender = await ethers.getContractAt("Multisender", SENDER_ADDRESS);

    // send
    const tx = await sender.multisend(tos, amounts, 0, { value: amounts.reduce((acc, cur) => acc + Number(cur), 0) });
    await tx.wait();

    // confirm
    for (const to of tos) {
      console.log(`balance of ${to} is ${await ethers.provider.getBalance(to)}`);
    }
  });
