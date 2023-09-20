import { Baal, ProposalType, moveForwardPeriods } from "@daohaus/baal-contracts";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";

export const submitAndProcessProposal = async ({
  baal,
  encodedAction,
  proposal,
  proposalId,
  votingPeriodSeconds,
}: {
  baal: Baal;
  encodedAction: string;
  proposal: ProposalType;
  votingPeriodSeconds: number;
  proposalId?: BigNumberish;
}) => {
  await baal.submitProposal(encodedAction, proposal.expiration, proposal.baalGas, ethers.utils.id(proposal.details));
  const id = proposalId ? proposalId : await baal.proposalCount();

  await baal.submitVote(id, true);
  await moveForwardPeriods(votingPeriodSeconds, 3);
  return await baal.processProposal(id, encodedAction);
};
