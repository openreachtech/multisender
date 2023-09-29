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
### For ERC20 Tokens
```
# Set environment variables
export ERC20_ADDRESS=0xXXX..
export SENDER_ADDRESS=0xXXX..
```