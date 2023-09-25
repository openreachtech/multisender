// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20MockGasEater is ERC20 {
    mapping(bytes32 => uint256) private _garbage;

    constructor() ERC20("ERC20MockGasEater", "E20MGE") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override returns (bool) {
        // NOTE: eat gas every 10 transfer
        if (value % 10 == 0) {
            for (uint8 i = 0; i < 10; i++) {
                _garbage[keccak256(abi.encode(from, to, i))] = value;
            }
        }

        return super.transferFrom(from, to, value);
    }
}
