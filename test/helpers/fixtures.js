const { ethers } = require("hardhat");

/**
 * Deploys Auth, Main, Decision and returns them with named signers for the
 * five roles plus a couple of spares. Use via loadFixture so each test gets
 * a fresh deploy without paying for one in every it().
 */
async function deployAll() {
  const [journal, eic, ae, reviewer, author, other, stranger, ...rest] =
    await ethers.getSigners();

  const Auth = await ethers.getContractFactory("Auth");
  const auth = await Auth.deploy();
  await auth.waitForDeployment();
  const authAddress = await auth.getAddress();

  // Main and Decision take the Auth address (P5 role gating).
  const Main = await ethers.getContractFactory("Main");
  const main = await Main.deploy(authAddress);
  await main.waitForDeployment();

  const Decision = await ethers.getContractFactory("Decision");
  const decision = await Decision.deploy(authAddress);
  await decision.waitForDeployment();

  return {
    auth,
    main,
    decision,
    journal,
    eic,
    ae,
    reviewer,
    author,
    other,
    stranger,
    rest,
  };
}

/**
 * Registers the canonical five-role chain: JOURNAL (direct add) approves
 * EIC; EIC approves AE; AE approves REVIEWER and AUTHOR.
 *
 * Mirrors the README's "JOURNAL bootstraps the hierarchy" model. Power
 * numbers: JOURNAL=1, EIC=2, AE=3, REVIEWER=4, AUTHOR=5. approoveRequest
 * requires approverPower <= requesterPower (lower number = higher rank).
 */
async function registerStandardRoles({ auth, journal, eic, ae, reviewer, author }) {
  await auth
    .connect(journal)
    .addOrRequestMember("Journal Inc", "JOURNAL", "j@x.com", journal.address, true);

  await auth
    .connect(eic)
    .addOrRequestMember("E. I. Chief", "EIC", "e@x.com", eic.address, true);
  await auth.connect(journal).approoveRequest(eic.address, journal.address);

  await auth
    .connect(ae)
    .addOrRequestMember("Assoc Editor", "AE", "a@x.com", ae.address, true);
  await auth.connect(eic).approoveRequest(ae.address, eic.address);

  await auth
    .connect(reviewer)
    .addOrRequestMember("Reviewer", "REVIEWER", "r@x.com", reviewer.address, true);
  await auth.connect(ae).approoveRequest(reviewer.address, ae.address);

  await auth
    .connect(author)
    .addOrRequestMember("Author", "AUTHOR", "au@x.com", author.address, true);
  await auth.connect(ae).approoveRequest(author.address, ae.address);
}

/**
 * deployAll + registerStandardRoles. Use for tests driving gated Main/Decision
 * functions, which require the actors to be approved Auth members (P5).
 */
async function deployAllRegistered() {
  const fx = await deployAll();
  await registerStandardRoles(fx);
  return fx;
}

/**
 * Submits a paper to the Main contract: calls getPaperInfo (sets the shared
 * instanceofPaperStruct) then sendToEIC (pushes into the EiC queue).
 */
async function submitPaper(main, { author, name = "Author", email = "au@x.com", abstract = "An abstract.", title = "A Title", link = "https://gateway.pinata.cloud/ipfs/QmTestCid" }) {
  await main
    .connect(author)
    .getPaperInfo(name, email, abstract, title, link, author.address);
  await main.connect(author).sendToEIC();
  return { name, email, abstract, title, link };
}

module.exports = { deployAll, deployAllRegistered, registerStandardRoles, submitPaper };
