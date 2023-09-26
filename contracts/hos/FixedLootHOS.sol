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
    IBaalAndVaultSummoner public baalVaultSummoner;

    function initialize(address _baalVaultSummoner, address _moduleProxyFactory) public override {
        // baalAndVaultSummoner
        require(_baalVaultSummoner != address(0), "zero address");
        baalVaultSummoner = IBaalAndVaultSummoner(_baalVaultSummoner); //vault summoner
        // standard baalSummoner
        address baalSummoner = baalVaultSummoner._baalSummoner();
        super.initialize(baalSummoner, _moduleProxyFactory);
        emit SetSummoner(_baalVaultSummoner);
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
        (baal, vault) = baalVaultSummoner.summonBaalAndVault(
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
     * @param index The index of the shaman
     */
    function setUpShaman(
        address shaman,
        address baal,
        address vault,
        bytes memory initializationShamanParams,
        uint256 index
    ) internal {
        // TODO: mismatch length check, it is not checking the length of initializationShamanParams
        // against the length of shamans
        (, , bytes[] memory initShamanDeployParams) = abi.decode(
            initializationShamanParams,
            (address, uint256, bytes[])
        );
        IShaman(shaman).setup(baal, vault, initShamanDeployParams[index]);
    }

    /**
     * @dev sets up the already deployed claim shaman with init params
     * shaman init params (address _nftAddress, address _registry, address _tbaImp, uint256 _perNft, uint256 _sharesPerNft)
     * @param initializationShamanParams shaman init params
     * @param lootToken address
     * @param sharesToken address
     * @param shamans IShamans
     * @param baal address
     * @param vault address
     */
    function postDeployShamanActions(
        bytes calldata initializationShamanParams,
        address lootToken,
        address sharesToken,
        address[] memory shamans,
        address baal,
        address vault
    ) internal override {
        // init shaman here
        // shaman setup with dao address, vault address and initShamanParams
        for (uint256 i = 0; i < shamans.length; i++) {
            setUpShaman(shamans[i], baal, vault, initializationShamanParams, i);
        }

        super.postDeployShamanActions(initializationShamanParams, lootToken, sharesToken, shamans, baal, vault);
    }

    /**
     * @dev sets up the already deployed claim shaman with init params
     * shaman init params (address _nftAddress, address _registry, address _tbaImp, uint256 _perNft, uint256 _sharesPerNft)
     * @param initializationLootParams shaman init params
     * @param lootToken address
     * @param sharesToken address
     * @param shamans IShamans
     * @param baal address
     * @param vault address
     */
    function postDeployLootActions(
        bytes calldata initializationLootParams,
        address lootToken,
        address sharesToken,
        address[] memory shamans,
        address baal,
        address vault
    ) internal override {
        // init shaman here
        // shaman setup with dao address, vault address and initShamanParams
        // first shaman should be the claim contract
        (, bytes memory initDeployParams) = abi.decode(initializationLootParams, (address, bytes));
        IBaalFixedToken(lootToken).initialMint(vault, shamans[0], initDeployParams);

        super.postDeployLootActions(initializationLootParams, lootToken, sharesToken, shamans, baal, vault);
    }

    /**
     * @dev sets up the already deployed claim shaman with init params
     * shaman init params (address _nftAddress, address _registry, address _tbaImp, uint256 _perNft, uint256 _sharesPerNft)
     * @param initializationShareParams shaman init params
     * @param lootToken address
     * @param sharesToken address
     * @param shamans IShamans
     * @param baal address
     * @param vault address
     */
    function postDeploySharesActions(
        bytes calldata initializationShareParams,
        address lootToken,
        address sharesToken,
        address[] memory shamans,
        address baal,
        address vault
    ) internal override {
        // todo: remove, mint initial share to summoner for testing
        IBaalToken(sharesToken).mint(msg.sender, 3 ether);
        IBaalToken(sharesToken).pause();

        super.postDeploySharesActions(initializationShareParams, lootToken, sharesToken, shamans, baal, vault);
    }
}
