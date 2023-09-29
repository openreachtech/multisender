import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const waitConfirmations = hre.network.name === "hardhat" || hre.network.name === "localhost" ? 0 : 2;

  const { deployer } = await getNamedAccounts();

  await deploy("Multisender", {
    from: deployer,
    args: [],
    waitConfirmations,
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ["multisender"];
