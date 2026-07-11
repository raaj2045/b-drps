// SPDX-License-Identifier: LGPL-2.1-only
pragma solidity ^0.8.7;

import "../main.sol";

/**
 * Deterministic role map standing in for Auth, so Echidna's fixed sender set
 * can drive every gated Main function without the self-registration dance
 * (which Echidna cannot perform: requests must come from the address itself).
 * Main only ever calls auth.memberPower(), so this is a sufficient stub.
 */
contract MockAuth {
    function memberPower(address a) external pure returns (uint256) {
        if (a == address(0x10000)) return 5; // AUTHOR
        if (a == address(0x20000)) return 2; // EIC
        if (a == address(0x30000)) return 3; // AE
        if (a == address(0x40000)) return 4; // REVIEWER
        return 0;
    }
}

/**
 * Echidna property-fuzzing harness for Main's queue bookkeeping.
 *
 * Each pipeline queue pairs a PaperStruct[] with an address => index+1 map
 * (0 = absent). The invariants assert every queued paper's map entry points
 * back at its slot. Historically `echidna_eic_index_consistent` falsified in
 * 2 calls (sendToEIC twice queued the same author, which the map cannot
 * represent); the downstream queues never wrote their maps at all. Both are
 * fixed via guarded _enqueue/_dequeue; these invariants are the regression
 * net.
 *
 * Run: echidna contracts/echidna/EchidnaMain.sol --contract EchidnaMain \
 *        --config echidna.config.yaml
 */
contract EchidnaMain is Main {
    constructor() Main(address(new MockAuth())) {}

    function _indexConsistent(
        PaperStruct[] storage arr,
        mapping(address => uint256) storage idx
    ) internal view returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (idx[arr[i].authorAddress] != i + 1) {
                return false;
            }
        }
        return true;
    }

    function echidna_eic_index_consistent() public view returns (bool) {
        return _indexConsistent(recievedByEIC, indexFromEIC);
    }

    function echidna_ae_index_consistent() public view returns (bool) {
        return _indexConsistent(recievedByAE, indexFromAE);
    }

    function echidna_reviewer_index_consistent() public view returns (bool) {
        return _indexConsistent(recievedByReviewer, indexFromReviewer);
    }

    function echidna_rbae_index_consistent() public view returns (bool) {
        return _indexConsistent(RreceivedByAE, indexFromRBAE);
    }
}
