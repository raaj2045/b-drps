// SPDX-License-Identifier: LGPL v3.0
pragma solidity ^0.8.7;

contract Decision {

// Paper Structure
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

// instance of paper struct to use it everywhere
    PaperStruct instanceofPaperStruct;

// for manage published papers
    PaperStruct[] Publishpaper;
    PaperStruct[] ReturnAuthor;
    PaperStruct[] RreceivedByEIC;

// getting paper's information
    function getPaperInfo(string memory _name, string memory _email, string memory _abstractofpaper, string memory _papertitle, string memory _linkofpaper,string memory _reviewofreviewer, string memory _reviewofAE, address _authorAddress) public {
        instanceofPaperStruct.name = _name;
        instanceofPaperStruct.email = _email;
        instanceofPaperStruct.abstractofpaper = _abstractofpaper;
        instanceofPaperStruct.papertitle = _papertitle;
        instanceofPaperStruct.linkofpaper = _linkofpaper;
        instanceofPaperStruct.authorAddress = _authorAddress;
        instanceofPaperStruct.reviewofreviewer = _reviewofreviewer;
        instanceofPaperStruct.reviewofAE = _reviewofAE;
        RreceivedByEIC.push(instanceofPaperStruct);

    }

// for receive papers to the EIC
    function RerecievedByEIC() public view returns(PaperStruct[] memory) {
        return RreceivedByEIC;
    }

// For getting decision of EIC
    function EICDecision(bool _Decision, string memory _MessageToAuthor) public {
        instanceofPaperStruct.messagetoauthor = _MessageToAuthor;
        if (_Decision == true) {
            Publishpaper.push(instanceofPaperStruct);
            ReturnAuthor.push(instanceofPaperStruct);
            RreceivedByEIC.pop();
        } else {
            ReturnAuthor.push(instanceofPaperStruct);
            RreceivedByEIC.pop();

        }
    }


    // For getting published papers
   
   function getPublishedpaper() public view returns(PaperStruct[] memory) {
       return Publishpaper;
   }

// For return paper to the author
   function Returntoauthor() public view returns(PaperStruct[] memory) {
       return ReturnAuthor;
   }

}