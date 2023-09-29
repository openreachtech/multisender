import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet, randomBytes } from "ethers";

const generateAddresses = (size: number): string[] => {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(Wallet.createRandom().address.toLocaleLowerCase());
  }
  return result;
};

const generateSerial = (size: number, base: number): number[] => {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(++base);
  }
  return result;
};

const generateRandomBytes = (size: number, length: number): Uint8Array[] => {
  const result = [];
  for (let i = 0; i < size; i++) {
    result.push(randomBytes(length));
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

    const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
    const erc721 = await ERC721Mock.deploy();

    const ERC20MockGasEater = await ethers.getContractFactory("ERC20MockGasEater");
    const erc20Eater = await ERC20MockGasEater.deploy();

    const ERC721ReceiverGasEater = await ethers.getContractFactory("ERC721ReceiverGasEater");
    const erc721Eater = await ERC721ReceiverGasEater.deploy();

    const Multisender = await ethers.getContractFactory("Multisender");
    const multisender = await Multisender.deploy();

    return { minter, erc20, erc721, erc20Eater, erc721Eater, multisender };
  }

  describe("multisendERC20", function () {
    it("succeed", async function () {
      const { minter, erc20, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      await erc20.mint(minter, 100_000);
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

    it("fail: insufficent gas sending", async function () {
      const { minter, erc20, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      await erc20.mint(minter, 100_000);
      await erc20.approve(multisender.target, 100_000);

      // transfer
      const tos = generateAddresses(123);
      const amounts = generateSerial(123, 100);
      const method = multisender.multisendERC20;
      const gas = await method.estimateGas(erc20.target, tos, amounts, 0);
      const tx = await method.populateTransaction(erc20.target, tos, amounts, 0);
      // sub some gas from estimation
      tx.gasLimit = gas - (await multisender.baseERC20TransferGas());

      await expect(minter.sendTransaction(tx)).to.be.revertedWith(new RegExp(/'will run out of gas at index 123 in 123'.*/));
    });

    it("fail: gas greefing", async function () {
      const { minter, erc20Eater, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      await erc20Eater.mint(minter, 100_000);
      await erc20Eater.approve(multisender.target, 100_000);

      // transfer
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
      const { minter, erc721, multisender } = await loadFixture(deployMultisenderFixture);
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

    it("fail: insufficent gas sending", async function () {
      const { minter, erc721, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      const tokenIds = generateSerial(123, 100);
      for (const tokenId of tokenIds) await erc721.mint(minter, tokenId);
      await erc721.setApprovalForAll(multisender.target, true);

      // transfer
      const tos = generateAddresses(123);
      const data = generateRandomBytes(123, 256);
      const method = multisender.multisendERC721;
      const gas = await method.estimateGas(erc721.target, tos, tokenIds, data, 0);
      const tx = await method.populateTransaction(erc721.target, tos, tokenIds, data, 0);
      // sub some gas from estimation
      tx.gasLimit = gas - (await multisender.basERC721TransferGas());

      await expect(minter.sendTransaction(tx)).to.be.revertedWith(new RegExp(/'will run out of gas at index 123 in 123'.*/));
    });

    it("fail: gas greefing", async function () {
      const { minter, erc721, erc721Eater, multisender } = await loadFixture(deployMultisenderFixture);
      // prepare
      const tokenIds = generateSerial(123, 100);
      for (const tokenId of tokenIds) await erc721.mint(minter, tokenId);
      await erc721.setApprovalForAll(multisender.target, true);

      // transfer
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
