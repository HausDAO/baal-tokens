import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { deploymentConfig } from "../constants";

const deployFn: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { getChainId, deployments, ethers, network } = hre;
  const { deployer } = await hre.getNamedAccounts();

  console.log('\n\Deploying SuperSummoner factory on network:', network.name);

  const chainId = await getChainId();
  // const _addresses = await getSetupAddresses(chainId, network, deployments);
  const addresses  = deploymentConfig[chainId];

  if (network.name !== 'hardhat') {
    if (!addresses?.bvSummoner) throw Error("No address found for BaalAndVaultSummoner");
    console.log(`Re-using contracts on ${network.name}:`);
    console.log('BaalAndVaultSummoner', addresses.bvSummoner);
  }

  const bvSummonerAddress = 
    network.name === 'hardhat'
      ? (await deployments.get('BaalAndVaultSummoner')).address
      : addresses.bvSummoner;

  const hosSummonerDeployed = await deployments.deploy('SuperSummoner', {
		contract: 'SuperSummoner',
		from: deployer,
		args: [],
        proxy: {
            proxyContract: 'UUPS',
            methodName: 'initialize',
        },
		log: true,
	});
  console.log('SuperSummoner deployment Tx ->', hosSummonerDeployed.transactionHash);

  const tx = await hre.deployments.execute('SuperSummoner', {
      from: deployer,
  }, 'setUp',
    bvSummonerAddress
  );
  console.log('SuperSummoner setUp Tx ->', tx.transactionHash);

  const owner = addresses?.owner || deployer;
  if (network.name !== 'hardhat' && owner !== deployer) {
    console.log("BaalAndVaultSummoner transferOwnership to", owner);
    const tx = await deployments.execute('BaalAndVaultSummoner', {
        from: deployer,
    }, 'transferOwnership',
        owner
    );
    console.log('BaalAndVaultSummoner transferOwnership Tx ->', tx.transactionHash);
  }
};

export default deployFn;
deployFn.id = "001_deploy_Summoner"; // id required to prevent reexecution
deployFn.tags = ["Factories", "SuperSummoner"];