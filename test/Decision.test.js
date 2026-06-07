const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAllRegistered } = require("./helpers/fixtures");

// One paper per test: concurrent flows hit the pop() corruption (SECURITY.md §4.4).
describe("Decision", function () {
  describe("Transfer from Main into Decision", function () {
    it("getPaperInfo pushes the paper into RreceivedByEIC and preserves all fields", async function () {
      const { decision, eic, author } = await loadFixture(deployAllRegistered);

      await decision
        .connect(eic)
        .getPaperInfo(
          "Author",
          "au@x.com",
          "An abstract.",
          "A Title",
          "https://gateway.pinata.cloud/ipfs/QmTestCid",
          "Reviewer remark",
          "AE remark",
          author.address
        );

      const queue = await decision.RerecievedByEIC();
      expect(queue.length).to.equal(1);
      expect(queue[0].papertitle).to.equal("A Title");
      expect(queue[0].reviewofreviewer).to.equal("Reviewer remark");
      expect(queue[0].reviewofAE).to.equal("AE remark");
      expect(queue[0].authorAddress).to.equal(author.address);
    });
  });

  describe("EICDecision", function () {
    async function loadStagedFixture() {
      const fx = await loadFixture(deployAllRegistered);
      await fx.decision
        .connect(fx.eic)
        .getPaperInfo(
          "Author",
          "au@x.com",
          "An abstract.",
          "A Title",
          "https://gateway.pinata.cloud/ipfs/QmTestCid",
          "R remark",
          "AE remark",
          fx.author.address
        );
      return fx;
    }

    it("Decision(true, msg) publishes the paper and notifies the author", async function () {
      const { decision, eic } = await loadStagedFixture();

      await decision.connect(eic).EICDecision(true, "Congratulations -- accepted.");

      const published = await decision.getPublishedpaper();
      expect(published.length).to.equal(1);
      expect(published[0].messagetoauthor).to.equal("Congratulations -- accepted.");

      const returned = await decision.Returntoauthor();
      expect(returned.length).to.equal(1);
      expect(returned[0].messagetoauthor).to.equal("Congratulations -- accepted.");

      expect((await decision.RerecievedByEIC()).length).to.equal(0);
    });

    it("Decision(false, msg) returns the paper to the author without publishing", async function () {
      const { decision, eic } = await loadStagedFixture();

      await decision.connect(eic).EICDecision(false, "Reject -- revise and resubmit.");

      expect((await decision.getPublishedpaper()).length).to.equal(0);

      const returned = await decision.Returntoauthor();
      expect(returned.length).to.equal(1);
      expect(returned[0].messagetoauthor).to.equal("Reject -- revise and resubmit.");

      expect((await decision.RerecievedByEIC()).length).to.equal(0);
    });
  });

  describe("Getters expose the published, returned, and pending queues", function () {
    it("getPublishedpaper, Returntoauthor, RerecievedByEIC return arrays without reverting on empty state", async function () {
      const { decision } = await loadFixture(deployAllRegistered);
      expect((await decision.getPublishedpaper()).length).to.equal(0);
      expect((await decision.Returntoauthor()).length).to.equal(0);
      expect((await decision.RerecievedByEIC()).length).to.equal(0);
    });
  });

  // P5: unskipped — EICDecision and getPaperInfo are gated by onlyEiC.
  describe("Access control (P5 onlyEiC modifier)", function () {
    it("EICDecision is callable only by the EiC role", async function () {
      const { decision, eic, stranger, author } = await loadStagedFixtureFor();

      await expect(
        decision.connect(stranger).EICDecision(true, "x")
      ).to.be.revertedWith("Caller is not the EiC");
      await expect(
        decision.connect(author).EICDecision(true, "x")
      ).to.be.revertedWith("Caller is not the EiC");

      // The EiC still succeeds (ABI-additive).
      await decision.connect(eic).EICDecision(true, "ok");
      expect((await decision.getPublishedpaper()).length).to.equal(1);
    });

    it("getPaperInfo on Decision is callable only by the EiC role", async function () {
      const { decision, stranger, author } = await loadFixture(deployAllRegistered);
      await expect(
        decision
          .connect(stranger)
          .getPaperInfo("n", "e", "a", "t", "l", "rr", "ae", author.address)
      ).to.be.revertedWith("Caller is not the EiC");
      await expect(
        decision
          .connect(author)
          .getPaperInfo("n", "e", "a", "t", "l", "rr", "ae", author.address)
      ).to.be.revertedWith("Caller is not the EiC");
    });
  });

  // SKIP: deferred data-model limitation (SECURITY.md §4.4). Un-skipping is the
  // acceptance criterion for a future fix.
  describe.skip("[P5: deferred data-model limitation — see SECURITY.md §4.4]", function () {
    it("EICDecision should pop the paper being decided, not the last element of the queue", async function () {
      // SECURITY.md §4.4 — pops the last element, not the decided paper.
    });
  });
});

// Stages one paper into Decision (as the EiC) for the access-control negatives.
async function loadStagedFixtureFor() {
  const fx = await loadFixture(deployAllRegistered);
  await fx.decision
    .connect(fx.eic)
    .getPaperInfo(
      "Author",
      "au@x.com",
      "An abstract.",
      "A Title",
      "https://gateway.pinata.cloud/ipfs/QmTestCid",
      "R remark",
      "AE remark",
      fx.author.address
    );
  return fx;
}
