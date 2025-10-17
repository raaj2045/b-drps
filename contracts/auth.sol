// SPDX-License-Identifier: LGPL v3.0
pragma solidity ^0.8.7;

contract Auth {
    function recieve() external payable {}

    // ----------------------------------------------- MEMBER - REQUEST, APPROVE, ADD --------------------------------------------------

    // Member Structure
    struct MemberStruct {
        string name;
        string role;
        string email;
        address userAddress;
        uint256 power;
    }

    // Indexes to manage the requested or approved entities
    uint256 requestIndex = 0;
    uint256 memberIndex = 0;

    // Mapping indexes with a particular useraddresses
    mapping(address => uint256) indexFromRequest;
    mapping(address => uint256) indexFromApproove;

    // For Approved Members
    mapping(address => MemberStruct) getMemberWithAddress;
    MemberStruct[] arrayOfMembers;
    mapping(address => bool) memberExist;

    // For Requested Members
    mapping(address => MemberStruct) getRequestedMemberWithAddress;
    MemberStruct[] arrayOfRequestedMembers;
    mapping(address => bool) memberRequested;

    // For getting the info of members(true = requested member info and  false = approoved member info)
    function getApprovedOrRequestedMember(bool request)
        public
        view
        returns (MemberStruct[] memory)
    {
        if (request == true) {
            return arrayOfRequestedMembers;
        } else {
            return arrayOfMembers;
        }
    }

    // instance of the struct to use everywhere
    MemberStruct instanceOfMemberStruct;

    // function to add or request member (true = request member | false = directly add member | Journal will be directly added as a member)
    function addOrRequestMember(
        string memory _name,
        string memory _role,
        string memory _email,
        address _userAddress,
        bool request
    ) public {

        instanceOfMemberStruct.name = _name;
        instanceOfMemberStruct.role = _role;
        instanceOfMemberStruct.email = _email;
        instanceOfMemberStruct.userAddress = _userAddress;

        // deciding power based on type
        if (
            keccak256(abi.encodePacked(_role)) ==
            keccak256(abi.encodePacked("JOURNAL"))
        ) {
            instanceOfMemberStruct.power = 1;
        } else if (
            keccak256(abi.encodePacked(_role)) ==
            keccak256(abi.encodePacked("EIC"))
        ) {
            instanceOfMemberStruct.power = 2;
        } else if (
            keccak256(abi.encodePacked(_role)) ==
            keccak256(abi.encodePacked("AE"))
        ) {
            instanceOfMemberStruct.power = 3;
        } else if (
            keccak256(abi.encodePacked(_role)) ==
            keccak256(abi.encodePacked("REVIEWER"))
        ) {
            instanceOfMemberStruct.power = 4;
        } else {
            instanceOfMemberStruct.power = 5;
        }

        // if not Journal

        if (
            request == true &&
            keccak256(abi.encodePacked(_role)) !=
            keccak256(abi.encodePacked("JOURNAL"))
        ) {
            // some require checks here
            require(memberRequested[_userAddress] == false, "Member Requested Already!!");
            require(memberExist[_userAddress] == false, "Member Exist Already!!");

            // add it to the requested member data structure
            arrayOfRequestedMembers.push(instanceOfMemberStruct);
            indexFromRequest[_userAddress] = arrayOfRequestedMembers.length - 1;

            getRequestedMemberWithAddress[
                _userAddress
            ] = instanceOfMemberStruct;
            memberRequested[_userAddress] = true;
        }
        // if Journal
        else {
            if (
                keccak256(abi.encodePacked(_role)) !=
                keccak256(abi.encodePacked("JOURNAL"))
            ) {
                // some require checks here
                require(
                    memberRequested[_userAddress] == true,
                    "You need to Request First"
                );
            }

            require(memberExist[_userAddress] == false, "Member Exist Already!!");

            // add it to the approved member data structure
            arrayOfMembers.push(instanceOfMemberStruct);
            getMemberWithAddress[_userAddress] = instanceOfMemberStruct;
            memberExist[_userAddress] = true;
        }
    }

    // to find member using address (true = find from requested members | false = find from approoved members)
    function findMember(address _userAddress, bool requestedMember)
        public
        view
        returns (MemberStruct memory)
    {
        if (requestedMember == true) {
            return getRequestedMemberWithAddress[_userAddress];
        } else {
            return getMemberWithAddress[_userAddress];
        }
    }

    // function to approove request
    function approoveRequest(address _userAddress, address approvingUserAddress)
        public
    {
        MemberStruct memory memberTobeApproved = getRequestedMemberWithAddress[
            _userAddress
        ];
        MemberStruct memory approvingMember = getMemberWithAddress[
            approvingUserAddress
        ];
        string memory email = memberTobeApproved.email;
        string memory role = memberTobeApproved.role;
        string memory name = memberTobeApproved.name;
        
        address userAddress = memberTobeApproved.userAddress;
        uint256 requestingUserPower = memberTobeApproved.power;
        uint256 approvingUserPower = approvingMember.power;
 
        require(
            approvingUserPower <= requestingUserPower,
            "You can't approove someone above than you."
        );

        // adding member using add member function | the difference is we're not using true here
        addOrRequestMember(name, role, email, userAddress, false);

        // need to remove entry from request array
        uint256 index = indexFromRequest[_userAddress];
        arrayOfRequestedMembers[index] = arrayOfRequestedMembers[arrayOfRequestedMembers.length - 1];
        indexFromRequest[arrayOfRequestedMembers[index].userAddress] = index;
        arrayOfRequestedMembers.pop();
        delete indexFromRequest[_userAddress];
    }

    function denyRequest(address _userAddress) public {
        uint256 index = indexFromRequest[_userAddress];
        arrayOfRequestedMembers[index] = arrayOfRequestedMembers[arrayOfRequestedMembers.length - 1];
        indexFromRequest[arrayOfRequestedMembers[index].userAddress] = index;
        arrayOfRequestedMembers.pop();
        delete indexFromRequest[_userAddress];
    }

    // Function to know if member exist or not - will be useful in login and other features
    function memberExistOrNot(address _userAddress) public view returns (bool) {
        if ((memberExist[_userAddress] == true)) {
            return true;
        } else {
            return false;
        }
    }
}