const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAllRegistered, submitPaper } = require("./helpers/fixtures");

// One paper per test: the shared instanceofPaperStruct corrupts multi-paper
// flows (SECURITY.md §4.1).
describe("Main", function () {
  describe("Submission entrypoint", function () {
    it("getPaperInfo + sendToEIC pushes paper into the EIC queue", async function () {
      const { main, author } = await loadFixture(deployAllRegistered);
      const { title } = await submitPaper(main, { author });

      const received = await main.getRecievedByEIC();
      expect(received.length).to.equal(1);
      expect(received[0].papertitle).to.equal(title);
      expect(received[0].authorAddress).to.equal(author.address);
    });

    it("getPaperInfo without sendToEIC leaves the EIC queue empty", async function () {
      const { main, author } = await loadFixture(deployAllRegistered);
      await main
        .connect(author)
        .getPaperInfo("Author", "au@x.com", "abs", "T", "ipfs://x", author.address);

      expect((await main.getRecievedByEIC()).length).to.equal(0);
    });
  });

  describe("EIC stage", function () {
    it("EICapproval(true) routes paper into AE queue and approvedByEIC", async function () {
      const { main, author, eic } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });

      await main.connect(eic).EICapproval(true);

      expect((await main.getRecievedByEIC()).length).to.equal(0);
      expect((await main.getApprovedByEIC()).length).to.equal(1);
      expect((await main.getRecievedByAE()).length).to.equal(1);
    });

    it("EICapproval(false) drops the paper from the EIC queue without forwarding", async function () {
      const { main, author, eic } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });

      await main.connect(eic).EICapproval(false);

      expect((await main.getRecievedByEIC()).length).to.equal(0);
      expect((await main.getApprovedByEIC()).length).to.equal(0);
      expect((await main.getRecievedByAE()).length).to.equal(0);
    });
  });

  describe("AE stage", function () {
    it("AEapproval(true) routes paper into Reviewer queue and approvedByAE", async function () {
      const { main, author, eic, ae } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);

      await main.connect(ae).AEapproval(true);

      expect((await main.getRecievedByAE()).length).to.equal(0);
      expect((await main.getApprovedByAE()).length).to.equal(1);
      expect((await main.getRecievedByReviewer()).length).to.equal(1);
    });

    it("AEapproval(false) drops the paper from the AE queue", async function () {
      const { main, author, eic, ae } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);

      await main.connect(ae).AEapproval(false);

      expect((await main.getRecievedByAE()).length).to.equal(0);
      expect((await main.getApprovedByAE()).length).to.equal(0);
      expect((await main.getRecievedByReviewer()).length).to.equal(0);
    });
  });

  describe("Reviewer stage", function () {
    it("Reviewerapproval(true,...) records review + reviewer and routes paper back to AE", async function () {
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);

      await main
        .connect(reviewer)
        .Reviewerapproval(true, "Solid contribution; minor revisions.", reviewer.address);

      expect((await main.getRecievedByReviewer()).length).to.equal(0);
      const reviewed = await main.getReviewedbyReviewer();
      expect(reviewed.length).to.equal(1);
      expect(reviewed[0].reviewofreviewer).to.equal("Solid contribution; minor revisions.");
      expect(reviewed[0].reviewerAddress).to.equal(reviewer.address);

      const backToAE = await main.RereceivedByAE();
      expect(backToAE.length).to.equal(1);
      expect(backToAE[0].reviewofreviewer).to.equal("Solid contribution; minor revisions.");
    });
  });

  describe("AE final-remarks stage", function () {
    it("ReviewedByAE(true,...) records AE remarks and moves paper into reviewedByAE", async function () {
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);
      await main
        .connect(reviewer)
        .Reviewerapproval(true, "Reviewer remark", reviewer.address);

      await main.connect(ae).ReviewedByAE(true, "AE concurs; recommend publish.");

      expect((await main.RereceivedByAE()).length).to.equal(0);
      const finalized = await main.getReviewedByAE();
      expect(finalized.length).to.equal(1);
      expect(finalized[0].reviewofAE).to.equal("AE concurs; recommend publish.");
      expect(finalized[0].reviewofreviewer).to.equal("Reviewer remark");
    });
  });

  describe("Current behaviour of the false-branches (documented for regression; deferred — see SECURITY.md §4.2/§4.3)", function () {
    it("Reviewerapproval(false,...) is a no-op today (does NOT remove paper from recievedByReviewer)", async function () {
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);

      const before = await main.getRecievedByReviewer();
      expect(before.length).to.equal(1);

      await main
        .connect(reviewer)
        .Reviewerapproval(false, "Reject reason", reviewer.address);

      // Deferred limitation (SECURITY.md §4.2): queue size unchanged on reject.
      const after = await main.getRecievedByReviewer();
      expect(after.length).to.equal(1);
      expect((await main.getReviewedbyReviewer()).length).to.equal(0);
    });

    it("ReviewedByAE(false,...) is a no-op today (does NOT remove paper from RreceivedByAE)", async function () {
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);
      await main
        .connect(reviewer)
        .Reviewerapproval(true, "Reviewer remark", reviewer.address);

      const before = await main.RereceivedByAE();
      expect(before.length).to.equal(1);

      await main.connect(ae).ReviewedByAE(false, "");

      // Deferred limitation (SECURITY.md §4.3): queue size unchanged on reject.
      const after = await main.RereceivedByAE();
      expect(after.length).to.equal(1);
      expect((await main.getReviewedByAE()).length).to.equal(0);
    });
  });

  // P5: unskipped — each action is gated by its role modifier.
  describe("Access control (P5 role modifiers)", function () {
    it("each action function is restricted to the matching role", async function () {
      const { main, author, eic, ae, reviewer, stranger } =
        await loadFixture(deployAllRegistered);
      await submitPaper(main, { author });

      // A non-member (stranger) cannot drive any stage.
      await expect(main.connect(stranger).EICapproval(true)).to.be.revertedWith(
        "Caller is not the EiC"
      );
      await expect(main.connect(stranger).AEapproval(true)).to.be.revertedWith(
        "Caller is not an AE"
      );
      await expect(
        main.connect(stranger).Reviewerapproval(true, "x", stranger.address)
      ).to.be.revertedWith("Caller is not a Reviewer");
      await expect(
        main.connect(stranger).ReviewedByAE(true, "x")
      ).to.be.revertedWith("Caller is not an AE");
      await expect(
        main.connect(stranger).getPaperInfo("n", "e", "a", "t", "l", stranger.address)
      ).to.be.revertedWith("Caller is not an Author");
      await expect(main.connect(stranger).sendToEIC()).to.be.revertedWith(
        "Caller is not an Author"
      );

      // A wrong-role member is also rejected: the author cannot act as EiC, and
      // the reviewer cannot act as AE.
      await expect(main.connect(author).EICapproval(true)).to.be.revertedWith(
        "Caller is not the EiC"
      );
      await expect(main.connect(reviewer).AEapproval(true)).to.be.revertedWith(
        "Caller is not an AE"
      );

      // The correctly-roled members still succeed (ABI-additive).
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);
    });
  });

  // SKIP: deferred data-model limitations (SECURITY.md §4.1–§4.3). Fixing them
  // changes the ABI; un-skipping is the acceptance criterion for a future fix.
  describe.skip("[P5: deferred data-model limitations — see SECURITY.md]", function () {
    it("Reviewerapproval(false,...) should remove paper from recievedByReviewer", async function () {
      // SECURITY.md §4.2 — false branch is a no-op.
    });
    it("ReviewedByAE(false,...) should remove paper from RreceivedByAE", async function () {
      // SECURITY.md §4.3 — false branch is a no-op.
    });
    it("operations should select papers by ID, not from the shared instanceofPaperStruct", async function () {
      // SECURITY.md §4.1 — shared instanceofPaperStruct corrupts concurrent papers.
    });
  });
});
