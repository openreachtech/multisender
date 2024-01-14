// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @dev Send ERC20/ERC721 to multiple account at once
 *
 * Features:
 *  - No transaction fees
 *  - Protection against gas griefing
 *  - User-friendly error messages: Lists each address if transfer fails
 *  - Audited using the reputable tool(=`slither`)
 *
 */
contract Multisender {
    using Strings for uint256;
    using Strings for address;

    // Fixed gas consumption when `transfer` is called
    uint256 public constant TRANSFER_GAS = 2300;

    // Default gas consumption when utilizing Openzeppelin mesured by `GasMeter.sol`
    uint256 public constant BASE_ERC20_TRANSFER_GAS = 28384;
    uint256 public constant BASE_ERC721_TRANSFER_GAS = 37573;

    // The multiplier to calculate max consumable gas
    uint256 public constant MAX_GAS_MULTIPLIER = 3;

    error FailedInnerCall();

    /**
     * @dev Transfer native token to multiple receipients
     * Revert if the transferring operation consume larger gas then standard
     * The native opcode `transfer` consume 2300 gas, but the actual gas consumption
     * become larger than it when the receipient is a contract.
     * Ref: https://consensys.io/diligence/blog/2019/09/stop-using-soliditys-transfer-now/
     *
     * @param tos list of receipient addresses
     * @param amounts list of amounts
     * @param baseGas_ the basic gas consumption of transferring operation
     */
    function multisend(
        address[] calldata tos,
        uint256[] calldata amounts,
        uint256 baseGas_
    ) public payable {
        require(tos.length == amounts.length, "tos and amounts must have the same length");

        uint256 baseGas = baseGas_ != 0 ? baseGas_ : TRANSFER_GAS;

        uint256 sum = 0;
        string memory failedList = "";
        uint256 failedCount = 0;
        for (uint256 i = 0; i < tos.length; i++) {
            sum += amounts[i];
            if (!_transfer(tos[i], amounts[i], baseGas)) {
                failedList = string.concat(failedList, tos[i].toHexString(), ",");
                failedCount++;
            }
        }

        require(sum == msg.value, "sum of amounts must be equal to msg.value");

        _assertFailedList(failedList, failedCount);
    }

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
        uint256 failedCount = 0;
        for (uint256 i = 0; i < tos.length; i++) {
            (bool success, string memory reason) = _transferGenericWithErrMesage(
                token,
                baseGas,
                "transferFrom(address,address,uint256)",
                abi.encode(msg.sender, tos[i], amounts[i])
            );

            if (!success) {
                bool isLast = i == tos.length - 1;
                failedList = _formatErrMsg(failedList, tos[i], reason, isLast);
                failedCount++;
            }
        }

        _assertFailedList(failedList, failedCount);
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
        uint256 failedCount = 0;
        for (uint256 i = 0; i < tos.length; i++) {
            (bool success, string memory reason) = _transferGenericWithErrMesage(
                token,
                baseGas,
                "safeTransferFrom(address,address,uint256,bytes)",
                abi.encode(msg.sender, tos[i], tokenIds[i], data[i])
            );

            if (!success) {
                bool isLast = i == tos.length - 1;
                failedList = _formatErrMsg(failedList, tos[i], reason, isLast);
                failedCount++;
            }
        }

        _assertFailedList(failedList, failedCount);
    }

    function mesureAverageGasERC20(
        address token,
        address[] calldata tos,
        uint256[] calldata amounts
    ) public payable returns (uint256) {
        uint256 sum = 0;
        uint256 max = 0;
        uint256 min = 1 << 255;
        for (uint256 i = 0; i < tos.length; i++) {
            uint256 startGas = gasleft();
            IERC20(token).transferFrom(msg.sender, tos[i], amounts[i]);
            uint256 used = startGas - gasleft();
            if (used > max) max = used;
            if (used < min) min = used;
            sum += used;
        }
        _revertWithGasMsg(sum, sum / tos.length, max, min, "Mesured gas >");
    }

    function mesureAverageGasERC721(
        address token,
        address[] calldata tos,
        uint256[] calldata tokenIds,
        bytes[] calldata data
    ) public payable returns (uint256) {
        uint256 sum = 0;
        uint256 max = 0;
        uint256 min = 1 << 255;
        for (uint256 i = 0; i < tos.length; i++) {
            uint256 startGas = gasleft();
            IERC721(token).safeTransferFrom(msg.sender, tos[i], tokenIds[i], data[i]);
            uint256 used = startGas - gasleft();
            if (used > max) max = used;
            if (used < min) min = used;
            sum += used;
        }
        _revertWithGasMsg(sum, sum / tos.length, max, min, "Mesured gas >");
    }

    function _transfer(address to, uint256 amount, uint256 baseGas) internal returns (bool) {
        // NOTE: call transferFrom with gas limit to avoid gas greefing
        // slither-disable-next-line arbitrary-send-eth
        (bool success, ) = to.call{gas: baseGas, value: amount}("");
        return success;
    }

    function _transferGeneric(
        address target,
        uint256 baseGas,
        string memory functionSignature,
        bytes memory args
    ) internal returns (bool) {
        // NOTE: call with gas limit to avoid gas greefing
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory data) = target.call{gas: baseGas * MAX_GAS_MULTIPLIER}(
            abi.encodePacked(bytes4(keccak256(bytes(functionSignature))), args)
        );

        // If the function returns a boolean, decode it. Otherwise, just return the success flag.
        if (data.length == 32) {
            return success && abi.decode(data, (bool));
        }
        return success;
    }

    function _transferGenericWithErrMesage(
        address target,
        uint256 baseGas,
        string memory functionSignature,
        bytes memory args
    ) internal returns (bool, string memory) {
        // NOTE: call with gas limit to avoid gas greefing
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory data) = target.call{gas: baseGas * MAX_GAS_MULTIPLIER}(
            abi.encodePacked(bytes4(keccak256(bytes(functionSignature))), args)
        );

        if (success) {
            // If the function returns a boolean, decode it. Otherwise, just return the success flag.
            if (data.length == 32) {
                return (abi.decode(data, (bool)), "");
            }
            // otherwise, return success
            return (success, "");
        }

        if (data.length > 0) {
            // if error is string type
            if (bytes4(data) == bytes4(keccak256("Error(string)"))) {
                string memory reason;
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    // Get the pointer to the free memory
                    reason := mload(0x40)

                    // Calculate the length of the string (data length - 36)
                    let length := sub(mload(data), 36)

                    // Set the length of the string in memory
                    mstore(reason, length)

                    // Copy the string data to the memory
                    // Data starts at position 68 in the 'data' (36 bytes offset + 32 bytes length prefix)
                    let dataStart := add(data, 68)
                    let dataEnd := add(dataStart, length)
                    for {
                        let i := dataStart
                    } lt(i, dataEnd) {
                        i := add(i, 0x20)
                    } {
                        mstore(add(reason, sub(i, dataStart)), mload(i))
                    }

                    // Update the free memory pointer
                    // Add 32 bytes for the length field and round up length to nearest 32-byte word
                    mstore(0x40, add(add(reason, length), iszero(mod(length, 32))))
                }

                return (success, reason);
            }

            // otherwise, revert imeediately
            // solhint-disable-next-line no-inline-assembly
            assembly {
                let returndata_size := mload(data)
                revert(add(32, data), returndata_size)
            }
        }

        // failed but no error message
        return (success, "no error message supplied, possibly insufficient gas");
    }

    function _formatErrMsg(
        string memory parent,
        address target,
        string memory reason,
        bool isLast
    ) internal pure returns (string memory) {
        string memory base = string.concat(parent, target.toHexString(), "|", reason);
        return isLast ? base : string.concat(base, ",");
    }

    function _assertFailedList(string memory failedList, uint256 failedCount) internal pure {
        // failedList is empty
        if (bytes(failedList).length == 0) {
            return;
        }

        revert(
            string.concat(
                "failed to transfer to ",
                failedCount.toString(),
                " addresses: ",
                failedList
            )
        );
    }

    function _revertWithGasMsg(
        uint256 sum,
        uint256 avarage,
        uint256 max,
        uint256 min,
        string memory msg_
    ) internal pure {
        revert(
            string.concat(
                msg_,
                " sum: ",
                sum.toString(),
                ", avarage: ",
                avarage.toString(),
                ", max: ",
                max.toString(),
                ", min: ",
                min.toString()
            )
        );
    }
}
