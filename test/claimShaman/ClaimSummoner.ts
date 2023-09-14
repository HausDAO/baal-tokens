import {
  NewBaalParams,
  SHAMAN_PERMISSIONS,
  SetupUsersParams,
  baalSetup,
  setupUsersDefault,
} from "@daohaus/baal-contracts";
import { ethers, getNamedAccounts } from "hardhat";

import { FixedLootShamanSummoner, NFT6551ClaimerShaman } from "../../types";
import { shouldSummonASuperBaal } from "./ClaimSummoner.behavior";
import { encodeMockClaimShamanParams, setUpNftand6551, summonBaal } from "./ClaimSummoner.fixture";

describe.only("ClaimSummoner", function () {
  describe("Summoner", function () {
    let shamanAddress = "";
    let sidecarVault = "";

    beforeEach(async function () {
      const { deployer } = await getNamedAccounts();

      const { Baal, Loot, Shares, MultiSend, DAI, signers } = await baalSetup({
        fixtureTags: [
          "BaalAndVaultSummoner",
          "FixedLootShamanSummoner",
          "FixedLoot",
          "MocksClaim",
          "MocksNFT",
          "MocksTbaReg",
        ],

        setupBaalOverride: async (params: NewBaalParams) => {
          console.log("OVERRIDE baal setup ******");
          const fixedLootShamanSummoner = (await ethers.getContract(
            "FixedLootShamanSummoner",
          )) as FixedLootShamanSummoner;
          const fixedTokenSingletonAddress = (await ethers.getContract("FixedLoot")).address;
          const sharesTokenSingletonAddress = (await ethers.getContract("Shares")).address;
          console.log(">>>>sharesTokenSingletonAddress", sharesTokenSingletonAddress);
          const mockShamanSingleton = (await ethers.getContract(
            "NFT6551ClaimerShaman",
            deployer,
          )) as NFT6551ClaimerShaman;
          console.log(">>>mockShamanSingleton", mockShamanSingleton.address);

          const { baalSingleton, poster, config, adminConfig, safeAddress, forwarderAddress, saltNonceOverride } =
            params;

          const { nft, ERC6551Reg } = await setUpNftand6551();

          console.log(">>>nft", nft.address);
          console.log(">>>ERC6551Reg", ERC6551Reg.address);

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
              setupParams: encodeMockClaimShamanParams(nft.address, ERC6551Reg.address, ethers.constants.AddressZero),
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
        "NFT6551ClaimerShaman",
        shamanAddress,
        deployer,
      )) as NFT6551ClaimerShaman;
      this.sidecarVaultAddress = sidecarVault;
    });

    shouldSummonASuperBaal();
  });
});
