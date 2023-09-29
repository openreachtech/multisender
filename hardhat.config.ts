import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import "hardhat-deploy";

const NETWORK_URL: string = process.env.NETWORK || "";
const DEPLOYER_KEY: string = process.env.DEPLOYER_KEY || "d1c71e71b06e248c8dbe94d49ef6d6b0d64f5d71b1e33a0f39e14dadb070304a";
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
      accounts: ["d1c71e71b06e248c8dbe94d49ef6d6b0d64f5d71b1e33a0f39e14dadb070304a"]
    },
    any: {
      url: NETWORK_URL,
      accounts: [DEPLOYER_KEY]
    },
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
