// SPDX-License-Identifier: LGPL v3.0
pragma solidity ^0.8.7;

import "./auth.sol";

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

    function sendToEIC() public onlyAuthor {

           recievedByEIC.push(instanceofPaperStruct);
           indexFromEIC[instanceofPaperStruct.authorAddress] = recievedByEIC.length - 1;

           emit PaperSubmitted(instanceofPaperStruct.authorAddress, instanceofPaperStruct.papertitle);
    }
    function getRecievedByEIC() public view returns(PaperStruct[] memory) {
       return recievedByEIC;
    }

    function EICapproval(bool _EICapproval) public onlyEiC {
        if (_EICapproval == true) {

            approvedByEIC.push(instanceofPaperStruct);
            recievedByAE.push(instanceofPaperStruct);

            uint256 index = indexFromEIC[instanceofPaperStruct.authorAddress];
            recievedByEIC[index] = recievedByEIC[recievedByEIC.length - 1];
            indexFromEIC[recievedByEIC[index].authorAddress] = index;
            recievedByEIC.pop();
            delete indexFromEIC[instanceofPaperStruct.authorAddress];
        } else {
            uint256 index = indexFromEIC[instanceofPaperStruct.authorAddress];
            recievedByEIC[index] = recievedByEIC[recievedByEIC.length - 1];
            indexFromEIC[recievedByEIC[index].authorAddress] = index;
            recievedByEIC.pop();
            delete indexFromEIC[instanceofPaperStruct.authorAddress];
        }
        emit EICApprovalDecision(msg.sender, _EICapproval, instanceofPaperStruct.authorAddress);
    }
     function getApprovedByEIC() public view returns(PaperStruct[] memory)  {
       return approvedByEIC;
    }

    // AE stage
    PaperStruct[] approvedByAE;
    PaperStruct[] recievedByReviewer;
    mapping(address => uint256) indexFromAE;

    function getRecievedByAE() public view returns(PaperStruct[] memory) {
       return recievedByAE;
    }

    function AEapproval(bool _AEapproval) public onlyAE {
        if (_AEapproval == true) {

            approvedByAE.push(instanceofPaperStruct);
            recievedByReviewer.push(instanceofPaperStruct);

            uint256 index = indexFromAE[instanceofPaperStruct.authorAddress];
            recievedByAE[index] = recievedByAE[recievedByAE.length - 1];
            indexFromAE[recievedByAE[index].authorAddress] = index;
            recievedByAE.pop();
            delete indexFromAE[instanceofPaperStruct.authorAddress];
        } else {
            uint256 index = indexFromAE[instanceofPaperStruct.authorAddress];
            recievedByAE[index] = recievedByAE[recievedByAE.length - 1];
            indexFromAE[recievedByAE[index].authorAddress] = index;
            recievedByAE.pop();
            delete indexFromAE[instanceofPaperStruct.authorAddress];
        }
        emit AEApprovalDecision(msg.sender, _AEapproval, instanceofPaperStruct.authorAddress);
    }
     function getApprovedByAE() public view returns(PaperStruct[] memory)  {
       return approvedByAE;
    }

    // Reviewer stage
    PaperStruct[] reviewedByReviewer;
    PaperStruct[] RreceivedByAE;
    mapping(address => uint256) indexFromReviewer;

    function getRecievedByReviewer() public view returns(PaperStruct[] memory) {
       return recievedByReviewer;
    }

    function Reviewerapproval(bool _Reviewerapproval, string memory _Review, address _reviewerAddress) public onlyReviewer {
        instanceofPaperStruct.reviewofreviewer = _Review;
        instanceofPaperStruct.reviewerAddress = _reviewerAddress;
        if (_Reviewerapproval == true) {

            reviewedByReviewer.push(instanceofPaperStruct);
            RreceivedByAE.push(instanceofPaperStruct);

            uint256 index = indexFromReviewer[instanceofPaperStruct.authorAddress];
            recievedByReviewer[index] = recievedByReviewer[recievedByReviewer.length - 1];
            indexFromReviewer[recievedByReviewer[index].authorAddress] = index;
            recievedByReviewer.pop();
            delete indexFromReviewer[instanceofPaperStruct.authorAddress];
        }
        // false branch is a no-op (deferred limitation, SECURITY.md §4.2).
        emit ReviewerReviewed(msg.sender, _Reviewerapproval, instanceofPaperStruct.authorAddress);
    }
     function getReviewedbyReviewer() public view returns(PaperStruct[] memory)  {
       return reviewedByReviewer;
    }

    // AE final-remarks stage
    PaperStruct[] reviewedByAE;
    mapping(address => uint256) indexFromRBAE;

    function RereceivedByAE() public view returns(PaperStruct[] memory) {
        return RreceivedByAE;
    }

    function ReviewedByAE(bool _AEReview, string memory _Review) public onlyAE {
      if(_AEReview == true)
      { instanceofPaperStruct.reviewofAE = _Review;
        reviewedByAE.push(instanceofPaperStruct);

        uint256 index = indexFromRBAE[instanceofPaperStruct.authorAddress];
        RreceivedByAE[index] = RreceivedByAE[RreceivedByAE.length - 1];
        indexFromRBAE[RreceivedByAE[index].authorAddress] = index;
        RreceivedByAE.pop();
        delete indexFromRBAE[instanceofPaperStruct.authorAddress];
        }
      // false branch is a no-op (deferred limitation, SECURITY.md §4.3).
      emit AEReviewed(msg.sender, _AEReview, instanceofPaperStruct.authorAddress);
    }

    function getReviewedByAE() public view returns(PaperStruct[] memory) {
        return reviewedByAE;
    }

}