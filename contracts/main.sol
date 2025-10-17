// SPDX-License-Identifier: LGPL v3.0
pragma solidity ^0.8.7;

contract Main {

// paper Structure 
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

// Paper instance to manage paper information
    PaperStruct instanceofPaperStruct;

// getting paper informaion
    function getPaperInfo(string memory _name, string memory _email, string memory _abstractofpaper, string memory _papertitle, string memory _linkofpaper, address _authorAddress) public {
        instanceofPaperStruct.name = _name;
        instanceofPaperStruct.email = _email;
        instanceofPaperStruct.abstractofpaper = _abstractofpaper;
        instanceofPaperStruct.papertitle = _papertitle;
        instanceofPaperStruct.linkofpaper = _linkofpaper;
        instanceofPaperStruct.authorAddress = _authorAddress;
    }

// Manage EIC ----------------------------------------------------------------------------------------------------------------

// Manage papers in to EIC Eintity
    PaperStruct[] approvedByEIC;  
    PaperStruct[] recievedByEIC; 
    PaperStruct[] recievedByAE; 

//  Maage indexes of the paper 
    uint256 EICIndex = 0;
    mapping(address => uint256) indexFromEIC;
    
// Send the paper to the EIC
    function sendToEIC() public {

           recievedByEIC.push(instanceofPaperStruct);
           indexFromEIC[instanceofPaperStruct.authorAddress] = recievedByEIC.length - 1;

       
    }
    // Get paper to the EIC 
    function getRecievedByEIC() public view returns(PaperStruct[] memory) {
       return recievedByEIC;
    }

    // Get EIC approval
    function EICapproval(bool _EICapproval) public {
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
    }
    // For Getting papers approved by EIC
     function getApprovedByEIC() public view returns(PaperStruct[] memory)  {
       return approvedByEIC;
    }

//  Manage AE -----------------------------------------------------------------------------------------------------------------------

// Manage papers in to EIC Eintity

    PaperStruct[] approvedByAE; 
    PaperStruct[] recievedByReviewer;  
 
//  Maage indexes of the paper 
    uint256 AEIndex = 0;
    mapping(address => uint256) indexFromAE;
    
    // For getting papers in the AE 
    function getRecievedByAE() public view returns(PaperStruct[] memory) {
       return recievedByAE;
    }

    // for taking approval from the AE
    function AEapproval(bool _AEapproval) public {
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
    }
    // For getting the papers which approved by AE
     function getApprovedByAE() public view returns(PaperStruct[] memory)  {
       return approvedByAE;
    }

    // Manage Reviewer --------------------------------------------------------------------------------------------------------------
    // Manage papers and indexes in the reviewer's UI
    PaperStruct[] reviewedByReviewer; 
    PaperStruct[] RreceivedByAE;

    uint256 ReviewerIndex = 0;
    mapping(address => uint256) indexFromReviewer;
    
    // For Getting papers to the reviewer
    function getRecievedByReviewer() public view returns(PaperStruct[] memory) {
       return recievedByReviewer;
    }
    // For getting reviewer approval
    function Reviewerapproval(bool _Reviewerapproval, string memory _Review, address _reviewerAddress) public {
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
        
    }
    // For gettig papers which reviewed by reviewer
     function getReviewedbyReviewer() public view returns(PaperStruct[] memory)  {
       return reviewedByReviewer;
    }


    // Reviewed By AE ----------------------------------------------------------------------------------------------------------
    
    // Manage reviewed papers came from the reviewer to the AE
    PaperStruct[] reviewedByAE; 
    uint256 RBAEindex = 0;
    mapping(address => uint256) indexFromRBAE;

// get Papers which are reviewed by reviewer to the AE 
    function RereceivedByAE() public view returns(PaperStruct[] memory) {
        return RreceivedByAE;
    }

// get remarks from the AE 
    function ReviewedByAE(bool _AEReview, string memory _Review) public {
      if(_AEReview == true) 
      { instanceofPaperStruct.reviewofAE = _Review;
        reviewedByAE.push(instanceofPaperStruct);

        uint256 index = indexFromRBAE[instanceofPaperStruct.authorAddress];
        RreceivedByAE[index] = RreceivedByAE[RreceivedByAE.length - 1];
        indexFromRBAE[RreceivedByAE[index].authorAddress] = index;
        RreceivedByAE.pop();
        delete indexFromRBAE[instanceofPaperStruct.authorAddress];
        }
    }
// For getting papers which are reviewed by AE
    function getReviewedByAE() public view returns(PaperStruct[] memory) {
        return reviewedByAE;
    }

}