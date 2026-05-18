const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAll, submitPaper } = require("./helpers/fixtures");

// Tests use a single paper per test to avoid the known architectural bug
// where the shared `instanceofPaperStruct` makes multi-paper flows route
// to whichever paper was most recently touched. The multi-paper failure is
// documented in the deferred-bug suite at the bottom of this file.
describe("Main", function () {
  describe("Submission entrypoint", function () {
    it("getPaperInfo + sendToEIC pushes paper into the EIC queue", async function () {
      const { main, author } = await loadFixture(deployAll);
      const { title } = await submitPaper(main, { author });

      const received = await main.getRecievedByEIC();
      expect(received.length).to.equal(1);
      expect(received[0].papertitle).to.equal(title);
      expect(received[0].authorAddress).to.equal(author.address);
    });

    it("getPaperInfo without sendToEIC leaves the EIC queue empty", async function () {
      const { main, author } = await loadFixture(deployAll);
      await main
        .connect(author)
        .getPaperInfo("Author", "au@x.com", "abs", "T", "ipfs://x", author.address);

      expect((await main.getRecievedByEIC()).length).to.equal(0);
    });
  });

  describe("EIC stage", function () {
    it("EICapproval(true) routes paper into AE queue and approvedByEIC", async function () {
      const { main, author, eic } = await loadFixture(deployAll);
      await submitPaper(main, { author });

      await main.connect(eic).EICapproval(true);

      expect((await main.getRecievedByEIC()).length).to.equal(0);
      expect((await main.getApprovedByEIC()).length).to.equal(1);
      expect((await main.getRecievedByAE()).length).to.equal(1);
    });

    it("EICapproval(false) drops the paper from the EIC queue without forwarding", async function () {
      const { main, author, eic } = await loadFixture(deployAll);
      await submitPaper(main, { author });

      await main.connect(eic).EICapproval(false);

      expect((await main.getRecievedByEIC()).length).to.equal(0);
      expect((await main.getApprovedByEIC()).length).to.equal(0);
      expect((await main.getRecievedByAE()).length).to.equal(0);
    });
  });

  describe("AE stage", function () {
    it("AEapproval(true) routes paper into Reviewer queue and approvedByAE", async function () {
      const { main, author, eic, ae } = await loadFixture(deployAll);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);

      await main.connect(ae).AEapproval(true);

      expect((await main.getRecievedByAE()).length).to.equal(0);
      expect((await main.getApprovedByAE()).length).to.equal(1);
      expect((await main.getRecievedByReviewer()).length).to.equal(1);
    });

    it("AEapproval(false) drops the paper from the AE queue", async function () {
      const { main, author, eic, ae } = await loadFixture(deployAll);
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
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAll);
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
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAll);
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

  describe("Current behaviour of the false-branches (documented for regression; expected to change in P5)", function () {
    it("Reviewerapproval(false,...) is a no-op today (does NOT remove paper from recievedByReviewer)", async function () {
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAll);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);

      const before = await main.getRecievedByReviewer();
      expect(before.length).to.equal(1);

      await main
        .connect(reviewer)
        .Reviewerapproval(false, "Reject reason", reviewer.address);

      // Bug: queue size unchanged. P5 will fix this (it should pop).
      const after = await main.getRecievedByReviewer();
      expect(after.length).to.equal(1);
      expect((await main.getReviewedbyReviewer()).length).to.equal(0);
    });

    it("ReviewedByAE(false,...) is a no-op today (does NOT remove paper from RreceivedByAE)", async function () {
      const { main, author, eic, ae, reviewer } = await loadFixture(deployAll);
      await submitPaper(main, { author });
      await main.connect(eic).EICapproval(true);
      await main.connect(ae).AEapproval(true);
      await main
        .connect(reviewer)
        .Reviewerapproval(true, "Reviewer remark", reviewer.address);

      const before = await main.RereceivedByAE();
      expect(before.length).to.equal(1);

      await main.connect(ae).ReviewedByAE(false, "");

      // Bug: queue size unchanged. P5 will fix this (it should pop).
      const after = await main.RereceivedByAE();
      expect(after.length).to.equal(1);
      expect((await main.getReviewedByAE()).length).to.equal(0);
    });
  });

  describe.skip("[P5: bug fixes documented in SECURITY.md, deferred to preserve ABI parity with v1.0-paper]", function () {
    it("Reviewerapproval(false,...) should remove paper from recievedByReviewer", async function () {
      // Today: the false branch is a no-op — paper stays in the reviewer
      // queue, never reaches reviewedByReviewer, and the AE never sees it
      // back. Will be fixed alongside the access-modifier work in P5.
    });
    it("ReviewedByAE(false,...) should remove paper from RreceivedByAE", async function () {
      // Same shape as the bug above: false branch is a no-op.
    });
    it("each contract function should be restricted to the matching role via onlyEiC/onlyAE/onlyReviewer modifiers", async function () {
      // Today: every action function on Main is public + unmodified. Any
      // address can call EICapproval, AEapproval, Reviewerapproval, etc.
      // P5 adds modifiers that call into Auth.findMember to check role.
    });
    it("operations should select papers by ID, not from the shared instanceofPaperStruct", async function () {
      // Two concurrent submissions confuse the pipeline: EICapproval always
      // operates on the most-recently-touched paper. Per the locked plan
      // this is documented in SECURITY.md rather than fixed (fixing would
      // change the ABI and the paper's documented architecture).
    });
  });
});
