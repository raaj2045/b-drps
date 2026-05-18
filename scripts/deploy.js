/*
 * Deploys Auth, Main, Decision to the selected Hardhat network and writes:
 *   - src/contract_abi/<Name>.json under networks[chainId] (Truffle artifact
 *     shape the frontend expects: App.js reads Auth.networks[id].address)
 *   - deployments/<network>.json -- a single canonical manifest per network
 *     with chainId, deployer, timestamp, and each contract's address + tx
 *     hash. Used by the README's Etherscan verify step and by reviewers
 *     reproducing the deploy on Sepolia.
 *
 * Usage: npx hardhat run scripts/deploy.js --network <network>
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const ABI_DIR = path.resolve(__dirname, "..", "src", "contract_abi");
const DEPLOYMENTS_DIR = path.resolve(__dirname, "..", "deployments");
const CONTRACTS = ["Auth", "Main", "Decision"];

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Network: ${hre.network.name} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("");

  const manifest = {
    network: hre.network.name,
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  for (const name of CONTRACTS) {
    const Factory = await hre.ethers.getContractFactory(name);
    const contract = await Factory.deploy();
    const tx = contract.deploymentTransaction();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const txHash = tx ? tx.hash : null;

    const abiPath = path.join(ABI_DIR, `${name}.json`);
    if (!fs.existsSync(abiPath)) {
      throw new Error(
        `Missing ${abiPath}. Run "npm run compile" before deploying.`
      );
    }
    const abiJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    abiJson.networks = abiJson.networks || {};
    abiJson.networks[chainId] = { address, transactionHash: txHash };
    fs.writeFileSync(abiPath, JSON.stringify(abiJson, null, 2) + "\n");

    manifest.contracts[name] = { address, transactionHash: txHash };
    console.log(`  ${name.padEnd(10)} -> ${address}`);
  }

  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  const manifestPath = path.join(DEPLOYMENTS_DIR, `${hre.network.name}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log("");
  console.log(`Deployment manifest: ${path.relative(process.cwd(), manifestPath)}`);
  console.log("Frontend ABIs updated under src/contract_abi/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
