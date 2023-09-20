// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "@openzeppelin/contracts/proxy/Clones.sol";

import "@daohaus/baal-contracts/contracts/interfaces/IBaal.sol";
import "@daohaus/baal-contracts/contracts/interfaces/IBaalToken.sol";

// TODO: use on upcoming release
// import "@daohaus/baal-contracts/contracts/interfaces/IBaalAndVaultSummoner.sol";

import "./HOSBase.sol";

import "../interfaces/IBaalFixedToken.sol";

// import "hardhat/console.sol";

contract FixedLootShamanSummoner is HOSBase {
    IBaalAndVaultSummoner public _baalSummoner;

    function initialize(address baalSummoner) public override {
        super.initialize(baalSummoner);
        // standard baalSummoner
        // baalAndVaultSummoner
        require(baalSummoner != address(0), "zero address");
        _baalSummonerAddress = baalSummoner;
        _baalSummoner = IBaalAndVaultSummoner(baalSummoner); //vault summoner
        emit SetSummoner(baalSummoner);
    }

    /**
     * @dev summon a new baal contract with a newly created set of loot/shares tokens
     * uses baal and vault summoner to deploy baal and side vault
     * @param postInitActions actions ran in baal setup
     * @param lootToken address
     * @param sharesToken address
     * @param saltNonce unique nonce for baal summon
     * @return baal address
     * @return vault address
     */
    function summon(
        bytes[] memory postInitActions,
        address lootToken,
        address sharesToken,
        uint256 saltNonce
    ) internal override returns (address baal, address vault) {
        (baal, vault) = _baalSummoner.summonBaalAndVault(
            abi.encode(
                IBaalFixedToken(sharesToken).name(),
                IBaalFixedToken(sharesToken).symbol(),
                address(0), // safe (0 addr creates a new one)
                address(0), // forwarder (0 addr disables feature)
                lootToken,
                sharesToken
            ),
            postInitActions,
            saltNonce, // salt nonce
            bytes32(bytes("DHFixedLootShamanSummoner")), // referrer
            string.concat(IBaalFixedToken(sharesToken).symbol(), " ", "Vault") // name
        );
    }

    /**
     * @dev deployLootToken
     * loot token is using the FixedLoot Token
     * @param initializationParams The parameters for deploying the token
     */
    function deployLootToken(bytes calldata initializationParams) internal override returns (address token) {
        (address template, bytes memory initParams) = abi.decode(initializationParams, (address, bytes));

        // ERC1967 could be upgradable
        token = address(
            new ERC1967Proxy(template, abi.encodeWithSelector(IBaalFixedToken(template).setUp.selector, initParams))
        );

        emit DeployBaalToken(token);
    }

    /**
     * @dev setUpShaman
     * NFT6551ClaimShaman
     * init params (address _nftAddress, address _registry, address _tbaImp, uint256 _perNft, uint256 _sharesPerNft)
     * @param shaman The address of the shaman
     * @param baal The address of the baal
     * @param vault The address of the vault
     * @param initializationShamanParams The parameters for deploying the token
     */
    function setUpShaman(
        address shaman,
        address baal,
        address vault,
        bytes memory initializationShamanParams
    ) internal {
        (, , bytes memory initShamanParams) = abi.decode(initializationShamanParams, (address, uint256, bytes));
        IShaman(shaman).setup(baal, vault, initShamanParams);
    }

    /**
     * @dev sets up the already deployed claim shaman with init params
     * shaman init params (address _nftAddress, address _registry, address _tbaImp, uint256 _perNft, uint256 _sharesPerNft)
     * @param initializationShamanParams shaman init params
     * @param lootToken address
     * @param sharesToken address
     * @param shaman address
     * @param baal address
     * @param vault address
     */
    function postDeployActions(
        bytes calldata initializationShamanParams,
        address lootToken,
        address sharesToken,
        address shaman,
        address baal,
        address vault
    ) internal override {
        // init shaman here
        // shaman setup with dao address, vault address and initShamanParams
        setUpShaman(shaman, baal, vault, initializationShamanParams);
        // mint initial tokens to vault here
        IBaalFixedToken(lootToken).initialMint(vault, shaman);
        // todo: remove, mint initial share to summoner for testing
        IBaalToken(sharesToken).mint(msg.sender, 123 ether);
        IBaalToken(sharesToken).pause();

        super.postDeployActions(initializationShamanParams, lootToken, sharesToken, shaman, baal, vault);
    }
}
