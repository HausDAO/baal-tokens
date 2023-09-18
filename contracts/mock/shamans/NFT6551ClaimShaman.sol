// SPDX-License-Identifier: MIT
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
error TokenDoesNotExist();
error Insolvent();
error Paused();
error NotPaused();

contract NFT6551ClaimerShaman is Initializable {
    IBaal public baal;
    address public vault;

    IERC6551Registry public registry;
    IERC6551Account public tbaImp;
    IERC721 public nft;

    bool public paused;

    mapping(uint256 => uint256) public claims;

    uint256 public lootPerNft; // amount of loot to transfer
    uint256 public sharesPerNft; // amount ofshares to mint

    event Claim(address account, uint256 tokenId, uint256 timestamp, uint256 amount);

    function setup(
        address _moloch, // DAO address
        address _vault, // recipient vault
        bytes memory _initParams
    ) external initializer {
        baal = IBaal(_moloch);
        vault = _vault;
        (address _nftAddress, address _registry, address _tbaImp, uint256 _perNft, uint256 _sharesPerNft) = abi.decode(
            _initParams,
            (address, address, address, uint256, uint256)
        );
        nft = IERC721(_nftAddress);
        registry = IERC6551Registry(_registry);
        tbaImp = IERC6551Account(payable(_tbaImp));
        lootPerNft = _perNft;
        sharesPerNft = _sharesPerNft;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    // VIEW FUNCTIONS
    function isInsolvent() external view returns (bool) {
        return IERC20(baal.lootToken()).balanceOf(address(this)) < _calculate();
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
        _total = lootPerNft;
    }

    // PUBLIC FUNCTIONS

    function claim(uint256 _tokenId) public {
        // todo check that tokenId exists
        nft.ownerOf(_tokenId); // check that tokenId exists
        if (claims[_tokenId] != 0) revert AlreadyClaimed();
        if (paused) revert Paused();

        claims[_tokenId] = block.timestamp;

        uint256 _amount = _calculate(); // calculate amount of loot to transfer
        address _tba = _getTBA(_tokenId);

        _mintTokens(_tba, 1 ether); // mint 1 share
        bool success = IERC20(baal.lootToken()).transfer(_tba, _amount); // transfer loot to tba
        if (!success) revert Insolvent();
        emit Claim(msg.sender, _tokenId, block.timestamp, _amount); // TODO
    }

    function batchClaim(uint256[] memory _tokenIds) external {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            claim(_tokenIds[i]);
        }
    }

    // ADMIN FUNCTIONS

    function clawback() external onlyVault {
        if (!paused) revert NotPaused();
        IERC20(baal.lootToken()).transfer(vault, IERC20(baal.lootToken()).balanceOf(address(this)));
    }

    function togglePauseClaim() external onlyVault {
        paused = !!paused;
    }
}
