// SPDX-License-Identifier: LGPL-2.1-only
pragma solidity ^0.8.7;

contract Auth {
    // No payable receive/fallback: the workflow handles no value, and a real
    // receive() triggered a Slither locked-ether finding. Plain ETH is rejected.

    struct MemberStruct {
        string name;
        string role;
        string email;
        address userAddress;
        uint256 power;
    }

    // Pre-hashed roles: one keccak per call instead of recomputing per compare.
    bytes32 private constant JOURNAL_HASH  = keccak256("JOURNAL");
    bytes32 private constant EIC_HASH      = keccak256("EIC");
    bytes32 private constant AE_HASH       = keccak256("AE");
    bytes32 private constant REVIEWER_HASH = keccak256("REVIEWER");

    // Events for off-chain indexing / audit trail.
    event MemberRequested(address indexed user, string role);
    event MemberAdded(address indexed user, string role);
    event MemberApproved(address indexed user, address indexed approver, string role);
    event MemberDenied(address indexed user);

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

    /// @notice List members, either pending requests or approved.
    /// @param request true for the pending-requests list, false for approved members.
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

    /// @notice Number of pending requests (true) or approved members (false).
    function memberCount(bool request) public view returns (uint256) {
        return request ? arrayOfRequestedMembers.length : arrayOfMembers.length;
    }

    /// @notice Bounded read (SC10): up to `limit` entries of the pending
    ///         (true) or approved (false) member list, starting at `offset`.
    ///         Returns an empty array when `offset` is past the end.
    function memberPage(bool request, uint256 offset, uint256 limit)
        public view returns (MemberStruct[] memory page)
    {
        MemberStruct[] storage arr =
            request ? arrayOfRequestedMembers : arrayOfMembers;
        uint256 len = arr.length;
        if (offset >= len) return page;
        uint256 end = offset + limit;
        if (end > len) end = len;
        page = new MemberStruct[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = arr[i];
        }
    }

    /// @notice Register a member: request approval (self only) or add directly.
    /// @param request true to request approval, false to add directly (the
    ///        internal approval path; a JOURNAL is always added directly).
    function addOrRequestMember(
        string memory _name,
        string memory _role,
        string memory _email,
        address _userAddress,
        bool request
    ) public {
        // Self-registration only. The direct-add path (request == false) is the
        // internal approoveRequest call, where sender != _userAddress by design.
        if (request) {
            require(
                msg.sender == _userAddress,
                "Can only register your own address"
            );
        }

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
            emit MemberRequested(_userAddress, _role);
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
            emit MemberAdded(_userAddress, _role);
        }
    }

    /// @notice Fetch a member's record (zeroed struct if not found).
    /// @param requestedMember true to search pending requests, false for approved.
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

    /// @notice Approve a pending request, promoting it to an approved member.
    /// @param _userAddress the requester being approved.
    /// @param approvingUserAddress the approving member; must equal msg.sender
    ///        and hold authority at least as high as the requested role.
    function approoveRequest(address _userAddress, address approvingUserAddress)
        public
    {
        // Only an approved member, acting as themselves, may approve.
        require(
            memberExist[approvingUserAddress],
            "Approver must be an approved member"
        );
        require(
            msg.sender == approvingUserAddress,
            "Caller must be the approving member"
        );
        require(
            memberRequested[_userAddress],
            "No pending request for this address"
        );

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
        memberRequested[_userAddress] = false;
        delete getRequestedMemberWithAddress[_userAddress];

        emit MemberApproved(_userAddress, approvingUserAddress, role);
    }

    /// @notice Remove a pending request — the requester withdrawing, or an
    ///         approved member rejecting it.
    function denyRequest(address _userAddress) public {
        // Requester may withdraw; an approved member may reject.
        require(
            msg.sender == _userAddress || memberExist[msg.sender],
            "Not authorized to deny this request"
        );
        // Guard the swap-and-pop: indexFromRequest defaults to 0, so denying a
        // never-requested address evicted whatever member sat in slot 0 of the
        // request array (found by Echidna property fuzzing; see SECURITY.md).
        require(
            memberRequested[_userAddress],
            "No pending request for this address"
        );

        uint256 index = indexFromRequest[_userAddress];
        arrayOfRequestedMembers[index] = arrayOfRequestedMembers[arrayOfRequestedMembers.length - 1];
        indexFromRequest[arrayOfRequestedMembers[index].userAddress] = index;
        arrayOfRequestedMembers.pop();
        delete indexFromRequest[_userAddress];
        // Full cleanup so a denied requester can request again.
        memberRequested[_userAddress] = false;
        delete getRequestedMemberWithAddress[_userAddress];

        emit MemberDenied(_userAddress);
    }

    /// @notice Whether an address is an approved member.
    function memberExistOrNot(address _userAddress) public view returns (bool) {
        return memberExist[_userAddress];
    }

    /// @notice Role power of an approved member (0 if not a member). Read by
    ///         Main/Decision for role gating; returns a bare uint rather than
    ///         the full MemberStruct to keep their bytecode small.
    function memberPower(address _userAddress) public view returns (uint256) {
        return getMemberWithAddress[_userAddress].power;
    }
}