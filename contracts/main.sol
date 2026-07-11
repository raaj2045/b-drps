// SPDX-License-Identifier: LGPL-2.1-only
pragma solidity ^0.8.7;

import "./auth.sol";

/// @title Main — editorial pipeline (submission → EiC → AE → Reviewer → AE).
contract Main {

    struct PaperStruct{
        string name;
        string email;
        string abstractofpaper;
        string papertitle;
        string linkofpaper;
        address authorAddress;
        string reviewofreviewer;
        string reviewofAE;
        address reviewerAddress;
    }

    PaperStruct instanceofPaperStruct;

    // Queue bookkeeping. Each pipeline queue pairs a PaperStruct[] with an
    // address => index+1 map (0 = not queued), so presence is distinguishable
    // from slot 0. One paper per author per queue; duplicates and removals of
    // absent papers revert instead of corrupting the swap-and-pop (found by
    // Echidna property fuzzing; see SECURITY.md).
    function _enqueue(
        PaperStruct[] storage arr,
        mapping(address => uint256) storage idx,
        PaperStruct memory p
    ) internal {
        require(idx[p.authorAddress] == 0, "Author already queued here");
        arr.push(p);
        idx[p.authorAddress] = arr.length; // index + 1
    }

    function _dequeue(
        PaperStruct[] storage arr,
        mapping(address => uint256) storage idx,
        address author
    ) internal {
        uint256 slotPlus1 = idx[author];
        require(slotPlus1 != 0, "Paper not in this queue");
        uint256 i = slotPlus1 - 1;
        uint256 last = arr.length - 1;
        if (i != last) {
            arr[i] = arr[last];
            idx[arr[i].authorAddress] = i + 1;
        }
        arr.pop();
        delete idx[author];
    }

// Role gating reads power from Auth (EIC=2, AE=3, REVIEWER=4, AUTHOR=5).
    Auth public immutable auth;

    constructor(address authAddress) {
        auth = Auth(authAddress);
    }

    modifier onlyEiC() {
        require(auth.memberPower(msg.sender) == 2, "Caller is not the EiC");
        _;
    }
    modifier onlyAE() {
        require(auth.memberPower(msg.sender) == 3, "Caller is not an AE");
        _;
    }
    modifier onlyReviewer() {
        require(auth.memberPower(msg.sender) == 4, "Caller is not a Reviewer");
        _;
    }
    modifier onlyAuthor() {
        require(auth.memberPower(msg.sender) == 5, "Caller is not an Author");
        _;
    }

// Events for off-chain indexing / audit trail.
    event PaperSubmitted(address indexed author, string papertitle);
    event EICApprovalDecision(address indexed eic, bool approved, address indexed author);
    event AEApprovalDecision(address indexed ae, bool approved, address indexed author);
    event ReviewerReviewed(address indexed reviewer, bool approved, address indexed author);
    event AEReviewed(address indexed ae, bool recorded, address indexed author);

    /// @notice Stage the author's paper metadata into the working slot.
    function getPaperInfo(string memory _name, string memory _email, string memory _abstractofpaper, string memory _papertitle, string memory _linkofpaper, address _authorAddress) public onlyAuthor {
        instanceofPaperStruct.name = _name;
        instanceofPaperStruct.email = _email;
        instanceofPaperStruct.abstractofpaper = _abstractofpaper;
        instanceofPaperStruct.papertitle = _papertitle;
        instanceofPaperStruct.linkofpaper = _linkofpaper;
        instanceofPaperStruct.authorAddress = _authorAddress;
    }

    // EIC stage
    PaperStruct[] approvedByEIC;
    PaperStruct[] recievedByEIC;
    PaperStruct[] recievedByAE;
    mapping(address => uint256) indexFromEIC;

    /// @notice Submit the staged paper into the EiC queue.
    function sendToEIC() public onlyAuthor {
        _enqueue(recievedByEIC, indexFromEIC, instanceofPaperStruct);
        emit PaperSubmitted(instanceofPaperStruct.authorAddress, instanceofPaperStruct.papertitle);
    }
    /// @notice Papers awaiting EiC review.
    function getRecievedByEIC() public view returns(PaperStruct[] memory) {
       return recievedByEIC;
    }

    /// @notice EiC accepts or rejects the current paper.
    /// @param _EICapproval true forwards it to the AE queue; false drops it.
    function EICapproval(bool _EICapproval) public onlyEiC {
        address author = instanceofPaperStruct.authorAddress;
        if (_EICapproval == true) {
            approvedByEIC.push(instanceofPaperStruct);
            _enqueue(recievedByAE, indexFromAE, instanceofPaperStruct);
        }
        _dequeue(recievedByEIC, indexFromEIC, author);
        emit EICApprovalDecision(msg.sender, _EICapproval, author);
    }
    /// @notice Papers the EiC approved.
     function getApprovedByEIC() public view returns(PaperStruct[] memory)  {
       return approvedByEIC;
    }

    // AE stage
    PaperStruct[] approvedByAE;
    PaperStruct[] recievedByReviewer;
    mapping(address => uint256) indexFromAE;

    /// @notice Papers awaiting AE handling.
    function getRecievedByAE() public view returns(PaperStruct[] memory) {
       return recievedByAE;
    }

    /// @notice AE accepts or rejects the current paper.
    /// @param _AEapproval true forwards it to the reviewer queue; false drops it.
    function AEapproval(bool _AEapproval) public onlyAE {
        address author = instanceofPaperStruct.authorAddress;
        if (_AEapproval == true) {
            approvedByAE.push(instanceofPaperStruct);
            _enqueue(recievedByReviewer, indexFromReviewer, instanceofPaperStruct);
        }
        _dequeue(recievedByAE, indexFromAE, author);
        emit AEApprovalDecision(msg.sender, _AEapproval, author);
    }
    /// @notice Papers the AE approved.
     function getApprovedByAE() public view returns(PaperStruct[] memory)  {
       return approvedByAE;
    }

    // Reviewer stage
    PaperStruct[] reviewedByReviewer;
    PaperStruct[] RreceivedByAE;
    mapping(address => uint256) indexFromReviewer;

    /// @notice Papers awaiting reviewer review.
    function getRecievedByReviewer() public view returns(PaperStruct[] memory) {
       return recievedByReviewer;
    }

    /// @notice Reviewer records a review on the current paper.
    /// @param _Reviewerapproval true returns the paper to the AE; false is a
    ///        no-op (deferred limitation, SECURITY.md §4.2).
    function Reviewerapproval(bool _Reviewerapproval, string memory _Review, address _reviewerAddress) public onlyReviewer {
        instanceofPaperStruct.reviewofreviewer = _Review;
        instanceofPaperStruct.reviewerAddress = _reviewerAddress;
        if (_Reviewerapproval == true) {
            reviewedByReviewer.push(instanceofPaperStruct);
            _enqueue(RreceivedByAE, indexFromRBAE, instanceofPaperStruct);
            _dequeue(recievedByReviewer, indexFromReviewer, instanceofPaperStruct.authorAddress);
        }
        // false branch is a no-op (deferred limitation, SECURITY.md §4.2).
        emit ReviewerReviewed(msg.sender, _Reviewerapproval, instanceofPaperStruct.authorAddress);
    }
    /// @notice Papers the reviewer has reviewed.
     function getReviewedbyReviewer() public view returns(PaperStruct[] memory)  {
       return reviewedByReviewer;
    }

    // AE final-remarks stage
    PaperStruct[] reviewedByAE;
    mapping(address => uint256) indexFromRBAE;

    /// @notice Reviewed papers returned to the AE.
    function RereceivedByAE() public view returns(PaperStruct[] memory) {
        return RreceivedByAE;
    }

    /// @notice AE records final remarks on the current paper.
    /// @param _AEReview true finalizes the paper into reviewedByAE; false is a
    ///        no-op (deferred limitation, SECURITY.md §4.3).
    function ReviewedByAE(bool _AEReview, string memory _Review) public onlyAE {
      if(_AEReview == true)
      { instanceofPaperStruct.reviewofAE = _Review;
        reviewedByAE.push(instanceofPaperStruct);
        _dequeue(RreceivedByAE, indexFromRBAE, instanceofPaperStruct.authorAddress);
        }
      // false branch is a no-op (deferred limitation, SECURITY.md §4.3).
      emit AEReviewed(msg.sender, _AEReview, instanceofPaperStruct.authorAddress);
    }

    /// @notice Papers finalized by the AE.
    function getReviewedByAE() public view returns(PaperStruct[] memory) {
        return reviewedByAE;
    }

    // Bounded reads (SC10). The whole-array getters above grow O(n) and can
    // exceed RPC response limits at scale; these paginated variants keep every
    // read bounded by `limit` regardless of queue size.
    // Queue ids: 0 recievedByEIC, 1 approvedByEIC, 2 recievedByAE,
    // 3 approvedByAE, 4 recievedByReviewer, 5 reviewedByReviewer,
    // 6 RreceivedByAE, 7 reviewedByAE.
    function _queueById(uint8 id) internal view returns (PaperStruct[] storage) {
        if (id == 0) return recievedByEIC;
        if (id == 1) return approvedByEIC;
        if (id == 2) return recievedByAE;
        if (id == 3) return approvedByAE;
        if (id == 4) return recievedByReviewer;
        if (id == 5) return reviewedByReviewer;
        if (id == 6) return RreceivedByAE;
        if (id == 7) return reviewedByAE;
        revert("Unknown queue id");
    }

    /// @notice Number of papers in queue `id` (ids documented at _queueById).
    function queueLength(uint8 id) public view returns (uint256) {
        return _queueById(id).length;
    }

    /// @notice Up to `limit` papers from queue `id`, starting at `offset`.
    ///         Returns an empty array when `offset` is past the end.
    function queuePage(uint8 id, uint256 offset, uint256 limit)
        public view returns (PaperStruct[] memory page)
    {
        PaperStruct[] storage arr = _queueById(id);
        uint256 len = arr.length;
        if (offset >= len) return page;
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new PaperStruct[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = arr[i];
        }
    }

}