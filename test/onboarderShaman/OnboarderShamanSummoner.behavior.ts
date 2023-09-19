import { IBaal, IBaalToken, SHAMAN_PERMISSIONS } from "@daohaus/baal-contracts";
import { expect } from "chai";

export function shouldSummonASuperBaal(): void {
  it("Should have a manager shaman", async function () {
    expect(this.shaman?.address.length).greaterThan(0);
    expect(await (this.baal as IBaal).shamans(this.shaman.address)).to.equal(SHAMAN_PERMISSIONS.MANAGER);
  });

  it("Should have shares and loot", async function () {
    const sharesSymbol = await (this.shares as IBaalToken).symbol();
    const lootSymbol = await (this.loot as IBaalToken).symbol();
    console.log("T symbols", sharesSymbol, lootSymbol);
    const baalShares = await (this.baal as IBaal).sharesToken();
    const baalLoot = await (this.baal as IBaal).lootToken();
    console.log("T baal shares, loot", baalShares, baalLoot);

    expect(sharesSymbol).to.equal("SHARES");
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

  // it("Should have minted all shares to sidecar safe", async function () {
  //   const sharesSupply = await (this.shares as IERC20).totalSupply();
  //   const safeBalance = await (this.shares as IERC20).balanceOf(this.sidecarVaultAddress);
  //   expect(sharesSupply).to.equal(safeBalance);
  // });

  // it("Should have minted all loot to sidecar safe", async function () {
  //   const lootSupply = await (this.loot as FixedLoot).totalSupply();
  //   const safeBalance = await (this.loot as FixedLoot).balanceOf(this.sidecarVaultAddress);
  //   expect(lootSupply).to.equal(safeBalance);
  // });
}
