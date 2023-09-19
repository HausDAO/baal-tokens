import {
  NewBaalParams,
  SHAMAN_PERMISSIONS,
  SetupUsersParams,
  baalSetup,
  setupUsersDefault,
} from "@daohaus/baal-contracts";
import { ethers, getNamedAccounts, getUnnamedAccounts } from "hardhat";

import { OnboarderShamanSummoner, SimpleEthOnboarderShaman } from "../../types";
import { shouldSummonASuperBaal } from "./OnboarderShamanSummoner.behavior";
import { encodeMockOnboarderShamanParams, summonBaal } from "./OnboarderShamanSummoner.fixture";

describe("OnboarderShamanSummoner", function () {
  describe("Summoner", function () {
    let shamanAddress = "";
    let summoner: OnboarderShamanSummoner;

    beforeEach(async function () {
      const { deployer } = await getNamedAccounts();
      const [s1, s2, s3] = await getUnnamedAccounts();
      const amounts = [
        ethers.utils.parseEther(".000001"),
        ethers.utils.parseEther(".000001"),
        ethers.utils.parseEther(".000001"),
      ];

      const { Baal, Loot, Shares, MultiSend, DAI, signers } = await baalSetup({
        fixtureTags: ["OnboarderShamanSummoner", "MocksOnboarder"],
        setupBaalOverride: async (params: NewBaalParams) => {
          console.log("OVERRIDE baal setup ******");
          const onboarderShamanSummoner = (await ethers.getContract(
            "OnboarderShamanSummoner",
          )) as OnboarderShamanSummoner;
          const lootTokenSingletonAddress = (await ethers.getContract("Loot")).address;
          const sharesTokenSingletonAddress = (await ethers.getContract("Shares")).address;

          const mockShamanSingleton = (await ethers.getContract(
            "SimpleEthOnboarderShaman",
            deployer,
          )) as SimpleEthOnboarderShaman;
          const { baalSingleton, poster, config, adminConfig } = params;
          const newBaalAddresses = await summonBaal({
            summoner: onboarderShamanSummoner,
            baalSingleton,
            poster,
            config,
            adminConfig,
            shamans: undefined,
            lootConfig: {
              name: "Standard Loot",
              symbol: "LOOT",
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
              permissions: SHAMAN_PERMISSIONS.MANAGER,
              setupParams: encodeMockOnboarderShamanParams(),
              singletonAddress: mockShamanSingleton.address,
            },
          });
          shamanAddress = newBaalAddresses.shaman;
          summoner = onboarderShamanSummoner;
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
    });

    shouldSummonASuperBaal();
  });
});
