import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet } from "ethers";

const StandardERC20TransferGas = 28348;

const generateAddresses = (size: number): string[] => {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(Wallet.createRandom().address.toLocaleLowerCase());
  }
  return result;
};

const generateAmounts = (size: number, base: number): number[] => {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(++base);
  }
  return result;
};

describe("Multisender", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMultisenderFixture() {
    const [minter] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const erc20 = await ERC20Mock.deploy();

    const ERC20MockGasEater = await ethers.getContractFactory("ERC20MockGasEater");
    const eater = await ERC20MockGasEater.deploy();

    const Multisender = await ethers.getContractFactory("Multisender");
    const multisender = await Multisender.deploy(0);

    return { minter, erc20, eater, multisender };
  }

  describe("multisendERC20", function () {
    it("succeed", async function () {
      const { minter, erc20, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      await erc20.mint(minter, 100_000);
      await erc20.approve(multisender.target, 100_000);

      // transfer
      const tos = generateAddresses(123);
      const amounts = generateAmounts(123, 100);
      await expect(multisender.multisendERC20(erc20.target, tos, amounts)).not.to.be.reverted;

      // confirm sent amount
      for (let i = 0; i < tos.length; i++) {
        expect(await erc20.balanceOf(tos[i])).to.equal(amounts[i]);
      }
    });

    it("fail: insufficent gas sending", async function () {
      const { minter, erc20, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      await erc20.mint(minter, 100_000);
      await erc20.approve(multisender.target, 100_000);

      // transfer
      const tos = generateAddresses(123);
      const amounts = generateAmounts(123, 100);
      const method = multisender.multisendERC20;
      const gas = await method.estimateGas(erc20.target, tos, amounts);
      const tx = await method.populateTransaction(erc20.target, tos, amounts);
      // sub some gas from estimation
      tx.gasLimit = gas - BigInt(StandardERC20TransferGas);

      await expect(minter.sendTransaction(tx)).to.be.revertedWith(/'will run out of gas at index 123 in 123'.*/);
    });

    it("fail: gas greefing", async function () {
      const { minter, eater, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      await eater.mint(minter, 100_000);
      await eater.approve(multisender.target, 100_000);

      // transfer
      const tos = generateAddresses(123);
      const amounts = generateAmounts(123, 100);

      await expect(multisender.multisendERC20(eater.target, tos, amounts)).to.be.rejectedWith(
        `failed to transfer to ${Math.floor(tos.length / 10)} addresses: ${
          tos.filter((_, i) => amounts[i] % 10 === 0).reduce((acc, cur) => acc + "," + cur) + ","
        }`
      );
    });
  });
});
