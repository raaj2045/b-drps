// SPDX-License-Identifier: LGPL-2.1-only
pragma solidity ^0.8.7;

import "../auth.sol";

/**
 * Echidna harness that constrains operations to a fixed 3-address set and
 * tracks a "ghost" count of how many of them are currently requested. The
 * invariant `echidna_count_matches` asserts the on-chain requested-array
 * length equals the ghost count.
 *
 * This catches data loss that the plain index-consistency invariant misses:
 * denyRequest has no guard that the target was actually requested, so calling
 * it for a non-requested address swap-pops an unrelated member out of the
 * array -- shrinking it below the true count -- while the index map stays
 * internally consistent.
 *
 * Run: echidna contracts/echidna/EchidnaAuthGuarded.sol \
 *        --contract EchidnaAuthGuarded --config echidna.config.yaml
 */
contract EchidnaAuthGuarded is Auth {
    address[3] internal users = [address(0xA), address(0xB), address(0xC)];
    mapping(address => bool) internal ghostRequested;
    uint256 internal ghostCount;

    function reqUser(uint8 i) public {
        address u = users[i % 3];
        if (ghostRequested[u]) return; // mirror the contract's own guard
        addOrRequestMember("n", "REVIEWER", "e", u, true);
        ghostRequested[u] = true;
        ghostCount += 1;
    }

    function denyUser(uint8 i) public {
        address u = users[i % 3];
        denyRequest(u); // intentionally unguarded -- exercises the bug
        if (ghostRequested[u]) {
            ghostRequested[u] = false;
            ghostCount -= 1;
        }
    }

    function echidna_count_matches() public view returns (bool) {
        return arrayOfRequestedMembers.length == ghostCount;
    }
}
