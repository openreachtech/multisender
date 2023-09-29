// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @dev Measure the gas consumed during the transfer of ERC20 and ERC721 tokens
 */
contract GasMeter {
    using Strings for uint256;

    event ConsumedGas(uint256[] consumeds);

    function mesureERC20Transfer(
        IERC20 token,
        address[] calldata tos,
        uint256[] calldata amounts
    ) public {
        require(tos.length == amounts.length, "tos and amounts must have the same length");

        uint256[] memory consumedGas = new uint256[](tos.length);
        for (uint256 i = 0; i < tos.length; i++) {
            uint256 startGas = gasleft();
            require(token.transferFrom(msg.sender, tos[i], amounts[i]), "transferFrom failed");
            uint256 endGas = gasleft();
            consumedGas[i] = startGas - endGas;
        }

        emit ConsumedGas(consumedGas);
    }

    function mesureERC721Transfer(
        IERC721 token,
        address[] calldata tos,
        uint256[] calldata tokenIds
    ) public {
        require(tos.length == tokenIds.length, "tos and tokenIds must have the same length");

        uint256[] memory consumedGas = new uint256[](tos.length);
        for (uint256 i = 0; i < tos.length; i++) {
            uint256 startGas = gasleft();
            token.transferFrom(msg.sender, tos[i], tokenIds[i]);
            uint256 endGas = gasleft();
            consumedGas[i] = startGas - endGas;
        }

        emit ConsumedGas(consumedGas);
    }
}
