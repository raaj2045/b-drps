// SPDX-License-Identifier: LGPL-2.1-only
pragma solidity ^0.8.7;

import "../auth.sol";

/**
 * Echidna harness tracking a "ghost" count of currently-requested addresses.
 * The invariant `echidna_count_matches` asserts the on-chain requested-array
 * length equals the ghost count.
 *
 * Historically this falsified: denyRequest had no "was actually requested"
 * guard, so denying a non-requested address swap-popped an unrelated entry
 * out of slot 0 (array shrank, ghost count didn't). The guard now makes that
 * call revert; this harness stays in the suite as the regression net.
 *
 * Post-P5 authorization notes: requests must be self-registered, so reqUser
 * registers msg.sender (one of the configured Echidna senders). Denials must
 * come from the requester or an approved member, so the harness registers
 * itself as a JOURNAL in the constructor and denies via an external self-call
 * (msg.sender == harness, an approved member).
 *
 * Run: echidna contracts/echidna/EchidnaAuthGuarded.sol \
 *        --contract EchidnaAuthGuarded --config echidna.guarded.yaml
 */
contract EchidnaAuthGuarded is Auth {
    // Mirror of the sender set in echidna.guarded.yaml.
    address[4] internal users = [
        address(0x10000),
        address(0x20000),
        address(0x30000),
        address(0x40000)
    ];
    mapping(address => bool) internal ghostRequested;
    uint256 internal ghostCount;

    constructor() {
        addOrRequestMember("harness", "JOURNAL", "h@x", address(this), false);
    }

    function reqUser() public {
        if (ghostRequested[msg.sender] || memberExist[msg.sender]) return;
        addOrRequestMember("n", "REVIEWER", "e", msg.sender, true);
        ghostRequested[msg.sender] = true;
        ghostCount += 1;
    }

    function denyUser(uint8 i) public {
        address u = users[i % 4];
        // External self-call so msg.sender is the harness (approved member).
        try this.denyRequest(u) {
            // If this succeeds for a never-requested u, the guard regressed:
            // the array shrank but the ghost count didn't -- invariant breaks.
            if (ghostRequested[u]) {
                ghostRequested[u] = false;
                ghostCount -= 1;
            }
        } catch {}
    }

    function echidna_count_matches() public view returns (bool) {
        return arrayOfRequestedMembers.length == ghostCount;
    }
}
