import { IBaal, IBaalToken, SHAMAN_PERMISSIONS } from "@daohaus/baal-contracts";
import { expect } from "chai";
import { ethers } from "hardhat";

export function shouldSummonASuperBaal(): void {
  it("Should have a manager shaman", async function () {
    expect(this.shaman?.address.length).greaterThan(0);
    expect(await (this.baal as IBaal).shamans(this.shaman.address)).to.equal(SHAMAN_PERMISSIONS.MANAGER);
  });

  it("Should have shares and loot", async function () {
    const sharesSymbol = await (this.shares as IBaalToken).symbol();
    const lootSymbol = await (this.loot as IBaalToken).symbol();

    const baalShares = await (this.baal as IBaal).sharesToken();
    const baalLoot = await (this.baal as IBaal).lootToken();

    expect(sharesSymbol).to.equal("SHARES");
    expect(lootSymbol).to.equal("LOOT");
    expect(baalShares).to.equal(this.shares.address);
    expect(baalLoot).to.equal(this.loot.address);
  });

  it("Should have loot,shares ownership with baal", async function () {
    const sharesOwner = await (this.shares as IBaalToken).owner();
    const lootOwner = await (this.loot as IBaalToken).owner();
    console.log("T owners", sharesOwner, lootOwner);
  });

  it("Should mint shares", async function () {
    const s1Balance = await (this.shares as IBaalToken).balanceOf(this.unnamedUsers[0]);
    expect(s1Balance).to.equal(this.amounts[0]);
  });

  it("Should mint loot", async function () {
    const l1Balance = await (this.loot as IBaalToken).balanceOf(this.unnamedUsers[0]);
    expect(l1Balance).to.equal(this.amounts[0]);
  });

  it("should be initialized", async function () {
    const init = this.summoner?.initialize(ethers.constants.AddressZero);
    await expect(init).to.be.revertedWith("Initializable: contract is already initialized");
  });
}
