// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.7;

import "@daohaus/baal-contracts/contracts/interfaces/IBaal.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../interfaces/IERC6551Registry.sol";
import "../../interfaces/IERC6551Account.sol";

error NotVault();
error AlreadyClaimed();
error Insolvent();
error TooEarly();
error TooLate();

contract NFT6551ClaimerShaman is Initializable {
    IBaal public baal;
    address public vault;

    IERC6551Registry public registry;
    IERC6551Account public tbaImp;
    IERC721 public nft;

    uint256 public expiry;
    uint256 public start;

    mapping(uint256 => uint256) public claims;

    uint256 public perNft; // amount of loot or shares to mint

    event Claim(address account, uint256 tokenId, uint256 timestamp, uint256 amount);

    function setup(
        address _moloch, // DAO address
        address _vault, // recipient vault
        bytes memory _initParams
    ) external initializer {
        baal = IBaal(_moloch);
        vault = _vault;
        (
            address _nftAddress,
            address _registry,
            address _tbaImp,
            uint256 _perNft,
            uint256 _expiry,
            uint256 _start
        ) = abi.decode(_initParams, (address, address, address, uint256, uint256, uint256));
        nft = IERC721(_nftAddress);
        registry = IERC6551Registry(_registry);
        tbaImp = IERC6551Account(payable(_tbaImp));
        perNft = _perNft;
        expiry = _expiry;
        start = _start;
        // IERC20(baal.lootToken());
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    // PRIVATE FUNCTIONS
    function _mintTokens(address to, uint256 amount) private {
        address[] memory _receivers = new address[](1);
        _receivers[0] = to;

        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = amount;

        baal.mintShares(_receivers, _amounts); // interface to mint shares
    }

    function _getTBA(uint256 _tokenId) private view returns (address) {
        uint256 _salt = 0;
        return registry.account(address(tbaImp), block.chainid, address(nft), _tokenId, _salt);
    }

    function _calculate() private view returns (uint256 _total) {
        _total = perNft;
    }

    // PUBLIC FUNCTIONS

    function claim(uint256 _tokenId) public {
        if (block.timestamp < start) revert TooEarly();
        if (block.timestamp > expiry) revert TooLate();
        if (claims[_tokenId] != 0) revert AlreadyClaimed();

        claims[_tokenId] = block.timestamp;

        uint256 _amount = _calculate(); // calculate amount of loot to transfer
        address _tba = _getTBA(_tokenId);
        _mintTokens(msg.sender, 1 ether); // mint 1 share
        bool success = IERC20(baal.lootToken()).transfer(_tba, _amount); // transfer loot to tba
        if (!success) revert Insolvent();
        emit Claim(msg.sender, _tokenId, block.timestamp, _amount);
    }

    function batchClaim(uint256[] memory _tokenIds) external {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            claim(_tokenIds[i]);
        }
    }

    // ADMIN FUNCTIONS

    function extend(uint256 _expiry) external onlyVault {
        if (_expiry < expiry) revert TooEarly();
        expiry = _expiry;
    }

    function clawback() external onlyVault {
        if (expiry > block.timestamp) revert TooEarly();
        IERC20(baal.lootToken()).transfer(vault, IERC20(baal.lootToken()).balanceOf(address(this)));
    }

    // End Early (needed?)
    // Disable (can be done by DAO disablling the shaman)
}
