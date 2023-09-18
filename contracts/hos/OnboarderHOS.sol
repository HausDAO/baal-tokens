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

contract OnboarderShamanSummoner is HOSBase {
    function setUp(address baalSummoner) public override onlyOwner {
        // baalAndVaultSummoner
        require(baalSummoner != address(0), "zero address");
        _baalSummoner = IBaalAndVaultSummoner(baalSummoner); //vault summoner
        super.setUp(baalSummoner);
    }

    function setUpShaman(
        address shaman,
        address baal,
        address vault,
        bytes memory initializationShamanParams
    ) internal {
        (, , bytes memory initShamanParams) = abi.decode(initializationShamanParams, (address, uint256, bytes));
        IShaman(shaman).setup(baal, vault, initShamanParams);
    }

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

        super.postDeployActions(initializationShamanParams, lootToken, sharesToken, shaman, baal, vault);
    }
}