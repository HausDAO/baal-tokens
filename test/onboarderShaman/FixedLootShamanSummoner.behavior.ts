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

  it("Should have minted all loot to sidecar safe", async function () {
    const lootSupply = await (this.loot as FixedLoot).totalSupply();
    const safeBalance = await (this.loot as FixedLoot).balanceOf(this.sidecarVaultAddress);
    expect(lootSupply).to.equal(safeBalance);
  });
}
