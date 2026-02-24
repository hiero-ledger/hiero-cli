// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract CustomERC721 is ERC721 {
    using Address for address;

    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public totalMinted;

    mapping(uint256 => uint256) public mintTimestamp;

    error MaxSupplyReached();
    error ZeroAddress();

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {}

    /**
     * @dev Custom mint logic (non-safe)
     */
    function mint(address to, uint256 tokenId) public virtual {
        if (to == address(0)) revert ZeroAddress();
        if (totalMinted >= MAX_SUPPLY) revert MaxSupplyReached();

        // Call OpenZeppelin internal mint
        _mint(to, tokenId);

        // Custom logic AFTER mint
        totalMinted++;
        mintTimestamp[tokenId] = block.timestamp;
    }
}