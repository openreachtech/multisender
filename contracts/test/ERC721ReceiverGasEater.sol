// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ERC721ReceiverGasEater is IERC721Receiver {
    mapping(bytes32 => bytes) private _garbage;

    function onERC721Received(
        address caller,
        address from,
        uint256 tokenId,
        bytes memory data
    ) external override returns (bytes4) {
        // NOTE: eat gas
        _garbage[keccak256(abi.encode(caller, from, tokenId))] = data;

        return IERC721Receiver.onERC721Received.selector;
    }
}
