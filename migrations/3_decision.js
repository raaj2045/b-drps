// eslint-disable-next-line no-undef
var decision = artifacts.require("../contracts/Decision.sol");

module.exports = function(deployer) {
    deployer.deploy(decision);
};