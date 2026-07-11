// SPDX-License-Identifier: LGPL-2.1-only
pragma solidity ^0.8.7;

import "./auth.sol";

/// @title Decision — final EiC verdict (publish or return to author).
contract Decision {

     struct PaperStruct{
        string name;
        string email;
        string abstractofpaper;
        string papertitle;
        string linkofpaper;
        address authorAddress;
        string reviewofreviewer;
        string reviewofAE;
        string messagetoauthor;
    }

    PaperStruct instanceofPaperStruct;

// Only the EiC (Auth power == 2) transfers papers in and renders the verdict.
    Auth public immutable auth;

    constructor(address authAddress) {
        auth = Auth(authAddress);
    }

    modifier onlyEiC() {
        require(auth.memberPower(msg.sender) == 2, "Caller is not the EiC");
        _;
    }

// Events for off-chain indexing / audit trail.
    event PaperReceived(address indexed eic, address indexed author, string papertitle);
    event EICFinalDecision(address indexed eic, bool published, address indexed author);
    event PaperPublished(address indexed author, string papertitle);

    PaperStruct[] Publishpaper;
    PaperStruct[] ReturnAuthor;
    PaperStruct[] RreceivedByEIC;

    /// @notice EiC transfers a finalized paper from Main into the decision queue.
    function getPaperInfo(string memory _name, string memory _email, string memory _abstractofpaper, string memory _papertitle, string memory _linkofpaper,string memory _reviewofreviewer, string memory _reviewofAE, address _authorAddress) public onlyEiC {
        instanceofPaperStruct.name = _name;
        instanceofPaperStruct.email = _email;
        instanceofPaperStruct.abstractofpaper = _abstractofpaper;
        instanceofPaperStruct.papertitle = _papertitle;
        instanceofPaperStruct.linkofpaper = _linkofpaper;
        instanceofPaperStruct.authorAddress = _authorAddress;
        instanceofPaperStruct.reviewofreviewer = _reviewofreviewer;
        instanceofPaperStruct.reviewofAE = _reviewofAE;
        RreceivedByEIC.push(instanceofPaperStruct);

        emit PaperReceived(msg.sender, _authorAddress, _papertitle);
    }

    /// @notice Papers awaiting the EiC's final decision.
    function RerecievedByEIC() public view returns(PaperStruct[] memory) {
        return RreceivedByEIC;
    }

    /// @notice EiC renders the final verdict on the current paper.
    /// @param _Decision true publishes the paper; false returns it to the author.
    function EICDecision(bool _Decision, string memory _MessageToAuthor) public onlyEiC {
        instanceofPaperStruct.messagetoauthor = _MessageToAuthor;
        if (_Decision == true) {
            Publishpaper.push(instanceofPaperStruct);
            ReturnAuthor.push(instanceofPaperStruct);
            RreceivedByEIC.pop();
            emit PaperPublished(instanceofPaperStruct.authorAddress, instanceofPaperStruct.papertitle);
        } else {
            ReturnAuthor.push(instanceofPaperStruct);
            RreceivedByEIC.pop();

        }
        emit EICFinalDecision(msg.sender, _Decision, instanceofPaperStruct.authorAddress);
    }

    /// @notice Published papers.
   function getPublishedpaper() public view returns(PaperStruct[] memory) {
       return Publishpaper;
   }

    /// @notice Papers returned to their authors with a decision message.
   function Returntoauthor() public view returns(PaperStruct[] memory) {
       return ReturnAuthor;
   }

}