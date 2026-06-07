// SPDX-License-Identifier: LGPL-3.0
pragma solidity ^0.8.7;

import "../main.sol";

/**
 * Echidna property-fuzzing harness for Main.
 *
 * Echidna fuzzes getPaperInfo / sendToEIC / EICapproval / AEapproval / ... and
 * checks the EIC queue's address->index map stays consistent. Because Main
 * keys queue position by authorAddress, two papers sharing an author (or the
 * shared instanceofPaperStruct being overwritten between getPaperInfo calls)
 * collide in indexFromEIC -- which this invariant is designed to catch.
 *
 * Run: echidna contracts/echidna/EchidnaMain.sol --contract EchidnaMain \
 *        --config echidna.config.yaml
 */
contract EchidnaMain is Main {
    // Throwaway Auth to satisfy Main's constructor. Post-P5 role gating means
    // Main's actions revert for unregistered senders; this harness needs a
    // role-bootstrap rework to stay effective (follow-up noted in SECURITY.md).
    constructor() Main(address(new Auth())) {}

    function echidna_eic_index_consistent() public view returns (bool) {
        for (uint256 i = 0; i < recievedByEIC.length; i++) {
            address a = recievedByEIC[i].authorAddress;
            if (indexFromEIC[a] != i) {
                return false;
            }
        }
        return true;
    }
}
