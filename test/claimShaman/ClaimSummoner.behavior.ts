import { IBaal, SHAMAN_PERMISSIONS } from "@daohaus/baal-contracts";
import { expect } from "chai";

import { FixedLoot, IERC20 } from "../../types";

export function shouldSummonASuperBaal(): void {
  it("Should have a manager shaman", async function () {
    expect(this.shaman?.address.length).greaterThan(0);
    expect(await (this.baal as IBaal).shamans(this.shaman.address)).to.equal(SHAMAN_PERMISSIONS.MANAGER);
  });

  it("Should have a sidecar vault", async function () {
    expect(this.sidecarVaultAddress.length).greaterThan(0);
  });

  it("Should have minted all shares to sidecar safe", async function () {
    const sharesSupply = await (this.shares as IERC20).totalSupply();
    const safeBalance = await (this.shares as IERC20).balanceOf(this.sidecarVaultAddress);
    expect(sharesSupply).to.equal(safeBalance);
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
  it("TODO: Should not be able to mint loot", async function () {
    // todo
  });
  it("TODO: Should not be able to mint loot through proposal", async function () {
    // todo
  });
}