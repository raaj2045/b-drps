// solidity-coverage config. The contracts/echidna/ harnesses are
// property-fuzzing scaffolding for Echidna, not part of the production system,
// and have no Hardhat unit tests -- exclude them so coverage reflects the
// Auth/Main/Decision contracts only.
module.exports = {
  skipFiles: ["echidna"],
};
