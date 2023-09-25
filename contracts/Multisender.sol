// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {IERC20} from "./interfaces/IERC20.sol";
import {LibString} from "./libraries/LibString.sol";

contract Multisender {
    using LibString for uint256;
    using LibString for address;

    uint256 public immutable standardERC20TransferGas;

    constructor(uint256 customStandardERC20TransferGas) {
        standardERC20TransferGas = customStandardERC20TransferGas > 0
            ? customStandardERC20TransferGas
            : 28348;
    }

    function multisendERC20(
        address token,
        address[] calldata tos,
        uint256[] calldata amounts
    ) public {
        require(token != address(0), "token address cannot be 0");
        require(tos.length == amounts.length, "tos and amounts must have the same length");

        string memory failedList;
        uint256 total = tos.length;
        for (uint256 i = 0; i < tos.length; i++) {
            _validateLeftgas(i, total, standardERC20TransferGas * 2);
            if (!_transferERC20(token, tos[i], amounts[i])) {
                failedList = string.concat(failedList, tos[i].toHexString(), ",");
            }
        }

        bytes32 length;
        assembly {
            length := mload(failedList)
        }

        if (uint256(length) > 0) {
            revert(
                string.concat(
                    "failed to transfer to ",
                    (uint256(length) / 43).toString(),
                    " addresses: ",
                    failedList
                )
            );
        }
    }

    function _validateLeftgas(uint256 i, uint256 total, uint256 requiredGas) internal view {
        if (gasleft() < requiredGas) {
            revert(
                string.concat(
                    "will run out of gas at index ",
                    (i + 1).toString(),
                    " in ",
                    total.toString(),
                    ", left: ",
                    gasleft().toString(),
                    " required: ",
                    requiredGas.toString()
                )
            );
        }
    }

    function _transferERC20(address token, address to, uint256 amount) internal returns (bool) {
        // NOTE: call transferFrom with gas limit to avoid gas greefing
        (bool success, bytes memory data) = token.call{gas: standardERC20TransferGas * 2}(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                to,
                amount
            )
        );
        return success && abi.decode(data, (bool));
    }

    function _printAddresses(address[] memory addrs) internal pure returns (string memory str) {
        for (uint256 i = 0; i < addrs.length; i++) {
            str = string.concat(str, ",", addrs[i].toHexString(), "\n");
        }
    }
}
