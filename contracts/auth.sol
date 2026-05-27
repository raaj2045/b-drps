// SPDX-License-Identifier: LGPL v3.0
pragma solidity ^0.8.7;

contract Auth {
    // NOTE: no payable receive/fallback. The publishing workflow handles no
    // value transfer, so the contract deliberately rejects plain ETH. A prior
    // version had `function recieve() external payable {}` (a misspelled
    // regular function); promoting it to a real `receive()` made Slither flag
    // a locked-ether vulnerability (ETH could be received but never withdrawn),
    // so it was removed entirely.

    // ----------------------------------------------- MEMBER - REQUEST, APPROVE, ADD --------------------------------------------------

    // Member Structure
    struct MemberStruct {
        string name;
        string role;
        string email;
        address userAddress;
        uint256 power;
    }

    // Cached role-string hashes so addOrRequestMember does one keccak256 on
    // the role parameter and compares against pre-hashed constants instead
    // of recomputing four times per call.
    bytes32 private constant JOURNAL_HASH  = keccak256("JOURNAL");
    bytes32 private constant EIC_HASH      = keccak256("EIC");
    bytes32 private constant AE_HASH       = keccak256("AE");
    bytes32 private constant REVIEWER_HASH = keccak256("REVIEWER");

    // Mapping indexes with a particular useraddresses
    mapping(address => uint256) indexFromRequest;

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

    // function to add or request member (true = request member | false = directly add member | Journal will be directly added as a member)
    function addOrRequestMember(
        string memory _name,
        string memory _role,
        string memory _email,
        address _userAddress,
        bool request
    ) public {
        // Hash role once instead of recomputing on every comparison below.
        bytes32 roleHash = keccak256(abi.encodePacked(_role));

        uint256 power;
        if (roleHash == JOURNAL_HASH) {
            power = 1;
        } else if (roleHash == EIC_HASH) {
            power = 2;
        } else if (roleHash == AE_HASH) {
            power = 3;
        } else if (roleHash == REVIEWER_HASH) {
            power = 4;
        } else {
            power = 5;
        }

        // Build the struct in memory and write to storage once via push /
        // mapping assignment, instead of populating a shared storage scratchpad
        // field-by-field and then copying it.
        MemberStruct memory m = MemberStruct({
            name: _name,
            role: _role,
            email: _email,
            userAddress: _userAddress,
            power: power
        });

        if (request == true && roleHash != JOURNAL_HASH) {
            require(memberRequested[_userAddress] == false, "Member Requested Already!!");
            require(memberExist[_userAddress] == false, "Member Exist Already!!");

            arrayOfRequestedMembers.push(m);
            indexFromRequest[_userAddress] = arrayOfRequestedMembers.length - 1;
            getRequestedMemberWithAddress[_userAddress] = m;
            memberRequested[_userAddress] = true;
        } else {
            if (roleHash != JOURNAL_HASH) {
                require(
                    memberRequested[_userAddress] == true,
                    "You need to Request First"
                );
            }
            require(memberExist[_userAddress] == false, "Member Exist Already!!");

            arrayOfMembers.push(m);
            getMemberWithAddress[_userAddress] = m;
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
        return memberExist[_userAddress];
    }
}