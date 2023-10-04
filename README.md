# multisender
Send native currency or ERC20 tokens to multiple addresses simultaneously.

# Features
- No transaction fees
- Protection against gas griefing
- User-friendly error messages: Lists each address if transfer fails
- Audited using the reputable tool(=`slither`)

# Getting Started
```console
# Install dependencies
yarn install

# Compile the code
yarn compile
```

# Usage
## 1. Deployment
```console
# Set environment variables
export NETWORK_URL=https://XXX..
export DEPLOYER_KEY=0xXXX..
export ETHERSCAN_API_KEY=XXX..

# Deploy the contract
yarn deploy:any
```

## 2. Token Transfers
### For Native Tokens
```
# Set environment variables
export SENDER_ADDRESS=0xXXX..

# Transfer
npx hardhat send  --network any \
  --tos 0x2ED22eA03fEA3e5BD90f6Fdd52C20c26ff6e1300,0x48466Bc93dF6563c2A638A4be20Feca46A1E314e,0xBDDf8Fad2d30Cd4F7140244690b347fA873e082b \
  --amounts 123000,123000123,123000123000
```

### For ERC20 Tokens
```
# Set environment variables
export ERC20_ADDRESS=0xXXX..
export SENDER_ADDRESS=0xXXX..

# Transfer
npx hardhat senderc20  --network any \
  --tos 0x2ED22eA03fEA3e5BD90f6Fdd52C20c26ff6e1300,0x48466Bc93dF6563c2A638A4be20Feca46A1E314e,0xBDDf8Fad2d30Cd4F7140244690b347fA873e082b \
  --amounts 123000,123000123,123000123000
```

### For ERC721 Tokens
```
# Set environment variables
export ERC721_ADDRESS=0xXXX..
export SENDER_ADDRESS=0xXXX..

# Transfer
npx hardhat senderc721  --network any \
  --tos 0x2ED22eA03fEA3e5BD90f6Fdd52C20c26ff6e1300,0x48466Bc93dF6563c2A638A4be20Feca46A1E314e,0xBDDf8Fad2d30Cd4F7140244690b347fA873e082b \
  --tokenids 123000,123000123,123000123000 \
  --data 0x,0x,0x
```
