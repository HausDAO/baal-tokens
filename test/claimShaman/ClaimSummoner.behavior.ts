import { IBaal, IBaalToken, SHAMAN_PERMISSIONS } from "@daohaus/baal-contracts";
import { expect } from "chai";
import { ethers } from "hardhat";

import { FixedLoot, IERC20 } from "../../types";
import { submitAndProcessProposal } from "../utils/baal";

export function shouldSummonASuperBaal(): void {
  it("Should have a manager shaman", async function () {
    expect(this.shaman?.address.length).greaterThan(0);
    expect(await (this.baal as IBaal).shamans(this.shaman.address)).to.equal(SHAMAN_PERMISSIONS.MANAGER);
  });

  it("Should have a sidecar vault", async function () {
    expect(this.sidecarVaultAddress.length).greaterThan(0);
  });

  it("Should have minted all loot to sidecar safe and claim shaman", async function () {
    const lootSupply = await (this.loot as FixedLoot).totalSupply();
    const safeBalance = await (this.loot as FixedLoot).balanceOf(this.sidecarVaultAddress);
    const shamanBalance = await (this.loot as FixedLoot).balanceOf(this.shaman.address);
    // console.log("T lootSupply", lootSupply.toString());
    // console.log("T safeBalance", safeBalance.toString());
    // console.log("T shamanBalance", shamanBalance.toString());

    expect(lootSupply).to.equal(safeBalance.add(shamanBalance));
  });

  it("Should be able to claim for a tokenId and get shares/loot to tba", async function () {
    // const nftOwner = await this.nft.ownerOf(1);
    await this.shaman?.claim(1);

    const imp = await this.shaman?.tbaImp();
    const tba = await this.registry.account(imp, this.chainId, this.nft.address, 1, 0);
    const lootPer = await this.shaman?.lootPerNft();
    const sharesPer = await this.shaman?.sharesPerNft();

    const tbaShareBalance = await (this.shares as IERC20).balanceOf(tba);
    const tbaLootBalance = await (this.loot as FixedLoot).balanceOf(tba);
    // console.log("T tbaShareBalance", tbaShareBalance.toString());
    // console.log("T tbaLootBalance", tbaLootBalance.toString());

    expect(tbaShareBalance).to.equal(sharesPer);
    expect(tbaLootBalance).to.equal(lootPer);
  });

  it("Should be not able to claim for a tokenId that does not exist", async function () {
    const claim = this.shaman?.claim(42069);
    await expect(claim).to.be.revertedWith("ERC721: invalid token ID");
  });
  it("Should be not able to claim for a tokenId twice", async function () {
    await this.shaman?.claim(1);
    const claim = this.shaman?.claim(1);
    await expect(claim).to.be.revertedWithCustomError(this.shaman, "AlreadyClaimed");
  });
  it("Should not be able to mint loot", async function () {
    const tmint = this.loot.mint(this.shaman.address, 1);
    await expect(tmint).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it("Should not be able to mint initial loot", async function () {
    const tmint = this.fixedLoot.initialMint(this.shaman.address, this.shaman.address);
    await expect(tmint).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it("TODO: Should be able to mint shares through proposal", async function () {
    const totalShares = await (this.shares as IERC20).totalSupply();
    const summonerShareBalance = await (this.shares as IERC20).balanceOf(this.deployer);
    console.log("summonerShareBalance", totalShares.toString(), summonerShareBalance.toString());
    // delegate to default user
    await (this.shares as IBaalToken).delegate(this.users.summoner.address);
    // console.log("this.users", this.users.summoner.address, this.users.applicant.address, this.users.shaman.address);

    const votingPeriodSeconds = await this.baal.votingPeriod();
    console.log("votingPeriodSeconds", votingPeriodSeconds.toString());

    const mintShares = await this.baal.interface.encodeFunctionData("mintShares", [
      [this.users.summoner.address],
      ["690000000000000000000"],
    ]);
    // todo: as owner
    const sp = await submitAndProcessProposal({
      baal: this.baal,
      encodedAction: mintShares,
      proposal: {
        flag: 1,
        account: ethers.constants.AddressZero,
        data: "",
        details: "",
        expiration: 0,
        baalGas: 0,
      },
      votingPeriodSeconds,
    });

    const totalSharesAfter = await (this.shares as IERC20).totalSupply();
    console.log("totalSharesAfter", totalSharesAfter.toString());
    // console.log("sp", sp);
    expect(sp).to.be.ok;
    // todo: not working
  });

  it("should be initialized", async function () {
    const init = this.summoner?.initialize(ethers.constants.AddressZero);
    await expect(init).to.be.revertedWith("Initializable: contract is already initialized");
  });
}
