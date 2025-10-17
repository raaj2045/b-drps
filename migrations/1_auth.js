// eslint-disable-next-line no-undef
var auth = artifacts.require("../contracts/auth.sol");

module.exports = function(deployer) {
    deployer.deploy(auth);
};