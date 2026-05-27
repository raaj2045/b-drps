// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.7;

import "../auth.sol";

/**
 * Echidna property-fuzzing harness for Auth.
 *
 * Echidna calls every inherited public function (addOrRequestMember,
 * approoveRequest, denyRequest, ...) with fuzzed arguments, then checks each
 * `echidna_*` invariant still holds. Auth's state variables default to
 * `internal` visibility, so this derived contract can read them directly.
 *
 * Run: echidna contracts/echidna/EchidnaAuth.sol --contract EchidnaAuth \
 *        --config echidna.config.yaml
 */
contract EchidnaAuth is Auth {
    // The requested-member array and its address->index map must stay in sync
    // after any sequence of push / shuffle-pop. If approoveRequest or
    // denyRequest is ever called for an address that was never requested
    // (indexFromRequest defaults to 0), the swap-and-pop corrupts slot 0 and
    // this invariant breaks -- demonstrating the missing "was actually
    // requested" guard.
    function echidna_request_index_consistent() public view returns (bool) {
        for (uint256 i = 0; i < arrayOfRequestedMembers.length; i++) {
            address a = arrayOfRequestedMembers[i].userAddress;
            if (indexFromRequest[a] != i) {
                return false;
            }
        }
        return true;
    }

    // Every address recorded as an approved member must appear in the approved
    // array exactly via the memberExist flag; the flag and array must not drift.
    function echidna_approved_flag_implies_entry() public view returns (bool) {
        // For each approved entry, its memberExist flag must be true.
        for (uint256 i = 0; i < arrayOfMembers.length; i++) {
            if (!memberExist[arrayOfMembers[i].userAddress]) {
                return false;
            }
        }
        return true;
    }
}
