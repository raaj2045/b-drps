const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployAll, registerStandardRoles } = require("./helpers/fixtures");

describe("Integration: full publication pipeline", function () {
  it("paper progresses from submission through every role to Decision.getPublishedpaper", async function () {
    const fx = await loadFixture(deployAll);
    const { auth, main, decision, journal, eic, ae, reviewer, author } = fx;

    // 1. Bootstrap the membership hierarchy via Auth.
    await registerStandardRoles(fx);
    expect(await auth.memberExistOrNot(journal.address)).to.equal(true);
    expect(await auth.memberExistOrNot(eic.address)).to.equal(true);
    expect(await auth.memberExistOrNot(ae.address)).to.equal(true);
    expect(await auth.memberExistOrNot(reviewer.address)).to.equal(true);
    expect(await auth.memberExistOrNot(author.address)).to.equal(true);

    // 2. Author submits the manuscript to Main.
    const title = "Blockchain-based Decentralized Research Publishing";
    const link = "https://gateway.pinata.cloud/ipfs/QmIntegrationTestCid";
    await main
      .connect(author)
      .getPaperInfo("Author", "au@x.com", "An abstract.", title, link, author.address);
    await main.connect(author).sendToEIC();
    expect((await main.getRecievedByEIC()).length).to.equal(1);

    // 3. EIC approves and assigns to AE.
    await main.connect(eic).EICapproval(true);
    expect((await main.getRecievedByEIC()).length).to.equal(0);
    expect((await main.getRecievedByAE()).length).to.equal(1);

    // 4. AE approves and assigns to Reviewer.
    await main.connect(ae).AEapproval(true);
    expect((await main.getRecievedByAE()).length).to.equal(0);
    expect((await main.getRecievedByReviewer()).length).to.equal(1);

    // 5. Reviewer submits their review; paper returns to AE for final remarks.
    const reviewerRemark = "Sound methodology; minor revisions suggested.";
    await main
      .connect(reviewer)
      .Reviewerapproval(true, reviewerRemark, reviewer.address);
    expect((await main.getRecievedByReviewer()).length).to.equal(0);
    const backToAE = await main.RereceivedByAE();
    expect(backToAE.length).to.equal(1);
    expect(backToAE[0].reviewofreviewer).to.equal(reviewerRemark);

    // 6. AE adds final remarks and moves the paper into reviewedByAE.
    const aeRemark = "Concur with reviewer; recommend publish.";
    await main.connect(ae).ReviewedByAE(true, aeRemark);
    const finalized = await main.getReviewedByAE();
    expect(finalized.length).to.equal(1);
    expect(finalized[0].reviewofAE).to.equal(aeRemark);

    // 7. The dapp transfers the finalized paper from Main into the Decision
    //    contract. Mirrors App.js getPaperinformation: it reads the paper
    //    state from main.getReviewedByAE() and calls decision.getPaperInfo.
    const p = finalized[0];
    await decision
      .connect(eic)
      .getPaperInfo(
        p.name,
        p.email,
        p.abstractofpaper,
        p.papertitle,
        p.linkofpaper,
        p.reviewofreviewer,
        p.reviewofAE,
        p.authorAddress
      );
    expect((await decision.RerecievedByEIC()).length).to.equal(1);

    // 8. EIC makes the final decision -- publish.
    const decisionMsg = "Congratulations, your paper has been published.";
    await decision.connect(eic).EICDecision(true, decisionMsg);

    // 9. Verify the paper ends up in both Publishpaper and Returntoauthor,
    //    with all the review history intact, and the Decision queue empties.
    expect((await decision.RerecievedByEIC()).length).to.equal(0);
    const published = await decision.getPublishedpaper();
    expect(published.length).to.equal(1);
    expect(published[0].papertitle).to.equal(title);
    expect(published[0].linkofpaper).to.equal(link);
    expect(published[0].reviewofreviewer).to.equal(reviewerRemark);
    expect(published[0].reviewofAE).to.equal(aeRemark);
    expect(published[0].messagetoauthor).to.equal(decisionMsg);
    expect(published[0].authorAddress).to.equal(author.address);

    const returnedToAuthor = await decision.Returntoauthor();
    expect(returnedToAuthor.length).to.equal(1);
    expect(returnedToAuthor[0].papertitle).to.equal(title);
    expect(returnedToAuthor[0].messagetoauthor).to.equal(decisionMsg);
  });
});
