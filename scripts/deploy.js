/*
 * Deploys Auth, Main, Decision to the selected Hardhat network and writes
 * the resulting addresses into src/contract_abi/<Name>.json under
 * networks[chainId], matching the Truffle artifact shape the frontend
 * expects (App.js: Auth.networks[networkId].address).
 *
 * Usage: npx hardhat run scripts/deploy.js --network <network>
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const ABI_DIR = path.resolve(__dirname, "..", "src", "contract_abi");
const CONTRACTS = ["Auth", "Main", "Decision"];

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  const [deployer] = await hre.ethers.getSigners();

  console.log(`Network: ${hre.network.name} (chainId=${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("");

  for (const name of CONTRACTS) {
    const Factory = await hre.ethers.getContractFactory(name);
    const contract = await Factory.deploy();
    const tx = contract.deploymentTransaction();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    const abiPath = path.join(ABI_DIR, `${name}.json`);
    if (!fs.existsSync(abiPath)) {
      throw new Error(
        `Missing ${abiPath}. Run "npm run compile" before deploying.`
      );
    }
    const abiJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    abiJson.networks = abiJson.networks || {};
    abiJson.networks[chainId] = {
      address,
      transactionHash: tx ? tx.hash : null,
    };
    fs.writeFileSync(abiPath, JSON.stringify(abiJson, null, 2) + "\n");

    console.log(`  ${name.padEnd(10)} -> ${address}`);
  }

  console.log("");
  console.log("Deployment complete. Addresses written to src/contract_abi/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
