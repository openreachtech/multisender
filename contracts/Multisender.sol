// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev Send ERC20/ERC721 to multiple account at once
 *
 * Features:
 *  No transaction fees
 *  Protection against gas griefing
 *  User-friendly error messages: Lists each address if transfer fails
 *  Audited using the reputable tool(=`slither`)
 *
 */
contract Multisender {
    using Strings for uint256;
    using Strings for address;

    // Default gas consumption when utilizing Openzeppelin mesured by `GasMeter.sol`
    uint256 public constant BASE_ERC20_TRANSFER_GAS = 28384;
    uint256 public constant BASE_ERC721_TRANSFER_GAS = 37573;

    // The multiplier to calculate max consumable gas
    uint256 public constant MAX_GAS_MULTIPLIER = 3;

    /**
     * @dev Transfer erc20 to multiple receipients
     * Revert if the transferring operation consume `MAX_GAS_MULTIPLIER` times larger gas then standard
     *
     * @param token address of token
     * @param tos list of receipient addresses
     * @param amounts list of amounts
     * @param baseGas_ the basic gas consumption of transferring operation
     */
    function multisendERC20(
        address token,
        address[] calldata tos,
        uint256[] calldata amounts,
        uint256 baseGas_
    ) public {
        require(token != address(0), "token address cannot be 0");
        require(tos.length == amounts.length, "tos and amounts must have the same length");

        uint256 baseGas = baseGas_ != 0 ? baseGas_ : BASE_ERC20_TRANSFER_GAS;

        string memory failedList = "";
        uint256 total = tos.length;
        for (uint256 i = 0; i < tos.length; i++) {
            _validateLeftgas(i, total, baseGas * MAX_GAS_MULTIPLIER);
            if (!_transferERC20(token, tos[i], amounts[i], baseGas)) {
                failedList = string.concat(failedList, tos[i].toHexString(), ",");
            }
        }

        _assertFailedList(failedList);
    }

    /**
     * @dev Transfer erc721 to multiple receipients
     * Revert if the transferring operation consume `MAX_GAS_MULTIPLIER` times larger gas then standard
     *
     * @param token address of token
     * @param tos list of receipient addresses
     * @param tokenIds list of tokenIds
     * @param data list of data
     * @param baseGas_ the basic gas consumption of transferring operation
     */
    function multisendERC721(
        address token,
        address[] calldata tos,
        uint256[] calldata tokenIds,
        bytes[] calldata data,
        uint256 baseGas_
    ) public {
        require(token != address(0), "token address cannot be 0");
        require(tos.length == tokenIds.length, "tos and tokenIds must have the same length");
        require(tos.length == data.length, "tos and data must have the same length");

        uint256 baseGas = baseGas_ != 0 ? baseGas_ : BASE_ERC721_TRANSFER_GAS;

        string memory failedList = "";
        uint256 total = tos.length;
        for (uint256 i = 0; i < tos.length; i++) {
            _validateLeftgas(i, total, baseGas * MAX_GAS_MULTIPLIER);
            if (!_safeTransferERC721(token, tos[i], tokenIds[i], data[i], baseGas)) {
                failedList = string.concat(failedList, tos[i].toHexString(), ",");
            }
        }

        _assertFailedList(failedList);
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

    function _assertFailedList(string memory failedList) internal pure {
        bytes32 length;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            length := mload(failedList)
        }

        if (uint256(length) > 0) {
            revert(
                string.concat(
                    "failed to transfer to ",
                    // NOTE: 43 length = address + ","
                    (uint256(length) / 43).toString(),
                    " addresses: ",
                    failedList
                )
            );
        }
    }

    function _transferERC20(
        address token,
        address to,
        uint256 amount,
        uint256 baseGas
    ) internal returns (bool) {
        // NOTE: call transferFrom with gas limit to avoid gas greefing
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory data) = token.call{gas: baseGas * MAX_GAS_MULTIPLIER}(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                to,
                amount
            )
        );
        return success && abi.decode(data, (bool));
    }

    function _safeTransferERC721(
        address token,
        address to,
        uint256 tokenId,
        bytes calldata data,
        uint256 baseGas
    ) internal returns (bool) {
        // NOTE: call transferFrom with gas limit to avoid gas greefing
        // slither-disable-next-line low-level-calls
        (bool success, ) = token.call{gas: baseGas * MAX_GAS_MULTIPLIER}(
            abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256,bytes)",
                msg.sender,
                to,
                tokenId,
                data
            )
        );

        return success;
    }
}
