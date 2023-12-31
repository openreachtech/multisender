import { task } from "hardhat/config";

const SENDER_ADDRESS: string = process.env.SENDER_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ERC20_ADDRESS: string = process.env.ERC20_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
import { assertBytes, assertNumbers } from "./util";

task("senderc20", "Send ERC20 to a list of addresses")
  .addParam("tos", "The account's address list to be sent")
  .addParam("amounts", "The amounts list. the unit is wai")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const tos: string[] = assertBytes(taskArgs.tos);
    const amounts: string[] = assertNumbers(taskArgs.amounts);
    if (tos.length !== amounts.length) {
      throw new Error("The number of accounts and amount must be the same");
    }

    const erc20 = await ethers.getContractAt("ERC20Mock", ERC20_ADDRESS);
    const sender = await ethers.getContractAt("Multisender", SENDER_ADDRESS);

    // approve erc20
    // await erc20.approve(SENDER_ADDRESS, "1000000000000000")

    // send
    const tx = await sender.multisendERC20(ERC20_ADDRESS, tos, amounts, 0);
    await tx.wait();

    // confirm
    for (const to of tos) {
      console.log(`balance of ${to} is ${await erc20.balanceOf(to)}`);
    }
  });
