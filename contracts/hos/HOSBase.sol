// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@gnosis.pm/zodiac/contracts/factory/ModuleProxyFactory.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "@daohaus/baal-contracts/contracts/interfaces/IBaal.sol";
import "@daohaus/baal-contracts/contracts/interfaces/IBaalToken.sol";

// TODO: use on upcoming release
// import "@daohaus/baal-contracts/contracts/interfaces/IBaalAndVaultSummoner.sol";

import "../interfaces/IShaman.sol";
import "../interfaces/IBaalFixedToken.sol";
import "../interfaces/IBaalAndVaultSummoner.sol";

// import "hardhat/console.sol";

contract HOSBase is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    address public _baalSummonerAddress;

    event SetSummoner(address summoner);

    event DeployBaalToken(address tokenAddress);

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    /**
     * @dev Sets the address of the BaalSummoner contract (vault summoner hos)
     * @param baalSummoner The address of the BaalSummoner contract
     */
    function setUp(address baalSummoner) public virtual onlyOwner {
        // lower hos in override
        emit SetSummoner(baalSummoner);
    }

    /**
     * @dev Summon a new Baal contract with a new set of tokens
     * @param initializationLootTokenParams The parameters for deploying the token
     * @param initializationShareTokenParams The parameters for deploying the token
     * @param initializationShamanParams  The parameters for deploying the shaman
     * @param postInitializationActions The actions to be performed after the initialization
     */
    function summonBaalFromReferrer(
        bytes calldata initializationLootTokenParams,
        bytes calldata initializationShareTokenParams,
        bytes calldata initializationShamanParams,
        bytes[] memory postInitializationActions
    ) external virtual {
        // summon tokens
        address lootToken = deployLootToken(initializationLootTokenParams);

        address sharesToken = deploySharesToken(initializationShareTokenParams);

        (bytes[] memory amendedPostInitActions, IShaman shaman) = deployShaman(
            postInitializationActions,
            initializationShamanParams
        );

        // summon baal with new tokens
        (address baal, address vault) = summon(amendedPostInitActions, lootToken, sharesToken);

        postDeployActions(initializationShamanParams, lootToken, sharesToken, address(shaman), baal, vault);
    }

    // TODO: Summon virtual function that could use other summoners
    function summon(
        bytes[] memory postInitActions,
        address lootToken,
        address sharesToken
    ) internal virtual returns (address baal, address vault) {}

    function postDeployActions(
        bytes calldata initializationShamanParams,
        address lootToken,
        address sharesToken,
        address shaman,
        address baal,
        address vault
    ) internal virtual {
        // change token ownership to baal
        // TODO: in some cases transfer ownership will not work
        IBaalToken(lootToken).transferOwnership(address(baal));
        IBaalToken(sharesToken).transferOwnership(address(baal));
    }

    /**
     * @dev deployLootToken
     * @param initializationParams The parameters for deploying the token
     */
    function deployLootToken(bytes calldata initializationParams) internal virtual returns (address token) {
        return deployToken(initializationParams);
    }

    /**
     * @dev deploySharesToken
     * @param initializationParams The parameters for deploying the token
     */
    function deploySharesToken(bytes calldata initializationParams) internal virtual returns (address token) {
        return deployToken(initializationParams);
    }

    function deployToken(bytes calldata initializationParams) private returns (address token) {
        // todo: support bring your own token
        // maybe if initPrams is empty, then use template as token
        (address template, bytes memory initParams) = abi.decode(initializationParams, (address, bytes));

        (string memory name, string memory symbol) = abi.decode(initParams, (string, string));

        // ERC1967 could be upgradable
        token = address(
            new ERC1967Proxy(template, abi.encodeWithSelector(IBaalToken(template).setUp.selector, name, symbol))
        );

        emit DeployBaalToken(token);
    }

    function deployShaman(
        bytes[] memory postInitializationActions,
        bytes memory initializationShamanParams
    ) internal returns (bytes[] memory amendedPostInitActions, IShaman shaman) {
        // summon shaman
        // (address template, uint256 permissions, bytes memory initParams)
        (address shamanTemplate, uint256 perm, ) = abi.decode(initializationShamanParams, (address, uint256, bytes));
        // Clones because it should not need to be upgradable
        shaman = IShaman(payable(Clones.clone(shamanTemplate)));

        uint256 actionsLength = postInitializationActions.length;
        // amend postInitializationActions to include shaman setup
        amendedPostInitActions = new bytes[](actionsLength + 1);
        address[] memory shamans = new address[](1);
        uint256[] memory permissions = new uint256[](1);
        // Clones because it should not need to be upgradable
        shamans[0] = address(shaman);
        permissions[0] = perm;

        // copy over the rest of the actions
        for (uint256 i = 0; i < actionsLength; i++) {
            amendedPostInitActions[i] = postInitializationActions[i];
        }
        amendedPostInitActions[actionsLength] = abi.encodeWithSignature(
            "setShamans(address[],uint256[])",
            shamans,
            permissions
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
