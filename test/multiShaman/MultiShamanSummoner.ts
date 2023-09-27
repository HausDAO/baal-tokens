import {
  NewBaalParams,
  SHAMAN_PERMISSIONS,
  SetupUsersParams,
  baalSetup,
  defaultDAOSettings,
  setupUsersDefault,
} from "@daohaus/baal-contracts";
import { ethers, getNamedAccounts, getUnnamedAccounts } from "hardhat";

import { CommunityVetoShaman, OnboarderShamanSummoner, SimpleEthOnboarderShaman } from "../../types";
import { encodeMockOnboarderShamanParams, summonBaal } from "../onboarderShaman/OnboarderShamanSummoner.fixture";
import { shouldHaveCommunityVetoPower, shouldSummonASuperBaal } from "./MultiShamanSummoner.behavior";
import { encodeMockVetoShamanParams } from "./MultiShamanSummoner.fixture";

// import { encodeMockOnboarderShamanParams, summonBaal } from "./OnboarderShamanSummoner.fixture";

describe("MultiShamanSummoner", function () {
  describe("Summoner", function () {
    let shamanAddress = "";
    let shamanAddress2 = "";

    let summoner: OnboarderShamanSummoner;

    beforeEach(async function () {
      const { deployer } = await getNamedAccounts();
      const [s1, s2, s3] = await getUnnamedAccounts();
      const amounts = [
        ethers.utils.parseEther(".000001"),
        ethers.utils.parseEther(".000001"),
        ethers.utils.parseEther(".000001"),
      ];

      const { Baal, Loot, Shares, MultiSend, DAI, signers, helpers } = await baalSetup({
        daoSettings: {
          ...defaultDAOSettings, // You can override dao settings
        },
        fixtureTags: ["OnboarderShamanSummoner", "MocksOnboarder", "MocksVeto", "GovernorLoot"],
        setupBaalOverride: async (params: NewBaalParams) => {
          console.log("OVERRIDE baal setup ******");
          const onboarderShamanSummoner = (await ethers.getContract(
            "OnboarderShamanSummoner",
          )) as OnboarderShamanSummoner;
          const lootTokenSingletonAddress = (await ethers.getContract("GovernorLoot")).address;
          const sharesTokenSingletonAddress = (await ethers.getContract("Shares")).address;

          const mockShamanSingleton = (await ethers.getContract(
            "SimpleEthOnboarderShaman",
            deployer,
          )) as SimpleEthOnboarderShaman;
          const mockVetoShamanSingleton = (await ethers.getContract(
            "CommunityVetoShaman",
            deployer,
          )) as CommunityVetoShaman;
          const { baalSingleton, poster, config, adminConfig } = params;
          const newBaalAddresses = await summonBaal({
            summoner: onboarderShamanSummoner,
            baalSingleton,
            poster,
            config,
            adminConfig,
            shamans: undefined,
            lootConfig: {
              name: "Governor Loot",
              symbol: "GLOOT",
              singletonAddress: lootTokenSingletonAddress,
              tos: [s1, s2, s3],
              amounts,
            },
            sharesConfig: {
              name: "Standard Shares",
              symbol: "SHARES",
              singletonAddress: sharesTokenSingletonAddress,
              tos: [s1, s2, s3],
              amounts,
            },
            shamanConfig: {
              permissions: [SHAMAN_PERMISSIONS.MANAGER, SHAMAN_PERMISSIONS.GOVERNANCE],
              setupParams: [encodeMockOnboarderShamanParams(), encodeMockVetoShamanParams()],
              singletonAddress: [mockShamanSingleton.address, mockVetoShamanSingleton.address],
            },
          });
          shamanAddress = newBaalAddresses.shamans[0];
          shamanAddress2 = newBaalAddresses.shamans[1];

          summoner = onboarderShamanSummoner;
          return newBaalAddresses;
        },
        setupUsersOverride: async (params: SetupUsersParams) => {
          console.log("OVERRIDE Users setup ******", params.addresses);
          return setupUsersDefault(params);
        },
      });

      this.helpers = helpers; // helper functions use the same daoSettings used during setup
      this.baal = Baal;
      this.loot = Loot;
      this.shares = Shares;
      this.summoner = summoner;

      this.multisend = MultiSend;
      this.dai = DAI;
      this.users = signers;
      this.unnamedUsers = [s1, s2, s3];
      this.amounts = amounts;
      this.shaman = (await ethers.getContractAt(
        "SimpleEthOnboarderShaman",
        shamanAddress,
        deployer,
      )) as SimpleEthOnboarderShaman;
      this.vetoShaman = (await ethers.getContractAt(
        "CommunityVetoShaman",
        shamanAddress2,
        deployer,
      )) as CommunityVetoShaman;
    });

    shouldSummonASuperBaal();
    shouldHaveCommunityVetoPower();
  });
});
