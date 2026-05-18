// Coverage note (P2 follow-up): solidity-coverage reports auth.sol at 13/14
// branches (92.86%). The uncovered branch is the second require in the
// request path (`require(memberExist[_userAddress] == false, "Member Exist
// Already!!")`). It is dead-ish: the prior `memberRequested == false` require
// catches duplicate requests, and the only state where memberExist is true
// while memberRequested is false is a JOURNAL that's been direct-added --
// which then takes the else branch via `role != "JOURNAL"` short-circuit
// rather than the request branch. Reachable only if a JOURNAL re-registers
// as another role with request=true; left untested as a non-paper concern.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAll } = require("./helpers/fixtures");

describe("Auth", function () {
  describe("Registration: each role takes the documented path", function () {
    it("JOURNAL adds directly (no separate approve step)", async function () {
      const { auth, journal } = await loadFixture(deployAll);
      await auth
        .connect(journal)
        .addOrRequestMember("Journal Inc", "JOURNAL", "j@x.com", journal.address, true);
      expect(await auth.memberExistOrNot(journal.address)).to.equal(true);
      const m = await auth.findMember(journal.address, false);
      expect(m.name).to.equal("Journal Inc");
      expect(m.role).to.equal("JOURNAL");
      expect(m.power).to.equal(1n);
    });

    it("EIC: request then JOURNAL approves", async function () {
      const { auth, journal, eic } = await loadFixture(deployAll);
      await auth
        .connect(journal)
        .addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);

      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      expect(await auth.memberExistOrNot(eic.address)).to.equal(false);

      const pending = await auth.findMember(eic.address, true);
      expect(pending.role).to.equal("EIC");
      expect(pending.power).to.equal(2n);

      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      expect(await auth.memberExistOrNot(eic.address)).to.equal(true);
      const m = await auth.findMember(eic.address, false);
      expect(m.power).to.equal(2n);
    });

    it("AE: request then EIC approves (power 3, approver power 2)", async function () {
      const { auth, journal, eic, ae } = await loadFixture(deployAll);
      await auth
        .connect(journal)
        .addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(journal).approoveRequest(eic.address, journal.address);

      await auth
        .connect(ae)
        .addOrRequestMember("A", "AE", "a@x.com", ae.address, true);
      await auth.connect(eic).approoveRequest(ae.address, eic.address);

      const m = await auth.findMember(ae.address, false);
      expect(m.role).to.equal("AE");
      expect(m.power).to.equal(3n);
    });

    it("REVIEWER: AE approves (power 4, approver power 3)", async function () {
      const { auth, journal, eic, ae, reviewer } = await loadFixture(deployAll);
      // bootstrap hierarchy
      await auth.connect(journal).addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      await auth.connect(ae).addOrRequestMember("A", "AE", "a@x.com", ae.address, true);
      await auth.connect(eic).approoveRequest(ae.address, eic.address);

      await auth
        .connect(reviewer)
        .addOrRequestMember("R", "REVIEWER", "r@x.com", reviewer.address, true);
      await auth.connect(ae).approoveRequest(reviewer.address, ae.address);

      const m = await auth.findMember(reviewer.address, false);
      expect(m.role).to.equal("REVIEWER");
      expect(m.power).to.equal(4n);
    });

    it("AUTHOR: anything-not-in-list gets power 5", async function () {
      const { auth, journal, eic, ae, author } = await loadFixture(deployAll);
      await auth.connect(journal).addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      await auth.connect(ae).addOrRequestMember("A", "AE", "a@x.com", ae.address, true);
      await auth.connect(eic).approoveRequest(ae.address, eic.address);

      await auth
        .connect(author)
        .addOrRequestMember("Au", "AUTHOR", "au@x.com", author.address, true);
      await auth.connect(ae).approoveRequest(author.address, ae.address);

      const m = await auth.findMember(author.address, false);
      expect(m.power).to.equal(5n);
    });
  });

  describe("Registration: failure paths", function () {
    it("reverts on duplicate request from same address", async function () {
      const { auth, eic } = await loadFixture(deployAll);
      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await expect(
        auth.connect(eic).addOrRequestMember("E2", "EIC", "e2@x.com", eic.address, true)
      ).to.be.revertedWith("Member Requested Already!!");
    });

    it("reverts when approving an already-approved member (cannot double-add)", async function () {
      const { auth, journal, eic } = await loadFixture(deployAll);
      await auth.connect(journal).addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      // Second approve attempt: addOrRequestMember(..., false) hits the
      // memberExist guard. (Note: memberRequested[eic] is never cleared on
      // approval -- a state-cleanliness quirk -- so the earlier "You need to
      // Request First" guard does not fire.)
      await expect(
        auth.connect(journal).approoveRequest(eic.address, journal.address)
      ).to.be.revertedWith("Member Exist Already!!");
    });

    it("reverts when approver has higher power (lower number) than requester is asking for", async function () {
      const { auth, journal, eic, ae, stranger } = await loadFixture(deployAll);
      // Set up an AE who will try to approve an EIC-level request
      await auth.connect(journal).addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      await auth.connect(ae).addOrRequestMember("A", "AE", "a@x.com", ae.address, true);
      await auth.connect(eic).approoveRequest(ae.address, eic.address);

      // Stranger requests EIC role (power 2). AE (power 3) tries to approve.
      // The contract require: approverPower (3) <= requesterPower (2) -> false -> revert.
      await auth
        .connect(stranger)
        .addOrRequestMember("E2", "EIC", "e2@x.com", stranger.address, true);
      await expect(
        auth.connect(ae).approoveRequest(stranger.address, ae.address)
      ).to.be.revertedWith("You can't approove someone above than you.");
    });
  });

  describe("denyRequest", function () {
    it("removes the entry from the requested-members array", async function () {
      const { auth, eic } = await loadFixture(deployAll);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      let pending = await auth.getApprovedOrRequestedMember(true);
      expect(pending.length).to.equal(1);

      await auth.connect(eic).denyRequest(eic.address);
      pending = await auth.getApprovedOrRequestedMember(true);
      expect(pending.length).to.equal(0);
      expect(await auth.memberExistOrNot(eic.address)).to.equal(false);
    });
  });

  describe("recieve() (misspelled payable hook)", function () {
    it("accepts a payable transfer without reverting", async function () {
      const { auth, journal } = await loadFixture(deployAll);
      // The function body is empty; it exists so the contract can accept
      // ETH for gas-cost experiments. Calling it shouldn't revert.
      await auth.connect(journal).recieve({ value: 100n });
    });
  });

  describe("Getters", function () {
    it("getApprovedOrRequestedMember(true) lists pending, (false) lists approved", async function () {
      const { auth, journal, eic, ae } = await loadFixture(deployAll);
      await auth.connect(journal).addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      await auth.connect(ae).addOrRequestMember("A", "AE", "a@x.com", ae.address, true);

      const approved = await auth.getApprovedOrRequestedMember(false);
      const pending = await auth.getApprovedOrRequestedMember(true);
      expect(approved.length).to.equal(2);
      expect(pending.length).to.equal(1);
      expect(pending[0].role).to.equal("AE");
    });

    it("memberExistOrNot returns false for unknown addresses", async function () {
      const { auth, stranger } = await loadFixture(deployAll);
      expect(await auth.memberExistOrNot(stranger.address)).to.equal(false);
    });
  });

  describe.skip("Access control negatives (unskipped in P5 once onlyJournal/onlyEiC modifiers land)", function () {
    it("non-member should not be able to approve anyone's request", async function () {
      // Today: approovingMember's power defaults to 0 when the caller isn't a
      // member, and 0 <= anything is true, so a random EOA can approve any
      // pending request. P5 will add a modifier enforcing that the caller is
      // already an approved member with strictly-greater authority.
    });
    it("addOrRequestMember should reject calls where msg.sender != _userAddress", async function () {
      // Today: anyone can register any other address. P5 adds the check.
    });
  });
});
