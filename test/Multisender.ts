import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet, randomBytes } from "ethers";

type GeneratorFunction<T> = () => T;

const generateData = <T>(size: number, generator: GeneratorFunction<T>): T[] => {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(generator());
  }
  return result;
};

const generateAddresses = (size: number): string[] =>
  generateData<string>(size, () => Wallet.createRandom().address.toLocaleLowerCase());

const generateSerial = (size: number, base: number): number[] =>
  generateData<number>(
    size,
    (
      (_base) => () =>
        ++_base
    )(base)
  );

const generateRandomBytes = (size: number, l: number): Uint8Array[] => generateData<Uint8Array>(size, () => randomBytes(l));

describe("Multisender", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContracts() {
    const [minter] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const erc20 = await ERC20Mock.deploy();

    const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
    const erc721 = await ERC721Mock.deploy();

    const GasEater = await ethers.getContractFactory("GasEater");
    const eater = await GasEater.deploy();

    const ERC20MockGasEater = await ethers.getContractFactory("ERC20MockGasEater");
    const erc20Eater = await ERC20MockGasEater.deploy();

    const ERC721ReceiverGasEater = await ethers.getContractFactory("ERC721ReceiverGasEater");
    const erc721Eater = await ERC721ReceiverGasEater.deploy();

    const Multisender = await ethers.getContractFactory("Multisender");
    const multisender = await Multisender.deploy();

    return { minter, erc20, erc721, eater, erc20Eater, erc721Eater, multisender };
  }

  describe("multisend", function () {
    it("succeed", async function () {
      const { multisender } = await loadFixture(deployContracts);

      // transfer
      const tos = generateAddresses(123);
      const amounts = generateSerial(123, 100);
      const sum = amounts.reduce((acc, cur) => acc + cur);
      await expect(multisender.multisend(tos, amounts, 0, { value: sum })).not.to.be.reverted;

      // confirm sent amount
      for (let i = 0; i < tos.length; i++) {
        expect(await ethers.provider.getBalance(tos[i])).to.equal(amounts[i]);
      }
    });

    it("fail: gas greefing", async function () {
      const { eater, multisender } = await loadFixture(deployContracts);

      const tos = generateAddresses(123);
      tos[12] = (eater.target as string).toLocaleLowerCase();
      const amounts = generateSerial(123, 100);
      const sum = amounts.reduce((acc, cur) => acc + cur);

      await expect(multisender.multisend(tos, amounts, 0, { value: sum })).to.be.rejectedWith(
        `failed to transfer to 1 addresses: ${tos[12] + ","}`
      );
    });
  });

  describe("multisendERC20", function () {
    it("succeed", async function () {
      const { erc20, multisender } = await loadFixture(deployContracts);
      // prepare
      await erc20.approve(multisender.target, 100_000);

      // transfer
      const tos = generateAddresses(123);
      const amounts = generateSerial(123, 100);
      await expect(multisender.multisendERC20(erc20.target, tos, amounts, 0)).not.to.be.reverted;

      // confirm sent amount
      for (let i = 0; i < tos.length; i++) {
        expect(await erc20.balanceOf(tos[i])).to.equal(amounts[i]);
      }
    });

    // it("fail: insufficent gas sending", async function () {
    //   const { minter, erc20, multisender } = await loadFixture(deployContracts);
    //   // prepare
    //   await erc20.approve(multisender.target, 100_000);

    //   const tos = generateAddresses(123);
    //   const amounts = generateSerial(123, 100);
    //   const method = multisender.multisendERC20;
    //   const gas = await method.estimateGas(erc20.target, tos, amounts, 0);
    //   const tx = await method.populateTransaction(erc20.target, tos, amounts, 0);
    //   // sub some gas from estimation
    //   tx.gasLimit = gas - (await multisender.BASE_ERC20_TRANSFER_GAS());

    //   await expect(minter.sendTransaction(tx)).to.be.revertedWith(/^will run out of gas at index 123 in 123/);
    // });

    it("fail: gas greefing", async function () {
      const { erc20Eater, multisender } = await loadFixture(deployContracts);
      // prepare
      await erc20Eater.approve(multisender.target, 100_000);

      const tos = generateAddresses(123);
      const amounts = generateSerial(123, 100);

      await expect(multisender.multisendERC20(erc20Eater.target, tos, amounts, 0)).to.be.rejectedWith(
        `failed to transfer to ${Math.floor(tos.length / 10)} addresses: ${
          tos.filter((_, i) => amounts[i] % 10 === 0).reduce((acc, cur) => acc + "," + cur) + ","
        }`
      );
    });
  });

  describe("multisendERC721", function () {
    it("succeed", async function () {
      const { minter, erc721, multisender } = await loadFixture(deployContracts);
      // prepare
      const tokenIds = generateSerial(123, 100);
      for (const tokenId of tokenIds) await erc721.mint(minter, tokenId);
      await erc721.setApprovalForAll(multisender.target, true);

      // transfer
      const tos = generateAddresses(123);
      const data = generateRandomBytes(123, 256);
      await expect(multisender.multisendERC721(erc721.target, tos, tokenIds, data, 0)).not.to.be.reverted;

      // confirm sent tokenId
      for (let i = 0; i < tos.length; i++) {
        expect((await erc721.ownerOf(tokenIds[i])).toLocaleLowerCase()).to.equal(tos[i]);
      }
    });

    // it("fail: insufficent gas sending", async function () {
    //   const { minter, erc721, multisender } = await loadFixture(deployContracts);
    //   // prepare
    //   const tokenIds = generateSerial(123, 100);
    //   for (const tokenId of tokenIds) await erc721.mint(minter, tokenId);
    //   await erc721.setApprovalForAll(multisender.target, true);

    //   const tos = generateAddresses(123);
    //   const data = generateRandomBytes(123, 256);
    //   const method = multisender.multisendERC721;
    //   const gas = await method.estimateGas(erc721.target, tos, tokenIds, data, 0);
    //   const tx = await method.populateTransaction(erc721.target, tos, tokenIds, data, 0);
    //   // sub some gas from estimation
    //   tx.gasLimit = gas - (await multisender.BASE_ERC721_TRANSFER_GAS());

    //   await expect(minter.sendTransaction(tx)).to.be.revertedWith(new RegExp(/^will run out of gas at index 123 in 123/));
    // });

    it("fail: gas greefing", async function () {
      const { minter, erc721, erc721Eater, multisender } = await loadFixture(deployContracts);
      // prepare
      const tokenIds = generateSerial(123, 100);
      for (const tokenId of tokenIds) await erc721.mint(minter, tokenId);
      await erc721.setApprovalForAll(multisender.target, true);

      let tos = generateAddresses(123);
      const data = generateRandomBytes(123, 256);

      // replace the every 10 recepients to eater
      tos = tos.map((to, i) => (tokenIds[i] % 10 === 0 ? (erc721Eater.target as string).toLocaleLowerCase() : to));

      await expect(multisender.multisendERC721(erc721.target, tos, tokenIds, data, 0)).to.be.rejectedWith(
        `failed to transfer to ${Math.floor(tos.length / 10)} addresses: ${
          tos.filter((_, i) => tokenIds[i] % 10 === 0).reduce((acc, cur) => acc + "," + cur) + ","
        }`
      );
    });
  });
});
