// eslint-disable-next-line no-undef
var main = artifacts.require("../contracts/main.sol");

module.exports = function(deployer) {
    deployer.deploy(main);
};