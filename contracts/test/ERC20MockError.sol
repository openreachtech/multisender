// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20MockError is ERC20 {
    mapping(bytes32 => uint256) private _garbage;

    error CustomError(string);

    constructor() ERC20("ERC20MockError", "E20MGE") {
        _mint(msg.sender, 100 * 10 ** 18);
    }

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
        // NOTE: revert every 10 transfer
        if (value % 10 == 0) {
            revert("custom reason");
        }

        if (to == address(0)) {
            revert CustomError("error sig custom reason");
        }

        return super.transferFrom(from, to, value);
    }
}
