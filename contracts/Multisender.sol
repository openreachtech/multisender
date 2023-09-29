// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract Multisender {
    using Strings for uint256;
    using Strings for address;

    // Default gas consumption when utilizing Openzeppelin mesured by `GasMeter.sol`
    uint256 public constant baseERC20TransferGas = 28384;
    uint256 public constant basERC721TransferGas = 37573;

    // The multipler
    uint256 public constant safety = 3;

    /**
     * @dev Transfer erc20 to multiple receipients
     * Revert if the transferring operation consume `safety` times larger gas then standard
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

        uint256 baseGas = baseGas_ != 0 ? baseGas_ : baseERC20TransferGas;

        string memory failedList = "";
        uint256 total = tos.length;
        for (uint256 i = 0; i < tos.length; i++) {
            _validateLeftgas(i, total, baseGas * safety);
            if (!_transferERC20(token, tos[i], amounts[i], baseGas)) {
                failedList = string.concat(failedList, tos[i].toHexString(), ",");
            }
        }

        _assertFailedList(failedList);
    }

    /**
     * @dev Transfer erc721 to multiple receipients
     * Revert if the transferring operation consume `safety` times larger gas then standard
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

        uint256 baseGas = baseGas_ != 0 ? baseGas_ : basERC721TransferGas;

        string memory failedList = "";
        uint256 total = tos.length;
        for (uint256 i = 0; i < tos.length; i++) {
            _validateLeftgas(i, total, baseGas * safety);
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

    function _transferERC20(
        address token,
        address to,
        uint256 amount,
        uint256 baseGas
    ) internal returns (bool) {
        // NOTE: call transferFrom with gas limit to avoid gas greefing
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory data) = token.call{gas: baseGas * safety}(
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
        (bool success, ) = token.call{gas: baseGas * safety}(
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
