import {
  NewBaalParams,
  SHAMAN_PERMISSIONS,
  SetupUsersParams,
  baalSetup,
  setupUsersDefault,
} from "@daohaus/baal-contracts";
import { ethers, getNamedAccounts } from "hardhat";

import { FixedLootShamanSummoner, SimpleEthOnboarderShaman } from "../../types";
import { shouldSummonASuperBaal } from "./FixedLootShamanSummoner.behavior";
import { encodeMockOnboarderShamanParams, summonBaal } from "./FixedLootShamanSummoner.fixture";

describe("FixedLootShamanSummoner", function () {
  describe("Summoner", function () {
    let shamanAddress = "";
    let sidecarVault = "";

    beforeEach(async function () {
      const { deployer } = await getNamedAccounts();
      const { Baal, Loot, Shares, MultiSend, DAI, signers } = await baalSetup({
        fixtureTags: ["BaalAndVaultSummoner", "FixedLootShamanSummoner", "FixedLoot", "MocksOnboarder"],
        setupBaalOverride: async (params: NewBaalParams) => {
          console.log("OVERRIDE baal setup ******");
          const fixedLootShamanSummoner = (await ethers.getContract(
            "FixedLootShamanSummoner",
          )) as FixedLootShamanSummoner;
          const fixedTokenSingletonAddress = (await ethers.getContract("FixedLoot")).address;
          const sharesTokenSingletonAddress = (await ethers.getContract("Shares")).address;
          const mockShamanSingleton = (await ethers.getContract(
            "SimpleEthOnboarderShaman",
            deployer,
          )) as SimpleEthOnboarderShaman;
          const { baalSingleton, poster, config, adminConfig, safeAddress, forwarderAddress, saltNonceOverride } =
            params;
          const newBaalAddresses = await summonBaal({
            summoner: fixedLootShamanSummoner,
            baalSingleton,
            poster,
            config,
            adminConfig,
            shamans: undefined,
            safeAddress,
            forwarderAddress,
            saltNonceOverride,
            lootConfig: {
              name: "Fixed Loot",
              symbol: "FLOOT",
              supply: ethers.utils.parseEther("1000000"),
              singletonAddress: fixedTokenSingletonAddress,
            },
            sharesConfig: {
              name: "Standard Shares",
              symbol: "SHARES",
              supply: ethers.utils.parseEther("0"),
              singletonAddress: sharesTokenSingletonAddress,
            },
            shamanConfig: {
              permissions: SHAMAN_PERMISSIONS.MANAGER,
              setupParams: encodeMockOnboarderShamanParams(),
              singletonAddress: mockShamanSingleton.address,
            },
          });
          shamanAddress = newBaalAddresses.shaman;
          sidecarVault = newBaalAddresses.sidecarVault;
          return newBaalAddresses;
        },
        setupUsersOverride: async (params: SetupUsersParams) => {
          console.log("OVERRIDE Users setup ******", params.addresses);
          return setupUsersDefault(params);
        },
      });

      this.baal = Baal;
      this.loot = Loot;
      this.shares = Shares;
      this.multisend = MultiSend;
      this.dai = DAI;
      this.users = signers;
      this.shaman = (await ethers.getContractAt(
        "SimpleEthOnboarderShaman",
        shamanAddress,
        deployer,
      )) as SimpleEthOnboarderShaman;
      this.sidecarVaultAddress = sidecarVault;
    });

    shouldSummonASuperBaal();
  });
});
