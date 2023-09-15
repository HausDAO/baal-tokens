import {
  Baal,
  DAOSettings,
  NewBaalAddresses,
  Poster,
  SHAMAN_PERMISSIONS,
  defaultMetadataConfig,
} from "@daohaus/baal-contracts";
import { BigNumberish, ContractTransaction } from "ethers";
import { ethers, getUnnamedAccounts } from "hardhat";
import { Log } from "hardhat-deploy/types";

import { ERC6551Registry, FixedLootShamanSummoner, MintableNFT } from "../../types";

export const abiCoder = ethers.utils.defaultAbiCoder;

export type LootTokenSetup = {
  name: string;
  symbol: string;
  initialHolders: string[];
  initialAmounts: BigNumberish[];
  singletonAddress: string;
};

export type SharesTokenSetup = {
  name: string;
  symbol: string;
  singletonAddress: string;
};

export type ShamanConfig = {
  singletonAddress: string;
  permissions: SHAMAN_PERMISSIONS;
  setupParams: string;
};

export const setUpNftand6551 = async () => {
  const [s1, s2, s3] = await getUnnamedAccounts();
  const nft = (await ethers.getContract("MintableNFT")) as MintableNFT;
  const ERC6551Reg = (await ethers.getContract("ERC6551Registry")) as ERC6551Registry;
  await mintNfts(nft.address, [s1, s2, s3]);
  return { nft, ERC6551Reg };
};

export const encodeMockClaimShamanParams = function (nftAddress: string, registry: string, tbaImp: string) {
  // address _nftAddress,
  // address _registry,
  // address _tbaImp,
  // uint256 _perNft,

  const perNft = 100;

  const shamanParams = abiCoder.encode(
    ["address", "address", "address", "uint256"],
    [nftAddress, registry, tbaImp, perNft],
  );
  return shamanParams;
};

export const encodeBaalInitAction = async function (
  baal: Baal,
  poster: Poster,
  config: DAOSettings,
  adminConfig: [boolean, boolean],
  shamans?: [string[], number[]],
) {
  const governanceConfig = abiCoder.encode(
    ["uint32", "uint32", "uint256", "uint256", "uint256", "uint256"],
    [
      config.VOTING_PERIOD_IN_SECONDS,
      config.GRACE_PERIOD_IN_SECONDS,
      config.PROPOSAL_OFFERING,
      config.QUORUM_PERCENT,
      config.SPONSOR_THRESHOLD,
      config.MIN_RETENTION_PERCENT,
    ],
  );

  const initalizationActions: Array<string> = [];

  const setAdminConfig = baal.interface.encodeFunctionData("setAdminConfig", adminConfig);
  initalizationActions.push(setAdminConfig);
  const setGovernanceConfig = baal.interface.encodeFunctionData("setGovernanceConfig", [governanceConfig]);
  initalizationActions.push(setGovernanceConfig);
  if (shamans) {
    const setShaman = baal.interface.encodeFunctionData("setShamans", shamans);
    initalizationActions.push(setShaman);
  }
  const postMetaData = poster.interface.encodeFunctionData("post", [
    defaultMetadataConfig.CONTENT,
    defaultMetadataConfig.TAG,
  ]);
  const posterFromBaal = baal.interface.encodeFunctionData("executeAsBaal", [poster.address, 0, postMetaData]);
  initalizationActions.push(posterFromBaal);

  return initalizationActions;
};

export const getNewBaalAddresses = async (
  tx: ContractTransaction,
): Promise<NewBaalAddresses & { shaman: string; sidecarVault: string }> => {
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  const baalSummonAbi = [
    "event SummonBaal(address indexed baal, address indexed loot, address indexed shares, address safe, address forwarder, uint256 existingAddrs)",
    "event ShamanSet(address indexed shaman, uint256 permission)",
  ];
  const summonerAbi = ["event DeployBaalSafe(address baalSafe, address moduleAddr)"];
  const iface = new ethers.utils.Interface(baalSummonAbi);
  const summonerIface = new ethers.utils.Interface(summonerAbi);
  // SummonBaal event
  const baalEventTopic = iface.getEventTopic("SummonBaal(address,address,address,address,address,uint256)");
  const baalEventLog = receipt.logs.find((log: Log) => log.topics.includes(baalEventTopic));
  if (baalEventLog) {
    const log = iface.parseLog(baalEventLog);
    const { baal, loot, shares, safe } = log.args;
    // ShamanSet event
    const shamanEventTopic = iface.getEventTopic("ShamanSet(address,uint256)");
    const shamanEventLog = receipt.logs.find((log: Log) => log.topics.includes(shamanEventTopic));
    if (!shamanEventLog) throw Error("Shaman Event not found");
    const shamanLog = iface.parseLog(shamanEventLog);
    const { shaman } = shamanLog.args;
    // SetVault event
    const vaultEventTopic = summonerIface.getEventTopic("DeployBaalSafe(address,address)");
    // NOTICE: reverse array order to get the latest event
    const vaultEventLog = receipt.logs.reverse().find((log: Log) => log.topics.includes(vaultEventTopic));
    if (!vaultEventLog) throw Error("Vault Event not found");
    const vaultLog = summonerIface.parseLog(vaultEventLog);
    const { baalSafe } = vaultLog.args;
    return { baal, loot, shares, safe, shaman, sidecarVault: baalSafe };
  }
  throw Error("Summon Event not found");
};

type NewBaalConfig = {
  summoner: FixedLootShamanSummoner;
  baalSingleton: Baal;
  poster: Poster;
  config: DAOSettings;
  adminConfig: [boolean, boolean];
  shamans?: [string[], number[]];
  lootAddress?: `0x${string}`;
  sharesAddress?: `0x${string}`;
  lootConfig: LootTokenSetup;
  sharesConfig: SharesTokenSetup;
  shamanConfig: ShamanConfig;
};

export const mintNfts = async (nftAddress: string, to: string[]) => {
  const nft = await ethers.getContractAt("MintableNFT", nftAddress);
  for (const address of to) {
    await nft.safeMint(address);
  }
};

export const summonBaal = async ({
  summoner,
  baalSingleton,
  poster,
  config,
  adminConfig,
  shamans,
  shamanConfig,
  sharesConfig,
  lootConfig,
}: NewBaalConfig) => {
  const postInitializationActions = await encodeBaalInitAction(baalSingleton, poster, config, adminConfig, shamans);

  const lootParams = abiCoder.encode(
    ["string", "string", "address[]", "uint256[]"],
    [lootConfig.name, lootConfig.symbol, lootConfig.initialHolders, lootConfig.initialAmounts],
  );
  console.log(">>>", [lootConfig.name, lootConfig.symbol, lootConfig.initialHolders, lootConfig.initialAmounts]);
  const initializationLootTokenParams = abiCoder.encode(
    ["address", "bytes"],
    [lootConfig.singletonAddress, lootParams],
  );
  const sharesParams = abiCoder.encode(["string", "string"], [sharesConfig.name, sharesConfig.symbol]);
  const initializationShareTokenParams = abiCoder.encode(
    ["address", "bytes"],
    [sharesConfig.singletonAddress, sharesParams],
  );
  const initializationShamanParams = abiCoder.encode(
    ["address", "uint256", "bytes"],
    [shamanConfig.singletonAddress, shamanConfig.permissions, shamanConfig.setupParams],
  );

  const tx = await summoner.summonBaalFromReferrer(
    initializationLootTokenParams,
    initializationShareTokenParams,
    initializationShamanParams,
    postInitializationActions,
  );
  const newBaalAddresses = await getNewBaalAddresses(tx);
  return newBaalAddresses;
};
