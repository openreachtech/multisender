import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { EventLog } from "ethers";

describe("GasMeter", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployGasMeterFixture() {
    // Contracts are deployed using the first signer/account by default
    const [minter, recepient1, recepient2, recepient3, recepient4, recepient5, recepient6, recepient7] =
      await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const erc20 = await ERC20Mock.deploy();

    const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
    const erc721 = await ERC721Mock.deploy();

    const GasMeter = await ethers.getContractFactory("GasMeter");
    const meter = await GasMeter.deploy();

    return { erc20, erc721, meter, minter, recepient1, recepient2, recepient3, recepient4, recepient5, recepient6, recepient7 };
  }

  describe("mesureERC20Transfer", function () {
    it("mesure gas cost of erc20 transfer", async function () {
      const { erc20, meter, minter, recepient1, recepient2, recepient3, recepient4, recepient5, recepient6, recepient7 } =
        await loadFixture(deployGasMeterFixture);
      await erc20.mint(minter, 100_000);
      await erc20.approve(meter.target, 100_000);

      const tos = [
        recepient1.address,
        recepient2.address,
        recepient3.address,
        recepient4.address,
        recepient5.address,
        recepient1.address,
        recepient2.address,
        recepient3.address,
        recepient4.address,
        recepient5.address,
        recepient6.address,
        recepient6.address,
        recepient7.address,
        recepient7.address,
      ];
      const amounts = [100, 100, 100, 100, 100, 200, 200, 200, 200, 200, 300, 300, 300, 300];
      const tx = await meter.mesureERC20Transfer(erc20.target, tos, amounts);
      const receipt = await tx.wait();

      (receipt?.logs[receipt?.logs.length - 1] as EventLog).args.toArray()[0].map((v: any) => console.log(v.toString()));
    });
  });

  describe("mesureERC721Transfer", function () {
    it("mesure gas cost of erc721 transfer", async function () {
      const { erc721, meter, minter, recepient1, recepient2, recepient3, recepient4, recepient5, recepient6, recepient7 } =
        await loadFixture(deployGasMeterFixture);
      const tokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 123, 1234];
      for (const tokenId of tokenIds) {
        await erc721.mint(minter, tokenId);
        await erc721.approve(meter.target, tokenId);
      }

      const tos = [
        recepient1.address,
        recepient2.address,
        recepient3.address,
        recepient4.address,
        recepient5.address,
        recepient1.address,
        recepient2.address,
        recepient3.address,
        recepient4.address,
        recepient5.address,
        recepient6.address,
        recepient6.address,
        recepient7.address,
        recepient7.address,
      ];
      const tx = await meter.mesureERC721Transfer(erc721.target, tos, tokenIds);
      const receipt = await tx.wait();

      (receipt?.logs[receipt?.logs.length - 1] as EventLog).args.toArray()[0].map((v: any) => console.log(v.toString()));
    });
  });
});
