import { ethers } from "hardhat";

export const abiCoder = ethers.utils.defaultAbiCoder;

export const encodeMockVetoShamanParams = function () {
  const threshold = 100;

  const shamanParams = abiCoder.encode(["uint256"], [threshold]);
  return shamanParams;
};
