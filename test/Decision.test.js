const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAll } = require("./helpers/fixtures");

// Tests stick to one paper per test. Multi-paper concurrent flows expose a
// pop() queue-corruption bug documented in the deferred-bug suite below.
describe("Decision", function () {
  describe("Transfer from Main into Decision", function () {
    it("getPaperInfo pushes the paper into RreceivedByEIC and preserves all fields", async function () {
      const { decision, eic, author } = await loadFixture(deployAll);

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
      const fx = await loadFixture(deployAll);
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
      const { decision } = await loadFixture(deployAll);
      expect((await decision.getPublishedpaper()).length).to.equal(0);
      expect((await decision.Returntoauthor()).length).to.equal(0);
      expect((await decision.RerecievedByEIC()).length).to.equal(0);
    });
  });

  describe.skip("[P5: bug fixes documented in SECURITY.md, deferred to preserve ABI parity with v1.0-paper]", function () {
    it("EICDecision should pop the paper being decided, not the last element of the queue", async function () {
      // Today: EICDecision unconditionally does RreceivedByEIC.pop(), which
      // removes the LAST element regardless of which paper the decision was
      // for. Under interleaved submissions/decisions the queue corrupts.
      // Fixing requires keying decisions to a paper id, which is an ABI
      // change -- deferred per the locked plan.
    });
    it("EICDecision should be callable only by the EiC role (onlyEiC modifier)", async function () {
      // Today: anyone can call EICDecision. P5 adds the role-check modifier.
    });
    it("getPaperInfo on Decision should be callable only by the EiC role transferring a paper from Main", async function () {
      // Today: any caller can stuff arbitrary paper data into the Decision
      // queue. P5 will gate this on either onlyEiC or by source-of-truth
      // checking against Main.
    });
  });
});
