import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFn: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, network } = hre;
  const { deployer } = await hre.getNamedAccounts();

  console.log("\nDeploying MintableNFT mock on network:", network.name);

  const shamanDeployed = await deployments.deploy("MintableNFT", {
    contract: "MintableNFT",
    from: deployer,
    args: [],
    // proxy: {
    //     proxyContract: 'UUPS',
    //     methodName: 'initialize',
    // },
    log: true,
  });
  console.log("MintableNFT deployment Tx ->", shamanDeployed.transactionHash);
};

export default deployFn;
deployFn.id = "004_deploy_Mocks_NFT"; // id required to prevent reexecution
deployFn.tags = ["MocksNFT"];
