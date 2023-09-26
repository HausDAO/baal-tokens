// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MintableNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    string baseURI;

    event MetadataUpdate(uint256 _tokenId);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    constructor() ERC721("Rise of the flooters", "BAALNFT") {
        baseURI = "https://ipfs.io/ipfs/bafybeienttnmykaekixx4s7cpsve77b4s3ixs2bg4i7jnpkb3a5zjdg2sm/flooter.json";
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setBaseUri(string memory _uri) public onlyOwner {
        baseURI = _uri;
        emit BatchMetadataUpdate(0, 10000);
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        return baseURI;
    }

    function safeMint(address to) public {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }
}
