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
      // Second approve attempt: approval now clears the request state, so the
      // pending-request guard fires first.
      await expect(
        auth.connect(journal).approoveRequest(eic.address, journal.address)
      ).to.be.revertedWith("No pending request for this address");
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

    it("reverts when a direct-added member requests another role (request-path memberExist guard)", async function () {
      const { auth, journal } = await loadFixture(deployAll);
      // JOURNAL is direct-added: memberExist=true, memberRequested=false.
      await auth
        .connect(journal)
        .addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      // The same address now requests a non-JOURNAL role (request=true), so it
      // enters the request branch. The memberRequested guard passes (it never
      // "requested"), so the memberExist guard is the one that rejects it.
      await expect(
        auth.connect(journal).addOrRequestMember("J", "EIC", "j@x.com", journal.address, true)
      ).to.be.revertedWith("Member Exist Already!!");
    });

    it("reverts on direct add (request=false) of a non-JOURNAL that never requested", async function () {
      const { auth, stranger } = await loadFixture(deployAll);
      // request=false + role != JOURNAL takes the else branch and must hit the
      // "You need to Request First" guard, since nobody requested this address.
      await expect(
        auth
          .connect(stranger)
          .addOrRequestMember("X", "REVIEWER", "x@x.com", stranger.address, false)
      ).to.be.revertedWith("You need to Request First");
    });
  });

  describe("Fuzz-finding regressions (Echidna: member eviction)", function () {
    it("denyRequest for a never-requested address reverts instead of evicting slot 0", async function () {
      const { auth, journal, eic, stranger } = await loadFixture(deployAll);
      await auth.connect(journal).addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      // eic's request occupies slot 0 of the request array.
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);

      // Pre-fix: indexFromRequest[stranger] defaulted to 0, so this call
      // swap-popped eic's pending request out of the array.
      await expect(
        auth.connect(journal).denyRequest(stranger.address)
      ).to.be.revertedWith("No pending request for this address");

      const pending = await auth.getApprovedOrRequestedMember(true);
      expect(pending.length).to.equal(1);
      expect(pending[0].userAddress).to.equal(eic.address);
    });

    it("a denied requester can request again", async function () {
      const { auth, eic } = await loadFixture(deployAll);
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      await auth.connect(eic).denyRequest(eic.address); // withdraw own request

      // Pre-fix: memberRequested stayed true after deny, blocking re-request.
      await auth.connect(eic).addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      const pending = await auth.getApprovedOrRequestedMember(true);
      expect(pending.length).to.equal(1);
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

    it("an approved member may deny someone else's pending request", async function () {
      const { auth, journal, eic } = await loadFixture(deployAll);
      // journal is an approved member; eic has a pending request.
      await auth
        .connect(journal)
        .addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);

      // journal (memberExist == true) denies eic's request, though not the requester.
      await auth.connect(journal).denyRequest(eic.address);
      expect((await auth.getApprovedOrRequestedMember(true)).length).to.equal(0);
    });

    it("a non-member who is not the requester cannot deny a request", async function () {
      const { auth, eic, stranger } = await loadFixture(deployAll);
      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);

      await expect(
        auth.connect(stranger).denyRequest(eic.address)
      ).to.be.revertedWith("Not authorized to deny this request");
    });
  });

  describe("no payable hook (plain ETH transfer rejected)", function () {
    it("reverts on a plain ETH transfer (no receive/fallback)", async function () {
      const { auth, journal } = await loadFixture(deployAll);
      // No receive/fallback (removed to avoid a locked-ether finding); ETH is rejected.
      await expect(
        journal.sendTransaction({ to: await auth.getAddress(), value: 100n })
      ).to.be.reverted;
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

  // P5: unskipped — approoveRequest requires the caller be the approving
  // member; addOrRequestMember requires self-registration on the request path.
  describe("Access control negatives (P5)", function () {
    it("a non-member cannot approve anyone's pending request", async function () {
      const { auth, journal, eic, stranger } = await loadFixture(deployAll);
      await auth
        .connect(journal)
        .addOrRequestMember("J", "JOURNAL", "j@x.com", journal.address, true);
      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);

      // Stranger (not an approved member) tries to approve eic.
      await expect(
        auth.connect(stranger).approoveRequest(eic.address, stranger.address)
      ).to.be.revertedWith("Approver must be an approved member");

      // Stranger cannot impersonate the journal as the approver either.
      await expect(
        auth.connect(stranger).approoveRequest(eic.address, journal.address)
      ).to.be.revertedWith("Caller must be the approving member");

      // The legitimate approver still succeeds.
      await auth.connect(journal).approoveRequest(eic.address, journal.address);
      expect(await auth.memberExistOrNot(eic.address)).to.equal(true);
    });

    it("addOrRequestMember rejects a request where msg.sender != _userAddress", async function () {
      const { auth, eic, stranger } = await loadFixture(deployAll);
      await expect(
        auth
          .connect(stranger)
          .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true)
      ).to.be.revertedWith("Can only register your own address");

      // Self-registration (msg.sender == _userAddress) still works.
      await auth
        .connect(eic)
        .addOrRequestMember("E", "EIC", "e@x.com", eic.address, true);
      const pending = await auth.findMember(eic.address, true);
      expect(pending.role).to.equal("EIC");
    });
  });
});
