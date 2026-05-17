/*
 * Converts Hardhat compiled artifacts into Truffle-shape JSON files at
 * src/contract_abi/, which the frontend imports directly. Preserves any
 * existing networks[chainId] entries so previously-recorded deployment
 * addresses survive a recompile (run deploy:local again to refresh them).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "contracts");
const OUT_DIR = path.join(ROOT, "src", "contract_abi");

const CONTRACTS = [
  { source: "auth.sol", name: "Auth" },
  { source: "main.sol", name: "Main" },
  { source: "Decision.sol", name: "Decision" },
];

function readExistingNetworks(outPath) {
  if (!fs.existsSync(outPath)) return {};
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    return existing.networks && typeof existing.networks === "object"
      ? existing.networks
      : {};
  } catch {
    return {};
  }
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { source, name } of CONTRACTS) {
    const artifactPath = path.join(ARTIFACTS_DIR, source, `${name}.json`);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        `Missing Hardhat artifact: ${artifactPath}. Run "npx hardhat compile" first.`
      );
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const outPath = path.join(OUT_DIR, `${name}.json`);
    const networks = readExistingNetworks(outPath);

    const truffleShape = {
      contractName: name,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
      networks,
    };

    fs.writeFileSync(outPath, JSON.stringify(truffleShape, null, 2) + "\n");
    console.log(`wrote ${path.relative(ROOT, outPath)}`);
  }
}

main();
