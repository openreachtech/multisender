import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import 'hardhat-gas-reporter';

import "./tasks/send";
import "./tasks/senderc20";
import "./tasks/senderc721";
// import "./tasks/estimate";

const NETWORK_URL: string = process.env.NETWORK_URL || "";
const DEPLOYER_KEY: string = process.env.DEPLOYER_KEY || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ETHERSCAN_API_KEY: string = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: {
        count: 10
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [DEPLOYER_KEY]
    },
    any: {
      url: NETWORK_URL,
      accounts: [DEPLOYER_KEY]
    },
    mainnet: {
      url: NETWORK_URL,
      accounts: [DEPLOYER_KEY]
    },
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [DEPLOYER_KEY]
    },
    bsc: {
      url: "https://bsc-dataseed.bnbchain.org",
      accounts: [DEPLOYER_KEY]
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: [DEPLOYER_KEY]
    }
  },
  namedAccounts: {
		deployer: 0
	},
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  solidity: {
    version: "0.8.19",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  mocha: {
    timeout: 60000 // 1min
  }
};

export default config;
