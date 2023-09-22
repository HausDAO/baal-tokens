// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@daohaus/baal-contracts/contracts/interfaces/IBaal.sol";
import "@daohaus/baal-contracts/contracts/interfaces/IBaalToken.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract CommunityVetoMinion {
    event CommunityVetoProposal(address indexed baal, address token, uint32 proposalId, string details);

    IBaal public baal;
    uint256 public thresholdPercent;

    mapping(uint32 => uint256) proposalSnapshots;
    mapping(uint32 => uint256) proposalVetoStakes;
    mapping(uint32 => mapping(address => uint256)) vetoStakesByProposalId;

    constructor(address _baal, uint256 _thresholdPercent) {
        baal = IBaal(_baal);
        thresholdPercent = _thresholdPercent; // 200 = 20%
    }

    function initCommunityVetoProposal(uint32 proposalId, string memory details) external payable {
        require(proposalSnapshots[proposalId] == 0, "Veto already initied");
        IBaalToken token = IBaalToken(baal.lootToken());
        require(token.balanceOf(msg.sender) > baal.sponsorThreshold(), "does not meet sponsor threshold");
        uint256 snapshotId = token.snapshot();
        proposalSnapshots[proposalId] = snapshotId;

        emit CommunityVetoProposal(address(baal), baal.lootToken(), proposalId, details);
    }

    function stakeVeto(uint32 proposalId) external {
        require(vetoStakesByProposalId[proposalId][msg.sender] > 0, "Already staked");

        uint256 memberStake = IBaalToken(baal.lootToken()).balanceOfAt(msg.sender, proposalSnapshots[proposalId]);
        vetoStakesByProposalId[proposalId][msg.sender] = memberStake;
        proposalVetoStakes[proposalId] = proposalVetoStakes[proposalId] + memberStake;
    }

    function cancelProposal(uint32 proposalId) external {
        require(baal.isGovernor(address(this)), "Not governor shaman");
        require(getCurrentThresholdPercent(proposalId) > thresholdPercent, "Not enough loot staked to cancel");
        baal.cancelProposal(proposalId);
    }

    function getCurrentThresholdPercent(uint32 proposalId) public view returns (uint256) {
        uint256 totalAtSnapshot = IBaalToken(baal.lootToken()).totalSupplyAt(proposalSnapshots[proposalId]);
        return ((proposalVetoStakes[proposalId] * 1000) / totalAtSnapshot);
    }

    function updateThresholdPercent(uint256 _thresholdPercent) public onlyBaal {
        thresholdPercent = _thresholdPercent;
    }

    modifier onlyBaal() {
        require(msg.sender == address(baal), "!baal");
        _;
    }
}
