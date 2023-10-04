// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GasEater {
    mapping(bytes32 => address) private _garbage;

    fallback() external payable {
        // NOTE: eat gas
        for (uint8 i = 0; i < 10; i++) {
            _garbage[keccak256(abi.encode(msg.sender, i))] = msg.sender;
        }
    }
}
