/* https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/assertRevert.js */

module.exports = function(error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
